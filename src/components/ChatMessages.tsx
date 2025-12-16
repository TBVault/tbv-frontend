'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useSession } from 'next-auth/react';
import type { 
  ChatObject,
  TextDelta,
  TranscriptCitation,
  WebSearchCitation,
  Transcript,
  ChatProgress,
  ChatTopic
} from '@/api/generated/schemas';
import { transcriptProtectedTranscriptGet } from '@/api/generated/endpoints/default/default';
import type { ChatMessagesProps, CitationMetadata } from './ChatMessages/types';
import { formatTimestamp, extractCitations } from './ChatMessages/utils';
import { TranscriptOverlay } from './ChatMessages/TranscriptOverlay';
import { MarkdownWithCitations } from './ChatMessages/MarkdownWithCitations';
import { ChatObjectRenderer } from './ChatMessages/ChatObjectRenderer';
import { SourcesSection } from './ChatMessages/SourcesSection';

function ChatMessages({
  messages,
  preFetchedTranscripts = new Map<string, Transcript>(),
  onChatTopic
}: ChatMessagesProps) {

  const { data: session } = useSession();
  const [selectedTranscript, setSelectedTranscript] = useState<{
    citation: TranscriptCitation;
    number: number;
  } | null>(null);
  const [transcriptData, setTranscriptData] = useState<Map<string, Transcript>>(preFetchedTranscripts);
  const [webTitles, setWebTitles] = useState<Map<string, string>>(new Map());
  const fetchedIds = useRef<Set<string>>(new Set());
  const fetchedWebUrls = useRef<Set<string>>(new Set());
  const notifiedTopicsRef = useRef<Set<string>>(new Set());
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

  // Fetch web citation titles
  useEffect(() => {
    const webUrls = new Set<string>();

    messages.forEach((message) => {
      message.content.forEach((chatObject) => {
        if (chatObject.data.type === 'web_search_citation') {
          const citation = chatObject.data as WebSearchCitation;
          webUrls.add(citation.url);
        }
      });
    });

    // Fetch titles for URLs we haven't fetched yet
    const fetchWebTitles = async () => {
      const urlsToFetch = Array.from(webUrls).filter(
        (url) => !fetchedWebUrls.current.has(url)
      );

      if (urlsToFetch.length === 0) return;

      // Fetch titles in parallel with a limit
      const batchSize = 5;
      for (let i = 0; i < urlsToFetch.length; i += batchSize) {
        const batch = urlsToFetch.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (url) => {
            fetchedWebUrls.current.add(url);
            
            try {
              const response = await fetch(`/api/web-title?url=${encodeURIComponent(url)}`);
              if (response.ok) {
                const data = await response.json();
                if (data.title) {
                  setWebTitles((prev) => new Map(prev).set(url, data.title));
                }
              }
            } catch (err) {
              console.error(`Error fetching title for ${url}:`, err);
            }
          })
        );
      }
    };

    if (webUrls.size > 0) {
      fetchWebTitles();
    }
  }, [messages]);

  // Helper to get transcript titles from stored data
  const transcriptTitles = useMemo(() => {
    const titles = new Map<string, string>();
    transcriptData.forEach((transcript, id) => {
      titles.set(id, transcript.title);
    });
    return titles;
  }, [transcriptData]);

  // Detect ChatTopic in messages and notify parent (only once per topic)
  useEffect(() => {
    if (!onChatTopic) return;

    messages.forEach((message) => {
      message.content.forEach((chatObject) => {
        if (chatObject.data.type === 'chat_topic') {
          const topic = chatObject.data as ChatTopic;
          if (topic.chat_topic && !notifiedTopicsRef.current.has(topic.chat_topic)) {
            notifiedTopicsRef.current.add(topic.chat_topic);
            onChatTopic(topic.chat_topic);
          }
        }
      });
    });
  }, [messages, onChatTopic]);

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
                      // Extract ChatProgress messages (can be multiple)
                      const chatProgressMessages = message.content
                        .filter((obj) => obj.data.type === 'chat_progress')
                        .map((obj) => obj.data as ChatProgress);
                      
                      // Check if there's any real content (text deltas or citations)
                      const hasTextDeltas = message.content.some(
                        (obj) => obj.data.type === 'text_delta'
                      );
                      const hasCitations = message.content.some(
                        (obj) => obj.data.type === 'transcript_citation' || obj.data.type === 'web_search_citation'
                      );
                      const hasActualContent = hasTextDeltas || hasCitations;
                      
                      // Show progress or typing indicator for assistant messages with no content yet
                      if (message.role === 'assistant' && !hasActualContent) {
                        if (chatProgressMessages.length > 0) {
                          // Show the latest progress message
                          const latestProgress = chatProgressMessages[chatProgressMessages.length - 1];
                          return (
                            <div className="text-gray-600 animate-pulse">
                              {latestProgress.progress}
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
                      
                      return (
                        <>
                          {/* Render content inline in exact order - citations embedded within text flow */}
                          {/* Note: ChatProgress is already handled above - it shows when no content, hides when content appears */}
                          {(() => {
                            // Filter out chat_progress and chat_topic (handled separately)
                            const content = message.content.filter(
                              (obj) => obj.data.type !== 'chat_progress' && obj.data.type !== 'chat_topic'
                            );
                            
                            if (content.length === 0) {
                              return null;
                            }

                            // Process content in exact order, preserving positions
                            const segments: Array<{ type: 'text' | 'citation'; content: string | ChatObject }> = [];
                            let currentTextGroup: string[] = [];

                            const flushTextGroup = () => {
                              if (currentTextGroup.length > 0) {
                                segments.push({
                                  type: 'text',
                                  content: currentTextGroup.join('')
                                });
                                currentTextGroup = [];
                              }
                            };
                            
                            content.forEach((chatObject) => {
                              if (chatObject.data.type === 'text_delta') {
                                // Accumulate text deltas
                                currentTextGroup.push((chatObject.data as TextDelta).delta);
                              } else {
                                // Flush any accumulated text before adding citation
                                flushTextGroup();
                                
                                // Add citation as a segment
                                segments.push({
                                  type: 'citation',
                                  content: chatObject
                                });
                              }
                            });

                            // Flush any remaining text
                            flushTextGroup();

                            if (segments.length === 0) {
                              return null;
                            }

                            // Render with inline citations for assistant, plain for user
                            if (message.role === 'assistant') {
                              return (
                                <MarkdownWithCitations
                                  segments={segments}
                                  citationMap={citationMap}
                                  transcriptTitles={transcriptTitles}
                                  webTitles={webTitles}
                                  onTranscriptClick={handleTranscriptClick}
                                />
                              );
                            } else {
                              // For user messages, render plain text with inline citations
                              return (
                                <span>
                                  {segments.map((segment, idx) => {
                                    if (segment.type === 'text') {
                                      return <span key={idx}>{segment.content as string}</span>;
                                    } else {
                                      const rendered = (
                                        <ChatObjectRenderer
                                          chatObject={segment.content as ChatObject}
                                          citationMap={citationMap}
                                          transcriptTitles={transcriptTitles}
                                          webTitles={webTitles}
                                          onTranscriptClick={handleTranscriptClick}
                                        />
                                      );
                                      return rendered ? (
                                        <span key={idx} className="inline-flex align-baseline mx-0.5">
                                          {rendered}
                                        </span>
                                      ) : null;
                                    }
                                  })}
                                </span>
                              );
                            }
                          })()}
                        </>
                      );
                    })()}
                  </div>
                      
                      {/* Sources section for assistant messages */}
                      {message.role === 'assistant' && (
                        <SourcesSection 
                          citations={citations}
                          transcriptTitles={transcriptTitles}
                          webTitles={webTitles}
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
