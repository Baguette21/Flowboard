import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ChevronRight,
  FileText,
  Home,
  PanelLeftClose,
  PencilLine,
  Plus,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateKeyBetween } from "fractional-indexing";
import { cn } from "../../lib/utils";
import { CreateBoardModal } from "../board/CreateBoardModal";
import { getBoardIconOption } from "../../lib/boardIcons";
import { toast } from "sonner";
import { useBoardTabs } from "../../hooks/useBoardTabs";

function SortableSidebarItem({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

interface SidebarProps {
  activeBoardId?: Id<"boards">;
  activeNoteId?: Id<"notes">;
  activeDrawId?: Id<"drawings">;
  mobileOpen?: boolean;
  desktopCollapsed?: boolean;
  peek?: boolean;
  onDesktopToggle?: () => void;
  onMobileClose?: () => void;
  onPeekLeave?: () => void;
}

export function Sidebar({
  activeBoardId,
  activeNoteId,
  activeDrawId,
  mobileOpen = false,
  desktopCollapsed = false,
  peek = false,
  onDesktopToggle,
  onMobileClose,
  onPeekLeave,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openInActiveTab } = useBoardTabs();
  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list);
  const drawings = useQuery(api.drawings.list);
  const createNote = useMutation(api.notes.create);
  const createDrawing = useMutation(api.drawings.create);
  const reorderBoards = useMutation(api.boards.reorder);
  const reorderNotes = useMutation(api.notes.reorder);
  const reorderDrawings = useMutation(api.drawings.reorder);
  const [showCreate, setShowCreate] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [drawExpanded, setDrawExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleBoardsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !boards || active.id === over.id) return;
    const oldIndex = boards.findIndex((b) => b._id === active.id);
    const newIndex = boards.findIndex((b) => b._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(boards, oldIndex, newIndex);
    let lastKey: string | null = null;
    const orders: { boardId: Id<"boards">; order: string }[] = [];
    for (const board of reordered) {
      lastKey = generateKeyBetween(lastKey, null);
      if (board.role === "owner") {
        orders.push({ boardId: board._id, order: lastKey });
      }
    }
    if (orders.length > 0) {
      void reorderBoards({ orders }).catch(() => {
        toast.error("Failed to reorder boards");
      });
    }
  };

  const handleNotesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !notes || active.id === over.id) return;
    const oldIndex = notes.findIndex((n) => n._id === active.id);
    const newIndex = notes.findIndex((n) => n._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(notes, oldIndex, newIndex);
    let lastKey: string | null = null;
    const orders = reordered.map((note) => {
      lastKey = generateKeyBetween(lastKey, null);
      return { noteId: note._id, order: lastKey };
    });
    void reorderNotes({ orders }).catch(() => {
      toast.error("Failed to reorder notes");
    });
  };

  const handleDrawingsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !drawings || active.id === over.id) return;
    const oldIndex = drawings.findIndex((d) => d._id === active.id);
    const newIndex = drawings.findIndex((d) => d._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(drawings, oldIndex, newIndex);
    let lastKey: string | null = null;
    const orders = reordered.map((drawing) => {
      lastKey = generateKeyBetween(lastKey, null);
      return { drawingId: drawing._id, order: lastKey };
    });
    void reorderDrawings({ orders }).catch(() => {
      toast.error("Failed to reorder drawings");
    });
  };

  const isHome = location.pathname === "/";

  const handleCreateNote = async () => {
    try {
      const noteId = await createNote({ title: "Untitled" });
      openInActiveTab({ kind: "note", id: noteId });
      onMobileClose?.();
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleCreateDrawing = async () => {
    try {
      const drawingId = await createDrawing({ title: "Untitled" });
      openInActiveTab({ kind: "draw", id: drawingId });
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
          "fixed inset-y-0 left-0 z-50 flex h-full max-w-[88vw] flex-col overflow-hidden border-r-2 border-brand-sidebar-text/10 bg-brand-dark text-brand-sidebar-text transition-all duration-300 lg:max-w-none",
          mobileOpen
            ? "translate-x-0 w-[17.5rem]"
            : "-translate-x-full w-[17.5rem]",
          peek && desktopCollapsed
            ? "lg:fixed lg:z-50 lg:top-3 lg:bottom-3 lg:left-0 lg:h-auto lg:w-60 lg:translate-x-0 lg:opacity-100 lg:rounded-l-none lg:rounded-r-md lg:border-2 lg:border-l-0 lg:shadow-2xl"
            : desktopCollapsed
              ? "lg:static lg:z-auto lg:w-0 lg:min-w-0 lg:-translate-x-4 lg:border-r-0 lg:opacity-0"
              : "lg:static lg:z-auto lg:w-60 lg:translate-x-0 lg:opacity-100",
        )}
        aria-hidden={desktopCollapsed && !mobileOpen && !peek}
        onMouseLeave={peek && desktopCollapsed ? onPeekLeave : undefined}
      >
        <div className="flex h-14 flex-shrink-0 items-center border-b-2 border-brand-sidebar-text/10 px-5">
          <div className="flex min-w-0 items-center gap-2">
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
              onClick={onDesktopToggle}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-brand-sidebar-text/55 transition-colors hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text lg:flex"
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleBoardsDragEnd}
                  >
                    <SortableContext
                      items={boards.map((b) => b._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {boards.map((board) => {
                        const boardIcon = getBoardIconOption(
                          board.icon,
                          board.color,
                        );

                        return (
                          <SortableSidebarItem key={board._id} id={board._id}>
                            <button
                              onClick={() => {
                                openInActiveTab({
                                  kind: "board",
                                  id: board._id,
                                });
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
                              <span className="flex-1 truncate">
                                {board.name}
                              </span>
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
                          </SortableSidebarItem>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleNotesDragEnd}
                  >
                    <SortableContext
                      items={notes.map((n) => n._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {notes.map((note) => (
                        <SortableSidebarItem key={note._id} id={note._id}>
                          <button
                            onClick={() => {
                              openInActiveTab({
                                kind: "note",
                                id: note._id,
                              });
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
                        </SortableSidebarItem>
                      ))}
                    </SortableContext>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDrawingsDragEnd}
                  >
                    <SortableContext
                      items={drawings.map((d) => d._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {drawings.map((drawing) => (
                        <SortableSidebarItem
                          key={drawing._id}
                          id={drawing._id}
                        >
                          <button
                            onClick={() => {
                              openInActiveTab({
                                kind: "draw",
                                id: drawing._id,
                              });
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
                        </SortableSidebarItem>
                      ))}
                    </SortableContext>
                  </DndContext>
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
