import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    
    // Aesthetic variants mappings to Preset C colors
    const variants = {
      primary: 'bg-brand-text text-brand-bg hover:bg-brand-dark',
      secondary: 'bg-brand-primary border-2 border-brand-text/20 text-brand-text hover:border-brand-text',
      ghost: 'bg-transparent text-brand-text hover:bg-brand-text/10',
      outline: 'bg-transparent border-2 border-brand-text text-brand-text hover:bg-brand-text hover:text-brand-bg',
      danger: 'bg-brand-accent text-white hover:bg-red-700',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-8 text-base font-semibold',
      icon: 'h-10 w-10 p-2 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'btn-magnetic font-sans inline-flex items-center justify-center rounded-2xl md:rounded-[2rem] transition-colors focus-visible:outline-none focus:ring-2 focus:ring-brand-text disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
