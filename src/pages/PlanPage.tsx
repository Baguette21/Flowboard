import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Layout } from "../components/layout/Layout";
import { BoardView } from "../components/board/BoardView";
import { BoardCalendarView } from "../components/board/BoardCalendarView";
import { BoardDrawView } from "../components/board/BoardDrawView";
import { AssistantChat } from "../components/ai/AssistantChat";
import { Table } from "../components/table/Table";
import { PlanSettings } from "../components/board/PlanSettings";
import { ArrowLeft, CalendarDays, LayoutGrid, List, PencilLine, Settings, Sparkles, Star, Table2 } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useBoardTabs } from "../hooks/useBoardTabs";
import { PlanthingLoading } from "../components/branding/PlanthingLoading";

type BoardMode = "board" | "calendar" | "table" | "list" | "draw";

const DEFAULT_VIEW_ORDER: BoardMode[] = ["board", "calendar", "table", "list", "draw"];

function getViewOrderStorageKey(planId: Id<"plans">) {
  return `planthing-view-order-${planId}`;
}

function loadStoredViewOrder(planId: Id<"plans">): BoardMode[] {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW_ORDER;
  }

  const raw = window.localStorage.getItem(getViewOrderStorageKey(planId));
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

function getInitialViewOrder(planId?: Id<"plans">) {
  return planId ? loadStoredViewOrder(planId) : DEFAULT_VIEW_ORDER;
}

