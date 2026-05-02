import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { LabelPicker } from "./LabelPicker";

interface ManageLabelsProps {
  open: boolean;
  onClose: () => void;
  planId: Id<"plans">;
}

export function ManageLabels({ open, onClose, planId }: ManageLabelsProps) {
  return (
    <Modal open={open} onClose={onClose} title="Manage Labels" size="sm">
      <div className="p-6">
        <p className="font-mono text-xs text-brand-text/50 mb-4">
          Labels are shared across all tasks on this board.
        </p>
        <LabelPicker planId={planId} selectedIds={[]} onChange={() => {}} />
      </div>
    </Modal>
  );
}
