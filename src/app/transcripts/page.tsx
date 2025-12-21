import { Suspense } from 'react';
import type { Metadata } from 'next';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { transcriptsProtectedTranscriptsGet, searchFromTranscriptsProtectedSearchTranscriptsGet } from '@/api/generated/endpoints/default/default';
import TranscriptsView from '@/components/TranscriptsView';
import GatedPage from '@/components/GatedPage';
import { SearchFieldType } from '../../api';
import { Skeleton, SkeletonTranscriptCard } from '@/components/Skeleton';

export const metadata: Metadata = {
  title: "Transcripts | The Bhakti Vault",
};

interface PageProps {
  searchParams: Promise<{ p?: string; q?: string; mode?: string }>;
}

async function TranscriptsContent({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const query = params.q?.trim();
  const searchMode = (params.mode === 'content' ? 'content' : 'metadata') as 'metadata' | 'content';

  if (!session?.idToken) {
    return <GatedPage title="Transcripts Library" description="This content is available to authorized team members only." />;
  }

  try {
    if (query) {
      const includeFields = searchMode === 'content' 
        ? [SearchFieldType.text]
        : [SearchFieldType.title, SearchFieldType.semantic_title, SearchFieldType.summary];
      
      const response = await searchFromTranscriptsProtectedSearchTranscriptsGet(
        {
          query: query,
          page_number: page,
          include_fields_str: JSON.stringify(includeFields),
        },
        {
          headers: {
            Authorization: session.idToken.trim(),
          },
          next: {
            revalidate: 60,
            tags: ['transcripts'],
          },
        }
      );
      
      if (response.status === 200) {
        return (
          <div className="min-h-screen py-8 px-6 lg:px-12">
            <div className="max-w-5xl mx-auto">
              <TranscriptsView 
                searchResults={searchMode === 'metadata' ? response.data.metadata_results : undefined}
                chunkResults={searchMode === 'content' ? response.data.chunk_results : undefined}
                currentPage={page}
                totalPages={response.data.metadata_page_count}
                chunkTotalPages={response.data.chunk_page_count}
                searchQuery={query}
                totalCount={response.data.total_metadata_count}
                chunkTotalCount={response.data.total_chunk_count}
                searchMode={searchMode}
              />
            </div>
          </div>
        );
      }
      
      throw new Error('Failed to fetch search results');
    }
    
    const response = await transcriptsProtectedTranscriptsGet(
      {
        page_number: page,
      },
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 60,
          tags: ['transcripts'],
        },
      }
    );
    
    if (response.status === 200) {
      return (
        <div className="min-h-screen py-8 px-6 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <TranscriptsView 
              transcripts={response.data.transcripts}
              currentPage={page}
              totalPages={response.data.page_count}
            />
          </div>
        </div>
      );
    }
    
    throw new Error('Failed to fetch transcripts');
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status === 401 || err?.status === 403 || err?.message?.includes('401') || err?.message?.includes('403')) {
      redirect('/auth/error');
    }
    
    return (
      <div className="min-h-screen py-8 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa&apos;s lectures and talks</p>
          </div>
          <div className="bg-error-500/10 border border-error-500/30 rounded-xl p-6">
            <h3 className="font-semibold text-error-500 mb-1">Error Loading {query ? 'Search Results' : 'Transcripts'}</h3>
            <p className="text-error-500/80">{(error as { message?: string })?.message || 'An unexpected error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }
}

function TranscriptsLoadingSkeleton() {
  return (
    <div className="min-h-screen py-8 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Transcripts</h1>
              <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa&apos;s lectures and talks</p>
            </div>
            <div className="hidden min-[750px]:flex items-center gap-1 bg-background-elevated border border-border rounded-lg p-1">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
          
          {/* Search bar skeleton */}
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>

        {/* Transcript cards skeleton */}
        <div className="space-y-3 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTranscriptCard key={i} variant="row" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TranscriptsPage(props: PageProps) {
  return (
    <Suspense fallback={<TranscriptsLoadingSkeleton />}>
      <TranscriptsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
