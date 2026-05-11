import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 cursor-pointer rounded-full border border-border/60 bg-background px-4 pr-8 text-sm text-foreground/80 outline-none transition-all duration-200 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
