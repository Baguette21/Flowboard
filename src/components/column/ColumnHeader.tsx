import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
  Check,
  X,
  Trash2,
  Pencil,
  Palette,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Dropdown } from "../ui/Dropdown";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/utils";

const COLUMN_COLORS = [
  "#E63B2E",
  "#F97316",
  "#A16207",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#6B7280",
  undefined, // no color / neutral
];

interface ColumnHeaderProps {
  column: Doc<"columns">;
  cardCount: number;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  onAddCard?: () => void;
}

export function ColumnHeader({
  column,
  cardCount,
  dragHandleProps,
  onAddCard,
}: ColumnHeaderProps) {
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
      toast.success("Group renamed");
    } catch {
      toast.error("Failed to rename group");
      setEditTitle(column.title);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteColumn({ columnId: column._id, deleteCards: true });
      toast.success(`"${column.title}" deleted`);
    } catch {
      toast.error("Failed to delete column");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleColorChange = async (color: string | undefined) => {
    await updateColumn({ columnId: column._id, color });
    setShowColorPicker(false);
  };

  const actionItems = [
    {
      label: "Rename",
      icon: <Pencil className="w-4 h-4" />,
      onClick: () => {
        setShowColorPicker(false);
        setEditTitle(column.title);
        setIsEditing(true);
      },
    },
    {
      label: "Change color",
      icon: <Palette className="w-4 h-4" />,
      onClick: () => setShowColorPicker((v) => !v),
    },
    {
      label: "Delete column",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        setShowColorPicker(false);
        setConfirmDelete(true);
      },
      danger: true,
      separator: true,
    },
  ];

  // Pill background: use column.color or a neutral fallback
  const pillBg = column.color ?? "#555";

  return (
    <>
      {/* ── Header row ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-1 group/header">
        {/* Left: pill title — pill IS the drag handle */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                  if (e.key === "Escape") {
                    setEditTitle(column.title);
                    setIsEditing(false);
                  }
                }}
                className="h-7 px-3 text-[12px] font-semibold rounded-full bg-brand-bg border-2 border-brand-text/25 focus:outline-none focus:border-brand-text text-brand-text"
                style={{ minWidth: 80 }}
              />
              <button
                onClick={() => void handleSave()}
                className="p-1 text-green-500 hover:bg-green-500/10 rounded-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setEditTitle(column.title);
                  setIsEditing(false);
                }}
                className="p-1 text-brand-text/35 hover:bg-brand-text/10 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Colored pill — drag handle */
            <button
              type="button"
              {...(!isEditing && dragHandleProps ? dragHandleProps : undefined)}
              onDoubleClick={() => {
                setEditTitle(column.title);
                setIsEditing(true);
              }}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white/90 select-none transition-opacity hover:opacity-85",
                dragHandleProps && "cursor-grab active:cursor-grabbing touch-none",
              )}
              style={{ backgroundColor: pillBg }}
              title="Drag to reorder · Double-click to rename"
            >
              {column.title}
              <span className="text-[10px] font-mono opacity-60">{cardCount}</span>
            </button>
          )}
        </div>

        {/* Right: menu + add */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-text/70 hover:bg-brand-text/8 transition-colors"
                  title="Group options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              }
              items={actionItems}
            />
            <button
              type="button"
              onClick={onAddCard}
              className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-text/70 hover:bg-brand-text/8 transition-colors"
              title="Add card"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Inline color picker ─────────────────────────── */}
      {showColorPicker && (
        <div className="flex flex-wrap gap-2 px-1 pb-3">
          {COLUMN_COLORS.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void handleColorChange(c)}
              className={cn(
                "w-5 h-5 rounded-full border-2 transition-all hover:scale-110",
                c === undefined
                  ? "bg-brand-text/15 border-brand-text/25"
                  : "border-transparent",
                column.color === c && "border-brand-text scale-110",
              )}
              style={c ? { backgroundColor: c } : {}}
              title={c ?? "Default"}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title={`Delete group "${column.title}"?`}
        description="All tasks in this group will be permanently deleted."
        confirmLabel="Delete Group"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
