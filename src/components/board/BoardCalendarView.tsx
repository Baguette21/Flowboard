import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isBefore,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/utils";
import { CardDetail } from "../card/CardDetail";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers3,
  Palette,
} from "lucide-react";
import type { BoardMemberSummary } from "../../lib/types";

interface BoardCalendarViewProps {
  boardId: Id<"boards">;
  cards: Doc<"cards">[] | undefined;
  boardColor: string;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
}

type DueCard = Doc<"cards"> & { dueDate: number };

// Preset accent colors for the calendar (independent of board color)
const CALENDAR_COLORS = [
  "#3B82F6", // blue (default)
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#22C55E", // green
  "#F97316", // orange
  "#E63B2E", // red
  "#EC4899", // pink
  "#EAB308", // yellow
  "#6B7280", // gray
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

  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | null>(
    null,
  );
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Calendar accent color — stored per board in localStorage, independent of board color
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

  // Hex → rgba helper (no gradient, flat tint only)
  const tint = (color: string, opacity: number) => {
    const hex = color.trim().replace("#", "");
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((v) => `${v}${v}`)
            .join("")
        : hex;
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  return (
    <>
      <div className="h-full overflow-auto bg-brand-bg px-3 py-3 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-[1400px]">

          {/* ── Calendar header ─────────────────────────── */}
          <div className="mb-4 rounded-md border border-brand-text/10 bg-brand-primary px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-text/50">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.26em]">
                    Due Calendar
                  </span>
                </div>
                <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                  {format(selectedMonth, "MMMM yyyy")}
                </h2>
                <p className="mt-1 font-mono text-xs text-brand-text/45 sm:text-sm">
                  {dueThisMonth.length} scheduled due item
                  {dueThisMonth.length === 1 ? "" : "s"} this month
                </p>
              </div>

              <div className="flex items-center gap-2 self-start">
                {/* Accent color picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center border border-brand-text/15 bg-brand-bg/60 text-brand-text/45 hover:text-brand-text hover:border-brand-text/30 transition-colors"
                    title="Calendar accent color"
                  >
                    <Palette className="h-4 w-4" />
                  </button>

                  {showColorPicker && (
                    <div className="absolute top-11 right-0 z-20 flex flex-wrap gap-2 p-3 border border-brand-text/12 bg-brand-primary shadow-xl w-[148px]">
                      {CALENDAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleCalendarColorChange(c)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                            calendarColor === c
                              ? "border-brand-text scale-110"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Month nav */}
                <div className="flex items-center gap-1 border border-brand-text/12 bg-brand-bg/60 p-1">
                  <button
                    onClick={() =>
                      setSelectedMonth((cur) => subMonths(cur, 1))
                    }
                    className="flex h-9 w-9 items-center justify-center text-brand-text/50 hover:bg-brand-text/8 hover:text-brand-text transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedMonth((cur) => addMonths(cur, 1))
                    }
                    className="flex h-9 w-9 items-center justify-center text-brand-text/50 hover:bg-brand-text/8 hover:text-brand-text transition-colors"
                    title="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Loading / Empty ──────────────────────────── */}
          {cards === undefined ? (
            <div className="border border-brand-text/10 bg-brand-primary p-10 text-center">
              <p className="font-mono text-sm text-brand-text/40">
                Loading due dates…
              </p>
            </div>
          ) : dueCards.length === 0 ? (
            <div className="border border-brand-text/10 bg-brand-primary px-6 py-14 text-center">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center"
                style={{ backgroundColor: tint(calendarColor, 0.12) }}
              >
                <Layers3 className="h-7 w-7 text-brand-text/20" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold">
                No due dates yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm font-mono text-sm text-brand-text/40">
                Add due dates to cards and they'll appear here.
              </p>
            </div>
          ) : (
            /* ── Calendar grid ──────────────────────────── */
            <div className="overflow-hidden rounded-md border border-brand-text/10 bg-brand-primary">
              {/* Day-of-week header */}
              <div
                className="grid grid-cols-7 border-b border-brand-text/10"
                style={{ backgroundColor: tint(calendarColor, 0.06) }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className={cn(
                        "px-2 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] sm:px-4",
                        day === "Sun" || day === "Sat"
                          ? "text-brand-text/20"
                          : "text-brand-text/38",
                      )}
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayCards = cardsByDay.get(key) ?? [];
                  const isCurrentMonth = isSameMonth(day, selectedMonth);
                  const isCurrentDay = isToday(day);
                  const isWeekend =
                    getDay(day) === 0 || getDay(day) === 6;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-36 border-b border-r border-brand-text/8 px-2 py-2 align-top sm:min-h-44 sm:px-3 sm:py-3",
                        !isCurrentMonth && "opacity-40",
                        isCurrentMonth && isWeekend && "bg-brand-bg/25",
                      )}
                    >
                      {/* Date number */}
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-sm font-mono text-xs font-bold",
                            isCurrentMonth
                              ? "text-brand-text"
                              : "text-brand-text/25",
                          )}
                          style={
                            isCurrentDay
                              ? {
                                  backgroundColor: tint(calendarColor, 0.20),
                                  outline: `1.5px solid ${tint(calendarColor, 0.55)}`,
                                }
                              : undefined
                          }
                        >
                          {format(day, "d")}
                        </span>
                        {dayCards.length > 0 && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-brand-text/28">
                            {dayCards.length}
                          </span>
                        )}
                      </div>

                      {/* Cards */}
                      <div className="space-y-1.5">
                        {dayCards.slice(0, 4).map((card) => {
                          const assignee = card.assignedUserId
                            ? (membersById.get(card.assignedUserId) ?? null)
                            : null;
                          const assigneeName =
                            assignee?.name ?? assignee?.email ?? null;
                          const overdue =
                            isBefore(
                              startOfDay(card.dueDate),
                              startOfDay(new Date()),
                            ) && !card.isComplete;
                          const status = columnsById.get(card.columnId);
                          const statusColor = status?.color ?? "#6B7280";

                          return (
                            <button
                              key={card._id}
                              onClick={() => setSelectedCardId(card._id)}
                              className="block w-full overflow-hidden rounded-sm border text-left transition-transform hover:-translate-y-px"
                              style={{
                                backgroundColor: overdue
                                  ? tint(statusColor, 0.18)
                                  : tint(statusColor, 0.12),
                                borderColor: tint(statusColor, 0.22),
                                boxShadow: `inset 3px 0 0 ${statusColor}`,
                              }}
                            >
                              <div className="px-2.5 py-2">
                                <div className="flex items-start gap-1.5">
                                  <div
                                    className="mt-0.5 inline-flex h-2 w-2 flex-shrink-0"
                                    style={{ backgroundColor: statusColor }}
                                  />
                                  <p className="min-w-0 flex-1 truncate font-sans text-[11px] font-medium text-brand-text/85">
                                    {card.title}
                                  </p>
                                </div>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-brand-text/45">
                                    {status?.title ?? "Group"}
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-mono text-[9px] text-brand-text/40">
                                    <Clock className="h-2.5 w-2.5" />
                                    {format(card.dueDate, "h:mm a")}
                                  </span>
                                </div>
                                {assigneeName && (
                                  <p className="mt-0.5 truncate font-mono text-[9px] text-brand-text/35">
                                    {assigneeName}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {dayCards.length > 4 && (
                          <p className="px-1 font-mono text-[10px] tracking-[0.14em] text-brand-text/28">
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
