import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Archive,
  ChevronRight,
  Copy,
  Edit3,
  FileText,
  PanelLeftClose,
  PencilLine,
  Plus,
  Search,
  Star,
  Trash2,
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
import { UserMenu } from "../auth/UserMenu";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { usePrivacyMode } from "../../hooks/usePrivacyMode";
import { PlanthingMark } from "../branding/PlanthingMark";

type SidebarContextItem =
  | {
      kind: "board";
      id: Id<"boards">;
      title: string;
      isFavorite: boolean;
      canArchive: boolean;
      canDelete: boolean;
    }
  | {
      kind: "note";
      id: Id<"notes">;
      title: string;
      isFavorite: boolean;
      canArchive: true;
      canDelete: true;
    }
  | {
      kind: "draw";
      id: Id<"drawings">;
      title: string;
      isFavorite: boolean;
      canArchive: true;
      canDelete: true;
    };

type SidebarContextMenuState = SidebarContextItem & {
  x: number;
  y: number;
};

const SIDEBAR_WIDTH_STORAGE_KEY = "planthing.sidebarWidth";
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 420;

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

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
  const { openInActiveTab } = useBoardTabs();
  const { enabled: privacyMode } = usePrivacyMode();
  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list);
  const drawings = useQuery(api.drawings.list);
  const me = useQuery(api.users.me);
  const createNote = useMutation(api.notes.create);
  const createDrawing = useMutation(api.drawings.create);
  const updateBoard = useMutation(api.boards.update);
  const updateNote = useMutation(api.notes.update);
  const updateDrawing = useMutation(api.drawings.update);
  const deleteBoard = useMutation(api.boards.remove);
  const deleteNote = useMutation(api.notes.remove);
  const deleteDrawing = useMutation(api.drawings.remove);
  const ensureInviteLink = useMutation(api.boardInvites.ensureLink);
  const reorderBoards = useMutation(api.boards.reorder);
  const reorderNotes = useMutation(api.notes.reorder);
  const reorderDrawings = useMutation(api.drawings.reorder);
  const [showCreate, setShowCreate] = useState(false);
  const [contextMenu, setContextMenu] = useState<SidebarContextMenuState | null>(null);
  const [renameItem, setRenameItem] = useState<SidebarContextItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteItem, setDeleteItem] = useState<SidebarContextItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [drawExpanded, setDrawExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const isPro = me?.role === "PRO";
  const accountName = me?.name?.trim() || me?.email?.trim() || "Account";

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

  const sidebarStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
  } as CSSProperties;
  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();
  const matchesSidebarSearch = (title: string) =>
    normalizedSidebarSearch.length === 0 ||
    title.toLowerCase().includes(normalizedSidebarSearch);
  const visibleBoards = (boards ?? []).filter(
    (board) => !board.isFavorite && matchesSidebarSearch(board.name),
  );
  const visibleNotes = (notes ?? []).filter(
    (note) =>
      !note.isFavorite && matchesSidebarSearch(note.title || "Untitled"),
  );
  const visibleDrawings = (drawings ?? []).filter(
    (drawing) =>
      !drawing.isFavorite && matchesSidebarSearch(drawing.title || "Untitled"),
  );
  const favoriteItems = [
    ...(boards ?? [])
      .filter((board) => board.isFavorite)
      .filter((board) => matchesSidebarSearch(board.name))
      .map((board) => ({
        key: `board-${board._id}`,
        kind: "board" as const,
        id: board._id,
        title: board.name,
        color: board.color,
        icon: board.icon,
        canArchive: board.role === "owner",
        canDelete: board.role === "owner",
      })),
    ...(notes ?? [])
      .filter((note) => note.isFavorite)
      .filter((note) => matchesSidebarSearch(note.title || "Untitled"))
      .map((note) => ({
        key: `note-${note._id}`,
        kind: "note" as const,
        id: note._id,
        title: note.title || "Untitled",
        canArchive: true,
        canDelete: true,
      })),
    ...(isPro ? drawings ?? [] : [])
      .filter((drawing) => drawing.isFavorite)
      .filter((drawing) => matchesSidebarSearch(drawing.title || "Untitled"))
      .map((drawing) => ({
        key: `draw-${drawing._id}`,
        kind: "draw" as const,
        id: drawing._id,
        title: drawing.title || "Untitled",
        canArchive: true,
        canDelete: true,
      })),
  ];

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        event.key === "/" &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA"
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sidebarSearchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      setSidebarWidth(clampSidebarWidth(stored));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.body.style.setProperty("-webkit-user-select", "none");

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.removeProperty("-webkit-user-select");
    };
  }, [isResizing]);

  const handleResizeStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(moveEvent.clientX));
    };
    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const openContextMenu = (
    event: MouseEvent,
    item: SidebarContextItem,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      ...item,
      x: Math.min(event.clientX, window.innerWidth - 260),
      y: Math.min(event.clientY, window.innerHeight - 300),
    });
  };

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
    if (!isPro) {
      toast.error("Draw is available to Pro users only");
      return;
    }

    try {
      const drawingId = await createDrawing({ title: "Untitled" });
      openInActiveTab({ kind: "draw", id: drawingId });
      onMobileClose?.();
    } catch {
      toast.error("Failed to create drawing");
    }
  };

  const handleFavorite = async (item: SidebarContextItem) => {
    const isFavorite = !item.isFavorite;
    try {
      if (item.kind === "board") {
        await updateBoard({ boardId: item.id, isFavorite });
      } else if (item.kind === "note") {
        await updateNote({ noteId: item.id, isFavorite });
      } else {
        await updateDrawing({ drawingId: item.id, isFavorite });
      }
      toast.success(isFavorite ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleShare = async (item: SidebarContextItem) => {
    try {
      let url = `${window.location.origin}${
        item.kind === "board"
          ? `/board/${item.id}`
          : item.kind === "note"
            ? `/notes/${item.id}`
            : `/draw/${item.id}`
      }`;
      if (item.kind === "board") {
        try {
          const result = await ensureInviteLink({ boardId: item.id });
          url = `${window.location.origin}/join/${result.inviteToken}`;
        } catch {
          url = `${window.location.origin}/board/${item.id}`;
        }
      }
      await navigator.clipboard.writeText(url);
      toast.success(item.kind === "board" ? "Share link copied" : "Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleArchive = async (item: SidebarContextItem) => {
    try {
      const archivedAt = Date.now();
      if (item.kind === "board") {
        await updateBoard({ boardId: item.id, archivedAt });
      } else if (item.kind === "note") {
        await updateNote({ noteId: item.id, archivedAt });
      } else {
        await updateDrawing({ drawingId: item.id, archivedAt });
      }
      if (
        (item.kind === "board" && activeBoardId === item.id) ||
        (item.kind === "note" && activeNoteId === item.id) ||
        (item.kind === "draw" && activeDrawId === item.id)
      ) {
        navigate("/");
      }
      toast.success("Archived");
    } catch {
      toast.error("Failed to archive");
    }
  };

  const beginRename = (item: SidebarContextItem) => {
    setRenameItem(item);
    setRenameValue(item.title === "Untitled" ? "" : item.title);
  };

  const handleRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!renameItem) return;
    const nextTitle = renameValue.trim() || "Untitled";
    setIsRenaming(true);
    try {
      if (renameItem.kind === "board") {
        await updateBoard({ boardId: renameItem.id, name: nextTitle });
      } else if (renameItem.kind === "note") {
        await updateNote({ noteId: renameItem.id, title: nextTitle });
      } else {
        await updateDrawing({ drawingId: renameItem.id, title: nextTitle });
      }
      toast.success("Renamed");
      setRenameItem(null);
    } catch {
      toast.error("Failed to rename");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      if (deleteItem.kind === "board") {
        await deleteBoard({ boardId: deleteItem.id });
      } else if (deleteItem.kind === "note") {
        await deleteNote({ noteId: deleteItem.id });
      } else {
        await deleteDrawing({ drawingId: deleteItem.id });
      }
      if (
        (deleteItem.kind === "board" && activeBoardId === deleteItem.id) ||
        (deleteItem.kind === "note" && activeNoteId === deleteItem.id) ||
        (deleteItem.kind === "draw" && activeDrawId === deleteItem.id)
      ) {
        navigate("/");
      }
      toast.success("Deleted");
      setDeleteItem(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
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
        style={sidebarStyle}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full max-w-[88vw] flex-col overflow-visible border-r-2 border-brand-sidebar-text/10 bg-brand-dark text-brand-sidebar-text transition-all duration-300 lg:max-w-none",
          isResizing && "lg:transition-none",
          mobileOpen
            ? "translate-x-0 w-[17.5rem]"
            : "-translate-x-full w-[17.5rem]",
          peek && desktopCollapsed
            ? "lg:fixed lg:z-50 lg:top-3 lg:bottom-3 lg:left-0 lg:h-auto lg:w-[var(--sidebar-width)] lg:translate-x-0 lg:opacity-100 lg:rounded-l-none lg:rounded-r-md lg:border-2 lg:border-l-0 lg:shadow-2xl"
            : desktopCollapsed
              ? "lg:static lg:z-auto lg:w-0 lg:min-w-0 lg:-translate-x-4 lg:border-r-0 lg:opacity-0"
              : "lg:static lg:z-auto lg:w-[var(--sidebar-width)] lg:translate-x-0 lg:opacity-100",
        )}
        aria-hidden={desktopCollapsed && !mobileOpen && !peek}
        onMouseLeave={peek && desktopCollapsed ? onPeekLeave : undefined}
      >
        {!desktopCollapsed || peek ? (
          <button
            type="button"
            onPointerDown={handleResizeStart}
            className={cn(
              "absolute -right-1 top-0 z-[70] hidden h-full w-2 cursor-col-resize touch-none items-stretch justify-center lg:flex",
              "after:my-3 after:w-px after:rounded-full after:bg-transparent after:transition-colors hover:after:bg-brand-sidebar-text/28",
              isResizing && "after:bg-brand-sidebar-text/45",
            )}
            aria-label="Resize sidebar"
            title="Resize sidebar"
          />
        ) : null}
        <div className="flex h-14 flex-shrink-0 items-center border-b-2 border-brand-sidebar-text/10 px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => {
                navigate("/");
                onMobileClose?.();
              }}
              className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
            >
              <PlanthingMark className="h-5 w-5" />
              <span className="pt-1 font-serif text-lg font-bold italic leading-none tracking-tight">
                Planthing<span className="text-brand-accent">.</span>
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

        <div className="relative flex min-h-0 flex-1 flex-col">
          <nav className="brand-dark-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4 pb-24">
            <div className="px-1">
              <div className="group relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-sidebar-text/35 transition-colors group-focus-within:text-brand-sidebar-text/70" />
                <input
                  ref={sidebarSearchRef}
                  type="text"
                  value={sidebarSearch}
                  onChange={(event) => setSidebarSearch(event.target.value)}
                  placeholder="Search your things..."
                  className="h-10 w-full rounded-none border-0 border-b border-brand-sidebar-text/15 bg-transparent pl-10 pr-10 text-sm text-brand-sidebar-text outline-none transition-colors placeholder:text-brand-sidebar-text/30 focus:border-brand-sidebar-text/35"
                />
                {sidebarSearch ? (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-sidebar-text/40 transition-colors hover:text-brand-sidebar-text"
                    aria-label="Clear sidebar search"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <div className="flex w-full items-center gap-2 px-3 py-2 text-brand-sidebar-text/40">
                <Star className="h-3 w-3" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                  Favorites
                </span>
                {boards && notes && drawings ? (
                  <span className="ml-0.5 font-mono text-[10px] text-brand-sidebar-text/25">
                    {favoriteItems.length}
                  </span>
                ) : null}
              </div>

              <div className="ml-2 mt-1 space-y-0.5">
                {boards === undefined || notes === undefined || drawings === undefined ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    Loading...
                  </div>
                ) : favoriteItems.length === 0 ? (
                  <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                    {normalizedSidebarSearch ? "No favorite results" : "No favorites yet"}
                  </div>
                ) : (
                  favoriteItems.map((item) => {
                    const isActive =
                      (item.kind === "board" && activeBoardId === item.id) ||
                      (item.kind === "note" && activeNoteId === item.id) ||
                      (item.kind === "draw" && activeDrawId === item.id);
                    const boardIcon =
                      item.kind === "board"
                        ? getBoardIconOption(item.icon, item.color)
                        : null;

                    return (
                      <button
                        key={item.key}
                        onContextMenu={(event) => {
                          if (item.kind === "board") {
                            openContextMenu(event, {
                              kind: "board",
                              id: item.id,
                              title: item.title,
                              isFavorite: true,
                              canArchive: item.canArchive,
                              canDelete: item.canDelete,
                            });
                          } else if (item.kind === "note") {
                            openContextMenu(event, {
                              kind: "note",
                              id: item.id,
                              title: item.title,
                              isFavorite: true,
                              canArchive: true,
                              canDelete: true,
                            });
                          } else {
                            openContextMenu(event, {
                              kind: "draw",
                              id: item.id,
                              title: item.title,
                              isFavorite: true,
                              canArchive: true,
                              canDelete: true,
                            });
                          }
                        }}
                        onClick={() => {
                          openInActiveTab({ kind: item.kind, id: item.id });
                          onMobileClose?.();
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all",
                          isActive
                            ? "bg-brand-primary text-brand-text"
                            : "text-brand-sidebar-text/60 hover:bg-brand-sidebar-text/8 hover:text-brand-sidebar-text",
                        )}
                      >
                        {item.kind === "board" && boardIcon ? (
                          <span
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]"
                            style={{
                              backgroundColor: `${item.color}22`,
                              color: item.color,
                            }}
                          >
                            <boardIcon.Icon className="h-3.5 w-3.5" />
                          </span>
                        ) : item.kind === "note" ? (
                          <FileText className="h-4 w-4 flex-shrink-0 text-brand-sidebar-text/30" />
                        ) : (
                          <PencilLine className="h-4 w-4 flex-shrink-0 text-brand-sidebar-text/30" />
                        )}
                        <span className="flex-1 truncate">{item.title}</span>
                        <Star
                          className="h-3 w-3 flex-shrink-0 text-yellow-500"
                          fill="currentColor"
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

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
                    {visibleBoards.length}
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
                  ) : visibleBoards.length === 0 ? (
                    <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                      {normalizedSidebarSearch ? "No board results" : "No boards yet"}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleBoardsDragEnd}
                    >
                      <SortableContext
                        items={visibleBoards.map((b) => b._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {visibleBoards.map((board) => {
                          const boardIcon = getBoardIconOption(
                            board.icon,
                            board.color,
                          );

                          return (
                            <SortableSidebarItem key={board._id} id={board._id}>
                              <button
                                onPointerDownCapture={(event) => {
                                  event.stopPropagation();
                                }}
                                onContextMenu={(event) =>
                                  openContextMenu(event, {
                                    kind: "board",
                                    id: board._id,
                                    title: board.name,
                                    isFavorite: board.isFavorite,
                                    canArchive: board.role === "owner",
                                    canDelete: board.role === "owner",
                                  })
                                }
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
                    {visibleNotes.length}
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
                  ) : visibleNotes.length === 0 ? (
                    <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                      {normalizedSidebarSearch ? "No note results" : "No notes yet"}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleNotesDragEnd}
                    >
                      <SortableContext
                        items={visibleNotes.map((n) => n._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {visibleNotes.map((note) => (
                          <SortableSidebarItem key={note._id} id={note._id}>
                            <button
                              onPointerDownCapture={(event) => {
                                event.stopPropagation();
                              }}
                              onContextMenu={(event) =>
                                openContextMenu(event, {
                                  kind: "note",
                                  id: note._id,
                                  title: note.title || "Untitled",
                                  isFavorite: note.isFavorite ?? false,
                                  canArchive: true,
                                  canDelete: true,
                                })
                              }
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
                              {note.isFavorite ? (
                                <Star
                                  className="h-3 w-3 flex-shrink-0 text-yellow-500"
                                  fill="currentColor"
                                />
                              ) : null}
                            </button>
                          </SortableSidebarItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              ) : null}
            </div>

            {isPro ? (
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
                    {visibleDrawings.length}
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
                  ) : visibleDrawings.length === 0 ? (
                    <div className="px-3 py-2 font-mono text-xs text-brand-sidebar-text/30">
                      {normalizedSidebarSearch ? "No draw results" : "No drawings yet"}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDrawingsDragEnd}
                    >
                      <SortableContext
                        items={visibleDrawings.map((d) => d._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {visibleDrawings.map((drawing) => (
                          <SortableSidebarItem
                            key={drawing._id}
                            id={drawing._id}
                          >
                            <button
                              onPointerDownCapture={(event) => {
                                event.stopPropagation();
                              }}
                              onContextMenu={(event) =>
                                openContextMenu(event, {
                                  kind: "draw",
                                  id: drawing._id,
                                  title: drawing.title || "Untitled",
                                  isFavorite: drawing.isFavorite ?? false,
                                  canArchive: true,
                                  canDelete: true,
                                })
                              }
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
                              {drawing.isFavorite ? (
                                <Star
                                  className="h-3 w-3 flex-shrink-0 text-yellow-500"
                                  fill="currentColor"
                                />
                              ) : null}
                            </button>
                          </SortableSidebarItem>
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              ) : null}
            </div>
            ) : null}
          </nav>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-dark via-brand-dark/58 to-transparent" />
        </div>

        <div className="relative flex-shrink-0 border-t-2 border-brand-sidebar-text/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <UserMenu />
              <div
                className={cn(
                  "min-w-0 truncate text-sm font-bold text-brand-sidebar-text/88",
                  privacyMode && "blur-sm",
                )}
              >
                {accountName}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <CreateBoardModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {contextMenu ? (
        <div
          className="fixed z-[80] w-64 rounded-xl border border-brand-sidebar-text/12 bg-[#232323] p-2 text-brand-sidebar-text shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="px-3 pb-2 pt-1 font-mono text-[11px] text-brand-sidebar-text/45">
            {contextMenu.kind === "board"
              ? "Board"
              : contextMenu.kind === "note"
                ? "Note"
                : "Drawing"}
          </div>
          <SidebarMenuButton
            icon={<Star className="h-4 w-4" />}
            label={contextMenu.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            onClick={() => {
              void handleFavorite(contextMenu);
              setContextMenu(null);
            }}
          />
          <SidebarMenuButton
            icon={<Copy className="h-4 w-4" />}
            label={contextMenu.kind === "board" ? "Copy share link" : "Copy link"}
            onClick={() => {
              void handleShare(contextMenu);
              setContextMenu(null);
            }}
          />
          <SidebarMenuButton
            icon={<Edit3 className="h-4 w-4" />}
            label="Rename"
            onClick={() => {
              beginRename(contextMenu);
              setContextMenu(null);
            }}
          />
          <SidebarMenuButton
            icon={<Archive className="h-4 w-4" />}
            label={contextMenu.canArchive ? "Archive" : "Archive unavailable"}
            disabled={!contextMenu.canArchive}
            onClick={() => {
              void handleArchive(contextMenu);
              setContextMenu(null);
            }}
          />
          <div className="my-1 border-t border-brand-sidebar-text/10" />
          <SidebarMenuButton
            icon={<Trash2 className="h-4 w-4" />}
            label={contextMenu.canDelete ? "Delete" : "Delete unavailable"}
            destructive={contextMenu.canDelete}
            disabled={!contextMenu.canDelete}
            onClick={() => {
              setDeleteItem(contextMenu);
              setContextMenu(null);
            }}
          />
        </div>
      ) : null}

      <Modal
        open={renameItem !== null}
        onClose={() => setRenameItem(null)}
        title="Rename"
        size="sm"
      >
        <form onSubmit={handleRename} className="space-y-4 p-6">
          <input
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            maxLength={60}
            className="h-12 w-full rounded-2xl border-2 border-brand-text/20 bg-brand-bg px-4 text-sm outline-none transition-colors focus:border-brand-text"
            placeholder="Untitled"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRenameItem(null)}
              className="h-11 rounded-2xl border-2 border-brand-text/20 px-5 font-mono text-sm font-bold transition-colors hover:border-brand-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRenaming}
              className="h-11 rounded-2xl bg-brand-text px-5 font-mono text-sm font-bold text-brand-bg transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {isRenaming ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void handleDelete()}
        title={`Delete ${deleteItem?.kind ?? "item"}`}
        description={`This will permanently delete "${deleteItem?.title ?? "Untitled"}". This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}

function SidebarMenuButton({
  icon,
  label,
  onClick,
  destructive = false,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        destructive
          ? "text-red-300 hover:bg-red-500/12"
          : "text-brand-sidebar-text/86 hover:bg-brand-sidebar-text/10 hover:text-brand-sidebar-text",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
