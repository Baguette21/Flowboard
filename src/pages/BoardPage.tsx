import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { BoardView } from "../components/board/BoardView";
import { BoardCalendarView } from "../components/board/BoardCalendarView";
import { BoardDrawView } from "../components/board/BoardDrawView";
import { Table } from "../components/table/Table";
import { BoardSettings } from "../components/board/BoardSettings";
import { ArrowLeft, CalendarDays, LayoutGrid, List, PencilLine, Settings, Star, Table2 } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useBoardTabs } from "../hooks/useBoardTabs";

type BoardMode = "board" | "calendar" | "table" | "list" | "draw";

const DEFAULT_VIEW_ORDER: BoardMode[] = ["board", "calendar", "table", "list", "draw"];

function getViewOrderStorageKey(boardId: Id<"boards">) {
  return `planthing-view-order-${boardId}`;
}

function loadStoredViewOrder(boardId: Id<"boards">): BoardMode[] {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW_ORDER;
  }

  const raw = window.localStorage.getItem(getViewOrderStorageKey(boardId));
  if (!raw) {
    return DEFAULT_VIEW_ORDER;
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    const nextOrder = parsed.filter((value): value is BoardMode =>
      DEFAULT_VIEW_ORDER.includes(value as BoardMode),
    );

    return [
      ...nextOrder,
      ...DEFAULT_VIEW_ORDER.filter((mode) => !nextOrder.includes(mode)),
    ];
  } catch {
    return DEFAULT_VIEW_ORDER;
  }
}

function getInitialViewOrder(boardId?: Id<"boards">) {
  return boardId ? loadStoredViewOrder(boardId) : DEFAULT_VIEW_ORDER;
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const typedBoardId = boardId as Id<"boards"> | undefined;
  const [viewOrder, setViewOrder] = useState<BoardMode[]>(() => getInitialViewOrder(typedBoardId));
  const [mode, setMode] = useState<BoardMode>(() => getInitialViewOrder(typedBoardId)[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedView, setDraggedView] = useState<BoardMode | null>(null);
  const updateBoard = useMutation(api.boards.update);
  const { ensureInActiveTab } = useBoardTabs();
  const me = useQuery(api.users.me);
  const isPro = me?.role === "PRO";

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

  useEffect(() => {
    const nextViewOrder = loadStoredViewOrder(typedBoardId);
    setViewOrder(nextViewOrder);
    setMode(nextViewOrder[0] ?? DEFAULT_VIEW_ORDER[0]);
  }, [typedBoardId]);

  useEffect(() => {
    if (me !== undefined && !isPro && mode === "draw") {
      setMode("board");
    }
  }, [isPro, me, mode]);

  useEffect(() => {
    if (!typedBoardId) {
      return;
    }

    ensureInActiveTab({ kind: "board", id: typedBoardId });
  }, [ensureInActiveTab, typedBoardId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getViewOrderStorageKey(typedBoardId),
      JSON.stringify(viewOrder),
    );
  }, [typedBoardId, viewOrder]);

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

  const handleFavorite = async () => {
    await updateBoard({ boardId: board._id, isFavorite: !board.isFavorite });
    toast.success(board.isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const reorderViews = (targetView: BoardMode) => {
    if (!draggedView || draggedView === targetView) {
      return;
    }

    setViewOrder((current) => {
      const fromIndex = current.indexOf(draggedView);
      const toIndex = current.indexOf(targetView);
      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const next = [...current];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedView);
      return next;
    });
  };

  return (
    <Layout key={typedBoardId} boardId={typedBoardId}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-brand-text/10 bg-brand-bg/60 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {viewOrder.filter((viewKey) => viewKey !== "draw" || isPro).map((viewKey) => {
            const view = ({
              board: { key: "board" as const, label: "Board", icon: LayoutGrid },
              calendar: { key: "calendar" as const, label: "Calendar", icon: CalendarDays },
              table: { key: "table" as const, label: "Table", icon: Table2 },
              list: { key: "list" as const, label: "List", icon: List },
              draw: { key: "draw" as const, label: "Draw", icon: PencilLine },
            } satisfies Record<BoardMode, { key: BoardMode; label: string; icon: typeof LayoutGrid }>)[
              viewKey
            ];
            const Icon = view.icon;

            return (
              <button
                key={view.key}
                draggable
                onDragStart={() => setDraggedView(view.key)}
                onDragOver={(event) => {
                  event.preventDefault();
                  reorderViews(view.key);
                }}
                onDragEnd={() => setDraggedView(null)}
                onClick={() => setMode(view.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-2 py-2 font-sans text-base font-medium transition-colors sm:px-3",
                  mode === view.key
                    ? "rounded-[18px] bg-brand-text/10 px-4 text-brand-text"
                    : "text-brand-text/60 hover:text-brand-text",
                  draggedView === view.key && "opacity-40",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {view.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleFavorite()}
            className={cn(
              "rounded-xl p-2 transition-colors",
              board.isFavorite
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-brand-text/30 hover:text-yellow-400",
            )}
            title={board.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className="h-4 w-4"
              fill={board.isFavorite ? "currentColor" : "none"}
            />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="rounded-xl p-2 text-brand-text/40 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
            title="Board settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>


      <div className="flex-1 md:min-h-0 md:overflow-hidden">
        {mode === "board" ? (
          <BoardView key={`board-${typedBoardId}`} boardId={typedBoardId} />
        ) : mode === "calendar" ? (
          <BoardCalendarView
            key={`calendar-${typedBoardId}`}
            boardId={typedBoardId}
            cards={cards}
            boardColor={board.color}
            columns={columns ?? []}
            labels={labels ?? []}
          />
        ) : mode === "draw" && isPro ? (
          <BoardDrawView
            key={`draw-${typedBoardId}`}
            boardId={typedBoardId}
            drawingDocument={board.drawingDocument}
          />
        ) : mode !== "draw" ? (
          <Table
            key={`${mode}-${typedBoardId}`}
            boardId={typedBoardId}
            cards={cards}
            columns={columns ?? []}
            labels={labels ?? []}
            forcedMode={mode}
            showViewModeTabs={false}
          />
        ) : (
          <BoardView key={`board-${typedBoardId}`} boardId={typedBoardId} />
        )}
      </div>

      <BoardSettings
        key={`settings-${typedBoardId}`}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        board={board}
      />
    </Layout>
  );
}
