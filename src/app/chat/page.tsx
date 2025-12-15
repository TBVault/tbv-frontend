import type { Metadata } from 'next';
import NewChatInterface from '@/components/NewChatInterface';

export const metadata: Metadata = {
  title: 'New Chat | The Bhakti Vault',
};

export default function ChatPage() {
  return <NewChatInterface />;
}
