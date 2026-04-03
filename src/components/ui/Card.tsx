import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ children, hover = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'p-6 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl',
        hover && 'hover:border-[var(--border-hover)] transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
