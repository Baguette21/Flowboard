import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { Id } from "../../../convex/_generated/dataModel";

interface LayoutProps {
  children: ReactNode;
  boardId?: Id<"boards">;
  activeNoteId?: Id<"notes">;
  activeDrawId?: Id<"drawings">;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

const DESKTOP_SIDEBAR_STORAGE_KEY = "flowboard.desktopSidebarCollapsed";

export function Layout({
  children,
  boardId,
  activeNoteId,
  activeDrawId,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [sidebarPeek, setSidebarPeek] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
    setDesktopSidebarCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DESKTOP_SIDEBAR_STORAGE_KEY,
      desktopSidebarCollapsed ? "true" : "false",
    );
  }, [desktopSidebarCollapsed]);

  const handleOpenSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setDesktopSidebarCollapsed(false);
    } else {
      setMobileSidebarOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-brand-bg text-brand-text md:h-screen md:overflow-hidden">
      {desktopSidebarCollapsed ? (
        <div
          className="fixed left-0 top-0 z-30 hidden h-full w-2 lg:block"
          onMouseEnter={() => setSidebarPeek(true)}
          aria-hidden="true"
        />
      ) : null}
      <Sidebar
        activeBoardId={boardId}
        activeNoteId={activeNoteId}
        activeDrawId={activeDrawId}
        mobileOpen={mobileSidebarOpen}
        desktopCollapsed={desktopSidebarCollapsed}
        peek={sidebarPeek}
        onDesktopToggle={() => {
          setDesktopSidebarCollapsed((current) => !current);
          setSidebarPeek(false);
        }}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onPeekLeave={() => setSidebarPeek(false)}
      />
      <div className="flex flex-1 min-w-0 flex-col md:min-h-0 md:overflow-hidden">
        <Header
          onOpenSidebar={handleOpenSidebar}
          sidebarCollapsed={desktopSidebarCollapsed}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />
        <main className="flex flex-1 flex-col md:min-h-0 md:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
