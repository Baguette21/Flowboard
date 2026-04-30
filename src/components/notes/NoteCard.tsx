import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { extractPlainTextFromBlockNoteContent } from "../../lib/blocknote";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dropdown } from "../ui/Dropdown";
import { useBoardTabs } from "../../hooks/useBoardTabs";

interface NoteCardProps {
  note: Doc<"notes">;
}

export function NoteCard({ note }: NoteCardProps) {
  const removeNote = useMutation(api.notes.remove);
  const { openInActiveTab } = useBoardTabs();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const preview = extractPlainTextFromBlockNoteContent(note.content, 140);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeNote({ noteId: note._id });
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const menuItems = [
    {
      label: "Delete note",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => setConfirmDelete(true),
      danger: true,
    },
  ];

  const noteTitle = note.title || "Untitled";

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openInActiveTab({ kind: "note", id: note._id });
    }
  };

  return (
    <>
      <div
        onClick={() => openInActiveTab({ kind: "note", id: note._id })}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Open note ${noteTitle}`}
        className="group relative cursor-pointer select-none bg-brand-primary card-whisper card-elevation rounded-[12px] p-5 transition-all duration-150 hover:card-elevation-hover hover:border-[color:var(--color-border-whisper-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/35"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-brand-accent/12 text-brand-accent">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <h3 className="truncate font-sans text-[22px] font-bold leading-tight tracking-display text-brand-text">
                {noteTitle}
              </h3>
            </div>

            {preview ? (
              <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-[color:var(--color-text-muted)]">
                {preview}
              </p>
            ) : (
              <p className="mt-2 text-[15px] text-[color:var(--color-text-subtle)]">
                Empty note
              </p>
            )}

            <p className="mt-3 font-sans text-[12px] font-medium text-[color:var(--color-text-subtle)]">
              {new Date(note.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <Dropdown
              align="right"
              trigger={
                <button
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`More actions for ${noteTitle}`}
                  title="More actions"
                  className="rounded-lg p-1.5 text-[color:var(--color-text-subtle)] opacity-65 transition-all hover:bg-brand-text/5 hover:text-brand-text group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/30"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
              items={menuItems}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete note"
        description={`This will permanently delete "${noteTitle}". This action cannot be undone.`}
        confirmLabel="Delete Note"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
