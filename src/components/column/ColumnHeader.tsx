import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { MoreHorizontal, GripVertical, Check, X, Trash2, Pencil, Palette } from "lucide-react";
import { toast } from "sonner";
import { Dropdown } from "../ui/Dropdown";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/utils";

const COLUMN_COLORS = [
  "#E63B2E", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  undefined, // no color
];

interface ColumnHeaderProps {
  column: Doc<"columns">;
  cardCount: number;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

export function ColumnHeader({ column, cardCount, dragHandleProps }: ColumnHeaderProps) {
  const updateColumn = useMutation(api.columns.update);
  const deleteColumn = useMutation(api.columns.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === column.title) {
      setEditTitle(column.title);
      setIsEditing(false);
      return;
    }
    try {
      await updateColumn({ columnId: column._id, title: trimmed });
      toast.success("Status renamed");
    } catch {
      toast.error("Failed to rename status");
      setEditTitle(column.title);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteColumn({ columnId: column._id, deleteCards: true });
      toast.success(`Status "${column.title}" deleted`);
    } catch {
      toast.error("Failed to delete status");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleColorChange = async (color: string | undefined) => {
    await updateColumn({ columnId: column._id, color });
    setShowColorPicker(false);
  };

  return (
    <>
      <div
        className="p-4 flex items-center gap-2 sticky top-0 bg-brand-bg/80 backdrop-blur-xl z-10 border-b-2 border-brand-text/10 group"
        style={column.color ? { borderBottomColor: `${column.color}40` } : {}}
      >
        {/* Drag handle */}
        {dragHandleProps ? (
          <button
            {...dragHandleProps}
            className="hidden md:block text-brand-text/20 hover:text-brand-text/50 transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 flex-shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        ) : null}

        {/* Card count badge */}
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-text text-brand-bg font-mono text-xs font-bold shadow-md flex-shrink-0"
          style={column.color ? { backgroundColor: column.color } : {}}
        >
          {cardCount}
        </div>

        {/* Title */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1.5">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setEditTitle(column.title);
                  setIsEditing(false);
                }
              }}
              className="flex-1 text-base font-serif italic font-bold bg-brand-bg border-2 border-brand-text/20 rounded-xl px-2 py-0.5 focus:outline-none focus:border-brand-text"
            />
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded-lg">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setEditTitle(column.title); setIsEditing(false); }}
              className="p-1 text-brand-text/40 hover:bg-brand-text/10 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <h2
            className={cn(
              "flex-1 select-none font-serif italic font-bold text-lg leading-none tracking-tight pt-1 cursor-pointer"
            )}
            onDoubleClick={() => { setEditTitle(column.title); setIsEditing(true); }}
          >
            {column.title}
          </h2>
        )}

        {/* Actions menu */}
        <Dropdown
          trigger={
            <button className="text-brand-text/30 hover:text-brand-text hover:bg-brand-text/10 p-1.5 rounded-xl transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={[
            {
              label: "Rename",
              icon: <Pencil className="w-4 h-4" />,
              onClick: () => { setEditTitle(column.title); setIsEditing(true); },
            },
            {
              label: "Change color",
              icon: <Palette className="w-4 h-4" />,
              onClick: () => setShowColorPicker(!showColorPicker),
            },
            {
              label: "Delete column",
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => setConfirmDelete(true),
              danger: true,
              separator: true,
            },
          ]}
        />
      </div>

      {/* Color picker inline */}
      {showColorPicker && (
        <div className="flex flex-wrap gap-2 px-4 py-3 border-b-2 border-brand-text/10 bg-brand-bg/50">
          {COLUMN_COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => handleColorChange(c)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                c === undefined ? "bg-brand-text/10 border-brand-text/20" : "border-transparent",
                column.color === c && "border-brand-text scale-110",
              )}
              style={c ? { backgroundColor: c } : {}}
              title={c ?? "None"}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={`Delete status "${column.title}"?`}
        description="All tasks in this status will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Status"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
