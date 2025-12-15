import { Suspense } from 'react';
import type { Metadata } from 'next';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { transcriptsProtectedTranscriptsGet } from '@/api/generated/endpoints/default/default';
import TranscriptsView from '@/components/TranscriptsView';
import GatedPage from '@/components/GatedPage';

export const metadata: Metadata = {
  title: "Transcripts | The Bhakti Vault",
};

interface PageProps {
  searchParams: Promise<{ p?: string }>;
}

async function TranscriptsContent({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);

  if (!session?.idToken) {
    return <GatedPage title="Transcripts Library" description="This content is available to authorized team members only." />;
  }

  // Fetch transcripts on the server
  try {
    const response = await transcriptsProtectedTranscriptsGet(
      {
        page_number: page,
      },
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 300, // Cache for 5 minutes
          tags: ['transcripts'],
        },
      }
    );
    
    if (response.status === 200) {
      return (
        <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
          <div className="max-w-5xl mx-auto px-6 py-10">
            <TranscriptsView 
              transcripts={response.data.transcripts}
              currentPage={page}
              totalPages={response.data.page_count}
            />
          </div>
        </main>
      );
    }
    
    throw new Error('Failed to fetch transcripts');
  } catch (error: any) {
    // Check if it's an authentication error
    if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
      redirect('/auth/error');
    }
    
    // Show error UI
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa's lectures and talks</p>
          </div>
          <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
            <h3 className="font-semibold text-error-900 mb-1">Error Loading Transcripts</h3>
            <p className="text-error-800">{error.message || 'An unexpected error occurred'}</p>
          </div>
        </div>
      </main>
    );
  }
}

export default function TranscriptsPage(props: PageProps) {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-background-secondary via-background to-background-secondary">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse and explore all available transcripts</p>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-200 border-t-primary-600"></div>
          </div>
        </div>
      </main>
    }>
      <TranscriptsContent searchParams={props.searchParams} />
    </Suspense>
  );
}



