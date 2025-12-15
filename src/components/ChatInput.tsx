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

  // Auto-resize textarea up to 10 lines, then scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate max height for 10 lines (line-height * 10 + padding)
    // Assuming line-height of ~1.5 and padding of py-3 (12px top + 12px bottom)
    const lineHeight = 24; // approximate line height in pixels
    const padding = 24; // py-3 = 12px top + 12px bottom
    const maxHeight = lineHeight * 10 + padding;
    
    // Set height to scrollHeight, but cap at maxHeight
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 rounded-b-xl">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 items-start">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type your message..."
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{
                minHeight: '48px',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="flex-shrink-0 w-12 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:shadow-none group mt-0"
            style={{ height: '48px', marginTop: '0' }}
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
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send, Shift + Enter for new line
        </p>
      </form>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;

