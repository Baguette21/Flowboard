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
import { useProfileImageUrls } from "../../hooks/useProfileImageUrls";
import { UserAvatar } from "../ui/UserAvatar";

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
  const memberImageUrls = useProfileImageUrls(
    (members ?? []).map((member) => member.imageKey),
  );

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
                <h2 className="text-xl font-bold leading-none tracking-display text-brand-text sm:text-2xl">
                  {format(selectedMonth, "MMMM yyyy")}
                </h2>
                {dueThisMonth.length > 0 && (
                  <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
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
                  className="flex items-center gap-2 rounded-lg card-whisper bg-brand-primary px-3 py-1.5 text-sm font-medium text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-whisper-strong)] hover:text-brand-text transition-colors"
                  title="Change calendar accent color"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full card-whisper"
                    style={{ backgroundColor: calendarColor }}
                  />
                  Accent
                </button>

                {showColorPicker && (
                  <div className="absolute right-0 top-10 z-20 rounded-xl card-whisper bg-brand-primary p-3 card-elevation">
                    <p className="mb-2.5 text-[11px] font-semibold text-[color:var(--color-text-subtle)]">
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
              <div className="flex items-center gap-0.5 rounded-lg card-whisper bg-brand-primary p-0.5">
                <button
                  onClick={() => setSelectedMonth((cur) => subMonths(cur, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-brand-text/5 hover:text-brand-text transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedMonth((cur) => addMonths(cur, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-brand-text/5 hover:text-brand-text transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Grid ──────────────────────────────────── */}
          {cards === undefined ? (
            <div className="rounded-xl card-whisper bg-brand-primary p-10 text-center">
              <p className="text-sm text-[color:var(--color-text-subtle)]">Loading…</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl card-whisper card-elevation bg-brand-primary">
              {/* Day-of-week row */}
              <div className="grid grid-cols-7 border-b border-[color:var(--color-border-whisper)]">
                {DAYS.map((day, i) => {
                  const isWeekend = i === 0 || i === 6;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "py-2.5 text-center text-[11px] font-semibold",
                        isWeekend
                          ? "text-[color:var(--color-text-subtle)]"
                          : "text-[color:var(--color-text-muted)]",
                      )}
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
                        "group/cell relative min-h-32 cursor-pointer border-b border-r border-[color:var(--color-border-whisper)] px-2 py-2 align-top transition-colors sm:min-h-40 sm:px-2.5 sm:py-2.5",
                        isCurrentDay && "bg-brand-text/[0.025]",
                        !isCurrentMonth && "opacity-35",
                        isWeekend && isCurrentMonth && !isCurrentDay && "bg-brand-text/[0.015]",
                      )}
                    >
                      {/* Date number row */}
                      <div className="mb-1.5 flex items-start justify-between">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold leading-none",
                            isCurrentDay
                              ? "text-white"
                              : isCurrentMonth
                                ? "text-brand-text"
                                : "text-[color:var(--color-text-subtle)]",
                          )}
                          style={isCurrentDay ? { backgroundColor: calendarColor } : undefined}
                        >
                          {format(day, "d")}
                        </span>

                        {/* Quick-add button on hover */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDateCreate(day); }}
                          className="opacity-0 group-hover/cell:opacity-100 flex h-5 w-5 items-center justify-center rounded text-[color:var(--color-text-subtle)] hover:bg-brand-text/5 hover:text-[color:var(--color-text-muted)] transition-all"
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
                              className={cn(
                                "block w-full overflow-hidden rounded-[6px] card-whisper text-left transition-all hover:card-elevation hover:border-[color:var(--color-border-whisper-strong)]",
                                card.isComplete && "opacity-50",
                              )}
                              style={{
                                borderLeft: `2px solid ${statusColor}`,
                                backgroundColor: card.isComplete
                                  ? undefined
                                  : tint(statusColor, overdue ? 0.18 : 0.12),
                              }}
                            >
                              <div className="px-2 py-1.5">
                                <p
                                  className={cn(
                                    "truncate text-[11px] font-medium leading-tight text-brand-text",
                                    card.isComplete &&
                                      "line-through text-[color:var(--color-text-subtle)]",
                                  )}
                                >
                                  {card.title}
                                </p>
                                <div className="mt-0.5 flex items-center justify-between gap-1">
                                  <span className="truncate text-[10px] font-medium text-[color:var(--color-text-subtle)]">
                                    {status?.title ?? "—"}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-0.5 text-[10px]",
                                      overdue && !card.isComplete
                                        ? "text-red-500"
                                        : "text-[color:var(--color-text-subtle)]",
                                    )}
                                  >
                                    <Clock className="h-2 w-2" />
                                    {format(card.dueDate, "h:mm a")}
                                  </span>
                                </div>
                                {assigneeName && (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <UserAvatar
                                      name={assignee?.name}
                                      email={assignee?.email}
                                      imageUrl={
                                        assignee?.imageKey
                                          ? memberImageUrls[assignee.imageKey] ?? null
                                          : null
                                      }
                                      size="sm"
                                      className="h-4 w-4 text-[8px]"
                                    />
                                    <p className="min-w-0 truncate text-[10px] text-[color:var(--color-text-subtle)]">
                                      {assigneeName}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {dayCards.length > 4 && (
                          <p className="pl-1 text-[10px] font-medium text-[color:var(--color-text-subtle)]">
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
            <div className="mt-0 rounded-b-xl border-x border-b border-[color:var(--color-border-whisper)] bg-brand-primary px-6 py-10 text-center">
              <div
                className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: tint(calendarColor, 0.12) }}
              >
                <Clock className="h-5 w-5" style={{ color: tint(calendarColor, 0.7) }} />
              </div>
              <p className="font-semibold text-[color:var(--color-text-muted)]">No due dates yet</p>
              <p className="mt-1 text-sm text-[color:var(--color-text-subtle)]">
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
