import { auth } from '@/auth';
import type { Metadata } from 'next';
import NewChatInterface from '@/components/NewChatInterface';
import GatedPage from '@/components/GatedPage';
import { chatSessionsProtectedChatSessionsGet } from '@/api/generated/endpoints/default/default';
import type { ChatSession } from '@/api/generated/schemas';

export const metadata: Metadata = {
  title: 'New Chat | The Bhakti Vault',
};

export default async function ChatPage() {
  const session = await auth();

  if (!session?.idToken) {
    return <GatedPage title="Sign In Required" description="Chat is only accessible to authorized team members." />;
  }

  // Fetch chat sessions on the server
  let chatSessions: ChatSession[] = [];
  try {
    const response = await chatSessionsProtectedChatSessionsGet({
      headers: {
        Authorization: session.idToken.trim(),
      },
      next: {
        revalidate: 10, // Cache for 10 seconds
        tags: ['chat-sessions'],
      },
    });

    if (response.status === 200) {
      chatSessions = response.data;
    }
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
  }

  return <NewChatInterface initialChatSessions={chatSessions} />;
}
