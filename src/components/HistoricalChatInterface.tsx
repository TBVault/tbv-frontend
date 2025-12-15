'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/components/ChatInput';
import type { ChatSessionMessage, ChatSession } from '@/api/generated/schemas';
import { chatSessionHistoryProtectedChatSessionChatSessionIdGet } from '@/api/generated/endpoints/default/default';
import { processStreamBuffer } from '@/utils/streamingHelpers';

interface HistoricalChatInterfaceProps {
  chatSessionId: string;
}

export default function HistoricalChatInterface({ chatSessionId }: HistoricalChatInterfaceProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  useEffect(() => {
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
        }
      } catch (error: any) {
        console.error('Error fetching chat history:', error);
        // Check for authentication errors
        if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
          router.push('/auth/error');
          return;
        }
        setError(error?.message || 'Failed to fetch chat session');
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, [chatSessionId, session?.idToken]);

  const handleSendMessage = async (content: string) => {
    if (!session?.idToken) {
      console.error('No session token available');
      return;
    }

    setIsLoading(true);

    try {
      // Create user message for display
      const userMessage: ChatSessionMessage = {
        public_id: `temp-user-${Date.now()}`,
        chat_session_id: chatSessionId,
        role: 'user',
        content: [
          {
            data: {
              type: 'text_delta',
              delta: content,
            },
          },
        ],
        created_on: Math.floor(Date.now() / 1000),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Create initial assistant message
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: ChatSessionMessage = {
        public_id: assistantMessageId,
        chat_session_id: chatSessionId,
        role: 'assistant',
        content: [],
        created_on: Math.floor(Date.now() / 1000),
      };

      setMessages((prev) => [...prev, assistantMessage]);

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
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-white rounded-xl shadow-lg border border-border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading chat...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
            <h3 className="font-semibold text-error-900 mb-1">Error Loading Chat</h3>
            <p className="text-error-800">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!chatSession) {
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-white rounded-xl shadow-lg border border-border p-8 text-center">
            <p className="text-gray-600">Chat not found</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <ChatSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow-lg border border-border flex flex-col" style={{ height: 'calc(100vh - var(--header-height) - 5rem)' }}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                  {chatSession.chat_topic || 'Conversation'}
                </h1>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ChatMessages 
            messages={messages} 
            userImage={session?.user?.image}
            userName={session?.user?.name}
          />

          {/* Input */}
          <ChatInput ref={chatInputRef} onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </main>
  );
}

