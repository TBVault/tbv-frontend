'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { transcriptsProtectedTranscriptsGet } from '@/api/generated/endpoints/default/default';
import type { Transcript } from '@/api/generated/schemas';

// Helper function to format seconds to HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to format source
function formatSource(source: string): string {
  if (source === 'otterai') return 'OtterAI';
  if (source === 'whisper') return 'Whisper';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function TranscriptsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('p') || '1', 10);

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('p');
    } else {
      params.set('p', newPage.toString());
    }
    router.push(`/transcripts?${params.toString()}`);
  };

  useEffect(() => {
    const fetchTranscripts = async () => {
      // Wait for session to load
      if (sessionStatus === 'loading') {
        return;
      }

      // Redirect to auth error if no session
      if (!session?.idToken) {
        router.push('/auth/error');
        return;
      }

      setLoading(true);
      try {
        const response = await transcriptsProtectedTranscriptsGet(
          {
            page_number: page,
          },
          {
            headers: {
              Authorization: session.idToken.trim(),
            },
          }
        );
        
        if (response.status === 200) {
          setTranscripts(response.data.transcripts);
          setTotalPages(response.data.page_count);
        } else {
          // Handle error
          console.error('Failed to fetch transcripts');
          setTranscripts([]);
          setTotalPages(1);
        }
      } catch (error: any) {
        console.error('Error fetching transcripts:', error);
        // Check if it's an authentication error (401 or 403)
        if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
          router.push('/auth/error');
          return;
        }
        setTranscripts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, [page, session, sessionStatus, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background-secondary via-background to-background-secondary">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse and explore all available transcripts</p>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-foreground-secondary hover:bg-background-secondary'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('row')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'row'
                  ? 'bg-primary-600 text-white'
                  : 'text-foreground-secondary hover:bg-background-secondary'
              }`}
              aria-label="Row view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`bg-background rounded-xl border border-border p-6 animate-pulse ${viewMode === 'row' ? 'flex items-center gap-6' : ''}`}>
                <div className="h-6 bg-background-tertiary rounded mb-4"></div>
                <div className="h-4 bg-background-tertiary rounded mb-2"></div>
                <div className="h-4 bg-background-tertiary rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8' : 'space-y-4 mb-8'}>
              {transcripts.map((transcript) => (
                <Link
                  key={transcript.public_id}
                  href={`/transcript/${transcript.public_id}`}
                  className={`bg-background rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary-500 transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'flex flex-col' 
                      : 'flex items-start gap-6'
                  }`}
                >
                  <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                    {/* Title */}
                    <h2 className={`font-bold text-foreground mb-3 break-words overflow-wrap-anywhere ${viewMode === 'grid' ? 'text-xl line-clamp-3' : 'text-2xl'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {transcript.title}
                    </h2>

                    {/* Summary */}
                    {transcript.summary && (
                      <p className={`text-foreground-secondary mb-4 ${viewMode === 'grid' ? 'text-sm line-clamp-3 flex-grow' : 'text-base line-clamp-2'}`}>
                        {transcript.summary}
                      </p>
                    )}
                  </div>

                  {/* Metadata Section */}
                  <div className={`${viewMode === 'grid' ? 'mt-auto space-y-3 pt-4 border-t border-border' : 'flex flex-col items-end gap-2 min-w-[200px]'}`}>
                    {viewMode === 'grid' ? (
                      <>
                        {/* Grid: Duration and Source on same row, aligned left */}
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium border border-neutral-300">
                            {formatTime(transcript.duration)}
                          </div>
                          <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                            {formatSource(transcript.source)}
                          </div>
                        </div>
                        {/* Tags - hardcoded */}
                        <div className="flex flex-wrap gap-2">
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Philosophy
                          </div>
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Spirituality
                          </div>
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Discussion
                          </div>
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Religion
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Row: All items aligned right, each in their own row */}
                        <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium border border-neutral-300">
                          {formatTime(transcript.duration)}
                        </div>
                        <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                          {formatSource(transcript.source)}
                        </div>
                        {/* Tags - hardcoded */}
                        <div className="flex flex-wrap gap-2 justify-end">
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Philosophy
                          </div>
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Spirituality
                          </div>
                          <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                            Discussion
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => updatePage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {(() => {
                  const pageNumbers = new Set<number>();
                  
                  // Always show first page
                  pageNumbers.add(1);
                  
                  // Show previous page
                  if (page > 1) {
                    pageNumbers.add(page - 1);
                  }
                  
                  // Show current page
                  pageNumbers.add(page);
                  
                  // Show next page
                  if (page < totalPages) {
                    pageNumbers.add(page + 1);
                  }
                  
                  // Always show last page
                  if (totalPages > 1) {
                    pageNumbers.add(totalPages);
                  }
                  
                  // Convert to sorted array
                  const sortedPages = Array.from(pageNumbers).sort((a, b) => a - b);
                  
                  // Build the display array with ellipsis
                  const displayItems: (number | string)[] = [];
                  
                  for (let i = 0; i < sortedPages.length; i++) {
                    const currentPage = sortedPages[i];
                    const nextPage = sortedPages[i + 1];
                    
                    // Add the current page
                    displayItems.push(currentPage);
                    
                    // Add ellipsis if there's a gap
                    if (nextPage && nextPage - currentPage > 1) {
                      displayItems.push('ellipsis');
                    }
                  }
                  
                  return displayItems.map((item, index) => {
                    if (item === 'ellipsis') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-foreground-tertiary">
                          ...
                        </span>
                      );
                    }
                    const pageNum = item as number;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => updatePage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-foreground bg-background border border-border hover:bg-background-secondary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => updatePage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function TranscriptsPage() {
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
      <TranscriptsPageContent />
    </Suspense>
  );
}



