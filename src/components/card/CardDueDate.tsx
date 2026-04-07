import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

interface CardDueDateProps {
  cardId: Id<"cards">;
  dueDate?: number;
}

export function CardDueDate({ cardId, dueDate }: CardDueDateProps) {
  const updateCard = useMutation(api.cards.update);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      await updateCard({ cardId, dueDate: undefined });
      toast.success("Due date removed");
    } else {
      const ts = new Date(value).getTime();
      await updateCard({ cardId, dueDate: ts });
      toast.success("Due date set");
    }
  };

  const handleClear = async () => {
    await updateCard({ cardId, dueDate: undefined });
    toast.success("Due date removed");
  };

  const isOverdue = dueDate && dueDate < Date.now();
  const formatted = dueDate
    ? new Date(dueDate).toISOString().split("T")[0]
    : "";

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="date"
          value={formatted}
          onChange={handleChange}
          className={cn(
            "w-full h-9 px-3 bg-brand-bg border-2 border-brand-text/20 rounded-xl font-mono text-xs focus:outline-none focus:border-brand-text transition-colors",
            isOverdue && "border-brand-accent/40 bg-brand-accent/5 text-brand-accent",
          )}
        />
      </div>
      {dueDate && (
        <div className="flex items-center justify-between">
          <span className={cn(
            "font-mono text-xs",
            isOverdue ? "text-brand-accent font-bold" : "text-brand-text/50",
          )}>
            {isOverdue ? "Overdue" : format(dueDate, "EEE, MMM d")}
          </span>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-brand-text/30 hover:text-brand-accent font-mono text-xs transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
