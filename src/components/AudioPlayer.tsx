'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import formatTime from '@/utils/formatTime';

interface AudioPlayerProps {
  recordingUrl: string;
}

export default function AudioPlayer({ recordingUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const lastValidDragTimeRef = useRef<number>(0);
  const hasBeenWithinBoundsRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const skipIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressBarFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setIsLoading(true);

    const updateTime = () => {
      if (!isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
        setIsLoading(false);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      setIsLoading(false);
    };
    const handleLoadedData = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
        setIsLoading(false);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [recordingUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const audio = audioRef.current;
      if (!audio || !audioDuration) return;

      const SKIP_SECONDS = 10;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPlaying) {
            audio.pause();
          } else {
            audio.play().catch(console.error);
          }
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          if (!skipIntervalRef.current) {
            skipTime(-SKIP_SECONDS);
            startSkipInterval('backward');
          }
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (!skipIntervalRef.current) {
            skipTime(SKIP_SECONDS);
            startSkipInterval('forward');
          }
          break;
        case 'k':
          e.preventDefault();
          if (isPlaying) {
            audio.pause();
          } else {
            audio.play().catch(console.error);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'j' || e.key === 'l') {
        stopSkipInterval();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopSkipInterval();
    };
  }, [audioDuration, isPlaying]);

  const startSkipInterval = (direction: 'forward' | 'backward') => {
    stopSkipInterval();
    skipIntervalRef.current = setInterval(() => {
      skipTime(direction === 'forward' ? 10 : -10);
    }, 200);
  };

  const stopSkipInterval = () => {
    if (skipIntervalRef.current) {
      clearInterval(skipIntervalRef.current);
      skipIntervalRef.current = null;
    }
  };

  const skipTime = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audioDuration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        if (audio.readyState >= 2) {
          await audio.play();
        }
      }
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  const handlePlayerMouseMove = useCallback((e: MouseEvent) => {
    if (!progressBarRef.current || !audioDuration) return;
    
    // Prevent text selection during drag
    e.preventDefault();
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      if (!progressBarRef.current || !progressBarFillRef.current) return;
      
      // Get the actual progress bar element
      const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
      if (!progressBarElement) return;
      
      const barRect = progressBarElement.getBoundingClientRect();
      const x = e.clientX - barRect.left;
      
      // Only update if we're within the progress bar bounds
      if (x >= 0 && x <= barRect.width) {
        const percentage = x / barRect.width;
        const time = percentage * audioDuration;
        
        // Update refs directly
        lastValidDragTimeRef.current = time;
        hasBeenWithinBoundsRef.current = true;
        
        // Directly update DOM for smooth performance (no React re-render)
        progressBarFillRef.current.style.width = `${percentage * 100}%`;
        
        // Only update tooltip position state (needed for tooltip rendering)
        setTooltipPosition(x);
      }
    });
  }, [audioDuration]);

  const handlePlayerMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on the play button
    if ((e.target as HTMLElement).closest('button')) return;
    
    // Prevent text selection
    e.preventDefault();
    
    if (!audioDuration || !progressBarRef.current) return;
    
    setIsDragging(true);
    isDraggingRef.current = true;
    // Get the actual progress bar element
    const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
    if (!progressBarElement) return;
    
    const barRect = progressBarElement.getBoundingClientRect();
    const x = e.clientX - barRect.left;
    
    // Reset the flag for this drag session
    hasBeenWithinBoundsRef.current = false;
    
    // If click was within bounds, calculate and set the time
    if (x >= 0 && x <= barRect.width) {
      const percentage = x / barRect.width;
      const time = percentage * audioDuration;
      lastValidDragTimeRef.current = time;
      hasBeenWithinBoundsRef.current = true;
      setTooltipPosition(x);
    } else {
      // Click was outside bounds
      lastValidDragTimeRef.current = currentTime;
      const clampedX = Math.max(0, Math.min(barRect.width, x));
      setTooltipPosition(clampedX);
    }
    
    // Prevent text selection globally during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    window.addEventListener('mousemove', handlePlayerMouseMove);
    window.addEventListener('mouseup', handlePlayerMouseUp);
  };

  const handlePlayerMouseUp = useCallback(() => {
    // Restore text selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    const audio = audioRef.current;
    if (!audio) {
      setIsDragging(false);
      return;
    }
    
    // If we've been within bounds during this drag, use the last valid position
    // Otherwise, use the audio's current time
    const hasBeenWithinBounds = hasBeenWithinBoundsRef.current;
    const lastValidDragTime = lastValidDragTimeRef.current;
    
    let finalTime: number;
    if (hasBeenWithinBounds && lastValidDragTime > 0) {
      finalTime = lastValidDragTime;
    } else {
      finalTime = audio.currentTime;
    }
    
    // Apply the final time
    audio.currentTime = finalTime;
    setCurrentTime(finalTime);
    
    // Sync progress bar fill with React state after drag ends
    if (progressBarFillRef.current && audioDuration > 0) {
      const percentage = (finalTime / audioDuration) * 100;
      progressBarFillRef.current.style.width = `${percentage}%`;
    }
    
    setIsDragging(false);
    isDraggingRef.current = false;
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    window.removeEventListener('mousemove', handlePlayerMouseMove);
    window.removeEventListener('mouseup', handlePlayerMouseUp);
  }, [handlePlayerMouseMove]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle click if we just finished dragging
    if (isDragging) return;
    // Don't handle click if it's on a button
    if ((e.target as HTMLElement).closest('button')) return;
    
    const audio = audioRef.current;
    if (!audio || !audioDuration || !progressBarRef.current) return;

    // Get the actual progress bar element
    const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
    if (!progressBarElement) return;
    
    const barRect = progressBarElement.getBoundingClientRect();
    const x = e.clientX - barRect.left;
    const percentage = Math.max(0, Math.min(1, x / barRect.width));
    const newTime = percentage * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercentage = audioDuration > 0 
    ? (isDragging ? (lastValidDragTimeRef.current / audioDuration) * 100 : (currentTime / audioDuration) * 100)
    : 0;

  const displayedTime = isDragging ? lastValidDragTimeRef.current : currentTime;

  // Expose seekTo function and current time for external use (e.g., from transcript timestamps)
  useEffect(() => {
    if (audioRef.current) {
      (window as any).__audioSeekTo = (time: number, autoPlay: boolean = true) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
          if (autoPlay && !isPlaying) {
            audioRef.current.play().catch(() => {
              // Ignore autoplay errors (user hasn't interacted with page yet)
            });
          }
        }
      };
      
      // Expose current time and playing state for transcript scrolling
      (window as any).__audioCurrentTime = () => {
        return isDragging ? lastValidDragTimeRef.current : currentTime;
      };
      (window as any).__audioIsPlaying = () => {
        return isPlaying;
      };
    }
    return () => {
      delete (window as any).__audioSeekTo;
      delete (window as any).__audioCurrentTime;
      delete (window as any).__audioIsPlaying;
    };
  }, [isPlaying, isDragging, currentTime]);

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 hover:bg-background-secondary transition-colors select-none"
        onMouseDown={handlePlayerMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="max-w-5xl mx-auto px-[29px] py-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading && audioDuration === 0}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: '2px' }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Progress Bar */}
            <div className="flex-1 relative" ref={progressBarRef}>
              <div
                onClick={handleProgressClick}
                className="h-2 bg-neutral-200 rounded-full cursor-pointer hover:h-3 transition-all relative group"
              >
                <div
                  ref={progressBarFillRef}
                  className={`h-full bg-primary-600 rounded-full ${!isDragging ? 'transition-all' : ''}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              {/* Tooltip */}
              {isDragging && (
                <div
                  className="absolute bottom-full mb-2 transform -translate-x-1/2 pointer-events-none z-20"
                  style={{ left: `${tooltipPosition}px` }}
                >
                  <div className="bg-neutral-900 text-white text-xs font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {formatTime(Math.floor(lastValidDragTimeRef.current))}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900"></div>
                </div>
              )}
            </div>

            {/* Time Display */}
            <div className="flex-shrink-0 text-xs font-mono text-foreground-secondary min-w-[80px] z-10 pointer-events-none">
              {formatTime(Math.floor(displayedTime))} / {formatTime(Math.floor(audioDuration))}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind player */}
      <div className="h-16" />

      {/* Audio Element (hidden) */}
      <audio
        ref={audioRef}
        src={recordingUrl}
        preload="metadata"
      />
    </>
  );
}
