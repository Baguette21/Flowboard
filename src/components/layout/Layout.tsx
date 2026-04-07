import type { ReactNode } from "react";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { Id } from "../../../convex/_generated/dataModel";

interface LayoutProps {
  children: ReactNode;
  boardName?: string;
  boardId?: Id<"boards">;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Layout({
  children,
  boardName,
  boardId,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-brand-bg text-brand-text md:h-screen md:overflow-hidden">
      <Sidebar
        activeBoardId={boardId}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-1 min-w-0 flex-col md:min-h-0 md:overflow-hidden">
        <Header
          boardName={boardName}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
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
