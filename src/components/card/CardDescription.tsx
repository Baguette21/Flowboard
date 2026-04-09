import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface CardDescriptionProps {
  cardId: Id<"cards">;
  description?: string;
  compact?: boolean;
}

export function CardDescription({
  cardId,
  description,
  compact = false,
}: CardDescriptionProps) {
  const updateCard = useMutation(api.cards.update);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");

  const handleSave = async () => {
    await updateCard({ cardId, description: value.trim() || undefined });
    setIsEditing(false);
    toast.success("Description saved");
  };

  const handleCancel = () => {
    setValue(description ?? "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write something..."
          className="min-h-[120px] w-full resize-y bg-transparent p-0 font-sans text-sm leading-7 text-brand-text placeholder:text-brand-text/25 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-[9px] border border-brand-text/14 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text/70 transition-colors hover:border-brand-text/24 hover:text-brand-text"
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 rounded-[9px] border border-brand-text/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text/45 transition-colors hover:border-brand-text/20 hover:text-brand-text/70"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        setValue(description ?? "");
        setIsEditing(true);
      }}
      className="group cursor-text"
    >
      {description ? (
        <div className="min-h-[36px] whitespace-pre-wrap rounded-[10px] px-0 py-0 text-sm leading-7 text-brand-text transition-colors group-hover:text-brand-text/88">
          {description}
        </div>
      ) : (
        <div
          className={
            compact
              ? "min-h-[36px] rounded-[10px] px-0 py-0 font-mono text-[12px] leading-7 text-brand-text/24 transition-colors group-hover:text-brand-text/40"
              : "min-h-[80px] rounded-[10px] px-0 py-0 font-mono text-[12px] leading-7 text-brand-text/24 transition-colors group-hover:text-brand-text/40"
          }
        >
          Start typing...
        </div>
      )}
    </div>
  );
}
