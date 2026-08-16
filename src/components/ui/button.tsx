'use client';

import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-info/50 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
          {
            'bg-info text-white hover:bg-info/90': variant === 'primary',
            'bg-surface-elevated border border-border-subtle text-text-primary hover:bg-white/10': variant === 'secondary',
            'text-text-secondary hover:text-text-primary hover:bg-surface-elevated': variant === 'ghost',
            'bg-error/15 text-error hover:bg-error/25 border border-error/20': variant === 'danger',
          },
          {
            'px-3 py-1.5 text-[13px] gap-1.5': size === 'sm',
            'px-4 py-2 text-[14px] gap-2': size === 'md',
            'px-5 py-3 text-[15px] gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
