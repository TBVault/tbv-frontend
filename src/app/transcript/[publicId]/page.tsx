import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TranscriptContent from "@/components/TranscriptContent";
import AudioPlayer from "@/components/AudioPlayer";
import { transcriptProtectedTranscriptGet } from "@/api/generated/endpoints/default/default";
import type { transcriptProtectedTranscriptGetResponse } from "@/api/generated/endpoints/default/default";
import type { Metadata } from "next";
import { cache } from "react";

interface PageProps {
  params: Promise<{
    publicId: string;
  }>;
}

// Cached function that fetches transcript data with authentication
// This deduplicates requests between generateMetadata and the page component
const getTranscriptData = cache(async (publicId: string) => {
  const session = await auth();
  
  if (!session?.idToken) {
    return { session: null, data: null, error: null };
  }

  try {
    const response = await transcriptProtectedTranscriptGet(
      {
        public_id: publicId,
      },
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 600, // Cache for 10 minutes (transcripts change infrequently)
          tags: ['transcript', `transcript-${publicId}`],
        },
      }
    );
    return { session, data: response, error: null };
  } catch (err: any) {
    return { session, data: null, error: err };
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const { data } = await getTranscriptData(publicId);
  
  if (data?.status === 200) {
    const displayTitle = data.data.semantic_title || data.data.title;
    if (displayTitle) {
      return {
        title: `${displayTitle} | The Bhakti Vault`,
      };
    }
  }
  
  return {
    title: "Transcript | The Bhakti Vault",
  };
}

export default async function TranscriptPage({ params }: PageProps) {
  const { publicId } = await params;
  const { session, data: transcriptData, error: fetchError } = await getTranscriptData(publicId);

  // Show gated page if no session
  if (!session?.idToken) {
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary flex items-center justify-center px-6 py-20" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 mb-6">
            <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Sign In Required
          </h1>
          
          <p className="text-foreground-secondary mb-8">
            This transcript is only accessible to authorized team members.
          </p>
          
          <div className="bg-background rounded-xl border border-border p-8 shadow-lg mb-6">
            <a
              href="/"
              className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg text-center"
            >
              Sign In to Continue
            </a>
          </div>
          
          <p className="text-sm text-foreground-tertiary">
            Don't have access? Contact your administrator.
          </p>
        </div>
      </main>
    );
  }

  // Check for authentication errors
  if (fetchError) {
    const err = fetchError as any;
    if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
      redirect('/auth/error');
    }
  }

  const error = fetchError ? (fetchError instanceof Error ? fetchError.message : "Failed to fetch transcript") : null;

  // If we successfully fetched the transcript but content is missing, error the page out
  if (transcriptData?.status === 200 && !transcriptData.data.content) {
    throw new Error("Transcript content is missing");
  }

  return (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {error ? (
          <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
            <h3 className="font-semibold text-error-900 mb-1">Error Loading Transcript</h3>
            <p className="text-error-800">{error}</p>
          </div>
        ) : transcriptData?.status === 200 ? (
          <>
            {/* Hero Section */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-4">
                Transcript
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 break-words" style={{ lineHeight: '1.2' }}>
                {transcriptData.data.semantic_title || transcriptData.data.title}
              </h1>

              {/* Original Title - shown when semantic title is used */}
              {transcriptData.data.semantic_title && transcriptData.data.semantic_title !== transcriptData.data.title && (
                <div className="mb-4">
                  <p className="text-base text-foreground-secondary italic break-words">{transcriptData.data.title}</p>
                </div>
              )}

              {/* Tags */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-sm font-medium">
                    Spirituality
                  </div>
                </div>
                {transcriptData.data.source && (
                  <div className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">
                    {transcriptData.data.source === 'otterai' ? 'OtterAI' : transcriptData.data.source.charAt(0).toUpperCase() + transcriptData.data.source.slice(1)}
                  </div>
                )}
              </div>

              {/* Summary */}
              {transcriptData.data.summary && (
                <div className="mt-6 bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-100 rounded-xl p-5 shadow-sm">
                  <div className="text-sm font-semibold text-foreground-tertiary mb-2">AI-generated Summary:</div>
                  <p className="text-foreground-secondary leading-relaxed">{transcriptData.data.summary}</p>
                </div>
              )}
            </div>

            {/* Transcript Content */}
            <TranscriptContent content={transcriptData!.data.content!} duration={transcriptData!.data.duration} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-200 border-t-primary-600 mb-4"></div>
            <p className="text-foreground-tertiary font-medium">Loading transcript...</p>
          </div>
        )}
      </div>
      
      {/* Audio Player - Fixed at bottom */}
      {transcriptData?.status === 200 && transcriptData.data.recording_url && (
        <AudioPlayer recordingUrl={transcriptData.data.recording_url} />
      )}
    </main>
  );
}

