import { format, isToday, isTomorrow } from "date-fns";

export function formatDueDate(value?: number | null) {
  if (!value) return null;
  const date = new Date(value);
  if (isToday(date)) return `Today ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

export function parseDateTimeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : timestamp;
}
