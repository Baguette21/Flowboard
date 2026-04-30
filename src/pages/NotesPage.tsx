import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { NoteEditor } from "../components/notes/NoteEditor";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { useBoardTabs } from "../hooks/useBoardTabs";
import { WorkspaceItemMenu } from "../components/layout/WorkspaceItemMenu";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { PlanthingLoading } from "../components/branding/PlanthingLoading";

export function NotesPage() {
  const { noteId } = useParams<{ noteId?: string }>();
  const navigate = useNavigate();
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const deleteNote = useMutation(api.notes.remove);
  const { ensureInActiveTab, openInActiveTab } = useBoardTabs();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeNoteId = (noteId as Id<"notes"> | undefined) ?? null;
  const activeNote = useQuery(
    api.notes.get,
    activeNoteId ? { noteId: activeNoteId } : "skip",
  );

  useEffect(() => {
    if (activeNoteId || notes === undefined || notes.length === 0) {
      return;
    }

    openInActiveTab({ kind: "note", id: notes[0]._id });
  }, [activeNoteId, notes, openInActiveTab]);

  useEffect(() => {
    if (!activeNoteId) {
      return;
    }

    ensureInActiveTab({ kind: "note", id: activeNoteId });
  }, [activeNoteId, ensureInActiveTab]);

  const handleCreateNote = async () => {
    try {
      const createdNoteId = await createNote({ title: "Untitled" });
      openInActiveTab({ kind: "note", id: createdNoteId });
    } catch {
      toast.error("Failed to create note");
    }
  };

  const openLatestNote = () => {
    if (!notes || notes.length === 0) {
      return;
    }

    openInActiveTab({ kind: "note", id: notes[0]._id });
  };

  const handleToggleFavorite = async () => {
    if (!activeNote) return;
    try {
      await updateNote({
        noteId: activeNote._id,
        isFavorite: !(activeNote.isFavorite ?? false),
      });
      toast.success(
        activeNote.isFavorite ? "Removed from favorites" : "Added to favorites",
      );
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleCopyLink = async () => {
    if (!activeNoteId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/notes/${activeNoteId}`);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleArchive = async () => {
    if (!activeNoteId) return;
    try {
      await updateNote({ noteId: activeNoteId, archivedAt: Date.now() });
      toast.success("Note archived");
      navigate("/");
    } catch {
      toast.error("Failed to archive note");
    }
  };

  const handleDelete = async () => {
    if (!activeNoteId) return;
    setIsDeleting(true);
    try {
      await deleteNote({ noteId: activeNoteId });
      toast.success("Note deleted");
      setConfirmDelete(false);
      navigate("/");
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderEmptyState = (
    title: string,
    description: string,
    action: ReactNode,
  ) => (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-text/5">
          <FileText className="h-8 w-8 text-brand-text/20" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold italic text-brand-text/70">
            {title}
          </h3>
          <p className="mt-2 font-mono text-xs leading-relaxed text-brand-text/35">
            {description}
          </p>
        </div>
        {action}
      </div>
    </div>
  );

  let content: React.ReactNode;

  if (!activeNoteId) {
    if (notes === undefined) {
      content = (
        <div className="flex flex-1 items-center justify-center px-4">
          <PlanthingLoading />
        </div>
      );
    } else if (notes.length === 0) {
      content = renderEmptyState(
        "No notes yet",
        "Create your first note and the editor will open here.",
        <button
          onClick={() => void handleCreateNote()}
          className="btn-magnetic inline-flex items-center gap-2 rounded-2xl bg-brand-text px-5 py-2.5 font-sans text-sm font-bold text-brand-bg transition-colors hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>,
      );
    } else {
      content = (
        <div className="flex flex-1 items-center justify-center px-4">
          <PlanthingLoading />
        </div>
      );
    }
  } else if (activeNote === undefined) {
    content = (
      <div className="flex flex-1 items-center justify-center px-4">
        <PlanthingLoading />
      </div>
    );
  } else if (activeNote) {
    content = (
      <NoteEditor
        key={activeNote._id}
        note={activeNote}
        actions={
          <WorkspaceItemMenu
            isFavorite={activeNote.isFavorite ?? false}
            onToggleFavorite={() => void handleToggleFavorite()}
            onCopyLink={() => void handleCopyLink()}
            onArchive={() => void handleArchive()}
            onDelete={() => setConfirmDelete(true)}
          />
        }
      />
    );
  } else {
    content = renderEmptyState(
      "Note not found",
      "This note doesn't exist anymore or you don't have access to it.",
      <div className="flex flex-wrap items-center justify-center gap-2">
        {notes && notes.length > 0 ? (
          <button
            onClick={openLatestNote}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-text px-5 py-2.5 font-sans text-sm font-bold text-brand-bg transition-colors hover:bg-brand-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Open Latest Note
          </button>
        ) : null}
        <button
          onClick={() => void handleCreateNote()}
          className="inline-flex items-center gap-2 rounded-2xl border border-brand-text/12 px-5 py-2.5 font-sans text-sm font-bold text-brand-text transition-colors hover:border-brand-text/24 hover:bg-brand-text/4"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>,
    );
  }

  return (
    <>
      <Layout activeNoteId={activeNoteId ?? undefined}>
        <div className="flex min-h-0 flex-1 flex-col bg-brand-bg">
          {content}
        </div>
      </Layout>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Delete note"
        description={`This will permanently delete "${activeNote?.title || "Untitled"}". This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
