'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatMessages from '@/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/components/ChatInput';
import ChatSidebar from '@/components/ChatSidebar';
import type { ChatSessionMessage, ChatSession } from '@/api/generated/schemas';
import { chatSessionProtectedCreateChatSessionPost } from '@/api/generated/endpoints/default/default';
import { processStreamBuffer } from '@/utils/streamingHelpers';

interface NewChatInterfaceProps {
  initialChatSessions?: ChatSession[];
}

export default function NewChatInterface({ initialChatSessions = [] }: NewChatInterfaceProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatTopic, setChatTopic] = useState<string | null>(null);
  const chatSessionIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Handle page reload: redirect to chat history if there's an active session
  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = navigation?.type === 'reload';

    if (isReload) {
      const storedSessionId = localStorage.getItem('currentChatSessionId');
      if (storedSessionId) {
        // Clear localStorage and redirect to the chat history page
        localStorage.removeItem('currentChatSessionId');
        router.replace(`/chat/${storedSessionId}`);
        return;
      }
    }
    
    // For regular navigation, reset chat state to ensure fresh chat
    setMessages([]);
    setChatTopic(null);
    chatSessionIdRef.current = null;
    localStorage.removeItem('currentChatSessionId');
  }, [router]);

  // Reset state when the reset query parameter changes (for same-route navigation)
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam) {
      setMessages([]);
      setChatTopic(null);
      chatSessionIdRef.current = null;
      localStorage.removeItem('currentChatSessionId');
      
      // Clean up the URL by removing the query parameter
      router.replace('/chat');
    }
  }, [searchParams, router]);

  // Auto-focus input when new chat loads
  useEffect(() => {
    const timer = setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Stable Container component - defined outside render to prevent remounts
  const Container = useCallback(({ children }: { children: React.ReactNode }) => (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        {children}
      </div>
    </main>
  ), []);

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
      // Create chat session if this is the first message
      if (!chatSessionIdRef.current) {
        try {
          const sessionResponse = await chatSessionProtectedCreateChatSessionPost({
            headers: {
              Authorization: session.idToken,
            },
          });

          if (sessionResponse.status === 200) {
            chatSessionIdRef.current = sessionResponse.data.public_id;
            // Store the session ID so it persists across page reloads
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

      // Send message and handle streaming response via Next.js API route (avoids CORS)
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

      // Note: We store the session ID locally so it persists across page reloads.
      // The chat session is created and messages are saved on the backend.
      // Users can access this conversation later from the chat history sidebar, or it will be restored on reload.
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      handleAuthError(error as { status?: number; message?: string });
    } finally {
      setIsLoading(false);
      // Focus the input after response is complete
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <>
      <ChatSidebar 
        isOpen={isSidebarOpen} 
        onToggle={toggleSidebar}
        chatSessions={initialChatSessions}
        initialLoading={false}
      />
      <Container>
        <div className="bg-white rounded-xl shadow-lg border border-border flex flex-col flex-1" style={{ maxHeight: 'calc(100vh - var(--header-height) - 5rem)' }}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 4v16"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {chatTopic || 'New Chat'}
                </h1>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ChatMessages
            key={chatSessionIdRef.current || 'new-chat'}
            messages={messages}
            onChatTopic={setChatTopic}
          />

          {/* Input */}
          <div className="flex-shrink-0">
            <ChatInput ref={chatInputRef} onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </Container>
    </>
  );
}