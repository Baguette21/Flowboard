import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { format } from "date-fns";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type {
  TableState,
  TableAction,
  TableColumnDef,
  AllCellData,
  ViewConfig,
  CellValue,
  FilterCondition,
  SortCondition,
  CalculationType,
  ColumnType,
} from "./types";
import { DEFAULT_STATUS_OPTIONS, DEFAULT_SELECT_COLORS } from "./types";
import { getAssignedUserIds } from "../../lib/assignees";

// ── Storage Keys ───────────────────────────────────────────────────────────
const storageKey = (planId: string, suffix: string) =>
  `notion-table-${planId}-${suffix}`;

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Default columns ────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: TableColumnDef[] = [
  {
    id: "title",
    name: "Task",
    type: "text",
    width: 300,
    visible: true,
    frozen: false,
    wrapContent: false,
    locked: true,
    builtIn: "title",
  },
  {
    id: "group",
    name: "Group",
    type: "select",
    width: 180,
    visible: true,
    frozen: false,
    wrapContent: false,
    builtIn: "group",
  },
  {
    id: "status",
    name: "Status",
    type: "status",
    width: 160,
    visible: true,
    frozen: false,
    wrapContent: false,
    builtIn: "status",
    options: DEFAULT_STATUS_OPTIONS,
  },
  {
    id: "labels",
    name: "Labels",
    type: "multiSelect",
    width: 180,
    visible: true,
    frozen: false,
    wrapContent: false,
    builtIn: "labels",
  },
  {
    id: "priority",
    name: "Priority",
    type: "select",
    width: 140,
    visible: true,
    frozen: false,
    wrapContent: false,
    builtIn: "priority",
    options: [
      { id: "low", label: "Low", color: "#22C55E" },
      { id: "medium", label: "Medium", color: "#EAB308" },
      { id: "high", label: "High", color: "#F97316" },
      { id: "urgent", label: "Urgent", color: "#E63B2E" },
    ],
  },
  {
    id: "assignee",
    name: "Assignee",
    type: "person",
    width: 180,
    visible: true,
    frozen: false,
    wrapContent: false,
    builtIn: "assignee",
  },
];

function withDefaultBuiltIns(columns: TableColumnDef[]) {
  const hasLabels = columns.some((column) => column.builtIn === "labels" || column.id === "labels");
  if (hasLabels) {
    return columns;
  }

  const labelColumn = DEFAULT_COLUMNS.find((column) => column.id === "labels");
  if (!labelColumn) {
    return columns;
  }

  const next = [...columns];
  const priorityIndex = next.findIndex(
    (column) => column.builtIn === "priority" || column.id === "priority",
  );
  const statusIndex = next.findIndex(
    (column) => column.builtIn === "status" || column.id === "status",
  );
  const insertIndex =
    priorityIndex >= 0 ? priorityIndex : statusIndex >= 0 ? statusIndex + 1 : next.length;
  next.splice(insertIndex, 0, { ...labelColumn });
  return next;
}

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  mode: "table",
  filters: [],
  filterLogic: "and",
  sorts: [],
  groupBy: null,
  calculations: {},
};

