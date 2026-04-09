import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { BoardView } from "../components/board/BoardView";
import { BoardCalendarView } from "../components/board/BoardCalendarView";
import { BoardHeader } from "../components/board/BoardHeader";
import { ArrowLeft, CalendarDays, LayoutGrid } from "lucide-react";
import { cn } from "../lib/utils";

type BoardMode = "board" | "calendar";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
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
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-8 h-8 rounded bg-brand-accent animate-pulse" />
          <p className="font-mono text-sm text-brand-text/60">Loading board...</p>
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
        <div className="flex flex-wrap items-center gap-2">
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
                  "inline-flex items-center gap-2 px-2 py-2 font-sans text-base font-medium transition-colors sm:px-3",
                  mode === view.key
                    ? "rounded-[18px] bg-brand-text/10 px-4 text-brand-text"
                    : "text-brand-text/60 hover:text-brand-text",
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
