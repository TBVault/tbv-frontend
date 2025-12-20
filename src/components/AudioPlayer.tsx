'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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

  const handlePlayerMouseMove = useCallback((e: MouseEvent) => {
    if (!progressBarRef.current || !audioDuration) return;
    
    e.preventDefault();
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      if (!progressBarRef.current || !progressBarFillRef.current) return;
      
      const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
      if (!progressBarElement) return;
      
      const barRect = progressBarElement.getBoundingClientRect();
      const x = e.clientX - barRect.left;
      
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

  const handlePlayerMouseUpRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      const audio = audioRef.current;
      if (!audio) {
        setIsDragging(false);
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
      
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      window.removeEventListener('mousemove', handlePlayerMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    handlePlayerMouseUpRef.current = handleMouseUp;
  }, [handlePlayerMouseMove, audioDuration]);

  const handlePlayerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    
    if (!audioDuration || !progressBarRef.current) return;
    
    setIsDragging(true);
    isDraggingRef.current = true;
    const progressBarElement = progressBarRef.current.querySelector('div') as HTMLElement;
    if (!progressBarElement) return;
    
    const barRect = progressBarElement.getBoundingClientRect();
    const x = e.clientX - barRect.left;
    
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
    
    window.addEventListener('mousemove', handlePlayerMouseMove);
    if (handlePlayerMouseUpRef.current) {
      window.addEventListener('mouseup', handlePlayerMouseUpRef.current);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    const audio = audioRef.current;
    if (!audio || !audioDuration || !progressBarRef.current) return;

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
        className="fixed bottom-0 left-0 right-0 bg-background-elevated border-t border-border shadow-lg z-50 hover:bg-background-tertiary transition-colors select-none lg:ml-sidebar"
        onMouseDown={handlePlayerMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
