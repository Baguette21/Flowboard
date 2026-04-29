import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  AlertCircle,
  ArrowUp,
  Calendar,
  Check,
  Eraser,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { cn } from "../../lib/utils";

type Priority = "low" | "medium" | "high" | "urgent";

type DraftTask = {
  title: string;
  description?: string;
  columnId?: Id<"columns">;
  columnTitle?: string;
  dueDate?: number;
  priority?: Priority;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposedTasks?: DraftTask[];
  appliedAt?: number;
};

interface AssistantChatProps {
  open: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
  columns: Doc<"columns">[];
}

const priorityStyles: Record<Priority, string> = {
  low: "bg-blue-500/15 text-blue-700",
  medium: "bg-amber-500/15 text-amber-700",
  high: "bg-orange-500/15 text-orange-700",
  urgent: "bg-red-500/15 text-red-700",
};

const SUGGESTIONS = [
  "Plan a launch week with design, QA, and publish tasks.",
  "Add 5 onboarding tasks for a new engineer.",
  "Break down a customer support triage workflow.",
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function MiniLeaf({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M 8 14 Q 1.5 11 4 4 Q 11 5.5 8 14 Z" />
    </svg>
  );
}

function Seedling({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <ellipse cx="40" cy="68" rx="22" ry="3" opacity="0.18" />
      <path
        d="M 40 68 L 40 48"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="plant-stem"
      />
      <path
        d="M 40 48 Q 22 44 22 32 Q 36 30 40 44 Z"
        className="plant-leaf-left"
      />
      <path
        d="M 40 48 Q 58 44 58 32 Q 44 30 40 44 Z"
        className="plant-leaf-right"
      />
      <circle
        cx="40"
        cy="40"
        r="3.5"
        fill="var(--color-brand-accent)"
        className="plant-bud"
      />
    </svg>
  );
}

function SproutingLeaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 16"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path
        d="M 7 14 Q 2 9.5 7 4 Q 12 9.5 7 14 Z"
        className="chat-leaf-sprout"
        style={{ animationDelay: "0ms" }}
      />
      <path
        d="M 18 14 Q 13 9.5 18 4 Q 23 9.5 18 14 Z"
        className="chat-leaf-sprout"
        style={{ animationDelay: "200ms" }}
      />
      <path
        d="M 29 14 Q 24 9.5 29 4 Q 34 9.5 29 14 Z"
        className="chat-leaf-sprout"
        style={{ animationDelay: "400ms" }}
      />
    </svg>
  );
}

function formatDueDate(timestamp?: number) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssistantChat({
  open,
  onClose,
  boardId,
  columns,
}: AssistantChatProps) {
  const chat = useAction(api.aiAssistant.chat);
  const applyTaskDraft = useMutation(api.aiAssistant.applyTaskDraft);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [open, messages, isSending]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  const canSend =
    input.trim().length > 0 && columns.length > 0 && !isSending;

  const handleClear = () => {
    if (isSending) return;
    setMessages([]);
    setError("");
    setInput("");
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending || columns.length === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
    };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const result = await chat({
        boardId,
        timezone,
        messages: nextHistory.map(({ role, content, proposedTasks }) => ({
          role,
          content,
          proposedTasks,
        })),
      });
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: result.reply,
          proposedTasks: result.proposedTasks,
        },
      ]);
    } catch (sendError) {
      setError(getErrorMessage(sendError));
      setMessages((current) =>
        current.filter((message) => message.id !== userMessage.id),
      );
      setInput(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleApply = async (messageId: string) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target?.proposedTasks?.length) return;

    try {
      const result = await applyTaskDraft({
        boardId,
        tasks: target.proposedTasks,
      });
      toast.success(
        result.createdCardIds.length === 1
          ? "Task added to board"
          : `${result.createdCardIds.length} tasks added to board`,
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, appliedAt: Date.now() }
            : message,
        ),
      );
    } catch (applyError) {
      toast.error(getErrorMessage(applyError));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const showEmptyState = messages.length === 0 && !isSending;

  return (
    <Modal open={open} onClose={onClose} size="drawer">
      <div className="flex h-full flex-col bg-brand-bg">
        <header className="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-lg italic font-bold text-brand-text">
              Assistant
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Online
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSending}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-brand-text/55 transition-colors hover:bg-brand-text/10 hover:text-brand-text disabled:opacity-40"
                title="Clear chat"
              >
                <Eraser className="h-3 w-3" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-brand-text/45 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
        >
          {columns.length === 0 ? (
            <div className="mx-auto mt-10 max-w-xs rounded-2xl bg-brand-accent/10 px-4 py-3 text-center text-sm text-brand-accent">
              Add a group to your board before chatting with the assistant.
            </div>
          ) : showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-2 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-text/15 to-brand-text/0 chat-thinking-glow" />
                <Seedling className="plant-sprout-grow relative h-24 w-24 text-brand-text" />
              </div>
              <div className="chat-suggestion-in space-y-2" style={{ animationDelay: "60ms" }}>
                <h3 className="font-serif text-2xl italic font-bold text-brand-text">
                  Let's grow your plan
                </h3>
                <p className="mx-auto max-w-[260px] text-sm leading-6 text-brand-text/55">
                  Tell me what you want to tackle and I'll sprout some cards. Then ask me to refine.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    style={{ animationDelay: `${140 + index * 80}ms` }}
                    className="chat-suggestion-in group flex items-center gap-3 rounded-2xl bg-brand-text/5 px-4 py-3.5 text-left text-sm leading-6 text-brand-text/75 transition-all hover:-translate-y-0.5 hover:bg-brand-text/10 hover:text-brand-text hover:shadow-sm"
                  >
                    <MiniLeaf className="h-4 w-4 flex-shrink-0 text-brand-text/35 transition-all group-hover:rotate-12 group-hover:text-brand-text/60" />
                    <span className="flex-1">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-2 pb-1">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onApply={() => void handleApply(message.id)}
                />
              ))}
              {isSending && <TypingIndicator />}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 flex flex-shrink-0 items-start gap-2 rounded-2xl bg-brand-accent/10 px-3 py-2 text-xs text-brand-accent">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-shrink-0 px-4 pt-2 pb-4">
          <div className="flex items-end gap-2 rounded-3xl bg-brand-text/[0.06] px-2 py-2 transition-shadow focus-within:bg-brand-text/[0.08] focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.08)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                columns.length === 0
                  ? "Add a group first…"
                  : "Message the assistant…"
              }
              disabled={columns.length === 0 || isSending}
              rows={1}
              className="min-h-[36px] w-full resize-none bg-transparent px-3 py-1.5 text-sm leading-6 text-brand-text outline-none placeholder:text-brand-text/35 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all",
                canSend
                  ? "bg-brand-text text-brand-bg shadow-sm hover:scale-105 hover:bg-brand-dark active:scale-95"
                  : "bg-brand-text/10 text-brand-text/30",
              )}
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onApply: () => void;
}

