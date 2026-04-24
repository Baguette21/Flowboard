import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MailPlus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/utils";
import {
  BOARD_ACCENT_OPTIONS,
  BOARD_ICON_OPTIONS,
  getBoardAccentOption,
  getBoardIconOption,
} from "../../lib/boardIcons";
import { useProfileImageUrls } from "../../hooks/useProfileImageUrls";
import { UserAvatar } from "../ui/UserAvatar";

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
  const ensureInviteLink = useMutation(api.boardInvites.ensureLink);
  const revokeInviteLink = useMutation(api.boardInvites.revokeLink);
  const setAssignable = useMutation(api.boardMembers.setAssignable);
  const leaveBoard = useMutation(api.boardMembers.leaveBoard);
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId: board._id });
  const members = useQuery(api.boardMembers.listForBoard, { boardId: board._id });
  const invites = useQuery(api.boardInvites.listForBoard, { boardId: board._id });
  const linkInfo = useQuery(api.boardInvites.getLinkInfo, { boardId: board._id });
  const memberImageUrls = useProfileImageUrls(
    (members ?? []).map((member) => member.imageKey),
  );

  const [name, setName] = useState(board.name);
  const [iconId, setIconId] = useState(getBoardIconOption(board.icon, board.color).id);
  const [color, setColor] = useState(getBoardAccentOption(board.color).color);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [updatingAssignableUserId, setUpdatingAssignableUserId] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isRevokingLink, setIsRevokingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteToken = linkInfo?.inviteToken ?? null;
  const inviteUrl =
    inviteToken && typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteToken}`
      : null;

  useEffect(() => {
    setName(board.name);
    setIconId(getBoardIconOption(board.icon, board.color).id);
    setColor(getBoardAccentOption(board.color).color);
  }, [board.name, board.color, board.icon, open]);

  const selectedIcon = getBoardIconOption(iconId, board.color);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateBoard({
        boardId: board._id,
        name: name.trim(),
        color,
        icon: selectedIcon.id,
      });
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

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveBoard({ boardId: board._id });
      toast.success("You left the board");
      onClose();
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave board";
      toast.error(message);
    } finally {
      setIsLeaving(false);
      setConfirmLeave(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    try {
      const result = await ensureInviteLink({ boardId: board._id });
      const url = `${window.location.origin}/join/${result.inviteToken}`;
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Invite link copied");
      } catch {
        toast.success("Invite link created");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate invite link";
      toast.error(message);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Invite link copied");
    } catch {
      toast.error("Copy failed — please copy manually");
    }
  };

  const handleRevokeLink = async () => {
    setIsRevokingLink(true);
    try {
      await revokeInviteLink({ boardId: board._id });
      toast.success("Invite link revoked");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke invite link";
      toast.error(message);
    } finally {
      setIsRevokingLink(false);
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

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div
          className="task-panel-backdrop absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        <div className="task-panel-slide absolute right-0 top-0 flex h-full w-full flex-col border-l border-brand-text/10 bg-brand-bg shadow-2xl sm:max-w-[720px]">
          <div className="flex items-center justify-between border-b border-brand-text/10 px-5 py-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/48">
              Board Settings
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-brand-text/30 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
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
                  Board Icon
                </label>
                <div className="grid grid-cols-7 gap-2 sm:grid-cols-8">
                  {BOARD_ICON_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setIconId(option.id)}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-[10px] border transition-colors",
                        iconId === option.id
                          ? "border-brand-text bg-brand-primary"
                          : "border-brand-text/10 bg-brand-bg hover:border-brand-text/22",
                      )}
                      title={option.label}
                      aria-label={option.label}
                    >
                      <option.Icon className="h-4.5 w-4.5 text-brand-text/72" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-3">
                  Accent Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {BOARD_ACCENT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setColor(option.color)}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-[12px] border transition-colors",
                        color === option.color
                          ? "border-brand-text bg-brand-primary"
                          : "border-brand-text/10 bg-brand-bg hover:border-brand-text/22",
                      )}
                      title={option.label}
                    >
                      <span
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    </button>
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
                  <div className="space-y-4">
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

                    <div className="rounded-[1.5rem] border border-brand-text/10 bg-brand-primary p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-brand-accent" />
                            <p className="font-mono text-xs uppercase tracking-widest text-brand-text/60">
                              Invite Link
                            </p>
                          </div>
                          <p className="font-mono text-[11px] text-brand-text/50 mt-1">
                            Anyone signed in with this link can join the board.
                          </p>
                        </div>
                      </div>

                      {inviteUrl ? (
                        <>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={inviteUrl}
                              readOnly
                              onFocus={(e) => e.currentTarget.select()}
                              className="flex-1 h-11 px-3 bg-brand-bg border-2 border-brand-text/20 rounded-2xl font-mono text-xs focus:outline-none focus:border-brand-text transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => void handleCopyLink()}
                              className="h-11 px-4 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-xs hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
                            >
                              {copiedLink ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              {copiedLink ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRevokeLink()}
                            disabled={isRevokingLink}
                            className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-text/50 hover:text-brand-accent transition-colors disabled:opacity-60"
                          >
                            {isRevokingLink ? "Revoking…" : "Revoke link"}
                          </button>
                        </>
                      ) : linkInfo === undefined ? (
                        <p className="font-mono text-xs text-brand-text/40">Loading…</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleGenerateLink()}
                          disabled={isGeneratingLink}
                          className="h-11 px-4 border-2 border-brand-text/20 rounded-2xl font-mono font-bold text-xs hover:border-brand-text transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {isGeneratingLink ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LinkIcon className="w-3.5 h-3.5" />
                          )}
                          Create invite link
                        </button>
                      )}
                    </div>
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
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar
                                name={member.name}
                                email={member.email}
                                imageUrl={member.imageKey ? memberImageUrls[member.imageKey] ?? null : null}
                                size="md"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{member.name ?? member.email ?? "Unnamed user"}</p>
                                <p className="font-mono text-[11px] text-brand-text/50 truncate">
                                  {member.email ?? "No email available"}
                                </p>
                              </div>
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

              {!isOwner && (
                <div className="border-t-2 border-brand-text/10 pt-5">
                  <p className="font-mono text-xs uppercase tracking-widest text-brand-text/40 mb-3">
                    Membership
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-brand-text/20 text-brand-text rounded-2xl font-mono font-bold text-sm hover:bg-brand-text/5 transition-colors w-full justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Board
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-brand-text/10 px-6 py-4">
              <div className="flex gap-3">
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
            </div>
          </form>
        </div>
      </div>

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

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        title="Leave board"
        description={`You will lose access to "${board.name}" until you are invited again.`}
        confirmLabel="Leave Board"
        isDestructive
        isLoading={isLeaving}
      />
    </>
  );
}
