import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Eye, EyeOff, PencilLine, RotateCcw, RotateCw } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";

import "@excalidraw/excalidraw/index.css";
import "./excalidrawCanvas.css";

interface ExcalidrawCanvasProps {
  documentKey: string;
  drawingDocument?: string;
  onSave: (drawingDocument: string) => Promise<void> | void;
  heightClassName?: string;
  compact?: boolean;
  readOnly?: boolean;
  lockedMessage?: string;
}

const PROPERTIES_VISIBILITY_STORAGE_KEY =
  "planthing.excalidraw.propertiesVisible";

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
      gridModeEnabled: appState.gridModeEnabled,
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
  readOnly = false,
  lockedMessage = "Upgrade to Pro to use draw.",
}: ExcalidrawCanvasProps) {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [propertiesVisible, setPropertiesVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return (
      window.localStorage.getItem(PROPERTIES_VISIBILITY_STORAGE_KEY) !== "false"
    );
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSavedDocumentRef = useRef(drawingDocument ?? "");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const initialData = useMemo(
    () => parseDrawingDocument(drawingDocument),
    [drawingDocument],
  );

  useEffect(() => {
    latestSavedDocumentRef.current = drawingDocument ?? "";
  }, [drawingDocument]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PROPERTIES_VISIBILITY_STORAGE_KEY,
      propertiesVisible ? "true" : "false",
    );
  }, [propertiesVisible]);

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
      if (readOnly) {
        return;
      }

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
    [onSave, readOnly],
  );

  const frameClassName = compact
    ? "overflow-hidden rounded-[18px] border border-brand-text/10 bg-brand-bg/82"
    : "overflow-hidden rounded-[20px] border border-brand-text/10 bg-brand-bg/82 shadow-[0_18px_45px_rgba(17,17,17,0.04)]";

  const triggerHistoryShortcut = useCallback((mode: "undo" | "redo") => {
    const container = hostRef.current?.querySelector(
      ".excalidraw",
    ) as HTMLDivElement | null;

    if (!container) {
      return;
    }

    container.focus();

    const isMac =
      typeof navigator !== "undefined" &&
      /(Mac|iPhone|iPad|iPod)/i.test(navigator.platform);

    const eventInit: KeyboardEventInit = {
      key: "z",
      code: "KeyZ",
      bubbles: true,
      cancelable: true,
      ctrlKey: !isMac,
      metaKey: isMac,
      shiftKey: mode === "redo",
    };

    container.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    container.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  }, []);

  return (
    <section className="space-y-3" ref={hostRef}>
      <div className="flex items-center gap-2 px-1 text-brand-text/42">
        <PencilLine className="h-3.5 w-3.5" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
          Draw
        </span>
      </div>
      <div className={frameClassName}>
        <div
          className={`relative ${heightClassName} ${
            propertiesVisible ? "" : "planthing-excalidraw--properties-hidden"
          }`}
        >
          <div className={cn("planthing-excalidraw-controls", readOnly && "hidden")}>
            <button
              type="button"
              onClick={() => triggerHistoryShortcut("undo")}
              className="planthing-excalidraw-control"
              aria-label="Undo"
              title="Undo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => triggerHistoryShortcut("redo")}
              className="planthing-excalidraw-control"
              aria-label="Redo"
              title="Redo"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPropertiesVisible((current) => !current)}
              className="planthing-excalidraw-control"
              data-active={propertiesVisible ? "true" : "false"}
              aria-label={propertiesVisible ? "Hide properties" : "Show properties"}
              title={propertiesVisible ? "Hide properties" : "Show properties"}
            >
              {propertiesVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          </div>
          <Excalidraw
            key={documentKey}
            initialData={initialData}
            gridModeEnabled={true}
            onChange={(elements, appState, files) => {
              setIsReady(true);
              queueSave(elements, appState, files);
            }}
            theme={theme === "dark" ? "dark" : "light"}
            autoFocus={false}
            viewModeEnabled={readOnly}
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
          {readOnly ? (
            <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-brand-bg/72 backdrop-blur-[1px]">
              <div className="mx-4 max-w-sm rounded-xl border border-brand-text/10 bg-brand-bg px-5 py-4 text-center shadow-lg">
                <PencilLine className="mx-auto h-6 w-6 text-brand-text/25" />
                <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-brand-text/45">
                  Pro feature
                </p>
                <p className="mt-2 text-sm leading-relaxed text-brand-text/55">
                  {lockedMessage}
                </p>
              </div>
            </div>
          ) : null}
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