// ── Reducer ────────────────────────────────────────────────────────────────
function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case "SET_COLUMNS":
      return { ...state, columns: action.columns };

    case "ADD_COLUMN": {
      if (action.afterId) {
        const idx = state.columns.findIndex((c) => c.id === action.afterId);
        const next = [...state.columns];
        next.splice(idx + 1, 0, action.column);
        return { ...state, columns: next };
      }
      return { ...state, columns: [...state.columns, action.column] };
    }

    case "REMOVE_COLUMN": {
      const cols = state.columns.filter(
        (c) => c.id !== action.columnId || c.locked,
      );
      return { ...state, columns: cols };
    }

    case "UPDATE_COLUMN":
      return {
        ...state,
        columns: state.columns.map((c) =>
          c.id === action.columnId ? { ...c, ...action.patch } : c,
        ),
      };

    case "REORDER_COLUMNS": {
      const byId = new Map(state.columns.map((c) => [c.id, c]));
      const reordered = action.columnIds
        .map((id) => byId.get(id))
        .filter((c): c is TableColumnDef => !!c);
      // Append any columns not in the new order
      for (const c of state.columns) {
        if (!action.columnIds.includes(c.id)) reordered.push(c);
      }
      return { ...state, columns: reordered };
    }

    case "SET_CELL":
      return {
        ...state,
        customCells: {
          ...state.customCells,
          [action.rowId]: {
            ...(state.customCells[action.rowId] ?? {}),
            [action.colId]: action.value,
          },
        },
      };

    case "SET_ROW_ORDER":
      return { ...state, rowOrder: action.order };

    case "SET_VIEW_CONFIG":
      return {
        ...state,
        viewConfig: { ...state.viewConfig, ...action.config },
      };

    case "SET_SELECTED_ROWS":
      return { ...state, selectedRows: action.rows };

    case "SET_ACTIVE_CELL":
      return { ...state, activeCell: action.cell };

    case "SET_EDITING_CELL":
      return { ...state, editingCell: action.cell };

    case "SET_COLUMN_RESIZING":
      return { ...state, columnBeingResized: action.columnId };

    case "DUPLICATE_COLUMN": {
      const src = state.columns.find((c) => c.id === action.columnId);
      if (!src) return state;
      const newCol: TableColumnDef = {
        ...src,
        id: `custom-${Date.now()}`,
        name: `${src.name} (copy)`,
        locked: false,
        builtIn: undefined,
      };
      const idx = state.columns.findIndex((c) => c.id === action.columnId);
      const next = [...state.columns];
      next.splice(idx + 1, 0, newCol);
      // Copy cell data
      const cells = { ...state.customCells };
      for (const rowId of Object.keys(cells)) {
        if (cells[rowId]?.[action.columnId] !== undefined) {
          cells[rowId] = {
            ...cells[rowId],
            [newCol.id]: cells[rowId][action.columnId],
          };
        }
      }
      return { ...state, columns: next, customCells: cells };
    }

    case "BATCH": {
      let s = state;
      for (const a of action.actions) {
        s = tableReducer(s, a);
      }
      return s;
    }

    default:
      return state;
  }
}

// ── Undo/Redo wrapper ──────────────────────────────────────────────────────
interface HistoryState {
  past: TableState[];
  present: TableState;
  future: TableState[];
}

