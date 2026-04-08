import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
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
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Layers3 } from "lucide-react";
import type { BoardMemberSummary } from "../../lib/types";

interface BoardCalendarViewProps {
  boardId: Id<"boards">;
  cards: Doc<"cards">[] | undefined;
  boardColor: string;
  columns: Doc<"columns">[];
  labels: Doc<"labels">[];
}

type DueCard = Doc<"cards"> & { dueDate: number };

export function BoardCalendarView({
  boardId,
  cards,
  boardColor,
  columns,
  labels,
}: BoardCalendarViewProps) {
  const members = useQuery(api.boardMembers.listForBoard, { boardId });
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId });
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | null>(null);

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
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
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

  const dueThisMonth = dueCards.filter((card) => isSameMonth(card.dueDate, selectedMonth));

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
    () => new Map(columns.map((column) => [column._id, column])),
    [columns],
  );

  const tint = (color: string, opacity: number) => {
    const normalized = color.trim();

    if (normalized.startsWith("#")) {
      const hex = normalized.slice(1);
      const expanded =
        hex.length === 3
          ? hex
              .split("")
              .map((value) => `${value}${value}`)
              .join("")
          : hex;

      if (expanded.length === 6) {
        const red = Number.parseInt(expanded.slice(0, 2), 16);
        const green = Number.parseInt(expanded.slice(2, 4), 16);
        const blue = Number.parseInt(expanded.slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
      }
    }

    return `color-mix(in srgb, ${normalized} ${Math.round(opacity * 100)}%, transparent)`;
  };

  return (
    <>
      <div className="h-full overflow-auto bg-brand-primary px-3 py-3 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-[1400px]">
          <div
            className="mb-4 rounded-[1.75rem] border border-brand-text/12 bg-brand-primary px-4 py-4 text-brand-text shadow-[0_24px_60px_rgba(0,0,0,0.10)] sm:px-5"
            style={{
              backgroundImage: `linear-gradient(135deg, ${tint(boardColor, 0.18)} 0%, transparent 48%)`,
            }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-text/55">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.28em]">
                    Due Calendar
                  </span>
                </div>
                <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                  {format(selectedMonth, "MMMM yyyy")}
                </h2>
                <p className="mt-1 font-mono text-xs text-brand-text/55 sm:text-sm">
                  {dueThisMonth.length} scheduled due item{dueThisMonth.length === 1 ? "" : "s"} this month
                </p>
              </div>

              <div
                className="flex items-center gap-2 self-start rounded-2xl border p-1.5"
                style={{
                  backgroundColor: tint(boardColor, 0.08),
                  borderColor: tint(boardColor, 0.18),
                }}
              >
                <button
                  onClick={() => setSelectedMonth((current) => subMonths(current, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-text/65 transition-colors hover:bg-brand-text/8 hover:text-brand-text"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedMonth((current) => addMonths(current, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-text/65 transition-colors hover:bg-brand-text/8 hover:text-brand-text"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {cards === undefined ? (
            <div className="rounded-[1.75rem] border border-brand-text/10 bg-brand-primary p-10 text-center text-brand-text">
              <p className="font-mono text-sm text-brand-text/50">Loading your due dates...</p>
            </div>
          ) : dueCards.length === 0 ? (
            <div className="rounded-[1.75rem] border border-brand-text/10 bg-brand-primary px-6 py-14 text-center text-brand-text">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem]"
                style={{ backgroundColor: tint(boardColor, 0.12) }}
              >
                <Layers3 className="h-8 w-8 text-brand-text/20" />
              </div>
              <h3 className="mt-5 font-serif text-2xl font-bold">No due dates yet</h3>
              <p className="mx-auto mt-2 max-w-md font-mono text-sm text-brand-text/45">
                Add due dates to cards and they&apos;ll appear here in a compact calendar grid.
              </p>
            </div>
          ) : (
            <div
              className="overflow-hidden rounded-[1.75rem] border border-brand-text/10 bg-brand-primary text-brand-text shadow-[0_24px_70px_rgba(0,0,0,0.08)]"
              style={{
                backgroundImage: `linear-gradient(180deg, ${tint(boardColor, 0.08)} 0%, transparent 26%)`,
              }}
            >
              <div
                className="grid grid-cols-7 border-b border-brand-text/10"
                style={{ backgroundColor: tint(boardColor, 0.08) }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="px-2 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-brand-text/40 sm:px-4"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayCards = cardsByDay.get(key) ?? [];
                  const isCurrentMonth = isSameMonth(day, selectedMonth);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-36 border-b border-r border-brand-text/10 px-2 py-2 align-top transition-colors sm:min-h-44 sm:px-3 sm:py-3",
                        !isCurrentMonth && "bg-brand-bg/55",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold",
                            isCurrentMonth ? "text-brand-text" : "text-brand-text/25",
                          )}
                          style={
                            isCurrentDay
                              ? {
                                  backgroundColor: tint(boardColor, 0.16),
                                  boxShadow: `inset 0 0 0 1px ${tint(boardColor, 0.55)}`,
                                }
                              : undefined
                          }
                        >
                          {format(day, "d")}
                        </span>
                        {dayCards.length > 0 && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-text/30">
                            {dayCards.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {dayCards.slice(0, 4).map((card) => {
                          const assignee = card.assignedUserId
                            ? membersById.get(card.assignedUserId) ?? null
                            : null;
                          const assigneeName = assignee?.name ?? assignee?.email ?? null;
                          const overdue =
                            isBefore(startOfDay(card.dueDate), startOfDay(new Date())) &&
                            !card.isComplete;
                          const status = columnsById.get(card.columnId);
                          const statusColor = status?.color ?? "#6B7280";

                          return (
                            <button
                              key={card._id}
                              onClick={() => setSelectedCardId(card._id)}
                              className="block w-full overflow-hidden rounded-lg border text-left transition-transform hover:-translate-y-0.5"
                              style={{
                                backgroundColor: overdue
                                  ? tint(statusColor, 0.18)
                                  : tint(statusColor, 0.12),
                                borderColor: tint(statusColor, 0.24),
                                boxShadow: `inset 4px 0 0 ${statusColor}`,
                              }}
                            >
                              <div className="px-2.5 py-2.5">
                                <div className="flex items-start gap-2">
                                  <div
                                    className="mt-0.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                                    style={{ backgroundColor: statusColor }}
                                  />
                                  <p className="min-w-0 flex-1 truncate font-sans text-[11px] font-bold text-brand-text">
                                    {card.title}
                                  </p>
                                </div>

                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-brand-text/58">
                                    {status?.title ?? "Status"}
                                  </span>
                                  <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-brand-text/52">
                                    <Clock className="h-3 w-3" />
                                    {format(card.dueDate, "h:mm a")}
                                  </span>
                                </div>

                                {assigneeName && (
                                  <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-brand-text/42">
                                    {assigneeName}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {dayCards.length > 4 && (
                          <p className="px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-brand-text/30">
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
          labels={labels}
          members={members ?? []}
          canManageAssignees={accessInfo?.canManageAssignees ?? false}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </>
  );
}
