import { cn } from "../../lib/utils";

interface PlanthingMarkProps {
  className?: string;
  title?: string;
}

export function PlanthingMark({ className, title }: PlanthingMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <svg
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        fill="none"
      >
        <path
          d="M 12 21 L 12 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 12 15 Q 6.5 17 4 12 Q 8 10.5 12 13 Z"
          fill="currentColor"
        />
        <path
          d="M 12 11 Q 17 12 19.5 7 Q 15.5 5.5 12 8.5 Z"
          fill="currentColor"
        />
        <circle cx="12" cy="6" r="2.25" fill="var(--color-brand-accent)" />
      </svg>
    </span>
  );
}
