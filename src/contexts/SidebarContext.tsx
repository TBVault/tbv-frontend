'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { BrowsingHistory, ChatSession } from '@/api/generated/schemas';
import { getBrowsingHistory } from '@/app/actions';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  browsingHistory: BrowsingHistory[];
  refreshBrowsingHistory: () => Promise<void>;
  updateBrowsingHistory: (history: BrowsingHistory[]) => void;
  chatSessions: ChatSession[];
  updateChatSessions: (sessions: ChatSession[]) => void;
  refreshChatSessions: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
  initialBrowsingHistory?: BrowsingHistory[];
  initialChatSessions?: ChatSession[];
}

export function SidebarProvider({ children, initialBrowsingHistory = [], initialChatSessions = [] }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [browsingHistory, setBrowsingHistory] = useState<BrowsingHistory[]>(initialBrowsingHistory);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(initialChatSessions);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);
  
  const refreshBrowsingHistory = useCallback(async () => {
    try {
      const result = await getBrowsingHistory();
      if (result.success && result.data) {
        setBrowsingHistory(result.data);
      }
    } catch {
      // Silently ignore errors
    }
  }, []);

  const updateBrowsingHistory = useCallback((history: BrowsingHistory[]) => {
    setBrowsingHistory(history);
  }, []);

  const updateChatSessions = useCallback((sessions: ChatSession[]) => {
    setChatSessions(sessions);
  }, []);

  const refreshChatSessions = useCallback(async () => {
    // For now we don't have a server action for this, but we can structure it similarly
    // The client will mostly drive updates via optimistic updates
  }, []);

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setIsCollapsed, 
      toggleSidebar,
      browsingHistory,
      refreshBrowsingHistory,
      updateBrowsingHistory,
      chatSessions,
      updateChatSessions,
      refreshChatSessions
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
