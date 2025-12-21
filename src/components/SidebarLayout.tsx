'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext';
import type { ChatSession, BrowsingHistory } from '@/api/generated/schemas';

interface SidebarLayoutProps {
  children: React.ReactNode;
  chatSessions?: ChatSession[];
  transcriptCount?: number;
  chatCount?: number;
  browsingHistory?: BrowsingHistory[];
}

export default function SidebarLayout({ 
  children, 
  chatSessions = [],
  transcriptCount = 0,
  chatCount = 0,
  browsingHistory = [],
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen-mobile h-screen-mobile">
        <AppSidebar 
          chatSessions={chatSessions}
          showChatHistory={true}
          transcriptCount={transcriptCount}
          chatCount={chatCount}
          isCollapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
          browsingHistory={browsingHistory}
        />
        <main className={`flex-1 main-content-transition ${isCollapsed ? 'lg:ml-sidebar-collapsed' : 'lg:ml-sidebar'} overflow-y-auto`}>
          {children}
        </main>
      </div>
    </MobileSidebarProvider>
  );
}

