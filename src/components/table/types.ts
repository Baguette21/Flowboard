import type { Id, Doc } from "../../../convex/_generated/dataModel";

// ── Column Types ───────────────────────────────────────────────────────────
export type ColumnType =
  | "text"
  | "number"
  | "select"
  | "multiSelect"
  | "date"
  | "person"
  | "checkbox"
  | "status"
  | "button"
  | "formula";

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export const DEFAULT_SELECT_COLORS = [
  "#22C55E", "#3B82F6", "#EAB308", "#E63B2E", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#6B7280", "#111111",
];

export const DEFAULT_STATUS_OPTIONS: SelectOption[] = [
  { id: "todo", label: "To Do", color: "#6B7280" },
  { id: "in_progress", label: "In Progress", color: "#3B82F6" },
  { id: "completed", label: "Completed", color: "#22C55E" },
];

export const DEFAULT_PRIORITY_OPTIONS: SelectOption[] = [
  { id: "low", label: "Low", color: "#22C55E" },
  { id: "medium", label: "Medium", color: "#EAB308" },
  { id: "high", label: "High", color: "#F97316" },
  { id: "urgent", label: "Urgent", color: "#E63B2E" },
];

export interface ButtonConfig {
  label: string;
  action: "increment";
  targetColumnId: string;
}

export interface FormulaConfig {
  type: "countAll" | "sum" | "average" | "min" | "max";
  sourceColumnId: string;
}

// ── Column Definition ──────────────────────────────────────────────────────
export interface TableColumnDef {
  id: string;
  name: string;
  type: ColumnType;
  width: number;
  visible: boolean;
  frozen: boolean;
  wrapContent: boolean;
  locked?: boolean;
  builtIn?: "title" | "description" | "group" | "priority" | "dueDate" | "assignee" | "status" | "labels";
  options?: SelectOption[];
  buttonConfig?: ButtonConfig;
  formulaConfig?: FormulaConfig;
}

// ── Cell Values ────────────────────────────────────────────────────────────
export type CellValue = string | number | boolean | string[] | null;
export type RowCells = Record<string, CellValue>;
export type AllCellData = Record<string, RowCells>;

// ── Filtering ──────────────────────────────────────────────────────────────
export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "isEmpty"
  | "isNotEmpty"
  | "gt"
  | "lt"
  | "gte"
  | "lte";

export interface FilterCondition {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
}

// ── Sorting ────────────────────────────────────────────────────────────────
export interface SortCondition {
  columnId: string;
  direction: "asc" | "desc";
}

// ── Calculations ───────────────────────────────────────────────────────────
export type CalculationType =
  | "none"
  | "count"
  | "countValues"
  | "countEmpty"
  | "sum"
  | "average"
  | "min"
  | "max"
  | "percentEmpty"
  | "percentFilled";

// ── View ───────────────────────────────────────────────────────────────────
export type ViewMode = "table" | "board" | "list" | "gallery";

export interface ViewConfig {
  mode: ViewMode;
  filters: FilterCondition[];
  filterLogic: "and" | "or";
  sorts: SortCondition[];
  groupBy: string | null;
  calculations: Record<string, CalculationType>;
}

// ── State ──────────────────────────────────────────────────────────────────
export interface TableState {
  columns: TableColumnDef[];
  customCells: AllCellData;
  rowOrder: string[];
  viewConfig: ViewConfig;
  selectedRows: Set<string>;
  activeCell: { rowId: string; colId: string } | null;
  editingCell: { rowId: string; colId: string } | null;
  columnBeingResized: string | null;
}

// ── Action Types (for undo/redo) ───────────────────────────────────────────
export type TableAction =
  | { type: "SET_COLUMNS"; columns: TableColumnDef[] }
  | { type: "ADD_COLUMN"; column: TableColumnDef; afterId?: string }
  | { type: "REMOVE_COLUMN"; columnId: string }
  | { type: "UPDATE_COLUMN"; columnId: string; patch: Partial<TableColumnDef> }
  | { type: "REORDER_COLUMNS"; columnIds: string[] }
  | { type: "SET_CELL"; rowId: string; colId: string; value: CellValue }
  | { type: "SET_ROW_ORDER"; order: string[] }
  | { type: "SET_VIEW_CONFIG"; config: Partial<ViewConfig> }
  | { type: "SET_SELECTED_ROWS"; rows: Set<string> }
  | { type: "SET_ACTIVE_CELL"; cell: { rowId: string; colId: string } | null }
  | { type: "SET_EDITING_CELL"; cell: { rowId: string; colId: string } | null }
  | { type: "SET_COLUMN_RESIZING"; columnId: string | null }
  | { type: "DUPLICATE_COLUMN"; columnId: string }
  | { type: "BATCH"; actions: TableAction[] };

// ── Props ──────────────────────────────────────────────────────────────────
export interface TableProps {
  planId: Id<"plans">;
  cards: Doc<"cards">[] | undefined;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
  forcedMode?: ViewMode;
  showViewModeTabs?: boolean;
}

// ── Column type metadata ───────────────────────────────────────────────────
export const COLUMN_TYPE_META: Record<ColumnType, { label: string; icon: string }> = {
  text: { label: "Text", icon: "Type" },
  number: { label: "Number", icon: "Hash" },
  select: { label: "Select", icon: "ChevronDown" },
  multiSelect: { label: "Multi-select", icon: "Tags" },
  date: { label: "Date", icon: "Calendar" },
  person: { label: "Person", icon: "User" },
  checkbox: { label: "Checkbox", icon: "CheckSquare" },
  status: { label: "Status", icon: "CircleDot" },
  button: { label: "Button", icon: "MousePointer" },
  formula: { label: "Formula", icon: "FunctionSquare" },
};
