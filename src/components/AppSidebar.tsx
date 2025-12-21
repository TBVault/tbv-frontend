'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import Logo from '@/components/Logo';
import type { ChatSession, BrowsingHistory } from '@/api/generated/schemas';
import { useClickOutside } from '@/utils/useClickOutside';
import { useTheme } from '@/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { SkeletonChatHistoryGroup } from '@/components/Skeleton';

interface AppSidebarProps {
  chatSessions?: ChatSession[];
  showChatHistory?: boolean;
  transcriptCount?: number;
  chatCount?: number;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  browsingHistory?: BrowsingHistory[];
}

// Group chat sessions by date
function groupChatsByDate(chatSessions: ChatSession[]): { label: string; chats: ChatSession[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { label: string; chats: ChatSession[] }[] = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Previous 7 Days', chats: [] },
    { label: 'Previous 30 Days', chats: [] },
    { label: 'Older', chats: [] },
  ];

  chatSessions.forEach(chat => {
    const chatDate = new Date(chat.created_on * 1000);
    if (chatDate >= today) {
      groups[0].chats.push(chat);
    } else if (chatDate >= yesterday) {
      groups[1].chats.push(chat);
    } else if (chatDate >= weekAgo) {
      groups[2].chats.push(chat);
    } else if (chatDate >= monthAgo) {
      groups[3].chats.push(chat);
    } else {
      groups[4].chats.push(chat);
    }
  });

  return groups.filter(g => g.chats.length > 0);
}

