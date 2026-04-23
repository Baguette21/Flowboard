import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import type {
  CollisionDetection,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { SortableColumn } from "../column/SortableColumn";
import type { ColumnCountMode } from "../column/Column";
import { Card as CardComponent } from "../card/Card";
import { CreateColumn } from "../column/CreateColumn";
import { CardDetail } from "../card/CardDetail";
import { ColumnSkeleton } from "../ui/Skeleton";
import { Layers } from "lucide-react";
import { cn } from "../../lib/utils";
import type { BoardMemberSummary } from "../../lib/types";

function compareCardsByOrder(
  a: Pick<Doc<"cards">, "_id" | "order" | "createdAt">,
  b: Pick<Doc<"cards">, "_id" | "order" | "createdAt">,
) {
  const orderComparison = a.order.localeCompare(b.order);
  if (orderComparison !== 0) {
    return orderComparison;
  }

  const createdAtComparison = a.createdAt - b.createdAt;
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return a._id.localeCompare(b._id);
}

function getCountModeStorageKey(boardId: Id<"boards">) {
  return `flowboard-count-mode-${boardId}`;
}

function loadStoredCountMode(boardId: Id<"boards">): ColumnCountMode {
  if (typeof window === "undefined") return "all";
  const raw = window.localStorage.getItem(getCountModeStorageKey(boardId));
  return raw === "remaining" ? "remaining" : "all";
}

interface BoardViewProps {
  boardId: Id<"boards">;
}

export function BoardView({ boardId }: BoardViewProps) {
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId });
  const columns = useQuery(api.columns.listByBoard, { boardId });
  const cards = useQuery(api.cards.listByBoard, { boardId });
  const labels = useQuery(api.labels.listByBoard, { boardId });
  const members = useQuery(api.boardMembers.listForBoard, { boardId });

  const moveCardMutation = useMutation(api.cards.move);
  const reorderColumnMutation = useMutation(api.columns.reorder);

  // Local optimistic state for smooth DnD
  const [localColumns, setLocalColumns] = useState<typeof columns | null>(null);
  const [localCards, setLocalCards] = useState<typeof cards | null>(null);

  const displayColumns = localColumns ?? columns;
  const displayCards = localCards ?? cards;

  const [activeCard, setActiveCard] = useState<Doc<"cards"> | null>(null);
  const [activeColumn, setActiveColumn] = useState<Doc<"columns"> | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | null>(null);
  const [countMode, setCountMode] = useState<ColumnCountMode>(() =>
    loadStoredCountMode(boardId),
  );

  useEffect(() => {
    setCountMode(loadStoredCountMode(boardId));
  }, [boardId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getCountModeStorageKey(boardId), countMode);
  }, [boardId, countMode]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const orderedColumns = useMemo(
    () => [...(displayColumns ?? [])].sort((a, b) => a.order.localeCompare(b.order)),
    [displayColumns],
  );
  // columnIds MUST be in sorted visual order for DnD kit to swap correctly
  const columnIds = useMemo(
    () => orderedColumns.map((c) => c._id),
    [orderedColumns],
  );
  const membersById = useMemo(
    () =>
      new Map(
        (members ?? []).map((member) => [
          member.userId,
          member as BoardMemberSummary,
        ]),
      ),
    [members],
  );
  const columnsById = useMemo(
    () => new Map((displayColumns ?? []).map((column) => [column._id, column])),
    [displayColumns],
  );
  const activeColumnCardCount = useMemo(() => {
    if (!activeColumn) {
      return 0;
    }

    const cardsInColumn = (displayCards ?? []).filter(
      (card) => card.columnId === activeColumn._id,
    );
    return countMode === "remaining"
      ? cardsInColumn.filter((card) => !card.isComplete).length
      : cardsInColumn.length;
  }, [activeColumn, displayCards, countMode]);

  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    // ── Card dragging: pointer-first, fall back to closestCorners ──────
    if (args.active.data.current?.type !== "Column") {
      const ptr = pointerWithin(args);
      if (ptr.length > 0) return ptr;
      return closestCorners(args);
    }

    // ── Column dragging: only consider column-type droppables ──────────
    // pointerWithin is used because the drag overlay is a tiny pill — rect
    // based strategies (closestCorners/rectIntersection) are unreliable when
    // the dragged element doesn't match the droppable size.
    const columnOnly = {
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "Column",
      ),
    };
    const ptr = pointerWithin(columnOnly);
    if (ptr.length > 0) return ptr;
    return closestCenter(columnOnly);
  }, []);

  const onDragStart = useCallback((event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type === "Column") {
      setActiveColumn(event.active.data.current!.column);
      setLocalColumns([...orderedColumns]); // snapshot in sorted order
    }
    if (type === "Card") {
      setActiveCard(event.active.data.current!.card);
      setLocalCards(cards ?? []);
    }
  }, [cards, orderedColumns]);

  const onDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localCards) return;

    const isActiveCard = active.data.current?.type === "Card";
    if (!isActiveCard) return;

    const activeId = active.id as Id<"cards">;
    const isOverCard = over.data.current?.type === "Card";
    const isOverColumn = over.data.current?.type === "Column";

    if (isOverCard) {
      const overCard = over.data.current!.card as Doc<"cards">;
      if (active.data.current!.card.columnId !== overCard.columnId) {
        // Move to different column (visual only)
        setLocalCards((prev) =>
          (prev ?? []).map((c) =>
            c._id === activeId ? { ...c, columnId: overCard.columnId } : c,
          ),
        );
      }
    }

    if (isOverColumn) {
      // Read from data so it works for both `:drop` and sortable ids
      const targetColumnId = over.data.current!.column._id as Id<"columns">;
      const activeCard = localCards.find((c) => c._id === activeId);
      if (activeCard && activeCard.columnId !== targetColumnId) {
        setLocalCards((prev) =>
          (prev ?? []).map((c) =>
            c._id === activeId ? { ...c, columnId: targetColumnId } : c,
          ),
        );
      }
    }
  }, [localCards]);


  const onDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumn(null);

    if (!over) {
      setLocalColumns(null);
      setLocalCards(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // ── Column reorder ────────────────────────────────────────────────
    if (active.data.current?.type === "Column") {
      // Always read from data.current — works for both :drop and sortable ids
      const targetColumnId = over.data.current?.column?._id as Id<"columns"> | undefined;
      if (!targetColumnId || activeId === targetColumnId) { setLocalColumns(null); return; }

      // Use the sorted snapshot that was set in onDragStart
      const cols = [...(columns ?? [])].sort((a, b) => a.order.localeCompare(b.order));
      const oldIndex = cols.findIndex((c) => c._id === activeId);
      const newIndex = cols.findIndex((c) => c._id === targetColumnId);
      if (oldIndex === -1 || newIndex === -1) { setLocalColumns(null); return; }

      const reordered = arrayMove(cols, oldIndex, newIndex);
      const prev = reordered[newIndex - 1]?.order ?? null;
      const next = reordered[newIndex + 1]?.order ?? null;
      const newOrder = generateKeyBetween(prev, next);

      setLocalColumns(null);
      await reorderColumnMutation({ columnId: activeId as Id<"columns">, newOrder });
      return;
    }

    // ── Card move ─────────────────────────────────────────────────────
    if (active.data.current?.type === "Card") {
      const activeCard = (cards ?? []).find((c) => c._id === activeId);
      if (!activeCard) { setLocalCards(null); return; }

      let targetColumnId: Id<"columns">;
      let targetOrder: string;

      if (over.data.current?.type === "Column") {
        // Dropped on column — place at end; read id from data (handles :drop suffix)
        targetColumnId = over.data.current.column._id as Id<"columns">;
        const colCards = (cards ?? [])
          .filter((c) => c.columnId === targetColumnId && c._id !== activeId)
          .sort(compareCardsByOrder);
        const lastKey = colCards.length > 0 ? colCards[colCards.length - 1].order : null;
        targetOrder = generateKeyBetween(lastKey, null);
      } else if (over.data.current?.type === "Card") {
        // Dropped on card — insert before/after
        const overCard = over.data.current.card as Doc<"cards">;
        targetColumnId = overCard.columnId;

        const colCards = (cards ?? [])
          .filter((c) => c.columnId === targetColumnId && c._id !== activeId)
          .sort(compareCardsByOrder);

        const overIndex = colCards.findIndex((c) => c._id === overId);
        const prev = overIndex > 0 ? colCards[overIndex - 1].order : null;
        const next = colCards[overIndex]?.order ?? null;
        targetOrder = generateKeyBetween(prev, next);
      } else {
        setLocalCards(null);
        return;
      }

      setLocalCards(null);

      if (
        targetColumnId !== activeCard.columnId ||
        targetOrder !== activeCard.order
      ) {
        await moveCardMutation({
          cardId: activeId as Id<"cards">,
          targetColumnId,
          newOrder: targetOrder,
        });
      }
    }
  }, [columns, cards, moveCardMutation, reorderColumnMutation]);

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.4" } },
    }),
  };

  if (columns === undefined || cards === undefined) {
    return (
      <div className="flex gap-4 sm:gap-6 h-full p-3 sm:p-4 overflow-x-auto pb-6 sm:pb-8 items-start">
        {[1, 2, 3, 4].map((i) => (
          <ColumnSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex gap-4 sm:gap-6 h-full p-3 sm:p-4 overflow-x-auto pb-6 sm:pb-8 items-start">
        <div className="flex flex-col items-center justify-center w-full py-24 text-center">
          <Layers className="w-12 h-12 text-brand-text/20 mb-4" />
          <h3 className="font-serif italic font-bold text-xl mb-2">No groups yet</h3>
          <p className="font-mono text-sm text-brand-text/50 mb-6">Add a group to start organizing work</p>
        </div>
        <CreateColumn boardId={boardId} />
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-end gap-2 px-4 pt-3 sm:px-6">
            <span className="font-sans text-[11px] font-medium text-[color:var(--color-text-subtle)]">
              Count
            </span>
            <div className="inline-flex items-center gap-0.5 rounded-full card-whisper bg-brand-primary p-0.5">
              <button
                type="button"
                onClick={() => setCountMode("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition",
                  countMode === "all"
                    ? "bg-brand-text text-brand-bg"
                    : "text-[color:var(--color-text-muted)] hover:text-brand-text",
                )}
                title="Count every task in the group"
              >
                All tasks
              </button>
              <button
                type="button"
                onClick={() => setCountMode("remaining")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition",
                  countMode === "remaining"
                    ? "bg-brand-text text-brand-bg"
                    : "text-[color:var(--color-text-muted)] hover:text-brand-text",
                )}
                title="Count only tasks that aren't marked complete"
              >
                Remaining
              </button>
            </div>
          </div>

          <div className="flex flex-1 gap-6 sm:gap-8 p-4 sm:p-6 overflow-x-auto pb-6 sm:pb-8 items-start">
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              {orderedColumns.map((col) => (
                <SortableColumn
                  key={col._id}
                  column={col}
                  labels={labels ?? []}
                  members={members ?? []}
                  cards={(displayCards ?? []).filter((c) => c.columnId === col._id)}
                  onCardClick={(cardId) => setSelectedCardId(cardId)}
                  countMode={countMode}
                />
              ))}
            </SortableContext>

            <CreateColumn boardId={boardId} />
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard && (
            <CardComponent
              card={activeCard}
              labels={(labels ?? []).filter((l) =>
                activeCard.labelIds.includes(l._id),
              )}
              statusColor={columnsById.get(activeCard.columnId)?.color}
              assignee={
                activeCard.assignedUserId
                  ? membersById.get(activeCard.assignedUserId) ?? null
                  : null
              }
              isDragging
            />
          )}
          {activeColumn && (
            <div className="px-1 py-1 opacity-90">
              <div
                className="inline-flex min-h-8 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white/90 shadow-[0_12px_32px_rgba(17,17,17,0.12)]"
                style={{ backgroundColor: activeColumn.color ?? "#555" }}
              >
                {activeColumn.title}
                <span className="text-[10px] font-mono opacity-60">
                  {activeColumnCardCount}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedCardId && (
        <CardDetail
          cardId={selectedCardId}
          boardId={boardId}
          columns={orderedColumns}
          labels={labels ?? []}
          members={members ?? []}
          canManageAssignees={accessInfo?.canManageAssignees ?? false}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </>
  );
}
