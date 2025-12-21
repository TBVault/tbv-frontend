'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatMessages from '@/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/components/ChatInput';
import type { ChatSessionMessage, ChatSession, Transcript } from '@/api/generated/schemas';
import { chatSessionHistoryProtectedChatSessionChatSessionIdGet } from '@/api/generated/endpoints/default/default';
import { processStreamBuffer } from '@/utils/streamingHelpers';
import { Skeleton, SkeletonChatMessage, SkeletonText } from '@/components/Skeleton';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

interface HistoricalChatInterfaceProps {
  chatSessionId: string;
  initialChatSession?: ChatSession | null;
  initialMessages?: ChatSessionMessage[];
  initialLoading?: boolean;
  preFetchedTranscripts?: Map<string, Transcript>;
}

export default function HistoricalChatInterface({
  chatSessionId,
  initialChatSession = null,
  initialMessages = [],
  initialLoading = true,
  preFetchedTranscripts = new Map(),
}: HistoricalChatInterfaceProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toggleMobileSidebar } = useMobileSidebar();
  const [chatSession, setChatSession] = useState<ChatSession | null>(initialChatSession);
  const [messages, setMessages] = useState<ChatSessionMessage[]>(initialMessages);
  const [loading, setLoading] = useState(initialLoading);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatNotFound, setChatNotFound] = useState(false);
  const [chatTopic, setChatTopic] = useState<string | null>(initialChatSession?.chat_topic || null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const handleChatTopic = useCallback(async (topic: string) => {
    setChatTopic(topic);
    
    try {
      await fetch('/api/revalidate/chat-sessions', { method: 'POST' });
      router.refresh();
    } catch (error) {
      console.error('Error revalidating chat sessions:', error);
      router.refresh();
    }
  }, [router]);

  const handleError = useCallback((error: { status?: number; message?: string }) => {
    const status = error?.status;
    const message = error?.message || '';

    if (status === 401 || status === 403 || message.includes('401') || message.includes('403')) {
      router.push('/auth/error');
      return true;
    }

    if (status === 404 || message.includes('404') || message.toLowerCase().includes('not found')) {
      setChatNotFound(true);
      return true;
    }

    setError(message || 'Failed to fetch chat session');
    return false;
  }, [router]);

  const createMessage = (role: 'user' | 'assistant', content: string | null, sessionId: string): ChatSessionMessage => ({
    public_id: `temp-${role}-${Date.now()}`,
    chat_session_id: sessionId,
    role,
    content: role === 'user' && content ? [{ data: { type: 'text_delta', delta: content } }] : [],
    created_on: Math.floor(Date.now() / 1000),
  });

  useEffect(() => {
    if (initialChatSession && initialMessages.length > 0) {
      setLoading(false);
      return;
    }

    const fetchChatHistory = async () => {
      if (!session?.idToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await chatSessionHistoryProtectedChatSessionChatSessionIdGet(
          chatSessionId,
          {
            headers: {
              Authorization: session.idToken,
            },
          }
        );

        if (response.status === 200) {
          setChatSession(response.data.chat_session);
          setMessages(response.data.messages);
          setChatTopic(response.data.chat_session?.chat_topic || null);
          setLoading(false);
        }
      } catch (error: unknown) {
        console.error('Error fetching chat history:', error);
        handleError(error as { status?: number; message?: string });
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, [chatSessionId, session?.idToken, initialChatSession, initialMessages.length, handleError]);

  const handleSendMessage = async (content: string) => {
    if (!session?.idToken) {
      console.error('No session token available');
      return;
    }

    setIsLoading(true);

    try {
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
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="h-screen-mobile flex flex-col overflow-hidden">
        {/* Header skeleton */}
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
          <Skeleton className="h-6 w-48" />
        </div>

        {/* Chat Container skeleton */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          <div className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col">
            <div className="max-w-5xl mx-auto w-full space-y-6 flex-1">
              {/* User message skeleton */}
              <SkeletonChatMessage isUser={true} lines={2} />
              
              {/* Assistant message skeleton */}
              <div className="flex justify-start">
                <div className="w-full">
                  <SkeletonText lines={4} className="mb-4" />
                  
                  {/* Sources section skeleton */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Skeleton className="h-4 w-20 mb-3" />
                    <div className="flex gap-2 flex-wrap">
                      <Skeleton className="h-8 w-32 rounded-lg" />
                      <Skeleton className="h-8 w-40 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input area skeleton */}
          <div className="flex-shrink-0 border-t border-border bg-background-secondary p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-3">
                <Skeleton className="flex-1 h-12 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen-mobile flex items-center justify-center p-6">
        <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 max-w-md">
          <h3 className="font-semibold text-error-900 mb-1">Error Loading Chat</h3>
          <p className="text-error-800">{error}</p>
        </div>
      </div>
    );
  }

  if (chatNotFound) {
    return (
      <div className="h-screen-mobile flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-foreground-muted/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Chat Not Found</h3>
          <p className="text-foreground-secondary">This conversation doesn&apos;t exist or has been deleted.</p>
        </div>
      </div>
    );
  }

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
          {chatTopic || chatSession?.chat_topic || 'Conversation'}
        </h1>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <ChatMessages
          key={`chat-messages-${chatSessionId}`}
          messages={messages}
          preFetchedTranscripts={preFetchedTranscripts}
          onChatTopic={handleChatTopic}
        />

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
