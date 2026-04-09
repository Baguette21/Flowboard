import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import type {
  FilterCondition,
  TableColumnDef,
  ViewConfig,
  ColumnType,
  CalculationType,
  SortCondition,
} from "./types";
import { COLUMN_TYPE_META } from "./types";
import {
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Group,
  Calculator,
  Pin,
  EyeOff,
  WrapText,
  ArrowLeft,
  ArrowRight,
  Copy,
  Trash2,
  ChevronRight,
  Type,
  Hash,
  CheckSquare,
  User,
  Tags,
  CircleDot,
  MousePointer,
  FunctionSquare,
  ChevronDown,
} from "lucide-react";

interface ColumnHeaderMenuProps {
  x: number;
  y: number;
  columnId: string;
  columns: TableColumnDef[];
  viewConfig: ViewConfig;
  actions: {
    updateColumn: (id: string, patch: Partial<TableColumnDef>) => void;
    removeColumn: (id: string) => void;
    duplicateColumn: (id: string) => void;
    addColumn: (type: ColumnType, name?: string, afterId?: string) => void;
    addSort: (sort: SortCondition) => void;
    removeSort: (colId: string) => void;
    addFilter: (filter: FilterCondition) => void;
    setGroupBy: (colId: string | null) => void;
    setCalculation: (colId: string, calc: CalculationType) => void;
  };
  onClose: () => void;
}

type SubMenu = null | "changeType" | "sort" | "calculate";