function MessageBubble({ message, onApply }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="chat-message-in flex justify-end">
        <div
          className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-brand-text px-4 py-3 text-sm leading-6 text-brand-bg"
          style={{ overflowWrap: "anywhere" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const tasks = message.proposedTasks ?? [];
  const hasTasks = tasks.length > 0;
  const isApplied = Boolean(message.appliedAt);

  return (
    <div className="chat-message-in flex justify-start">
      <div className="w-full max-w-[94%] space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="relative mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-text/15 to-brand-text/5">
            <MiniLeaf className="h-4 w-4 text-brand-text/70" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-accent" />
          </div>
          <div
            className="whitespace-pre-wrap break-words pt-1 text-sm leading-6 text-brand-text"
            style={{ overflowWrap: "anywhere" }}
          >
            {message.content}
          </div>
        </div>

        {hasTasks && (
          <div className="ml-9 space-y-2.5 rounded-2xl bg-brand-text/[0.04] p-3">
            <div className="flex items-center justify-between gap-2 pl-0.5 pr-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-text/40">
                {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={onApply}
                disabled={isApplied}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  isApplied
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-brand-text text-brand-bg hover:scale-[1.02] hover:bg-brand-dark active:scale-95",
                )}
              >
                <Check className="h-3.5 w-3.5" />
                {isApplied ? "Added" : `Add ${tasks.length === 1 ? "task" : "all"}`}
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div
                  key={`${task.title}-${index}`}
                  className="chat-suggestion-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProposedTaskRow task={task} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-message-in flex justify-start">
      <div className="flex items-start gap-2.5">
        <div className="relative mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-text/15 to-brand-text/5">
          <MiniLeaf className="h-4 w-4 text-brand-text/70" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-accent" />
        </div>
        <div className="flex h-10 items-center rounded-3xl bg-brand-text/[0.06] px-4">
          <SproutingLeaves className="h-4 w-9 text-brand-text/65" />
        </div>
      </div>
    </div>
  );
}

function ProposedTaskRow({ task }: { task: DraftTask }) {
  const due = formatDueDate(task.dueDate);
  return (
    <div className="rounded-2xl bg-brand-bg px-4 py-3 shadow-sm transition-shadow hover:shadow">
      <div className="text-sm font-semibold leading-5 text-brand-text">
        {task.title}
      </div>
      {task.description && (
        <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-brand-text/55">
          {task.description}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {task.columnTitle && (
          <span className="rounded-full bg-brand-text/10 px-2.5 py-1 text-[11px] font-medium text-brand-text/65">
            {task.columnTitle}
          </span>
        )}
        {task.priority && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
              priorityStyles[task.priority],
            )}
          >
            {task.priority}
          </span>
        )}
        {due && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-text/5 px-2.5 py-1 text-[11px] font-medium text-brand-text/60">
            <Calendar className="h-3 w-3" />
            {due}
          </span>
        )}
      </div>
    </div>
  );
}
