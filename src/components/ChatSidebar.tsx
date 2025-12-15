'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ChatSession } from '@/api/generated/schemas';
import { chatSessionsProtectedChatSessionsGet } from '@/api/generated/endpoints/default/default';
import { useSession } from 'next-auth/react';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Helper function to format timestamp
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatSessions = async () => {
      if (!session?.idToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await chatSessionsProtectedChatSessionsGet({
          headers: {
            Authorization: session.idToken,
          },
        });

        if (response.status === 200) {
          setChatSessions(response.data);
        }
      } catch (error) {
        console.error('Error fetching chat sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchChatSessions();
    }
  }, [session?.idToken, isOpen]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-gray-900 text-white transition-transform duration-300 z-50 w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat History</h2>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-800 rounded"
              aria-label="Close sidebar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-700">
            <Link
              href="/chat"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Chat
            </Link>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="text-center text-gray-400 text-sm py-4">
                Loading chats...
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">
                No chat history yet
              </div>
            ) : (
              chatSessions.map((chatSession) => (
                <Link
                  key={chatSession.public_id}
                  href={`/chat/${chatSession.public_id}`}
                  className={`block p-3 rounded-lg hover:bg-gray-800 transition-colors ${
                    pathname === `/chat/${chatSession.public_id}` ? 'bg-gray-800' : ''
                  }`}
                >
                  <h3 className="font-medium text-sm truncate">
                    {chatSession.chat_topic || 'Conversation'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(chatSession.created_on)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

    </>
  );
}

