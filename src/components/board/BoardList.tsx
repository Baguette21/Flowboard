import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus, Star, LayoutGrid, Search } from "lucide-react";
import { BoardCard } from "./BoardCard";
import { CreateBoardModal } from "./CreateBoardModal";
import { ColumnSkeleton } from "../ui/Skeleton";

interface BoardListProps {
  searchQuery?: string;
}

export function BoardList({ searchQuery = "" }: BoardListProps) {
  const boards = useQuery(api.boards.list);
  const [showCreate, setShowCreate] = useState(false);

  if (boards === undefined) {
    return (
      <div className="p-4 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <ColumnSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredBoards = normalizedSearch
    ? boards.filter((board) => board.name.toLowerCase().includes(normalizedSearch))
    : boards;
  const favorites = filteredBoards.filter((b) => b.isFavorite);
  const rest = filteredBoards.filter((b) => !b.isFavorite);
  const hasSearch = normalizedSearch.length > 0;

  return (
    <>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-serif italic font-bold">Your Boards</h1>
            <p className="font-mono text-sm text-brand-text/50 mt-1">
              {hasSearch
                ? `${filteredBoards.length} match${filteredBoards.length !== 1 ? "es" : ""} for "${searchQuery.trim()}"`
                : `${boards.length} board${boards.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 h-11 px-5 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Board
          </button>
        </div>

        {boards.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center">
            <div className="w-16 h-16 rounded-[2rem] bg-brand-text/5 flex items-center justify-center mb-4">
              <LayoutGrid className="w-8 h-8 text-brand-text/20" />
            </div>
            <h2 className="font-serif italic font-bold text-2xl mb-2">
              No boards yet
            </h2>
            <p className="text-brand-text/50 font-mono text-sm mb-6 max-w-xs">
              Create your first board to start organizing tasks
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 h-11 px-6 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Board
            </button>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center">
            <div className="w-16 h-16 rounded-[2rem] bg-brand-text/5 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-brand-text/20" />
            </div>
            <h2 className="font-serif italic font-bold text-2xl mb-2">
              No matching boards
            </h2>
            <p className="text-brand-text/50 font-mono text-sm max-w-sm">
              No board title matches "{searchQuery.trim()}". Try a different name.
            </p>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {/* Favorites */}
            {favorites.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                  <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-brand-text/60">
                    Favorites
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favorites.map((board) => (
                    <BoardCard key={board._id} board={board} />
                  ))}
                </div>
              </section>
            )}

            {/* All boards */}
            {rest.length > 0 && (
              <section>
                {favorites.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <LayoutGrid className="w-4 h-4 text-brand-text/40" />
                    <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-brand-text/60">
                      All Boards
                    </h2>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {rest.map((board) => (
                    <BoardCard key={board._id} board={board} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <CreateBoardModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
