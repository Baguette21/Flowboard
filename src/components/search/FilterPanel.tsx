import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { X, Flag, Tag, Calendar } from "lucide-react";
import { cn } from "../../lib/utils";

export interface FilterState {
  priority?: "low" | "medium" | "high" | "urgent";
  labelId?: Id<"labels">;
  dueFilter?: "overdue" | "today" | "week";
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  labels: Doc<"labels">[];
}

const PRIORITIES = [
  { value: "urgent" as const, label: "Urgent", color: "#E63B2E" },
  { value: "high" as const, label: "High", color: "#F97316" },
  { value: "medium" as const, label: "Medium", color: "#EAB308" },
  { value: "low" as const, label: "Low", color: "#3B82F6" },
];

const DUE_FILTERS = [
  { value: "overdue" as const, label: "Overdue" },
  { value: "today" as const, label: "Due today" },
  { value: "week" as const, label: "Due this week" },
];

export function FilterPanel({ filters, onChange, labels }: FilterPanelProps) {
  const hasFilters = filters.priority || filters.labelId || filters.dueFilter;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Priority filter */}
      <div className="flex items-center gap-1.5">
        <Flag className="w-3.5 h-3.5 text-brand-text/40" />
        <div className="flex gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() =>
                onChange({
                  ...filters,
                  priority: filters.priority === p.value ? undefined : p.value,
                })
              }
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wide transition-colors border",
                filters.priority === p.value
                  ? "bg-brand-text text-brand-bg border-brand-text"
                  : "border-brand-text/20 text-brand-text/50 hover:border-brand-text/40",
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label filter */}
      {labels.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-brand-text/40" />
          <div className="flex gap-1">
            {labels.map((label) => (
              <button
                key={label._id}
                onClick={() =>
                  onChange({
                    ...filters,
                    labelId: filters.labelId === label._id ? undefined : label._id,
                  })
                }
                className={cn(
                  "px-2 py-1 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wide transition-all border",
                  filters.labelId === label._id
                    ? "text-white border-transparent"
                    : "border-transparent text-white/80 hover:opacity-80",
                )}
                style={{
                  backgroundColor: filters.labelId === label._id
                    ? label.color
                    : `${label.color}33`,
                  color: label.color,
                }}
              >
                {label.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Due date filter */}
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-brand-text/40" />
        <div className="flex gap-1">
          {DUE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() =>
                onChange({
                  ...filters,
                  dueFilter: filters.dueFilter === f.value ? undefined : f.value,
                })
              }
              className={cn(
                "px-2 py-1 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wide transition-colors border",
                filters.dueFilter === f.value
                  ? "bg-brand-text text-brand-bg border-brand-text"
                  : "border-brand-text/20 text-brand-text/50 hover:border-brand-text/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 px-2 py-1 rounded-xl font-mono text-[10px] font-bold text-brand-accent hover:bg-brand-accent/10 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
