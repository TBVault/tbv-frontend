'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TranscriptCitation, WebSearchCitation } from '@/api/generated/schemas';
import type { CitationMetadata } from './types';

// Sources section component
export function SourcesSection({ 
  citations,
  transcriptTitles,
  webTitles
}: { 
  citations: CitationMetadata[];
  transcriptTitles: Map<string, string>;
  webTitles: Map<string, string>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (citations.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2 hover:opacity-70 transition-opacity"
      >
        <h4 className="text-xs font-semibold text-gray-500 uppercase">
          Sources ({citations.length})
        </h4>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="flex flex-col gap-2">
          {citations.map((metadata) => {
            if (metadata.type === 'transcript') {
              const citation = metadata.citation as TranscriptCitation;
              const title = transcriptTitles.get(citation.transcript_id) || 'Transcript';
              return (
                <Link
                  key={`source-transcript-${citation.transcript_id}-${citation.chunk_index}`}
                  href={`/transcript/${citation.transcript_id}#chunk-${citation.chunk_index}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-sm font-medium transition-colors border border-blue-200 w-full"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                    {metadata.number}
                  </span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="flex-1">{title}</span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              );
            } else {
              const citation = metadata.citation as WebSearchCitation;
              const title = webTitles.get(citation.url);
              const fallbackTitle = new URL(citation.url).hostname.replace('www.', '');
              const displayTitle = title || fallbackTitle;
              const displayText = `${displayTitle} | ${citation.url}`;
              return (
                <a
                  key={`source-web-${citation.url}`}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg text-sm font-medium transition-colors border border-green-200 w-full"
                  title={citation.url}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                    {metadata.number}
                  </span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="flex-1 truncate">{displayText}</span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

