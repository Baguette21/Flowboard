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
import { WorkspaceItemMenu } from "../components/layout/WorkspaceItemMenu";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { cn } from "../lib/utils";
import { useBoardTabs } from "../hooks/useBoardTabs";

function DrawEditor({
  drawing,
  onUpdate,
  actions,
  readOnly = false,
}: {
  drawing: Doc<"drawings">;
  onUpdate: ReturnType<typeof useMutation<typeof api.drawings.update>>;
  actions?: ReactNode;
  readOnly?: boolean;
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
        <div className="flex items-start gap-3">
          <textarea
            ref={titleRef}
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="Untitled"
            rows={1}
            className={cn(
              "min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent p-0 font-serif text-3xl font-bold italic tracking-tight text-brand-text sm:text-4xl",
              "placeholder:text-brand-text/25 focus:outline-none",
            )}
          />
          {actions}
        </div>
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
          readOnly={readOnly}
          lockedMessage="Drawing pages are available to Pro users only."
        />
      </div>
    </div>
  );
}

export function DrawPage() {
  const { drawingId } = useParams<{ drawingId?: string }>();
  const navigate = useNavigate();
  const drawings = useQuery(api.drawings.list);
  const me = useQuery(api.users.me);
  const createDrawing = useMutation(api.drawings.create);
  const updateDrawing = useMutation(api.drawings.update);
  const deleteDrawing = useMutation(api.drawings.remove);
  const { ensureInActiveTab, openInActiveTab } = useBoardTabs();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeDrawId = (drawingId as Id<"drawings"> | undefined) ?? null;
  const activeDrawing = useQuery(
    api.drawings.get,
    activeDrawId ? { drawingId: activeDrawId } : "skip",
  );

  useEffect(() => {
    if (activeDrawId || drawings === undefined || drawings.length === 0) {
      return;
    }

    openInActiveTab({ kind: "draw", id: drawings[0]._id });
  }, [activeDrawId, drawings, openInActiveTab]);

  useEffect(() => {
    if (!activeDrawId) {
      return;
    }

    ensureInActiveTab({ kind: "draw", id: activeDrawId });
  }, [activeDrawId, ensureInActiveTab]);

  const handleCreateDrawing = useCallback(async () => {
    if (me?.role !== "PRO") {
      toast.error("Draw is available to Pro users only");
      return;
    }

    try {
      const createdDrawingId = await createDrawing({ title: "Untitled" });
      openInActiveTab({ kind: "draw", id: createdDrawingId });
    } catch {
      toast.error("Failed to create drawing");
    }
  }, [createDrawing, me?.role, openInActiveTab]);

  const openLatestDrawing = useCallback(() => {
    if (!drawings || drawings.length === 0) {
      return;
    }

    openInActiveTab({ kind: "draw", id: drawings[0]._id });
  }, [drawings, openInActiveTab]);

  const handleToggleFavorite = useCallback(async () => {
    if (!activeDrawing) return;
    try {
      await updateDrawing({
        drawingId: activeDrawing._id,
        isFavorite: !(activeDrawing.isFavorite ?? false),
      });
      toast.success(
        activeDrawing.isFavorite ? "Removed from favorites" : "Added to favorites",
      );
    } catch {
      toast.error("Failed to update favorite");
    }
  }, [activeDrawing, updateDrawing]);

  const handleCopyLink = useCallback(async () => {
    if (!activeDrawId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/draw/${activeDrawId}`);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [activeDrawId]);

  const handleArchive = useCallback(async () => {
    if (!activeDrawId) return;
    try {
      await updateDrawing({ drawingId: activeDrawId, archivedAt: Date.now() });
      toast.success("Drawing archived");
      navigate("/");
    } catch {
      toast.error("Failed to archive drawing");
    }
  }, [activeDrawId, navigate, updateDrawing]);

  const handleDelete = useCallback(async () => {
    if (!activeDrawId) return;
    setIsDeleting(true);
    try {
      await deleteDrawing({ drawingId: activeDrawId });
      toast.success("Drawing deleted");
      setConfirmDelete(false);
      navigate("/");
    } catch {
      toast.error("Failed to delete drawing");
    } finally {
      setIsDeleting(false);
    }
  }, [activeDrawId, deleteDrawing, navigate]);

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
  const isPro = me?.role === "PRO";

  if (me !== undefined && !isPro) {
    content = renderEmptyState(
      "Draw is a Pro feature",
      "Upgrade to Pro to create and edit drawings.",
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 rounded-2xl border border-brand-text/12 px-5 py-2.5 font-sans text-sm font-bold text-brand-text transition-colors hover:border-brand-text/24 hover:bg-brand-text/4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back Home
      </button>,
    );
  } else if (!activeDrawId) {
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
        readOnly={!isPro}
        actions={
          <WorkspaceItemMenu
            isFavorite={activeDrawing.isFavorite ?? false}
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

  return (
    <>
      <Layout activeDrawId={activeDrawId ?? undefined}>{content}</Layout>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Delete drawing"
        description={`This will permanently delete "${activeDrawing?.title || "Untitled"}". This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
