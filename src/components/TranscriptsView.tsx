'use client';

import { useState, FormEvent, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Transcript, TranscriptMetadataSearchResult, TranscriptChunkSearchResult } from '@/api/generated/schemas';
import formatTime from '@/utils/formatTime';
import { SkeletonTranscriptCard } from '@/components/Skeleton';

function formatSource(source: string): string {
  if (source === 'otterai') return 'OtterAI';
  if (source === 'whisper') return 'Whisper';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

type SearchMode = 'metadata' | 'content';

interface TranscriptsViewProps {
  transcripts?: Transcript[];
  searchResults?: TranscriptMetadataSearchResult[];
  chunkResults?: TranscriptChunkSearchResult[];
  currentPage: number;
  totalPages: number;
  chunkTotalPages?: number;
  searchQuery?: string;
  totalCount?: number;
  chunkTotalCount?: number;
  searchMode?: SearchMode;
}

function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [inputPage, setInputPage] = useState('');
  
  const handlePageInput = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setInputPage('');
    }
  };
  
  const displayItems: (number | string)[] = [];
  
  displayItems.push(1);
  
  if (totalPages <= 7) {
    for (let i = 2; i <= totalPages; i++) {
      displayItems.push(i);
    }
  } else {
    if (currentPage <= 3) {
      displayItems.push(2, 3);
      displayItems.push('ellipsis');
      displayItems.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      displayItems.push('ellipsis');
      displayItems.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      displayItems.push('ellipsis');
      displayItems.push(currentPage);
      displayItems.push('ellipsis');
      displayItems.push(totalPages);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background-elevated border border-border text-foreground hover:bg-sidebar-hover hover:border-primary-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1">
          {displayItems.map((item, index) => {
            if (item === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-foreground-tertiary font-medium">
                  ...
                </span>
              );
            }
            const pageNum = item as number;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                  currentPage === pageNum
                    ? 'bg-primary-500 text-white'
                    : 'bg-background-elevated border border-border text-foreground hover:bg-sidebar-hover hover:border-primary-500/50'
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background-elevated border border-border text-foreground hover:bg-sidebar-hover hover:border-primary-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="inline-flex items-center gap-3 px-4 py-2 bg-background-elevated border border-border rounded-xl">
        <span className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Jump to</span>
        <form onSubmit={handlePageInput} className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            placeholder={currentPage.toString()}
            className="w-16 h-8 px-2 text-sm text-center border border-border rounded-lg bg-background text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            aria-label="Go to page"
          />
          <button
            type="submit"
            className="h-8 px-3 text-xs font-semibold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TranscriptsView({ transcripts, searchResults, chunkResults, currentPage, totalPages, chunkTotalPages, searchQuery, totalCount, chunkTotalCount }: TranscriptsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'grid' | 'row'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 750 ? 'grid' : 'row';
    }
    return 'row';
  });
  const [searchInput, setSearchInput] = useState(searchQuery || '');

  const searchMode = (() => {
    const modeParam = searchParams.get('mode');
    return (modeParam === 'content' ? 'content' : 'metadata') as SearchMode;
  })();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 750) {
        setViewMode('grid');
      } else {
        setViewMode('row');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      e.preventDefault();
    }
  };

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('p');
    } else {
      params.set('p', newPage.toString());
    }
    startTransition(() => {
      router.push(`/transcripts?${params.toString()}`);
    });
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
      params.set('mode', searchMode);
    }
    startTransition(() => {
      router.push(`/transcripts?${params.toString()}`);
    });
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    if (searchInput.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchInput.trim());
      params.set('mode', mode);
      startTransition(() => {
        router.push(`/transcripts?${params.toString()}`);
      });
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    startTransition(() => {
      router.push('/transcripts');
    });
  };

  const isSearchMode = !!searchQuery;

  // Loading state is true when a transition is pending
  const isLoading = isPending;

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="hidden lg:block text-3xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa&apos;s lectures and talks</p>
          </div>
          <div className="hidden min-[750px]:flex items-center gap-1 bg-background-elevated border border-border rounded-lg p-1">
            <button
              onClick={() => {
                if (window.innerWidth >= 750) {
                  setViewMode('grid');
                }
              }}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-500 text-white'
                  : 'text-foreground-secondary hover:bg-sidebar-hover'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (window.innerWidth >= 750) {
                  setViewMode('row');
                }
              }}
              className={`p-2 rounded transition-colors ${
                viewMode === 'row'
                  ? 'bg-primary-500 text-white'
                  : 'text-foreground-secondary hover:bg-sidebar-hover'
              }`}
              aria-label="Row view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search transcripts..."
              className="w-full px-4 py-3 pl-12 pr-24 text-foreground bg-background-elevated border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-foreground-tertiary transition-all"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-foreground-tertiary hover:text-foreground hover:bg-sidebar-hover rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Search Mode Toggle */}
        {isSearchMode && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground-secondary">Search in:</span>
            <div className="flex items-center bg-background-elevated border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleSearchModeChange('metadata')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                  searchMode === 'metadata'
                    ? 'bg-primary-500 text-white'
                    : 'text-foreground-secondary hover:bg-sidebar-hover hover:text-foreground'
                }`}
              >
                Title & Summary
              </button>
              <button
                type="button"
                onClick={() => handleSearchModeChange('content')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                  searchMode === 'content'
                    ? 'bg-primary-500 text-white'
                    : 'text-foreground-secondary hover:bg-sidebar-hover hover:text-foreground'
                }`}
              >
                Content
              </button>
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {isSearchMode && (
          <div className="mt-4 flex items-center gap-3 text-sm text-foreground-secondary">
            <span>
              <strong className="text-foreground">
                {(searchMode === 'metadata' ? totalCount : chunkTotalCount) !== undefined 
                  ? (searchMode === 'metadata' ? totalCount : chunkTotalCount)!.toLocaleString() 
                  : '0'}
              </strong> {(searchMode === 'metadata' ? totalCount : chunkTotalCount) === 1 ? 'result' : 'results'} for: <strong className="text-foreground">&quot;{searchQuery}&quot;</strong>
            </span>
            <button
              onClick={handleClearSearch}
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Loading State - show skeleton cards during transitions */}
      {isLoading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' : 'space-y-3 mb-8'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTranscriptCard key={i} variant={viewMode} />
          ))}
        </div>
      )}

      {/* Render results - hidden during loading */}
      {!isLoading && isSearchMode && searchMode === 'metadata' && searchResults ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' : 'space-y-3 mb-8'}>
          {searchResults.map((result) => (
            <Link
              key={result.public_id}
              href={`/transcript/${result.public_id}`}
              onClick={handleCardClick}
              draggable={false}
              className={`bg-background-elevated rounded-xl border border-border p-5 hover:border-primary-500/50 transition-all select-text ${
                viewMode === 'grid' 
                  ? 'flex flex-col' 
                  : 'flex items-start gap-6'
              }`}
            >
              <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                <h2 
                  className={`font-semibold text-foreground mb-2 ${viewMode === 'grid' ? 'text-lg line-clamp-2' : 'text-xl'}`} 
                  dangerouslySetInnerHTML={{ 
                    __html: result.semantic_title_highlight || result.title_highlight || result.semantic_title || result.title 
                  }}
                />
                {(result.summary_highlight || result.summary) && (
                  <div 
                    className={`text-foreground-secondary ${viewMode === 'grid' ? 'text-sm line-clamp-3' : 'text-sm line-clamp-2'}`}
                    dangerouslySetInnerHTML={{ 
                      __html: result.summary_highlight || result.summary || '' 
                    }}
                  />
                )}
              </div>
              <div className={`${viewMode === 'grid' ? 'mt-4 pt-4 border-t border-border flex items-center gap-2' : 'flex flex-col items-end gap-2 min-w-[120px]'}`}>
                <span className="px-2 py-1 bg-foreground-muted/20 text-foreground-secondary rounded-md text-xs font-medium">
                  {formatTime(result.duration)}
                </span>
                <span className="px-2 py-1 bg-secondary-500/20 text-secondary-400 rounded-md text-xs font-medium">
                  {formatSource(result.source)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : !isLoading && isSearchMode && searchMode === 'content' && chunkResults ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' : 'space-y-3 mb-8'}>
          {chunkResults.map((result) => (
            <Link
              key={`${result.public_id}-${result.chunk_index}`}
              href={`/transcript/${result.public_id}#chunk-${result.chunk_index}`}
              onClick={handleCardClick}
              draggable={false}
              className={`bg-background-elevated rounded-xl border border-border p-5 hover:border-primary-500/50 transition-all select-text ${
                viewMode === 'grid' 
                  ? 'flex flex-col' 
                  : 'flex items-start gap-6'
              }`}
            >
              <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                <h2 className={`font-semibold text-foreground mb-2 ${viewMode === 'grid' ? 'text-lg line-clamp-2' : 'text-xl'}`}>
                  {result.semantic_title || result.title}
                </h2>
                {result.chunk_highlight && (
                  <div className={`text-foreground-secondary ${viewMode === 'grid' ? 'text-sm line-clamp-3' : 'text-sm line-clamp-2'}`}>
                    {result.chunk.speaker && (
                      <span className="font-medium">{result.chunk.speaker}: </span>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: result.chunk_highlight || '' }} />
                  </div>
                )}
              </div>
              <div className={`${viewMode === 'grid' ? 'mt-4 pt-4 border-t border-border flex items-center gap-2' : 'flex flex-col items-end gap-2 min-w-[120px]'}`}>
                <span className="px-2 py-1 bg-foreground-muted/20 text-foreground-secondary rounded-md text-xs font-medium">
                  {formatTime(result.duration)}
                </span>
                <span className="px-2 py-1 bg-secondary-500/20 text-secondary-400 rounded-md text-xs font-medium">
                  {formatSource(result.source)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : !isLoading && transcripts ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' : 'space-y-3 mb-8'}>
          {transcripts.map((transcript) => (
            <Link
              key={transcript.public_id}
              href={`/transcript/${transcript.public_id}`}
              onClick={handleCardClick}
              draggable={false}
              className={`bg-background-elevated rounded-xl border border-border p-5 hover:border-primary-500/50 transition-all select-text ${
                viewMode === 'grid' 
                  ? 'flex flex-col' 
                  : 'flex items-start gap-6'
              }`}
            >
              <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                <h2 className={`font-semibold text-foreground mb-2 ${viewMode === 'grid' ? 'text-lg line-clamp-2' : 'text-xl'}`}>
                  {transcript.semantic_title || transcript.title}
                </h2>
                {transcript.summary && (
                  <p className={`text-foreground-secondary ${viewMode === 'grid' ? 'text-sm line-clamp-3' : 'text-sm line-clamp-2'}`}>
                    {transcript.summary}
                  </p>
                )}
              </div>
              <div className={`${viewMode === 'grid' ? 'mt-4 pt-4 border-t border-border flex items-center gap-2' : 'flex flex-col items-end gap-2 min-w-[120px]'}`}>
                <span className="px-2 py-1 bg-foreground-muted/20 text-foreground-secondary rounded-md text-xs font-medium">
                  {formatTime(transcript.duration)}
                </span>
                <span className="px-2 py-1 bg-secondary-500/20 text-secondary-400 rounded-md text-xs font-medium">
                  {formatSource(transcript.source)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {!isLoading && (
        <>
          {isSearchMode && searchMode === 'content' && chunkTotalPages && chunkTotalPages > 1 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={chunkTotalPages}
              onPageChange={updatePage}
            />
          ) : totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={updatePage}
            />
          )}
        </>
      )}
    </>
  );
}
