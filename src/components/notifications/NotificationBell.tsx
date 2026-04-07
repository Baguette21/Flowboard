import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  ClipboardCheck,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function NotificationBell() {
  const navigate = useNavigate();
  const invites = useQuery(api.boardInvites.listMine);
  const notifications = useQuery(api.notifications.listMine);
  const acceptInvite = useMutation(api.boardInvites.accept);
  const declineInvite = useMutation(api.boardInvites.decline);
  const markNotificationRead = useMutation(api.notifications.markRead);
  const [open, setOpen] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAccept = async (inviteId: Id<"boardInvites">) => {
    setProcessingInviteId(inviteId);
    try {
      const result = await acceptInvite({ inviteId });
      toast.success("Board invite accepted");
      setOpen(false);
      navigate(`/board/${result.boardId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to accept invite";
      toast.error(message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDecline = async (inviteId: Id<"boardInvites">) => {
    setProcessingInviteId(inviteId);
    try {
      await declineInvite({ inviteId });
      toast.success("Invite declined");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to decline invite";
      toast.error(message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleOpenAssignment = async (
    notificationId: Id<"notifications">,
    boardId: Id<"boards">,
  ) => {
    setOpeningNotificationId(notificationId);
    try {
      await markNotificationRead({ notificationId });
      setOpen(false);
      navigate(`/board/${boardId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open notification";
      toast.error(message);
    } finally {
      setOpeningNotificationId(null);
    }
  };

  const pendingInvites = invites ?? [];
  const assignmentNotifications = notifications ?? [];
  const unreadAssignments = assignmentNotifications.filter(
    (notification) => !notification.isRead,
  ).length;
  const totalPendingCount = pendingInvites.length + unreadAssignments;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="p-2 rounded-xl text-brand-text/50 hover:text-brand-text hover:bg-brand-text/10 transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalPendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-brand-accent text-white text-[10px] font-mono font-bold flex items-center justify-center">
            {totalPendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-brand-primary border-2 border-brand-text/10 rounded-[1.75rem] shadow-xl overflow-hidden z-50">
          <div className="px-5 py-4 border-b border-brand-text/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-serif italic font-bold text-lg">Notifications</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-brand-text/40">
                  {totalPendingCount} item{totalPendingCount === 1 ? "" : "s"} waiting
                </p>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-brand-bg flex items-center justify-center">
                <Bell className="w-4 h-4 text-brand-accent" />
              </div>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {invites === undefined || notifications === undefined ? (
              <div className="px-5 py-8 flex items-center justify-center gap-3 text-sm text-brand-text/50 font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading notifications...
              </div>
            ) : totalPendingCount === 0 && assignmentNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="font-serif italic font-bold text-lg mb-1">Nothing waiting</p>
                <p className="font-mono text-xs text-brand-text/50">
                  New invites and task assignments will appear here.
                </p>
              </div>
            ) : (
              <div>
                {pendingInvites.length > 0 && (
                  <div className="border-b border-brand-text/10">
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-brand-accent" />
                      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-text/40">
                        Board Invites
                      </p>
                    </div>

                    {pendingInvites.map((invite) => {
                      const isProcessing = processingInviteId === invite._id;
                      return (
                        <div
                          key={invite._id}
                          className="px-5 py-4 border-t border-brand-text/10"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: invite.boardColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-serif italic font-bold text-base leading-tight">
                                {invite.boardName}
                              </p>
                              <p className="font-mono text-xs text-brand-text/50 mt-1 leading-relaxed">
                                {invite.invitedByName ?? invite.invitedByEmail ?? "A teammate"} invited you to collaborate.
                              </p>
                              <p className="font-mono text-[11px] uppercase tracking-widest text-brand-text/30 mt-2">
                                {new Date(invite.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => void handleDecline(invite._id)}
                              disabled={isProcessing}
                              className="flex-1 h-10 rounded-2xl border-2 border-brand-text/15 font-mono font-bold text-xs hover:border-brand-text transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                              Decline
                            </button>
                            <button
                              onClick={() => void handleAccept(invite._id)}
                              disabled={isProcessing}
                              className="flex-1 h-10 rounded-2xl bg-brand-text text-brand-bg font-mono font-bold text-xs hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Accept
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {assignmentNotifications.length > 0 && (
                  <div>
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-brand-accent" />
                      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-text/40">
                        Task Assignments
                      </p>
                    </div>

                    {assignmentNotifications.map((notification) => {
                      const isOpening = openingNotificationId === notification._id;
                      return (
                        <div
                          key={notification._id}
                          className="px-5 py-4 border-t border-brand-text/10"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: notification.boardColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-serif italic font-bold text-base leading-tight">
                                  {notification.taskTitle}
                                </p>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0" />
                                )}
                              </div>
                              <p className="font-mono text-xs text-brand-text/50 mt-1 leading-relaxed">
                                {notification.actorName ?? notification.actorEmail ?? "A teammate"} assigned this task to you on {notification.boardName}.
                              </p>
                              <p className="font-mono text-[11px] uppercase tracking-widest text-brand-text/30 mt-2">
                                {new Date(notification.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <button
                              onClick={() =>
                                void handleOpenAssignment(
                                  notification._id,
                                  notification.boardId,
                                )
                              }
                              disabled={isOpening}
                              className="w-full h-10 rounded-2xl bg-brand-text text-brand-bg font-mono font-bold text-xs hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                              {isOpening ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ClipboardCheck className="w-3.5 h-3.5" />
                              )}
                              Open Task
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
