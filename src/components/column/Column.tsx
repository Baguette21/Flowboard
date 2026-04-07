import { useMemo, useState } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableCard } from "../card/SortableCard";
import { ColumnHeader } from "./ColumnHeader";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import type { BoardMemberSummary } from "../../lib/types";

interface ColumnProps {
  column: Doc<"columns">;
  cards: Doc<"cards">[];
  labels: Doc<"labels">[];
  members: BoardMemberSummary[];
  onCardClick: (cardId: Id<"cards">) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
}

export function Column({
  column,
  cards,
  labels,
  members,
  onCardClick,
  dragHandleProps,
  isDragging,
}: ColumnProps) {
  const createCard = useMutation(api.cards.create);
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column._id,
    data: { type: "Column", column },
  });

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.order.localeCompare(b.order)),
    [cards],
  );
  const cardIds = useMemo(() => sortedCards.map((c) => c._id), [sortedCards]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      await createCard({
        columnId: column._id,
        boardId: column.boardId,
        title: trimmed,
      });
      setNewCardTitle("");
      setIsAdding(false);
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col flex-shrink-0 w-[85vw] max-w-80 max-h-full bg-brand-bg/50 border-2 border-brand-text/10 rounded-[2rem] overflow-hidden backdrop-blur-md transition-opacity ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <ColumnHeader
        column={column}
        cardCount={sortedCards.length}
        dragHandleProps={dragHandleProps}
      />

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {sortedCards.map((card) => (
            <SortableCard
              key={card._id}
              card={card}
              labels={labels.filter((l) => card.labelIds.includes(l._id))}
              assignee={
                card.assignedUserId
                  ? members.find((member) => member.userId === card.assignedUserId) ??
                    null
                  : null
              }
              onClick={() => onCardClick(card._id)}
            />
          ))}
        </SortableContext>

        {sortedCards.length === 0 && !isAdding && (
          <div className="flex items-center justify-center h-16 text-brand-text/20 font-mono text-xs text-center">
            Drop tasks here
          </div>
        )}

        {isAdding ? (
          <form onSubmit={handleAdd} className="mt-1 space-y-2">
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setIsAdding(false)}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isLoading || !newCardTitle.trim()}
              >
                Add Task
              </Button>
              <button
                type="button"
                onClick={() => { setIsAdding(false); setNewCardTitle(""); }}
                className="p-2 rounded-xl hover:bg-brand-text/10 text-brand-text/40 hover:text-brand-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full mt-1 py-2.5 px-4 rounded-[1.5rem] border-2 border-transparent hover:border-brand-text/20 hover:bg-brand-text/5 text-brand-text/40 hover:text-brand-text font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:scale-125 transition-transform" />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}
