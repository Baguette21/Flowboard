import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";

interface LabelBadgeProps {
  label: Doc<"labels">;
  onRemove?: () => void;
  size?: "sm" | "md";
}

export function LabelBadge({ label, onRemove, size = "md" }: LabelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-mono uppercase font-bold tracking-widest text-white",
        size === "md" ? "px-2.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[9px]",
      )}
      style={{ backgroundColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-70 transition-opacity leading-none"
        >
          ×
        </button>
      )}
    </span>
  );
}
