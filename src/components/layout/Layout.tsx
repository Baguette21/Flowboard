import type { ReactNode } from "react";
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
  return (
    <div className="flex h-screen w-full overflow-hidden bg-brand-bg text-brand-text">
      <Sidebar activeBoardId={boardId} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          boardName={boardName}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
