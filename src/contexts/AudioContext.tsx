'use client';

import { createContext, useContext, useRef, ReactNode } from 'react';

interface AudioContextType {
  audioRef: React.RefObject<HTMLAudioElement>;
  seekTo: (time: number) => void;
  play: () => Promise<void>;
  pause: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children, audioRef }: { children: ReactNode; audioRef: React.RefObject<HTMLAudioElement> }) {
  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const play = async () => {
    if (audioRef.current) {
      await audioRef.current.play();
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  return (
    <AudioContext.Provider value={{ audioRef, seekTo, play, pause }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}

