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
  Plus,
  X,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { useProfileImageUrls } from "../../hooks/useProfileImageUrls";
import { UserAvatar } from "../ui/UserAvatar";
import { getAssignedUserIds } from "../../lib/assignees";

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#E63B2E" },
  { value: "high",   label: "High",   color: "#F97316" },
  { value: "medium", label: "Medium", color: "#CA8A04" },
  { value: "low",    label: "Low",    color: "#3B82F6" },
] as const;

type CardPriority = Doc<"cards">["priority"] | null;

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
  const moveCardToColumnEnd = useMutation(api.cards.moveToColumnEnd);

  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [titleValue,      setTitleValue]      = useState("");
  const [isEditingTitle,  setIsEditingTitle]  = useState(false);
  const [localAssignedUserIds, setLocalAssignedUserIds] = useState<Id<"users">[]>([]);
  const [localLabelIds, setLocalLabelIds] = useState<Id<"labels">[]>([]);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [isAssigneeCommitPending, setIsAssigneeCommitPending] = useState(false);
  const [isLabelCommitPending, setIsLabelCommitPending] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const localAssignedUserIdsRef = useRef<Id<"users">[]>([]);
  const localLabelIdsRef = useRef<Id<"labels">[]>([]);
  const memberImageUrls = useProfileImageUrls(
    members.map((member) => member.imageKey),
  );

  useEffect(() => {
    localAssignedUserIdsRef.current = localAssignedUserIds;
  }, [localAssignedUserIds]);

  useEffect(() => {
    localLabelIdsRef.current = localLabelIds;
  }, [localLabelIds]);

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

  useEffect(() => {
    if (!card) {
      return;
    }

    const nextAssignedUserIds = getAssignedUserIds(card);
    if (isAssigneeCommitPending) {
      const localSet = new Set(localAssignedUserIdsRef.current);
      const serverMatchesLocal =
        nextAssignedUserIds.length === localSet.size &&
        nextAssignedUserIds.every((id) => localSet.has(id));
      if (!serverMatchesLocal) {
        return;
      }
      setIsAssigneeCommitPending(false);
    }

    setLocalAssignedUserIds(nextAssignedUserIds);
  }, [card, isAssigneeCommitPending]);

  useEffect(() => {
    if (!card) {
      return;
    }

    if (isLabelCommitPending) {
      const localSet = new Set(localLabelIdsRef.current);
      const serverMatchesLocal =
        card.labelIds.length === localSet.size &&
        card.labelIds.every((id) => localSet.has(id));
      if (!serverMatchesLocal) {
        return;
      }
      setIsLabelCommitPending(false);
    }

    setLocalLabelIds(card.labelIds);
  }, [card, isLabelCommitPending]);

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
    const previousLabelIds = localLabelIdsRef.current;
    setLocalLabelIds(newLabelIds);
    setIsLabelCommitPending(true);
    try {
      await updateCard({ cardId, labelIds: newLabelIds });
    } catch (error) {
      setLocalLabelIds(previousLabelIds);
      setIsLabelCommitPending(false);
      const message = error instanceof Error ? error.message : "Failed to update labels";
      toast.error(message);
    }
  };

  const handleAssigneeToggle = async (value: Id<"users">) => {
    if (!card) return;

    const currentIds = localAssignedUserIds;
    const nextIds = currentIds.includes(value)
      ? currentIds.filter((id) => id !== value)
      : [...currentIds, value];

    setLocalAssignedUserIds(nextIds);
    setIsAssigneeCommitPending(true);
    try {
      await updateCard({
        cardId,
        assignedUserIds: nextIds,
        assignedUserId: nextIds[0] ?? null,
      });
      toast.success(nextIds.includes(value) ? "Assignee added" : "Assignee removed");
    } catch (error) {
      setLocalAssignedUserIds(currentIds);
      setIsAssigneeCommitPending(false);
      const message = error instanceof Error ? error.message : "Failed to update assignees";
      toast.error(message);
    }
  };

  const handleAssigneesClear = async () => {
    const previousIds = localAssignedUserIdsRef.current;
    setLocalAssignedUserIds([]);
    setIsAssigneeCommitPending(true);
    try {
      await updateCard({ cardId, assignedUserIds: [], assignedUserId: null });
      toast.success("Assignees cleared");
    } catch (error) {
      setLocalAssignedUserIds(previousIds);
      setIsAssigneeCommitPending(false);
      const message = error instanceof Error ? error.message : "Failed to clear assignees";
      toast.error(message);
    }
  };

  const getShortMemberName = (member: BoardMemberSummary) => {
    const displayName = member.name ?? member.email?.split("@")[0] ?? "Unknown";
    return displayName.trim().split(/\s+/)[0] || "Unknown";
  };

  const handleGroupChange = async (newColumnId: string) => {
    if (!card || newColumnId === card.columnId) return;
    const target = columns.find((c) => c._id === newColumnId);
    if (!target) return;
    await moveCardToColumnEnd({
      cardId,
      targetColumnId: newColumnId as Id<"columns">,
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
        className="task-panel-backdrop absolute inset-0 bg-brand-dark/45 backdrop-blur-sm"
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
  const cardLabels      = labels.filter((l) => localLabelIds.includes(l._id));
  const assignedUserIds = localAssignedUserIds;
  const currentAssignees = assignedUserIds
    .map((userId) => members.find((m) => m.userId === userId))
    .filter((member): member is BoardMemberSummary => Boolean(member));
  const isOverdue       = card.dueDate && card.dueDate < Date.now() && !card.isComplete;
  const dueDateFormatted = card.dueDate
    ? format(card.dueDate, "yyyy-MM-dd'T'HH:mm")
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
                <div className="relative">
                  <div className="flex min-h-9 items-center gap-2 rounded-md border border-brand-text/12 bg-brand-primary/60 px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-brand-text/70">
                      {currentAssignees.length > 0
                        ? currentAssignees.map(getShortMemberName).join(", ")
                        : "Empty"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssigneePickerOpen((current) => !current)}
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-brand-text/12 text-brand-text/45 transition-colors hover:border-brand-text/30 hover:text-brand-text"
                      title="Add assignee"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {assigneePickerOpen && (
                    <div className="absolute left-0 top-11 z-30 w-64 overflow-hidden rounded-lg border border-brand-text/12 bg-brand-bg py-1 shadow-xl">
                      <button
                        type="button"
                        onClick={() => void handleAssigneesClear()}
                        className="w-full px-3 py-1.5 text-left text-xs text-brand-text/45 transition-colors hover:bg-brand-primary"
                      >
                        Clear assignees
                      </button>
                      <div className="my-1 h-px bg-brand-text/8" />
                      {members.map((member) => {
                        const isSelected = assignedUserIds.includes(member.userId);
                        const imageUrl = member.imageKey
                          ? memberImageUrls[member.imageKey] ?? null
                          : null;
                        return (
                          <button
                            key={member.userId}
                            type="button"
                            onClick={() => void handleAssigneeToggle(member.userId)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-brand-text/70 transition-colors hover:bg-brand-primary"
                          >
                            <UserAvatar
                              name={member.name}
                              email={member.email}
                              imageUrl={imageUrl}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {getShortMemberName(member)}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-brand-accent" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : currentAssignees.length > 0 ? (
                <p className="truncate text-sm text-brand-text/70">
                  {currentAssignees.map(getShortMemberName).join(", ")}
                </p>
              ) : (
                <p className="text-sm text-brand-text/30">Empty</p>
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
                type="datetime-local"
                value={dueDateFormatted}
                onChange={handleDueDateChange}
                className={cn(
                  "w-full rounded-md border border-brand-text/12 bg-brand-primary/60 px-2.5 py-1.5 font-mono text-xs text-brand-text focus:outline-none cursor-pointer",
                  isOverdue && "border-brand-accent/40 text-brand-accent",
                )}
              />
              {card.dueDate && (
                <p className={cn("mt-1 font-mono text-[10px]", isOverdue ? "text-brand-accent" : "text-brand-text/35")}>
                  {isOverdue ? "Overdue" : format(card.dueDate, "EEE, MMM d 'at' h:mm a")}
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
                  void handlePriority(val === "" ? null : (val as typeof card.priority));
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
              <LabelPicker boardId={boardId} selectedIds={localLabelIds} onChange={handleLabelsChange} />
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
