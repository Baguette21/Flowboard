import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ChevronRight,
  FileText,
  Home,
  PencilLine,
  Plus,
  Star,
  Users,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { CreateBoardModal } from "../board/CreateBoardModal";
import { getBoardIconOption } from "../../lib/boardIcons";
import { toast } from "sonner";

interface SidebarProps {
  activeBoardId?: Id<"boards">;
  activeNoteId?: Id<"notes">;
  activeDrawId?: Id<"drawings">;
  mobileOpen?: boolean;
  desktopCollapsed?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  activeBoardId,
  activeNoteId,
  activeDrawId,
  mobileOpen = false,
  desktopCollapsed = false,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list);
  const drawings = useQuery(api.drawings.list);
  const createNote = useMutation(api.notes.create);
  const createDrawing = useMutation(api.drawings.create);
  const [showCreate, setShowCreate] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [drawExpanded, setDrawExpanded] = useState(true);

  const isHome = location.pathname === "/";

  const handleCreateNote = async () => {
    try {
      const noteId = await createNote({ title: "Untitled" });
      navigate(`/notes/${noteId}`);
      onMobileClose?.();
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleCreateDrawing = async () => {
    try {
      const drawingId = await createDrawing({ title: "Untitled" });
      navigate(`/draw/${drawingId}`);
      onMobileClose?.();
    } catch {
      toast.error("Failed to create drawing");
    }
  };

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
          "fixed inset-y-0 left-0 z-50 flex h-full max-w-[88vw] flex-col overflow-hidden border-r-2 border-brand-sidebar-text/10 bg-brand-dark text-brand-sidebar-text transition-all duration-300 lg:static lg:z-auto lg:max-w-none lg:translate-x-0",
          mobileOpen
            ? "translate-x-0 w-[17.5rem]"
            : "-translate-x-full w-[17.5rem]",
          desktopCollapsed
            ? "lg:w-0 lg:min-w-0 lg:-translate-x-4 lg:border-r-0 lg:opacity-0"
            : "lg:w-60 lg:opacity-100",
        )}
        aria-hidden={desktopCollapsed && !mobileOpen}
      >
        <div className="flex h-14 flex-shrink-0 items-center border-b-2 border-brand-sidebar-text/10 px-5">
          <button
            onClick={() => {
              navigate("/");
              onMobileClose?.();
            }}
            className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="h-5 w-5 rounded bg-brand-accent" />
            <span className="pt-1 font-serif text-lg font-bold italic leading-none tracking-tight">
              FlowBoard<span className="text-brand-accent">.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-brand-sidebar-text/55 transition-colors hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <button
            onClick={() => {
              navigate("/");
              onMobileClose?.();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isHome
                ? "bg-brand-primary text-brand-text"
                : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
            )}
          >
            <Home
              className={cn(
                "h-4 w-4",
                isHome ? "text-brand-accent" : "text-brand-sidebar-text/40",
              )}
            />
            Home
          </button>

          <div>
            <button
              onClick={() => setBoardsExpanded((current) => !current)}
              className="flex w-full items-center gap-2 px-3 py-2 text-brand-sidebar-text/40 transition-colors hover:text-brand-sidebar-text/75"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  boardsExpanded && "rotate-90",
                )}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                Boards
              </span>
              {boards ? (
                <span className="ml-0.5 font-mono text-[10px] text-brand-sidebar-text/25">
                  {boards.length}
                </span>
              ) : null}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowCreate(true);
                }}
                className="ml-auto p-0.5 transition-colors hover:text-brand-sidebar-text"
                title="New board"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </button>

            {boardsExpanded ? (
              <div className="ml-2 mt-1 space-y-0.5">
                {boards === undefined ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    Loading...
                  </div>
                ) : boards.length === 0 ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    No boards yet
                  </div>
                ) : (
                  boards.map((board) => {
                    const boardIcon = getBoardIconOption(board.icon, board.color);

                    return (
                      <button
                        key={board._id}
                        onClick={() => {
                          navigate(`/board/${board._id}`);
                          onMobileClose?.();
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all",
                          activeBoardId === board._id
                            ? "bg-brand-primary text-brand-text"
                            : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
                        )}
                      >
                        <span
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]"
                          style={{
                            backgroundColor: `${board.color}22`,
                            color: board.color,
                          }}
                        >
                          <boardIcon.Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 truncate">{board.name}</span>
                        {board.role === "member" ? (
                          <Users className="h-3 w-3 flex-shrink-0 text-brand-sidebar-text/50" />
                        ) : null}
                        {board.isFavorite ? (
                          <Star
                            className="h-3 w-3 flex-shrink-0 text-yellow-500"
                            fill="currentColor"
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div>
            <button
              onClick={() => setNotesExpanded((current) => !current)}
              className="flex w-full items-center gap-2 px-3 py-2 text-brand-sidebar-text/40 transition-colors hover:text-brand-sidebar-text/75"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  notesExpanded && "rotate-90",
                )}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                Notes
              </span>
              {notes ? (
                <span className="ml-0.5 font-mono text-[10px] text-brand-sidebar-text/25">
                  {notes.length}
                </span>
              ) : null}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  void handleCreateNote();
                }}
                className="ml-auto p-0.5 transition-colors hover:text-brand-sidebar-text"
                title="New note"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </button>

            {notesExpanded ? (
              <div className="ml-2 mt-1 space-y-0.5">
                {notes === undefined ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    Loading...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    No notes yet
                  </div>
                ) : (
                  notes.map((note) => (
                    <button
                      key={note._id}
                      onClick={() => {
                        navigate(`/notes/${note._id}`);
                        onMobileClose?.();
                      }}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all",
                        activeNoteId === note._id
                          ? "bg-brand-primary text-brand-text"
                          : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
                      )}
                    >
                      <FileText
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          activeNoteId === note._id
                            ? "text-brand-accent"
                            : "text-brand-sidebar-text/30",
                        )}
                      />
                      <span className="flex-1 truncate">
                        {note.title || "Untitled"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div>
            <button
              onClick={() => setDrawExpanded((current) => !current)}
              className="flex w-full items-center gap-2 px-3 py-2 text-brand-sidebar-text/40 transition-colors hover:text-brand-sidebar-text/75"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  drawExpanded && "rotate-90",
                )}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                Draw
              </span>
              {drawings ? (
                <span className="ml-0.5 font-mono text-[10px] text-brand-sidebar-text/25">
                  {drawings.length}
                </span>
              ) : null}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  void handleCreateDrawing();
                }}
                className="ml-auto p-0.5 transition-colors hover:text-brand-sidebar-text"
                title="New drawing"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </button>

            {drawExpanded ? (
              <div className="ml-2 mt-1 space-y-0.5">
                {drawings === undefined ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    Loading...
                  </div>
                ) : drawings.length === 0 ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    No drawings yet
                  </div>
                ) : (
                  drawings.map((drawing) => (
                    <button
                      key={drawing._id}
                      onClick={() => {
                        navigate(`/draw/${drawing._id}`);
                        onMobileClose?.();
                      }}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all",
                        activeDrawId === drawing._id
                          ? "bg-brand-primary text-brand-text"
                          : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
                      )}
                    >
                      <PencilLine
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          activeDrawId === drawing._id
                            ? "text-brand-accent"
                            : "text-brand-sidebar-text/30",
                        )}
                      />
                      <span className="flex-1 truncate">
                        {drawing.title || "Untitled"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="flex-shrink-0 border-t-2 border-brand-sidebar-text/10 p-3">
          <div className="rounded-xl bg-brand-sidebar-text/6 p-3">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-brand-sidebar-text/40">
              System
            </div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="font-mono text-xs text-brand-sidebar-text/80">
                Operational
              </span>
            </div>
          </div>
        </div>
      </aside>

      <CreateBoardModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  );
}
