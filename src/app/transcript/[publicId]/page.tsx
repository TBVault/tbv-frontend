import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TranscriptContent from "@/components/TranscriptContent";
import AudioPlayer from "@/components/AudioPlayer";
import MobilePageHeader from "@/components/MobilePageHeader";
import ScrollToTop from "@/components/ScrollToTop";
import { transcriptProtectedTranscriptGet } from "@/api/generated/endpoints/default/default";
import type { Metadata } from "next";
import { cache } from "react";
import GatedPage from "@/components/GatedPage";

interface PageProps {
  params: Promise<{
    publicId: string;
  }>;
}

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
          revalidate: 600,
          tags: ['transcript', `transcript-${publicId}`],
        },
      }
    );
    return { session, data: response, error: null };
  } catch (err: unknown) {
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

  if (!session?.idToken) {
    return <GatedPage title="Sign In Required" description="This transcript is only accessible to authorized team members." showSignInButton={false} />;
  }

  if (fetchError) {
    const err = fetchError as { status?: number; message?: string };
    if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
      redirect('/auth/error');
    }
  }

  const error = fetchError ? (fetchError instanceof Error ? fetchError.message : "Failed to fetch transcript") : null;

  if (transcriptData?.status === 200 && !transcriptData.data.content) {
    throw new Error("Transcript content is missing");
  }

  return (
    <>
      <ScrollToTop />
      <MobilePageHeader title="Transcript" />
      <div className="min-h-screen py-8 px-0 lg:px-6 xl:px-12">
        <div className="max-w-4xl mx-auto">
          {error ? (
            <div className="bg-error-500/10 border border-error-500/30 rounded-xl p-6">
              <h3 className="font-semibold text-error-500 mb-1">Error Loading Transcript</h3>
              <p className="text-error-500/80">{error}</p>
            </div>
          ) : transcriptData?.status === 200 && (
          <>
            {/* Hero Section */}
            <div className="mb-10 px-4 lg:px-0">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
                {transcriptData.data.semantic_title || transcriptData.data.title}
              </h1>

              {transcriptData.data.semantic_title && transcriptData.data.semantic_title !== transcriptData.data.title && (
                <div className="mb-4">
                  <p className="text-foreground-secondary italic">{transcriptData.data.title}</p>
                </div>
              )}

              {/* Tags */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-foreground-muted/20 text-foreground-secondary rounded-full text-sm font-medium">
                    Spirituality
                  </span>
                </div>
                {transcriptData.data.source && (
                  <span className="px-3 py-1 bg-secondary-500/20 text-secondary-400 rounded-full text-sm font-medium">
                    {transcriptData.data.source === 'otterai' ? 'OtterAI' : transcriptData.data.source.charAt(0).toUpperCase() + transcriptData.data.source.slice(1)}
                  </span>
                )}
              </div>

              {/* Summary */}
              {transcriptData.data.summary && (
                <div className="bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border-0 lg:border lg:border-primary-500/20 rounded-none lg:rounded-xl p-0 lg:p-5">
                  <div className="text-sm font-semibold text-foreground-tertiary mb-2 px-0 lg:px-4 pt-4 lg:pt-0">AI-generated Summary:</div>
                  <p className="text-foreground-secondary leading-relaxed px-0 lg:px-4 pb-4 lg:pb-0">{transcriptData.data.summary}</p>
                </div>
              )}
            </div>

            {/* Transcript Content */}
            <TranscriptContent content={transcriptData!.data.content!} duration={transcriptData!.data.duration} />
          </>
        )}
        </div>
        
        {/* Audio Player */}
        {transcriptData?.status === 200 && transcriptData.data.recording_url && (
          <AudioPlayer 
            recordingUrl={transcriptData.data.recording_url}
            title={transcriptData.data.semantic_title || transcriptData.data.title}
            artist="H.G. Vaiśeṣika Dāsa"
          />
        )}
      </div>
    </>
  );
}
