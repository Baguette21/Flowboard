import { useEffect, useMemo, useState } from "react";
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
import { AlertCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { BoardMemberSummary } from "../../lib/types";
import { toast } from "sonner";
import { useProfileImageUrls } from "../../hooks/useProfileImageUrls";
import { UserAvatar } from "../ui/UserAvatar";
import { getAssignedUserIds } from "../../lib/assignees";

interface BoardCalendarViewProps {
  planId: Id<"plans">;
  cards: Doc<"cards">[] | undefined;
  boardColor: string;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
}

type DueCard = Doc<"cards"> & { dueDate: number };

export function BoardCalendarView({
  planId,
  cards,
  boardColor: _boardColor,
  columns,
  labels,
}: BoardCalendarViewProps) {
  const members = useQuery(api.planMembers.listForPlan, { planId });
  const accessInfo = useQuery(api.plans.getAccessInfo, { planId });
  const createCard = useMutation(api.cards.create);
  const memberImageUrls = useProfileImageUrls(
    (members ?? []).map((member) => member.imageKey),
  );

  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | null>(null);

  const goToToday = () => setSelectedMonth(startOfMonth(new Date()));
  const goPrev = () => setSelectedMonth((cur) => subMonths(cur, 1));
  const goNext = () => setSelectedMonth((cur) => addMonths(cur, 1));

  // Keyboard nav: ← prev month, → next month, t today.
  // Skip when the user is typing in a field or a card detail modal is open.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedCardId) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        goToToday();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedCardId]);

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

  const handleDateCreate = async (day: Date) => {
    const targetColumn = sortedColumns[0];
    if (!targetColumn) {
      toast.error("Add a group first");
      return;
    }
    try {
      const newCardId = await createCard({
        planId,
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
  const isCurrentMonthSelected = isSameMonth(selectedMonth, new Date());

  return (
    <>
      <div className="h-full overflow-auto bg-brand-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">

          {/* ── Header ─────────────────────────────────── */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold leading-none tracking-display text-brand-text sm:text-2xl">
                {format(selectedMonth, "MMMM yyyy")}
              </h2>
              {dueThisMonth.length > 0 ? (
                <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                  {dueThisMonth.length} task{dueThisMonth.length !== 1 ? "s" : ""} due
                </p>
              ) : cards !== undefined && dueCards.length === 0 ? (
                <p className="mt-1 text-xs text-[color:var(--color-text-subtle)]">
                  Click any date to add a task
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                disabled={isCurrentMonthSelected}
                className="rounded-lg card-whisper bg-brand-primary px-3 py-1.5 text-sm font-medium text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-whisper-strong)] hover:text-brand-text transition-colors disabled:cursor-default disabled:opacity-50 disabled:hover:text-[color:var(--color-text-muted)]"
                title="Jump to today (T)"
              >
                Today
              </button>

              <div className="flex items-center gap-0.5 rounded-lg card-whisper bg-brand-primary p-0.5">
                <button
                  onClick={goPrev}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-brand-text/5 hover:text-brand-text transition-colors"
                  title="Previous month (←)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goNext}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-brand-text/5 hover:text-brand-text transition-colors"
                  title="Next month (→)"
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
                      onClick={
                        isCurrentMonth ? () => void handleDateCreate(day) : undefined
                      }
                      title={isCurrentMonth ? `Add a task on ${format(day, "MMM d")}` : undefined}
                      className={cn(
                        "group/cell relative min-h-32 border-b border-r border-[color:var(--color-border-whisper)] px-2 py-2 align-top sm:min-h-40 sm:px-2.5 sm:py-2.5",
                        isCurrentMonth && "cursor-copy hover:bg-brand-text/[0.02]",
                        isCurrentDay && "bg-brand-text/[0.025]",
                        !isCurrentMonth && "opacity-50",
                        isWeekend && isCurrentMonth && !isCurrentDay && "bg-brand-text/[0.015]",
                      )}
                    >
                      {/* Date number row */}
                      <div className="mb-1.5 flex items-start">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold leading-none",
                            isCurrentDay
                              ? "bg-brand-text text-brand-bg"
                              : isCurrentMonth
                                ? "text-brand-text"
                                : "text-[color:var(--color-text-subtle)]",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      {/* Task cards */}
                      <div className="space-y-1">
                        {dayCards.slice(0, 4).map((card) => {
                          const assignees = getAssignedUserIds(card)
                            .map((userId) => membersById.get(userId))
                            .filter((member): member is BoardMemberSummary => Boolean(member));
                          const assigneeName = assignees
                            .slice(0, 2)
                            .map((member) => member.name ?? member.email ?? "Unknown")
                            .join(", ");
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
                                "block w-full overflow-hidden rounded-md card-whisper bg-brand-bg text-left transition-colors hover:border-[color:var(--color-border-whisper-strong)]",
                                card.isComplete && "opacity-50",
                              )}
                            >
                              <div className="px-2 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    aria-hidden
                                    className="h-2 w-2 flex-shrink-0 rounded-full"
                                    style={{ backgroundColor: statusColor }}
                                  />
                                  <p
                                    className={cn(
                                      "truncate text-[11px] font-medium leading-tight text-brand-text",
                                      card.isComplete &&
                                        "line-through text-[color:var(--color-text-subtle)]",
                                    )}
                                  >
                                    {card.title}
                                  </p>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-1 pl-3.5">
                                  {status?.title ? (
                                    <span className="truncate text-[10px] font-medium text-[color:var(--color-text-subtle)]">
                                      {status.title}
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-0.5 text-[10px]",
                                      overdue
                                        ? "font-semibold text-brand-accent"
                                        : "text-[color:var(--color-text-subtle)]",
                                    )}
                                  >
                                    {overdue ? (
                                      <>
                                        <AlertCircle className="h-2.5 w-2.5" aria-hidden />
                                        Overdue
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-2 w-2" aria-hidden />
                                        {format(card.dueDate, "h:mm a")}
                                      </>
                                    )}
                                  </span>
                                </div>
                                {assignees.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1.5 pl-3.5">
                                    <span className="flex -space-x-1">
                                      {assignees.slice(0, 2).map((assignee) => (
                                        <UserAvatar
                                          key={assignee.userId}
                                          name={assignee.name}
                                          email={assignee.email}
                                          imageUrl={
                                            assignee.imageKey
                                              ? memberImageUrls[assignee.imageKey] ?? null
                                              : null
                                          }
                                          size="sm"
                                          className="h-4 w-4 border border-brand-primary text-[8px]"
                                        />
                                      ))}
                                    </span>
                                    <p className="min-w-0 truncate text-[10px] text-[color:var(--color-text-subtle)]">
                                      {assigneeName}
                                      {assignees.length > 2 ? ` +${assignees.length - 2}` : ""}
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

        </div>
      </div>

      {selectedCardId && (
        <CardDetail
          cardId={selectedCardId}
          planId={planId}
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