function historyReducer(
  state: HistoryState,
  action: TableAction | { type: "UNDO" } | { type: "REDO" },
): HistoryState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }

  // Skip history for ephemeral actions
  const ephemeral = [
    "SET_SELECTED_ROWS",
    "SET_ACTIVE_CELL",
    "SET_EDITING_CELL",
    "SET_COLUMN_RESIZING",
  ];
  if (ephemeral.includes(action.type)) {
    return {
      ...state,
      present: tableReducer(state.present, action),
    };
  }

  const newPresent = tableReducer(state.present, action);
  return {
    past: [...state.past.slice(-50), state.present],
    present: newPresent,
    future: [],
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useTableState(
  planId: Id<"plans">,
  cards: Doc<"cards">[] | undefined,
  boardColumns: Doc<"columns">[],
) {
  const colsKey = storageKey(planId, "columns");
  const cellsKey = storageKey(planId, "cells");
  const orderKey = storageKey(planId, "row-order");
  const viewKey = storageKey(planId, "view");

  const initialState: TableState = {
    columns: withDefaultBuiltIns(loadJSON<TableColumnDef[]>(colsKey, DEFAULT_COLUMNS)),
    customCells: loadJSON<AllCellData>(cellsKey, {}),
    rowOrder: loadJSON<string[]>(orderKey, []),
    viewConfig: loadJSON<ViewConfig>(viewKey, DEFAULT_VIEW_CONFIG),
    selectedRows: new Set<string>(),
    activeCell: null,
    editingCell: null,
    columnBeingResized: null,
  };

  const [history, rawDispatch] = useReducer(historyReducer, {
    past: [],
    present: initialState,
    future: [],
  });

  const state = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const dispatch = useCallback(
    (action: TableAction | { type: "UNDO" } | { type: "REDO" }) => {
      rawDispatch(action);
    },
    [],
  );

  // ── Persist to localStorage ────────────────────────────────────────────
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    if (state.columns !== prev.columns) saveJSON(colsKey, state.columns);
    if (state.customCells !== prev.customCells) saveJSON(cellsKey, state.customCells);
    if (state.rowOrder !== prev.rowOrder) saveJSON(orderKey, state.rowOrder);
    if (state.viewConfig !== prev.viewConfig) saveJSON(viewKey, state.viewConfig);
    prevStateRef.current = state;
  }, [state, colsKey, cellsKey, orderKey, viewKey]);

  // ── Sync row order with cards ──────────────────────────────────────────
  useEffect(() => {
    if (!cards) return;
    const currentIds = new Set(cards.map((c) => c._id));
    const newCards = cards
      .filter((c) => !state.rowOrder.includes(c._id))
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((c) => c._id);
    const nextOrder = [
      ...state.rowOrder.filter((id) => currentIds.has(id as Id<"cards">)),
      ...newCards,
    ];
    const changed =
      nextOrder.length !== state.rowOrder.length ||
      nextOrder.some((id, i) => state.rowOrder[i] !== id);
    if (changed) {
      dispatch({ type: "SET_ROW_ORDER", order: nextOrder });
    }
  }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reload on board change ─────────────────────────────────────────────
  const prevBoardRef = useRef(planId);
  useEffect(() => {
    if (prevBoardRef.current !== planId) {
      prevBoardRef.current = planId;
      const freshState: TableState = {
        columns: withDefaultBuiltIns(
          loadJSON<TableColumnDef[]>(storageKey(planId, "columns"), DEFAULT_COLUMNS),
        ),
        customCells: loadJSON<AllCellData>(storageKey(planId, "cells"), {}),
        rowOrder: loadJSON<string[]>(storageKey(planId, "row-order"), []),
        viewConfig: loadJSON<ViewConfig>(storageKey(planId, "view"), DEFAULT_VIEW_CONFIG),
        selectedRows: new Set<string>(),
        activeCell: null,
        editingCell: null,
        columnBeingResized: null,
      };
      dispatch({ type: "SET_COLUMNS", columns: freshState.columns });
    }
  }, [planId, dispatch]);

  // ── Sorted board columns ───────────────────────────────────────────────
  const sortedBoardColumns = useMemo(
    () => [...boardColumns].sort((a, b) => a.order.localeCompare(b.order)),
    [boardColumns],
  );

  // ── Get cell value (built-in or custom) ────────────────────────────────
  const getCellValue = useCallback(
    (card: Doc<"cards">, colDef: TableColumnDef): CellValue => {
      if (colDef.builtIn) {
        switch (colDef.builtIn) {
          case "title":
            return card.title;
          case "description":
            return card.description ?? "";
          case "group":
            return card.columnId;
          case "priority":
            return card.priority ?? "";
          case "dueDate":
            return card.dueDate ? format(card.dueDate, "yyyy-MM-dd'T'HH:mm") : "";
          case "assignee":
            return getAssignedUserIds(card) as string[];
          case "status":
            return card.isComplete ? "completed" : "todo";
          case "labels":
            return card.labelIds as string[];
          default:
            return null;
        }
      }

      // Formula columns compute on the fly
      if (colDef.type === "formula" && colDef.formulaConfig) {
        return computeFormula(colDef.formulaConfig, card._id, state.customCells);
      }

      return state.customCells[card._id]?.[colDef.id] ?? null;
    },
    [state.customCells],
  );

  // ── Visible columns ────────────────────────────────────────────────────
  const visibleColumns = useMemo(
    () => state.columns.filter((c) => c.visible),
    [state.columns],
  );

  // ── Sorted + filtered cards ────────────────────────────────────────────
  const processedCards = useMemo(() => {
    if (!cards) return [];

    const cardsById = new Map(cards.map((c) => [c._id, c]));
    let result = state.rowOrder
      .map((id) => cardsById.get(id as Id<"cards">))
      .filter((c): c is Doc<"cards"> => !!c);

    // Add any cards not in order
    const seenIds = new Set(result.map((c) => c._id));
    for (const c of cards) {
      if (!seenIds.has(c._id)) result.push(c);
    }

    // Apply filters
    const { filters, filterLogic } = state.viewConfig;
    if (filters.length > 0) {
      result = result.filter((card) => {
        const results = filters.map((f) =>
          matchesFilter(card, f, state.columns, state.customCells),
        );
        return filterLogic === "and"
          ? results.every(Boolean)
          : results.some(Boolean);
      });
    }

    // Apply sorts
    const { sorts } = state.viewConfig;
    if (sorts.length > 0) {
      result = [...result].sort((a, b) => {
        for (const sort of sorts) {
          const colDef = state.columns.find((c) => c.id === sort.columnId);
          if (!colDef) continue;
          const va = getCellValue(a, colDef);
          const vb = getCellValue(b, colDef);
          const cmp = compareCellValues(va, vb);
          if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    }

    return result;
  }, [cards, state.rowOrder, state.viewConfig, state.columns, state.customCells, getCellValue]);

  // ── Grouped cards ──────────────────────────────────────────────────────
  const groupedCards = useMemo(() => {
    const { groupBy } = state.viewConfig;
    if (!groupBy) return null;

    const colDef = state.columns.find((c) => c.id === groupBy);
    if (!colDef) return null;

    const groups = new Map<string, Doc<"cards">[]>();
    for (const card of processedCards) {
      const val = getCellValue(card, colDef);
      const key = val === null || val === "" ? "—" : String(val);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(card);
    }
    return groups;
  }, [processedCards, state.viewConfig, state.columns, getCellValue]);

  // ── Calculate column values ────────────────────────────────────────────
  const getCalculation = useCallback(
    (colId: string): string | null => {
      const calcType = state.viewConfig.calculations[colId];
      if (!calcType || calcType === "none") return null;

      const colDef = state.columns.find((c) => c.id === colId);
      if (!colDef) return null;

      const values = processedCards
        .map((card) => getCellValue(card, colDef))
        .filter((v) => v !== null && v !== "");

      switch (calcType) {
        case "count":
          return String(processedCards.length);
        case "countValues":
          return String(values.length);
        case "countEmpty":
          return String(processedCards.length - values.length);
        case "percentFilled":
          return `${Math.round((values.length / Math.max(processedCards.length, 1)) * 100)}%`;
        case "percentEmpty":
          return `${Math.round(((processedCards.length - values.length) / Math.max(processedCards.length, 1)) * 100)}%`;
        case "sum": {
          const nums = values.map(Number).filter((n) => !isNaN(n));
          return String(nums.reduce((a, b) => a + b, 0));
        }
        case "average": {
          const nums = values.map(Number).filter((n) => !isNaN(n));
          return nums.length > 0
            ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
            : "0";
        }
        case "min": {
          const nums = values.map(Number).filter((n) => !isNaN(n));
          return nums.length > 0 ? String(Math.min(...nums)) : "—";
        }
        case "max": {
          const nums = values.map(Number).filter((n) => !isNaN(n));
          return nums.length > 0 ? String(Math.max(...nums)) : "—";
        }
        default:
          return null;
      }
    },
    [state.viewConfig.calculations, state.columns, processedCards, getCellValue],
  );

  // ── Keyboard navigation ────────────────────────────────────────────────
  const navigateCell = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!state.activeCell) return;
      const { rowId, colId } = state.activeCell;
      const rowIdx = processedCards.findIndex((c) => c._id === rowId);
      const colIdx = visibleColumns.findIndex((c) => c.id === colId);
      if (rowIdx === -1 || colIdx === -1) return;

      let newRow = rowIdx;
      let newCol = colIdx;

      switch (direction) {
        case "up":
          newRow = Math.max(0, rowIdx - 1);
          break;
        case "down":
          newRow = Math.min(processedCards.length - 1, rowIdx + 1);
          break;
        case "left":
          newCol = Math.max(0, colIdx - 1);
          break;
        case "right":
          newCol = Math.min(visibleColumns.length - 1, colIdx + 1);
          break;
      }

      dispatch({
        type: "SET_ACTIVE_CELL",
        cell: {
          rowId: processedCards[newRow]._id,
          colId: visibleColumns[newCol].id,
        },
      });
    },
    [state.activeCell, processedCards, visibleColumns, dispatch],
  );

  // ── Convenience action creators ────────────────────────────────────────
  const actions = useMemo(
    () => ({
      addColumn: (type: ColumnType, name?: string, afterId?: string) => {
        const col: TableColumnDef = {
          id: `custom-${Date.now()}`,
          name: name || `New ${type}`,
          type,
          width: type === "checkbox" ? 100 : type === "button" ? 130 : type === "date" ? 180 : 180,
          visible: true,
          frozen: false,
          wrapContent: false,
          options:
            type === "select" || type === "multiSelect"
              ? [
                  { id: "opt1", label: "Option 1", color: DEFAULT_SELECT_COLORS[0] },
                  { id: "opt2", label: "Option 2", color: DEFAULT_SELECT_COLORS[1] },
                  { id: "opt3", label: "Option 3", color: DEFAULT_SELECT_COLORS[2] },
                ]
              : type === "status"
                ? [...DEFAULT_STATUS_OPTIONS]
                : undefined,
        };
        dispatch({ type: "ADD_COLUMN", column: col, afterId });
      },
      addColumnDef: (column: TableColumnDef, afterId?: string) =>
        dispatch({ type: "ADD_COLUMN", column, afterId }),
      removeColumn: (id: string) => dispatch({ type: "REMOVE_COLUMN", columnId: id }),
      updateColumn: (id: string, patch: Partial<TableColumnDef>) =>
        dispatch({ type: "UPDATE_COLUMN", columnId: id, patch }),
      duplicateColumn: (id: string) => dispatch({ type: "DUPLICATE_COLUMN", columnId: id }),
      batch: (actions: TableAction[]) => dispatch({ type: "BATCH", actions }),
      reorderColumns: (ids: string[]) => dispatch({ type: "REORDER_COLUMNS", columnIds: ids }),
      setCell: (rowId: string, colId: string, value: CellValue) =>
        dispatch({ type: "SET_CELL", rowId, colId, value }),
      setRowOrder: (order: string[]) => dispatch({ type: "SET_ROW_ORDER", order }),
      addFilter: (filter: FilterCondition) =>
        dispatch({
          type: "SET_VIEW_CONFIG",
          config: { filters: [...state.viewConfig.filters, filter] },
        }),
      removeFilter: (id: string) =>
        dispatch({
          type: "SET_VIEW_CONFIG",
          config: { filters: state.viewConfig.filters.filter((f) => f.id !== id) },
        }),
      updateFilter: (id: string, patch: Partial<FilterCondition>) =>
        dispatch({
          type: "SET_VIEW_CONFIG",
          config: {
            filters: state.viewConfig.filters.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          },
        }),
      setFilterLogic: (logic: "and" | "or") =>
        dispatch({ type: "SET_VIEW_CONFIG", config: { filterLogic: logic } }),
      addSort: (sort: SortCondition) =>
        dispatch({
          type: "SET_VIEW_CONFIG",
          config: { sorts: [...state.viewConfig.sorts, sort] },
        }),
      removeSort: (colId: string) =>
        dispatch({
          type: "SET_VIEW_CONFIG",
          config: { sorts: state.viewConfig.sorts.filter((s) => s.columnId !== colId) },
        }),
      setGroupBy: (colId: string | null) =>
        dispatch({ type: "SET_VIEW_CONFIG", config: { groupBy: colId } }),
      setViewMode: (mode: ViewConfig["mode"]) =>
        dispatch({ type: "SET_VIEW_CONFIG", config: { mode } }),
      setCalculation: (colId: string, calc: CalculationType) =>
        dispatch({
          type: "SET_VIEW_CONFIG",
          config: {
            calculations: { ...state.viewConfig.calculations, [colId]: calc },
          },
        }),
      selectRow: (rowId: string, multi: boolean) => {
        const next = new Set(multi ? state.selectedRows : []);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        dispatch({ type: "SET_SELECTED_ROWS", rows: next });
      },
      selectAllRows: () => {
        const allIds = processedCards.map((c) => c._id as string);
        const allSelected = allIds.every((id) => state.selectedRows.has(id));
        dispatch({
          type: "SET_SELECTED_ROWS",
          rows: allSelected ? new Set() : new Set(allIds),
        });
      },
      setActiveCell: (cell: { rowId: string; colId: string } | null) =>
        dispatch({ type: "SET_ACTIVE_CELL", cell }),
      setEditingCell: (cell: { rowId: string; colId: string } | null) =>
        dispatch({ type: "SET_EDITING_CELL", cell }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
    }),
    [dispatch, state.viewConfig, state.selectedRows, processedCards],
  );

  return {
    state,
    actions,
    canUndo,
    canRedo,
    visibleColumns,
    processedCards,
    groupedCards,
    sortedBoardColumns,
    getCellValue,
    getCalculation,
    navigateCell,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function matchesFilter(
  card: Doc<"cards">,
  filter: FilterCondition,
  columns: TableColumnDef[],
  customCells: AllCellData,
): boolean {
  const colDef = columns.find((c) => c.id === filter.columnId);
  if (!colDef) return true;

  let val: CellValue;
  if (colDef.builtIn) {
    switch (colDef.builtIn) {
      case "title":
        val = card.title;
        break;
      case "description":
        val = card.description ?? "";
        break;
      case "priority":
        val = card.priority ?? "";
        break;
      case "group":
        val = card.columnId;
        break;
      case "assignee":
        val = getAssignedUserIds(card) as string[];
        break;
      case "labels":
        val = card.labelIds as string[];
        break;
      case "status":
        val = card.isComplete ? "completed" : "todo";
        break;
      default:
        val = "";
    }
  } else {
    val = customCells[card._id]?.[colDef.id] ?? null;
  }

  const strVal = val === null ? "" : String(val);
  const filterVal = filter.value ?? "";
  const values = Array.isArray(val) ? val.map(String) : null;

  switch (filter.operator) {
    case "equals":
      return values ? values.includes(filterVal) : strVal === filterVal;
    case "notEquals":
      return values ? !values.includes(filterVal) : strVal !== filterVal;
    case "contains":
      return values
        ? values.some((entry) => entry.toLowerCase().includes(filterVal.toLowerCase()))
        : strVal.toLowerCase().includes(filterVal.toLowerCase());
    case "notContains":
      return values
        ? !values.some((entry) => entry.toLowerCase().includes(filterVal.toLowerCase()))
        : !strVal.toLowerCase().includes(filterVal.toLowerCase());
    case "isEmpty":
      return values ? values.length === 0 : strVal === "" || val === null;
    case "isNotEmpty":
      return values ? values.length > 0 : strVal !== "" && val !== null;
    case "gt":
      return Number(strVal) > Number(filterVal);
    case "lt":
      return Number(strVal) < Number(filterVal);
    case "gte":
      return Number(strVal) >= Number(filterVal);
    case "lte":
      return Number(strVal) <= Number(filterVal);
    default:
      return true;
  }
}

function compareCellValues(a: CellValue, b: CellValue): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean")
    return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b));
}

function computeFormula(
  config: { type: string; sourceColumnId: string },
  _cardId: string,
  customCells: AllCellData,
): CellValue {
  // Formula computes across all rows for the source column
  const values = Object.values(customCells)
    .map((row) => row[config.sourceColumnId])
    .filter((v) => v !== null && v !== undefined);

  const nums = values.map(Number).filter((n) => !isNaN(n));

  switch (config.type) {
    case "countAll":
      return values.length;
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "average":
      return nums.length > 0 ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
    case "min":
      return nums.length > 0 ? Math.min(...nums) : 0;
    case "max":
      return nums.length > 0 ? Math.max(...nums) : 0;
    default:
      return null;
  }
}
