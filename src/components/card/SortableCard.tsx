import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./Card";
import type { CardProps } from "./Card";

interface SortableCardProps extends Omit<CardProps, "isDragging"> {
  onClick?: () => void;
}

export function SortableCard(props: SortableCardProps) {
  const { card } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card._id,
    data: { type: "Card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full h-[100px] bg-brand-text/5 border-2 border-brand-text/20 border-dashed rounded-[1.5rem]"
      />
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      {...props}
      isDragging={false}
    />
  );
}
