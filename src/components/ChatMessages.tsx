'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { 
  ChatSessionMessage, 
  ChatObject,
  TextDelta,
  TranscriptCitation,
  WebSearchCitation,
  Transcript,
  ChatProgress
} from '@/api/generated/schemas';
import { transcriptProtectedTranscriptGet } from '@/api/generated/endpoints/default/default';

interface ChatMessagesProps {
  messages: ChatSessionMessage[];
  preFetchedTranscripts?: Map<string, Transcript>;
}

interface TranscriptOverlayProps {
  citation: TranscriptCitation;
  citationNumber: number;
  authToken: string | undefined;
  preFetchedTranscript?: Transcript | null;
  onClose: () => void;
}

// Overlay component for transcript citations
function TranscriptOverlay({ citation, citationNumber, authToken, preFetchedTranscript, onClose }: TranscriptOverlayProps) {
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
              {loading ? 'Loading...' : transcript?.title || 'Transcript'}
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

interface CitationMetadata {
  type: 'transcript' | 'web';
  citation: TranscriptCitation | WebSearchCitation;
  number: number;
  title?: string;
}

// Component to render accumulated text as markdown (for assistant messages)
function MarkdownText({ text }: { text: string }) {
  return (
    <div>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 mt-4 first:mt-0 last:mb-0 leading-normal">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-1 space-y-0">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-1 space-y-0">{children}</ol>,
          li: ({ children }) => <li className="leading-normal mb-0">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-100 p-2 rounded-lg overflow-x-auto mb-1 text-sm">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic my-1 text-gray-700">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold mt-10 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-8 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-6 mb-1 first:mt-0">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// Component to render individual ChatObject based on type (non-text objects)
function ChatObjectRenderer({ 
  chatObject, 
  citationMap,
  transcriptTitles,
  onTranscriptClick
}: { 
  chatObject: ChatObject;
  citationMap: Map<string, CitationMetadata>;
  transcriptTitles: Map<string, string>;
  onTranscriptClick: (citation: TranscriptCitation, number: number) => void;
}) {
  const data = chatObject.data;

  // TextDelta is handled separately by accumulating all text deltas
  if (data.type === 'text_delta') {
    return null;
  }

  // ChatProgress is handled separately at the top of messages
  if (data.type === 'chat_progress') {
    return null;
  }

  // Type assertion and rendering for TranscriptCitation
  if (data.type === 'transcript_citation') {
    const citation = data as TranscriptCitation;
    const key = `transcript-${citation.transcript_id}-${citation.chunk_index}`;
    const metadata = citationMap.get(key);
    const title = transcriptTitles.get(citation.transcript_id) || 'Transcript';
    const truncatedTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
    
    return (
      <button
        onClick={() => onTranscriptClick(citation, metadata?.number || 0)}
        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-sm font-medium transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-600 text-white text-xs font-bold rounded-full">
          {metadata?.number || '?'}
        </span>
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs">{truncatedTitle}</span>
      </button>
    );
  }

  // Type assertion and rendering for WebSearchCitation
  if (data.type === 'web_search_citation') {
    const citation = data as WebSearchCitation;
    const key = `web-${citation.url}`;
    const metadata = citationMap.get(key);
    const domain = new URL(citation.url).hostname.replace('www.', '');
    
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-full text-sm font-medium transition-colors"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 bg-green-600 text-white text-xs font-bold rounded-full">
          {metadata?.number || '?'}
        </span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span className="text-xs">{domain}</span>
      </a>
    );
  }

  // ChatTopic should not be rendered in messages (it's metadata)
  if (data.type === 'chat_topic') {
    return null;
  }

  // Fallback for unknown types
  return null;
}

// Helper function to format timestamp
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper to extract citations from a message
function extractCitations(message: ChatSessionMessage): CitationMetadata[] {
  const citations: CitationMetadata[] = [];
  const seen = new Set<string>();
  let number = 1;

  message.content.forEach((chatObject) => {
    const data = chatObject.data;
    
    if (data.type === 'transcript_citation') {
      const citation = data as TranscriptCitation;
      const key = `transcript-${citation.transcript_id}-${citation.chunk_index}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          type: 'transcript',
          citation,
          number: number++,
        });
      }
    } else if (data.type === 'web_search_citation') {
      const citation = data as WebSearchCitation;
      const key = `web-${citation.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          type: 'web',
          citation,
          number: number++,
        });
      }
    }
  });

  return citations;
}

