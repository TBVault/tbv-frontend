'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Transcript } from '@/api/generated/schemas';
import { transcriptProtectedTranscriptGet } from '@/api/generated/endpoints/default/default';
import type { TranscriptOverlayProps } from './types';

// Overlay component for transcript citations
export function TranscriptOverlay({ 
  citation, 
  citationNumber, 
  authToken, 
  preFetchedTranscript, 
  onClose 
}: TranscriptOverlayProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(preFetchedTranscript || null);
  const [loading, setLoading] = useState(!preFetchedTranscript);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have pre-fetched data, use it
    if (preFetchedTranscript) {
      setTranscript(preFetchedTranscript);
      setLoading(false);
      return;
    }

    const fetchTranscript = async () => {
      if (!authToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await transcriptProtectedTranscriptGet(
          { public_id: citation.transcript_id },
          authToken ? {
            headers: {
              Authorization: authToken,
            },
          } : undefined
        );
        if (response.status === 200) {
          setTranscript(response.data);
        }
      } catch (err) {
        setError('Failed to load transcript');
        console.error('Error fetching transcript:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [citation.transcript_id, authToken, preFetchedTranscript]);

  const chunk = transcript?.content?.[citation.chunk_index];
  const chunkText = chunk?.text || '';
  const truncatedText = chunkText.length > 300 
    ? chunkText.substring(0, 300) + '...' 
    : chunkText;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex-shrink-0">
              {citationNumber}
            </span>
            <h3 className="text-lg font-semibold text-gray-900 break-words">
              {loading ? 'Loading...' : transcript?.semantic_title || transcript?.title || 'Transcript'}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/transcript/${citation.transcript_id}#chunk-${citation.chunk_index}`}
              target="_blank"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-center py-4">{error}</div>
          )}

          {!loading && !error && transcript && (
            <div>
              {chunk && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase">
                    {chunk.speaker}
                  </span>
                </div>
              )}
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {truncatedText || 'No text available for this chunk.'}
              </p>
              {chunkText.length > 300 && (
                <Link
                  href={`/transcript/${citation.transcript_id}#chunk-${citation.chunk_index}`}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-3 inline-flex items-center gap-1"
                >
                  Read more
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

