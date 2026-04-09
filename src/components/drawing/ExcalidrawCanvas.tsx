import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { PencilLine } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

import "@excalidraw/excalidraw/index.css";

interface ExcalidrawCanvasProps {
  documentKey: string;
  drawingDocument?: string;
  onSave: (drawingDocument: string) => Promise<void> | void;
  heightClassName?: string;
  compact?: boolean;
}

type PersistedDrawingDocument = {
  appState?: ExcalidrawInitialDataState["appState"];
  elements?: ExcalidrawInitialDataState["elements"];
  files?: BinaryFiles;
};

function parseDrawingDocument(
  drawingDocument?: string,
): ExcalidrawInitialDataState | null {
  if (!drawingDocument?.trim()) {
    return null;
  }

  try {
    return JSON.parse(drawingDocument) as ExcalidrawInitialDataState;
  } catch {
    return null;
  }
}

function createPersistedDrawingDocument(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
) {
  const document: PersistedDrawingDocument = {
    elements,
    files,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      currentItemStrokeColor: appState.currentItemStrokeColor,
      currentItemBackgroundColor: appState.currentItemBackgroundColor,
      currentItemFillStyle: appState.currentItemFillStyle,
      currentItemStrokeWidth: appState.currentItemStrokeWidth,
      currentItemStrokeStyle: appState.currentItemStrokeStyle,
      currentItemRoughness: appState.currentItemRoughness,
      currentItemOpacity: appState.currentItemOpacity,
      currentItemFontFamily: appState.currentItemFontFamily,
      currentItemFontSize: appState.currentItemFontSize,
      currentItemTextAlign: appState.currentItemTextAlign,
      currentItemStartArrowhead: appState.currentItemStartArrowhead,
      currentItemEndArrowhead: appState.currentItemEndArrowhead,
      currentItemRoundness: appState.currentItemRoundness,
      currentItemArrowType: appState.currentItemArrowType,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
      gridSize: appState.gridSize,
    },
  };

  return JSON.stringify(document);
}

export function ExcalidrawCanvas({
  documentKey,
  drawingDocument,
  onSave,
  heightClassName = "h-[420px]",
  compact = false,
}: ExcalidrawCanvasProps) {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSavedDocumentRef = useRef(drawingDocument ?? "");
  const initialData = useMemo(
    () => parseDrawingDocument(drawingDocument),
    [drawingDocument],
  );

  useEffect(() => {
    latestSavedDocumentRef.current = drawingDocument ?? "";
  }, [drawingDocument]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const queueSave = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      const nextDrawingDocument = createPersistedDrawingDocument(
        elements,
        appState,
        files,
      );

      if (nextDrawingDocument === latestSavedDocumentRef.current) {
        return;
      }

      latestSavedDocumentRef.current = nextDrawingDocument;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void onSave(nextDrawingDocument);
      }, 900);
    },
    [onSave],
  );

  const frameClassName = compact
    ? "overflow-hidden rounded-[18px] border border-brand-text/10 bg-brand-bg/82"
    : "overflow-hidden rounded-[20px] border border-brand-text/10 bg-brand-bg/82 shadow-[0_18px_45px_rgba(17,17,17,0.04)]";

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1 text-brand-text/42">
        <PencilLine className="h-3.5 w-3.5" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
          Draw
        </span>
      </div>
      <div className={frameClassName}>
        <div className={`relative ${heightClassName}`}>
          <Excalidraw
            key={documentKey}
            initialData={initialData}
            onChange={(elements, appState, files) => {
              setIsReady(true);
              queueSave(elements, appState, files);
            }}
            theme={theme === "dark" ? "dark" : "light"}
            autoFocus={false}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                saveAsImage: true,
              },
              tools: {
                image: !compact,
              },
            }}
          />
        </div>
      </div>
      {!isReady ? (
        <p className="px-1 font-mono text-[11px] text-brand-text/26">
          Loading sketchpad...
        </p>
      ) : null}
    </section>
  );
}
