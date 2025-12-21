'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface MobileSidebarContextValue {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  return (
    <MobileSidebarContext.Provider value={{ isMobileOpen, setIsMobileOpen, toggleMobileSidebar }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebar must be used within a MobileSidebarProvider');
  }
  return context;
}

