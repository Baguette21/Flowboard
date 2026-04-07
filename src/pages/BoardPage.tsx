import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { BoardView } from "../components/board/BoardView";
import { BoardHeader } from "../components/board/BoardHeader";
import { FilterPanel } from "../components/search/FilterPanel";
import type { FilterState } from "../components/search/FilterPanel";
import { Skeleton } from "../components/ui/Skeleton";
import { ArrowLeft } from "lucide-react";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({});

  const board = useQuery(
    api.boards.get,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip",
  );
  const columns = useQuery(
    api.columns.listByBoard,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip",
  );
  const cards = useQuery(
    api.cards.listByBoard,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip",
  );
  const labels = useQuery(
    api.labels.listByBoard,
    boardId ? { boardId: boardId as Id<"boards"> } : "skip",
  );

  if (!boardId) {
    navigate("/");
    return null;
  }

  if (board === undefined) {
    return (
      <Layout>
        <div className="p-4 sm:p-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-[85vw] max-w-72 h-96 rounded-[2rem] flex-shrink-0" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!board) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full px-4 py-24 text-center">
          <h2 className="font-serif italic font-bold text-2xl mb-2">Board not found</h2>
          <p className="text-brand-text/50 font-mono text-sm mb-6">
            This board doesn't exist or you don't have access.
          </p>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to boards
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout boardName={board.name} boardId={boardId as Id<"boards">}>
      {/* Board header with title + settings */}
      <BoardHeader
        board={board}
        cardCount={cards?.length ?? 0}
        columnCount={columns?.length ?? 0}
      />

      {/* Filter panel */}
      {(labels?.length ?? 0) > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b-2 border-brand-text/10 bg-brand-bg/50 flex-shrink-0 overflow-x-auto">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            labels={labels ?? []}
          />
        </div>
      )}

      {/* Main board canvas */}
      <div className="flex-1 md:min-h-0 md:overflow-hidden">
        <BoardView boardId={boardId as Id<"boards">} />
      </div>
    </Layout>
  );
}
