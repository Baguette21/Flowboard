import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SearchBar } from "../search/SearchBar";
import { UserMenu } from "../auth/UserMenu";
import { NotificationBell } from "../notifications/NotificationBell";

interface HeaderProps {
  boardName?: string;
  onOpenSidebar?: () => void;
  sidebarCollapsed?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Header({
  boardName,
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
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-brand-text/70 transition-colors hover:bg-brand-text/8 hover:text-brand-text"
            aria-label={sidebarCollapsed ? "Open navigation" : "Toggle navigation"}
          >
            <Menu className="w-4 h-4 lg:hidden" />
            {sidebarCollapsed ? (
              <PanelLeftOpen className="hidden w-4 h-4 lg:block" />
            ) : (
              <PanelLeftClose className="hidden w-4 h-4 lg:block" />
            )}
          </button>

          {boardName && (
            <h1 className="truncate text-base font-bold font-serif italic tracking-tight sm:text-lg">
              {boardName}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
