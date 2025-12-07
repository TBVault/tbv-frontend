'use client';

import { useState } from 'react';

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
  const [showTimestamps, setShowTimestamps] = useState(false);

  // Helper to check if speaker changed from previous chunk
  const shouldShowSpeaker = (index: number): boolean => {
    const currentSpeaker = content[index].speaker?.trim();
    if (!currentSpeaker) return false; // Don't show if no speaker
    
    if (index === 0) return true;
    const previousSpeaker = content[index - 1].speaker?.trim();
    return currentSpeaker !== previousSpeaker;
  };

  return (
    <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-background-secondary to-background-tertiary px-6 py-4 border-b border-border flex justify-between items-center">
        {duration && (
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Duration</div>
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
        {content.map((chunk, index) => {
          const hasSpeaker = chunk.speaker?.trim();
          const showSpeakerWhenHidden = !showTimestamps && hasSpeaker && shouldShowSpeaker(index);
          const showSpeakerWhenVisible = showTimestamps && hasSpeaker;
          
          return (
            <div 
              key={index} 
              className="group px-6 py-3 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-200"
            >
              {/* Speaker and Timestamp */}
              <div className="mb-3" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'nowrap', minHeight: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' }}>
                  {showSpeakerWhenVisible && (
                    <div className="font-semibold text-foreground" style={{ whiteSpace: 'nowrap' }}>{chunk.speaker}</div>
                  )}
                  {showSpeakerWhenHidden && (
                    <div className="font-semibold text-foreground" style={{ whiteSpace: 'nowrap' }}>{chunk.speaker}</div>
                  )}
                </div>
                {showTimestamps && (
                  <div className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background-tertiary group-hover:bg-primary-100 rounded-lg transition-colors" style={{ whiteSpace: 'nowrap' }}>
                    {formatTime(chunk.start)}
                  </div>
                )}
              </div>
              
              {/* Text Content */}
              <div className="text-foreground-secondary leading-relaxed">
                {chunk.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

