import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import {
  Plus,
  Search,
  FileText,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface NotesListProps {
  activeNoteId?: Id<"notes"> | null;
  onSelectNote: (noteId: Id<"notes">) => void;
  onNoteCreated?: (noteId: Id<"notes">) => void;
  /** Optimistic title overrides from the editor while typing */
  titleOverrides?: Record<string, string>;
}

export function NotesList({
  activeNoteId,
  onSelectNote,
  onNoteCreated,
  titleOverrides,
}: NotesListProps) {
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);
  const removeNote = useMutation(api.notes.remove);
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<Id<"notes"> | null>(null);

  const handleCreate = async () => {
    try {
      const noteId = await createNote({ title: "Untitled" });
      onSelectNote(noteId);
      onNoteCreated?.(noteId);
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleDelete = async (noteId: Id<"notes">, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      if (activeNoteId === noteId) {
        // Select the next note or nothing
        const remaining = notes?.filter((n) => n._id !== noteId);
        if (remaining && remaining.length > 0) {
          onSelectNote(remaining[0]._id);
        }
      }
      await removeNote({ noteId });
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const filtered = notes?.filter((note) => {
    if (!search) return true;
    const displayTitle = titleOverrides?.[note._id] ?? note.title;
    return displayTitle.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-brand-text/8 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif italic font-bold text-lg tracking-tight">
            Notes
          </h2>
          <button
            onClick={() => void handleCreate()}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-text text-brand-bg transition-all hover:scale-105 active:scale-95"
            title="New note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-text/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="h-9 w-full rounded-xl border-2 border-brand-text/10 bg-transparent pl-9 pr-3 font-mono text-xs text-brand-text placeholder:text-brand-text/30 transition-colors focus:border-brand-text/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {notes === undefined ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
            <span className="font-mono text-xs text-brand-text/40">
              Loading...
            </span>
          </div>
        ) : filtered && filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
            <FileText className="h-8 w-8 text-brand-text/15" />
            <div>
              <p className="font-medium text-sm text-brand-text/50">
                {search ? "No matching notes" : "No notes yet"}
              </p>
              <p className="font-mono text-xs text-brand-text/30 mt-1">
                {search
                  ? "Try a different search term"
                  : "Create your first note to get started"}
              </p>
            </div>
          </div>
        ) : (
          filtered?.map((note) => {
            const displayTitle = titleOverrides?.[note._id] ?? note.title;
            const isActive = activeNoteId === note._id;

            return (
              <div
                key={note._id}
                className="relative group"
              >
                <button
                  onClick={() => onSelectNote(note._id)}
                  className={cn(
                    "w-full text-left px-3.5 py-3 rounded-xl transition-all",
                    isActive
                      ? "bg-brand-text/10 shadow-sm"
                      : "hover:bg-brand-text/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          isActive
                            ? "text-brand-text"
                            : "text-brand-text/80",
                        )}
                      >
                        {displayTitle || "Untitled"}
                      </p>
                      <p className="font-mono text-[10px] text-brand-text/35 mt-1 uppercase tracking-wider">
                        {format(
                          new Date(note.updatedAt),
                          "MMM d, yyyy",
                        )}
                      </p>
                    </div>

                    {/* Context menu trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(
                          menuOpenId === note._id ? null : note._id,
                        );
                      }}
                      className={cn(
                        "flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg transition-all",
                        menuOpenId === note._id
                          ? "bg-brand-text/10 text-brand-text/60"
                          : "opacity-0 group-hover:opacity-100 text-brand-text/30 hover:text-brand-text/60 hover:bg-brand-text/8",
                      )}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>

                {/* Context menu */}
                {menuOpenId === note._id && (
                  <>
                    {/* Click-outside overlay */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpenId(null)}
                    />
                    <div className="absolute right-2 top-full z-50 mt-1 min-w-[140px] bg-brand-bg border border-brand-text/12 rounded-xl shadow-xl overflow-hidden py-1">
                      <button
                        onClick={(e) => void handleDelete(note._id, e)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-brand-accent hover:bg-brand-accent/8 transition-colors text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
