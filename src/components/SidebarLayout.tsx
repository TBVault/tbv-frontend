'use client';

import AppSidebar from '@/components/AppSidebar';
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import type { ChatSession, BrowsingHistory } from '@/api/generated/schemas';

interface SidebarLayoutProps {
  children: React.ReactNode;
  chatSessions?: ChatSession[];
  transcriptCount?: number;
  chatCount?: number;
  browsingHistory?: BrowsingHistory[];
}

function SidebarLayoutContent({ 
  children, 
  transcriptCount = 0,
  chatCount = 0,
}: SidebarLayoutProps) {
  const { isCollapsed, setIsCollapsed, browsingHistory, chatSessions } = useSidebar();
  
  return (
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
  );
}

export default function SidebarLayout(props: SidebarLayoutProps) {
  return (
    <SidebarProvider initialBrowsingHistory={props.browsingHistory} initialChatSessions={props.chatSessions}>
      <MobileSidebarProvider>
        <SidebarLayoutContent {...props} />
      </MobileSidebarProvider>
    </SidebarProvider>
  );
}

