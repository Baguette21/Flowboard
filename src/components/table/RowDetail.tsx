import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { BoardMemberSummary } from "../../lib/types";
import { CardDetail } from "../card/CardDetail";
import type { AllCellData, CellValue, SelectOption, TableColumnDef } from "./types";

interface RowDetailModalProps {
  cardId: Id<"cards">;
  planId: Id<"plans">;
  columns: TableColumnDef[];
  boardColumns: Doc<"columns">[];
  labels: Doc<"labels">[];
  members: BoardMemberSummary[];
  customCells: AllCellData;
  getCellValue: (card: Doc<"cards">, column: TableColumnDef) => CellValue;
  resolveSelectLabel: (column: TableColumnDef, value: CellValue) => SelectOption | null;
  canManageAssignees: boolean;
  onClose: () => void;
}

export function RowDetailModal(props: RowDetailModalProps) {
  return (
    <CardDetail
      cardId={props.cardId}
      planId={props.planId}
      columns={props.boardColumns}
      labels={props.labels}
      members={props.members}
      canManageAssignees={props.canManageAssignees}
      onClose={props.onClose}
    />
  );
}
