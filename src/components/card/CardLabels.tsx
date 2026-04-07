import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";

interface CardLabelsProps {
  labels: Doc<"labels">[];
  compact?: boolean;
}

export function CardLabels({ labels, compact = false }: CardLabelsProps) {
  if (labels.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", compact && "gap-0.5")}>
      {labels.map((label) => (
        <span
          key={label._id}
          className={cn(
            "rounded-full font-mono uppercase font-bold tracking-widest text-white",
            compact
              ? "h-1.5 w-8 text-[0px]"
              : "px-2 py-0.5 text-[10px]",
          )}
          style={{ backgroundColor: label.color }}
          title={label.name}
        >
          {!compact && label.name}
        </span>
      ))}
    </div>
  );
}
