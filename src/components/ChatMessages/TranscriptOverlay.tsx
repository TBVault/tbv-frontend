'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Transcript } from '@/api/generated/schemas';
import { transcriptProtectedTranscriptGet } from '@/api/generated/endpoints/default/default';
import type { TranscriptOverlayProps } from './types';

export function TranscriptOverlay({ 
  citation, 
  citationNumber, 
  authToken, 
  preFetchedTranscript, 
  fetchingPromise,
  getTranscript,
  onClose 
}: TranscriptOverlayProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(preFetchedTranscript || null);
  const [loading, setLoading] = useState(!preFetchedTranscript);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preFetchedTranscript) {
      setTranscript(preFetchedTranscript);
      setLoading(false);
      setError(null);
    }
  }, [preFetchedTranscript]);

  useEffect(() => {
    if (preFetchedTranscript || transcript) {
      return;
    }

    if (getTranscript) {
      const cachedTranscript = getTranscript(citation.transcript_id);
      if (cachedTranscript) {
        setTranscript(cachedTranscript);
        setLoading(false);
        setError(null);
        return;
      }
    }

    const fetchTranscript = async () => {
      if (!authToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      if (fetchingPromise) {
        try {
          setLoading(true);
          await fetchingPromise;
          if (getTranscript) {
            const updatedTranscript = getTranscript(citation.transcript_id);
            if (updatedTranscript) {
              setTranscript(updatedTranscript);
              setLoading(false);
              setError(null);
              return;
            }
          }
          if (preFetchedTranscript) {
            setTranscript(preFetchedTranscript);
            setLoading(false);
            setError(null);
            return;
          }
        } catch (err) {
          console.error('Error waiting for transcript fetch:', err);
        }
      }

      if (getTranscript) {
        const cachedTranscript = getTranscript(citation.transcript_id);
        if (cachedTranscript) {
          setTranscript(cachedTranscript);
          setLoading(false);
          setError(null);
          return;
        }
      }
      if (preFetchedTranscript) {
        setTranscript(preFetchedTranscript);
        setLoading(false);
        setError(null);
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
  }, [citation.transcript_id, authToken, fetchingPromise, getTranscript, preFetchedTranscript, transcript]);

  const chunk = citation.chunk_index >= 0 ? transcript?.content?.[citation.chunk_index] : transcript?.summary;
  const chunkText = typeof chunk === 'string' ? chunk : chunk?.text || '';
  const truncatedText = chunkText.length > 500
    ? chunkText.substring(0, 500) + '...' 
    : chunkText;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background-elevated rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background-elevated border-b border-border p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-500 text-white text-xs font-bold rounded-full flex-shrink-0">
              {citationNumber}
            </span>
            <h3 className="text-lg font-semibold text-foreground break-words">
              {loading ? 'Loading...' : transcript?.semantic_title || transcript?.title || 'Transcript'}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/transcript/${citation.transcript_id}${citation.chunk_index >= 0 ? `#chunk-${citation.chunk_index}` : ''}`}
              target="_blank"
              className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
              title="Open in new tab"
            >
              <svg className="w-5 h-5 text-foreground-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              onClick={onClose}
              className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-foreground-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}

          {error && (
            <div className="text-error-500 text-center py-4">{error}</div>
          )}

          {!loading && !error && transcript && (
            <div>
              {chunk && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-foreground-tertiary uppercase tracking-wide">
                    {typeof chunk === 'string' ? 'Transcript Summary' : chunk.speaker}
                  </span>
                </div>
              )}
              <p className="text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                {truncatedText || 'No text available for this chunk.'}
              </p>
              {chunkText.length > 300 && (
                <Link
                  href={`/transcript/${citation.transcript_id}${citation.chunk_index >= 0 ? `#chunk-${citation.chunk_index}` : ''}`}
                  target="_blank"
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium mt-3 inline-flex items-center gap-1"
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
