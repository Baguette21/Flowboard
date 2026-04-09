import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { BoardMemberSummary } from "../../lib/types";
import { CardNoteCanvas } from "./CardNoteCanvas";
import { CardSectionErrorBoundary } from "./CardSectionErrorBoundary";
import { CardImageGallery } from "./CardImageGallery";
import { LabelPicker } from "../label/LabelPicker";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  CheckCircle2,
  Circle,
  Trash2,
  Flag,
  Tag,
  Calendar,
  Loader2,
  Users,
  X,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#E63B2E" },
  { value: "high",   label: "High",   color: "#F97316" },
  { value: "medium", label: "Medium", color: "#CA8A04" },
  { value: "low",    label: "Low",    color: "#3B82F6" },
] as const;

type CardPriority = Doc<"cards">["priority"];

interface CardDetailProps {
  cardId: Id<"cards">;
  boardId: Id<"boards">;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
  members: BoardMemberSummary[];
  canManageAssignees: boolean;
  onClose: () => void;
}

export function CardDetail({
  cardId,
  boardId,
  columns,
  labels,
  members,
  canManageAssignees,
  onClose,
}: CardDetailProps) {
  const card          = useQuery(api.cards.get, { cardId });
  const updateCard    = useMutation(api.cards.update);
  const toggleComplete = useMutation(api.cards.toggleComplete);
  const deleteCard    = useMutation(api.cards.remove);
  const moveCard      = useMutation(api.cards.move);

  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [titleValue,      setTitleValue]      = useState("");
  const [isEditingTitle,  setIsEditingTitle]  = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [titleValue]);

  // Auto-enter edit mode for freshly-created cards
  useEffect(() => {
    if (card && card.title === "New task") {
      setTitleValue(card.title);
      setIsEditingTitle(true);
    }
  }, [card?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (card === null) {
      onClose();
    }
  }, [card, onClose]);

  /* ── Handlers ── */
  const handleToggleComplete = async () => {
    await toggleComplete({ cardId });
    toast.success(card?.isComplete ? "Task reopened" : "Task completed!");
  };

  const handleSaveTitle = async () => {
    const trimmed = titleValue.trim();
    setIsEditingTitle(false);
    if (!trimmed || trimmed === card?.title) return;
    await updateCard({ cardId, title: trimmed });
  };

  const handlePriority = async (priority: CardPriority) => {
    await updateCard({ cardId, priority });
  };

  const handleLabelsChange = async (newLabelIds: Id<"labels">[]) => {
    await updateCard({ cardId, labelIds: newLabelIds });
  };

  const handleAssigneeChange = async (value: string) => {
    const nextId = value === "" ? null : (value as Id<"users">);
    await updateCard({ cardId, assignedUserId: nextId });
    toast.success(nextId ? "Assigned" : "Assignee cleared");
  };

  const handleGroupChange = async (newColumnId: string) => {
    if (!card || newColumnId === card.columnId) return;
    const target = columns.find((c) => c._id === newColumnId);
    if (!target) return;
    // Place at the very end of the target column
    const newOrder = `z${Date.now()}`;
    await moveCard({
      cardId,
      targetColumnId: newColumnId as Id<"columns">,
      newOrder,
    });
    toast.success(`Moved to ${target.title}`);
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    await updateCard({ cardId, dueDate: val ? new Date(val).getTime() : undefined });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCard({ cardId });
      toast.success("Task deleted");
      onClose();
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  /* ── Shell (always rendered so animation plays) ── */
  const shell = (content: React.ReactNode) => (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="task-panel-backdrop absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="task-panel-slide absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden border-l border-brand-text/10 bg-brand-bg shadow-2xl sm:w-[50vw] sm:max-w-none">
        {content}
      </div>
    </div>
  );

  /* Loading */
  if (card === undefined) {
    return shell(
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-text/30" />
      </div>,
    );
  }

  if (!card) {
    return null;
  }

  const currentColumn   = columns.find((c) => c._id === card.columnId);
  const cardLabels      = labels.filter((l) => card.labelIds.includes(l._id));
  const currentAssignee = members.find((m) => m.userId === card.assignedUserId) ?? null;
  const isOverdue       = card.dueDate && card.dueDate < Date.now() && !card.isComplete;
  const dueDateFormatted = card.dueDate
    ? new Date(card.dueDate).toISOString().split("T")[0]
    : "";

  return shell(
    <>
      {/* ── Top bar ── */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-brand-text/10 px-5 py-3">
        <button
          onClick={() => void handleToggleComplete()}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-colors",
            card.isComplete
              ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
              : "text-brand-text/40 hover:bg-brand-text/8 hover:text-brand-text",
          )}
        >
          {card.isComplete
            ? <CheckCircle2 className="h-4 w-4" />
            : <Circle className="h-4 w-4" />}
          {card.isComplete ? "Completed" : "Mark complete"}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-2 text-brand-text/30 transition-colors hover:bg-brand-accent/10 hover:text-brand-accent"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-brand-text/30 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Title */}
        <div className="px-8 pt-7 pb-3">
          {isEditingTitle ? (
            <textarea
              ref={titleRef}
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => void handleSaveTitle()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSaveTitle(); }
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              rows={1}
              placeholder="Task name"
              className="w-full resize-none overflow-hidden bg-transparent text-[1.6rem] font-bold leading-tight text-brand-text focus:outline-none placeholder:text-brand-text/25"
            />
          ) : (
            <h1
              onClick={() => { setTitleValue(card.title); setIsEditingTitle(true); }}
              className={cn(
                "cursor-text text-[1.6rem] font-bold leading-tight transition-colors hover:opacity-80",
                card.isComplete ? "line-through text-brand-text/40" : "text-brand-text",
              )}
            >
              {card.title}
            </h1>
          )}

          {cardLabels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cardLabels.map((label) => (
                <span
                  key={label._id}
                  className="rounded-md px-2.5 py-0.5 text-[11px] font-medium text-white/90"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Properties ── */}
        <div className="border-b border-brand-text/8 px-8 pb-6 pt-1">
          <div className="grid grid-cols-3 gap-x-4 gap-y-5">

            {/* Assignee */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-brand-text/40">
                <Users className="h-3 w-3" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Assignee</span>
              </div>
              {canManageAssignees ? (
                <select
                  value={card.assignedUserId ?? ""}
                  onChange={(e) => void handleAssigneeChange(e.target.value)}
                  className="w-full rounded-md border border-brand-text/12 bg-brand-primary/60 px-2.5 py-1.5 text-sm text-brand-text focus:outline-none cursor-pointer"
                >
                  <option value="">Empty</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name ?? m.email ?? "Unknown"}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-brand-text/70">
                  {currentAssignee?.name ?? currentAssignee?.email ?? <span className="text-brand-text/30">Empty</span>}
                </p>
              )}
            </div>

            {/* Group */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-brand-text/40">
                <Layers3 className="h-3 w-3" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Group</span>
              </div>
              <select
                value={card.columnId}
                onChange={(e) => void handleGroupChange(e.target.value)}
                className="w-full rounded-md border border-brand-text/12 bg-brand-primary/60 px-2.5 py-1.5 text-sm focus:outline-none cursor-pointer"
                style={currentColumn?.color ? { borderColor: `${currentColumn.color}55`, color: currentColumn.color } : { color: "inherit" }}
              >
                {columns.map((col) => (
                  <option key={col._id} value={col._id}>{col.title}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-brand-text/40">
                <Calendar className="h-3 w-3" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Due date</span>
              </div>
              <input
                type="date"
                value={dueDateFormatted}
                onChange={handleDueDateChange}
                className={cn(
                  "w-full rounded-md border border-brand-text/12 bg-brand-primary/60 px-2.5 py-1.5 font-mono text-xs text-brand-text focus:outline-none cursor-pointer",
                  isOverdue && "border-brand-accent/40 text-brand-accent",
                )}
              />
              {card.dueDate && (
                <p className={cn("mt-1 font-mono text-[10px]", isOverdue ? "text-brand-accent" : "text-brand-text/35")}>
                  {isOverdue ? "Overdue" : format(card.dueDate, "EEE, MMM d")}
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-brand-text/40">
                <Flag className="h-3 w-3" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Priority</span>
              </div>
              <select
                value={card.priority ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  void handlePriority(val === "" ? undefined : (val as typeof card.priority));
                }}
                className="w-full rounded-md border border-brand-text/12 bg-brand-primary/60 px-2.5 py-1.5 text-sm text-brand-text focus:outline-none cursor-pointer"
              >
                <option value="">None</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Labels */}
            <div className="col-span-2">
              <div className="mb-2 flex items-center gap-1.5 text-brand-text/40">
                <Tag className="h-3 w-3" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Labels</span>
              </div>
              <LabelPicker boardId={boardId} selectedIds={card.labelIds} onChange={handleLabelsChange} />
            </div>
          </div>
        </div>

        {/* ── Notes canvas ── */}
        <div className="border-b border-brand-text/8 px-8 py-6">
          <CardSectionErrorBoundary
            fallback={
              <div className="rounded-[14px] border border-brand-text/8 bg-brand-primary/10 px-5 py-5">
                <p className="font-mono text-xs text-brand-text/35">
                  The task note could not load right now.
                </p>
              </div>
            }
          >
            <CardNoteCanvas
              key={card._id}
              cardId={cardId}
              content={card.noteContent ?? card.description}
              drawingDocument={card.drawingDocument}
            />
          </CardSectionErrorBoundary>
        </div>

        <div className="border-b border-brand-text/8 px-8 py-6">
          <div className="mb-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/40">
              Gallery
            </p>
          </div>
          <CardSectionErrorBoundary
            fallback={
              <div className="py-3">
                <p className="font-mono text-xs text-brand-text/35">
                  Images could not load right now.
                </p>
              </div>
            }
          >
            <CardImageGallery
              cardId={cardId}
              skipInitialLoad={card.title === "New task"}
              embedded
            />
          </CardSectionErrorBoundary>
        </div>

        {/* Meta */}
        <div className="px-8 py-4 font-mono text-[11px] text-brand-text/25">
          Created {format(card.createdAt, "MMM d, yyyy")}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Delete task"
        description={`"${card.title}" will be permanently deleted.`}
        confirmLabel="Delete Task"
        isDestructive
        isLoading={isDeleting}
      />
    </>,
  );
}
