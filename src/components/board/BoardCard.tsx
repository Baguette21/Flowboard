import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Star, Trash2, MoreHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dropdown } from "../ui/Dropdown";
import type { BoardListItem } from "../../lib/types";
import { getBoardIconOption } from "../../lib/boardIcons";
import { useBoardTabs } from "../../hooks/useBoardTabs";
import { useProfileImageUrls } from "../../hooks/useProfileImageUrls";
import { UserAvatar } from "../ui/UserAvatar";

interface BoardCardProps {
  board: BoardListItem;
}

export function PlanCard({ board }: BoardCardProps) {
  const toggleFavorite = useMutation(api.plans.update);
  const deletePlan = useMutation(api.plans.remove);
  const { openInActiveTab } = useBoardTabs();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const boardIcon = getBoardIconOption(board.icon, board.color);
  const ownerImageUrls = useProfileImageUrls([board.ownerImageKey]);
  const ownerImageUrl = board.ownerImageKey ? ownerImageUrls[board.ownerImageKey] ?? null : null;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite({ planId: board._id, isFavorite: !board.isFavorite });
    toast.success(board.isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openInActiveTab({ kind: "plan", id: board._id });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePlan({ planId: board._id });
      toast.success(`"${board.name}" deleted`);
    } catch {
      toast.error("Failed to delete plan");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const menuItems = [
    {
      label: board.isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: <Star className="w-4 h-4" />,
      onClick: () => void toggleFavorite({ planId: board._id, isFavorite: !board.isFavorite }),
    },
    ...(board.role === "owner"
      ? [
          {
            label: "Delete plan",
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setConfirmDelete(true),
            danger: true,
            separator: true,
          },
        ]
      : []),
  ];

  return (
    <>
      <div
        onClick={() => openInActiveTab({ kind: "plan", id: board._id })}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Open plan ${board.name}`}
        className="group relative select-none cursor-pointer bg-brand-primary card-whisper card-elevation rounded-[12px] p-5 transition-all duration-150 hover:card-elevation-hover hover:border-[color:var(--color-border-whisper-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/35"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                style={{
                  backgroundColor: `${board.color}22`,
                  color: board.color,
                }}
              >
                <boardIcon.Icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-sans font-bold text-[22px] leading-tight tracking-display text-brand-text truncate">
                {board.name}
              </h3>
              {board.role === "member" && (
                <span className="inline-flex items-center gap-1 rounded-full card-whisper bg-brand-bg px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-text-muted)]">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: board.color }}
              />
              <p className="font-sans text-[12px] font-medium text-[color:var(--color-text-subtle)]">
                {new Date(board.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            {board.role === "member" && (
              <div className="mt-2 flex items-center gap-2">
                <UserAvatar
                  name={board.ownerName}
                  email={board.ownerEmail}
                  imageUrl={ownerImageUrl}
                  size="sm"
                />
                <p className="min-w-0 truncate font-sans text-[12px] text-[color:var(--color-text-muted)]">
                  Owner: {board.ownerName ?? board.ownerEmail ?? "Unknown"}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleFavorite}
              aria-label={board.isFavorite ? `Remove ${board.name} from favorites` : `Add ${board.name} to favorites`}
              title={board.isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                "p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/30",
                board.isFavorite
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-[color:var(--color-text-subtle)] opacity-65 hover:text-yellow-400 group-hover:opacity-100 focus-visible:opacity-100",
              )}
            >
              <Star
                className="w-4 h-4"
                fill={board.isFavorite ? "currentColor" : "none"}
              />
            </button>

            <Dropdown
              align="right"
              trigger={
                <button
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`More actions for ${board.name}`}
                  title="More actions"
                  className="p-1.5 rounded-lg text-[color:var(--color-text-subtle)] opacity-65 hover:text-brand-text hover:bg-brand-text/5 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text/30 transition-all"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              }
              items={menuItems}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete plan"
        description={`This will permanently delete "${board.name}" and all its columns, tasks, and labels. This action cannot be undone.`}
        confirmLabel="Delete Plan"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
