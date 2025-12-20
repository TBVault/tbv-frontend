'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({ onSend, disabled = false }, ref) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

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
      <div className="flex gap-3 items-end">
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
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="flex-shrink-0 w-12 h-12 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:bg-foreground-muted disabled:cursor-not-allowed transition-all flex items-center justify-center group"
        >
          <svg
            className="w-5 h-5 transform group-hover:scale-110 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-foreground-tertiary mt-2 text-center">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
