'use client';

import { type CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer bg-foreground-muted/20 rounded ${className}`}
      style={style}
    />
  );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ 
  lines = 1, 
  className = '',
  lastLineWidth = '60%',
}: { 
  lines?: number; 
  className?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ 
            width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%' 
          }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for circular avatars
 */
export function SkeletonAvatar({ 
  size = 40,
  className = '',
}: { 
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Skeleton for chat message bubbles
 */
export function SkeletonChatMessage({ 
  isUser = false,
  lines = 3,
}: { 
  isUser?: boolean;
  lines?: number;
}) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${
          isUser
            ? 'max-w-[70%] bg-primary-500/10 rounded-2xl px-4 py-3'
            : 'w-full'
        }`}
      >
        <SkeletonText lines={lines} lastLineWidth={isUser ? '80%' : '45%'} />
      </div>
    </div>
  );
}

/**
 * Skeleton for transcript cards
 */
export function SkeletonTranscriptCard({ variant = 'row' }: { variant?: 'row' | 'grid' }) {
  if (variant === 'grid') {
    return (
      <div className="bg-background-elevated rounded-xl border border-border p-5 flex flex-col">
        <div className="w-full">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <SkeletonText lines={2} className="mb-4" />
        </div>
        <div className="mt-auto pt-4 border-t border-border flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-elevated rounded-xl border border-border p-5 flex items-start gap-6">
      <div className="flex-1">
        <Skeleton className="h-6 w-2/3 mb-2" />
        <SkeletonText lines={2} />
      </div>
      <div className="flex flex-col items-end gap-2 min-w-[120px]">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for sidebar chat history items
 */
export function SkeletonChatHistoryItem() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
      <Skeleton className="h-4 flex-1" />
    </div>
  );
}

/**
 * Skeleton for sidebar chat history group
 */
export function SkeletonChatHistoryGroup({ count = 3 }: { count?: number }) {
  return (
    <div>
      <div className="px-3 py-1.5">
        <Skeleton className="h-2.5 w-16" />
      </div>
      <div className="space-y-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonChatHistoryItem key={i} />
        ))}
      </div>
    </div>
  );
}

