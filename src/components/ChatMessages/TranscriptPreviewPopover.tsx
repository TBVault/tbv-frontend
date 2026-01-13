'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import Link from 'next/link';
import type { Transcript, TranscriptCitation } from '@/api/generated/schemas';
import { Skeleton, SkeletonText } from '@/components/Skeleton';

interface TranscriptPreviewPopoverProps {
  citation: TranscriptCitation;
  citationNumber: number;
  transcript: Transcript | undefined;
  transcriptTitle: string;
  isLoading: boolean;
  children: React.ReactNode;
}

type PopoverPosition = {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
};

export function TranscriptPreviewPopover({
  citation,
  citationNumber,
  transcript,
  transcriptTitle,
  isLoading,
  children,
}: TranscriptPreviewPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ vertical: 'top', horizontal: 'center' });
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Smart positioning - calculate where popover should appear
  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const calculatePosition = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const popoverWidth = isMobile ? 320 : 384; // w-80 = 320px, sm:w-96 = 384px
      const popoverHeight = 280; // Approximate max height
      const padding = 16;

      // Vertical position - prefer top, use bottom if not enough space
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const vertical: 'top' | 'bottom' = spaceAbove >= popoverHeight + padding ? 'top' : 
                                          spaceBelow >= popoverHeight + padding ? 'bottom' : 
                                          spaceAbove > spaceBelow ? 'top' : 'bottom';

      // Horizontal position - prefer center, shift if would overflow
      const centerX = rect.left + rect.width / 2;
      const leftEdge = centerX - popoverWidth / 2;
      const rightEdge = centerX + popoverWidth / 2;
      
      let horizontal: 'left' | 'center' | 'right' = 'center';
      if (leftEdge < padding) {
        horizontal = 'left';
      } else if (rightEdge > window.innerWidth - padding) {
        horizontal = 'right';
      }

      setPosition({ vertical, horizontal });
    };

    calculatePosition();
    
    // Recalculate on scroll/resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);
    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, isMobile]);

  // Handle click outside to close on mobile
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => setIsOpen(true), 200);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  }, [isMobile]);

  const handlePopoverEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMobile) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen((prev) => !prev);
    }
  }, [isMobile]);

  // Get chunk content
  const chunk = citation.chunk_index >= 0 
    ? transcript?.content?.[citation.chunk_index] 
    : transcript?.summary;
  const chunkText = typeof chunk === 'string' ? chunk : chunk?.text || '';
  const speaker = typeof chunk === 'string' ? null : chunk?.speaker;
  const truncatedText = chunkText.length > 500 
    ? chunkText.substring(0, 500) + '...' 
    : chunkText;

  const transcriptUrl = `/transcript/${citation.transcript_id}${citation.chunk_index >= 0 ? `#chunk-${citation.chunk_index}` : ''}`;

  // Calculate styles based on position
  const getPopoverStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      position: 'absolute',
    };

    // Vertical positioning
    if (position.vertical === 'top') {
      styles.bottom = '100%';
      styles.marginBottom = '8px';
    } else {
      styles.top = '100%';
      styles.marginTop = '8px';
    }

    // Horizontal positioning
    if (position.horizontal === 'center') {
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
    } else if (position.horizontal === 'left') {
      styles.left = '0';
    } else {
      styles.right = '0';
    }

    return styles;
  };

  const getArrowStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      position: 'absolute',
      zIndex: -1,
    };

    // Vertical positioning
    if (position.vertical === 'top') {
      styles.bottom = '-8px';
    } else {
      styles.top = '-8px';
    }

    // Horizontal positioning
    if (position.horizontal === 'center') {
      styles.left = '50%';
      styles.transform = 'translateX(-50%) rotate(45deg)';
    } else if (position.horizontal === 'left') {
      styles.left = '16px';
      styles.transform = 'rotate(45deg)';
    } else {
      styles.right = '16px';
      styles.transform = 'rotate(45deg)';
    }

    return styles;
  };

  const getArrowClasses = () => {
    const base = 'w-4 h-4 bg-background-elevated';
    if (position.vertical === 'top') {
      return `${base} border-r border-b border-white/10`;
    } else {
      return `${base} border-l border-t border-white/10`;
    }
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span onClick={handleClick}>{children}</span>

      {isOpen && (
        <div
          ref={popoverRef}
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute z-50 w-80 sm:w-96 animate-in fade-in-0 zoom-in-95 duration-200"
          style={getPopoverStyles()}
        >
          {/* Arrow */}
          <div 
            className={getArrowClasses()}
            style={getArrowStyles()}
          />

          {/* Popover Content */}
          <div className="bg-background-elevated/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-r from-primary-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex-shrink-0 shadow-lg shadow-primary-500/30">
                  {citationNumber}
                </span>
                {isLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {transcriptTitle}
                  </h4>
                )}
              </div>
              {speaker && !isLoading && (
                <p className="text-xs text-foreground-tertiary mt-1 ml-7">
                  {speaker}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="px-4 py-3 max-h-48 overflow-y-auto">
              {isLoading ? (
                <SkeletonText lines={3} />
              ) : truncatedText ? (
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  {truncatedText}
                </p>
              ) : (
                <p className="text-sm text-foreground-tertiary italic">
                  No preview available
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-background-secondary/50">
              <Link
                href={transcriptUrl}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                <span>View full transcript</span>
                <svg 
                  className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
