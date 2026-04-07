import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { BoardView } from "../components/board/BoardView";
import { BoardCalendarView } from "../components/board/BoardCalendarView";
import { BoardHeader } from "../components/board/BoardHeader";
import { FilterPanel } from "../components/search/FilterPanel";
import type { FilterState } from "../components/search/FilterPanel";
import { Skeleton } from "../components/ui/Skeleton";
import { ArrowLeft, CalendarDays, LayoutGrid } from "lucide-react";
import { cn } from "../lib/utils";

type BoardMode = "board" | "calendar";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({});
  const [mode, setMode] = useState<BoardMode>("board");

  const typedBoardId = boardId as Id<"boards"> | undefined;

  const board = useQuery(
    api.boards.get,
    typedBoardId ? { boardId: typedBoardId } : "skip",
  );
  const columns = useQuery(
    api.columns.listByBoard,
    typedBoardId ? { boardId: typedBoardId } : "skip",
  );
  const cards = useQuery(
    api.cards.listByBoard,
    typedBoardId ? { boardId: typedBoardId } : "skip",
  );
  const labels = useQuery(
    api.labels.listByBoard,
    typedBoardId ? { boardId: typedBoardId } : "skip",
  );

  if (!typedBoardId) {
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
            This board doesn&apos;t exist or you don&apos;t have access.
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
    <Layout boardName={board.name} boardId={typedBoardId}>
      <BoardHeader
        board={board}
        cardCount={cards?.length ?? 0}
        columnCount={columns?.length ?? 0}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-text/10 bg-brand-bg/60 px-4 py-3 sm:px-6">
        <div className="inline-flex rounded-2xl border-2 border-brand-text/10 bg-brand-primary p-1">
          {([
            { key: "board" as const, label: "Board", icon: LayoutGrid },
            { key: "calendar" as const, label: "Calendar", icon: CalendarDays },
          ]).map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.key}
                onClick={() => setMode(view.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors sm:px-4",
                  mode === view.key
                    ? "bg-brand-text text-brand-bg"
                    : "text-brand-text/50 hover:text-brand-text",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {view.label}
              </button>
            );
          })}
        </div>

        {mode === "calendar" && (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-text/40">
            Monthly due-date overview
          </p>
        )}
      </div>

      {mode === "board" && (labels?.length ?? 0) > 0 && (
        <div className="px-4 sm:px-6 py-3 border-b-2 border-brand-text/10 bg-brand-bg/50 flex-shrink-0 overflow-x-auto">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            labels={labels ?? []}
          />
        </div>
      )}

      <div className="flex-1 md:min-h-0 md:overflow-hidden">
        {mode === "board" ? (
          <BoardView boardId={typedBoardId} />
        ) : (
          <BoardCalendarView
            boardId={typedBoardId}
            cards={cards}
            boardColor={board.color}
            columns={columns ?? []}
            labels={labels ?? []}
          />
        )}
      </div>
    </Layout>
  );
}
