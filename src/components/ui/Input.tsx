import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-2xl border-2 border-brand-text/30 bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-brand-text/40',
            'focus-visible:outline-none focus-visible:border-brand-text',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-brand-accent focus-visible:border-brand-accent',
            className
          )}
          {...props}
        />
        {error && (
          <span className="absolute -bottom-5 left-2 text-xs font-mono text-brand-accent">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
