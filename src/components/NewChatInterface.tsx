'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatMessages from '@/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/components/ChatInput';
import type { ChatSessionMessage } from '@/api/generated/schemas';
import { chatSessionProtectedCreateChatSessionPost } from '@/api/generated/endpoints/default/default';
import { processStreamBuffer } from '@/utils/streamingHelpers';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

export default function NewChatInterface() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleMobileSidebar } = useMobileSidebar();
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatTopic, setChatTopic] = useState<string | null>(null);
  const chatSessionIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // Handle chat topic updates - revalidate sidebar when a new topic is received
  const handleChatTopic = useCallback(async (topic: string) => {
    setChatTopic(topic);
    
    // Revalidate chat sessions cache and refresh the page to update sidebar
    try {
      await fetch('/api/revalidate/chat-sessions', { method: 'POST' });
      router.refresh();
    } catch (error) {
      console.error('Error revalidating chat sessions:', error);
      router.refresh();
    }
  }, [router]);

  // Handle page reload: redirect to chat history if there's an active session
  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navigation?.type === 'reload';

    if (isReload) {
      const storedSessionId = localStorage.getItem('currentChatSessionId');
      if (storedSessionId) {
        localStorage.removeItem('currentChatSessionId');
        router.replace(`/chat/${storedSessionId}`);
        return;
      }
    }
    
    setMessages([]);
    setChatTopic(null);
    chatSessionIdRef.current = null;
    localStorage.removeItem('currentChatSessionId');
  }, [router]);

  // Reset state when the reset query parameter changes
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam) {
      setMessages([]);
      setChatTopic(null);
      chatSessionIdRef.current = null;
      localStorage.removeItem('currentChatSessionId');
      router.replace('/chat');
    }
  }, [searchParams, router]);

  // Auto-focus input
  useEffect(() => {
    const timer = setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthError = (error: { status?: number; message?: string }) => {
    if (error?.status === 401 || error?.status === 403 ||
        error?.message?.includes('401') || error?.message?.includes('403')) {
      router.push('/auth/error');
      return true;
    }
    return false;
  };

  const createMessage = (role: 'user' | 'assistant', content: string | null, sessionId: string): ChatSessionMessage => ({
    public_id: `temp-${role}-${Date.now()}`,
    chat_session_id: sessionId,
    role,
    content: role === 'user' && content ? [{ data: { type: 'text_delta', delta: content } }] : [],
    created_on: Math.floor(Date.now() / 1000),
  });

  const handleSendMessage = async (content: string) => {
    if (!session?.idToken) {
      console.error('No session token available');
      return;
    }

    setIsLoading(true);

    try {
      if (!chatSessionIdRef.current) {
        try {
          const sessionResponse = await chatSessionProtectedCreateChatSessionPost({
            headers: {
              Authorization: session.idToken,
            },
          });

          if (sessionResponse.status === 200) {
            chatSessionIdRef.current = sessionResponse.data.public_id;
            localStorage.setItem('currentChatSessionId', sessionResponse.data.public_id);
          } else {
            console.error('Failed to create chat session');
            setIsLoading(false);
            return;
          }
        } catch (err: unknown) {
          if (handleAuthError(err as { status?: number; message?: string })) {
            setIsLoading(false);
            return;
          }
          throw err;
        }
      }

      const chatSessionId = chatSessionIdRef.current;

      const userMessage = createMessage('user', content, chatSessionId);
      const assistantMessage = createMessage('assistant', null, chatSessionId);
      const assistantMessageId = assistantMessage.public_id;

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      const response = await fetch(`/api/chat/${chatSessionId}/new_message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session.idToken,
        },
        body: JSON.stringify({ user_query: content }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/auth/error');
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        buffer = processStreamBuffer(buffer, (chatObject) => {
          setMessages((prev) => {
            const updated = [...prev];
            const assistantIdx = updated.findIndex(
              (msg) => msg.public_id === assistantMessageId
            );

            if (assistantIdx !== -1) {
              updated[assistantIdx] = {
                ...updated[assistantIdx],
                content: [...updated[assistantIdx].content, chatObject],
              };
            }

            return updated;
          });
        });
      }

      if (buffer.trim()) {
        processStreamBuffer(buffer, (chatObject) => {
          setMessages((prev) => {
            const updated = [...prev];
            const assistantIdx = updated.findIndex(
              (msg) => msg.public_id === assistantMessageId
            );

            if (assistantIdx !== -1) {
              updated[assistantIdx] = {
                ...updated[assistantIdx],
                content: [...updated[assistantIdx].content, chatObject],
              };
            }

            return updated;
          });
        });
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      handleAuthError(error as { status?: number; message?: string });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="h-screen-mobile flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 lg:px-6 flex items-center gap-3 min-h-[56px]">
        <button
          onClick={toggleMobileSidebar}
          className="p-1 -ml-1 text-foreground-secondary hover:text-foreground transition-colors lg:hidden"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-foreground truncate min-w-0">
          {chatTopic || 'New Chat'}
        </h1>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {messages.length === 0 ? (
          // Empty state
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                How can I help you today?
              </h2>
              <p className="text-foreground-secondary text-sm">
                Ask questions about H.G. Vaiśeṣika Dāsa&apos;s lectures. I&apos;ll provide answers with direct citations from the transcripts.
              </p>
            </div>
          </div>
        ) : (
          <ChatMessages
            key={chatSessionIdRef.current || 'new-chat'}
            messages={messages}
            onChatTopic={handleChatTopic}
          />
        )}

        {/* Input */}
        <div className="flex-shrink-0 border-t border-border bg-background-secondary p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput ref={chatInputRef} onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
