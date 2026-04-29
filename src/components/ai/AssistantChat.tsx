import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  AlertCircle,
  ArrowUp,
  Calendar,
  Check,
  Eraser,
  Loader2,
  Sparkles,
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
  low: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  urgent: "bg-red-500/10 text-red-700 border-red-500/30",
};

const SUGGESTIONS = [
  "Plan a launch week with design, QA, and publish tasks.",
  "Add 5 onboarding tasks for a new engineer.",
  "Break down a customer support triage workflow.",
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
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
        <div className="flex flex-shrink-0 items-center justify-between border-b border-brand-text/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-text/10">
              <Sparkles className="h-4 w-4 text-brand-text" />
            </div>
            <div>
              <div className="text-sm font-bold text-brand-text">AI assistant</div>
              <div className="font-mono text-[10px] uppercase tracking-wide text-brand-text/45">
                {timezone}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSending}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-brand-text/55 transition-colors hover:bg-brand-text/10 hover:text-brand-text disabled:opacity-40"
                title="Clear chat"
              >
                <Eraser className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-brand-text/50 transition-colors hover:bg-brand-text/10 hover:text-brand-text"
              aria-label="Close assistant"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {columns.length === 0 ? (
            <div className="mx-auto mt-10 max-w-xs rounded-2xl border border-brand-accent/25 bg-brand-accent/10 px-4 py-3 text-center text-sm text-brand-accent">
              Add a group to your board before chatting with the assistant.
            </div>
          ) : showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-text/15 to-brand-text/5">
                <span className="absolute inset-0 rounded-2xl bg-brand-text/5 chat-thinking-glow" />
                <Sparkles className="chat-sparkle-float relative h-6 w-6 text-brand-text" />
              </div>
              <div className="chat-suggestion-in" style={{ animationDelay: "60ms" }}>
                <div className="text-base font-bold text-brand-text">
                  How can I help?
                </div>
                <p className="mt-1 max-w-xs text-sm text-brand-text/55">
                  Describe what you want to plan and I'll draft cards. Then
                  ask me to refine.
                </p>
              </div>
              <div className="mt-2 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    style={{ animationDelay: `${140 + index * 80}ms` }}
                    className="chat-suggestion-in rounded-2xl border border-brand-text/10 bg-brand-primary/30 px-4 py-2.5 text-left text-sm text-brand-text/80 transition-all hover:-translate-y-0.5 hover:border-brand-text/25 hover:bg-brand-primary/55 hover:shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
          <div className="mx-4 mb-2 flex flex-shrink-0 items-start gap-2 rounded-2xl border border-brand-accent/25 bg-brand-accent/10 px-3 py-2 text-xs text-brand-accent">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-shrink-0 border-t border-brand-text/10 bg-brand-bg px-3 py-3">
          <div className="flex items-end gap-2 rounded-3xl border-2 border-brand-text/15 bg-brand-primary/30 px-3 py-2 focus-within:border-brand-text/45">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                columns.length === 0
                  ? "Add a group first…"
                  : "Ask the assistant anything"
              }
              disabled={columns.length === 0 || isSending}
              rows={1}
              className="min-h-[28px] w-full resize-none bg-transparent py-1.5 text-sm leading-6 text-brand-text outline-none placeholder:text-brand-text/35 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                canSend
                  ? "bg-brand-text text-brand-bg hover:bg-brand-dark"
                  : "bg-brand-text/15 text-brand-text/40",
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
          <div className="mt-1.5 px-2 font-mono text-[10px] text-brand-text/35">
            Enter to send · Shift + Enter for newline
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
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-brand-text px-4 py-2.5 text-sm leading-6 text-brand-bg shadow-sm">
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
      <div className="max-w-[92%] space-y-2">
        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-brand-text/10 bg-brand-primary/45 px-4 py-2.5 text-sm leading-6 text-brand-text">
          {message.content}
        </div>

        {hasTasks && (
          <div className="space-y-2 rounded-2xl border border-brand-text/10 bg-brand-bg/60 p-2.5">
            <div className="flex items-center justify-between px-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-brand-text/45">
                {tasks.length} proposed task{tasks.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={onApply}
                disabled={isApplied}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  isApplied
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-brand-text text-brand-bg hover:bg-brand-dark",
                )}
              >
                <Check className="h-3.5 w-3.5" />
                {isApplied ? "Added" : `Add ${tasks.length === 1 ? "task" : "all"}`}
              </button>
            </div>
            <div className="space-y-1.5">
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
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-brand-text/10 bg-brand-primary/45 px-4 py-3">
        <span
          className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-brand-text/60"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-brand-text/60"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-brand-text/60"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

function ProposedTaskRow({ task }: { task: DraftTask }) {
  const due = formatDueDate(task.dueDate);
  return (
    <div className="rounded-xl border border-brand-text/10 bg-brand-bg px-3 py-2">
      <div className="text-sm font-semibold text-brand-text">{task.title}</div>
      {task.description && (
        <div className="mt-1 line-clamp-2 text-xs text-brand-text/60">
          {task.description}
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {task.columnTitle && (
          <span className="rounded-full border border-brand-text/15 bg-brand-primary/40 px-2 py-0.5 text-[10px] font-medium text-brand-text/70">
            {task.columnTitle}
          </span>
        )}
        {task.priority && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
              priorityStyles[task.priority],
            )}
          >
            {task.priority}
          </span>
        )}
        {due && (
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-text/15 bg-brand-bg px-2 py-0.5 text-[10px] font-medium text-brand-text/65">
            <Calendar className="h-3 w-3" />
            {due}
          </span>
        )}
      </div>
    </div>
  );
}
