import { useState, useCallback } from 'react';
import type { Card, Column } from '../mock/data';
import { mockBoard, mockCards, mockColumns, mockLabels } from '../mock/data';

export function useBoard(boardId: string) {
  const [board] = useState(mockBoard);
  const [columns, setColumns] = useState<Column[]>(mockColumns);
  const [cards, setCards] = useState<Card[]>(mockCards);
  const [labels] = useState(mockLabels);

  const moveCard = useCallback((cardId: string, newColumnId: string, newOrder: string) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? { ...card, columnId: newColumnId, order: newOrder, updatedAt: Date.now() }
          : card
      ).sort((a, b) => a.order.localeCompare(b.order))
    );
  }, []);

  const moveColumn = useCallback((columnId: string, newOrder: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, order: newOrder } : col
      ).sort((a, b) => a.order.localeCompare(b.order))
    );
  }, []);

  const addCard = useCallback((columnId: string, title: string) => {
    // Generate a temporary order string (in production this would use fractional-indexing between last item and next)
    const columnCards = cards.filter(c => c.columnId === columnId).sort((a, b) => a.order.localeCompare(b.order));
    const lastOrder = columnCards.length > 0 ? columnCards[columnCards.length - 1].order : 'a0';
    const newOrder = lastOrder + 'V'; // naive fractional index progression for mock
    
    const newCard: Card = {
      id: `card_${Date.now()}`,
      columnId,
      boardId,
      title,
      order: newOrder,
      labelIds: [],
      isComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setCards((prev) => [...prev, newCard].sort((a, b) => a.order.localeCompare(b.order)));
  }, [cards, boardId]);

  return {
    board,
    columns,
    cards,
    labels,
    moveCard,
    moveColumn,
    addCard,
  };
}
