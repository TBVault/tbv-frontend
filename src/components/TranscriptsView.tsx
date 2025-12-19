'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Transcript, TranscriptMetadataSearchResult, TranscriptChunkSearchResult } from '@/api/generated/schemas';
import formatTime from '@/utils/formatTime';

// Helper function to format source
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

// Pagination Component
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
  
  // Always show first page
  displayItems.push(1);
  
  if (totalPages <= 7) {
    // If 7 or fewer pages, show all pages
    for (let i = 2; i <= totalPages; i++) {
      displayItems.push(i);
    }
  } else {
    // More complex logic for many pages
    if (currentPage <= 3) {
      // Near the beginning: 1 2 3 ... 867
      displayItems.push(2, 3);
      displayItems.push('ellipsis');
      displayItems.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Near the end: 1 ... 865 866 867
      displayItems.push('ellipsis');
      displayItems.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      // In the middle: 1 ... 346 ... 867
      displayItems.push('ellipsis');
      displayItems.push(currentPage);
      displayItems.push('ellipsis');
      displayItems.push(totalPages);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Main Pagination */}
      <div className="flex items-center justify-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border text-foreground hover:bg-background-secondary hover:border-primary-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:border-border transition-all duration-150"
          aria-label="Previous page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page Numbers */}
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
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-transform duration-150 ${
                  currentPage === pageNum
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-background border border-border text-foreground hover:bg-background-secondary hover:border-primary-500 hover:scale-105'
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border text-foreground hover:bg-background-secondary hover:border-primary-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:border-border transition-all duration-150"
          aria-label="Next page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Manual Page Input - Elegant compact design */}
      <div className="inline-flex items-center gap-3 px-4 py-2 bg-background border border-border rounded-xl shadow-sm">
        <span className="text-xs font-medium text-foreground-secondary uppercase tracking-wide">Jump to</span>
        <form onSubmit={handlePageInput} className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            placeholder={currentPage.toString()}
            className="w-16 h-8 px-2 text-sm text-center border border-border rounded-lg bg-background-secondary text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-background transition-all"
            aria-label="Go to page"
          />
          <button
            type="submit"
            className="h-8 px-3 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 active:scale-95 transition-all"
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
  const [viewMode, setViewMode] = useState<'grid' | 'row'>(() => {
    // Initialize based on screen width if available (client-side)
    if (typeof window !== 'undefined') {
      return window.innerWidth < 750 ? 'grid' : 'row';
    }
    return 'row';
  });
  const [searchInput, setSearchInput] = useState(searchQuery || '');

  // Derive search mode from URL params (no state needed)
  const searchMode = (() => {
    const modeParam = searchParams.get('mode');
    return (modeParam === 'content' ? 'content' : 'metadata') as SearchMode;
  })();

  // Auto-switch view mode based on window width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 750) {
        setViewMode('grid');
      } else {
        setViewMode('row');
      }
    };

    // Set initial state
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle click - only navigate if user isn't selecting text
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
    router.push(`/transcripts?${params.toString()}`);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
      params.set('mode', searchMode);
    }
    router.push(`/transcripts?${params.toString()}`);
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    if (searchInput.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchInput.trim());
      params.set('mode', mode);
      router.push(`/transcripts?${params.toString()}`);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    router.push('/transcripts');
  };

  const isSearchMode = !!searchQuery;

  // Derive loading state: show loading when we're searching but don't have results for current mode
  const isLoading = (() => {
    if (!isSearchMode) return false;
    // Check if we have results array (even if empty, it means we got a response)
    const hasResults = searchMode === 'metadata' 
      ? (searchResults !== undefined)
      : (chunkResults !== undefined);
    
    // If we have a query but no results array for the current mode, we're loading
    return !hasResults && !!searchQuery;
  })();

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa&apos;s lectures and talks</p>
          </div>
          <div className="hidden min-[750px]:flex items-center gap-2 bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => {
                if (window.innerWidth >= 750) {
                  setViewMode('grid');
                }
              }}
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
              onClick={() => {
                if (window.innerWidth >= 750) {
                  setViewMode('row');
                }
              }}
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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search transcripts..."
              className="w-full px-4 py-3 pl-12 pr-24 text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-foreground-tertiary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Search Mode Toggle - Only show when searching */}
        {isSearchMode && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-foreground-secondary">Search in:</span>
            <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleSearchModeChange('metadata')}
                className={`flex-1 px-2.5 py-1 text-sm font-medium transition-colors ${
                  searchMode === 'metadata'
                    ? 'bg-primary-600 text-white'
                    : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground'
                }`}
              >
                Metadata
              </button>
              <button
                type="button"
                onClick={() => handleSearchModeChange('content')}
                className={`flex-1 px-2.5 py-1 text-sm font-medium transition-colors ${
                  searchMode === 'content'
                    ? 'bg-primary-600 text-white'
                    : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground'
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
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isSearchMode && isLoading && (
        <div className="flex items-center justify-center py-20 mb-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-200 border-t-primary-600"></div>
        </div>
      )}

      {/* Render either search results or regular transcripts */}
      {isSearchMode && !isLoading && searchMode === 'metadata' && searchResults ? (
        // Metadata Search Results with Highlights
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8' : 'space-y-4 mb-8'}>
          {searchResults.map((result) => (
            <Link
              key={result.public_id}
              href={`/transcript/${result.public_id}`}
              onClick={handleCardClick}
              draggable={false}
              className={`bg-background rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary-500 transition-all duration-200 select-text ${
                viewMode === 'grid' 
                  ? 'flex flex-col' 
                  : 'flex items-start gap-6'
              }`}
            >
              <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                {/* Title with Highlight */}
                <h2 
                  className={`font-bold text-foreground mb-3 break-words overflow-wrap-anywhere ${viewMode === 'grid' ? 'text-xl line-clamp-3' : 'text-2xl'}`} 
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  dangerouslySetInnerHTML={{ 
                    __html: result.semantic_title_highlight || result.title_highlight || result.semantic_title || result.title 
                  }}
                />

                {/* Summary with Highlight */}
                {(result.summary_highlight || result.summary) && (
                  <div 
                    className={`text-foreground-secondary mb-4 ${viewMode === 'grid' ? 'text-sm line-clamp-3 flex-grow' : 'text-base line-clamp-2'}`}
                    dangerouslySetInnerHTML={{ 
                      __html: result.summary_highlight || result.summary || '' 
                    }}
                  />
                )}
              </div>

              {/* Metadata Section */}
              <div className={`${viewMode === 'grid' ? 'mt-auto space-y-3 pt-4 border-t border-border' : 'flex flex-col items-end gap-2 min-w-[160px] max-w-[160px]'}`}>
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid: Duration and Source on same row, aligned left */}
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                        {formatTime(result.duration)}
                      </div>
                      <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                        {formatSource(result.source)}
                      </div>
                    </div>
                    {/* Tags - hardcoded */}
                    <div className="flex flex-wrap gap-2">
                      <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                        Spirituality
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Row: All items aligned right, each in their own row */}
                    <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                      {formatTime(result.duration)}
                    </div>
                    <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                      {formatSource(result.source)}
                    </div>
                    {/* Tags - hardcoded */}
                    <div className="flex flex-wrap gap-2 justify-end">
                      <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                        Spirituality
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : isSearchMode && !isLoading && searchMode === 'content' && chunkResults ? (
        // Content/Chunk Search Results with Highlights - Simplified to match metadata layout
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8' : 'space-y-4 mb-8'}>
          {chunkResults.map((result) => (
            <Link
              key={`${result.public_id}-${result.chunk_index}`}
              href={`/transcript/${result.public_id}#chunk-${result.chunk_index}`}
              onClick={handleCardClick}
              draggable={false}
              className={`bg-background rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary-500 transition-all duration-200 select-text ${
                viewMode === 'grid' 
                  ? 'flex flex-col' 
                  : 'flex items-start gap-6'
              }`}
            >
              <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                {/* Title */}
                <h2 className={`font-bold text-foreground mb-3 break-words overflow-wrap-anywhere ${viewMode === 'grid' ? 'text-xl line-clamp-3' : 'text-2xl'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {result.semantic_title || result.title}
                </h2>

                {/* Chunk Highlight where summary would go */}
                {result.chunk_highlight && (
                  <div 
                    className={`text-foreground-secondary mb-4 ${viewMode === 'grid' ? 'text-sm line-clamp-3 flex-grow' : 'text-base line-clamp-2'}`}
                  >
                    {result.chunk.speaker && (
                      <span className="font-medium">{result.chunk.speaker}: </span>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: result.chunk_highlight || '' }} />
                  </div>
                )}
              </div>

              {/* Metadata Section */}
              <div className={`${viewMode === 'grid' ? 'mt-auto space-y-3 pt-4 border-t border-border' : 'flex flex-col items-end gap-2 min-w-[160px] max-w-[160px]'}`}>
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid: Duration and Source on same row, aligned left */}
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                        {formatTime(result.duration)}
                      </div>
                      <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                        {formatSource(result.source)}
                      </div>
                    </div>
                    {/* Tags - hardcoded */}
                    <div className="flex flex-wrap gap-2">
                      <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                        Spirituality
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Row: All items aligned right, each in their own row */}
                    <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                      {formatTime(result.duration)}
                    </div>
                    <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                      {formatSource(result.source)}
                    </div>
                    {/* Tags - hardcoded */}
                    <div className="flex flex-wrap gap-2 justify-end">
                      <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                        Spirituality
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : transcripts ? (
        // Regular Transcripts
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8' : 'space-y-4 mb-8'}>
          {transcripts.map((transcript) => (
            <Link
              key={transcript.public_id}
              href={`/transcript/${transcript.public_id}`}
              onClick={handleCardClick}
              draggable={false}
              className={`bg-background rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary-500 transition-all duration-200 select-text ${
                viewMode === 'grid' 
                  ? 'flex flex-col' 
                  : 'flex items-start gap-6'
              }`}
            >
              <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                {/* Title */}
                <h2 className={`font-bold text-foreground mb-3 break-words overflow-wrap-anywhere ${viewMode === 'grid' ? 'text-xl line-clamp-3' : 'text-2xl'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {transcript.semantic_title || transcript.title}
                </h2>

                {/* Summary */}
                {transcript.summary && (
                  <p className={`text-foreground-secondary mb-4 ${viewMode === 'grid' ? 'text-sm line-clamp-3 flex-grow' : 'text-base line-clamp-2'}`}>
                    {transcript.summary}
                  </p>
                )}
              </div>

              {/* Metadata Section */}
              <div className={`${viewMode === 'grid' ? 'mt-auto space-y-3 pt-4 border-t border-border' : 'flex flex-col items-end gap-2 min-w-[160px] max-w-[160px]'}`}>
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid: Duration and Source on same row, aligned left */}
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                        {formatTime(transcript.duration)}
                      </div>
                      <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                        {formatSource(transcript.source)}
                      </div>
                    </div>
                    {/* Tags - hardcoded */}
                    <div className="flex flex-wrap gap-2">
                      <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                        Spirituality
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Row: All items aligned right, each in their own row */}
                    <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                      {formatTime(transcript.duration)}
                    </div>
                    <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                      {formatSource(transcript.source)}
                    </div>
                    {/* Tags - hardcoded */}
                    <div className="flex flex-wrap gap-2 justify-end">
                      <div className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium">
                        Spirituality
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Pagination - Bottom */}
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

