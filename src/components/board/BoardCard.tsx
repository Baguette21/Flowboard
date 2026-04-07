import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Star, Trash2, MoreHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dropdown } from "../ui/Dropdown";
import type { BoardListItem } from "../../lib/types";

interface BoardCardProps {
  board: BoardListItem;
}

export function BoardCard({ board }: BoardCardProps) {
  const navigate = useNavigate();
  const toggleFavorite = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite({ boardId: board._id, isFavorite: !board.isFavorite });
    toast.success(board.isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBoard({ boardId: board._id });
      toast.success(`"${board.name}" deleted`);
    } catch {
      toast.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const menuItems = [
    {
      label: board.isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: <Star className="w-4 h-4" />,
      onClick: () => void toggleFavorite({ boardId: board._id, isFavorite: !board.isFavorite }),
    },
    ...(board.role === "owner"
      ? [
          {
            label: "Delete board",
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
        onClick={() => navigate(`/board/${board._id}`)}
        className="group relative select-none bg-brand-primary border-2 border-brand-text/10 rounded-[2rem] p-6 cursor-pointer hover:border-brand-text/30 hover:-translate-y-0.5 transition-all"
        style={{ borderTopColor: board.color, borderTopWidth: 4 }}
      >
        <div
          className="absolute top-0 left-8 right-8 h-0.5 rounded-full -translate-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: board.color }}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-serif italic font-bold text-xl leading-tight truncate">
                {board.name}
              </h3>
              {board.role === "member" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-bg border border-brand-text/10 font-mono text-[10px] uppercase tracking-widest text-brand-text/50">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-brand-text/40 uppercase tracking-widest">
              {new Date(board.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {board.role === "member" && (
              <p className="font-mono text-xs text-brand-text/50 mt-2 truncate">
                Owner: {board.ownerName ?? board.ownerEmail ?? "Unknown"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleFavorite}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                board.isFavorite
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-brand-text/20 hover:text-yellow-400 opacity-0 group-hover:opacity-100",
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
                  className="p-1.5 rounded-xl text-brand-text/20 hover:text-brand-text hover:bg-brand-text/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              }
              items={menuItems}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-1.5">
          {[board.color, `${board.color}99`, `${board.color}44`].map((c, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete board"
        description={`This will permanently delete "${board.name}" and all its columns, tasks, and labels. This action cannot be undone.`}
        confirmLabel="Delete Board"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
