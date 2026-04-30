import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  BOARD_ACCENT_OPTIONS,
  BOARD_ICON_OPTIONS,
  DEFAULT_BOARD_ACCENT,
  DEFAULT_BOARD_ICON,
} from "../../lib/boardIcons";
import { useBoardTabs } from "../../hooks/useBoardTabs";

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBoardModal({ open, onClose }: CreateBoardModalProps) {
  const createBoard = useMutation(api.boards.create);
  const { openInActiveTab } = useBoardTabs();
  const [name, setName] = useState("");
  const [iconId, setIconId] = useState(DEFAULT_BOARD_ICON.id);
  const [color, setColor] = useState(DEFAULT_BOARD_ACCENT.color);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  const selectedIcon =
    BOARD_ICON_OPTIONS.find((option) => option.id === iconId) ?? DEFAULT_BOARD_ICON;
  const selectedAccent =
    BOARD_ACCENT_OPTIONS.find((option) => option.color === color) ??
    DEFAULT_BOARD_ACCENT;

  useEffect(() => {
    if (!open) {
      setIsLoading(false);
      setName("");
      setIconId(DEFAULT_BOARD_ICON.id);
      setColor(DEFAULT_BOARD_ACCENT.color);
      setShowCustomize(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const boardId = await createBoard({
        name: name.trim(),
        color,
        icon: selectedIcon.id,
      });
      toast.success(`Board "${name}" created!`);
      onClose();
      openInActiveTab({ kind: "board", id: boardId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create board";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="task-panel-backdrop absolute inset-0 bg-brand-text/45"
        onClick={onClose}
      />

      <div className="task-panel-slide absolute right-0 top-0 flex h-full w-full flex-col border-l border-brand-text/10 bg-brand-bg shadow-2xl sm:max-w-[520px]">
        <div className="flex items-center justify-between border-b border-brand-text/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-text/40" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/48">
              New Board
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-brand-text/30 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            <div>
              <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/48">
                Board Name
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Website Redesign"
                required
                maxLength={60}
                className="h-12 w-full rounded-[12px] border border-brand-text/12 bg-brand-primary/40 px-4 text-sm text-brand-text outline-none transition-colors placeholder:text-brand-text/26 focus:border-brand-text/28"
              />
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-brand-text/8 bg-brand-primary/20 px-4 py-3">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
                style={{
                  backgroundColor: `${selectedAccent.color}22`,
                  color: selectedAccent.color,
                }}
                aria-hidden="true"
              >
                <selectedIcon.Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-brand-text">
                  {name.trim() || "Untitled board"}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-brand-text/40">
                  Uses {selectedAccent.label.toLowerCase()} with {selectedIcon.label.toLowerCase()}.
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-brand-text/10 pt-4">
              <button
                type="button"
                onClick={() => setShowCustomize((current) => !current)}
                className="flex w-full items-center justify-between rounded-[10px] px-1 py-2 text-left transition-colors hover:bg-brand-text/5"
                aria-expanded={showCustomize}
                aria-controls="create-board-customize"
              >
                <span>
                  <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/48">
                    Customize
                  </span>
                  <span className="mt-1 block text-sm text-brand-text/48">
                    Optional. You can change this later.
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-brand-text/36 transition-transform",
                    showCustomize && "rotate-180",
                  )}
                />
              </button>

              {showCustomize && (
                <div id="create-board-customize" className="mt-4 space-y-5">
                  <div>
                    <label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/48">
                      Board Icon
                    </label>
                    <div className="grid grid-cols-7 gap-2 sm:grid-cols-8">
                      {BOARD_ICON_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setIconId(option.id)}
                          className={cn(
                            "flex h-11 items-center justify-center rounded-[10px] border transition-colors",
                            iconId === option.id
                              ? "border-brand-text/26 bg-brand-primary"
                              : "border-brand-text/8 bg-brand-primary/20 hover:border-brand-text/18 hover:bg-brand-primary/42",
                          )}
                          title={option.label}
                          aria-label={option.label}
                        >
                          <option.Icon className="h-5 w-5 text-brand-text/72" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-text/48">
                      Accent Color
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {BOARD_ACCENT_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setColor(option.color)}
                          className={cn(
                            "flex h-11 items-center justify-center rounded-[12px] border transition-colors",
                            color === option.color
                              ? "border-brand-text/26 bg-brand-primary"
                              : "border-brand-text/8 bg-brand-primary/20 hover:border-brand-text/18 hover:bg-brand-primary/42",
                          )}
                          title={option.label}
                          aria-label={option.label}
                        >
                          <span
                            className="h-5 w-5 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-brand-text/10 px-8 py-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-[12px] border border-brand-text/14 font-mono text-sm font-bold text-brand-text/72 transition-colors hover:border-brand-text/26 hover:text-brand-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] bg-brand-text font-mono text-sm font-bold text-brand-bg transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Board
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
