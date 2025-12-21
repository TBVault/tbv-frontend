'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext';
import type { ChatSession } from '@/api/generated/schemas';

interface SidebarLayoutProps {
  children: React.ReactNode;
  chatSessions?: ChatSession[];
  transcriptCount?: number;
  chatCount?: number;
}

export default function SidebarLayout({ 
  children, 
  chatSessions = [],
  transcriptCount = 0,
  chatCount = 0,
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Show chat history expanded only on chat pages
  const isChatPage = pathname?.startsWith('/chat');
  
  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen-mobile h-screen-mobile">
        <AppSidebar 
          chatSessions={chatSessions}
          showChatHistory={isChatPage}
          transcriptCount={transcriptCount}
          chatCount={chatCount}
          isCollapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
        />
        <main className={`flex-1 main-content-transition ${isCollapsed ? 'lg:ml-sidebar-collapsed' : 'lg:ml-sidebar'} overflow-hidden`}>
          {children}
        </main>
      </div>
    </MobileSidebarProvider>
  );
}

