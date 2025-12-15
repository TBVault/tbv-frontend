'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Transcript } from '@/api/generated/schemas';
import formatTime from '@/utils/formatTime';

// Helper function to format source
function formatSource(source: string): string {
  if (source === 'otterai') return 'OtterAI';
  if (source === 'whisper') return 'Whisper';
  return source.charAt(0).toUpperCase() + source.slice(1);
}

interface TranscriptsViewProps {
  transcripts: Transcript[];
  currentPage: number;
  totalPages: number;
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

export default function TranscriptsView({ transcripts, currentPage, totalPages }: TranscriptsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
  const prevWidthRef = useRef<number | null>(null);

  // Set initial view mode based on screen width on mount
  useEffect(() => {
    const initialWidth = window.innerWidth;
    prevWidthRef.current = initialWidth;
    if (initialWidth < 750) {
      setViewMode('grid');
    }
  }, []);

  // Update view mode on window resize - only when crossing the 750px threshold
  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const prevWidth = prevWidthRef.current;

      // Only change view mode when crossing the 750px threshold
      if (prevWidth !== null) {
        const wasBelowThreshold = prevWidth < 750;
        const isBelowThreshold = currentWidth < 750;

        // Crossing from >= 750px to < 750px: switch to grid
        if (!wasBelowThreshold && isBelowThreshold && viewMode === 'row') {
          setViewMode('grid');
        }
        // Crossing from < 750px to >= 750px: switch to row
        else if (wasBelowThreshold && !isBelowThreshold && viewMode === 'grid') {
          setViewMode('row');
        }
      }

      prevWidthRef.current = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('p');
    } else {
      params.set('p', newPage.toString());
    }
    router.push(`/transcripts?${params.toString()}`);
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
          <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa's lectures and talks</p>
        </div>
        <div className="hidden min-[750px]:flex items-center gap-2 bg-background border border-border rounded-lg p-1">
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

      {/* Pagination - Bottom */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={updatePage}
        />
      )}
    </>
  );
}

