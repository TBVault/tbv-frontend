import "./globals.css";

import SessionProvider from "@/components/SessionProvider";
import SidebarLayout from "@/components/SidebarLayout";
import ViewportHeightFix from "@/components/ViewportHeightFix";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { auth } from "@/auth";
import { chatSessionsProtectedChatSessionsGet, transcriptsProtectedTranscriptsGet } from "@/api/generated/endpoints/default/default";
import type { ChatSession } from "@/api/generated/schemas";

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
    return { chatSessions: [], transcriptCount: 0, chatCount: 0 };
  }

  let chatSessions: ChatSession[] = [];
  let transcriptCount = 0;

  try {
    const [chatResponse, transcriptResponse] = await Promise.all([
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
    ]);

    if (chatResponse.status === 200) {
      chatSessions = chatResponse.data;
    }
    
    if (transcriptResponse.status === 200) {
      transcriptCount = transcriptResponse.data.total_count;
    }
  } catch (error) {
    console.error('Error fetching layout data:', error);
  }

  return { 
    chatSessions, 
    transcriptCount,
    chatCount: chatSessions.length,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { chatSessions, transcriptCount, chatCount } = await getLayoutData();

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
            >
              {children}
            </SidebarLayout>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
