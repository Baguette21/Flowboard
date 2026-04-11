import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/utils";
import { CardDetail } from "../card/CardDetail";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import type { BoardMemberSummary } from "../../lib/types";
import { toast } from "sonner";

interface BoardCalendarViewProps {
  boardId: Id<"boards">;
  cards: Doc<"cards">[] | undefined;
  boardColor: string;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
}

type DueCard = Doc<"cards"> & { dueDate: number };

const CALENDAR_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#06B6D4",
  "#22C55E",
  "#F97316",
  "#E63B2E",
  "#EC4899",
  "#EAB308",
  "#6B7280",
];

export function BoardCalendarView({
  boardId,
  cards,
  boardColor: _boardColor,
  columns,
  labels,
}: BoardCalendarViewProps) {
  const members = useQuery(api.boardMembers.listForBoard, { boardId });
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId });
  const createCard = useMutation(api.cards.create);

  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [calendarColor, setCalendarColor] = useState<string>(() => {
    return (
      localStorage.getItem(`flowboard-cal-color-${boardId}`) ??
      CALENDAR_COLORS[0]
    );
  });

  const handleCalendarColorChange = (color: string) => {
    setCalendarColor(color);
    localStorage.setItem(`flowboard-cal-color-${boardId}`, color);
    setShowColorPicker(false);
  };

  const dueCards = useMemo(
    () =>
      (cards ?? [])
        .filter((card): card is DueCard => card.dueDate !== undefined)
        .sort((a, b) => a.dueDate - b.dueDate),
    [cards],
  );

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const cardsByDay = useMemo(() => {
    const grouped = new Map<string, DueCard[]>();
    for (const card of dueCards) {
      const key = format(card.dueDate, "yyyy-MM-dd");
      const existing = grouped.get(key) ?? [];
      existing.push(card);
      grouped.set(key, existing);
    }
    return grouped;
  }, [dueCards]);

  const dueThisMonth = dueCards.filter((card) =>
    isSameMonth(card.dueDate, selectedMonth),
  );

  const membersById = useMemo(
    () =>
      new Map(
        (members ?? []).map((member) => [
          member.userId,
          member as BoardMemberSummary,
        ]),
      ),
    [members],
  );

  const columnsById = useMemo(
    () => new Map(columns.map((col) => [col._id, col])),
    [columns],
  );
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order.localeCompare(b.order)),
    [columns],
  );

  const tint = (color: string, opacity: number) => {
    const hex = color.trim().replace("#", "");
    const full =
      hex.length === 3
        ? hex.split("").map((v) => `${v}${v}`).join("")
        : hex;
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  const handleDateCreate = async (day: Date) => {
    const targetColumn = sortedColumns[0];
    if (!targetColumn) {
      toast.error("Add a group first");
      return;
    }
    try {
      const newCardId = await createCard({
        boardId,
        columnId: targetColumn._id,
        title: "New task",
        dueDate: endOfDay(day).getTime(),
      });
      setSelectedCardId(newCardId);
    } catch {
      toast.error("Failed to create task");
    }
  };

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <div className="h-full overflow-auto bg-brand-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">

          {/* ── Header ─────────────────────────────────── */}
          <div className="mb-4 flex items-center justify-between">
            {/* Left: month name + due count */}
            <div
              className="flex items-center gap-3 pl-3"
              style={{ borderLeft: `3px solid ${calendarColor}` }}
            >
              <div>
                <h2 className="text-xl font-bold leading-none text-brand-text sm:text-2xl">
                  {format(selectedMonth, "MMMM yyyy")}
                </h2>
                {dueThisMonth.length > 0 && (
                  <p className="mt-1 text-xs text-brand-text/50">
                    {dueThisMonth.length} task{dueThisMonth.length !== 1 ? "s" : ""} due
                  </p>
                )}
              </div>
            </div>

            {/* Right: color picker + nav */}
            <div className="flex items-center gap-2">
              {/* Color picker — shows live color, hard to miss */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-brand-text/15 bg-brand-primary px-3 py-1.5 text-sm font-medium text-brand-text/70 hover:border-brand-text/30 hover:text-brand-text transition-colors"
                  title="Change calendar accent color"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white/30"
                    style={{ backgroundColor: calendarColor }}
                  />
                  Accent
                </button>

                {showColorPicker && (
                  <div className="absolute right-0 top-10 z-20 rounded-xl border border-brand-text/12 bg-brand-primary p-3 shadow-xl">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-brand-text/35">
                      Pick a color
                    </p>
                    <div className="flex gap-2">
                      {CALENDAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleCalendarColorChange(c)}
                          className={cn(
                            "h-6 w-6 rounded-full transition-all hover:scale-110",
                            calendarColor === c
                              ? "ring-2 ring-brand-text ring-offset-2 ring-offset-brand-primary scale-110"
                              : "",
                          )}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Month nav */}
              <div className="flex items-center gap-0.5 rounded-lg border border-brand-text/12 bg-brand-primary p-0.5">
                <button
                  onClick={() => setSelectedMonth((cur) => subMonths(cur, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-brand-text/50 hover:bg-brand-text/8 hover:text-brand-text transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedMonth((cur) => addMonths(cur, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-brand-text/50 hover:bg-brand-text/8 hover:text-brand-text transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Grid ──────────────────────────────────── */}
          {cards === undefined ? (
            <div className="rounded-xl border border-brand-text/10 bg-brand-primary p-10 text-center">
              <p className="text-sm text-brand-text/40">Loading…</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-brand-text/12 bg-brand-primary">
              {/* Day-of-week row */}
              <div className="grid grid-cols-7" style={{ borderBottom: `2px solid ${tint(calendarColor, 0.25)}` }}>
                {DAYS.map((day, i) => {
                  const isWeekend = i === 0 || i === 6;
                  return (
                    <div
                      key={day}
                      className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: isWeekend ? tint(calendarColor, 0.35) : tint(calendarColor, 0.65) }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayCards = cardsByDay.get(key) ?? [];
                  const isCurrentMonth = isSameMonth(day, selectedMonth);
                  const isCurrentDay = isToday(day);
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                  return (
                    <div
                      key={key}
                      onClick={() => void handleDateCreate(day)}
                      className={cn(
                        "group/cell relative min-h-32 cursor-pointer border-b border-r border-brand-text/8 px-2 py-2 align-top transition-colors sm:min-h-40 sm:px-2.5 sm:py-2.5",
                        isCurrentDay && "bg-brand-text/[0.025]",
                        !isCurrentMonth && "opacity-35",
                        isWeekend && isCurrentMonth && !isCurrentDay && "bg-brand-text/[0.015]",
                      )}
                      style={isCurrentDay ? { boxShadow: `inset 0 2px 0 ${calendarColor}` } : undefined}
                    >
                      {/* Date number row */}
                      <div className="mb-1.5 flex items-start justify-between">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold leading-none",
                            isCurrentDay ? "text-white" : isCurrentMonth ? "text-brand-text/70" : "text-brand-text/30",
                          )}
                          style={isCurrentDay ? { backgroundColor: calendarColor } : undefined}
                        >
                          {format(day, "d")}
                        </span>

                        {/* Quick-add button on hover */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDateCreate(day); }}
                          className="opacity-0 group-hover/cell:opacity-100 flex h-5 w-5 items-center justify-center rounded text-brand-text/40 hover:bg-brand-text/10 hover:text-brand-text/70 transition-all"
                          title={`Add task on ${format(day, "MMM d")}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Task cards */}
                      <div className="space-y-1">
                        {dayCards.slice(0, 4).map((card) => {
                          const assignee = card.assignedUserId
                            ? (membersById.get(card.assignedUserId) ?? null)
                            : null;
                          const assigneeName =
                            assignee?.name ?? assignee?.email ?? null;
                          const overdue =
                            card.dueDate < Date.now() &&
                            !card.isComplete;
                          const status = columnsById.get(card.columnId);
                          const statusColor = status?.color ?? "#6B7280";

                          return (
                            <button
                              key={card._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardId(card._id);
                              }}
                              className="block w-full overflow-hidden rounded text-left transition-all hover:-translate-y-px hover:shadow-sm"
                              style={{
                                backgroundColor: overdue
                                  ? tint(statusColor, 0.15)
                                  : tint(statusColor, 0.1),
                                borderLeft: `2px solid ${statusColor}`,
                              }}
                            >
                              <div className="px-2 py-1.5">
                                <p className="truncate text-[11px] font-medium leading-tight text-brand-text/80">
                                  {card.title}
                                </p>
                                <div className="mt-0.5 flex items-center justify-between gap-1">
                                  <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-brand-text/40">
                                    {status?.title ?? "—"}
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px] text-brand-text/35">
                                    <Clock className="h-2 w-2" />
                                    {format(card.dueDate, "h:mm a")}
                                  </span>
                                </div>
                                {assigneeName && (
                                  <p className="mt-0.5 truncate text-[9px] text-brand-text/30">
                                    {assigneeName}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {dayCards.length > 4 && (
                          <p className="pl-1 text-[10px] font-medium text-brand-text/35">
                            +{dayCards.length - 4} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {cards !== undefined && dueCards.length === 0 && (
            <div className="mt-0 rounded-b-xl border-x border-b border-brand-text/12 bg-brand-primary px-6 py-10 text-center">
              <div
                className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: tint(calendarColor, 0.12) }}
              >
                <Clock className="h-5 w-5" style={{ color: tint(calendarColor, 0.7) }} />
              </div>
              <p className="font-semibold text-brand-text/60">No due dates yet</p>
              <p className="mt-1 text-sm text-brand-text/35">
                Click any date to create a task
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedCardId && (
        <CardDetail
          cardId={selectedCardId}
          boardId={boardId}
          columns={columns}
          labels={labels}
          members={members ?? []}
          canManageAssignees={accessInfo?.canManageAssignees ?? false}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </>
  );
}
