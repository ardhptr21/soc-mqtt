import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'nav' | 'navActive';
  size?: 'sm' | 'md' | 'icon';
}

const variantClass = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/85 shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border/60 bg-transparent text-foreground/80 hover:bg-white/5 hover:text-foreground',
  ghost: 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  nav: 'border border-border/40 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground',
  navActive: 'border border-border/60 bg-white/8 text-foreground',
};

const sizeClass = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 py-2',
  icon: 'h-9 w-9',
};

export function Button({
  className,
  variant = 'default',
  size = 'md',
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
