import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { BoardMemberSummary } from "../../lib/types";
import { Modal } from "../ui/Modal";
import { CardDescription } from "./CardDescription";
import { CardDueDate } from "./CardDueDate";
import { LabelPicker } from "../label/LabelPicker";
import { ActivityFeed } from "../activity/ActivityFeed";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  CheckSquare,
  Square,
  Trash2,
  Flag,
  AlignLeft,
  Tag,
  Calendar,
  Activity,
  Loader2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#E63B2E" },
  { value: "high", label: "High", color: "#F97316" },
  { value: "medium", label: "Medium", color: "#EAB308" },
  { value: "low", label: "Low", color: "#3B82F6" },
] as const;

interface CardDetailProps {
  cardId: Id<"cards">;
  boardId: Id<"boards">;
  labels: Doc<"labels">[];
  members: BoardMemberSummary[];
  canManageAssignees: boolean;
  onClose: () => void;
}

export function CardDetail({
  cardId,
  boardId,
  labels,
  members,
  canManageAssignees,
  onClose,
}: CardDetailProps) {
  const card = useQuery(api.cards.get, { cardId });
  const updateCard = useMutation(api.cards.update);
  const toggleComplete = useMutation(api.cards.toggleComplete);
  const deleteCard = useMutation(api.cards.remove);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  if (card === undefined) {
    return (
      <Modal open onClose={onClose} size="lg">
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-text/40" />
        </div>
      </Modal>
    );
  }

  if (!card) {
    onClose();
    return null;
  }

  const cardLabels = labels.filter((label) => card.labelIds.includes(label._id));
  const selectedAssigneeId =
    card.assignedUserId === null ? "" : card.assignedUserId ?? "";
  const currentAssignee = members.find((member) => member.userId === card.assignedUserId) ?? null;
  const assignableMembers = members.filter(
    (member) =>
      member.role === "owner" ||
      member.canBeAssigned ||
      member.userId === card.assignedUserId,
  );

  const handleToggleComplete = async () => {
    await toggleComplete({ cardId });
    toast.success(card.isComplete ? "Task reopened" : "Task completed");
  };

  const handleSaveTitle = async () => {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === card.title) {
      setIsEditingTitle(false);
      return;
    }
    await updateCard({ cardId, title: trimmed });
    setIsEditingTitle(false);
    toast.success("Title updated");
  };

  const handlePriority = async (priority: typeof card.priority) => {
    await updateCard({ cardId, priority });
    toast.success("Priority updated");
  };

  const handleLabelsChange = async (newLabelIds: Id<"labels">[]) => {
    await updateCard({ cardId, labelIds: newLabelIds });
  };

  const handleAssigneeChange = async (value: string) => {
    const nextAssigneeId = value === "" ? null : (value as Id<"users">);
    await updateCard({ cardId, assignedUserId: nextAssigneeId });
    toast.success(nextAssigneeId ? "Task assigned" : "Assignee cleared");
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

  return (
    <>
      <Modal open onClose={onClose} size="lg">
        <div className="flex flex-col max-h-[85vh]">
          <div className="px-6 pt-6 pb-4 border-b-2 border-brand-text/10">
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {cardLabels.map((label) => (
                  <span
                    key={label._id}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {isEditingTitle ? (
              <textarea
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSaveTitle();
                  }
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full text-2xl font-bold font-serif italic bg-brand-bg border-2 border-brand-text/20 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-brand-text"
                rows={2}
              />
            ) : (
              <h2
                className="select-none text-2xl font-bold font-serif italic cursor-pointer pr-8"
                onClick={() => {
                  setTitleValue(card.title);
                  setIsEditingTitle(true);
                }}
              >
                {card.title}
              </h2>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs font-mono text-brand-text/50">
              {card.dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    card.dueDate < Date.now() &&
                      !card.isComplete &&
                      "text-brand-accent font-bold",
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {format(card.dueDate, "MMM d, yyyy")}
                  {card.dueDate < Date.now() && !card.isComplete && " · Overdue"}
                </div>
              )}
              {card.priority && (
                <div className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" />
                  {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}{" "}
                  priority
                </div>
              )}
              <div className="ml-auto text-brand-text/30">
                Created {format(card.createdAt, "MMM d")}
              </div>
            </div>
          </div>

          <div className="flex border-b-2 border-brand-text/10 px-6">
            {(["details", "activity"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold border-b-2 -mb-0.5 transition-colors",
                  activeTab === tab
                    ? "border-brand-text text-brand-text"
                    : "border-transparent text-brand-text/40 hover:text-brand-text",
                )}
              >
                {tab === "details" ? (
                  <AlignLeft className="w-3.5 h-3.5" />
                ) : (
                  <Activity className="w-3.5 h-3.5" />
                )}
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "details" ? (
              <div className="grid grid-cols-3 gap-0">
                <div className="col-span-2 p-6 space-y-6 border-r-2 border-brand-text/10">
                  <button
                    onClick={() => void handleToggleComplete()}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 font-mono font-bold text-sm transition-all",
                      card.isComplete
                        ? "border-green-500/30 bg-green-50 text-green-700"
                        : "border-brand-text/10 hover:border-brand-text/30 text-brand-text/60",
                    )}
                  >
                    {card.isComplete ? (
                      <CheckSquare className="w-5 h-5 text-green-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    {card.isComplete ? "Completed" : "Mark as complete"}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlignLeft className="w-4 h-4 text-brand-text/40" />
                      <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-brand-text/60">
                        Description
                      </h3>
                    </div>
                    <CardDescription cardId={cardId} description={card.description} />
                  </div>
                </div>

                <div className="p-4 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UserRound className="w-3.5 h-3.5 text-brand-text/40" />
                      <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-brand-text/50">
                        Assignee
                      </h3>
                    </div>
                    {canManageAssignees ? (
                      <div className="rounded-2xl border-2 border-brand-text/10 bg-brand-bg/60 px-3">
                        <select
                          value={selectedAssigneeId}
                          onChange={(e) => void handleAssigneeChange(e.target.value)}
                          className="h-11 w-full bg-transparent text-sm text-brand-text focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {assignableMembers.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name ?? member.email ?? "Unknown member"}
                              {member.role === "owner" ? " (Owner)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-brand-text/10 bg-brand-bg/60 px-3 py-3">
                        <p className="text-sm text-brand-text">
                          {currentAssignee?.name ??
                            currentAssignee?.email ??
                            "Unassigned"}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-brand-text/45">
                          Only the board owner can change task assignees.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Flag className="w-3.5 h-3.5 text-brand-text/40" />
                      <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-brand-text/50">
                        Priority
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {PRIORITY_OPTIONS.map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => void handlePriority(priority.value)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left",
                            card.priority === priority.value
                              ? "bg-brand-text text-brand-bg"
                              : "hover:bg-brand-text/10",
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: priority.color }}
                          />
                          {priority.label}
                        </button>
                      ))}
                      {card.priority && (
                        <button
                          onClick={() => void handlePriority(undefined)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-mono text-brand-text/40 hover:bg-brand-text/5 transition-colors text-left"
                        >
                          Clear priority
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-brand-text/40" />
                      <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-brand-text/50">
                        Due Date
                      </h3>
                    </div>
                    <CardDueDate cardId={cardId} dueDate={card.dueDate} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-brand-text/40" />
                      <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold text-brand-text/50">
                        Labels
                      </h3>
                    </div>
                    <LabelPicker
                      boardId={boardId}
                      selectedIds={card.labelIds}
                      onChange={handleLabelsChange}
                    />
                  </div>

                  <div className="pt-2 border-t-2 border-brand-text/10">
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-brand-accent text-sm font-medium hover:bg-brand-accent/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete task
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <ActivityFeed cardId={cardId} boardId={boardId} mode="card" />
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete task"
        description={`"${card.title}" will be permanently deleted.`}
        confirmLabel="Delete Task"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
