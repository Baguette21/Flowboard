import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { LabelPicker } from "./LabelPicker";

interface ManageLabelsProps {
  open: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
}

export function ManageLabels({ open, onClose, boardId }: ManageLabelsProps) {
  return (
    <Modal open={open} onClose={onClose} title="Manage Labels" size="sm">
      <div className="p-6">
        <p className="font-mono text-xs text-brand-text/50 mb-4">
          Labels are shared across all tasks on this board.
        </p>
        <LabelPicker boardId={boardId} selectedIds={[]} onChange={() => {}} />
      </div>
    </Modal>
  );
}