// Sources section component
function SourcesSection({ 
  citations,
  transcriptTitles
}: { 
  citations: CitationMetadata[];
  transcriptTitles: Map<string, string>;
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
              const domain = new URL(citation.url).hostname.replace('www.', '');
              return (
                <a
                  key={`source-web-${citation.url}`}
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg text-sm font-medium transition-colors border border-green-200 w-full"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                    {metadata.number}
                  </span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="flex-1">{domain}</span>
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

function ChatMessages({
  messages,
  preFetchedTranscripts = new Map<string, Transcript>()
}: ChatMessagesProps) {

  const { data: session } = useSession();
  const [selectedTranscript, setSelectedTranscript] = useState<{
    citation: TranscriptCitation;
    number: number;
  } | null>(null);
  const [transcriptData, setTranscriptData] = useState<Map<string, Transcript>>(preFetchedTranscripts);
  const fetchedIds = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUpRef = useRef(false);
  const isAutoScrollingRef = useRef(false);

  // Auto-scroll to bottom when messages change (including during streaming)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    
    if (userHasScrolledUpRef.current) {
      return;
    }

    // Set flag to prevent scroll event handler from interfering
    isAutoScrollingRef.current = true;
    
    // Scroll to bottom - use RAF to ensure DOM is updated
    requestAnimationFrame(() => {
      if (container && !userHasScrolledUpRef.current) {
        container.scrollTop = container.scrollHeight;
        // Reset flag after scroll completes
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 50);
      }
    });
  }, [messages]);

  // Track user scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Ignore our own programmatic scrolls
      if (isAutoScrollingRef.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If user scrolled up more than 150px from bottom, mark as scrolled up
      // If they're near the bottom, mark as not scrolled up (re-enable auto-scroll)
      userHasScrolledUpRef.current = distanceFromBottom > 150;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // On mount, ensure we start at bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    userHasScrolledUpRef.current = false;
    
    // Scroll to bottom after a brief delay to let content render
    const timeoutId = setTimeout(() => {
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []); // Only on mount, not when messages change

  // Initialize fetchedIds with pre-fetched transcripts
  useEffect(() => {
    preFetchedTranscripts.forEach((_, id) => {
      fetchedIds.current.add(id);
    });
  }, [preFetchedTranscripts]);

  // Fetch transcript data (including chunks) for all citations in messages
  useEffect(() => {
    if (!session?.idToken) return;

    const transcriptIds = new Set<string>();

    messages.forEach((message) => {
      message.content.forEach((chatObject) => {
        if (chatObject.data.type === 'transcript_citation') {
          const citation = chatObject.data as TranscriptCitation;
          transcriptIds.add(citation.transcript_id);
        }
      });
    });

    // Fetch full transcript data (including chunks) for transcripts we haven't fetched yet
    const fetchTranscripts = async () => {
      const idsToFetch = Array.from(transcriptIds).filter(
        (id) => !fetchedIds.current.has(id)
      );

      if (idsToFetch.length === 0) return;

      for (const transcriptId of idsToFetch) {
        fetchedIds.current.add(transcriptId);

        try {
          const response = await transcriptProtectedTranscriptGet(
            { public_id: transcriptId },
            session.idToken ? {
              headers: {
                Authorization: session.idToken,
              },
            } : undefined
          );
          if (response.status === 200) {
            setTranscriptData((prev) => new Map(prev).set(transcriptId, response.data));
          }
        } catch (err) {
          console.error(`Error fetching transcript ${transcriptId}:`, err);
        }
      }
    };

    if (transcriptIds.size > 0) {
      fetchTranscripts();
    }
  }, [messages, session?.idToken]);

  // Helper to get transcript titles from stored data
  const transcriptTitles = useMemo(() => {
    const titles = new Map<string, string>();
    transcriptData.forEach((transcript, id) => {
      titles.set(id, transcript.title);
    });
    return titles;
  }, [transcriptData]);

  const handleTranscriptClick = (citation: TranscriptCitation, number: number) => {
    setSelectedTranscript({ citation, number });
  };

  const handleCloseOverlay = () => {
    setSelectedTranscript(null);
  };
  
  return (
    <>
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="text-xl font-medium">Start a conversation</h3>
            <p className="mt-2">Send a message to begin chatting</p>
          </div>
        </div>
      ) : (
          messages.map((message) => {
            const citations = extractCitations(message);
            const citationMap = new Map<string, CitationMetadata>();
            
            citations.forEach((metadata) => {
              if (metadata.type === 'transcript') {
                const citation = metadata.citation as TranscriptCitation;
                const key = `transcript-${citation.transcript_id}-${citation.chunk_index}`;
                citationMap.set(key, metadata);
              } else {
                const citation = metadata.citation as WebSearchCitation;
                const key = `web-${citation.url}`;
                citationMap.set(key, metadata);
              }
            });

            return (
          <div
            key={message.public_id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`${
                message.role === 'user'
                  ? 'w-full min-[500px]:max-w-[70%] bg-gray-200 text-gray-900 rounded-2xl px-4 py-3'
                  : 'w-full text-gray-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="break-words">
                    {(() => {
                      // Check for ChatProgress in assistant messages
                      const chatProgress = message.content.find(
                        (obj) => obj.data.type === 'chat_progress'
                      )?.data as ChatProgress | undefined;
                      
                      const hasContent = message.content.some(
                        (obj) => obj.data.type !== 'chat_progress'
                      );
                      
                      // Show progress or typing indicator for assistant messages with no content yet
                      if (message.role === 'assistant' && !hasContent) {
                        if (chatProgress?.progress) {
                          return (
                            <div className="text-gray-600 animate-pulse">
                              {chatProgress.progress}
                            </div>
                          );
                        }
                        // Fallback to typing indicator if no progress
                        return (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></span>
                        <span className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></span>
                        <span className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></span>
                      </div>
                        );
                      }
                      
                      // Check if there's any actual content (text deltas or citations)
                      const hasTextDeltas = message.content.some(
                        (obj) => obj.data.type === 'text_delta'
                      );
                      const hasCitations = message.content.some(
                        (obj) => obj.data.type === 'transcript_citation' || obj.data.type === 'web_search_citation'
                      );
                      const hasActualContent = hasTextDeltas || hasCitations;
                      
                      return (
                      <>
                          {/* Show ChatProgress at the top for assistant messages, but only if no content has appeared yet */}
                          {message.role === 'assistant' && chatProgress?.progress && !hasActualContent && (
                            <div className="text-gray-600 mb-2 animate-pulse">
                              {chatProgress.progress}
                            </div>
                          )}
                          
                        {/* Accumulate and render all text deltas as markdown for assistant, plain text for user */}
                        {(() => {
                          const textDeltas = message.content
                            .filter((obj) => obj.data.type === 'text_delta')
                            .map((obj) => (obj.data as TextDelta).delta)
                            .join('');
                            
                            if (textDeltas) {
                              return message.role === 'assistant' ? (
                                <MarkdownText text={textDeltas} />
                              ) : (
                                <span>{textDeltas}</span>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Render non-text objects (citations, etc.) - exclude chat_progress */}
                          {message.content
                            .filter((obj) => obj.data.type !== 'text_delta' && obj.data.type !== 'chat_progress')
                            .map((chatObject, index) => (
                          <ChatObjectRenderer 
                            key={index} 
                            chatObject={chatObject}
                            citationMap={citationMap}
                            transcriptTitles={transcriptTitles}
                            onTranscriptClick={handleTranscriptClick}
                          />
                            ))}
                        </>
                      );
                    })()}
                  </div>
                      
                      {/* Sources section for assistant messages */}
                      {message.role === 'assistant' && (
                        <SourcesSection 
                          citations={citations}
                          transcriptTitles={transcriptTitles}
                        />
                      )}

                  {message.role === 'user' && (
                    <p className="text-xs mt-2 text-gray-500">
                      {formatTimestamp(message.created_on)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
            );
          })
      )}
      {/* Scroll anchor for auto-scrolling */}
      <div ref={messagesEndRef} />
    </div>

      {/* Transcript Overlay */}
      {selectedTranscript && (
        <TranscriptOverlay
          citation={selectedTranscript.citation}
          citationNumber={selectedTranscript.number}
          authToken={session?.idToken}
          preFetchedTranscript={transcriptData.get(selectedTranscript.citation.transcript_id)}
          onClose={handleCloseOverlay}
        />
      )}
    </>
  );
}

// Simple memo - only skip update if messages array reference is the same
// During streaming, content changes so we need to allow updates
// But we can skip updates when only the reference changes (parent re-render with same data)
export default memo(ChatMessages, (prevProps, nextProps) => {
  // Fast path: same references = skip update
  if (prevProps.messages === nextProps.messages && 
      prevProps.preFetchedTranscripts === nextProps.preFetchedTranscripts) {
    return true; // Skip update
  }
  
  // During streaming, messages array reference changes but we need updates
  // So we always allow updates - memo is mainly to prevent unnecessary re-renders
  // when parent re-renders with identical props
  return false; // Allow update
});

