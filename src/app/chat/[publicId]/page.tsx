import { auth } from '@/auth';
import type { Metadata } from 'next';
import { cache } from 'react';
import { chatSessionHistoryProtectedChatSessionChatSessionIdGet } from '@/api/generated/endpoints/default/default';
import HistoricalChatInterface from '@/components/HistoricalChatInterface';

interface PageProps {
  params: Promise<{
    publicId: string;
  }>;
}

// Cached function that fetches chat session data with authentication
// This deduplicates requests between generateMetadata and the page component
const getChatSessionData = cache(async (chatSessionId: string) => {
  const session = await auth();
  
  if (!session?.idToken) {
    return { session: null, data: null };
  }

  try {
    const response = await chatSessionHistoryProtectedChatSessionChatSessionIdGet(
      chatSessionId,
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 60, // Cache for 1 minute
          tags: ['chat-session', `chat-session-${chatSessionId}`],
        },
      }
    );
    return { session, data: response };
  } catch (err) {
    return { session, data: null };
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const { data } = await getChatSessionData(publicId);
  
  if (data?.status === 200 && data.data.chat_session?.chat_topic) {
    return {
      title: `${data.data.chat_session.chat_topic} | The Bhakti Vault`,
    };
  }
  
  return {
    title: 'Conversation | The Bhakti Vault',
  };
}

export default async function HistoricalChatPage({ params }: PageProps) {
  const { publicId } = await params;
  
  return <HistoricalChatInterface chatSessionId={publicId} />;
}
