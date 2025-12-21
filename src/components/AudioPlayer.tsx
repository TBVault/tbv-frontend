'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import formatTime from '@/utils/formatTime';

interface AudioPlayerProps {
  recordingUrl: string;
  title?: string;
  artist?: string;
  artwork?: string;
}

interface WindowWithAudio extends Window {
  __audioSeekTo?: (time: number, autoPlay?: boolean) => void;
  __audioCurrentTime?: () => number;
  __audioIsPlaying?: () => boolean;
}

export default function AudioPlayer({ recordingUrl, title = 'The Bhakti Vault', artist = 'H.G. Vaiśeṣika Dāsa', artwork }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [lastValidDragTime, setLastValidDragTime] = useState(0);
  const lastValidDragTimeRef = useRef<number>(0);
  const hasBeenWithinBoundsRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const skipIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressBarFillRef = useRef<HTMLDivElement>(null);
  const progressBarTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const playerTouchStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset state when recording URL changes - use callback to avoid lint warning
    const resetState = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioDuration(0);
      setIsLoading(true);
    };
    resetState();

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

  const skipTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audioDuration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [audioDuration]);

  const stopSkipInterval = useCallback(() => {
    if (skipIntervalRef.current) {
      clearInterval(skipIntervalRef.current);
      skipIntervalRef.current = null;
    }
  }, []);

  const startSkipInterval = useCallback((direction: 'forward' | 'backward') => {
    stopSkipInterval();
    skipIntervalRef.current = setInterval(() => {
      skipTime(direction === 'forward' ? 10 : -10);
    }, 200);
  }, [stopSkipInterval, skipTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [audioDuration, isPlaying, skipTime, startSkipInterval, stopSkipInterval]);

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

  const handlePlayerMove = useCallback((clientX: number) => {
    if (!progressBarRef.current || !audioDuration) return;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      if (!progressBarRef.current || !progressBarFillRef.current) return;
      
      const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
      if (!progressBarElement) return;
      
      const barRect = progressBarElement.getBoundingClientRect();
      const x = clientX - barRect.left;
      
      if (x >= 0 && x <= barRect.width) {
        const percentage = x / barRect.width;
        const time = percentage * audioDuration;
        
        lastValidDragTimeRef.current = time;
        hasBeenWithinBoundsRef.current = true;
        
        progressBarFillRef.current.style.width = `${percentage * 100}%`;
        
        setLastValidDragTime(time);
        setTooltipPosition(x);
      }
    });
  }, [audioDuration]);

  const handlePlayerMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    handlePlayerMove(e.clientX);
  }, [handlePlayerMove]);

  const handleStartDragRef = useRef<((clientX: number) => void) | undefined>(undefined);
  
  const handleStartDrag = useCallback((clientX: number) => {
    if (!audioDuration || !progressBarRef.current) return;
    
    setIsDragging(true);
    isDraggingRef.current = true;
    const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
    if (!progressBarElement) return;
    
    const barRect = progressBarElement.getBoundingClientRect();
    const x = clientX - barRect.left;
    
    hasBeenWithinBoundsRef.current = false;
    
    if (x >= 0 && x <= barRect.width) {
      const percentage = x / barRect.width;
      const time = percentage * audioDuration;
      lastValidDragTimeRef.current = time;
      hasBeenWithinBoundsRef.current = true;
      setTooltipPosition(x);
    } else {
      lastValidDragTimeRef.current = currentTime;
      const clampedX = Math.max(0, Math.min(barRect.width, x));
      setTooltipPosition(clampedX);
    }
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    document.body.style.touchAction = 'none';
    
    window.addEventListener('mousemove', handlePlayerMouseMove);
    if (handlePlayerTouchMoveRef.current) {
      window.addEventListener('touchmove', handlePlayerTouchMoveRef.current, { passive: false });
    }
    if (handlePlayerMouseUpRef.current) {
      window.addEventListener('mouseup', handlePlayerMouseUpRef.current);
    }
    if (handlePlayerTouchEndRef.current) {
      window.addEventListener('touchend', handlePlayerTouchEndRef.current);
      window.addEventListener('touchcancel', handlePlayerTouchEndRef.current);
    }
  }, [audioDuration, currentTime, handlePlayerMouseMove]);
  
  useLayoutEffect(() => {
    handleStartDragRef.current = handleStartDrag;
  }, [handleStartDrag]);
  
  const handlePlayerTouchMoveRef = useRef<((e: TouchEvent) => void) | undefined>(undefined);

  const handlePlayerTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    
    // If dragging hasn't started yet but we have movement, start dragging
    if (!isDraggingRef.current && playerTouchStartRef.current && e.touches.length > 0) {
      const touch = e.touches[0];
      const start = playerTouchStartRef.current;
      const deltaX = Math.abs(touch.clientX - start.x);
      const deltaY = Math.abs(touch.clientY - start.y);
      
      // If moved more than 5px, start dragging
      if ((deltaX > 5 || deltaY > 5) && handleStartDragRef.current) {
        handleStartDragRef.current(touch.clientX);
      }
    }
    
    if (e.touches.length > 0 && isDraggingRef.current) {
      handlePlayerMove(e.touches[0].clientX);
    }
  }, [handlePlayerMove]);
  
  useLayoutEffect(() => {
    // Refs are mutable by design - this is a valid pattern for storing callback functions
    // eslint-disable-next-line react-hooks/immutability
    handlePlayerTouchMoveRef.current = handlePlayerTouchMove;
  }, [handlePlayerTouchMove]);

  const handlePlayerMouseUpRef = useRef<(() => void) | null>(null);
  const handlePlayerTouchEndRef = useRef<((e: TouchEvent) => void) | null>(null);
  const handleEndDragRef = useRef<(() => void) | null>(null);

  const handleEndDrag = useCallback(() => {
    const handleEndDragFn = handleEndDragRef.current;
    if (!handleEndDragFn) return;
    
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.body.style.touchAction = '';
    
    const audio = audioRef.current;
    const wasDragging = isDraggingRef.current;
    
    // If we weren't dragging but had a touch start, it might have been a cancelled tap
    if (!wasDragging) {
      playerTouchStartRef.current = null;
      if (handlePlayerTouchMoveRef.current) {
        window.removeEventListener('touchmove', handlePlayerTouchMoveRef.current);
      }
      window.removeEventListener('touchend', handleEndDragFn);
      window.removeEventListener('touchcancel', handleEndDragFn);
      return;
    }
    
    if (!audio) {
      setIsDragging(false);
      isDraggingRef.current = false;
      playerTouchStartRef.current = null;
      return;
    }
    
    const hasBeenWithinBounds = hasBeenWithinBoundsRef.current;
    const lastValidDragTime = lastValidDragTimeRef.current;
    
    let finalTime: number;
    if (hasBeenWithinBounds && lastValidDragTime > 0) {
      finalTime = lastValidDragTime;
    } else {
      finalTime = audio.currentTime;
    }
    
    audio.currentTime = finalTime;
    setCurrentTime(finalTime);
    
    if (progressBarFillRef.current && audioDuration > 0) {
      const percentage = (finalTime / audioDuration) * 100;
      progressBarFillRef.current.style.width = `${percentage}%`;
    }
    
    setIsDragging(false);
    isDraggingRef.current = false;
    playerTouchStartRef.current = null;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    window.removeEventListener('mousemove', handlePlayerMouseMove);
    window.removeEventListener('mouseup', handleEndDragFn);
    if (handlePlayerTouchMoveRef.current) {
      window.removeEventListener('touchmove', handlePlayerTouchMoveRef.current);
    }
    window.removeEventListener('touchend', handleEndDragFn);
    window.removeEventListener('touchcancel', handleEndDragFn);
  }, [handlePlayerMouseMove, audioDuration]);

  useLayoutEffect(() => {
    // Refs are mutable by design - this is a valid pattern for storing callback functions
    handleEndDragRef.current = handleEndDrag;
    // eslint-disable-next-line react-hooks/immutability
    handlePlayerMouseUpRef.current = handleEndDrag;
    // eslint-disable-next-line react-hooks/immutability
    handlePlayerTouchEndRef.current = handleEndDrag;
  }, [handleEndDrag]);


  const handlePlayerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    handleStartDrag(e.clientX);
  };

  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const target = e.target;
      const isProgressBar = (target as HTMLElement).closest('[class*="progress"]') !== null;
      
      // Store touch start info to detect if it's a tap or drag
      playerTouchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        target: target,
      };
      
      // Always prevent default to avoid scrolling, and attach touch move handler
      e.preventDefault();
      document.body.style.touchAction = 'none';
      
      // If it's not on the progress bar, start dragging immediately
      // Otherwise, wait for movement in touchmove handler
      if (!isProgressBar) {
        handleStartDrag(touch.clientX);
      } else {
        // Attach touch move handler to detect drag vs tap
        if (handlePlayerTouchMoveRef.current) {
          window.addEventListener('touchmove', handlePlayerTouchMoveRef.current, { passive: false });
        }
        if (handlePlayerTouchEndRef.current) {
          window.addEventListener('touchend', handlePlayerTouchEndRef.current);
          window.addEventListener('touchcancel', handlePlayerTouchEndRef.current);
        }
      }
    }
  };

  const handleProgressClick = (clientX: number) => {
    if (isDragging) return;
    
    const audio = audioRef.current;
    if (!audio || !audioDuration || !progressBarRef.current) return;

    const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
    if (!progressBarElement) return;
    
    const barRect = progressBarElement.getBoundingClientRect();
    const x = clientX - barRect.left;
    const percentage = Math.max(0, Math.min(1, x / barRect.width));
    const newTime = percentage * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressClickMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    handleProgressClick(e.clientX);
  };

  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length > 0) {
      progressBarTouchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleProgressTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    const touchStart = progressBarTouchStartRef.current;
    if (!touchStart || e.changedTouches.length === 0) {
      progressBarTouchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    const deltaTime = Date.now() - touchStart.time;

    // If it was a quick tap (within 300ms and less than 10px movement), treat as click
    if (deltaTime < 300 && deltaX < 10 && deltaY < 10 && !isDragging) {
      e.stopPropagation();
      handleProgressClick(touch.clientX);
    }
    
    progressBarTouchStartRef.current = null;
  };

  const progressPercentage = audioDuration > 0 
    ? (isDragging ? (lastValidDragTime / audioDuration) * 100 : (currentTime / audioDuration) * 100)
    : 0;

  const displayedTime = isDragging ? lastValidDragTime : currentTime;

  useEffect(() => {
    if (audioRef.current) {
      const win = window as unknown as WindowWithAudio;
      win.__audioSeekTo = (time: number, autoPlay: boolean = true) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
          if (autoPlay && !isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }
      };
      
      win.__audioCurrentTime = () => {
        return isDragging ? lastValidDragTimeRef.current : currentTime;
      };
      win.__audioIsPlaying = () => {
        return isPlaying;
      };
    }
    return () => {
      const win = window as unknown as WindowWithAudio;
      delete win.__audioSeekTo;
      delete win.__audioCurrentTime;
      delete win.__audioIsPlaying;
    };
  }, [isPlaying, isDragging, currentTime]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      const artworkUrl = artwork || `${window.location.origin}/apple-icon.png`;
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: artworkUrl, sizes: '384x384', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(console.error);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audioRef.current && audioDuration) {
          audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + skipTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== null && details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    }
  }, [title, artist, artwork, audioDuration]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if ('mediaSession' in navigator && audioDuration > 0) {
      navigator.mediaSession.setPositionState({
        duration: audioDuration,
        playbackRate: 1,
        position: currentTime,
      });
    }
  }, [currentTime, audioDuration]);

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 bg-background-elevated border-t border-border shadow-lg z-30 hover:bg-background-tertiary transition-colors select-none lg:ml-sidebar"
        onMouseDown={handlePlayerMouseDown}
        onTouchStart={handlePlayerTouchStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading && audioDuration === 0}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
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
                onClick={handleProgressClickMouse}
                onTouchStart={handleProgressTouchStart}
                onTouchEnd={handleProgressTouchEnd}
                className="h-2 bg-foreground-muted/30 rounded-full cursor-pointer hover:h-3 transition-all relative group"
              >
                <div
                  ref={progressBarFillRef}
                  className={`h-full bg-primary-500 rounded-full ${!isDragging ? 'transition-all' : ''}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              
              {/* Tooltip */}
              {isDragging && (
                <div
                  className="absolute bottom-full mb-2 transform -translate-x-1/2 pointer-events-none z-20"
                  style={{ left: `${tooltipPosition}px` }}
                >
                  <div className="bg-foreground text-background text-xs font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {formatTime(Math.floor(lastValidDragTime))}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground"></div>
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
