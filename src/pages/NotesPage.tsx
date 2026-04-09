import { useEffect, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { NoteEditor } from "../components/notes/NoteEditor";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

export function NotesPage() {
  const { noteId } = useParams<{ noteId?: string }>();
  const navigate = useNavigate();
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);

  const activeNoteId = (noteId as Id<"notes"> | undefined) ?? null;
  const activeNote = useQuery(
    api.notes.get,
    activeNoteId ? { noteId: activeNoteId } : "skip",
  );

  useEffect(() => {
    if (activeNoteId || notes === undefined || notes.length === 0) {
      return;
    }

    navigate(`/notes/${notes[0]._id}`, { replace: true });
  }, [activeNoteId, navigate, notes]);

  const handleCreateNote = async () => {
    try {
      const createdNoteId = await createNote({ title: "Untitled" });
      navigate(`/notes/${createdNoteId}`, { replace: true });
    } catch {
      toast.error("Failed to create note");
    }
  };

  const openLatestNote = () => {
    if (!notes || notes.length === 0) {
      return;
    }

    navigate(`/notes/${notes[0]._id}`, { replace: true });
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
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
            <span className="font-mono text-xs text-brand-text/40">
              Loading notes...
            </span>
          </div>
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
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
            <span className="font-mono text-xs text-brand-text/40">
              Opening latest note...
            </span>
          </div>
        </div>
      );
    }
  } else if (activeNote === undefined) {
    content = (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
          <span className="font-mono text-xs text-brand-text/40">
            Loading note...
          </span>
        </div>
      </div>
    );
  } else if (activeNote) {
    content = <NoteEditor key={activeNote._id} note={activeNote} />;
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
    <Layout activeNoteId={activeNoteId ?? undefined}>
      <div className="flex min-h-0 flex-1 flex-col bg-brand-bg">
        {content}
      </div>
    </Layout>
  );
}
