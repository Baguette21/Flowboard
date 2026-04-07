import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocusKey?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search tasks...",
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={cn("relative group w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-text transition-colors" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 bg-brand-bg border-2 border-brand-text/20 pl-10 pr-10 text-sm font-sans placeholder:text-brand-text/30 rounded-2xl focus:outline-none focus:border-brand-text transition-all lg:w-64 lg:focus:w-80"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text/40 hover:text-brand-text transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-brand-text/30 border border-brand-text/20 rounded px-1.5 py-0.5">
          /
        </kbd>
      )}
    </div>
  );
}
