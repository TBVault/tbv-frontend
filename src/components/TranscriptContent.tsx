'use client';

import { useState, useEffect, useRef } from 'react';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface WindowWithAudio extends Window {
  __audioSeekTo?: (time: number, autoPlay?: boolean) => void;
  __audioCurrentTime?: () => number;
  __audioIsPlaying?: () => boolean;
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
  const chunkRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastScrolledTimeRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      if (hash.startsWith('#chunk-')) {
        const chunkIndex = parseInt(hash.replace('#chunk-', ''), 10);
        
        if (!isNaN(chunkIndex) && chunkIndex >= 0 && chunkIndex < content.length) {
          const chunkStartTime = content[chunkIndex].start;
          
          const trySeek = (attempt = 0, maxAttempts = 10) => {
            const audioSeekTo = (window as WindowWithAudio).__audioSeekTo;
            
            if (audioSeekTo) {
              audioSeekTo(chunkStartTime, false);
            } else if (attempt < maxAttempts - 1) {
              setTimeout(() => trySeek(attempt + 1, maxAttempts), 100);
            }
          };
          
          trySeek();

          // Scroll to the element
          setTimeout(() => {
            const chunkElement = chunkRefs.current.get(chunkStartTime);

            if (chunkElement) {
              const scrollContainer = document.querySelector('main');
              
              if (scrollContainer) {
                const headerHeight = 78;
                const playerHeight = 160; // Approximate height of fixed audio player + buffer
                
                const chunkHeight = chunkElement.offsetHeight;
                const viewportHeight = scrollContainer.clientHeight - headerHeight - playerHeight;
                
                const elementRect = chunkElement.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const relativeTop = elementRect.top - containerRect.top;
                
                const offset = headerHeight + (chunkHeight > viewportHeight ? 0 : (viewportHeight - chunkHeight) / 2);
                const scrollTo = scrollContainer.scrollTop + relativeTop - offset;
                
                scrollContainer.scrollTo({
                  top: scrollTo,
                  behavior: 'smooth',
                });
              } else {
                // Fallback to window scroll if no main container found
                const headerHeight = 78;
                const offset = headerHeight;
                const elementTop = chunkElement.getBoundingClientRect().top + window.pageYOffset;
                
                window.scrollTo({
                  top: elementTop - offset,
                  behavior: 'smooth',
                });
              }
            }
          }, 500); // Small delay to ensure layout is unified
        }
      }
    };

    setTimeout(handleHashChange, 100);

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [content]);

  const groupChunksBySpeaker = (chunks: TranscriptChunk[]): { group: TranscriptChunk[], startIndex: number }[] => {
    if (showTimestamps) {
      return chunks.map((chunk, index) => ({ group: [chunk], startIndex: index }));
    }
    
    const groups: { group: TranscriptChunk[], startIndex: number }[] = [];
    let currentGroup: TranscriptChunk[] = [];
    let currentSpeaker: string | null = null;
    let groupStartIndex = 0;
    
    chunks.forEach((chunk, index) => {
      const speaker = chunk.speaker?.trim() || null;
      
      if (speaker !== currentSpeaker) {
        if (currentGroup.length > 0) {
          groups.push({ group: currentGroup, startIndex: groupStartIndex });
        }
        currentGroup = [chunk];
        currentSpeaker = speaker;
        groupStartIndex = index;
      } else {
        currentGroup.push(chunk);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push({ group: currentGroup, startIndex: groupStartIndex });
    }
    
    return groups;
  };

  const groupedChunks = groupChunksBySpeaker(content);

  useEffect(() => {
    const checkAndScroll = () => {
      const win = window as unknown as WindowWithAudio;
      const getCurrentTime = win.__audioCurrentTime;
      const getIsPlaying = win.__audioIsPlaying;
      if (!getCurrentTime || !getIsPlaying) return;
      
      const currentTime = getCurrentTime();
      if (currentTime === undefined || currentTime === null) {
        setActiveChunkStart(null);
        return;
      }
      
      let matchingChunkStart = -1;
      for (let i = 0; i < content.length; i++) {
        const chunk = content[i];
        const nextChunk = content[i + 1];
        
        if (chunk.start <= currentTime && (!nextChunk || nextChunk.start > currentTime)) {
          matchingChunkStart = chunk.start;
          break;
        }
      }
      
      if (matchingChunkStart !== -1) {
        setActiveChunkStart(matchingChunkStart);
        
        if (showTimestamps && getIsPlaying() && matchingChunkStart !== lastScrolledTimeRef.current) {
          lastScrolledTimeRef.current = matchingChunkStart;
          const chunkElement = chunkRefs.current.get(matchingChunkStart);
          
          if (chunkElement) {
            const scrollContainer = document.querySelector('main');
            
            if (scrollContainer) {
              const headerHeight = 78;
              const playerHeight = 160; // Approximate height of fixed audio player + buffer
              
              const chunkHeight = chunkElement.offsetHeight;
              const viewportHeight = scrollContainer.clientHeight - headerHeight - playerHeight;
              
              const elementRect = chunkElement.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              const relativeTop = elementRect.top - containerRect.top;
              
              const offset = headerHeight + (chunkHeight > viewportHeight ? 0 : (viewportHeight - chunkHeight) / 2);
              const scrollTo = scrollContainer.scrollTop + relativeTop - offset;
              
              scrollContainer.scrollTo({
                top: scrollTo,
                behavior: 'smooth',
              });
            } else {
              // Fallback to window scroll if no main container found
              const headerHeight = 78;
              const offset = headerHeight;
              const elementTop = chunkElement.getBoundingClientRect().top + window.pageYOffset;
              
              window.scrollTo({
                top: elementTop - offset,
                behavior: 'smooth',
              });
            }
          }
        }
      } else {
        setActiveChunkStart(null);
      }
    };
    
    const interval = setInterval(checkAndScroll, 200);
    
    return () => clearInterval(interval);
  }, [content, showTimestamps]);

  return (
    <div className="bg-background-elevated rounded-none lg:rounded-2xl border border-border overflow-hidden">
      <div className="bg-background-tertiary px-0 lg:px-6 py-4 border-b border-border flex justify-between items-center">
        {duration && (
          <div className="flex items-center gap-2 pl-4 lg:pl-0">
            <div className="text-sm font-medium text-foreground-tertiary uppercase tracking-wide">Duration</div>
            <div className="text-sm font-semibold text-foreground">{formatTime(duration)}</div>
          </div>
        )}
        <div className="flex items-center gap-3 pr-4 lg:pr-0">
          <div className="text-sm text-foreground-secondary font-medium">Show Timestamps</div>
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showTimestamps ? 'bg-primary-500' : 'bg-foreground-muted'
            }`}
            role="switch"
            aria-checked={showTimestamps}
          >
            <div
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showTimestamps ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-border">
        {groupedChunks.map(({ group, startIndex }, groupIndex) => {
          const firstChunk = group[0];
          const hasSpeaker = firstChunk.speaker?.trim();
          const showSpeaker = !showTimestamps && hasSpeaker;
          
          const isActive = group.some(chunk => chunk.start === activeChunkStart);
          
          const handleSeekToTimestamp = () => {
            const win = window as unknown as WindowWithAudio;
            if (win.__audioSeekTo) {
              win.__audioSeekTo(firstChunk.start);
            }
          };

          const handleTouchStart = (e: React.TouchEvent) => {
            const touch = e.touches[0];
            const now = Date.now();
            const lastTap = lastTapRef.current;

            if (lastTap && now - lastTap.time < 300) {
              // Check if taps are close enough (within 50px)
              const deltaX = Math.abs(touch.clientX - lastTap.x);
              const deltaY = Math.abs(touch.clientY - lastTap.y);
              
              if (deltaX < 50 && deltaY < 50) {
                e.preventDefault();
                handleSeekToTimestamp();
                lastTapRef.current = null;
                return;
              }
            }

            lastTapRef.current = {
              time: now,
              x: touch.clientX,
              y: touch.clientY,
            };
          };

          return (
            <div 
              key={groupIndex}
              id={`chunk-${startIndex}`}
              ref={(el) => {
                if (el) {
                  group.forEach(chunk => {
                    chunkRefs.current.set(chunk.start, el);
                  });
                }
              }}
              onDoubleClick={handleSeekToTimestamp}
              onTouchStart={handleTouchStart}
              className={`group px-0 lg:px-6 py-4 transition-all duration-200 cursor-pointer border-l-4 ${
                isActive 
                  ? '' 
                  : 'border-transparent hover:bg-background-tertiary'
              }`}
              style={isActive ? { borderLeftColor: '#f97316' } : undefined}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-4 lg:px-0">
                <div className="flex items-center gap-3">
                  {showTimestamps && hasSpeaker && (
                    <div className="font-semibold text-foreground">{firstChunk.speaker}</div>
                  )}
                  {showSpeaker && (
                    <div className="font-semibold text-foreground">{firstChunk.speaker}</div>
                  )}
                </div>
                {showTimestamps && (
                  <button
                    onClick={() => {
                      const win = window as unknown as WindowWithAudio;
                      if (win.__audioSeekTo) {
                        win.__audioSeekTo(firstChunk.start);
                      }
                    }}
                    className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background rounded-lg transition-colors hover:bg-primary-500/20 hover:text-primary-400"
                  >
                    {formatTime(firstChunk.start)}
                  </button>
                )}
              </div>
              
              <div className="text-foreground-secondary leading-relaxed space-y-2 px-4 lg:px-0">
                {group.map((chunk, chunkIndex) => (
                  <div 
                    key={chunkIndex}
                    id={chunkIndex > 0 ? `chunk-${startIndex + chunkIndex}` : undefined}
                  >
                    {showTimestamps && chunkIndex > 0 && (
                      <div className="mb-2 flex justify-end">
                        <button
                          onClick={() => {
                            const win = window as unknown as WindowWithAudio;
                            if (win.__audioSeekTo) {
                              win.__audioSeekTo(chunk.start);
                            }
                          }}
                          className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background rounded-lg transition-colors hover:bg-primary-500/20 hover:text-primary-400"
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
