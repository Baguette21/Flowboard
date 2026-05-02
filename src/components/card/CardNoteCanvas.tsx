import { useCallback, useEffect, useMemo, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block, PartialBlock } from "@blocknote/core";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTheme } from "../../hooks/useTheme";
import { fileToBase64, parseBlockNoteContent } from "../../lib/blocknote";
import { ExcalidrawCanvas } from "../drawing/ExcalidrawCanvas";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "../notes/noteEditorTheme.css";

interface CardNoteCanvasProps {
  cardId: Id<"cards">;
  content?: string;
  contentHTML?: string;
  drawingDocument?: string;
}

export function CardNoteCanvas({
  cardId,
  content,
  contentHTML,
  drawingDocument,
}: CardNoteCanvasProps) {
  const { theme } = useTheme();
  const updateCard = useMutation(api.cards.update);
  const me = useQuery(api.users.me);
  const isPro = me?.role === "PRO";
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const latestSavedContentRef = useRef(content ?? "");

  const initialContent = useMemo<PartialBlock[] | undefined>(() => {
    return parseBlockNoteContent(content);
  }, [content]);

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: fileToBase64,
    domAttributes: {
      editor: {
        class: "planthing-note-editor planthing-note-editor--compact",
      },
    },
  });

  useEffect(() => {
    latestSavedContentRef.current = content ?? "";
    isInitialLoadRef.current = true;
  }, [cardId, content]);

  const htmlHydratedRef = useRef(false);
  useEffect(() => {
    htmlHydratedRef.current = false;
  }, [cardId]);
  useEffect(() => {
    if (htmlHydratedRef.current) return;
    if (!contentHTML) return;
    htmlHydratedRef.current = true;
    void (async () => {
      try {
        const blocks = await editor.tryParseHTMLToBlocks(contentHTML);
        if (blocks.length) editor.replaceBlocks(editor.document, blocks);
      } catch {
        // keep JSON-derived content
      }
    })();
  }, [editor, contentHTML]);

  const persistCurrentContent = useCallback(() => {
    const blocks: Block[] = editor.document;
    const nextContent = JSON.stringify(blocks);

    if (nextContent === latestSavedContentRef.current) {
      return;
    }

    latestSavedContentRef.current = nextContent;
    void (async () => {
      let html = "";
      try {
        html = await editor.blocksToFullHTML(blocks);
      } catch {
        html = "";
      }
      void updateCard({
        cardId,
        noteContent: nextContent,
        descriptionHTML: html,
      });
    })();
  }, [cardId, editor, updateCard]);

  const handleEditorChange = useCallback(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistCurrentContent();
    }, 700);
  }, [persistCurrentContent]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      persistCurrentContent();
    };
  }, [persistCurrentContent]);

  return (
    <div className="space-y-6">
      <div className="min-h-[clamp(34rem,72vh,52rem)]">
        <BlockNoteView
          editor={editor}
          onChange={handleEditorChange}
          theme={theme === "dark" ? "dark" : "light"}
        />
      </div>
      <ExcalidrawCanvas
        documentKey={`card-${cardId}`}
        drawingDocument={drawingDocument}
        onSave={(nextDrawingDocument) => {
          void updateCard({
            cardId,
            drawingDocument: nextDrawingDocument,
          });
        }}
        heightClassName="h-[340px]"
        compact
        readOnly={me !== undefined && !isPro}
        lockedMessage="Card drawing is available to Pro users only."
      />
    </div>
  );
}
