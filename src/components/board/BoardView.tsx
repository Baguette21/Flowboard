import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { SortableColumn } from "../column/SortableColumn";
import { Column } from "../column/Column";
import { Card as CardComponent } from "../card/Card";
import { CreateColumn } from "../column/CreateColumn";
import { CardDetail } from "../card/CardDetail";
import { ColumnSkeleton } from "../ui/Skeleton";
import { Layers } from "lucide-react";
import type { BoardMemberSummary } from "../../lib/types";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface BoardViewProps {
  boardId: Id<"boards">;
}

export function BoardView({ boardId }: BoardViewProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
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

  const columnIds = useMemo(
    () => (displayColumns ?? []).map((c) => c._id),
    [displayColumns],
  );
  const orderedColumns = useMemo(
    () => [...(displayColumns ?? [])].sort((a, b) => a.order.localeCompare(b.order)),
    [displayColumns],
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

  const onDragStart = useCallback((event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type === "Column") {
      setActiveColumn(event.active.data.current!.column);
      setLocalColumns(columns ?? []);
    }
    if (type === "Card") {
      setActiveCard(event.active.data.current!.card);
      setLocalCards(cards ?? []);
    }
  }, [columns, cards]);

  const onDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localCards) return;

    const isActiveCard = active.data.current?.type === "Card";
    if (!isActiveCard) return;

    const activeId = active.id as Id<"cards">;
    const overId = over.id;
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
      const targetColumnId = overId as Id<"columns">;
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

  const moveColumnByOffset = useCallback(async (columnId: Id<"columns">, offset: -1 | 1) => {
    const cols = columns ?? [];
    const sorted = [...cols].sort((a, b) => a.order.localeCompare(b.order));
    const currentIndex = sorted.findIndex((column) => column._id === columnId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = currentIndex + offset;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const reordered = arrayMove(sorted, currentIndex, targetIndex);
    const prev = reordered[targetIndex - 1]?.order ?? null;
    const next = reordered[targetIndex + 1]?.order ?? null;
    const newOrder = generateKeyBetween(prev, next);

    await reorderColumnMutation({ columnId, newOrder });
  }, [columns, reorderColumnMutation]);

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
      if (activeId === overId) { setLocalColumns(null); return; }

      const cols = columns ?? [];
      const oldIndex = cols.findIndex((c) => c._id === activeId);
      const newIndex = cols.findIndex((c) => c._id === overId);
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
        // Dropped on column — place at end
        targetColumnId = overId as Id<"columns">;
        const colCards = (cards ?? [])
          .filter((c) => c.columnId === targetColumnId && c._id !== activeId)
          .sort((a, b) => a.order.localeCompare(b.order));
        const lastKey = colCards.length > 0 ? colCards[colCards.length - 1].order : null;
        targetOrder = generateKeyBetween(lastKey, null);
      } else if (over.data.current?.type === "Card") {
        // Dropped on card — insert before/after
        const overCard = over.data.current.card as Doc<"cards">;
        targetColumnId = overCard.columnId;

        const colCards = (cards ?? [])
          .filter((c) => c.columnId === targetColumnId && c._id !== activeId)
          .sort((a, b) => a.order.localeCompare(b.order));

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
          <h3 className="font-serif italic font-bold text-xl mb-2">No statuses yet</h3>
          <p className="font-mono text-sm text-brand-text/50 mb-6">Add a status to start organizing work</p>
        </div>
        <CreateColumn boardId={boardId} />
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="px-4 py-4 pb-6">
            <div className="space-y-4">
              {orderedColumns.map((column) => (
                <Column
                  key={column._id}
                  column={column}
                  labels={labels ?? []}
                  members={members ?? []}
                  cards={(displayCards ?? []).filter((card) => card.columnId === column._id)}
                  onCardClick={(cardId: Id<"cards">) => setSelectedCardId(cardId)}
                  sortableCards
                  fullWidth
                  canMoveBackward={orderedColumns[0]?._id !== column._id}
                  canMoveForward={orderedColumns[orderedColumns.length - 1]?._id !== column._id}
                  onMoveBackward={() => void moveColumnByOffset(column._id, -1)}
                  onMoveForward={() => void moveColumnByOffset(column._id, 1)}
                />
              ))}
              <div className="pt-1">
                <CreateColumn boardId={boardId} fullWidth />
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeCard && (
              <CardComponent
                card={activeCard}
                labels={(labels ?? []).filter((l) =>
                  activeCard.labelIds.includes(l._id),
                )}
                assignee={
                  activeCard.assignedUserId
                    ? membersById.get(activeCard.assignedUserId) ?? null
                    : null
                }
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>

        {selectedCardId && (
          <CardDetail
            cardId={selectedCardId}
            boardId={boardId}
            labels={labels ?? []}
            members={members ?? []}
            canManageAssignees={accessInfo?.canManageAssignees ?? false}
            onClose={() => setSelectedCardId(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 sm:gap-6 h-full p-3 sm:p-4 overflow-x-auto pb-6 sm:pb-8 items-start">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {(displayColumns ?? []).map((col) => (
              <SortableColumn
                key={col._id}
                column={col}
                labels={labels ?? []}
                members={members ?? []}
                cards={(displayCards ?? []).filter((c) => c.columnId === col._id)}
                onCardClick={(cardId) => setSelectedCardId(cardId)}
                canMoveBackward={orderedColumns[0]?._id !== col._id}
                canMoveForward={orderedColumns[orderedColumns.length - 1]?._id !== col._id}
                onMoveBackward={() => void moveColumnByOffset(col._id, -1)}
                onMoveForward={() => void moveColumnByOffset(col._id, 1)}
              />
            ))}
          </SortableContext>

          <CreateColumn boardId={boardId} />
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard && (
            <CardComponent
              card={activeCard}
              labels={(labels ?? []).filter((l) =>
                activeCard.labelIds.includes(l._id),
              )}
              assignee={
                activeCard.assignedUserId
                  ? membersById.get(activeCard.assignedUserId) ?? null
                  : null
              }
              isDragging
            />
          )}
          {activeColumn && (
            <div className="w-[85vw] max-w-80 bg-brand-bg/90 border-2 border-brand-accent rounded-[2rem] p-4 flex items-center justify-center opacity-80 backdrop-blur-md shadow-2xl">
              <h3 className="font-serif italic font-bold text-lg">
                {activeColumn.title}
              </h3>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Card Detail Modal */}
      {selectedCardId && (
        <CardDetail
          cardId={selectedCardId}
          boardId={boardId}
          labels={labels ?? []}
          members={members ?? []}
          canManageAssignees={accessInfo?.canManageAssignees ?? false}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </>
  );
}
