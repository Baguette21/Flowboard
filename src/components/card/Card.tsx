import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";
import { FileText, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { BoardMemberSummary } from "../../lib/types";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  card: Doc<"cards">;
  labels: Doc<"labels">[];
  assignee?: BoardMemberSummary | null;
  statusColor?: string;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  urgent: "#E63B2E",
  high: "#F97316",
  medium: "#CA8A04",
  low: "#3B82F6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { card, labels, assignee, statusColor, isDragging, className, onClick, style, ...props },
    ref,
  ) => {
    const isOverdue = card.dueDate && card.dueDate < Date.now() && !card.isComplete;

    const assigneeLabel = assignee?.name ?? assignee?.email ?? "Assigned";
    const assigneeInitials = assigneeLabel
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    const hasMetadata =
      labels.length > 0 || card.priority || card.dueDate || card.isComplete || assignee;

    return (
      <div
        ref={ref}
        onClick={onClick}
        style={{
          ...style,
          ...(statusColor
            ? {
                backgroundColor: `${statusColor}16`,
                borderColor: `${statusColor}24`,
              }
            : null),
        }}
        className={cn(
          "relative w-full cursor-pointer select-none rounded-lg border px-3.5 py-3 transition-all duration-150",
          !statusColor && "border-brand-text/8 bg-brand-primary",
          card.isComplete && "opacity-50",
          isDragging && "scale-105 rotate-1 cursor-grabbing opacity-30 shadow-2xl",
          "hover:-translate-y-px hover:border-brand-text/20",
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-2.5">
          <FileText className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-brand-text/28" />
          <h3
            className={cn(
              "text-[13px] font-medium leading-snug text-brand-text/85",
              card.isComplete && "line-through text-brand-text/35",
            )}
          >
            {card.title}
          </h3>
        </div>

        {hasMetadata && (
          <div className="mt-2.5 ml-6 flex flex-col items-start gap-1.5">
            {labels.map((label) => (
              <span
                key={label._id}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white/90"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}

            {card.priority && (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white/90"
                style={{ backgroundColor: priorityColors[card.priority] }}
              >
                {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)} Priority
              </span>
            )}

            {card.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px]",
                  isOverdue ? "bg-red-500/12 text-red-400" : "text-brand-text/38",
                )}
              >
                <Clock className="h-2.5 w-2.5" />
                {format(card.dueDate, "MMM d")}
              </span>
            )}

            {card.isComplete && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-green-500">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Done
              </span>
            )}

            {assignee && (
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-text/15 text-[9px] font-bold uppercase text-brand-text"
                title={assigneeLabel}
              >
                {assigneeInitials || "?"}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Card.displayName = "Card";
