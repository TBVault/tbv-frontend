'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { BrowsingHistory } from '@/api/generated/schemas';
import { getBrowsingHistory } from '@/app/actions';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  browsingHistory: BrowsingHistory[];
  refreshBrowsingHistory: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
  initialBrowsingHistory?: BrowsingHistory[];
}

export function SidebarProvider({ children, initialBrowsingHistory = [] }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [browsingHistory, setBrowsingHistory] = useState<BrowsingHistory[]>(initialBrowsingHistory);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);
  
  const refreshBrowsingHistory = useCallback(async () => {
    try {
      const result = await getBrowsingHistory();
      if (result.success && result.data) {
        setBrowsingHistory(result.data);
      }
    } catch (err) {
      console.error('Failed to refresh browsing history:', err);
    }
  }, []);

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setIsCollapsed, 
      toggleSidebar,
      browsingHistory,
      refreshBrowsingHistory 
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
