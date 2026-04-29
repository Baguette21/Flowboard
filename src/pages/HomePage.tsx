import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Layout } from "../components/layout/Layout";
import { BoardCard } from "../components/board/BoardCard";
import { NoteCard } from "../components/notes/NoteCard";
import { CreateBoardModal } from "../components/board/CreateBoardModal";
import { ColumnSkeleton } from "../components/ui/Skeleton";
import {
  Plus,
  Star,
  Clock,
  LayoutGrid,
  FileText,
  Search,
  Layers,
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useBoardTabs } from "../hooks/useBoardTabs";

type FilterTab = "all" | "boards" | "notes";

export function HomePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const { openInActiveTab } = useBoardTabs();

  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);

  const isLoading = boards === undefined || notes === undefined;

  const handleCreateNote = async () => {
    try {
      const noteId = await createNote({ title: "Untitled" });
      openInActiveTab({ kind: "note", id: noteId });
    } catch {
      toast.error("Failed to create note");
    }
  };

  // ── Filter + search ──
  const normalizedSearch = search.trim().toLowerCase();

  const filteredBoards = (boards ?? []).filter((b) =>
    normalizedSearch ? b.name.toLowerCase().includes(normalizedSearch) : true,
  );
  const filteredNotes = (notes ?? []).filter((n) =>
    normalizedSearch
      ? (n.title || "").toLowerCase().includes(normalizedSearch)
      : true,
  );

  const favorites = filteredBoards.filter((b) => b.isFavorite);

  // Build a unified feed sorted by updatedAt
  type FeedItem =
    | { kind: "board"; updatedAt: number; board: (typeof filteredBoards)[0] }
    | { kind: "note"; updatedAt: number; note: (typeof filteredNotes)[0] };

  const buildFeed = (): FeedItem[] => {
    const items: FeedItem[] = [];

    if (filter !== "notes") {
      // Exclude favorites from the "recent" section — they have their own row
      const nonFavBoards = filteredBoards.filter((b) => !b.isFavorite);
      items.push(
        ...nonFavBoards.map(
          (b) => ({ kind: "board" as const, updatedAt: b.updatedAt, board: b }),
        ),
      );
    }

    if (filter !== "boards") {
      items.push(
        ...filteredNotes.map(
          (n) => ({ kind: "note" as const, updatedAt: n.updatedAt, note: n }),
        ),
      );
    }

    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const feed = isLoading ? [] : buildFeed();

  const totalCount = (boards?.length ?? 0) + (notes?.length ?? 0);
  const boardCount = boards?.length ?? 0;
  const noteCount = notes?.length ?? 0;
  const hasSearch = normalizedSearch.length > 0;
  const showFavorites =
    !hasSearch && filter !== "notes" && favorites.length > 0;

  const filterTabs: { key: FilterTab; label: string; icon: typeof Layers }[] = [
    { key: "all", label: "All", icon: Layers },
    { key: "boards", label: "Boards", icon: LayoutGrid },
    { key: "notes", label: "Notes", icon: FileText },
  ];

  return (
    <Layout
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search your things..."
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {/* ── Page header ── */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-serif italic font-bold">
                Workspace
              </h1>
              <p className="font-mono text-sm text-brand-text/50 mt-1">
                {hasSearch
                  ? `${filteredBoards.length + filteredNotes.length} result${filteredBoards.length + filteredNotes.length !== 1 ? "s" : ""} for "${search.trim()}"`
                  : `${boardCount} board${boardCount !== 1 ? "s" : ""} · ${noteCount} note${noteCount !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateBoard(true)}
                className="flex items-center justify-center gap-2 h-10 px-4 bg-brand-text text-brand-bg rounded-[12px] font-mono font-bold text-sm hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Board</span>
                <span className="sm:hidden">Board</span>
              </button>
              <button
                onClick={() => void handleCreateNote()}
                className="flex items-center justify-center gap-2 h-10 px-4 bg-brand-primary border-2 border-brand-text/20 text-brand-text rounded-[12px] font-mono font-bold text-sm hover:border-brand-text transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Note</span>
                <span className="sm:hidden">Note</span>
              </button>
            </div>
          </div>

          {/* ── Filter tabs ── */}
          <div className="flex items-center gap-1 mb-6 sm:mb-8">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors",
                    isActive
                      ? "bg-brand-text/10 text-brand-text"
                      : "text-brand-text/45 hover:text-brand-text/70 hover:bg-brand-text/5",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Content ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3].map((i) => (
                <ColumnSkeleton key={i} />
              ))}
            </div>
          ) : totalCount === 0 ? (
            /* ── Empty workspace ── */
            <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center">
              <div className="w-16 h-16 rounded-[12px] bg-brand-text/5 flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-brand-text/20" />
              </div>
              <h2 className="font-serif italic font-bold text-2xl mb-2">
                Welcome to PlanThing
              </h2>
              <p className="text-brand-text/50 font-mono text-sm mb-6 max-w-xs">
                Create your first board or note to get started.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateBoard(true)}
                  className="flex items-center gap-2 h-11 px-6 bg-brand-text text-brand-bg rounded-[12px] font-mono font-bold text-sm hover:bg-brand-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Board
                </button>
                <button
                  onClick={() => void handleCreateNote()}
                  className="flex items-center gap-2 h-11 px-6 bg-brand-primary border-2 border-brand-text/20 text-brand-text rounded-[12px] font-mono font-bold text-sm hover:border-brand-text transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  New Note
                </button>
              </div>
            </div>
          ) : feed.length === 0 && favorites.length === 0 ? (
            /* ── No search results ── */
            <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center">
              <div className="w-16 h-16 rounded-[12px] bg-brand-text/5 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-brand-text/20" />
              </div>
              <h2 className="font-serif italic font-bold text-2xl mb-2">
                No results
              </h2>
              <p className="text-brand-text/50 font-mono text-sm max-w-sm">
                Nothing matches "{search.trim()}". Try a different search term
                {filter !== "all" ? " or filter." : "."}
              </p>
            </div>
          ) : (
            <div className="space-y-8 sm:space-y-10">
              {/* ── Favorites ── */}
              {showFavorites && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Star
                      className="w-4 h-4 text-yellow-500"
                      fill="currentColor"
                    />
                    <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-brand-text/60">
                      Favorites
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {favorites.map((board) => (
                      <BoardCard key={board._id} board={board} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Recent ── */}
              {feed.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-brand-text/40" />
                    <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-brand-text/60">
                      Recent
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {feed.map((item) =>
                      item.kind === "board" ? (
                        <BoardCard
                          key={item.board._id}
                          board={item.board}
                        />
                      ) : (
                        <NoteCard key={item.note._id} note={item.note} />
                      ),
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateBoardModal
        open={showCreateBoard}
        onClose={() => setShowCreateBoard(false)}
      />
    </Layout>
  );
}
