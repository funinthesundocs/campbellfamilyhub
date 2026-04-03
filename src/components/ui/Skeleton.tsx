import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[var(--bg-tertiary)] rounded',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl">
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
