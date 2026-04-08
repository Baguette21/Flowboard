import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  LayoutDashboard, Plus, ChevronRight, Star, Users, X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { CreateBoardModal } from "../board/CreateBoardModal";

interface SidebarProps {
  activeBoardId?: Id<"boards">;
  mobileOpen?: boolean;
  desktopCollapsed?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  activeBoardId,
  mobileOpen = false,
  desktopCollapsed = false,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const boards = useQuery(api.boards.list);
  const [showCreate, setShowCreate] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);

  const isHome = location.pathname === "/";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-brand-text/45 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 max-w-[88vw] bg-brand-dark text-brand-sidebar-text flex flex-col h-full border-r-2 border-brand-sidebar-text/10 overflow-hidden transition-all duration-300 lg:static lg:z-auto lg:max-w-none lg:translate-x-0",
          mobileOpen ? "translate-x-0 w-[17.5rem]" : "-translate-x-full w-[17.5rem]",
          desktopCollapsed
            ? "lg:w-0 lg:min-w-0 lg:-translate-x-4 lg:opacity-0 lg:border-r-0"
            : "lg:w-60 lg:opacity-100",
        )}
        aria-hidden={desktopCollapsed && !mobileOpen}
      >
        <div className="h-14 flex items-center px-5 border-b-2 border-brand-sidebar-text/10 flex-shrink-0">
          <button
            onClick={() => {
              navigate("/");
              onMobileClose?.();
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
          >
            <div className="w-5 h-5 rounded bg-brand-accent" />
            <span className="font-serif italic font-bold text-lg tracking-tight leading-none pt-1">
              FlowBoard<span className="text-brand-accent">.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-brand-sidebar-text/55 transition-colors hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button
            onClick={() => {
              navigate("/");
              onMobileClose?.();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isHome
                ? "bg-brand-primary text-brand-text"
                : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
            )}
          >
            <LayoutDashboard className={cn("w-4 h-4", isHome ? "text-brand-accent" : "text-brand-sidebar-text/40")} />
            All Boards
          </button>

          <div>
            <button
              onClick={() => setBoardsExpanded(!boardsExpanded)}
              className="w-full flex items-center gap-2 px-3 py-2 text-brand-sidebar-text/40 hover:text-brand-sidebar-text/75 transition-colors"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", boardsExpanded && "rotate-90")} />
              <span className="font-mono text-[10px] uppercase tracking-widest font-bold">
                Boards
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreate(true);
                }}
                className="ml-auto p-0.5 hover:text-brand-sidebar-text transition-colors"
                title="New board"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </button>

            {boardsExpanded && (
              <div className="space-y-0.5 ml-2">
                {boards === undefined ? (
                  <div className="px-3 py-2 text-brand-sidebar-text/30 font-mono text-xs">Loading...</div>
                ) : boards.length === 0 ? (
                  <div className="px-3 py-2 text-brand-sidebar-text/30 font-mono text-xs">No boards yet</div>
                ) : (
                  boards.map((board) => (
                    <button
                      key={board._id}
                      onClick={() => {
                        navigate(`/board/${board._id}`);
                        onMobileClose?.();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left group",
                        activeBoardId === board._id
                          ? "bg-brand-primary text-brand-text"
                          : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
                      )}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: board.color }}
                      />
                      <span className="truncate flex-1">{board.name}</span>
                      {board.role === "member" && (
                        <Users className="w-3 h-3 text-brand-sidebar-text/50 flex-shrink-0" />
                      )}
                      {board.isFavorite && (
                        <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="p-3 flex-shrink-0 border-t-2 border-brand-sidebar-text/10">
          <div className="bg-brand-sidebar-text/6 rounded-xl p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-brand-sidebar-text/40 mb-1.5">
              System
            </div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
              <span className="text-brand-sidebar-text/80 text-xs font-mono">Operational</span>
            </div>
          </div>
        </div>
      </aside>

      <CreateBoardModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
