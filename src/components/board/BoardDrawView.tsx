import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ExcalidrawCanvas } from "../drawing/ExcalidrawCanvas";

interface BoardDrawViewProps {
  planId: Id<"plans">;
  drawingDocument?: string;
}

export function BoardDrawView({ planId, drawingDocument }: BoardDrawViewProps) {
  const updatePlan = useMutation(api.plans.update);
  const me = useQuery(api.users.me);
  const isPro = me?.role === "PRO";

  return (
    <div className="h-full overflow-y-auto bg-brand-bg px-4 py-5 sm:px-6">
      <ExcalidrawCanvas
        documentKey={`board-draw-${planId}`}
        drawingDocument={drawingDocument}
        onSave={(nextDrawingDocument) => {
          void updatePlan({
            planId,
            drawingDocument: nextDrawingDocument,
          });
        }}
        heightClassName="h-[calc(100vh-13rem)] min-h-[42rem]"
        readOnly={me !== undefined && !isPro}
        lockedMessage="Board drawing is available to Pro users only."
      />
    </div>
  );
}
