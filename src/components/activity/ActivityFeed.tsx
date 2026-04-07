import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ActivityItem } from "./ActivityItem";
import { Activity } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

interface ActivityFeedProps {
  boardId: Id<"boards">;
  cardId?: Id<"cards">;
  mode?: "board" | "card";
}

export function ActivityFeed({ boardId, cardId, mode = "board" }: ActivityFeedProps) {
  const boardLogs = useQuery(
    mode === "board" ? api.activityLogs.listByBoard : api.activityLogs.listByBoard,
    mode === "board" ? { boardId } : { boardId },
  );
  const cardLogs = useQuery(
    api.activityLogs.listByCard,
    cardId ? { cardId } : "skip",
  );

  const logs = mode === "card" ? cardLogs : boardLogs;

  if (logs === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <Activity className="w-8 h-8 text-brand-text/20 mb-2" />
        <p className="font-mono text-xs text-brand-text/40">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <ActivityItem key={log._id} log={log} />
      ))}
    </div>
  );
}