export function ColumnHeaderMenu({
  x,
  y,
  columnId,
  columns,
  viewConfig,
  actions,
  onClose,
}: ColumnHeaderMenuProps) {
  const col = columns.find((c) => c.id === columnId);
  const menuRef = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<SubMenu>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(col?.name ?? "");

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the opening click from closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (subMenu) setSubMenu(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, subMenu]);

  if (!col) return null;

  // Position so menu doesn't overflow viewport
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - 500),
    zIndex: 200,
  };

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== col.name) {
      actions.updateColumn(columnId, { name: trimmed });
    }
    setIsRenaming(false);
  };

  const menuItems = [
    // Rename
    {
      key: "rename",
      icon: <Pencil className="h-3.5 w-3.5" />,
      label: "Rename",
      action: () => setIsRenaming(true),
    },
    // Change type
    {
      key: "changeType",
      icon: <Type className="h-3.5 w-3.5" />,
      label: "Change type",
      hasSubmenu: true,
      action: () => setSubMenu("changeType"),
    },
    { key: "sep1", separator: true },
    // Filter
    {
      key: "filter",
      icon: <Filter className="h-3.5 w-3.5" />,
      label: "Filter",
      action: () => {
        actions.addFilter({
          id: `filter-${Date.now()}`,
          columnId,
          operator: "contains",
          value: "",
        });
        onClose();
      },
    },
    // Sort
    {
      key: "sort",
      icon: <ArrowUpDown className="h-3.5 w-3.5" />,
      label: "Sort",
      hasSubmenu: true,
      action: () => setSubMenu("sort"),
    },
    // Group
    {
      key: "group",
      icon: <Group className="h-3.5 w-3.5" />,
      label: viewConfig.groupBy === columnId ? "Remove group" : "Group",
      action: () => {
        actions.setGroupBy(viewConfig.groupBy === columnId ? null : columnId);
        onClose();
      },
    },
    // Calculate
    {
      key: "calculate",
      icon: <Calculator className="h-3.5 w-3.5" />,
      label: "Calculate",
      hasSubmenu: true,
      action: () => setSubMenu("calculate"),
    },
    { key: "sep2", separator: true },
    // Freeze
    {
      key: "freeze",
      icon: <Pin className="h-3.5 w-3.5" />,
      label: col.frozen ? "Unfreeze" : "Freeze",
      action: () => {
        actions.updateColumn(columnId, { frozen: !col.frozen });
        onClose();
      },
    },
    // Hide
    {
      key: "hide",
      icon: <EyeOff className="h-3.5 w-3.5" />,
      label: "Hide",
      disabled: col.locked,
      action: () => {
        actions.updateColumn(columnId, { visible: false });
        onClose();
      },
    },
    // Wrap content
    {
      key: "wrap",
      icon: <WrapText className="h-3.5 w-3.5" />,
      label: col.wrapContent ? "Disable wrap" : "Wrap content",
      action: () => {
        actions.updateColumn(columnId, { wrapContent: !col.wrapContent });
        onClose();
      },
    },
    { key: "sep3", separator: true },
    // Insert left
    {
      key: "insertLeft",
      icon: <ArrowLeft className="h-3.5 w-3.5" />,
      label: "Insert left",
      action: () => {
        const idx = columns.findIndex((c) => c.id === columnId);
        const beforeId = idx > 0 ? columns[idx - 1].id : undefined;
        actions.addColumn("text", "New column", beforeId);
        onClose();
      },
    },
    // Insert right
    {
      key: "insertRight",
      icon: <ArrowRight className="h-3.5 w-3.5" />,
      label: "Insert right",
      action: () => {
        actions.addColumn("text", "New column", columnId);
        onClose();
      },
    },
    // Duplicate
    {
      key: "duplicate",
      icon: <Copy className="h-3.5 w-3.5" />,
      label: "Duplicate property",
      action: () => {
        actions.duplicateColumn(columnId);
        onClose();
      },
    },
    { key: "sep4", separator: true },
    // Delete
    {
      key: "delete",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      label: "Delete property",
      danger: true,
      disabled: col.locked,
      action: () => {
        actions.removeColumn(columnId);
        onClose();
      },
    },
  ];

  const typeOptions: { type: ColumnType; icon: typeof Type }[] = [
    { type: "text", icon: Type },
    { type: "number", icon: Hash },
    { type: "select", icon: ChevronDown },
    { type: "multiSelect", icon: Tags },
    { type: "person", icon: User },
    { type: "checkbox", icon: CheckSquare },
    { type: "status", icon: CircleDot },
    { type: "button", icon: MousePointer },
    { type: "formula", icon: FunctionSquare },
  ];

  const calcOptions: { calc: CalculationType; label: string }[] = [
    { calc: "none", label: "None" },
    { calc: "count", label: "Count all" },
    { calc: "countValues", label: "Count values" },
    { calc: "countEmpty", label: "Count empty" },
    { calc: "sum", label: "Sum" },
    { calc: "average", label: "Average" },
    { calc: "min", label: "Min" },
    { calc: "max", label: "Max" },
    { calc: "percentFilled", label: "Percent filled" },
    { calc: "percentEmpty", label: "Percent empty" },
  ];

  return createPortal(
    <div ref={menuRef} style={menuStyle}>
      {/* Main menu */}
      <div
        className={cn(
          "min-w-[220px] overflow-hidden rounded-xl border border-brand-text/12 bg-brand-primary py-1.5 shadow-xl",
          subMenu && "hidden",
        )}
      >
        {isRenaming ? (
          <div className="px-3 py-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              onBlur={handleRename}
              className="w-full rounded-md border border-brand-text/15 bg-brand-bg px-2.5 py-1.5 text-sm text-brand-text outline-none focus:border-brand-text/30"
            />
          </div>
        ) : (
          menuItems.map((item) => {
            if ("separator" in item && item.separator) {
              return <div key={item.key} className="my-1 h-px bg-brand-text/8" />;
            }
            const { key, icon, label, action, hasSubmenu, danger, disabled } =
              item as {
                key: string;
                icon: React.ReactNode;
                label: string;
                action: () => void;
                hasSubmenu?: boolean;
                danger?: boolean;
                disabled?: boolean;
              };
            return (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) action();
                }}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors",
                  danger
                    ? "text-brand-accent hover:bg-brand-accent/8"
                    : "text-brand-text hover:bg-brand-bg/80",
                  disabled && "cursor-not-allowed opacity-30",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-brand-text/40">{icon}</span>
                  {label}
                </span>
                {hasSubmenu && <ChevronRight className="h-3 w-3 text-brand-text/25" />}
              </button>
            );
          })
        )}
      </div>

      {/* Change Type submenu */}
      {subMenu === "changeType" && (
        <div className="min-w-[200px] overflow-hidden rounded-xl border border-brand-text/12 bg-brand-primary py-1.5 shadow-xl">
          <button
            onClick={() => setSubMenu(null)}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-brand-text/50 hover:bg-brand-bg/80"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <div className="my-1 h-px bg-brand-text/8" />
          {typeOptions.map(({ type, icon: Icon }) => (
            <button
              key={type}
              onClick={() => {
                actions.updateColumn(columnId, { type });
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-brand-bg/80",
                col.type === type
                  ? "font-semibold text-brand-accent"
                  : "text-brand-text",
              )}
            >
              <Icon className="h-3.5 w-3.5 text-brand-text/40" />
              {COLUMN_TYPE_META[type].label}
            </button>
          ))}
        </div>
      )}

      {/* Sort submenu */}
      {subMenu === "sort" && (
        <div className="min-w-[200px] overflow-hidden rounded-xl border border-brand-text/12 bg-brand-primary py-1.5 shadow-xl">
          <button
            onClick={() => setSubMenu(null)}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-brand-text/50 hover:bg-brand-bg/80"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <div className="my-1 h-px bg-brand-text/8" />
          <button
            onClick={() => {
              actions.removeSort(columnId);
              actions.addSort({ columnId, direction: "asc" });
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-brand-text transition-colors hover:bg-brand-bg/80"
          >
            <ArrowUp className="h-3.5 w-3.5 text-brand-text/40" />
            Sort ascending
          </button>
          <button
            onClick={() => {
              actions.removeSort(columnId);
              actions.addSort({ columnId, direction: "desc" });
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-brand-text transition-colors hover:bg-brand-bg/80"
          >
            <ArrowDown className="h-3.5 w-3.5 text-brand-text/40" />
            Sort descending
          </button>
          {viewConfig.sorts.some((s) => s.columnId === columnId) && (
            <>
              <div className="my-1 h-px bg-brand-text/8" />
              <button
                onClick={() => {
                  actions.removeSort(columnId);
                  onClose();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-brand-accent transition-colors hover:bg-brand-accent/8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove sort
              </button>
            </>
          )}
        </div>
      )}

      {/* Calculate submenu */}
      {subMenu === "calculate" && (
        <div className="min-w-[200px] overflow-hidden rounded-xl border border-brand-text/12 bg-brand-primary py-1.5 shadow-xl">
          <button
            onClick={() => setSubMenu(null)}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-brand-text/50 hover:bg-brand-bg/80"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <div className="my-1 h-px bg-brand-text/8" />
          {calcOptions.map(({ calc, label }) => (
            <button
              key={calc}
              onClick={() => {
                actions.setCalculation(columnId, calc);
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-brand-bg/80",
                viewConfig.calculations[columnId] === calc
                  ? "font-semibold text-brand-accent"
                  : "text-brand-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