export default function AppSidebar({ 
  chatSessions = [], 
  showChatHistory = true,
  transcriptCount = 0,
  chatCount = 0,
  isCollapsed: controlledIsCollapsed,
  onCollapsedChange,
  browsingHistory = [],
}: AppSidebarProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isMobileOpen, setIsMobileOpen } = useMobileSidebar();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile view (below lg breakpoint, which is 1024px in Tailwind)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Check on mount
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Use controlled state if provided, otherwise use internal state
  // On mobile, always use false (not collapsed) regardless of state
  const isCollapsed = isMobile ? false : (controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed);
  const setIsCollapsed = (collapsed: boolean) => {
    // Don't allow collapsing on mobile
    if (isMobile) return;
    
    if (onCollapsedChange) {
      onCollapsedChange(collapsed);
    } else {
      setInternalIsCollapsed(collapsed);
    }
  };
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null!);
  const sidebarRef = useRef<HTMLDivElement>(null!);
  
  // Collapsible sections state with localStorage persistence
  // Start with default collapsed state to match SSR, then hydrate from localStorage
  const [isRecentChatsCollapsed, setIsRecentChatsCollapsed] = useState(true);
  const [isRecentlyViewedCollapsed, setIsRecentlyViewedCollapsed] = useState(true);
  
  // Hydrate collapse states from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const savedChats = localStorage.getItem('recentChatsCollapsed');
    if (savedChats !== null) {
      setIsRecentChatsCollapsed(JSON.parse(savedChats));
    }
    
    const savedViewed = localStorage.getItem('recentlyViewedCollapsed');
    if (savedViewed !== null) {
      setIsRecentlyViewedCollapsed(JSON.parse(savedViewed));
    }
  }, []);
  
  // Persist collapse state to localStorage
  const toggleRecentChats = () => {
    const newValue = !isRecentChatsCollapsed;
    setIsRecentChatsCollapsed(newValue);
    localStorage.setItem('recentChatsCollapsed', JSON.stringify(newValue));
  };
  
  const toggleRecentlyViewed = () => {
    const newValue = !isRecentlyViewedCollapsed;
    setIsRecentlyViewedCollapsed(newValue);
    localStorage.setItem('recentlyViewedCollapsed', JSON.stringify(newValue));
  };

  useClickOutside(profileRef, () => setIsProfileOpen(false), isProfileOpen);
  
  // Close mobile sidebar when clicking outside
  useClickOutside(sidebarRef, () => {
    if (isMobileOpen) setIsMobileOpen(false);
  }, isMobileOpen);

  // Close mobile sidebar on route change
  useEffect(() => {
    // Only update if sidebar is open to avoid unnecessary renders
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const groupedChats = groupChatsByDate(chatSessions);

  // Handle clicking "New Chat" button
  const handleNewChat = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    localStorage.removeItem('currentChatSessionId');
    
    if (pathname === '/chat') {
      router.push(`/chat?reset=${Date.now()}`);
    } else {
      router.push('/chat');
    }
  };

  const userImage = session?.user?.image;
  const userName = session?.user?.name || session?.user?.email;
  const userEmail = session?.user?.email;
  const userRole = session?.user?.role || 'Member';

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-50 flex flex-col sidebar-transition
          ${isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header with Logo */}
        <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-sidebar-border min-h-[56px] ${isCollapsed ? 'justify-center' : ''}`}>
          {isCollapsed ? (
            // Hamburger menu when collapsed
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-sidebar-hover transition-colors"
              aria-label="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Logo size={32} className="flex-shrink-0" />
                <span className="font-semibold text-foreground text-sm whitespace-nowrap">The Bhakti Vault</span>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="ml-auto p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground hover:bg-sidebar-hover transition-colors hidden lg:block"
                aria-label="Collapse sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-2 space-y-1">
          <Link
            href="/chat"
            onClick={handleNewChat}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
              ${pathname === '/chat' && !pathname.includes('/chat/') 
                ? 'bg-sidebar-active text-foreground' 
                : 'text-foreground-secondary hover:text-foreground hover:bg-sidebar-hover'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'New Chat' : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {!isCollapsed && <span className="text-sm font-medium">New Chat</span>}
          </Link>

          <Link
            href="/transcripts"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              ${pathname?.startsWith('/transcript') 
                ? 'bg-sidebar-active text-foreground' 
                : 'text-foreground-secondary hover:text-foreground hover:bg-sidebar-hover'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Browse Transcripts' : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!isCollapsed && <span className="text-sm font-medium">Transcripts</span>}
          </Link>
        </nav>

        {/* Chat History and Recently Viewed Section - Flex layout with 50/50 max split */}
        {showChatHistory && !isCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden mt-2">
            {/* Recent Chats - Max 50% when both expanded */}
            <div className={`flex flex-col overflow-hidden px-2 ${
              !isRecentChatsCollapsed && !isRecentlyViewedCollapsed && browsingHistory.length > 0
                ? 'flex-1 max-h-[50%]'
                : !isRecentChatsCollapsed
                ? 'flex-1'
                : 'flex-shrink-0'
            }`}>
              <button
                onClick={toggleRecentChats}
                className="flex items-center justify-between px-2 py-2 hover:bg-sidebar-hover transition-colors rounded-lg w-full flex-shrink-0"
              >
                <h3 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                  Recent Chats
                </h3>
                <svg
                  className={`w-4 h-4 text-foreground-tertiary transition-transform ${
                    isRecentChatsCollapsed ? '-rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!isRecentChatsCollapsed && (
                <div className="overflow-y-auto hide-scrollbar flex-1 min-h-0 mt-1">
                  {status === 'loading' ? (
                    /* Loading skeleton for chat history */
                    <div className="space-y-3">
                      <SkeletonChatHistoryGroup count={2} />
                      <SkeletonChatHistoryGroup count={3} />
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-foreground-muted">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="">
                      {groupedChats.map((group) => (
                        <div key={group.label}>
                          <div className="px-3 py-1">
                            <span className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider">
                              {group.label}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {group.chats.map((chat) => (
                              <Link
                                key={chat.public_id}
                                href={`/chat/${chat.public_id}`}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group
                                  ${pathname === `/chat/${chat.public_id}` 
                                    ? 'bg-sidebar-active text-foreground' 
                                    : 'text-foreground-secondary hover:text-foreground hover:bg-sidebar-hover'
                                  }
                                `}
                              >
                                <svg
                                  className={`w-4 h-4 flex-shrink-0 ${
                                    pathname === `/chat/${chat.public_id}` 
                                      ? 'text-primary-500' 
                                      : 'text-foreground-muted group-hover:text-foreground-tertiary'
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
                                <span className="text-sm truncate flex-1">
                                  {chat.chat_topic || 'Conversation'}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recently Viewed - Max 50% when both expanded */}
            {browsingHistory.length > 0 && (
              <div className={`flex flex-col overflow-hidden px-2 mt-3 ${
                !isRecentChatsCollapsed && !isRecentlyViewedCollapsed
                  ? 'flex-1 max-h-[50%]'
                  : !isRecentlyViewedCollapsed
                  ? 'flex-1'
                  : 'flex-shrink-0'
              }`}>
                <button
                  onClick={toggleRecentlyViewed}
                  className="flex items-center justify-between px-2 py-2 hover:bg-sidebar-hover transition-colors rounded-lg w-full flex-shrink-0"
                >
                  <h3 className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                    Recently Viewed
                  </h3>
                  <svg
                    className={`w-4 h-4 text-foreground-tertiary transition-transform ${
                      isRecentlyViewedCollapsed ? '-rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isRecentlyViewedCollapsed && (
                  <div className="overflow-y-auto hide-scrollbar flex-1 min-h-0 mt-1">
                    <div className="space-y-0.5">
                      {browsingHistory
                        .sort((a, b) => b.last_accessed_on - a.last_accessed_on)
                        .map((item) => (
                          <Link
                            key={item.public_id}
                            href={`/transcript/${item.transcript_id}`}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group
                              ${pathname === `/transcript/${item.transcript_id}` 
                                ? 'bg-sidebar-active text-foreground' 
                                : 'text-foreground-secondary hover:text-foreground hover:bg-sidebar-hover'
                              }
                            `}
                          >
                            <svg
                              className={`w-4 h-4 flex-shrink-0 ${
                                pathname === `/transcript/${item.transcript_id}` 
                                  ? 'text-primary-500' 
                                  : 'text-foreground-muted group-hover:text-foreground-tertiary'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="text-sm truncate flex-1">
                              {item.transcript_semantic_title}
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapsed state: show chat icon if showChatHistory */}
        {showChatHistory && isCollapsed && chatSessions.length > 0 && (
          <div className="p-2 border-t border-sidebar-border">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-foreground-tertiary">{chatSessions.length}</span>
              <svg className="w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        )}

        {/* Spacer - only show when chat history is not taking the space */}
        {(!showChatHistory || isCollapsed) && <div className="flex-1" />}

        {/* Profile Section */}
        <div className="border-t border-sidebar-border p-2" ref={profileRef}>
          {status === 'loading' ? (
            <div className={`flex items-center gap-3 p-2 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-sidebar-hover animate-pulse" />
              {!isCollapsed && (
                <div className="flex-1">
                  <div className="h-3 bg-sidebar-hover rounded animate-pulse w-20" />
                  <div className="h-2 bg-sidebar-hover rounded animate-pulse w-16 mt-1" />
                </div>
              )}
            </div>
          ) : session?.user ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-full flex items-center gap-3 p-2 min-h-[52px] rounded-lg hover:bg-sidebar-hover transition-colors
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                aria-label="User menu"
              >
                {userImage && !imageError ? (
                  <Image
                    src={userImage}
                    alt={userName || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border border-sidebar-border"
                    onError={() => setImageError(true)}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-sm">
                    {userName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {!isCollapsed && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                      <p className="text-xs text-foreground-tertiary truncate">{userRole}</p>
                    </div>
                    <svg className={`w-4 h-4 text-foreground-tertiary transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                )}
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className={`absolute bottom-full mb-2 bg-background-elevated rounded-xl shadow-lg border border-border py-2 z-50
                  ${isCollapsed ? 'left-full ml-2 w-56' : 'left-0 right-0'}
                `}>
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">{userName}</p>
                    {userEmail && (
                      <p className="text-xs text-foreground-tertiary mt-0.5">{userEmail}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="py-0.5 text-xs font-medium text-primary-400">
                        {userRole}
                      </span>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 border-b border-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{transcriptCount}</p>
                        <p className="text-xs text-foreground-tertiary">Transcripts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{chatCount}</p>
                        <p className="text-xs text-foreground-tertiary">Chats</p>
                      </div>
                    </div>
                  </div>

                  {/* Theme Toggle */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider mb-2">
                      Appearance
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === 'light'
                            ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30'
                            : 'bg-sidebar-hover text-foreground-secondary hover:text-foreground'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Light
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30'
                            : 'bg-sidebar-hover text-foreground-secondary hover:text-foreground'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Dark
                      </button>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground-secondary hover:bg-sidebar-hover hover:text-foreground transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground-secondary hover:bg-sidebar-hover hover:text-foreground transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn('oidc')}
              className={`w-full flex items-center gap-3 p-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {!isCollapsed && <span className="text-sm font-medium">Sign In</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

