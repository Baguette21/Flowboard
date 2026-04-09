import { useMemo, useState } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableCard } from "../card/SortableCard";
import { Card as CardComponent } from "../card/Card";
import { ColumnHeader } from "./ColumnHeader";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import type { BoardMemberSummary } from "../../lib/types";

interface ColumnProps {
  column: Doc<"columns">;
  cards: Doc<"cards">[];
  labels: Doc<"labels">[];
  members: BoardMemberSummary[];
  onCardClick: (cardId: Id<"cards">) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
  sortableCards?: boolean;
  fullWidth?: boolean;
}

export function Column({
  column,
  cards,
  labels,
  members,
  onCardClick,
  dragHandleProps,
  isDragging,
  sortableCards = true,
  fullWidth = false,
}: ColumnProps) {
  const createCard = useMutation(api.cards.create);
  const [isCreating, setIsCreating] = useState(false);

  // Use a distinct id so it doesn't conflict with the SortableColumn's useSortable id
  const { setNodeRef } = useDroppable({
    id: `${column._id}:drop`,
    data: { type: "Column", column },
  });

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.order.localeCompare(b.order)),
    [cards],
  );
  const cardIds = useMemo(() => sortedCards.map((c) => c._id), [sortedCards]);

  const handleAddCard = async () => {
    setIsCreating(true);
    try {
      const newCardId = await createCard({
        columnId: column._id,
        boardId: column.boardId,
        title: "New task",
      });
      onCardClick(newCardId);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className={[
        "flex flex-col transition-opacity",
        fullWidth ? "w-full max-w-none" : "flex-shrink-0 w-[85vw] max-w-[300px]",
        isDragging ? "opacity-40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Outer card envelope */}
      <div
        className="flex flex-col rounded-lg border border-brand-text/10 bg-brand-primary/60 p-3"
        style={
          column.color
            ? { borderColor: `${column.color}30`, backgroundColor: `${column.color}0D` }
            : undefined
        }
      >
      {/* Column header — pill style */}
      <ColumnHeader
        column={column}
        cardCount={sortedCards.length}
        dragHandleProps={dragHandleProps}
        onAddCard={() => void handleAddCard()}
      />

      {/* Card list — droppable zone */}
      <div
        ref={setNodeRef}
        className={[
          "space-y-2 min-h-[60px]",
          fullWidth ? "overflow-visible" : "flex-1 overflow-y-auto",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card) => {
            const assignee = card.assignedUserId
              ? (members.find((m) => m.userId === card.assignedUserId) ?? null)
              : null;
            const cardLabels = labels.filter((l) => card.labelIds.includes(l._id));

            return sortableCards ? (
              <SortableCard
                key={card._id}
                card={card}
                labels={cardLabels}
                assignee={assignee}
                statusColor={column.color}
                onClick={() => onCardClick(card._id)}
              />
            ) : (
              <CardComponent
                key={card._id}
                card={card}
                labels={cardLabels}
                assignee={assignee}
                statusColor={column.color}
                onClick={() => onCardClick(card._id)}
              />
            );
          })}
        </SortableContext>

        {sortedCards.length === 0 && (
          <div className="flex items-center justify-center h-10 text-brand-text/15 font-mono text-xs">
            Drop here
          </div>
        )}
      </div>

      {/* New card button */}
      <div className="mt-2">
        <button
          onClick={() => void handleAddCard()}
          disabled={isCreating}
          className="w-full py-2 px-3 flex items-center gap-2 text-brand-text/35 hover:text-brand-text/65 font-mono text-[12px] transition-colors group/add rounded-xl hover:bg-brand-text/5 disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          New card
        </button>
      </div>
      </div> {/* end outer card envelope */}
    </div>
  );
}
