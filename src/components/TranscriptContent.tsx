'use client';

import { useState, useEffect, useRef } from 'react';

// Helper function to format seconds to HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface TranscriptChunk {
  speaker: string;
  start: number;
  text: string;
}

interface TranscriptContentProps {
  content: TranscriptChunk[];
  duration?: number;
}

export default function TranscriptContent({ content, duration }: TranscriptContentProps) {
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [activeChunkStart, setActiveChunkStart] = useState<number | null>(null);
  const chunkRefs = useRef<Map<number, HTMLDivElement>>(new Map()); // Key: chunk start time, Value: element
  const lastScrolledTimeRef = useRef<number | null>(null);

  // Helper to group consecutive chunks by speaker when timestamps are off
  const groupChunksBySpeaker = (chunks: TranscriptChunk[]): TranscriptChunk[][] => {
    if (showTimestamps) {
      // When timestamps are on, return each chunk as its own group
      return chunks.map(chunk => [chunk]);
    }
    
    // When timestamps are off, group consecutive chunks with same speaker
    const groups: TranscriptChunk[][] = [];
    let currentGroup: TranscriptChunk[] = [];
    let currentSpeaker: string | null = null;
    
    chunks.forEach((chunk) => {
      const speaker = chunk.speaker?.trim() || null;
      
      if (speaker !== currentSpeaker) {
        // Speaker changed, start a new group
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [chunk];
        currentSpeaker = speaker;
      } else {
        // Same speaker, add to current group
        currentGroup.push(chunk);
      }
    });
    
    // Add the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  const groupedChunks = groupChunksBySpeaker(content);

  // Auto-scroll and highlight current audio position
  useEffect(() => {
    const checkAndScroll = () => {
      const getCurrentTime = (window as any).__audioCurrentTime;
      const getIsPlaying = (window as any).__audioIsPlaying;
      if (!getCurrentTime || !getIsPlaying) return;
      
      const currentTime = getCurrentTime();
      if (currentTime === undefined || currentTime === null) {
        setActiveChunkStart(null);
        return;
      }
      
      // Find the chunk that matches the current time
      // Find the chunk where start <= currentTime and the next chunk's start > currentTime
      let matchingChunkStart = -1;
      for (let i = 0; i < content.length; i++) {
        const chunk = content[i];
        const nextChunk = content[i + 1];
        
        if (chunk.start <= currentTime && (!nextChunk || nextChunk.start > currentTime)) {
          matchingChunkStart = chunk.start;
          break;
        }
      }
      
      // Update active chunk for highlighting
      if (matchingChunkStart !== -1) {
        setActiveChunkStart(matchingChunkStart);
        
        // Only scroll when timestamps are visible and audio is playing
        if (showTimestamps && getIsPlaying() && matchingChunkStart !== lastScrolledTimeRef.current) {
          lastScrolledTimeRef.current = matchingChunkStart;
          const chunkElement = chunkRefs.current.get(matchingChunkStart);
          
          if (chunkElement) {
            // Get header height from CSS variable
            const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) + 5 || 78;
            
            // Check if chunk is larger than viewport (minus header)
            const chunkHeight = chunkElement.offsetHeight;
            const viewportHeight = window.innerHeight - headerHeight;
            
            // Calculate scroll position
            const elementTop = chunkElement.getBoundingClientRect().top + window.pageYOffset;
            const offset = headerHeight + (chunkHeight > viewportHeight ? 0 : (viewportHeight - chunkHeight) / 2);
            const scrollTo = elementTop - offset;
            
            window.scrollTo({
              top: scrollTo,
              behavior: 'smooth',
            });
          }
        }
      } else {
        setActiveChunkStart(null);
      }
    };
    
    // Check every 200ms for smoother updates
    const interval = setInterval(checkAndScroll, 200);
    
    return () => clearInterval(interval);
  }, [content, showTimestamps]);

  return (
    <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-background-secondary to-background-tertiary px-6 py-4 border-b border-border flex justify-between items-center">
        {duration && (
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground-tertiary uppercase tracking-wide">Duration</div>
            <div className="text-sm font-semibold text-foreground">{formatTime(duration)}</div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="text-sm text-foreground-secondary font-medium">Show Timestamps</div>
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showTimestamps ? 'bg-primary-600' : 'bg-neutral-300'
            }`}
            role="switch"
            aria-checked={showTimestamps}
          >
            <div
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                showTimestamps ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {groupedChunks.map((group, groupIndex) => {
          const firstChunk = group[0];
          const hasSpeaker = firstChunk.speaker?.trim();
          const showSpeaker = !showTimestamps && hasSpeaker;
          
          // Check if this group contains the active chunk
          const isActive = group.some(chunk => chunk.start === activeChunkStart);
          
          return (
            <div 
              key={groupIndex}
              ref={(el) => {
                if (el) {
                  // Store ref using the first chunk's start time as the key
                  chunkRefs.current.set(firstChunk.start, el);
                }
              }}
              onDoubleClick={() => {
                if ((window as any).__audioSeekTo) {
                  (window as any).__audioSeekTo(firstChunk.start);
                }
              }}
              className={`group px-6 py-3 transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-primary-100 to-primary-50 border-l-4 border-primary-600' 
                  : 'hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent'
              }`}
            >
              {/* Speaker and Timestamp */}
              <div className="mb-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'nowrap', minHeight: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
                  {showTimestamps && hasSpeaker && (
                    <div className="font-semibold text-foreground" style={{ whiteSpace: 'nowrap' }}>{firstChunk.speaker}</div>
                  )}
                  {showSpeaker && (
                    <div className="font-semibold text-foreground" style={{ whiteSpace: 'nowrap' }}>{firstChunk.speaker}</div>
                  )}
                </div>
                {showTimestamps && (
                  <button
                    onClick={() => {
                      if ((window as any).__audioSeekTo) {
                        (window as any).__audioSeekTo(firstChunk.start);
                      }
                    }}
                    className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background-tertiary group-hover:bg-primary-100 rounded-lg transition-colors hover:bg-primary-200 cursor-pointer"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {formatTime(firstChunk.start)}
                  </button>
                )}
              </div>
              
              {/* Text Content - all chunks in group */}
              <div className="text-foreground-secondary leading-relaxed space-y-2">
                {group.map((chunk, chunkIndex) => (
                  <div key={chunkIndex}>
                    {showTimestamps && chunkIndex > 0 && (
                      <div className="mb-2 flex justify-end">
                        <button
                          onClick={() => {
                            if ((window as any).__audioSeekTo) {
                              (window as any).__audioSeekTo(chunk.start);
                            }
                          }}
                          className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background-tertiary group-hover:bg-primary-100 rounded-lg transition-colors hover:bg-primary-200 cursor-pointer"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {formatTime(chunk.start)}
                        </button>
                      </div>
                    )}
                    <div>{chunk.text}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

