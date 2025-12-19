import { Suspense } from 'react';
import type { Metadata } from 'next';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { transcriptsProtectedTranscriptsGet, searchFromTranscriptsProtectedSearchTranscriptsGet } from '@/api/generated/endpoints/default/default';
import TranscriptsView from '@/components/TranscriptsView';
import GatedPage from '@/components/GatedPage';
import { SearchFieldType } from '../../api';

export const metadata: Metadata = {
  title: "Transcripts | The Bhakti Vault",
};

interface PageProps {
  searchParams: Promise<{ p?: string; q?: string }>;
}

async function TranscriptsContent({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const query = params.q?.trim();

  if (!session?.idToken) {
    return <GatedPage title="Transcripts Library" description="This content is available to authorized team members only." />;
  }

  // Fetch transcripts or search results on the server
  try {
    // If there's a search query, use the search endpoint
    if (query) {
      const response = await searchFromTranscriptsProtectedSearchTranscriptsGet(
        {
          query: query,
          page_number: page,
          include_fields_str: JSON.stringify([SearchFieldType.title, SearchFieldType.semantic_title, SearchFieldType.summary]),
        },
        {
          headers: {
            Authorization: session.idToken.trim(),
          },
          next: {
            revalidate: 60, // Cache for 1 minute
            tags: ['transcripts'],
          },
        }
      );
      
      if (response.status === 200) {
        return (
          <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
            <div className="max-w-5xl mx-auto px-6 py-10">
              <TranscriptsView 
                searchResults={response.data.metadata_results}
                currentPage={page}
                totalPages={response.data.metadata_page_count}
                searchQuery={query}
                totalCount={response.data.total_metadata_count}
              />
            </div>
          </main>
        );
      }
      
      throw new Error('Failed to fetch search results');
    }
    
    // Otherwise, fetch regular transcripts
    const response = await transcriptsProtectedTranscriptsGet(
      {
        page_number: page,
      },
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 60, // Cache for 1 minute
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
  } catch (error: unknown) {
    // Check if it's an authentication error
    const err = error as { status?: number; message?: string };
    if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
      redirect('/auth/error');
    }
    
    // Show error UI
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa&apos;s lectures and talks</p>
          </div>
          <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
            <h3 className="font-semibold text-error-900 mb-1">Error Loading {query ? 'Search Results' : 'Transcripts'}</h3>
            <p className="text-error-800">{(error as { message?: string })?.message || 'An unexpected error occurred'}</p>
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



