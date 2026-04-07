import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-brand-text/10 animate-pulse rounded-xl",
        className,
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full bg-brand-primary border-2 border-brand-text/10 rounded-[1.5rem] p-4 space-y-3">
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ColumnSkeleton() {
  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-brand-bg/50 border-2 border-brand-text/10 rounded-[2rem] overflow-hidden">
      <div className="p-4 border-b-2 border-brand-text/10 flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="p-3 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
