import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { extractPlainTextFromBlockNoteContent } from "../../lib/blocknote";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dropdown } from "../ui/Dropdown";

interface NoteCardProps {
  note: Doc<"notes">;
}

export function NoteCard({ note }: NoteCardProps) {
  const navigate = useNavigate();
  const removeNote = useMutation(api.notes.remove);
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

  return (
    <>
      <div
        onClick={() => navigate(`/notes/${note._id}`)}
        className="group relative cursor-pointer select-none rounded-[14px] border-2 border-brand-text/10 bg-brand-primary p-6 transition-all hover:-translate-y-0.5 hover:border-brand-text/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] bg-brand-accent/12 text-brand-accent">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <h3 className="truncate font-serif text-xl font-bold italic leading-tight">
                {note.title || "Untitled"}
              </h3>
            </div>

            {preview ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-text/45">
                {preview}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-brand-text/25">
                Empty note
              </p>
            )}

            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-brand-text/40">
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
                  className="rounded-xl p-1.5 text-brand-text/20 opacity-0 transition-all hover:bg-brand-text/10 hover:text-brand-text group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
              items={menuItems}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-1.5">
          <div className="h-1.5 flex-1 rounded-full bg-brand-accent/25" />
          <div className="h-1.5 flex-1 rounded-full bg-brand-accent/12" />
          <div className="h-1.5 flex-1 rounded-full bg-brand-accent/6" />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete note"
        description={`This will permanently delete "${note.title || "Untitled"}". This action cannot be undone.`}
        confirmLabel="Delete Note"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
