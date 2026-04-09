import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, PencilLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ExcalidrawCanvas } from "../components/drawing/ExcalidrawCanvas";
import { Layout } from "../components/layout/Layout";
import { cn } from "../lib/utils";

function DrawEditor({
  drawing,
  onUpdate,
}: {
  drawing: Doc<"drawings">;
  onUpdate: ReturnType<typeof useMutation<typeof api.drawings.update>>;
}) {
  const [title, setTitle] = useState(() => drawing.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    return () => {
      if (titleSaveTimerRef.current) {
        clearTimeout(titleSaveTimerRef.current);
      }
    };
  }, []);

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle);

      if (titleSaveTimerRef.current) {
        clearTimeout(titleSaveTimerRef.current);
      }

      titleSaveTimerRef.current = setTimeout(() => {
        void onUpdate({
          drawingId: drawing._id,
          title: nextTitle || "Untitled",
        });
      }, 600);
    },
    [drawing._id, onUpdate],
  );

  const hasBeenEdited = drawing.updatedAt > drawing.createdAt;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-brand-bg">
      <div className="flex-shrink-0 px-6 pt-8 pb-4 sm:px-10 md:px-16 lg:px-24">
        <textarea
          ref={titleRef}
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="Untitled"
          rows={1}
          className={cn(
            "w-full resize-none overflow-hidden border-none bg-transparent p-0 font-serif text-3xl font-bold italic tracking-tight text-brand-text sm:text-4xl",
            "placeholder:text-brand-text/25 focus:outline-none",
          )}
        />
        <div className="mt-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-brand-text/35">
          <span>Created {format(new Date(drawing.createdAt), "MMM d, yyyy")}</span>
          {hasBeenEdited ? (
            <>
              <span className="text-brand-text/15">|</span>
              <span>
                Edited{" "}
                {format(new Date(drawing.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mx-6 h-px flex-shrink-0 bg-brand-text/8 sm:mx-10 md:mx-16 lg:mx-24" />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 md:px-12 lg:px-20">
        <ExcalidrawCanvas
          documentKey={`drawing-${drawing._id}`}
          drawingDocument={drawing.drawingDocument}
          onSave={(drawingDocument) => {
            void onUpdate({
              drawingId: drawing._id,
              drawingDocument,
            });
          }}
          heightClassName="h-[72rem] sm:h-[84rem]"
        />
      </div>
    </div>
  );
}

export function DrawPage() {
  const { drawingId } = useParams<{ drawingId?: string }>();
  const navigate = useNavigate();
  const drawings = useQuery(api.drawings.list);
  const createDrawing = useMutation(api.drawings.create);
  const updateDrawing = useMutation(api.drawings.update);

  const activeDrawId = (drawingId as Id<"drawings"> | undefined) ?? null;
  const activeDrawing = useQuery(
    api.drawings.get,
    activeDrawId ? { drawingId: activeDrawId } : "skip",
  );

  useEffect(() => {
    if (activeDrawId || drawings === undefined || drawings.length === 0) {
      return;
    }

    navigate(`/draw/${drawings[0]._id}`, { replace: true });
  }, [activeDrawId, drawings, navigate]);

  const handleCreateDrawing = useCallback(async () => {
    try {
      const createdDrawingId = await createDrawing({ title: "Untitled" });
      navigate(`/draw/${createdDrawingId}`, { replace: true });
    } catch {
      toast.error("Failed to create drawing");
    }
  }, [createDrawing, navigate]);

  const openLatestDrawing = useCallback(() => {
    if (!drawings || drawings.length === 0) {
      return;
    }

    navigate(`/draw/${drawings[0]._id}`, { replace: true });
  }, [drawings, navigate]);

  const renderEmptyState = (
    titleText: string,
    description: string,
    action: ReactNode,
  ) => (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-text/5">
          <PencilLine className="h-8 w-8 text-brand-text/20" />
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold italic text-brand-text/70">
            {titleText}
          </h3>
          <p className="mt-2 font-mono text-xs leading-relaxed text-brand-text/35">
            {description}
          </p>
        </div>
        {action}
      </div>
    </div>
  );

  let content: ReactNode;

  if (!activeDrawId) {
    if (drawings === undefined) {
      content = (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
            <span className="font-mono text-xs text-brand-text/40">
              Loading drawings...
            </span>
          </div>
        </div>
      );
    } else if (drawings.length === 0) {
      content = renderEmptyState(
        "No drawings yet",
        "Create your first drawing and the canvas will open here.",
        <button
          onClick={() => void handleCreateDrawing()}
          className="btn-magnetic inline-flex items-center gap-2 rounded-2xl bg-brand-text px-5 py-2.5 font-sans text-sm font-bold text-brand-bg transition-colors hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Drawing
        </button>,
      );
    } else {
      content = (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
            <span className="font-mono text-xs text-brand-text/40">
              Opening latest drawing...
            </span>
          </div>
        </div>
      );
    }
  } else if (activeDrawing === undefined) {
    content = (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-6 w-6 rounded bg-brand-accent animate-pulse" />
          <span className="font-mono text-xs text-brand-text/40">
            Loading drawing...
          </span>
        </div>
      </div>
    );
  } else if (activeDrawing) {
    content = (
      <DrawEditor
        key={activeDrawing._id}
        drawing={activeDrawing}
        onUpdate={updateDrawing}
      />
    );
  } else {
    content = renderEmptyState(
      "Drawing not found",
      "This drawing doesn't exist anymore or you don't have access to it.",
      <div className="flex flex-wrap items-center justify-center gap-2">
        {drawings && drawings.length > 0 ? (
          <button
            onClick={openLatestDrawing}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-text px-5 py-2.5 font-sans text-sm font-bold text-brand-bg transition-colors hover:bg-brand-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Open Latest Drawing
          </button>
        ) : null}
        <button
          onClick={() => void handleCreateDrawing()}
          className="inline-flex items-center gap-2 rounded-2xl border border-brand-text/12 px-5 py-2.5 font-sans text-sm font-bold text-brand-text transition-colors hover:border-brand-text/24 hover:bg-brand-text/4"
        >
          <Plus className="h-4 w-4" />
          New Drawing
        </button>
      </div>,
    );
  }

  return <Layout activeDrawId={activeDrawId ?? undefined}>{content}</Layout>;
}
