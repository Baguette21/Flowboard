import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { FileText, PencilLine, Search, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";
import { getBoardIconOption } from "../../lib/boardIcons";
import { extractPlainTextFromBlockNoteContent } from "../../lib/blocknote";
import type { WorkspaceTabTarget } from "../../hooks/useBoardTabs";
import { BoardView } from "../board/BoardView";
import { BoardCalendarView } from "../board/BoardCalendarView";
import { Table } from "../table/Table";

interface NewTabPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (target: WorkspaceTabTarget) => void;
}

type PickerItem =
  | {
      kind: "plan";
      id: string;
      title: string;
      updatedAt: number;
      icon: string | null;
      color: string | null;
      role: "owner" | "member" | null;
    }
  | {
      kind: "note";
      id: string;
      title: string;
      updatedAt: number;
      content: string | null;
    }
  | {
      kind: "draw";
      id: string;
      title: string;
      updatedAt: number;
    };

function formatRelative(ms: number) {
  const diff = Date.now() - ms;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function NewTabPicker({ open, onClose, onSelect }: NewTabPickerProps) {
  const plans = useQuery(api.plans.list, open ? {} : "skip");
  const notes = useQuery(api.notes.list, open ? {} : "skip");
  const drawings = useQuery(api.drawings.list, open ? {} : "skip");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    inputRef.current?.focus();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleMouse = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleMouse);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouse);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  const items = useMemo<PickerItem[]>(() => {
    const boardItems: PickerItem[] = (plans ?? []).map((board) => ({
      kind: "plan",
      id: board._id,
      title: board.name || "Untitled plan",
      updatedAt: board.updatedAt ?? board._creationTime,
      icon: board.icon ?? null,
      color: board.color ?? null,
      role: board.role ?? null,
    }));
    const noteItems: PickerItem[] = (notes ?? []).map((note) => ({
      kind: "note",
      id: note._id,
      title: note.title || "Untitled note",
      updatedAt: note.updatedAt ?? note._creationTime,
      content: note.content ?? null,
    }));
    const drawItems: PickerItem[] = (drawings ?? []).map((drawing) => ({
      kind: "draw",
      id: drawing._id,
      title: drawing.title || "Untitled drawing",
      updatedAt: drawing.updatedAt ?? drawing._creationTime,
    }));
    return [...boardItems, ...noteItems, ...drawItems];
  }, [plans, notes, drawings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter((item) => item.title.toLowerCase().includes(q))
      : items;
    return [...base].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [activeIndex, filtered.length]);

  useEffect(() => {
    rowRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeIndex]);

  const activeItem = filtered[activeIndex] ?? null;

  const handleSelect = (item: PickerItem) => {
    onSelect({ kind: item.kind, id: item.id });
    onClose();
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeItem) handleSelect(activeItem);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-center justify-center px-4 transition-opacity duration-150",
        mounted ? "opacity-100" : "opacity-0",
      )}
      style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "flex w-[min(1100px,94vw)] flex-col overflow-hidden rounded-[12px] border border-brand-text/12 bg-brand-primary text-brand-text card-elevation transition-all duration-150",
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]",
        )}
        style={{ maxHeight: "min(680px, 88vh)" }}
      >
        <div className="flex items-center gap-3 border-b border-brand-text/10 px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-brand-text/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKey}
            placeholder="Open in new tab..."
            className="flex-1 bg-transparent text-[15px] text-brand-text placeholder:text-brand-text/35 focus:outline-none"
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <div ref={listRef} className="min-w-0 flex-1 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-brand-text/45">
                No plans, notes, or drawings match.
              </div>
            ) : (
              <PickerGroups
                items={filtered}
                activeIndex={activeIndex}
                onHover={setActiveIndex}
                onSelect={handleSelect}
                rowRefs={rowRefs}
              />
            )}
          </div>

          <div className="hidden w-[580px] flex-shrink-0 border-l border-brand-text/10 p-3 sm:block">
            {activeItem ? (
              <PreviewCard item={activeItem} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-brand-text/35">
                No selection
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-brand-text/10 px-4 py-2 text-[12px] text-brand-text/50">
          <ShortcutHint combo="↵" label="Open in new tab" />
          <ShortcutHint combo="↑↓" label="Navigate" />
          <ShortcutHint combo="Esc" label="Close" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ShortcutHint({ combo, label }: { combo: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded bg-brand-text/8 px-1.5 py-0.5 font-mono text-[11px] text-brand-text/70">
        {combo}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

interface PickerGroupsProps {
  items: PickerItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: PickerItem) => void;
  rowRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
}

function PickerGroups({
  items,
  activeIndex,
  onHover,
  onSelect,
  rowRefs,
}: PickerGroupsProps) {
  const groups: { label: string; entries: { item: PickerItem; index: number }[] }[] = [
    { label: "Plans", entries: [] },
    { label: "Notes", entries: [] },
    { label: "Drawings", entries: [] },
  ];
  items.forEach((item, index) => {
    if (item.kind === "plan") groups[0].entries.push({ item, index });
    else if (item.kind === "note") groups[1].entries.push({ item, index });
    else groups[2].entries.push({ item, index });
  });

  rowRefs.current.length = items.length;

  return (
    <div className="flex flex-col">
      {groups
        .filter((group) => group.entries.length > 0)
        .map((group) => (
          <div key={group.label} className="py-1">
            <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-text/40">
              {group.label}
            </div>
            {group.entries.map(({ item, index }) => (
              <button
                key={`${item.kind}-${item.id}`}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                type="button"
                onMouseEnter={() => onHover(index)}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  index === activeIndex
                    ? "bg-brand-text/8 text-brand-text"
                    : "text-brand-text/75 hover:bg-brand-text/5",
                )}
              >
                <ItemIcon item={item} />
                <span className="flex-1 truncate text-sm font-medium">
                  {item.title}
                </span>
                {item.kind === "plan" && item.role === "member" ? (
                  <Users className="h-3.5 w-3.5 flex-shrink-0 text-brand-text/40" />
                ) : null}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

function ItemIcon({ item }: { item: PickerItem }) {
  if (item.kind === "plan") {
    const option = getBoardIconOption(item.icon, item.color);
    const color = item.color ?? "#E63B2E";
    return (
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <option.Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (item.kind === "note") {
    return (
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[8px] bg-brand-accent/15 text-brand-accent">
        <FileText className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[8px] bg-brand-accent/15 text-brand-accent">
      <PencilLine className="h-3.5 w-3.5" />
    </span>
  );
}

function PreviewCard({ item }: { item: PickerItem }) {
  const typeLabel =
    item.kind === "plan" ? "Plan" : item.kind === "note" ? "Note" : "Drawing";

  return (
    <div className="flex h-full flex-col rounded-[12px] border border-brand-text/10 bg-brand-bg p-3">
      <div className="flex items-center gap-2">
        <ItemIcon item={item} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-text/45">
          {typeLabel}
        </span>
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-tight text-brand-text">
        {item.title}
      </h3>
      <p className="mt-1 text-[11px] text-brand-text/50">
        Updated {formatRelative(item.updatedAt)}
      </p>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {item.kind === "note" ? (
          <NotePreview content={item.content} />
        ) : item.kind === "plan" ? (
          <BoardPreview planId={item.id as Id<"plans">} />
        ) : (
          <DrawPreview />
        )}
      </div>
    </div>
  );
}

function NotePreview({ content }: { content: string | null }) {
  const blocks = useMemo(() => extractFirstPageBlocks(content, 12), [content]);

  if (blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-brand-text/12 text-[11px] text-brand-text/35">
        Empty note
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-[8px] border border-brand-text/10 bg-brand-primary/60 p-3">
      <div className="space-y-1.5 text-[12px] leading-relaxed text-brand-text/80">
        {blocks.map((block, i) => {
          if (block.kind === "heading") {
            const sizeClass =
              block.level === 1
                ? "text-[14px] font-bold"
                : block.level === 2
                  ? "text-[13px] font-semibold"
                  : "text-[12px] font-semibold";
            return (
              <div key={i} className={cn(sizeClass, "text-brand-text")}>
                {block.text}
              </div>
            );
          }
          if (block.kind === "bullet") {
            return (
              <div key={i} className="flex gap-1.5 text-brand-text/75">
                <span className="text-brand-text/45">•</span>
                <span>{block.text}</span>
              </div>
            );
          }
          return (
            <p key={i} className="text-brand-text/75">
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

interface NoteBlock {
  kind: "paragraph" | "heading" | "bullet";
  text: string;
  level?: number;
}

function extractFirstPageBlocks(
  content: string | null,
  maxBlocks: number,
): NoteBlock[] {
  if (!content) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const text = extractPlainTextFromBlockNoteContent(content, 400);
    return text ? [{ kind: "paragraph", text }] : [];
  }

  if (!Array.isArray(parsed)) return [];
  const blocks: NoteBlock[] = [];

  for (const node of parsed) {
    if (blocks.length >= maxBlocks) break;
    if (!node || typeof node !== "object") continue;
    const rec = node as Record<string, unknown>;
    const type = typeof rec.type === "string" ? rec.type : "";
    const text = extractInlineText(rec.content).trim();
    if (!text) continue;

    if (type === "heading") {
      const props = rec.props as Record<string, unknown> | undefined;
      const level = typeof props?.level === "number" ? props.level : 1;
      blocks.push({ kind: "heading", text, level });
    } else if (type === "bulletListItem" || type === "numberedListItem") {
      blocks.push({ kind: "bullet", text });
    } else {
      blocks.push({ kind: "paragraph", text });
    }
  }

  return blocks;
}

function extractInlineText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const rec = item as Record<string, unknown>;
      if (typeof rec.text === "string") return rec.text;
      if (Array.isArray(rec.content)) return extractInlineText(rec.content);
      return "";
    })
    .join("");
}

type BoardMode = "board" | "calendar" | "table" | "list";
const DEFAULT_BOARD_VIEW_ORDER: BoardMode[] = ["board", "calendar", "table", "list"];

function getStoredFirstView(planId: string): BoardMode {
  if (typeof window === "undefined") return DEFAULT_BOARD_VIEW_ORDER[0];
  const raw = window.localStorage.getItem(`planthing-view-order-${planId}`);
  if (!raw) return DEFAULT_BOARD_VIEW_ORDER[0];
  try {
    const parsed = JSON.parse(raw) as string[];
    const first = parsed.find((value): value is BoardMode =>
      DEFAULT_BOARD_VIEW_ORDER.includes(value as BoardMode),
    );
    return first ?? DEFAULT_BOARD_VIEW_ORDER[0];
  } catch {
    return DEFAULT_BOARD_VIEW_ORDER[0];
  }
}

const PREVIEW_SCALE = 0.5;

function BoardPreview({ planId }: { planId: Id<"plans"> }) {
  const board = useQuery(api.plans.get, { planId });
  const columns = useQuery(api.columns.listByPlan, { planId });
  const cards = useQuery(api.cards.listByPlan, { planId });
  const labels = useQuery(api.labels.listByPlan, { planId });
  const mode = getStoredFirstView(planId);

  if (
    board === undefined ||
    columns === undefined ||
    cards === undefined ||
    labels === undefined
  ) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-brand-text/35">
        Loading…
      </div>
    );
  }

  if (!board || columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-brand-text/12 text-[11px] text-brand-text/35">
        Empty plan
      </div>
    );
  }

  const inner =
    mode === "calendar" ? (
      <BoardCalendarView
        planId={planId}
        cards={cards}
        boardColor={board.color}
        columns={columns}
        labels={labels}
      />
    ) : mode === "table" || mode === "list" ? (
      <Table
        planId={planId}
        cards={cards}
        columns={columns}
        labels={labels}
        forcedMode={mode}
        showViewModeTabs={false}
      />
    ) : (
      <BoardView planId={planId} />
    );

  return <ScaledEmbed>{inner}</ScaledEmbed>;
}

function ScaledEmbed({ children }: { children: React.ReactNode }) {
  const inversePct = `${100 / PREVIEW_SCALE}%`;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[8px] border border-brand-text/10 bg-brand-bg">
      <div
        className="pointer-events-none select-none"
        aria-hidden
        tabIndex={-1}
        style={{
          width: inversePct,
          height: inversePct,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
      <div className="absolute inset-0 cursor-default" />
    </div>
  );
}

function DrawPreview() {
  return (
    <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-brand-text/12 bg-brand-primary/40">
      <svg
        viewBox="0 0 120 60"
        className="h-[70%] w-[70%] text-brand-text/35"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M8 48 Q 28 10, 52 30 T 96 18" />
        <path d="M14 54 Q 40 42, 64 46 T 108 40" opacity="0.5" />
      </svg>
    </div>
  );
}
