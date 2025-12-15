'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput, { type ChatInputRef } from '@/components/ChatInput';
import type { ChatSessionMessage, ChatObject } from '@/api/generated/schemas';
import { chatSessionProtectedCreateChatSessionPost } from '@/api/generated/endpoints/default/default';

export default function NewChatInterface() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

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
          } else {
            console.error('Failed to create chat session');
            setIsLoading(false);
            return;
          }
        } catch (err: any) {
          // Check for authentication errors
          if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
            router.push('/auth/error');
            setIsLoading(false);
            return;
          }
          throw err;
        }
      }

      const chatSessionId = chatSessionIdRef.current;

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
        // Check for authentication errors
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
      let chunkCount = 0;
      let totalObjects = 0;
      const startTime = Date.now();
      let lastChunkTime = startTime;

      const processBuffer = (bufferToParse: string, isFinal = false) => {
        if (!bufferToParse.trim()) return '';

        // Try to extract complete JSON objects from the buffer
        let remaining = bufferToParse;
        let braceCount = 0;
        let startIdx = -1;
        
        for (let i = 0; i < bufferToParse.length; i++) {
          const char = bufferToParse[i];
          
          if (char === '{') {
            if (braceCount === 0) {
              startIdx = i;
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            
            if (braceCount === 0 && startIdx !== -1) {
              // We have a complete JSON object
              const jsonStr = bufferToParse.substring(startIdx, i + 1);
              
              try {
                const chatObject: ChatObject = JSON.parse(jsonStr);
                totalObjects++;
                
                // Update the assistant message with new content
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
              } catch (e) {
                // Failed to parse JSON, skip this object
              }
              
              // Remove processed object from remaining buffer
              remaining = bufferToParse.substring(i + 1);
              // Recursively process remaining buffer
              return processBuffer(remaining, isFinal);
            }
          }
        }
        
        return remaining;
      };

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        chunkCount++;
        const now = Date.now();
        const timeSinceStart = now - startTime;
        const timeSinceLastChunk = now - lastChunkTime;
        lastChunkTime = now;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process any complete JSON objects in the buffer
        buffer = processBuffer(buffer);
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        processBuffer(buffer, true);
      }

      // Note: We don't redirect to /chat/[id] to avoid interrupting the conversation.
      // The chat session is created and messages are saved on the backend.
      // Users can access this conversation later from the chat history sidebar.
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Check for authentication errors (in case they weren't caught earlier)
      if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
        router.push('/auth/error');
      }
    } finally {
      setIsLoading(false);
      // Focus the input after response is complete
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <ChatSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="bg-white rounded-xl shadow-lg border border-border flex flex-col flex-1" style={{ maxHeight: 'calc(100vh - var(--header-height) - 5rem)' }}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">New Chat</h1>
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
          <div className="flex-shrink-0">
            <ChatInput ref={chatInputRef} onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </main>
  );
}