export function PlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const typedPlanId = planId as Id<"plans"> | undefined;
  const [viewOrder, setViewOrder] = useState<BoardMode[]>(() => getInitialViewOrder(typedPlanId));
  const [mode, setMode] = useState<BoardMode>(() => getInitialViewOrder(typedPlanId)[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [draggedView, setDraggedView] = useState<BoardMode | null>(null);
  const updatePlan = useMutation(api.plans.update);
  const savePlanViewPreference = useMutation(api.planViewPreferences.set);
  const boardViewPreference = useQuery(
    api.planViewPreferences.get,
    typedPlanId ? { planId: typedPlanId } : "skip",
  );
  const { ensureInActiveTab } = useBoardTabs();
  const me = useQuery(api.users.me);
  const isPro = me?.role === "PRO";
  const activeMode = !isPro && mode === "draw" ? "board" : mode;

  const plan = useQuery(
    api.plans.get,
    typedPlanId ? { planId: typedPlanId } : "skip",
  );
  const columns = useQuery(
    api.columns.listByPlan,
    typedPlanId ? { planId: typedPlanId } : "skip",
  );
  const cards = useQuery(
    api.cards.listByPlan,
    typedPlanId ? { planId: typedPlanId } : "skip",
  );
  const labels = useQuery(
    api.labels.listByPlan,
    typedPlanId ? { planId: typedPlanId } : "skip",
  );

  useEffect(() => {
    if (!typedPlanId) {
      navigate("/");
      return;
    }
  }, [navigate, typedPlanId]);

  useEffect(() => {
    if (!typedPlanId) {
      return;
    }

    let cancelled = false;
    const nextViewOrder = loadStoredViewOrder(typedPlanId);
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setViewOrder(nextViewOrder);
      setMode(nextViewOrder[0] ?? DEFAULT_VIEW_ORDER[0]);
    });

    return () => {
      cancelled = true;
    };
  }, [typedPlanId]);

  useEffect(() => {
    if (!boardViewPreference) {
      return;
    }
    if (!boardViewPreference.hasPreference) {
      if (typedPlanId) {
        void savePlanViewPreference({
          planId: typedPlanId,
          viewOrder,
        }).catch(() => {});
      }
      return;
    }
    const nextViewOrder = boardViewPreference.viewOrder;
    queueMicrotask(() => {
      setViewOrder(nextViewOrder);
      setMode((currentMode) =>
        nextViewOrder.includes(currentMode)
          ? currentMode
          : nextViewOrder[0] ?? DEFAULT_VIEW_ORDER[0],
      );
    });
  }, [boardViewPreference, savePlanViewPreference, typedPlanId, viewOrder]);

  useEffect(() => {
    if (!typedPlanId) {
      return;
    }

    ensureInActiveTab({ kind: "plan", id: typedPlanId });
  }, [ensureInActiveTab, typedPlanId]);

  useEffect(() => {
    if (!typedPlanId || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getViewOrderStorageKey(typedPlanId),
      JSON.stringify(viewOrder),
    );
    if (boardViewPreference !== undefined) {
      void savePlanViewPreference({
        planId: typedPlanId,
        viewOrder,
      }).catch(() => {
        // Local storage keeps the UI usable if syncing this preference fails.
      });
    }
  }, [boardViewPreference, savePlanViewPreference, typedPlanId, viewOrder]);

  if (!typedPlanId) {
    return null;
  }

  if (plan === undefined) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full">
          <PlanthingLoading message="Loading plan..." />
        </div>
      </Layout>
    );
  }

  if (!plan) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full px-4 py-24 text-center">
          <h2 className="font-serif italic font-bold text-2xl mb-2">Plan not found</h2>
          <p className="text-brand-text/50 font-mono text-sm mb-6">
            This plan doesn&apos;t exist or you don&apos;t have access.
          </p>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to plans
          </button>
        </div>
      </Layout>
    );
  }

  const handleFavorite = async () => {
    await updatePlan({ planId: plan._id, isFavorite: !plan.isFavorite });
    toast.success(plan.isFavorite ? "Removed from favorites" : "Added to favorites");
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
    <Layout key={typedPlanId} planId={typedPlanId}>
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
                  activeMode === view.key
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
              plan.isFavorite
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-brand-text/30 hover:text-yellow-400",
            )}
            title={plan.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className="h-4 w-4"
              fill={plan.isFavorite ? "currentColor" : "none"}
            />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="rounded-xl p-2 text-brand-text/40 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
            title="Plan settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>


      <div className="flex-1 min-h-0 overflow-hidden">
        {activeMode === "board" ? (
          <BoardView key={`board-${typedPlanId}`} planId={typedPlanId} />
        ) : activeMode === "calendar" ? (
          <BoardCalendarView
            key={`calendar-${typedPlanId}`}
            planId={typedPlanId}
            cards={cards}
            boardColor={plan.color}
            columns={columns ?? []}
            labels={labels ?? []}
          />
        ) : activeMode === "draw" && isPro ? (
          <BoardDrawView
            key={`draw-${typedPlanId}`}
            planId={typedPlanId}
            drawingDocument={plan.drawingDocument}
          />
        ) : activeMode !== "draw" ? (
          <Table
            key={`${activeMode}-${typedPlanId}`}
            planId={typedPlanId}
            cards={cards}
            columns={columns ?? []}
            labels={labels ?? []}
            forcedMode={activeMode}
            showViewModeTabs={false}
          />
        ) : (
          <BoardView key={`board-${typedPlanId}`} planId={typedPlanId} />
        )}
      </div>

      <PlanSettings
        key={`settings-${typedPlanId}`}
        open={showSettings}
        onClose={() => setShowSettings(false)}
        board={plan}
      />

      {!showAssistant && (
        <button
          onClick={() => setShowAssistant(true)}
          className="ai-fab group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-text text-brand-bg shadow-lg shadow-brand-text/25 transition-transform hover:scale-105 hover:shadow-xl active:scale-95 sm:bottom-6 sm:right-6"
          title="Open AI assistant"
          aria-label="Open AI assistant"
        >
          <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" />
        </button>
      )}

      <AssistantChat
        open={showAssistant}
        onClose={() => setShowAssistant(false)}
        planId={typedPlanId}
        columns={columns ?? []}
      />
    </Layout>
  );
}
