import { useEffect, useRef, useState } from "react";
import { Filter, GitBranch, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { BoardMemberSummary } from "../../lib/types";
import type {
  FilterCondition,
  FilterOperator,
  SortCondition,
  TableColumnDef,
  ViewConfig,
} from "./types";

interface FilterBarProps {
  columns: TableColumnDef[];
  viewConfig: ViewConfig;
  boardColumns: Doc<"columns">[];
  members: BoardMemberSummary[];
  actions: {
    addFilter: (filter: FilterCondition) => void;
    removeFilter: (id: string) => void;
    updateFilter: (id: string, patch: Partial<FilterCondition>) => void;
    setFilterLogic: (logic: "and" | "or") => void;
    removeSort: (colId: string) => void;
    setGroupBy: (colId: string | null) => void;
  };
  compact?: boolean;
}

const FILTER_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Does not contain" },
  { value: "equals", label: "Is" },
  { value: "notEquals", label: "Is not" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Is not empty" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
];

function getDefaultOperator(column: TableColumnDef | undefined): FilterOperator {
  if (!column) {
    return "contains";
  }

  if (
    column.type === "number" ||
    column.builtIn === "dueDate" ||
    column.type === "checkbox" ||
    column.builtIn === "group" ||
    column.builtIn === "priority" ||
    column.builtIn === "assignee" ||
    column.builtIn === "status"
  ) {
    return "equals";
  }

  return "contains";
}

function getValueOptions(
  column: TableColumnDef | undefined,
  boardColumns: Doc<"columns">[],
  members: BoardMemberSummary[],
) {
  if (!column) {
    return null;
  }

  if (column.builtIn === "group") {
    return boardColumns.map((boardColumn) => ({
      value: boardColumn._id,
      label: boardColumn.title,
    }));
  }

  if (column.builtIn === "assignee") {
    return members.map((member) => ({
      value: member.userId,
      label: member.name ?? member.email ?? "Unknown",
    }));
  }

  if (column.builtIn === "status" || column.builtIn === "priority" || column.type === "select") {
    return (column.options ?? []).map((option) => ({
      value: option.id,
      label: option.label,
    }));
  }

  if (column.type === "checkbox") {
    return [
      { value: "true", label: "Checked" },
      { value: "false", label: "Unchecked" },
    ];
  }

  return null;
}

function FilterPanel({
  columns,
  viewConfig,
  boardColumns,
  members,
  actions,
  onClose,
}: Omit<FilterBarProps, "compact"> & { onClose?: () => void }) {
  const defaultColumn = columns[0];
  const hasViewState =
    viewConfig.filters.length > 0 ||
    viewConfig.sorts.length > 0 ||
    viewConfig.groupBy !== null;

  const addFilter = () => {
    if (!defaultColumn) {
      return;
    }

    actions.addFilter({
      id: `filter-${Date.now()}`,
      columnId: defaultColumn.id,
      operator: getDefaultOperator(defaultColumn),
      value: "",
    });
  };

  const clearSorts = () => {
    for (const sort of viewConfig.sorts) {
      actions.removeSort(sort.columnId);
    }
  };

  return (
    <div className="w-full rounded-[24px] border border-brand-text/10 bg-brand-bg/98 shadow-[0_20px_60px_rgba(17,17,17,0.09)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-text/8 px-4 py-4">
        <div className="flex items-center gap-2 text-brand-text/60">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/70">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand-text/35">
              View Controls
            </p>
            <p className="text-sm font-medium text-brand-text">Filters, sorts, and grouping</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addFilter}
            disabled={!defaultColumn}
            className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 px-3 py-2 text-sm text-brand-text/70 transition-colors hover:border-brand-text/20 hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add filter
          </button>

          {viewConfig.filters.length > 1 && (
            <button
              type="button"
              onClick={() =>
                actions.setFilterLogic(viewConfig.filterLogic === "and" ? "or" : "and")
              }
              className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 px-3 py-2 text-sm text-brand-text/70 transition-colors hover:border-brand-text/20 hover:text-brand-text"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Match {viewConfig.filterLogic === "and" ? "all" : "any"}
            </button>
          )}

          {viewConfig.sorts.length > 0 && (
            <button
              type="button"
              onClick={clearSorts}
              className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 px-3 py-2 text-sm text-brand-text/70 transition-colors hover:border-brand-text/20 hover:text-brand-text"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear sorts
            </button>
          )}

          {viewConfig.groupBy && (
            <button
              type="button"
              onClick={() => actions.setGroupBy(null)}
              className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 px-3 py-2 text-sm text-brand-text/70 transition-colors hover:border-brand-text/20 hover:text-brand-text"
            >
              <X className="h-3.5 w-3.5" />
              Clear grouping
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-text/10 text-brand-text/55 transition-colors hover:border-brand-text/20 hover:text-brand-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {hasViewState ? (
        <div className="flex flex-col gap-3 p-4">
          {viewConfig.filters.map((filter) => {
            const column = columns.find((entry) => entry.id === filter.columnId);
            const valueOptions = getValueOptions(column, boardColumns, members);
            const hidesValueInput =
              filter.operator === "isEmpty" || filter.operator === "isNotEmpty";

            return (
              <div
                key={filter.id}
                className="grid gap-2 rounded-[20px] border border-brand-text/8 bg-brand-primary/30 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <select
                  value={filter.columnId}
                  onChange={(event) => {
                    const nextColumn = columns.find((entry) => entry.id === event.target.value);
                    actions.updateFilter(filter.id, {
                      columnId: event.target.value,
                      operator: getDefaultOperator(nextColumn),
                      value: "",
                    });
                  }}
                  className="themed-select-popup rounded-2xl border border-brand-text/10 bg-brand-bg/90 px-3 py-2 text-sm text-brand-text outline-none"
                  style={{ colorScheme: "inherit" }}
                >
                  {columns.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filter.operator}
                  onChange={(event) =>
                    actions.updateFilter(filter.id, {
                      operator: event.target.value as FilterOperator,
                    })
                  }
                  className="themed-select-popup rounded-2xl border border-brand-text/10 bg-brand-bg/90 px-3 py-2 text-sm text-brand-text outline-none"
                  style={{ colorScheme: "inherit" }}
                >
                  {FILTER_OPERATORS.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>

                {hidesValueInput ? (
                  <div className="rounded-2xl border border-dashed border-brand-text/10 px-3 py-2 text-sm text-brand-text/35">
                    No value needed
                  </div>
                ) : valueOptions ? (
                  <select
                    value={filter.value}
                    onChange={(event) =>
                      actions.updateFilter(filter.id, { value: event.target.value })
                    }
                    className="themed-select-popup rounded-2xl border border-brand-text/10 bg-brand-bg/90 px-3 py-2 text-sm text-brand-text outline-none"
                    style={{ colorScheme: "inherit" }}
                  >
                    <option value="">Empty</option>
                    {valueOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={filter.value}
                    onChange={(event) =>
                      actions.updateFilter(filter.id, { value: event.target.value })
                    }
                    placeholder="Value"
                    className="rounded-2xl border border-brand-text/10 bg-brand-bg/90 px-3 py-2 text-sm text-brand-text outline-none placeholder:text-brand-text/25"
                  />
                )}

                <button
                  type="button"
                  onClick={() => actions.removeFilter(filter.id)}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-brand-text/10 px-3 text-brand-text/55 transition-colors hover:border-brand-accent/25 hover:text-brand-accent"
                  title="Remove filter"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {(viewConfig.sorts.length > 0 || viewConfig.groupBy) && (
            <div className="flex flex-wrap gap-2">
              {viewConfig.sorts.map((sort: SortCondition) => {
                const column = columns.find((entry) => entry.id === sort.columnId);
                if (!column) {
                  return null;
                }

                return (
                  <span
                    key={sort.columnId}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 bg-brand-bg/85 px-3 py-1.5 text-xs text-brand-text/60"
                  >
                    Sort: {column.name} ({sort.direction})
                  </span>
                );
              })}

              {viewConfig.groupBy && (
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 bg-brand-bg/85 px-3 py-1.5 text-xs text-brand-text/60">
                  Grouped by{" "}
                  {columns.find((entry) => entry.id === viewConfig.groupBy)?.name ?? "Unknown"}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-text/28">
            No filters, sorts, or grouping applied.
          </p>
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  columns,
  viewConfig,
  boardColumns,
  members,
  actions,
  compact = false,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const activeCount =
    viewConfig.filters.length + viewConfig.sorts.length + (viewConfig.groupBy ? 1 : 0);

  useEffect(() => {
    if (!compact || !open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [compact, open]);

  if (!compact) {
    return (
      <FilterPanel
        columns={columns}
        viewConfig={viewConfig}
        boardColumns={boardColumns}
        members={members}
        actions={actions}
      />
    );
  }

  return (
    <div ref={shellRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-brand-text/10 bg-brand-bg px-3.5 py-2 text-sm text-brand-text/72 transition-colors hover:border-brand-text/20 hover:text-brand-text"
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-text px-1.5 py-0.5 text-[10px] font-bold text-brand-bg">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-3 w-[min(92vw,720px)]">
          <FilterPanel
            columns={columns}
            viewConfig={viewConfig}
            boardColumns={boardColumns}
            members={members}
            actions={actions}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
