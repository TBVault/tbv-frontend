import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { chatSessionHistoryProtectedChatSessionChatSessionIdGet, chatSessionsProtectedChatSessionsGet } from '@/api/generated/endpoints/default/default';
import { transcriptProtectedTranscriptGet } from '@/api/generated/endpoints/default/default';
import type { Transcript, ChatSessionMessage, ChatSession } from '@/api/generated/schemas';
import HistoricalChatInterface from '@/components/HistoricalChatInterface';
import GatedPage from '@/components/GatedPage';

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
    return { session: null, data: null, error: null, transcripts: new Map() };
  }

  try {
    const response = await chatSessionHistoryProtectedChatSessionChatSessionIdGet(
      chatSessionId,
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 10, // Cache for 10 seconds
          tags: ['chat-session', `chat-session-${chatSessionId}`],
        },
      }
    );

    // Extract transcript IDs from messages and pre-fetch transcript data
    const transcriptIds = new Set<string>();
    if (response?.status === 200 && response.data && 'messages' in response.data) {
      (response.data.messages as ChatSessionMessage[]).forEach((message) => {
        message.content?.forEach((chatObject) => {
          if (chatObject.data?.type === 'transcript_citation') {
            transcriptIds.add(chatObject.data.transcript_id);
          }
        });
      });
    }

    // Fetch transcripts in parallel
    const transcripts = new Map<string, Transcript>();
    if (transcriptIds.size > 0) {
      const transcriptPromises = Array.from(transcriptIds).map(async (transcriptId) => {
        try {
          const transcriptResponse = await transcriptProtectedTranscriptGet(
            { public_id: transcriptId },
            {
              headers: {
                Authorization: session.idToken?.trim() || '',
              },
              next: {
                revalidate: 300, // Cache transcripts for 5 minutes
                tags: ['transcript', `transcript-${transcriptId}`],
              },
            }
          );
          if (transcriptResponse.status === 200) {
            transcripts.set(transcriptId, transcriptResponse.data);
          }
        } catch (err) {
          console.error(`Error fetching transcript ${transcriptId}:`, err);
        }
      });

      await Promise.all(transcriptPromises);
    }

    return { session, data: response, error: null, transcripts };
  } catch (err: unknown) {
    return { session, data: null, error: err, transcripts: new Map() };
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
  const { session, data: chatSessionData, error: fetchError, transcripts } = await getChatSessionData(publicId);

  if (!session?.idToken) {
    return <GatedPage title="Sign In Required" description="This conversation is only accessible to authorized team members." showSignInButton={false} />;
  }

  // Check for authentication errors
  if (fetchError) {
    const err = fetchError as { status?: number; message?: string };
    if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
      redirect('/auth/error');
    }
  }

  const error = fetchError ? (fetchError instanceof Error ? fetchError.message : "Failed to fetch chat session") : null;

  // If we successfully fetched the chat session but data is missing, error the page out
  if (chatSessionData?.status === 200 && !chatSessionData.data.chat_session) {
    throw new Error("Chat session data is missing");
  }

  if (error) {
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
            <h3 className="font-semibold text-error-900 mb-1">Error Loading Chat</h3>
            <p className="text-error-800">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  // Fetch chat sessions for sidebar
  let chatSessions: ChatSession[] = [];
  try {
    const response = await chatSessionsProtectedChatSessionsGet({
      headers: {
        Authorization: session.idToken.trim(),
      },
    });

    if (response.status === 200) {
      chatSessions = response.data;
    }
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
  }

  return (
    <HistoricalChatInterface
      chatSessionId={publicId}
      initialChatSession={chatSessionData?.status === 200 && chatSessionData.data && 'chat_session' in chatSessionData.data ? chatSessionData.data.chat_session : null}
      initialMessages={chatSessionData?.status === 200 && chatSessionData.data && 'messages' in chatSessionData.data ? chatSessionData.data.messages : []}
      initialLoading={false}
      preFetchedTranscripts={transcripts}
      initialChatSessions={chatSessions}
    />
  );
}
