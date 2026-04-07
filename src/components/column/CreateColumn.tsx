import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface CreateColumnProps {
  boardId: Id<"boards">;
  fullWidth?: boolean;
}

export function CreateColumn({ boardId, fullWidth = false }: CreateColumnProps) {
  const createColumn = useMutation(api.columns.create);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      await createColumn({ boardId, title: trimmed });
      toast.success(`Status "${trimmed}" added`);
      setTitle("");
      setIsAdding(false);
    } catch {
      toast.error("Failed to add status");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdding) {
    return (
      <div className={fullWidth ? "w-full" : "flex-shrink-0 w-[85vw] max-w-80"}>
        <form
          onSubmit={handleSubmit}
          className="bg-brand-primary border-2 border-brand-text/20 rounded-[2rem] p-4 space-y-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Status title..."
            maxLength={40}
            onKeyDown={(e) => e.key === "Escape" && setIsAdding(false)}
            className="w-full h-10 px-4 bg-brand-bg border-2 border-brand-text/20 rounded-2xl font-sans text-sm focus:outline-none focus:border-brand-text transition-colors"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="flex-1 h-9 bg-brand-text text-brand-bg rounded-xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              Add Status
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setTitle("");
              }}
              className="h-9 w-9 flex items-center justify-center border-2 border-brand-text/20 rounded-xl hover:border-brand-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className={`${
        fullWidth ? "w-full" : "flex-shrink-0 w-[70vw] max-w-72"
      } h-14 bg-brand-bg/50 border-2 border-dashed border-brand-text/20 rounded-[2rem] hover:border-brand-text hover:bg-brand-primary font-mono text-sm font-bold text-brand-text/40 hover:text-brand-text flex items-center justify-center gap-2 transition-all group`}
    >
      <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
      Add Status
    </button>
  );
}
