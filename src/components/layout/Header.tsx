import { SearchBar } from "../search/SearchBar";
import { UserMenu } from "../auth/UserMenu";
import { NotificationBell } from "../notifications/NotificationBell";

interface HeaderProps {
  boardName?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Header({
  boardName,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: HeaderProps) {
  return (
    <header className="h-14 flex-shrink-0 border-b-2 border-brand-text flex items-center justify-between px-5 bg-brand-primary z-20">
      <div className="flex items-center gap-4">
        {boardName && (
          <h1 className="text-lg font-bold font-serif italic tracking-tight hidden sm:block">
            {boardName}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onSearchChange && (
          <div className="hidden md:block">
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
    </header>
  );
}
