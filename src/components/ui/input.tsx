'use client';

import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 rounded-xl bg-surface-elevated border border-border-subtle px-3 text-[14px] text-text-primary placeholder:text-text-secondary/50 outline-none transition-colors',
            'focus:border-info/50 focus:ring-1 focus:ring-info/20',
            error && 'border-error/50 focus:border-error/50 focus:ring-error/20',
            className
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
