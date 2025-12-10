'use client';

import { useState, useRef, useEffect } from 'react';
import formatTime from '@/utils/formatTime';

interface AudioPlayerProps {
  recordingUrl: string;
}

export default function AudioPlayer({ recordingUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset state when URL changes
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setIsLoading(true);
    setError(null);

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
        setIsLoading(false);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };
    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      setIsLoading(false);
    };
    const handleError = (e: Event) => {
      setIsLoading(false);
      const audioError = audio.error;
      let errorMessage = 'Failed to load audio.';
      
      if (audioError) {
        switch (audioError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported.';
            break;
          default:
            errorMessage = `Failed to load audio (error code: ${audioError.code}).`;
        }
      }
      
      console.error('Audio error:', audioError, e);
      setError(errorMessage);
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
    audio.addEventListener('error', handleError);

    // Load the audio
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [recordingUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Check if audio is ready to play
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          await audio.play();
          setIsPlaying(true);
          setError(null);
        } else {
          // Wait for audio to be ready
          setIsLoading(true);
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            setIsPlaying(true);
            setIsLoading(false);
            setError(null);
          }
        }
      }
    } catch (err: any) {
      console.error('Error playing audio:', err);
      setIsPlaying(false);
      setIsLoading(false);
      
      // Provide more specific error messages
      if (err.name === 'NotAllowedError') {
        setError('Autoplay was blocked. Please click play again.');
      } else if (err.name === 'NotSupportedError') {
        setError('Audio format not supported by your browser.');
      } else {
        setError(`Failed to play audio: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="bg-background rounded-xl border border-border shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading && audioDuration === 0}
            className="flex-shrink-0 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Progress Bar */}
          <div className="flex-1">
            <div
              onClick={handleProgressClick}
              className="h-2 bg-neutral-200 rounded-full cursor-pointer hover:h-3 transition-all"
            >
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="flex-shrink-0 text-sm font-medium text-foreground-secondary min-w-[100px] text-right">
            {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(audioDuration))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Audio Element (hidden) */}
        <audio 
          ref={audioRef} 
          src={recordingUrl} 
          preload="metadata"
          onError={(e) => {
            const audio = e.currentTarget;
            if (audio.error) {
              console.error('Audio element error:', audio.error);
            }
          }}
        />
      </div>
    </div>
  );
}

