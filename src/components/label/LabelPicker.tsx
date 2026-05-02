import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Plus, Check, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

const LABEL_COLORS = [
  "#E63B2E", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#111111", "#6B7280",
];

interface LabelPickerProps {
  planId: Id<"plans">;
  selectedIds: Id<"labels">[];
  onChange: (ids: Id<"labels">[]) => void;
}

export function LabelPicker({ planId, selectedIds, onChange }: LabelPickerProps) {
  const labels = useQuery(api.labels.listByPlan, { planId });
  const createLabel = useMutation(api.labels.create);
  const updateLabel = useMutation(api.labels.update);
  const deleteLabel = useMutation(api.labels.remove);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);
  const [editingId, setEditingId] = useState<Id<"labels"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleToggle = (labelId: Id<"labels">) => {
    if (selectedIds.includes(labelId)) {
      onChange(selectedIds.filter((id) => id !== labelId));
    } else {
      onChange([...selectedIds, labelId]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const labelId = await createLabel({ planId, name: trimmed, color: newColor });
      if (!selectedIds.includes(labelId)) {
        onChange([...selectedIds, labelId]);
      }
      setNewName("");
      setNewColor(LABEL_COLORS[0]);
      setIsCreating(false);
      toast.success("Label saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create label";
      toast.error(message);
    }
  };

  const handleUpdate = async (labelId: Id<"labels">) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Label name is required");
      return;
    }

    try {
      await updateLabel({ labelId, name: trimmed, color: editColor });
      setEditingId(null);
      toast.success("Label updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update label";
      toast.error(message);
    }
  };

  const handleDelete = async (labelId: Id<"labels">, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLabel({ labelId });
      onChange(selectedIds.filter((id) => id !== labelId));
      toast.success("Label deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete label";
      toast.error(message);
    }
  };

  if (!labels) return <div className="text-xs text-brand-text/40 font-mono">Loading…</div>;

  return (
    <div className="space-y-2">
      {/* Existing labels */}
      {labels.map((label) =>
        editingId === label._id ? (
          <div key={label._id} className="space-y-1.5 p-2 bg-brand-bg rounded-md border-2 border-brand-text/10">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdate(label._id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full h-7 px-2 bg-brand-primary border border-brand-text/20 rounded-md text-xs font-sans focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={cn(
                    "w-4 h-4 rounded-full border transition-all",
                    editColor === c ? "border-brand-text scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleUpdate(label._id)}
                className="flex-1 h-6 bg-brand-text text-brand-bg rounded-md font-mono text-[10px] font-bold"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="h-6 w-6 flex items-center justify-center border border-brand-text/20 rounded-md"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div
            key={label._id}
            onClick={() => handleToggle(label._id)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group",
              selectedIds.includes(label._id)
                ? "bg-brand-text/10"
                : "hover:bg-brand-text/5",
            )}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: label.color }}
            />
            <span className="flex-1 text-xs font-medium">{label.name}</span>
            {selectedIds.includes(label._id) && (
              <Check className="w-3 h-3 text-brand-text flex-shrink-0" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setEditingId(label._id); setEditName(label.name); setEditColor(label.color); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-brand-text text-brand-text/30 transition-all"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDelete(label._id, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-brand-accent text-brand-text/30 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ),
      )}

      {/* Create new label */}
      {isCreating ? (
        <form onSubmit={handleCreate} className="space-y-1.5 p-2 bg-brand-bg rounded-md border-2 border-brand-text/10">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name…"
            onKeyDown={(e) => e.key === "Escape" && setIsCreating(false)}
            className="w-full h-7 px-2 bg-brand-primary border border-brand-text/20 rounded-md text-xs font-sans focus:outline-none"
          />
          <div className="flex flex-wrap gap-1">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  "w-4 h-4 rounded-full border transition-all",
                  newColor === c ? "border-brand-text scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={!newName.trim()}
              className="flex-1 h-6 bg-brand-text text-brand-bg rounded-md font-mono text-[10px] font-bold disabled:opacity-60"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setNewName(""); }}
              className="h-6 w-6 flex items-center justify-center border border-brand-text/20 rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-mono text-brand-text/40 hover:text-brand-text hover:bg-brand-text/5 rounded-md transition-colors"
        >
          <Plus className="w-3 h-3" />
          New label
        </button>
      )}
    </div>
  );
}
