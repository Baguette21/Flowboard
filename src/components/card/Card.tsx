import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";
import { FileText, Pencil, MoreHorizontal, Clock, CheckCircle2 } from "lucide-react";
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
  high:   "#F97316",
  medium: "#CA8A04",
  low:    "#3B82F6",
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
      .map((p) => p[0]?.toUpperCase() ?? "")
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
          "w-full select-none rounded-lg px-3.5 py-3 group cursor-pointer transition-all duration-150 relative",
          "border",
          !statusColor && "bg-brand-primary border-brand-text/8",
          card.isComplete && "opacity-50",
          isDragging &&
            "opacity-30 rotate-1 scale-105 shadow-2xl cursor-grabbing",
          "hover:border-brand-text/20 hover:-translate-y-px",
          className,
        )}
        {...props}
      >
        {/* Hover action buttons — top right */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-text/70 hover:bg-brand-text/10 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-text/70 hover:bg-brand-text/10 transition-colors"
            title="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title row */}
        <div className="flex items-start gap-2.5 pr-12">
          <FileText className="w-3.5 h-3.5 text-brand-text/28 mt-[1px] flex-shrink-0" />
          <h3
            className={cn(
              "text-[13px] font-medium leading-snug text-brand-text/85",
              card.isComplete && "line-through text-brand-text/35",
            )}
          >
            {card.title}
          </h3>
        </div>

        {/* Badge row */}
        {hasMetadata && (
          <div className="flex flex-col items-start gap-1.5 mt-2.5 ml-6">
            {labels.map((label) => (
              <span
                key={label._id}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium text-white/90"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}

            {card.priority && (
              <span
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-white/90"
                style={{ backgroundColor: priorityColors[card.priority] }}
              >
                {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}{" "}
                Priority
              </span>
            )}

            {card.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                  isOverdue
                    ? "text-red-400 bg-red-500/12"
                    : "text-brand-text/38",
                )}
              >
                <Clock className="w-2.5 h-2.5" />
                {format(card.dueDate, "MMM d")}
              </span>
            )}

            {card.isComplete && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-500">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Done
              </span>
            )}

            {assignee && (
              <span
                className="flex items-center justify-center h-5 w-5 rounded-full bg-brand-text/15 text-brand-text text-[9px] font-bold uppercase flex-shrink-0"
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
