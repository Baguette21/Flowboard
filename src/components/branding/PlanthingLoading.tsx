import { cn } from "../../lib/utils";
import "./branding.css";

interface PlanthingLoadingProps {
  message?: string;
  className?: string;
}

export function PlanthingLoading({ message, className }: PlanthingLoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 text-brand-text/65",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <svg
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        className="planthing-loader h-16 w-16"
        fill="none"
      >
        <line
          x1="20"
          y1="65"
          x2="60"
          y2="65"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="planthing-loader__ground"
        />
        <path
          d="M 40 65 L 40 24"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="planthing-loader__stem"
        />
        <path
          d="M 40 38 Q 53 41 60 30 Q 50 26 40 32 Z"
          fill="currentColor"
          className="planthing-loader__leaf-right"
        />
        <path
          d="M 40 50 Q 26 55 19 43 Q 30 39 40 45 Z"
          fill="currentColor"
          className="planthing-loader__leaf-left"
        />
        <circle
          cx="40"
          cy="22"
          r="5"
          fill="var(--color-brand-accent)"
          className="planthing-loader__bud"
        />
      </svg>
      {message ? (
        <p className="font-mono text-sm text-brand-text/60">{message}</p>
      ) : null}
    </div>
  );
}
