// Simulating Convex Id types
export type Id<T> = string & { __type?: T };

export interface Label {
  id: Id<'labels'>;
  boardId: Id<'boards'>;
  name: string;
  color: string;
}

export interface Card {
  id: Id<'cards'>;
  columnId: Id<'columns'>;
  boardId: Id<'boards'>;
  title: string;
  description?: string;
  order: string; // Fractional index
  labelIds: Id<'labels'>[];
  dueDate?: number;
  isComplete: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: number;
  updatedAt: number;
}

export interface Column {
  id: Id<'columns'>;
  boardId: Id<'boards'>;
  title: string;
  order: string;
  color?: string;
  createdAt: number;
}

export interface Board {
  id: Id<'boards'>;
  userId: string;
  name: string;
  slug: string;
  color: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

// Initial Mock Data
export const mockLabels: Label[] = [
  { id: 'l1', boardId: 'board_1', name: 'Bug', color: '#E63B2E' },
  { id: 'l2', boardId: 'board_1', name: 'Feature', color: '#111111' },
];

export const mockColumns: Column[] = [
  { id: 'col_1', boardId: 'board_1', title: 'To Do', order: 'a0', createdAt: Date.now() },
  { id: 'col_2', boardId: 'board_1', title: 'In Progress', order: 'a1', createdAt: Date.now() },
  { id: 'col_3', boardId: 'board_1', title: 'Done', order: 'a2', createdAt: Date.now() },
];

export const mockCards: Card[] = [
  {
    id: 'card_1',
    columnId: 'col_1',
    boardId: 'board_1',
    title: 'Implement real-time sync',
    description: 'Use Convex to broadcast fractional index changes.',
    order: 'a0',
    labelIds: ['l2'],
    isComplete: false,
    priority: 'high',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'card_2',
    columnId: 'col_1',
    boardId: 'board_1',
    title: 'Drag & Drop precision',
    order: 'a1',
    labelIds: [],
    isComplete: false,
    priority: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'card_3',
    columnId: 'col_2',
    boardId: 'board_1',
    title: 'Design high-density data view',
    description: 'Use Brutalist Signal aesthetics from GEMINI.md.',
    order: 'a0',
    labelIds: ['l1', 'l2'],
    isComplete: false,
    priority: 'urgent',
    dueDate: Date.now() + 86400000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const mockBoard: Board = {
  id: 'board_1',
  userId: 'user_1',
  name: 'FlowBoard Demo',
  slug: 'flowboard-demo',
  color: '#E8E4DD',
  isFavorite: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
