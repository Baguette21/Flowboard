import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";
import { AlignLeft, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { BoardMemberSummary } from "../../lib/types";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  card: Doc<"cards">;
  labels: Doc<"labels">[];
  assignee?: BoardMemberSummary | null;
  isDragging?: boolean;
}

const priorityStyles: Record<string, string> = {
  urgent: "bg-brand-accent/10 text-brand-accent border-brand-accent/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const priorityDots: Record<string, string> = {
  urgent: "#E63B2E",
  high: "#F97316",
  medium: "#EAB308",
  low: "#3B82F6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ card, labels, assignee, isDragging, className, onClick, ...props }, ref) => {
    const isOverdue = card.dueDate && card.dueDate < Date.now() && !card.isComplete;
    const assigneeLabel = assignee?.name ?? assignee?.email ?? "Assigned";
    const assigneeInitials = assigneeLabel
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          "w-full select-none bg-brand-primary border-2 border-brand-text/10 rounded-[1.5rem] p-4 shadow-sm group hover:border-brand-text/30 interactive-lift cursor-pointer",
          card.isComplete && "opacity-60",
          isOverdue && "border-l-4 border-l-brand-accent",
          isDragging && "opacity-40 border-brand-accent rotate-1 scale-105 shadow-2xl cursor-grabbing",
          className,
        )}
        {...props}
      >
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {labels.map((label) => (
              <span
                key={label._id}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            "select-none text-[15px] font-bold leading-snug mb-2.5 font-sans",
            card.isComplete && "line-through",
          )}
        >
          {card.title}
        </h3>

        {/* Footer row */}
        <div className="flex items-center gap-2.5 text-xs font-mono text-brand-text/50 flex-wrap">
          {/* Description indicator */}
          {card.description && (
            <div className="flex items-center gap-1" title="Has description">
              <AlignLeft className="w-3 h-3" />
            </div>
          )}

          {/* Due date */}
          {card.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1",
                isOverdue && "text-brand-accent font-bold",
              )}
            >
              <Clock className="w-3 h-3" />
              {format(card.dueDate, "MMM d")}
            </div>
          )}

          {/* Priority */}
          {card.priority && (
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md border",
                priorityStyles[card.priority],
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: priorityDots[card.priority] }}
              />
              {card.priority}
            </div>
          )}

          {/* Complete check */}
          {card.isComplete && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px]">done</span>
            </div>
          )}

          {assignee && (
            <div
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brand-text/10 bg-brand-bg/70 px-1.5 py-0.5"
              title={`Assigned to ${assigneeLabel}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-text text-[9px] font-bold uppercase text-brand-bg">
                {assigneeInitials || "?"}
              </span>
              <span className="max-w-20 truncate text-[10px] text-brand-text/70">
                {assigneeLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  },
);
Card.displayName = "Card";
