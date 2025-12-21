import "./globals.css";

import SessionProvider from "@/components/SessionProvider";
import SidebarLayout from "@/components/SidebarLayout";
import ViewportHeightFix from "@/components/ViewportHeightFix";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { auth } from "@/auth";
import { chatSessionsProtectedChatSessionsGet, transcriptsProtectedTranscriptsGet, browsingHistoryProtectedBrowsingHistoryGet } from "@/api/generated/endpoints/default/default";
import type { ChatSession, BrowsingHistory } from "@/api/generated/schemas";

export const metadata = {
  title: "The Bhakti Vault",
  description: "H.G. Vaiśeṣika Dāsa's Lecture Archive",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

async function getLayoutData() {
  const session = await auth();
  
  if (!session?.idToken) {
    return { chatSessions: [], transcriptCount: 0, chatCount: 0, browsingHistory: [] };
  }

  let chatSessions: ChatSession[] = [];
  let transcriptCount = 0;
  let browsingHistory: BrowsingHistory[] = [];

  try {
    const [chatResponse, transcriptResponse, browsingHistoryResponse] = await Promise.all([
      chatSessionsProtectedChatSessionsGet({
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 10,
          tags: ['chat-sessions'],
        },
      }),
      transcriptsProtectedTranscriptsGet(
        { page_number: 1 },
        {
          headers: {
            Authorization: session.idToken.trim(),
          },
          next: {
            revalidate: 60,
            tags: ['transcripts'],
          },
        }
      ),
      browsingHistoryProtectedBrowsingHistoryGet({
        headers: {
          Authorization: session.idToken.trim(),
        },
        cache: 'no-store',
      }),
    ]);

    if (chatResponse.status === 200) {
      chatSessions = chatResponse.data;
    }
    
    if (transcriptResponse.status === 200) {
      transcriptCount = transcriptResponse.data.total_count;
    }

    if (browsingHistoryResponse.status === 200) {
      browsingHistory = browsingHistoryResponse.data;
    }
  } catch (error) {
    console.error('Error fetching layout data:', error);
  }

  return { 
    chatSessions, 
    transcriptCount,
    chatCount: chatSessions.length,
    browsingHistory,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { chatSessions, transcriptCount, chatCount, browsingHistory } = await getLayoutData();

  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body>
        <ViewportHeightFix />
        <SessionProvider>
          <ThemeProvider>
            <SidebarLayout 
              chatSessions={chatSessions}
              transcriptCount={transcriptCount}
              chatCount={chatCount}
              browsingHistory={browsingHistory}
            >
              {children}
            </SidebarLayout>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
