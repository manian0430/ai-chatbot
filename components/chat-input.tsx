'use client';

import { type KeyboardEvent, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PaperclipIcon } from './icons';

interface ChatInputProps {
  input: string;
  handleInputChange: (value: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  disabled = false
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle enter key press to submit the form
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center space-x-2"
    >
      <Textarea
        ref={textareaRef}
        tabIndex={0}
        placeholder="Type a message..."
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[60px] w-full resize-none bg-background px-3 py-2"
        disabled={disabled || isLoading}
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={!input.trim() || isLoading || disabled}
        className="absolute right-2 top-2 h-8 w-8"
      >
        <PaperclipIcon />
      </Button>
    </form>
  );
} 