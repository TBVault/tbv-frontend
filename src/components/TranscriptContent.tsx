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
          
          return (
            <div 
              key={groupIndex} 
              className="group px-6 py-3 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-200"
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
                  <div className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background-tertiary group-hover:bg-primary-100 rounded-lg transition-colors" style={{ whiteSpace: 'nowrap' }}>
                    {formatTime(firstChunk.start)}
                  </div>
                )}
              </div>
              
              {/* Text Content - all chunks in group */}
              <div className="text-foreground-secondary leading-relaxed space-y-2">
                {group.map((chunk, chunkIndex) => (
                  <div key={chunkIndex}>
                    {showTimestamps && chunkIndex > 0 && (
                      <div className="mb-2 flex justify-end">
                        <div className="text-sm font-mono font-medium text-foreground-tertiary px-3 py-1 bg-background-tertiary group-hover:bg-primary-100 rounded-lg transition-colors" style={{ whiteSpace: 'nowrap' }}>
                          {formatTime(chunk.start)}
                        </div>
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

