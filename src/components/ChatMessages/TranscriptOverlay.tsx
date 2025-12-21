'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Transcript } from '@/api/generated/schemas';
import { transcriptProtectedTranscriptGet } from '@/api/generated/endpoints/default/default';
import type { TranscriptOverlayProps } from './types';
import { Skeleton, SkeletonText } from '@/components/Skeleton';

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
            {loading ? (
              <Skeleton className="h-6 w-48 flex-1 max-w-xs" />
            ) : (
              <h3 className="text-lg font-semibold text-foreground break-words">
                {transcript?.semantic_title || transcript?.title || 'Transcript'}
              </h3>
            )}
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
            <div className="space-y-4">
              {/* Speaker label skeleton */}
              <Skeleton className="h-3 w-24" />
              {/* Content skeleton */}
              <SkeletonText lines={5} lastLineWidth="70%" />
              {/* Read more skeleton */}
              <Skeleton className="h-4 w-24 mt-2" />
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-error-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-error-500 font-medium">{error}</p>
            </div>
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
