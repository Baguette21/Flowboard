import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SearchBar } from "../search/SearchBar";
import { UserMenu } from "../auth/UserMenu";
import { NotificationBell } from "../notifications/NotificationBell";
import { BoardTabStrip } from "./BoardTabStrip";

interface HeaderProps {
  onOpenSidebar?: () => void;
  sidebarCollapsed?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Header({
  onOpenSidebar,
  sidebarCollapsed = false,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: HeaderProps) {
  return (
    <header
      className="z-20 flex-shrink-0 border-b-2 border-brand-text/12"
      style={{ backgroundColor: "var(--color-brand-header)" }}
    >
      <div className="flex h-12 items-stretch justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onOpenSidebar}
            className={sidebarCollapsed ? "flex h-full w-10 items-center justify-center text-brand-text/70 transition-colors hover:bg-brand-text/8 hover:text-brand-text" : "flex h-full w-10 items-center justify-center text-brand-text/70 transition-colors hover:bg-brand-text/8 hover:text-brand-text lg:hidden"}
            aria-label={sidebarCollapsed ? "Open navigation" : "Toggle navigation"}
          >
            <Menu className="w-4 h-4 lg:hidden" />
            {sidebarCollapsed ? (
              <PanelLeftOpen className="hidden w-4 h-4 lg:block" />
            ) : (
              <PanelLeftClose className="hidden w-4 h-4 lg:block" />
            )}
          </button>

          <BoardTabStrip />
        </div>

        <div className="flex items-stretch gap-2 pr-2">
          {onSearchChange && (
            <div className="hidden lg:block">
              <SearchBar
                value={searchValue ?? ""}
                onChange={onSearchChange}
                placeholder={searchPlaceholder ?? "Search... (/)"}
              />
            </div>
          )}

          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {onSearchChange && (
        <div className="border-t border-brand-text/10 px-4 py-3 lg:hidden">
          <SearchBar
            value={searchValue ?? ""}
            onChange={onSearchChange}
            placeholder={searchPlaceholder ?? "Search... (/)"}
            className="w-full"
          />
        </div>
      )}
    </header>
  );
}
