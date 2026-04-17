import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { generateKeyBetween } from "fractional-indexing";
import { format as fmtDate } from "date-fns";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";
import { useTableState } from "./useTableState";
import { ColumnHeaderMenu } from "./ColumnMenu";
import { FilterBar } from "./FilterBar";
import { RowDetailModal } from "./RowDetail";
import type {
  TableProps,
  TableColumnDef,
  CellValue,
  ColumnType,
  SelectOption,
  ViewMode,
} from "./types";
import { COLUMN_TYPE_META, DEFAULT_STATUS_OPTIONS } from "./types";
import {
  Plus,
  Table2,
  LayoutGrid,
  List,
  GalleryHorizontalEnd,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Link,
  Check,
  Hash,
  Type,
  CheckSquare,
  User,
  Tags,
  MousePointer,
  FunctionSquare,
  CircleDot,
  ThumbsUp,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// Table — Main Component
// ════════════════════════════════════════════════════════════════════════════
export function Table({
  boardId,
  cards,
  columns: boardColumns,
  labels,
  forcedMode,
  showViewModeTabs = true,
}: TableProps) {
  const members = useQuery(api.boardMembers.listForBoard, { boardId });
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId });
  const createCard = useMutation(api.cards.create);
  const updateCard = useMutation(api.cards.update);
  const moveCard = useMutation(api.cards.move);
  const toggleComplete = useMutation(api.cards.toggleComplete);
  const deleteCard = useMutation(api.cards.remove);

  const {
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
  } = useTableState(boardId, cards, boardColumns);

  const [detailCardId, setDetailCardId] = useState<Id<"cards"> | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("text");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "column" | "row";
    id: string;
  } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number;
    y: number;
    cardId: string;
  } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    colId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // ── Labels map ─────────────────────────────────────────────────────────
  const labelsById = useMemo(
    () => new Map(labels.map((l) => [l._id, l])),
    [labels],
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        actions.redo();
        return;
      }

      // Navigation
      if (state.activeCell && !state.editingCell) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            navigateCell("up");
            break;
          case "ArrowDown":
            e.preventDefault();
            navigateCell("down");
            break;
          case "ArrowLeft":
            e.preventDefault();
            navigateCell("left");
            break;
          case "ArrowRight":
          case "Tab":
            e.preventDefault();
            navigateCell("right");
            break;
          case "Enter":
            e.preventDefault();
            actions.setEditingCell(state.activeCell);
            break;
          case "Escape":
            e.preventDefault();
            actions.setActiveCell(null);
            break;
        }
      }

      if (state.editingCell && e.key === "Escape") {
        e.preventDefault();
        actions.setEditingCell(null);
      }
      if (state.editingCell && e.key === "Tab") {
        e.preventDefault();
        actions.setEditingCell(null);
        navigateCell("right");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.activeCell, state.editingCell, actions, navigateCell]);

  // ── Close context menus on click outside ───────────────────────────────
  useEffect(() => {
    if (!contextMenu && !rowContextMenu) return;
    const handler = () => {
      setContextMenu(null);
      setRowContextMenu(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu, rowContextMenu]);

  // ── Column resizing ────────────────────────────────────────────────────
  const startResize = useCallback(
    (colId: string, e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const col = state.columns.find((c) => c.id === colId);
      if (!col) return;
      resizeRef.current = { colId, startX: e.clientX, startWidth: col.width };

      const onMove = (me: globalThis.MouseEvent) => {
        if (!resizeRef.current) return;
        const delta = me.clientX - resizeRef.current.startX;
        const newWidth = Math.max(80, resizeRef.current.startWidth + delta);
        actions.updateColumn(colId, { width: newWidth });
      };
      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [state.columns, actions],
  );

  // ── Column DnD (simplified: swap on drag over header) ──────────────────
  const [dragColId, setDragColId] = useState<string | null>(null);

  const handleColDragStart = (colId: string) => {
    setDragColId(colId);
  };

  const handleColDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!dragColId || dragColId === targetColId) return;
    const ids = visibleColumns.map((c) => c.id);
    const fromIdx = ids.indexOf(dragColId);
    const toIdx = ids.indexOf(targetColId);
    if (fromIdx === -1 || toIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, dragColId);
    actions.reorderColumns(newIds);
  };

  const handleColDragEnd = () => {
    setDragColId(null);
  };

  // ── Row DnD ────────────────────────────────────────────────────────────
  const [dragRowId, setDragRowId] = useState<string | null>(null);

  const handleRowDragStart = (rowId: string) => {
    setDragRowId(rowId);
  };

  const handleRowDragOver = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    if (!dragRowId || dragRowId === targetRowId) return;
    const order = [...state.rowOrder];
    const fromIdx = order.indexOf(dragRowId);
    const toIdx = order.indexOf(targetRowId);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragRowId);
    actions.setRowOrder(order);
  };

  const handleRowDragEnd = () => {
    setDragRowId(null);
  };

  // ── Add row ────────────────────────────────────────────────────────────
  const addRow = async () => {
    const firstColumn = sortedBoardColumns[0];
    if (!firstColumn) return;
    await createCard({ boardId, columnId: firstColumn._id, title: "Untitled" });
  };

  // ── Card mutations ─────────────────────────────────────────────────────
  const commitBuiltInField = useCallback(
    async (card: Doc<"cards">, colDef: TableColumnDef, value: CellValue) => {
      switch (colDef.builtIn) {
        case "title": {
          const v = String(value).trim() || "Untitled";
          if (v !== card.title) await updateCard({ cardId: card._id, title: v });
          break;
        }
        case "description": {
          const v = String(value).trim() || undefined;
          if (v !== (card.description ?? ""))
            await updateCard({ cardId: card._id, description: v });
          break;
        }
        case "group": {
          const nextColId = value as Id<"columns">;
          if (nextColId !== card.columnId) {
            const targetCards = (cards ?? [])
              .filter((c) => c.columnId === nextColId && c._id !== card._id)
              .sort((a, b) => a.order.localeCompare(b.order));
            const lastKey =
              targetCards.length > 0
                ? targetCards[targetCards.length - 1].order
                : null;
            const newOrder = generateKeyBetween(lastKey, null);
            await moveCard({ cardId: card._id, targetColumnId: nextColId, newOrder });
          }
          break;
        }
        case "priority": {
          const v = value === "" ? undefined : (value as Doc<"cards">["priority"]);
          if (v !== card.priority) await updateCard({ cardId: card._id, priority: v });
          break;
        }
        case "dueDate": {
          const v = value ? new Date(String(value)).getTime() : undefined;
          if (v !== card.dueDate) await updateCard({ cardId: card._id, dueDate: v });
          break;
        }
        case "assignee": {
          const v = value === "" ? null : (value as Id<"users">);
          if (v !== (card.assignedUserId ?? null))
            await updateCard({ cardId: card._id, assignedUserId: v });
          break;
        }
        case "status": {
          const shouldBeComplete = value === "completed";
          if (shouldBeComplete !== card.isComplete) await toggleComplete({ cardId: card._id });
          break;
        }
      }
    },
    [cards, updateCard, moveCard, toggleComplete],
  );

  // ── Row context menu actions ───────────────────────────────────────────
  const handleDeleteRow = async (cardId: string) => {
    await deleteCard({ cardId: cardId as Id<"cards"> });
    setRowContextMenu(null);
  };

  const handleDuplicateRow = async (cardId: string) => {
    const card = processedCards.find((c) => c._id === cardId);
    if (!card) return;
    await createCard({
      boardId,
      columnId: card.columnId,
      title: `${card.title} (copy)`,
      description: card.description,
      priority: card.priority,
      dueDate: card.dueDate,
    });
    setRowContextMenu(null);
  };

  // ── Add column ─────────────────────────────────────────────────────────
  const handleAddColumn = () => {
    const name = newColName.trim() || `New ${newColType}`;
    actions.addColumn(newColType, name);
    setIsAddingColumn(false);
    setNewColName("");
    setNewColType("text");
  };

  // ── Toggle group collapse ──────────────────────────────────────────────
  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── View mode icons ────────────────────────────────────────────────────
  const viewModes: { mode: ViewMode; label: string; icon: typeof Table2 }[] = [
    { mode: "table", label: "Table", icon: Table2 },
    { mode: "board", label: "Board", icon: LayoutGrid },
    { mode: "list", label: "List", icon: List },
    { mode: "gallery", label: "Gallery", icon: GalleryHorizontalEnd },
  ];

  // ── Resolve label for select/status display ────────────────────────────
  const resolveSelectLabel = (colDef: TableColumnDef, val: CellValue) => {
    if (val === null || val === "") return null;
    if (colDef.builtIn === "group") {
      const col = sortedBoardColumns.find((c) => c._id === val);
      return col
        ? { id: String(col._id), label: col.title, color: col.color ?? "#6B7280" }
        : null;
    }
    if (colDef.builtIn === "priority") {
      const opts = colDef.options ?? [];
      const opt = opts.find((o) => o.id === val);
      return opt ?? null;
    }
    if (colDef.builtIn === "assignee") {
      const member = (members ?? []).find((m) => m.userId === val);
      return member
        ? {
            id: String(member.userId),
            label: member.name ?? member.email ?? "Unknown",
            color: "#6B7280",
          }
        : null;
    }
    const opts = colDef.options ?? [];
    const opt = opts.find((o) => o.id === val);
    return opt ?? null;
  };

  useEffect(() => {
    if (!forcedMode || state.viewConfig.mode === forcedMode) {
      return;
    }

    actions.setViewMode(forcedMode);
  }, [actions, forcedMode, state.viewConfig.mode]);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-full flex-col bg-brand-bg">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-text/8 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          {showViewModeTabs && (
            <>
              {/* View mode tabs */}
              <div className="flex items-center gap-1 rounded-lg bg-brand-primary/60 p-0.5">
                {viewModes.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => actions.setViewMode(mode)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                      state.viewConfig.mode === mode
                        ? "bg-brand-bg text-brand-text shadow-sm"
                        : "text-brand-text/45 hover:text-brand-text/70",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Undo/Redo */}
          <button
            onClick={actions.undo}
            disabled={!canUndo}
            className="rounded-md p-1.5 text-brand-text/30 transition-colors hover:bg-brand-text/8 hover:text-brand-text disabled:opacity-20"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={actions.redo}
            disabled={!canRedo}
            className="rounded-md p-1.5 text-brand-text/30 transition-colors hover:bg-brand-text/8 hover:text-brand-text disabled:opacity-20"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-5 w-px bg-brand-text/10" />

          <FilterBar
            columns={state.columns}
            viewConfig={state.viewConfig}
            boardColumns={sortedBoardColumns}
            members={members ?? []}
            actions={actions}
            compact
          />

          {/* New row */}
          <button
            onClick={() => void addRow()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs font-medium text-brand-text/60 transition-colors hover:border-brand-text/25 hover:text-brand-text"
          >
            <Plus className="h-3.5 w-3.5" />
            New row
          </button>

          {/* Add column */}
          <button
            onClick={() => setIsAddingColumn(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs font-medium text-brand-text/60 transition-colors hover:border-brand-text/25 hover:text-brand-text"
          >
            <Plus className="h-3.5 w-3.5" />
            Add column
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      {false && <FilterBar
        columns={state.columns}
        viewConfig={state.viewConfig}
        boardColumns={sortedBoardColumns}
        members={members ?? []}
        actions={actions}
      />}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" ref={tableRef}>
        {state.viewConfig.mode === "table" ? (
          <TableView
            visibleColumns={visibleColumns}
            processedCards={processedCards}
            groupedCards={groupedCards}
            collapsedGroups={collapsedGroups}
            toggleGroupCollapse={toggleGroupCollapse}
            state={state}
            actions={actions}
            getCellValue={getCellValue}
            getCalculation={getCalculation}
            commitBuiltInField={commitBuiltInField}
            resolveSelectLabel={resolveSelectLabel}
            sortedBoardColumns={sortedBoardColumns}
            members={members ?? []}
            labelsById={labelsById}
            accessInfo={accessInfo}
            hoveredRow={hoveredRow}
            setHoveredRow={setHoveredRow}
            startResize={startResize}
            onRowClick={(id) => setDetailCardId(id as Id<"cards">)}
            onRowContextMenu={(e, id) => {
              e.preventDefault();
              setRowContextMenu({ x: e.clientX, y: e.clientY, cardId: id });
            }}
            onColumnContextMenu={(e, id) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, type: "column", id });
            }}
            onAddRow={() => void addRow()}
            setIsAddingColumn={setIsAddingColumn}
            newColName={newColName}
            setNewColName={setNewColName}
            newColType={newColType}
            setNewColType={setNewColType}
            handleAddColumn={handleAddColumn}
            dragColId={dragColId}
            handleColDragStart={handleColDragStart}
            handleColDragOver={handleColDragOver}
            handleColDragEnd={handleColDragEnd}
            dragRowId={dragRowId}
            handleRowDragStart={handleRowDragStart}
            handleRowDragOver={handleRowDragOver}
            handleRowDragEnd={handleRowDragEnd}
          />
        ) : state.viewConfig.mode === "board" ? (
          <BoardView
            processedCards={processedCards}
            groupedCards={groupedCards}
            sortedBoardColumns={sortedBoardColumns}
            labelsById={labelsById}
            onCardClick={(id) => setDetailCardId(id as Id<"cards">)}
          />
        ) : state.viewConfig.mode === "list" ? (
          <ListView
            boardId={boardId}
            processedCards={processedCards}
            visibleColumns={visibleColumns}
            getCellValue={getCellValue}
            resolveSelectLabel={resolveSelectLabel}
            labelsById={labelsById}
            dragRowId={dragRowId}
            handleRowDragStart={handleRowDragStart}
            handleRowDragOver={handleRowDragOver}
            handleRowDragEnd={handleRowDragEnd}
            onCardClick={(id) => setDetailCardId(id as Id<"cards">)}
          />
        ) : (
          <GalleryView
            processedCards={processedCards}
            visibleColumns={visibleColumns}
            getCellValue={getCellValue}
            resolveSelectLabel={resolveSelectLabel}
            labelsById={labelsById}
            onCardClick={(id) => setDetailCardId(id as Id<"cards">)}
          />
        )}
      </div>

      {/* ── Column Header Context Menu ──────────────────────────────────── */}
      {contextMenu?.type === "column" && (
        <ColumnHeaderMenu
          x={contextMenu.x}
          y={contextMenu.y}
          columnId={contextMenu.id}
          columns={state.columns}
          viewConfig={state.viewConfig}
          actions={actions}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Row Context Menu ────────────────────────────────────────────── */}
      {rowContextMenu && (
        <div
          className="fixed z-[200] min-w-[180px] overflow-hidden rounded-lg border border-brand-text/12 bg-brand-primary py-1 shadow-xl"
          style={{ left: rowContextMenu.x, top: rowContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => void handleDuplicateRow(rowContextMenu.cardId)}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-brand-text transition-colors hover:bg-brand-bg"
          >
            <Copy className="h-3.5 w-3.5 text-brand-text/40" />
            Duplicate
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/card/${rowContextMenu.cardId}`,
              );
              setRowContextMenu(null);
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-brand-text transition-colors hover:bg-brand-bg"
          >
            <Link className="h-3.5 w-3.5 text-brand-text/40" />
            Copy link
          </button>
          <div className="my-1 h-px bg-brand-text/8" />
          <button
            onClick={() => void handleDeleteRow(rowContextMenu.cardId)}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-brand-accent transition-colors hover:bg-brand-accent/8"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}

      {/* ── Add Column Modal ────────────────────────────────────────────── */}
      {isAddingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-brand-text/20 backdrop-blur-sm"
            onClick={() => setIsAddingColumn(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-brand-text/10 bg-brand-bg p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-brand-text">Add Column</h3>
            <div className="space-y-3">
              <input
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Column name"
                className="w-full rounded-lg border border-brand-text/12 bg-brand-primary/50 px-3 py-2 text-sm text-brand-text outline-none placeholder:text-brand-text/30 focus:border-brand-text/25"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") setIsAddingColumn(false);
                }}
              />
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(COLUMN_TYPE_META) as ColumnType[]).map((type) => {
                  const meta = COLUMN_TYPE_META[type];
                  const IconMap: Record<string, typeof Type> = {
                    Type,
                    Hash,
                    ChevronDown,
                    Tags,
                    User,
                    CheckSquare,
                    CircleDot,
                    MousePointer,
                    FunctionSquare,
                  };
                  const Icon = IconMap[meta.icon] ?? Type;
                  return (
                    <button
                      key={type}
                      onClick={() => setNewColType(type)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                        newColType === type
                          ? "bg-brand-text text-brand-bg"
                          : "bg-brand-primary/60 text-brand-text/60 hover:bg-brand-primary hover:text-brand-text",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColName("");
                    setNewColType("text");
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-brand-text/50 transition-colors hover:text-brand-text"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddColumn}
                  className="rounded-lg bg-brand-text px-4 py-2 text-sm font-medium text-brand-bg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Row Detail Modal ────────────────────────────────────────────── */}
      {detailCardId && (
        <RowDetailModal
          cardId={detailCardId}
          boardId={boardId}
          columns={visibleColumns}
          boardColumns={sortedBoardColumns}
          labels={labels}
          members={members ?? []}
          customCells={state.customCells}
          getCellValue={getCellValue}
          resolveSelectLabel={resolveSelectLabel}
          canManageAssignees={accessInfo?.canManageAssignees ?? false}
          onClose={() => setDetailCardId(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TABLE VIEW — the main spreadsheet-like table
// ════════════════════════════════════════════════════════════════════════════
interface TableViewProps {
  visibleColumns: TableColumnDef[];
  processedCards: Doc<"cards">[];
  groupedCards: Map<string, Doc<"cards">[]> | null;
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (key: string) => void;
  state: ReturnType<typeof useTableState>["state"];
  actions: ReturnType<typeof useTableState>["actions"];
  getCellValue: (card: Doc<"cards">, col: TableColumnDef) => CellValue;
  getCalculation: (colId: string) => string | null;
  commitBuiltInField: (card: Doc<"cards">, col: TableColumnDef, val: CellValue) => Promise<void>;
  resolveSelectLabel: (col: TableColumnDef, val: CellValue) => SelectOption | null;
  sortedBoardColumns: Doc<"columns">[];
  members: { userId: Id<"users">; name: string | null; email: string | null }[];
  labelsById: Map<Id<"labels">, Doc<"labels">>;
  accessInfo: { canManageAssignees: boolean } | undefined | null;
  hoveredRow: string | null;
  setHoveredRow: (id: string | null) => void;
  startResize: (colId: string, e: ReactMouseEvent) => void;
  onRowClick: (id: string) => void;
  onRowContextMenu: (e: ReactMouseEvent, id: string) => void;
  onColumnContextMenu: (e: ReactMouseEvent, id: string) => void;
  onAddRow: () => void;
  setIsAddingColumn: (v: boolean) => void;
  newColName: string;
  setNewColName: (v: string) => void;
  newColType: ColumnType;
  setNewColType: (v: ColumnType) => void;
  handleAddColumn: () => void;
  dragColId: string | null;
  handleColDragStart: (id: string) => void;
  handleColDragOver: (e: React.DragEvent, id: string) => void;
  handleColDragEnd: () => void;
  dragRowId: string | null;
  handleRowDragStart: (id: string) => void;
  handleRowDragOver: (e: React.DragEvent, id: string) => void;
  handleRowDragEnd: () => void;
}

function TableView({
  visibleColumns,
  processedCards,
  groupedCards,
  collapsedGroups,
  toggleGroupCollapse,
  state,
  actions,
  getCellValue,
  getCalculation,
  commitBuiltInField,
  resolveSelectLabel,
  sortedBoardColumns,
  members,
  labelsById,
  accessInfo,
  hoveredRow,
  setHoveredRow,
  startResize,
  onRowClick,
  onRowContextMenu,
  onColumnContextMenu,
  onAddRow,
  setIsAddingColumn,
  dragColId,
  handleColDragStart,
  handleColDragOver,
  handleColDragEnd,
  dragRowId,
  handleRowDragStart,
  handleRowDragOver,
  handleRowDragEnd,
}: TableViewProps) {
  const totalWidth = visibleColumns.reduce((s, c) => s + c.width, 0) + 140;

  const renderRows = (rows: Doc<"cards">[]) =>
    rows.map((card) => (
      <tr
        key={card._id}
        draggable
        onDragStart={() => handleRowDragStart(card._id)}
        onDragOver={(e) => handleRowDragOver(e, card._id)}
        onDragEnd={handleRowDragEnd}
        onMouseEnter={() => setHoveredRow(card._id)}
        onMouseLeave={() => setHoveredRow(null)}
        onContextMenu={(e) => onRowContextMenu(e, card._id)}
        className={cn(
          "group border-b border-brand-text/6 transition-colors",
          dragRowId === card._id && "opacity-40",
          hoveredRow === card._id && "bg-brand-primary/40",
        )}
      >
        {visibleColumns.map((col) => {
          const isActive =
            state.activeCell?.rowId === card._id &&
            state.activeCell?.colId === col.id;
          const isEditing =
            state.editingCell?.rowId === card._id &&
            state.editingCell?.colId === col.id;

          return (
            <td
              key={col.id}
              style={{
                width: col.width,
                minWidth: col.width,
                maxWidth: col.wrapContent ? col.width : undefined,
              }}
              className={cn(
                "border-r border-brand-text/6 px-0 py-0",
                isActive && "ring-2 ring-inset ring-brand-accent/40",
                col.frozen && "sticky left-0 z-10 bg-brand-bg",
              )}
              onClick={() => {
                actions.setActiveCell({ rowId: card._id, colId: col.id });
                if (isActive && !isEditing) {
                  actions.setEditingCell({ rowId: card._id, colId: col.id });
                }
              }}
            >
              <CellRenderer
                card={card}
                colDef={col}
                value={getCellValue(card, col)}
                isEditing={isEditing}
                resolveSelectLabel={resolveSelectLabel}
                sortedBoardColumns={sortedBoardColumns}
                members={members}
                labelsById={labelsById}
                accessInfo={accessInfo}
                onCommitBuiltIn={(val) => void commitBuiltInField(card, col, val)}
                onCommitCustom={(val) => actions.setCell(card._id, col.id, val)}
                onStopEditing={() => actions.setEditingCell(null)}
              />
            </td>
          );
        })}

        {/* Row end action */}
        <td className="min-w-[140px] border-r-0 px-3 py-1.5">
          <button
            onClick={() => onRowClick(card._id)}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-text/20 transition-colors hover:text-brand-text/50"
          >
            Open
          </button>
        </td>
      </tr>
    ));

  return (
    <div className="min-w-max px-3 py-3 sm:px-5">
      <div className="overflow-hidden rounded-lg border border-brand-text/10 bg-brand-primary/30">
        <table className="w-full border-collapse" style={{ minWidth: totalWidth }}>
          <thead>
            <tr className="border-b border-brand-text/10 bg-brand-bg/50">
              {visibleColumns.map((col) => (
                <th
                  key={col.id}
                  draggable={!col.locked}
                  onDragStart={() => handleColDragStart(col.id)}
                  onDragOver={(e) => handleColDragOver(e, col.id)}
                  onDragEnd={handleColDragEnd}
                  onContextMenu={(e) => onColumnContextMenu(e, col.id)}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                  }}
                  className={cn(
                    "relative select-none border-r border-brand-text/10 text-left",
                    col.frozen && "sticky left-0 z-20 bg-brand-bg/50",
                    dragColId === col.id && "opacity-40",
                  )}
                >
                  <div className="flex items-start gap-1.5 px-2.5 py-2">
                    <GripVertical className="mt-1 h-3 w-3 flex-shrink-0 cursor-grab text-brand-text/18" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-brand-text">
                        {col.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brand-text/30">
                        {COLUMN_TYPE_META[col.type]?.label ?? col.type}
                      </div>
                    </div>
                    <ChevronDown
                      className="mt-1 h-3 w-3 flex-shrink-0 cursor-pointer text-brand-text/20 transition-colors hover:text-brand-text/50"
                      onClick={(e) => onColumnContextMenu(e as unknown as ReactMouseEvent, col.id)}
                    />
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-accent/30"
                    onMouseDown={(e) => startResize(col.id, e)}
                  />
                </th>
              ))}

              {/* Add column header */}
              <th className="min-w-[140px] border-r-0 px-3 py-2 text-left">
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-text/35 transition-colors hover:text-brand-text/60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add column
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {groupedCards ? (
              Array.from(groupedCards.entries()).map(([groupKey, rows]) => {
                const isCollapsed = collapsedGroups.has(groupKey);
                return (
                  <GroupSection
                    key={groupKey}
                    groupKey={groupKey}
                    rows={rows}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleGroupCollapse(groupKey)}
                    colSpan={visibleColumns.length + 2}
                    renderRows={renderRows}
                  />
                );
              })
            ) : (
              renderRows(processedCards)
            )}

            {/* Empty placeholder row + Add row */}
            <tr className="border-t border-brand-text/8">
              <td className="sticky left-0 z-10 w-10 border-r border-brand-text/8 bg-brand-bg/30 px-1 py-2" />
              {visibleColumns.map((col) => (
                <td
                  key={col.id}
                  style={{ width: col.width, minWidth: col.width }}
                  className="border-r border-brand-text/8 bg-brand-bg/15 px-3 py-2"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text/15">
                    Empty
                  </span>
                </td>
              ))}
              <td className="min-w-[140px] bg-brand-bg/15 px-3 py-2">
                <button
                  onClick={onAddRow}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-text/35 transition-colors hover:text-brand-text/60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New row
                </button>
              </td>
            </tr>

            {/* Calculations row */}
            {Object.values(state.viewConfig.calculations).some((c) => c !== "none") && (
              <tr className="border-t-2 border-brand-text/10 bg-brand-bg/40">
                <td className="sticky left-0 z-10 w-10 border-r border-brand-text/10 px-1 py-2" />
                {visibleColumns.map((col) => {
                  const calc = getCalculation(col.id);
                  return (
                    <td
                      key={col.id}
                      style={{ width: col.width }}
                      className="border-r border-brand-text/10 px-3 py-2"
                    >
                      {calc && (
                        <span className="font-mono text-xs font-medium text-brand-text/50">
                          {calc}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="min-w-[140px] px-3 py-2" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GROUP SECTION — collapsible group of rows
// ════════════════════════════════════════════════════════════════════════════
function GroupSection({
  groupKey,
  rows,
  isCollapsed,
  onToggle,
  colSpan,
  renderRows,
}: {
  groupKey: string;
  rows: Doc<"cards">[];
  isCollapsed: boolean;
  onToggle: () => void;
  colSpan: number;
  renderRows: (rows: Doc<"cards">[]) => React.ReactNode;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-brand-text/10 bg-brand-bg/60 transition-colors hover:bg-brand-bg/80"
        onClick={onToggle}
      >
        <td colSpan={colSpan} className="px-4 py-2">
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-brand-text/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-brand-text/40" />
            )}
            <span className="text-sm font-semibold text-brand-text">{groupKey}</span>
            <span className="font-mono text-[10px] text-brand-text/30">
              {rows.length} {rows.length === 1 ? "row" : "rows"}
            </span>
          </div>
        </td>
      </tr>
      {!isCollapsed && renderRows(rows)}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CELL RENDERER — renders the appropriate cell for each column type
// ════════════════════════════════════════════════════════════════════════════
interface CellRendererProps {
  card: Doc<"cards">;
  colDef: TableColumnDef;
  value: CellValue;
  isEditing: boolean;
  resolveSelectLabel: (col: TableColumnDef, val: CellValue) => SelectOption | null;
  sortedBoardColumns: Doc<"columns">[];
  members: { userId: Id<"users">; name: string | null; email: string | null }[];
  labelsById: Map<Id<"labels">, Doc<"labels">>;
  accessInfo: { canManageAssignees: boolean } | undefined | null;
  onCommitBuiltIn: (val: CellValue) => void;
  onCommitCustom: (val: CellValue) => void;
  onStopEditing: () => void;
}

function CellRenderer({
  card,
  colDef,
  value,
  isEditing,
  resolveSelectLabel,
  sortedBoardColumns,
  members,
  labelsById,
  accessInfo,
  onCommitBuiltIn,
  onCommitCustom,
  onStopEditing,
}: CellRendererProps) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  // Built-in fields
  if (colDef.builtIn) {
    switch (colDef.builtIn) {
      case "title":
        return (
          <input
            defaultValue={card.title}
            onClick={stop}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = card.title;
                e.currentTarget.blur();
                onStopEditing();
              }
            }}
            onBlur={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            className="w-full bg-transparent px-3 py-2 text-sm font-medium text-brand-text outline-none"
          />
        );

      case "description":
        return (
          <input
            defaultValue={card.description ?? ""}
            placeholder="Empty"
            onClick={stop}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onBlur={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            className="w-full bg-transparent px-3 py-2 text-sm text-brand-text/60 outline-none placeholder:text-brand-text/20"
          />
        );

      case "group":
        return (
          <select
            value={card.columnId}
            onClick={stop}
            onChange={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            className="themed-select-popup w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
            style={{ colorScheme: "inherit" }}
          >
            {sortedBoardColumns.map((col) => (
              <option key={col._id} value={col._id}>
                {col.title}
              </option>
            ))}
          </select>
        );

      case "priority": {
        const opt = resolveSelectLabel(colDef, value);
        if (!isEditing && opt) {
          return (
            <div className="px-3 py-1.5">
              <span
                className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: opt.color }}
              >
                {opt.label}
              </span>
            </div>
          );
        }
        return (
          <select
            value={String(value ?? "")}
            onClick={stop}
            onChange={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            onBlur={onStopEditing}
            className="themed-select-popup w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
            style={{ colorScheme: "inherit" }}
          >
            <option value="">Empty</option>
            {(colDef.options ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }

      case "dueDate":
        return (
          <input
            type="datetime-local"
            value={String(value ?? "")}
            onClick={stop}
            onChange={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            className="w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
          />
        );

      case "assignee": {
        const member = members.find((m) => m.userId === value);
        if (!isEditing && member) {
          return (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/15 text-[10px] font-bold text-brand-accent">
                {(member.name ?? member.email ?? "?")[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-brand-text/70">
                {member.name ?? member.email ?? "Unknown"}
              </span>
            </div>
          );
        }
        return (
          <select
            value={String(value ?? "")}
            disabled={!(accessInfo?.canManageAssignees ?? false)}
            onClick={stop}
            onChange={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            onBlur={onStopEditing}
            className="themed-select-popup w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none disabled:cursor-not-allowed disabled:text-brand-text/30"
            style={{ colorScheme: "inherit" }}
          >
            <option value="">Empty</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name ?? m.email ?? "Unknown"}
              </option>
            ))}
          </select>
        );
      }

      case "status": {
        const statusOpts = colDef.options ?? DEFAULT_STATUS_OPTIONS;
        const opt = statusOpts.find((o) => o.id === value);
        if (!isEditing && opt) {
          return (
            <div className="px-3 py-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: opt.color }}
              >
                {opt.id === "completed" && <Check className="h-3 w-3" />}
                {opt.label}
              </span>
            </div>
          );
        }
        return (
          <select
            value={String(value ?? "todo")}
            onClick={stop}
            onChange={(e) => {
              onCommitBuiltIn(e.target.value);
              onStopEditing();
            }}
            onBlur={onStopEditing}
            className="themed-select-popup w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
            style={{ colorScheme: "inherit" }}
          >
            {statusOpts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }

      case "labels": {
        const labelArr = Array.isArray(value) ? value : [];
        const resolved = labelArr
          .map((id) => labelsById.get(id as Id<"labels">))
          .filter((l): l is Doc<"labels"> => !!l);
        return (
          <div className="flex flex-wrap gap-1 px-3 py-1.5">
            {resolved.length > 0 ? (
              resolved.map((l) => (
                <span
                  key={l._id}
                  className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold text-white/90"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-brand-text/20">Empty</span>
            )}
          </div>
        );
      }

      default:
        return <div className="px-3 py-2 text-sm text-brand-text/30">—</div>;
    }
  }

  // Custom column types
  switch (colDef.type) {
    case "text":
      return (
        <input
          type="text"
          defaultValue={typeof value === "string" ? value : ""}
          placeholder="Empty"
          onClick={stop}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            onCommitCustom(e.target.value);
            onStopEditing();
          }}
          className="w-full bg-transparent px-3 py-2 text-sm text-brand-text/70 outline-none placeholder:text-brand-text/20"
        />
      );

    case "number":
      return (
        <input
          type="number"
          defaultValue={typeof value === "number" ? value : ""}
          placeholder="Empty"
          onClick={stop}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            onCommitCustom(e.target.value === "" ? null : Number(e.target.value));
            onStopEditing();
          }}
          className="w-full bg-transparent px-3 py-2 text-sm text-brand-text/70 outline-none placeholder:text-brand-text/20"
        />
      );

    case "checkbox":
      return (
        <div className="flex items-center justify-center px-3 py-2" onClick={stop}>
          <button
            onClick={() => {
              onCommitCustom(!value);
            }}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors",
              value
                ? "border-brand-accent bg-brand-accent text-white"
                : "border-brand-text/20 hover:border-brand-text/40",
            )}
          >
            {value && <Check className="h-3 w-3" />}
          </button>
        </div>
      );

    case "select": {
      const opt = (colDef.options ?? []).find((o) => o.id === value);
      if (!isEditing && opt) {
        return (
          <div className="px-3 py-1.5">
            <span
              className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: opt.color }}
            >
              {opt.label}
            </span>
          </div>
        );
      }
      return (
        <select
          value={String(value ?? "")}
          onClick={stop}
          onChange={(e) => {
            onCommitCustom(e.target.value || null);
            onStopEditing();
          }}
          onBlur={onStopEditing}
          autoFocus={isEditing}
          className="w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
        >
          <option value="">Empty</option>
          {(colDef.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case "multiSelect": {
      const selected = Array.isArray(value) ? value : [];
      const opts = colDef.options ?? [];
      if (!isEditing) {
        return (
          <div className="flex flex-wrap gap-1 px-3 py-1.5">
            {selected.length > 0 ? (
              selected.map((id) => {
                const o = opts.find((opt) => opt.id === id);
                return o ? (
                  <span
                    key={o.id}
                    className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold text-white/90"
                    style={{ backgroundColor: o.color }}
                  >
                    {o.label}
                  </span>
                ) : null;
              })
            ) : (
              <span className="text-xs text-brand-text/20">Empty</span>
            )}
          </div>
        );
      }
      return (
        <div className="flex flex-wrap gap-1 px-2 py-1" onClick={stop}>
          {opts.map((o) => {
            const isSelected = selected.includes(o.id);
            return (
              <button
                key={o.id}
                onClick={() => {
                  const next = isSelected
                    ? selected.filter((id) => id !== o.id)
                    : [...selected, o.id];
                  onCommitCustom(next);
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all",
                  isSelected
                    ? "text-white"
                    : "bg-brand-text/5 text-brand-text/50 hover:bg-brand-text/10",
                )}
                style={isSelected ? { backgroundColor: o.color } : undefined}
              >
                {isSelected && <Check className="h-2.5 w-2.5" />}
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "person": {
      const member = members.find((m) => m.userId === value);
      if (!isEditing && member) {
        return (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/15 text-[10px] font-bold text-brand-accent">
              {(member.name ?? member.email ?? "?")[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-brand-text/70">
              {member.name ?? member.email ?? "Unknown"}
            </span>
          </div>
        );
      }
      return (
        <select
          value={String(value ?? "")}
          onClick={stop}
          onChange={(e) => {
            onCommitCustom(e.target.value || null);
            onStopEditing();
          }}
          onBlur={onStopEditing}
          autoFocus={isEditing}
          className="w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
        >
          <option value="">Empty</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name ?? m.email ?? "Unknown"}
            </option>
          ))}
        </select>
      );
    }

    case "status": {
      const statusOpts = colDef.options ?? DEFAULT_STATUS_OPTIONS;
      const opt = statusOpts.find((o) => o.id === value);
      if (!isEditing && opt) {
        return (
          <div className="px-3 py-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: opt.color }}
            >
              {opt.id === "completed" && <Check className="h-3 w-3" />}
              {opt.label}
            </span>
          </div>
        );
      }
      return (
        <select
          value={String(value ?? "")}
          onClick={stop}
          onChange={(e) => {
            onCommitCustom(e.target.value || null);
            onStopEditing();
          }}
          onBlur={onStopEditing}
          autoFocus={isEditing}
          className="w-full bg-transparent px-3 py-2 text-sm text-brand-text outline-none"
        >
          <option value="">Empty</option>
          {statusOpts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    case "button": {
      const config = colDef.buttonConfig;
      const count = typeof value === "number" ? value : 0;
      return (
        <div className="flex items-center gap-2 px-3 py-1.5" onClick={stop}>
          <button
            onClick={() => onCommitCustom(count + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent transition-colors hover:bg-brand-accent/20"
          >
            <ThumbsUp className="h-3 w-3" />
            {config?.label ?? "Upvote"}
          </button>
          <span className="font-mono text-xs font-bold text-brand-text/50">{count}</span>
        </div>
      );
    }

    case "formula": {
      return (
        <div className="px-3 py-2 font-mono text-sm text-brand-text/50">
          {value !== null && value !== undefined ? String(value) : "—"}
        </div>
      );
    }

    default:
      return <div className="px-3 py-2 text-sm text-brand-text/20">—</div>;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BOARD VIEW — Kanban-style grouped columns
// ════════════════════════════════════════════════════════════════════════════
function BoardView({
  processedCards,
  groupedCards,
  sortedBoardColumns,
  labelsById,
  onCardClick,
}: {
  processedCards: Doc<"cards">[];
  groupedCards: Map<string, Doc<"cards">[]> | null;
  sortedBoardColumns: Doc<"columns">[];
  labelsById: Map<Id<"labels">, Doc<"labels">>;
  onCardClick: (id: string) => void;
}) {
  // Default group by the "group" column (which maps to board columns)
  const groups =
    groupedCards ??
    (() => {
      const m = new Map<string, Doc<"cards">[]>();
      for (const col of sortedBoardColumns) {
        m.set(
          col.title,
          processedCards.filter((c) => c.columnId === col._id),
        );
      }
      return m;
    })();

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {Array.from(groups.entries()).map(([key, cards]) => (
        <div
          key={key}
          className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-brand-text/10 bg-brand-primary/30"
        >
          <div className="flex items-center justify-between border-b border-brand-text/10 px-4 py-3">
            <span className="text-sm font-bold text-brand-text">{key}</span>
            <span className="font-mono text-[10px] text-brand-text/30">{cards.length}</span>
          </div>
          <div className="flex flex-col gap-2 p-2">
            {cards.map((card) => (
              <div
                key={card._id}
                onClick={() => onCardClick(card._id)}
                className="cursor-pointer rounded-lg border border-brand-text/8 bg-brand-bg p-3 transition-colors hover:border-brand-text/15 hover:shadow-sm"
              >
                <p className="text-sm font-medium text-brand-text">{card.title}</p>
                {card.priority && (
                  <span
                    className="mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{
                      backgroundColor:
                        { low: "#22C55E", medium: "#EAB308", high: "#F97316", urgent: "#E63B2E" }[
                          card.priority
                        ] ?? "#6B7280",
                    }}
                  >
                    {card.priority}
                  </span>
                )}
                {card.labelIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {card.labelIds
                      .map((id) => labelsById.get(id))
                      .filter((l): l is Doc<"labels"> => !!l)
                      .map((l) => (
                        <span
                          key={l._id}
                          className="inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium text-white/90"
                          style={{ backgroundColor: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LIST VIEW — Simplified row list
// ════════════════════════════════════════════════════════════════════════════
function ListView({
  boardId,
  processedCards,
  visibleColumns,
  getCellValue,
  resolveSelectLabel,
  labelsById,
  dragRowId,
  handleRowDragStart,
  handleRowDragOver,
  handleRowDragEnd,
  onCardClick,
}: {
  boardId: Id<"boards">;
  processedCards: Doc<"cards">[];
  visibleColumns: TableColumnDef[];
  getCellValue: (card: Doc<"cards">, col: TableColumnDef) => CellValue;
  resolveSelectLabel: (col: TableColumnDef, val: CellValue) => SelectOption | null;
  labelsById: Map<Id<"labels">, Doc<"labels">>;
  dragRowId: string | null;
  handleRowDragStart: (id: string) => void;
  handleRowDragOver: (e: React.DragEvent, id: string) => void;
  handleRowDragEnd: () => void;
  onCardClick: (id: string) => void;
}) {
  const priorityCol = visibleColumns.find((c) => c.builtIn === "priority");
  const creators = useQuery(api.activityLogs.creatorsByCardIds, {
    boardId,
    cardIds: processedCards.map((card) => card._id),
  });
  const toggleComplete = useMutation(api.cards.toggleComplete);

  return (
    <div className="px-4 py-2 sm:px-6">
      <div className="overflow-hidden border-y border-brand-text/8 bg-brand-bg">
        {processedCards.map((card) => {
          const priorityOpt = priorityCol
            ? resolveSelectLabel(priorityCol, getCellValue(card, priorityCol))
            : null;
          const creator = creators?.[card._id];

          return (
            <div
              key={card._id}
              draggable
              onDragStart={() => handleRowDragStart(card._id)}
              onDragOver={(event) => handleRowDragOver(event, card._id)}
              onDragEnd={handleRowDragEnd}
              onClick={() => onCardClick(card._id)}
              className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-brand-text/8 px-5 py-4 transition-colors hover:bg-brand-primary/20 last:border-b-0"
              style={{
                opacity: dragRowId === card._id ? 0.45 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-brand-text/18" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleComplete({ cardId: card._id });
                  }}
                  aria-label={card.isComplete ? "Mark as incomplete" : "Mark as complete"}
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors hover:border-green-500",
                    card.isComplete
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-brand-text/20 bg-brand-bg",
                  )}
                >
                  {card.isComplete && <Check className="h-3 w-3" />}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-base font-medium",
                    card.isComplete ? "text-brand-text/40 line-through" : "text-brand-text",
                  )}
                >
                  {card.title}
                </p>
                {card.description && (
                  <p className="mt-1 truncate text-sm text-brand-text/40">
                    {card.description}
                  </p>
                )}
                {creator && (
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-text/28">
                    Created by {creator.name ?? creator.email ?? "Unknown"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {priorityOpt && (
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: priorityOpt.color }}
                  >
                    {priorityOpt.label}
                  </span>
                )}
                {card.labelIds
                  .map((id) => labelsById.get(id))
                  .filter((l): l is Doc<"labels"> => !!l)
                  .slice(0, 2)
                  .map((l) => (
                    <span
                      key={l._id}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium text-white/90"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
        {processedCards.length === 0 && (
          <div className="px-5 py-16 text-center">
            <p className="font-mono text-sm text-brand-text/30">No items to display</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GALLERY VIEW — Card grid
// ════════════════════════════════════════════════════════════════════════════
function GalleryView({
  processedCards,
  visibleColumns,
  getCellValue,
  resolveSelectLabel,
  labelsById,
  onCardClick,
}: {
  processedCards: Doc<"cards">[];
  visibleColumns: TableColumnDef[];
  getCellValue: (card: Doc<"cards">, col: TableColumnDef) => CellValue;
  resolveSelectLabel: (col: TableColumnDef, val: CellValue) => SelectOption | null;
  labelsById: Map<Id<"labels">, Doc<"labels">>;
  onCardClick: (id: string) => void;
}) {
  const priorityCol = visibleColumns.find((c) => c.builtIn === "priority");

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {processedCards.map((card) => {
          const priorityOpt = priorityCol
            ? resolveSelectLabel(priorityCol, getCellValue(card, priorityCol))
            : null;

          return (
            <div
              key={card._id}
              onClick={() => onCardClick(card._id)}
              className="cursor-pointer rounded-xl border border-brand-text/10 bg-brand-primary/30 p-4 transition-all hover:border-brand-text/20 hover:shadow-md"
            >
              {/* Color bar */}
              <div
                className="mb-3 h-1 w-12 rounded-full"
                style={{
                  backgroundColor: priorityOpt?.color ?? "#E8E4DD",
                }}
              />
              <p className="text-sm font-semibold text-brand-text">{card.title}</p>
              {card.description && (
                <p className="mt-1 line-clamp-2 text-xs text-brand-text/40">
                  {card.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {card.labelIds
                  .map((id) => labelsById.get(id))
                  .filter((l): l is Doc<"labels"> => !!l)
                  .map((l) => (
                    <span
                      key={l._id}
                      className="rounded px-1.5 py-0.5 text-[9px] font-medium text-white/90"
                      style={{ backgroundColor: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
                {priorityOpt && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
                    style={{ backgroundColor: priorityOpt.color }}
                  >
                    {priorityOpt.label}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    card.isComplete ? "text-green-500" : "text-brand-text/25",
                  )}
                >
                  {card.isComplete ? "Done" : "Active"}
                </span>
                {card.dueDate && (
                  <span className="font-mono text-[10px] text-brand-text/30">
                    {fmtDate(card.dueDate, "MMM d, h:mm a")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {processedCards.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="font-mono text-sm text-brand-text/30">No items to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
