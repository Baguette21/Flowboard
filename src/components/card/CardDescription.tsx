import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";

interface CardDescriptionProps {
  cardId: Id<"cards">;
  description?: string;
}

export function CardDescription({ cardId, description }: CardDescriptionProps) {
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
      <div className="space-y-2">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a description…"
          className="w-full h-32 p-3 bg-brand-bg border-2 border-brand-text/20 rounded-xl font-sans text-sm resize-y focus:outline-none focus:border-brand-text transition-colors"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-text text-brand-bg rounded-xl font-mono font-bold text-xs hover:bg-brand-dark transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-brand-text/20 rounded-xl font-mono font-bold text-xs hover:border-brand-text transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setValue(description ?? ""); setIsEditing(true); }}
      className="group relative cursor-text"
    >
      {description ? (
        <div className="bg-brand-bg/50 rounded-xl p-3 text-sm font-sans leading-relaxed whitespace-pre-wrap border-2 border-transparent group-hover:border-brand-text/20 transition-colors">
          {description}
          <Pencil className="w-3 h-3 absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity" />
        </div>
      ) : (
        <div className="bg-brand-bg/50 rounded-xl p-3 text-sm font-mono text-brand-text/30 border-2 border-dashed border-brand-text/10 group-hover:border-brand-text/30 transition-colors">
          Click to add a description…
        </div>
      )}
    </div>
  );
}
