import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TranscriptContent from "@/components/TranscriptContent";
import { transcriptProtectedTranscriptGet } from "@/api/generated/endpoints/default/default";
import type { transcriptProtectedTranscriptGetResponse } from "@/api/generated/endpoints/default/default";

interface PageProps {
  params: {
    publicId: string;
  };
}

export default async function TranscriptPage({ params }: PageProps) {
  const session = await auth();
  const { publicId } = await params;

  // Redirect to auth error if no session or no idToken
  if (!session?.idToken) {
    redirect('/auth/error');
  }

  let transcriptData: transcriptProtectedTranscriptGetResponse | null = null;
  let error: string | null = null;

  // Fetch transcript data using generated client with authentication
  try {
    const response = await transcriptProtectedTranscriptGet(
      {
        public_id: publicId,
      },
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
      }
    );
    transcriptData = response;
  } catch (err: any) {
    // Check if it's an authentication error (401 or 403)
    if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
      redirect('/auth/error');
    }
    error = err instanceof Error ? err.message : "Failed to fetch transcript";
  }

  // If we successfully fetched the transcript but content is missing, error the page out
  if (transcriptData?.status === 200 && !transcriptData.data.content) {
    throw new Error("Transcript content is missing");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background-secondary via-background to-background-secondary">
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
                {transcriptData.data.title}
              </h1>

              {/* Tags */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-sm font-medium">
                    Philosophy
                  </div>
                  <div className="px-3 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-sm font-medium">
                    Spirituality
                  </div>
                  <div className="px-3 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-sm font-medium">
                    Discussion
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
    </main>
  );
}

