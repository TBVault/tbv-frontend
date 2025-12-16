'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ChatSession } from '@/api/generated/schemas';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatSessions?: ChatSession[];
  initialLoading?: boolean;
}

// Helper function to format timestamp
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatSidebar({
  isOpen,
  onToggle,
  chatSessions: initialChatSessions = [],
  initialLoading = false
}: ChatSidebarProps) {
  const pathname = usePathname();
  // Use initialChatSessions directly as initial state
  const [chatSessions] = useState<ChatSession[]>(() => initialChatSessions);
  const [loading] = useState(initialLoading);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white/95 backdrop-blur-md shadow-2xl transition-transform duration-300 z-50 w-72 border-r border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
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
          <div className="p-4">
            <Link
              href="/chat"
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
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
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-sm">Loading chats...</p>
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <svg
                  className="w-12 h-12 mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 4v16"
                  />
                </svg>
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {chatSessions.map((chatSession) => (
                  <Link
                    key={chatSession.public_id}
                    href={`/chat/${chatSession.public_id}`}
                    className={`block p-3 rounded-xl transition-all duration-200 group ${
                      pathname === `/chat/${chatSession.public_id}` 
                        ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                        : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <svg
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          pathname === `/chat/${chatSession.public_id}`
                            ? 'text-blue-600'
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm truncate ${
                          pathname === `/chat/${chatSession.public_id}`
                            ? 'text-gray-900'
                            : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {chatSession.chat_topic || 'Conversation'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(chatSession.created_on)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

