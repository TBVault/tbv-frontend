'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
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
  
  // Show chat history expanded only on chat pages
  const isChatPage = pathname?.startsWith('/chat');
  
  return (
    <div className="flex min-h-screen">
      <AppSidebar 
        chatSessions={chatSessions}
        showChatHistory={isChatPage}
        transcriptCount={transcriptCount}
        chatCount={chatCount}
      />
      <main className="flex-1 lg:ml-sidebar main-content-transition">
        {children}
      </main>
    </div>
  );
}

