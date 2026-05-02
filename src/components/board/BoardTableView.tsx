import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { generateKeyBetween } from "fractional-indexing";
import { format } from "date-fns";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import { getAssignedUserIds } from "../../lib/assignees";

interface BoardTableViewProps {
  planId: Id<"plans">;
  cards: Doc<"cards">[] | undefined;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
}

type BuiltInColumnKind =
  | "title"
  | "description"
  | "group"
  | "priority"
  | "dueDate"
  | "assignee"
  | "status"
  | "labels";

type CustomColumnKind = "text" | "number" | "checkbox";
type TableColumnKind = BuiltInColumnKind | CustomColumnKind;
type CustomCellValue = string | number | boolean | null;

interface TableColumnConfig {
  id: string;
  label: string;
  kind: TableColumnKind;
  width: number;
  locked?: boolean;
}

type CustomCellState = Record<string, Record<string, CustomCellValue>>;

const COLUMN_KIND_OPTIONS: Array<{ value: TableColumnKind; label: string }> = [
  { value: "title", label: "Task" },
  { value: "group", label: "Group" },
  { value: "status", label: "Status" },
  { value: "labels", label: "Labels" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
];

const DEFAULT_TABLE_COLUMNS: TableColumnConfig[] = [
  { id: "title", label: "Task", kind: "title", width: 280, locked: true },
  { id: "group", label: "Group", kind: "group", width: 170 },
  { id: "status", label: "Status", kind: "status", width: 120 },
  { id: "labels", label: "Labels", kind: "labels", width: 180 },
  { id: "priority", label: "Priority", kind: "priority", width: 140 },
];

const priorityOptions = [
  { value: "", label: "Empty" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

function getColumnsStorageKey(planId: Id<"plans">) {
  return `planthing-table-columns-${planId}`;
}

function getCellsStorageKey(planId: Id<"plans">) {
  return `planthing-table-custom-cells-${planId}`;
}

function getRowOrderStorageKey(planId: Id<"plans">) {
  return `planthing-table-row-order-${planId}`;
}

function loadStoredRowOrder(planId: Id<"plans">): string[] {
  const raw = localStorage.getItem(getRowOrderStorageKey(planId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadStoredColumns(planId: Id<"plans">): TableColumnConfig[] {
  const raw = localStorage.getItem(getColumnsStorageKey(planId));
  if (!raw) {
    return DEFAULT_TABLE_COLUMNS;
  }

  try {
    const parsed = JSON.parse(raw) as TableColumnConfig[];
    if (!Array.isArray(parsed)) {
      return DEFAULT_TABLE_COLUMNS;
    }

    const normalized = parsed.map((column) => ({
      ...column,
      width: typeof column.width === "number" ? column.width : 180,
    }));
    if (!normalized.some((column) => column.kind === "labels" || column.id === "labels")) {
      const statusIndex = normalized.findIndex((column) => column.kind === "status");
      const priorityIndex = normalized.findIndex((column) => column.kind === "priority");
      const insertIndex =
        priorityIndex >= 0 ? priorityIndex : statusIndex >= 0 ? statusIndex + 1 : normalized.length;
      normalized.splice(insertIndex, 0, { id: "labels", label: "Labels", kind: "labels", width: 180 });
    }
    return normalized;
  } catch {
    return DEFAULT_TABLE_COLUMNS;
  }
}

function loadStoredCells(planId: Id<"plans">): CustomCellState {
  const raw = localStorage.getItem(getCellsStorageKey(planId));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as CustomCellState;
  } catch {
    return {};
  }
}

export function BoardTableView({
  planId,
  cards,
  columns,
  labels,
}: BoardTableViewProps) {
  const members = useQuery(api.planMembers.listForPlan, { planId });
  const accessInfo = useQuery(api.plans.getAccessInfo, { planId });
  const createCard = useMutation(api.cards.create);
  const updateCard = useMutation(api.cards.update);
  const moveCard = useMutation(api.cards.move);
  const toggleComplete = useMutation(api.cards.toggleComplete);

  const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>(() =>
    loadStoredColumns(planId),
  );
  const [customCells, setCustomCells] = useState<CustomCellState>(() =>
    loadStoredCells(planId),
  );
  const [rowOrderIds, setRowOrderIds] = useState<string[]>(() =>
    loadStoredRowOrder(planId),
  );
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnKind, setNewColumnKind] = useState<TableColumnKind>("labels");

  useEffect(() => {
    setTableColumns(loadStoredColumns(planId));
    setCustomCells(loadStoredCells(planId));
    setRowOrderIds(loadStoredRowOrder(planId));
  }, [planId]);

  useEffect(() => {
    localStorage.setItem(getColumnsStorageKey(planId), JSON.stringify(tableColumns));
  }, [planId, tableColumns]);

  useEffect(() => {
    localStorage.setItem(getCellsStorageKey(planId), JSON.stringify(customCells));
  }, [planId, customCells]);

  useEffect(() => {
    localStorage.setItem(getRowOrderStorageKey(planId), JSON.stringify(rowOrderIds));
  }, [planId, rowOrderIds]);

  const labelsById = useMemo(
    () => new Map(labels.map((label) => [label._id, label])),
    [labels],
  );
  const columnIndexById = useMemo(
    () => new Map(columns.map((column, index) => [column._id, index])),
    [columns],
  );

  useEffect(() => {
    if (!cards) {
      return;
    }

    const currentCardIds = new Set(cards.map((card) => card._id));
    const newCards = cards
      .filter((card) => !rowOrderIds.includes(card._id))
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((card) => card._id);

    const nextRowOrder = [
      ...rowOrderIds.filter((cardId) => currentCardIds.has(cardId as Id<"cards">)),
      ...newCards,
    ];

    const hasChanged =
      nextRowOrder.length !== rowOrderIds.length ||
      nextRowOrder.some((cardId, index) => rowOrderIds[index] !== cardId);

    if (hasChanged) {
      setRowOrderIds(nextRowOrder);
    }
  }, [cards, rowOrderIds]);

  const sortedCards = useMemo(() => {
    const cardsById = new Map((cards ?? []).map((card) => [card._id, card]));
    const orderedCards = rowOrderIds
      .map((cardId) => cardsById.get(cardId as Id<"cards">))
      .filter((card): card is Doc<"cards"> => Boolean(card));

    const seenIds = new Set(orderedCards.map((card) => card._id));
    const remainingCards = (cards ?? [])
      .filter((card) => !seenIds.has(card._id))
      .sort((a, b) => {
        const columnA = columnIndexById.get(a.columnId) ?? Number.MAX_SAFE_INTEGER;
        const columnB = columnIndexById.get(b.columnId) ?? Number.MAX_SAFE_INTEGER;
        if (columnA !== columnB) {
          return columnA - columnB;
        }
        return a.order.localeCompare(b.order);
      });

    return [...orderedCards, ...remainingCards];
  }, [cards, columnIndexById, rowOrderIds]);

  const sortedBoardColumns = useMemo(
    () => [...columns].sort((a, b) => a.order.localeCompare(b.order)),
    [columns],
  );

  const addRow = async () => {
    const firstColumn = sortedBoardColumns[0];
    if (!firstColumn) {
      return;
    }

    await createCard({
      planId,
      columnId: firstColumn._id,
      title: "Untitled",
    });
  };

  const commitCardTextField = async (
    card: Doc<"cards">,
    field: "title" | "description",
    nextValue: string,
  ) => {
    const trimmed = nextValue.trim();
    const currentValue = field === "title" ? card.title : (card.description ?? "");
    const normalizedNext = field === "title" ? (trimmed || "Untitled") : (trimmed || undefined);

    if ((field === "title" ? normalizedNext : normalizedNext ?? "") === currentValue) {
      return;
    }

    await updateCard({
      cardId: card._id,
      [field]: normalizedNext,
    });
  };

  const changeGroup = async (card: Doc<"cards">, nextColumnId: Id<"columns">) => {
    if (nextColumnId === card.columnId) {
      return;
    }

    const targetCards = sortedCards
      .filter((candidate) => candidate.columnId === nextColumnId && candidate._id !== card._id)
      .sort((a, b) => a.order.localeCompare(b.order));
    const lastKey = targetCards.length > 0 ? targetCards[targetCards.length - 1].order : null;
    const newOrder = generateKeyBetween(lastKey, null);

    await moveCard({
      cardId: card._id,
      targetColumnId: nextColumnId,
      newOrder,
    });
  };

  const setCustomCellValue = (
    cardId: Id<"cards">,
    columnId: string,
    value: CustomCellValue,
  ) => {
    setCustomCells((prev) => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] ?? {}),
        [columnId]: value,
      },
    }));
  };

  const addColumn = () => {
    const label = newColumnLabel.trim() || "New column";
    setTableColumns((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label,
        kind: newColumnKind,
        width: newColumnKind === "title" || newColumnKind === "description" ? 260 : 180,
      },
    ]);
    setIsAddingColumn(false);
    setNewColumnLabel("");
    setNewColumnKind("labels");
  };

  const updateColumn = (columnId: string, patch: Partial<TableColumnConfig>) => {
    setTableColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? {
              ...column,
              ...patch,
            }
          : column,
      ),
    );
  };

  const removeColumn = (columnId: string) => {
    setTableColumns((prev) =>
      prev.filter((column) => column.id !== columnId || column.locked),
    );
    setCustomCells((prev) => {
      const nextState: CustomCellState = {};
      for (const [cardId, values] of Object.entries(prev)) {
        const { [columnId]: _removed, ...rest } = values;
        nextState[cardId] = rest;
      }
      return nextState;
    });
  };

  const renderBuiltInCell = (card: Doc<"cards">, column: TableColumnConfig) => {
    const stopRowClick = (event: React.SyntheticEvent) => event.stopPropagation();

    switch (column.kind) {
      case "title":
        return (
          <input
            defaultValue={card.title}
            onClick={stopRowClick}
            onDoubleClick={stopRowClick}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            onBlur={(event) => void commitCardTextField(card, "title", event.target.value)}
            className="w-full border-0 bg-transparent px-2 py-1 text-sm font-medium text-brand-text outline-none"
          />
        );
      case "description":
        return (
          <input
            defaultValue={card.description ?? ""}
            placeholder="Empty"
            onClick={stopRowClick}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            onBlur={(event) => void commitCardTextField(card, "description", event.target.value)}
            className="w-full border-0 bg-transparent px-2 py-1 text-sm text-brand-text/70 outline-none placeholder:text-brand-text/25"
          />
        );
      case "group":
        return (
          <select
            value={card.columnId}
            onClick={stopRowClick}
            onChange={(event) => void changeGroup(card, event.target.value as Id<"columns">)}
            className="themed-select-popup w-full border-0 bg-transparent px-2 py-1 text-sm text-brand-text outline-none"
            style={{ colorScheme: "inherit" }}
          >
            {sortedBoardColumns.map((boardColumn) => (
              <option key={boardColumn._id} value={boardColumn._id}>
                {boardColumn.title}
              </option>
            ))}
          </select>
        );
      case "priority":
        return (
          <select
            value={card.priority ?? ""}
            onClick={stopRowClick}
            onChange={(event) =>
              void updateCard({
                cardId: card._id,
                priority:
                  event.target.value === ""
                    ? null
                    : (event.target.value as Doc<"cards">["priority"]),
              })
            }
            className="themed-select-popup w-full border-0 bg-transparent px-2 py-1 text-sm text-brand-text outline-none"
            style={{ colorScheme: "inherit" }}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "dueDate":
        return (
          <input
            type="datetime-local"
            value={card.dueDate ? format(card.dueDate, "yyyy-MM-dd'T'HH:mm") : ""}
            onClick={stopRowClick}
            onChange={(event) =>
              void updateCard({
                cardId: card._id,
                dueDate: event.target.value
                  ? new Date(event.target.value).getTime()
                  : undefined,
              })
            }
            className="w-full border-0 bg-transparent px-2 py-1 text-sm text-brand-text outline-none"
          />
        );
      case "assignee":
        return (
          <select
            multiple
            value={getAssignedUserIds(card)}
            disabled={!(accessInfo?.canManageAssignees ?? false)}
            onClick={stopRowClick}
            onChange={(event) =>
              {
                const selectedIds = Array.from(event.target.selectedOptions).map(
                  (option) => option.value as Id<"users">,
                );
                void updateCard({
                  cardId: card._id,
                  assignedUserIds: selectedIds,
                  assignedUserId: selectedIds[0] ?? null,
                });
              }
            }
            className="themed-select-popup min-h-20 w-full border-0 bg-transparent px-2 py-1 text-sm text-brand-text outline-none disabled:cursor-not-allowed disabled:text-brand-text/30"
            style={{ colorScheme: "inherit" }}
          >
            {(members ?? []).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name ?? member.email ?? "Unknown"}
              </option>
            ))}
          </select>
        );
      case "status":
        return (
          <label
            className="inline-flex items-center gap-2 px-2 py-1 text-sm text-brand-text/70"
            onClick={stopRowClick}
          >
            <input
              type="checkbox"
              checked={card.isComplete}
              onChange={() => void toggleComplete({ cardId: card._id })}
              className="h-4 w-4 accent-brand-text"
            />
            {card.isComplete ? "Done" : "Completed"}
          </label>
        );
      case "labels": {
        const cardLabels = card.labelIds
          .map((labelId) => labelsById.get(labelId))
          .filter((label): label is Doc<"labels"> => Boolean(label));

        return (
          <div className="flex flex-wrap gap-1 px-2 py-1">
            {cardLabels.length > 0 ? cardLabels.map((label) => (
              <span
                key={label._id}
                className="inline-flex rounded-[8px] px-2 py-1 text-[10px] font-semibold text-white/90"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            )) : (
              <span className="text-sm text-brand-text/30">Empty</span>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderCustomCell = (card: Doc<"cards">, column: TableColumnConfig) => {
    const value = customCells[card._id]?.[column.id];
    const stopRowClick = (event: React.SyntheticEvent) => event.stopPropagation();

    if (column.kind === "checkbox") {
      return (
        <label className="inline-flex items-center justify-center px-2 py-1" onClick={stopRowClick}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => setCustomCellValue(card._id, column.id, event.target.checked)}
            className="h-4 w-4 accent-brand-text"
          />
        </label>
      );
    }

    return (
      <input
        type={column.kind === "number" ? "number" : "text"}
        value={typeof value === "string" || typeof value === "number" ? value : ""}
        placeholder="Empty"
        onClick={stopRowClick}
        onChange={(event) =>
          setCustomCellValue(
            card._id,
            column.id,
            column.kind === "number"
              ? (event.target.value === "" ? null : Number(event.target.value))
              : event.target.value,
          )
        }
        className="w-full border-0 bg-transparent px-2 py-1 text-sm text-brand-text/70 outline-none placeholder:text-brand-text/25"
      />
    );
  };

  return (
    <div className="h-full overflow-auto bg-brand-bg">
      <div className="min-w-max px-3 py-3 sm:px-6 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-brand-text/48">
            <Table2 className="h-4 w-4" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">
              Table view
            </span>
            <span className="font-mono text-[11px] text-brand-text/30">
              {sortedCards.length} rows
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void addRow()}
              className="inline-flex items-center gap-2 rounded-[10px] border border-brand-text/12 px-3 py-2 text-sm text-brand-text/75 transition-colors hover:border-brand-text/28 hover:text-brand-text"
            >
              <Plus className="h-4 w-4" />
              New row
            </button>

            {isAddingColumn ? (
              <div className="flex flex-wrap items-center gap-2 border border-brand-text/12 bg-brand-primary px-2 py-2">
                <input
                  autoFocus
                  value={newColumnLabel}
                  onChange={(event) => setNewColumnLabel(event.target.value)}
                  placeholder="Column name"
                  className="h-9 w-40 border border-brand-text/12 bg-brand-bg px-3 text-sm outline-none"
                />
                <select
                  value={newColumnKind}
                  onChange={(event) => setNewColumnKind(event.target.value as TableColumnKind)}
                  className="themed-select-popup h-9 border border-brand-text/12 bg-brand-bg px-3 text-sm outline-none"
                  style={{ colorScheme: "inherit" }}
                >
                  {COLUMN_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addColumn}
                  className="inline-flex h-9 items-center rounded-[8px] bg-brand-text px-3 text-sm font-medium text-brand-bg"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnLabel("");
                    setNewColumnKind("labels");
                  }}
                  className="inline-flex h-9 items-center rounded-[8px] border border-brand-text/12 px-3 text-sm text-brand-text/60"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingColumn(true)}
                className="inline-flex items-center gap-2 rounded-[10px] border border-brand-text/12 px-3 py-2 text-sm text-brand-text/75 transition-colors hover:border-brand-text/28 hover:text-brand-text"
              >
                <Plus className="h-4 w-4" />
                Add column
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden border border-brand-text/10 bg-brand-primary">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-brand-text/10 bg-brand-bg/38">
                {tableColumns.map((column) => (
                  <th
                    key={column.id}
                    style={{ width: column.width, minWidth: column.width }}
                    className="border-r border-brand-text/10 align-top last:border-r-0"
                  >
                    <div className="flex items-start gap-2 px-3 py-2">
                      <GripVertical className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-brand-text/18" />
                      <div className="min-w-0 flex-1">
                        <input
                          value={column.label}
                          disabled={column.locked}
                          onChange={(event) => updateColumn(column.id, { label: event.target.value })}
                          className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-brand-text outline-none disabled:cursor-default"
                        />
                        <div className="mt-1 flex items-center gap-2">
                          <select
                            value={column.kind}
                            disabled={column.locked}
                            onChange={(event) =>
                              updateColumn(column.id, {
                                kind: event.target.value as TableColumnKind,
                              })
                            }
                            className="themed-select-popup w-full border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-text/35 outline-none disabled:cursor-default"
                            style={{ colorScheme: "inherit" }}
                          >
                            {COLUMN_KIND_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="h-3 w-3 flex-shrink-0 text-brand-text/20" />
                        </div>
                      </div>
                      {!column.locked && (
                        <button
                          type="button"
                          onClick={() => removeColumn(column.id)}
                          className="mt-0.5 text-brand-text/24 transition-colors hover:text-brand-accent"
                          title="Remove column"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}

                <th className="w-[140px] min-w-[140px] border-r-0 px-3 py-2 text-left">
                  <button
                    type="button"
                    onClick={() => setIsAddingColumn(true)}
                    className="inline-flex items-center gap-2 text-sm text-brand-text/45 transition-colors hover:text-brand-text"
                  >
                    <Plus className="h-4 w-4" />
                    Add column
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedCards.map((card) => (
                <tr key={card._id} className="border-b border-brand-text/8 last:border-b-0">
                  {tableColumns.map((column) => (
                    <td
                      key={column.id}
                      style={{ width: column.width, minWidth: column.width }}
                      className="border-r border-brand-text/8 align-top last:border-r-0"
                    >
                      {column.kind === "text" || column.kind === "number" || column.kind === "checkbox"
                        ? renderCustomCell(card, column)
                        : renderBuiltInCell(card, column)}
                    </td>
                  ))}
                  <td className="w-[140px] min-w-[140px] border-r-0 px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-text/18">
                      Row
                    </span>
                  </td>
                </tr>
              ))}

              <tr>
                {tableColumns.map((column) => (
                  <td
                    key={column.id}
                    style={{ width: column.width, minWidth: column.width }}
                    className="border-r border-t border-brand-text/8 bg-brand-bg/18 px-3 py-2 last:border-r-0"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text/18">
                      Empty
                    </span>
                  </td>
                ))}
                <td className="w-[140px] min-w-[140px] border-t border-brand-text/8 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void addRow()}
                    className="inline-flex items-center gap-2 text-sm text-brand-text/45 transition-colors hover:text-brand-text"
                  >
                    <Plus className="h-4 w-4" />
                    New row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {sortedCards.length === 0 && (
          <div className="border-x border-b border-brand-text/10 bg-brand-primary px-4 py-8 text-center">
            <p className="font-mono text-sm text-brand-text/38">
              This view behaves like a sheet. Add columns, then add rows.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
