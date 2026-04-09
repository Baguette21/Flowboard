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
        className="w-full h-[52px] bg-brand-text/5 border border-brand-text/12 border-dashed rounded-lg"
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
