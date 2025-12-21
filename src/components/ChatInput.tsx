'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({ onSend, onStop, disabled = false, isStreaming = false }, ref) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (textareaRef.current) {
        // On mobile, use scrollIntoView with better options to prevent excessive scrolling
        if (window.innerWidth <= 768) {
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
        textareaRef.current.focus();
      }
    },
  }));

  // Prevent excessive scrolling and scrollable space below input on mobile when keyboard appears
  useEffect(() => {
    const textarea = textareaRef.current;
    const container = inputContainerRef.current;
    if (!textarea || !container) return;

    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    let scrollTimeout: NodeJS.Timeout;
    let initialScrollY = 0;
    let isUserScrolling = false;
    let keyboardVisible = false;

    // Prevent scrolling below the input when keyboard is visible
    const preventScrollBelow = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - viewportHeight;
      const currentScroll = window.scrollY || window.pageYOffset;
      
      // If scrolled past the input area, prevent it
      if (currentScroll > maxScroll) {
        window.scrollTo({
          top: maxScroll,
          behavior: 'auto'
        });
      }
    };

    const handleFocus = () => {
      // Store initial scroll position before browser's automatic scroll
      initialScrollY = window.scrollY || window.pageYOffset;
      isUserScrolling = false;
      keyboardVisible = true;
      
      // Clear any pending scroll adjustments
      clearTimeout(scrollTimeout);
      
      // Wait for browser's automatic scroll to complete, then adjust if needed
      scrollTimeout = setTimeout(() => {
        if (isUserScrolling) return; // Don't adjust if user is manually scrolling
        
        const containerRect = container.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const inputBottom = containerRect.bottom;
        const currentScrollY = window.scrollY || window.pageYOffset;
        const scrollDelta = Math.abs(currentScrollY - initialScrollY);
        
        // Prevent scrolling below the input
        preventScrollBelow();
        
        // If browser scrolled too much (more than 100px), adjust back
        if (scrollDelta > 100) {
          // Calculate how much we should scroll (keep input visible but not too far)
          const targetScroll = initialScrollY + Math.min(100, scrollDelta * 0.5);
          window.scrollTo({
            top: Math.min(targetScroll, document.documentElement.scrollHeight - viewportHeight),
            behavior: 'smooth'
          });
        } else {
          // Check if input is properly positioned at bottom
          const distanceFromBottom = viewportHeight - inputBottom;
          // If input is too high (less than 60px from bottom), adjust slightly
          if (distanceFromBottom < 60 && distanceFromBottom > -20) {
            const adjustment = 60 - distanceFromBottom;
            const maxScroll = document.documentElement.scrollHeight - viewportHeight;
            window.scrollTo({
              top: Math.min(currentScrollY + adjustment, maxScroll),
              behavior: 'smooth'
            });
          }
        }
      }, 250);
    };

    const handleScroll = () => {
      if (keyboardVisible) {
        // Prevent scrolling when keyboard is visible - lock scroll position
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
        const currentScroll = window.scrollY || window.pageYOffset;
        
        // If trying to scroll past the max, prevent it
        if (currentScroll > maxScroll + 10) {
          window.scrollTo({
            top: maxScroll,
            behavior: 'auto'
          });
        }
      }
      isUserScrolling = true;
      clearTimeout(scrollTimeout);
    };

    const handleBlur = () => {
      clearTimeout(scrollTimeout);
      isUserScrolling = false;
      keyboardVisible = false;
    };

    // Listen for visual viewport changes (keyboard show/hide)
    const handleVisualViewportResize = () => {
      if (keyboardVisible) {
        preventScrollBelow();
      }
    };

    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('blur', handleBlur);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    
    return () => {
      clearTimeout(scrollTimeout);
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('blur', handleBlur);
      window.removeEventListener('scroll', handleScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    
    const lineHeight = 24;
    const padding = 24;
    const maxHeight = lineHeight * 10 + padding;
    
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div 
        ref={inputContainerRef} 
        className="flex gap-3 items-end"
        style={{
          scrollMarginBottom: '20px',
        }}
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Message The Bhakti Vault..."
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-background-elevated border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-foreground placeholder:text-foreground-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{
              minHeight: '48px',
            }}
          />
        </div>
        <div>
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="w-12 h-12 bg-error-500 text-white rounded-xl hover:bg-error-600 transition-all"
              aria-label="Stop generating"
            >
              <svg
                className="w-12 h-12"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="8" y="8" width="8" height="8" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="w-12 h-12 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:bg-foreground-muted disabled:cursor-not-allowed transition-all"
            >
              <svg
                className="w-12 h-12 transform group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16V8M8 12l4-4 4 4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-foreground-tertiary mt-2 text-center">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
