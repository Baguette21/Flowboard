import { useEffect, useState } from "react";
import { Archive, Copy, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface WorkspaceItemMenuProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCopyLink: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function WorkspaceItemMenu({
  isFavorite,
  onToggleFavorite,
  onCopyLink,
  onArchive,
  onDelete,
}: WorkspaceItemMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const runAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-text/45 transition-colors hover:bg-brand-text/8 hover:text-brand-text"
        title="Settings"
        aria-label="Settings"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-brand-text/12 bg-brand-bg p-2 text-brand-text shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <MenuButton
            icon={<Star className="h-4 w-4" />}
            label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            onClick={() => runAction(onToggleFavorite)}
          />
          <MenuButton
            icon={<Copy className="h-4 w-4" />}
            label="Copy link"
            onClick={() => runAction(onCopyLink)}
          />
          <MenuButton
            icon={<Archive className="h-4 w-4" />}
            label="Archive"
            onClick={() => runAction(onArchive)}
          />
          <div className="my-1 border-t border-brand-text/10" />
          <MenuButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            destructive
            onClick={() => runAction(onDelete)}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors",
        destructive
          ? "text-brand-accent hover:bg-brand-accent/10"
          : "text-brand-text/75 hover:bg-brand-text/8 hover:text-brand-text",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
