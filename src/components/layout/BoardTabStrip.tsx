import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { PencilLine, Plus, Users, X, FileText } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/utils";
import { getBoardIconOption } from "../../lib/boardIcons";
import { useBoardTabs } from "../../hooks/useBoardTabs";
import { NewTabPicker } from "./NewTabPicker";

export function BoardTabStrip() {
  const location = useLocation();
  const plans = useQuery(api.plans.list);
  const notes = useQuery(api.notes.list);
  const drawings = useQuery(api.drawings.list);
  const {
    isEnabled,
    tabs,
    activeTabId,
    activateTab,
    closeTab,
    pruneTabs,
    openInNewTab,
  } = useBoardTabs();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isBoardWorkspaceRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/plan/") ||
    location.pathname.startsWith("/notes") ||
    location.pathname.startsWith("/draw");

  const visibleTabs = useMemo(() => {
    if (!plans || !notes || !drawings) {
      return [];
    }

    const boardMap = new Map(plans.map((board) => [board._id, board]));
    const noteMap = new Map(notes.map((note) => [note._id, note]));
    const drawMap = new Map(drawings.map((drawing) => [drawing._id, drawing]));
    return tabs.map((tab) => {
      if (tab.target.id === null) {
        return {
          ...tab,
          title: "New plan tab",
          role: null,
          iconType: "empty" as const,
        };
      }

      if (tab.target.kind === "plan") {
        const board = boardMap.get(tab.target.id as Id<"plans">) ?? null;
        return {
          ...tab,
          title: board?.name ?? "Plan",
          role: board?.role ?? null,
          iconType: "board" as const,
          board,
        };
      }

      if (tab.target.kind === "note") {
        const note = noteMap.get(tab.target.id as Id<"notes">) ?? null;
        return {
          ...tab,
          title: note?.title || "Untitled note",
          role: null,
          iconType: "note" as const,
        };
      }

      const drawing = drawMap.get(tab.target.id as Id<"drawings">) ?? null;
      return {
        ...tab,
        title: drawing?.title || "Untitled drawing",
        role: null,
        iconType: "draw" as const,
      };
    });
  }, [plans, drawings, notes, tabs]);

  useEffect(() => {
    if (!plans || !notes || !drawings) {
      return;
    }

    pruneTabs({
      plan: plans.map((board) => board._id),
      note: notes.map((note) => note._id),
      draw: drawings.map((drawing) => drawing._id),
    });
  }, [plans, drawings, notes, pruneTabs]);

  if (!isEnabled || !isBoardWorkspaceRoute || visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-stretch overflow-hidden border-l border-brand-text/10">
      {visibleTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const boardIcon =
          tab.iconType === "board" && tab.board
            ? getBoardIconOption(tab.board.icon, tab.board.color)
            : null;
        const title = tab.title;

        return (
          <div
            key={tab.id}
            className={cn(
              "group/tab flex min-w-0 max-w-[15rem] flex-1 basis-0 items-center gap-1 border-r border-b border-t-0 border-l-0 px-2 transition-colors",
              isActive
                ? "border-brand-text/18 bg-brand-bg text-brand-text shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                : "border-brand-text/10 bg-brand-bg/40 text-brand-text/55 hover:bg-brand-bg/70 hover:text-brand-text",
            )}
          >
            <button
              type="button"
              onClick={() => activateTab(tab.id)}
              className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left"
              title={title}
            >
              {tab.iconType === "board" && tab.board && boardIcon ? (
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px]"
                  style={{
                    backgroundColor: `${tab.board.color}22`,
                    color: tab.board.color,
                  }}
                >
                  <boardIcon.Icon className="h-3.5 w-3.5" />
                </span>
              ) : tab.iconType === "note" ? (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px] bg-brand-accent/12 text-brand-accent">
                  <FileText className="h-3.5 w-3.5" />
                </span>
              ) : tab.iconType === "draw" ? (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px] bg-brand-accent/12 text-brand-accent">
                  <PencilLine className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[7px] bg-brand-text/8 text-brand-text/35">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {title}
              </span>
              {tab.role === "member" ? (
                <Users className="h-3.5 w-3.5 flex-shrink-0 text-brand-text/35" />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => closeTab(tab.id)}
              className="flex h-full w-5 flex-shrink-0 items-center justify-center text-brand-text/28 transition-colors hover:bg-brand-text/8 hover:text-brand-text group-hover/tab:text-brand-text/45"
              title={`Close ${title}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setPickerOpen((current) => !current)}
        className="flex h-full w-8 flex-shrink-0 items-center justify-center border-r border-b border-brand-text/10 bg-brand-bg/35 text-brand-text/45 transition-colors hover:bg-brand-bg/65 hover:text-brand-text"
        title="Open a new tab"
      >
        <Plus className="h-4 w-4" />
      </button>

      <NewTabPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(target) => openInNewTab(target)}
      />
    </div>
  );
}
