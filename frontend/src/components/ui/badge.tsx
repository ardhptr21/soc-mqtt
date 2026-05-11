import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'border-transparent bg-primary/15 text-primary',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border-border/60 text-foreground',
  low: 'border-purple-300/20 bg-purple-300/8 text-purple-300',
  medium: 'border-purple-400/25 bg-purple-400/10 text-purple-400',
  high: 'border-purple-500/30 bg-purple-500/12 text-purple-300',
  critical: 'border-purple-200/30 bg-purple-200/10 text-purple-100',
};

type BadgeVariant = keyof typeof variants;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
