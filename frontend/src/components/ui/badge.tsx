import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border-border text-foreground',
  low: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  medium: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
  high: 'border-orange-500/40 bg-orange-500/15 text-orange-200',
  critical: 'border-red-500/40 bg-red-500/15 text-red-200',
};

type BadgeVariant = keyof typeof variants;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
