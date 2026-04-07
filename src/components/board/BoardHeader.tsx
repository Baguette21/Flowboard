import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Settings, Star, Check, X, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { BoardSettings } from "./BoardSettings";

interface BoardHeaderProps {
  board: Doc<"boards">;
  cardCount: number;
  columnCount: number;
}

export function BoardHeader({ board, cardCount, columnCount }: BoardHeaderProps) {
  const updateBoard = useMutation(api.boards.update);
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId: board._id });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(board.name);
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === board.name) {
      setEditName(board.name);
      setIsEditingName(false);
      return;
    }
    try {
      await updateBoard({ boardId: board._id, name: trimmed });
      toast.success("Board renamed");
    } catch {
      toast.error("Failed to rename board");
      setEditName(board.name);
    }
    setIsEditingName(false);
  };

  const handleFavorite = async () => {
    await updateBoard({ boardId: board._id, isFavorite: !board.isFavorite });
    toast.success(board.isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  return (
    <>
      <div className="flex flex-col gap-3 border-b-2 border-brand-text/10 bg-brand-bg px-4 py-3 flex-shrink-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div
            className="w-3 h-3 rounded-full shadow-md flex-shrink-0"
            style={{ backgroundColor: board.color }}
          />

          {isEditingName ? (
            <div className="flex min-w-0 items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSaveName();
                  }
                  if (e.key === "Escape") {
                    setEditName(board.name);
                    setIsEditingName(false);
                  }
                }}
                className="min-w-0 text-lg font-serif italic font-bold bg-brand-primary border-2 border-brand-text/20 rounded-xl px-3 py-1 focus:outline-none focus:border-brand-text sm:text-xl"
              />
              <button
                onClick={() => void handleSaveName()}
                className="p-1.5 rounded-lg hover:bg-brand-text/10 text-green-600"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditName(board.name);
                  setIsEditingName(false);
                }}
                className="p-1.5 rounded-lg hover:bg-brand-text/10 text-brand-text/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditName(board.name);
                setIsEditingName(true);
              }}
              className="min-w-0 truncate select-none text-left text-lg font-serif italic font-bold sm:text-xl"
            >
              {board.name}
            </button>
          )}

          <div className="hidden md:flex items-center gap-3 font-mono text-xs text-brand-text/40">
            <span>{columnCount} columns</span>
            <span>·</span>
            <span>{cardCount} tasks</span>
            {accessInfo && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {accessInfo.memberCount} people
                </span>
                <span className="px-2 py-1 rounded-full bg-brand-primary border border-brand-text/10 text-[10px] uppercase tracking-widest">
                  {accessInfo.role}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex items-center gap-2 font-mono text-[11px] text-brand-text/45 md:hidden">
            <span>{columnCount} columns</span>
            <span>·</span>
            <span>{cardCount} tasks</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleFavorite()}
              className={cn(
                "p-2 rounded-xl transition-colors",
                board.isFavorite
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-brand-text/30 hover:text-yellow-400",
              )}
              title={board.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className="w-4 h-4"
                fill={board.isFavorite ? "currentColor" : "none"}
              />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl text-brand-text/40 hover:text-brand-text hover:bg-brand-text/10 transition-colors"
              title="Board settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <BoardSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        board={board}
      />
    </>
  );
}
