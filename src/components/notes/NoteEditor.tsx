import { useCallback, useEffect, useRef, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { useTheme } from "../../hooks/useTheme";
import { fileToBase64, parseBlockNoteContent } from "../../lib/blocknote";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./noteEditorTheme.css";

interface NoteEditorProps {
  note: Doc<"notes">;
  onTitleChange?: (title: string) => void;
}

export function NoteEditor({ note, onTitleChange }: NoteEditorProps) {
  const { theme } = useTheme();
  const updateNote = useMutation(api.notes.update);
  const [title, setTitle] = useState(() => note.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const hasBeenEdited = note.updatedAt > note.createdAt;

  const editor = useCreateBlockNote({
    initialContent: parseBlockNoteContent(note.content),
    uploadFile: async (file: File) => {
      const dataUrl = await fileToBase64(file);
      return dataUrl;
    },
    domAttributes: {
      editor: {
        class: "flowboard-note-editor",
      },
    },
  });

  // Auto-resize the title textarea
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  // Debounced title save
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      onTitleChange?.(newTitle);

      if (titleSaveTimerRef.current) {
        clearTimeout(titleSaveTimerRef.current);
      }

      titleSaveTimerRef.current = setTimeout(() => {
        void updateNote({
          noteId: note._id,
          title: newTitle || "Untitled",
        });
      }, 600);
    },
    [note._id, updateNote, onTitleChange],
  );

  // Debounced content save
  const handleEditorChange = useCallback(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const blocks: Block[] = editor.document;
      const content = JSON.stringify(blocks);
      void updateNote({
        noteId: note._id,
        content,
      });
    }, 800);
  }, [editor, note._id, updateNote]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
    };
  }, []);

  // Handle Enter in title -> move focus to editor
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editor.focus();
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Note header: title + metadata */}
      <div className="flex-shrink-0 px-6 pt-8 pb-4 sm:px-10 md:px-16 lg:px-24">
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent font-serif italic font-bold text-3xl sm:text-4xl tracking-tight text-brand-text",
            "placeholder:text-brand-text/25 focus:outline-none border-none p-0",
            "overflow-hidden",
          )}
        />
        <div className="mt-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-brand-text/35">
          <span>
            Created {format(new Date(note.createdAt), "MMM d, yyyy")}
          </span>
          {hasBeenEdited ? (
            <>
              <span className="text-brand-text/15">|</span>
              <span>
                Edited {format(new Date(note.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Separator */}
      <div className="mx-6 sm:mx-10 md:mx-16 lg:mx-24 h-px bg-brand-text/8 flex-shrink-0" />

      {/* Editor body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-6 md:px-12 lg:px-20 py-6">
        <BlockNoteView
          editor={editor}
          onChange={handleEditorChange}
          theme={theme === "dark" ? "dark" : "light"}
        />
      </div>
    </div>
  );
}
