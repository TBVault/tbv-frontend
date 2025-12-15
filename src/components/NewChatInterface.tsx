'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';
import type { ChatSessionMessage, ChatObject } from '@/api/generated/schemas';
import { chatSessionProtectedCreateChatSessionPost } from '@/api/generated/endpoints/default/default';

export default function NewChatInterface() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<ChatSessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionIdRef = useRef<string | null>(null);

  const handleSendMessage = async (content: string) => {
    if (!session?.idToken) {
      console.error('No session token available');
      return;
    }

    setIsLoading(true);

    try {
      // Create chat session if this is the first message
      if (!chatSessionIdRef.current) {
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

      console.log('🚀 Starting stream read at', new Date().toISOString());

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
                console.log(`  ✨ Object ${totalObjects}:`, chatObject.data.type);
                
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
                console.warn('❌ Failed to parse JSON:', jsonStr.substring(0, 50));
              }
              
              // Remove processed object from remaining buffer
              remaining = bufferToParse.substring(i + 1);
              // Recursively process remaining buffer
              return processBuffer(remaining, isFinal);
            }
          }
        }
        
        // If we're in final processing and have unparsed data, warn about it
        if (isFinal && remaining.trim()) {
          console.warn('⚠️ Unparsed data remaining:', remaining.substring(0, 100));
        }
        
        return remaining;
      };

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream done. Total chunks:', chunkCount, 'Total objects:', totalObjects);
          break;
        }

        chunkCount++;
        const now = Date.now();
        const timeSinceStart = now - startTime;
        const timeSinceLastChunk = now - lastChunkTime;
        lastChunkTime = now;
        
        const chunk = decoder.decode(value, { stream: true });
        console.log(`📦 Chunk ${chunkCount} received after ${timeSinceLastChunk}ms (total: ${timeSinceStart}ms)`);
        buffer += chunk;

        // Process any complete JSON objects in the buffer
        buffer = processBuffer(buffer);
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        console.log('🔄 Processing remaining buffer');
        processBuffer(buffer, true);
      }

      // Note: We don't redirect to /chat/[id] to avoid interrupting the conversation.
      // The chat session is created and messages are saved on the backend.
      // Users can access this conversation later from the chat history sidebar.
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </main>
  );
}

