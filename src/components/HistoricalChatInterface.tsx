'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatMessages from '@/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/components/ChatInput';
import ChatSidebar from '@/components/ChatSidebar';
import type { ChatSessionMessage, ChatSession, Transcript } from '@/api/generated/schemas';
import { chatSessionHistoryProtectedChatSessionChatSessionIdGet } from '@/api/generated/endpoints/default/default';
import { processStreamBuffer } from '@/utils/streamingHelpers';

interface HistoricalChatInterfaceProps {
  chatSessionId: string;
  initialChatSession?: ChatSession | null;
  initialMessages?: ChatSessionMessage[];
  initialLoading?: boolean;
  preFetchedTranscripts?: Map<string, Transcript>;
  initialChatSessions?: ChatSession[];
}

export default function HistoricalChatInterface({
  chatSessionId,
  initialChatSession = null,
  initialMessages = [],
  initialLoading = true,
  preFetchedTranscripts = new Map(),
  initialChatSessions = []
}: HistoricalChatInterfaceProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [chatSession, setChatSession] = useState<ChatSession | null>(initialChatSession);
  const [messages, setMessages] = useState<ChatSessionMessage[]>(initialMessages);
  const [loading, setLoading] = useState(initialLoading);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatNotFound, setChatNotFound] = useState(false);
  const [chatTopic, setChatTopic] = useState<string | null>(initialChatSession?.chat_topic || null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Stable Container component - defined outside render to prevent remounts
  const Container = useCallback(({ children }: { children: React.ReactNode }) => (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {children}
      </div>
    </main>
  ), []);

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
    // If we have pre-fetched data, mark as not loading
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
      // Focus the input after response is complete
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="bg-white rounded-xl shadow-lg border border-border p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
          <h3 className="font-semibold text-error-900 mb-1">Error Loading Chat</h3>
          <p className="text-error-800">{error}</p>
        </div>
      </Container>
    );
  }

  if (chatNotFound) {
    return (
      <Container>
        <div className="bg-white rounded-xl shadow-lg border border-border p-8 text-center">
          <p className="text-gray-600">Chat not found</p>
        </div>
      </Container>
    );
  }


  return (
    <>
      <ChatSidebar 
        isOpen={isSidebarOpen} 
        onToggle={toggleSidebar}
        chatSessions={initialChatSessions}
        initialLoading={false}
      />
      <Container>
        <div className="bg-white rounded-xl shadow-lg border border-border flex flex-col" style={{ height: 'calc(100vh - var(--header-height) - 5rem)' }}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 rounded-t-xl flex items-center justify-between">
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
                  {chatTopic || chatSession?.chat_topic || 'Conversation'}
                </h1>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ChatMessages
            key={`chat-messages-${chatSessionId}`}
            messages={messages}
            preFetchedTranscripts={preFetchedTranscripts}
            onChatTopic={setChatTopic}
          />

          {/* Input */}
          <ChatInput ref={chatInputRef} onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </Container>
    </>
  );
}