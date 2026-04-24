import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ExcalidrawCanvas } from "../drawing/ExcalidrawCanvas";

interface BoardDrawViewProps {
  boardId: Id<"boards">;
  drawingDocument?: string;
}

export function BoardDrawView({ boardId, drawingDocument }: BoardDrawViewProps) {
  const updateBoard = useMutation(api.boards.update);

  return (
    <div className="h-full overflow-y-auto bg-brand-bg px-4 py-5 sm:px-6">
      <ExcalidrawCanvas
        documentKey={`board-draw-${boardId}`}
        drawingDocument={drawingDocument}
        onSave={(nextDrawingDocument) => {
          void updateBoard({
            boardId,
            drawingDocument: nextDrawingDocument,
          });
        }}
        heightClassName="h-[calc(100vh-13rem)] min-h-[42rem]"
      />
    </div>
  );
}
