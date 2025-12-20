import { auth } from '@/auth';
import type { Metadata } from 'next';
import NewChatInterface from '@/components/NewChatInterface';
import GatedPage from '@/components/GatedPage';

export const metadata: Metadata = {
  title: 'New Chat | The Bhakti Vault',
};

export default async function ChatPage() {
  const session = await auth();

  if (!session?.idToken) {
    return <GatedPage title="Sign In Required" description="Chat is only accessible to authorized team members." />;
  }

  return <NewChatInterface />;
}
