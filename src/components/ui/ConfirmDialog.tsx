import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {isDestructive && (
            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-brand-accent" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-brand-text/60 text-sm font-sans">{description}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-2xl font-mono font-bold text-sm transition-colors disabled:opacity-60 ${
              isDestructive
                ? "bg-brand-accent text-white hover:bg-brand-accent-strong"
                : "bg-brand-text text-brand-bg hover:bg-brand-dark"
            }`}
          >
            {isLoading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
