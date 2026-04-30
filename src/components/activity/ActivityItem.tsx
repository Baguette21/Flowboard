import type { Doc } from "../../../convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../../lib/utils";
import {
  Plus, Move, Pencil, Trash2, CheckCircle2, RotateCcw, Layout,
} from "lucide-react";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="w-3.5 h-3.5" />,
  moved: <Move className="w-3.5 h-3.5" />,
  updated: <Pencil className="w-3.5 h-3.5" />,
  deleted: <Trash2 className="w-3.5 h-3.5" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  reopened: <RotateCcw className="w-3.5 h-3.5" />,
  default: <Layout className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-500/10 text-green-600",
  moved: "bg-blue-500/10 text-blue-600",
  updated: "bg-yellow-500/10 text-yellow-600",
  deleted: "bg-brand-accent/10 text-brand-accent",
  completed: "bg-green-500/10 text-green-600",
  reopened: "bg-orange-500/10 text-orange-600",
  default: "bg-brand-text/10 text-brand-text/60",
};

interface ActivityItemProps {
  log: Doc<"activityLogs">;
}

export function ActivityItem({ log }: ActivityItemProps) {
  const icon = ACTION_ICONS[log.action] ?? ACTION_ICONS.default;
  const colorClass = ACTION_COLORS[log.action] ?? ACTION_COLORS.default;

  return (
    <div className="flex items-start gap-3">
      <div className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5", colorClass)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug text-brand-text/80">{log.details}</p>
        <p className="font-mono text-[10px] text-brand-text/40 mt-0.5">
          {formatDistanceToNow(log.createdAt, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
