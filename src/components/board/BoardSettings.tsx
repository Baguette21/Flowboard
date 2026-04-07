import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Loader2, MailPlus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/utils";

const BOARD_COLORS = [
  "#E63B2E", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#111111", "#6B7280",
];

interface BoardSettingsProps {
  open: boolean;
  onClose: () => void;
  board: Doc<"boards">;
}

export function BoardSettings({ open, onClose, board }: BoardSettingsProps) {
  const navigate = useNavigate();
  const updateBoard = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.remove);
  const createInvite = useMutation(api.boardInvites.create);
  const setAssignable = useMutation(api.boardMembers.setAssignable);
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId: board._id });
  const members = useQuery(api.boardMembers.listForBoard, { boardId: board._id });
  const invites = useQuery(api.boardInvites.listForBoard, { boardId: board._id });

  const [name, setName] = useState(board.name);
  const [color, setColor] = useState(board.color);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingAssignableUserId, setUpdatingAssignableUserId] = useState<string | null>(null);

  useEffect(() => {
    setName(board.name);
    setColor(board.color);
  }, [board.name, board.color, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateBoard({ boardId: board._id, name: name.trim(), color });
      toast.success("Board updated");
      onClose();
    } catch {
      toast.error("Failed to update board");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      await createInvite({ boardId: board._id, email: inviteEmail.trim() });
      toast.success("Invite sent");
      setInviteEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send invite";
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBoard({ boardId: board._id });
      toast.success("Board deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleAssignableToggle = async (
    memberUserId: Id<"users">,
    canBeAssigned: boolean,
  ) => {
    setUpdatingAssignableUserId(memberUserId);
    try {
      await setAssignable({
        boardId: board._id,
        memberUserId,
        canBeAssigned,
      });
      toast.success(
        canBeAssigned ? "Task assignment enabled" : "Task assignment disabled",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update assignment access";
      toast.error(message);
    } finally {
      setUpdatingAssignableUserId(null);
    }
  };

  const isOwner = accessInfo?.isOwner ?? false;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Board Settings" size="lg">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
              Board Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              className="w-full h-12 px-4 bg-brand-bg border-2 border-brand-text/20 rounded-2xl font-sans text-sm focus:outline-none focus:border-brand-text transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-3">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                    color === c
                      ? "border-brand-text scale-110 shadow-md"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="border-t-2 border-brand-text/10 pt-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-serif italic font-bold text-xl">Share Board</p>
                <p className="font-mono text-xs text-brand-text/50 mt-1">
                  Invite teammates by email to collaborate in real time.
                </p>
              </div>
              {accessInfo && (
                <span className="px-3 py-1.5 rounded-full bg-brand-primary border border-brand-text/10 font-mono text-[10px] uppercase tracking-widest text-brand-text/50">
                  {accessInfo.role}
                </span>
              )}
            </div>

            {isOwner ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="flex-1 h-12 px-4 bg-brand-bg border-2 border-brand-text/20 rounded-2xl font-sans text-sm focus:outline-none focus:border-brand-text transition-colors"
                />
                <button
                  type="button"
                  onClick={() => void handleInvite()}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="h-12 px-5 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailPlus className="w-4 h-4" />}
                  Send Invite
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-brand-text/10 bg-brand-primary px-4 py-3">
                <p className="font-mono text-xs text-brand-text/60">
                  Only the board owner can send or manage invites. You can still edit the board itself.
                </p>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-brand-text/10 bg-brand-primary p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-brand-accent" />
                  <p className="font-mono text-xs uppercase tracking-widest text-brand-text/50">
                    Collaborators
                  </p>
                </div>

                <div className="space-y-3">
                  {members === undefined ? (
                    <p className="font-mono text-xs text-brand-text/40">Loading members...</p>
                  ) : members.length === 0 ? (
                    <p className="font-mono text-xs text-brand-text/40">No collaborators yet.</p>
                  ) : (
                    members.map((member) => (
                      <div key={`${member.role}-${member.userId}`} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{member.name ?? member.email ?? "Unnamed user"}</p>
                          <p className="font-mono text-[11px] text-brand-text/50 truncate">
                            {member.email ?? "No email available"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full bg-brand-bg border border-brand-text/10 font-mono text-[10px] uppercase tracking-widest text-brand-text/50">
                            {member.role}
                          </span>
                          {member.role === "member" && (
                            isOwner ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAssignableToggle(
                                    member.userId,
                                    !member.canBeAssigned,
                                  )
                                }
                                disabled={updatingAssignableUserId === member.userId}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-60",
                                  member.canBeAssigned
                                    ? "border-green-500/20 bg-green-500/10 text-green-700"
                                    : "border-brand-text/10 bg-brand-bg text-brand-text/50",
                                )}
                              >
                                {updatingAssignableUserId === member.userId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : member.canBeAssigned ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                Allow assign
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-widest",
                                  member.canBeAssigned
                                    ? "border-green-500/20 bg-green-500/10 text-green-700"
                                    : "border-brand-text/10 bg-brand-bg text-brand-text/50",
                                )}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {member.canBeAssigned ? "Can assign" : "Cannot assign"}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-brand-text/10 bg-brand-primary p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MailPlus className="w-4 h-4 text-brand-accent" />
                  <p className="font-mono text-xs uppercase tracking-widest text-brand-text/50">
                    Pending Invites
                  </p>
                </div>

                <div className="space-y-3">
                  {!isOwner ? (
                    <p className="font-mono text-xs text-brand-text/40">
                      Invite management is visible to the board owner only.
                    </p>
                  ) : invites === undefined ? (
                    <p className="font-mono text-xs text-brand-text/40">Loading invites...</p>
                  ) : invites.filter((invite) => invite.status === "pending").length === 0 ? (
                    <p className="font-mono text-xs text-brand-text/40">No pending invites.</p>
                  ) : (
                    invites
                      .filter((invite) => invite.status === "pending")
                      .map((invite) => (
                        <div key={invite._id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{invite.invitedEmail}</p>
                            <p className="font-mono text-[11px] text-brand-text/50 truncate">
                              Sent {new Date(invite.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full bg-brand-bg border border-brand-text/10 font-mono text-[10px] uppercase tracking-widest text-brand-text/50">
                            Pending
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border-2 border-brand-text/20 rounded-2xl font-mono font-bold text-sm hover:border-brand-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-11 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>

          {isOwner && (
            <div className="border-t-2 border-brand-text/10 pt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-brand-text/40 mb-3">
                Danger Zone
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-brand-accent/20 text-brand-accent rounded-2xl font-mono font-bold text-sm hover:bg-brand-accent/10 transition-colors w-full justify-center"
              >
                <Trash2 className="w-4 h-4" />
                Delete This Board
              </button>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete board"
        description={`This will permanently delete "${board.name}" and everything inside it. This action cannot be undone.`}
        confirmLabel="Delete Board"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
