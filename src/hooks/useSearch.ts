import { useState, useMemo } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import type { FilterState } from "../components/search/FilterPanel";
import { isToday, isThisWeek } from "date-fns";

export function useSearch(cards: Doc<"cards">[] | undefined) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});

  const filteredCards = useMemo(() => {
    if (!cards) return undefined;

    let result = cards;

    // Text search
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q),
      );
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter((c) => c.priority === filters.priority);
    }

    // Label filter
    if (filters.labelId) {
      result = result.filter((c) => c.labelIds.includes(filters.labelId!));
    }

    // Due date filter
    if (filters.dueFilter) {
      result = result.filter((c) => {
        if (!c.dueDate) return false;
        const date = new Date(c.dueDate);
        if (filters.dueFilter === "overdue") return c.dueDate < Date.now();
        if (filters.dueFilter === "today") return isToday(date);
        if (filters.dueFilter === "week") return isThisWeek(date);
        return true;
      });
    }

    return result;
  }, [cards, query, filters]);

  const isFiltering = !!query.trim() || !!(filters.priority || filters.labelId || filters.dueFilter);

  return { query, setQuery, filters, setFilters, filteredCards, isFiltering };
}
