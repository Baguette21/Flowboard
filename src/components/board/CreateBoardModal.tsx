import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { cn } from "../../lib/utils";

const BOARD_COLORS = [
  "#E63B2E", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#111111", "#6B7280",
];

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateBoardModal({ open, onClose }: CreateBoardModalProps) {
  const navigate = useNavigate();
  const createBoard = useMutation(api.boards.create);
  const [name, setName] = useState("");
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      const boardId = await createBoard({ name: name.trim(), color });
      toast.success(`Board "${name}" created!`);
      onClose();
      setName("");
      navigate(`/board/${boardId}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create board");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Board" size="sm">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
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
            className="w-full h-12 px-4 bg-brand-bg border-2 border-brand-text/20 rounded-2xl font-sans text-sm focus:outline-none focus:border-brand-text transition-colors"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-3">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {BOARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                  color === c
                    ? "border-brand-text scale-110 shadow-md"
                    : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-2xl p-4 border-t-4"
          style={{
            backgroundColor: `${color}11`,
            borderTopColor: color,
          }}
        >
          <p className="font-serif italic font-bold text-lg">
            {name || "Board Name"}
          </p>
          <p className="font-mono text-xs text-brand-text/40 mt-0.5">Preview</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 border-2 border-brand-text/20 rounded-2xl font-mono font-bold text-sm hover:border-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="flex-1 h-11 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Board
          </button>
        </div>
      </form>
    </Modal>
  );
}
