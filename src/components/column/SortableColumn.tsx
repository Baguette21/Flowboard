import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Column } from "./Column";
import type { BoardMemberSummary } from "../../lib/types";

interface SortableColumnProps {
  column: Doc<"columns">;
  cards: Doc<"cards">[];
  labels: Doc<"labels">[];
  members: BoardMemberSummary[];
  onCardClick: (cardId: Id<"cards">) => void;
}

export function SortableColumn(props: SortableColumnProps) {
  const { column } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column._id,
    data: { type: "Column", column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Column
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}
