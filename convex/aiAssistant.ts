import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalQuery, mutation } from "./_generated/server";
import { requireBoardAccess } from "./helpers/boardAccess";
import { generateOrderKeyAfter } from "./helpers/ordering";
import { aiTaskDraftValidator } from "./helpers/validators";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-3.1-flash-lite-preview";
const MAX_PROMPT_LENGTH = 4000;
const MAX_TASKS = 20;
const MAX_HISTORY_MESSAGES = 24;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

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
  role: "user" | "assistant";
  content: string;
  proposedTasks?: DraftTask[];
};

type AssistantResponse = {
  reply: string;
  proposedTasks?: DraftTask[];
};

type DraftContext = {
  board: {
    _id: Id<"boards">;
    name: string;
  };
  columns: { _id: Id<"columns">; title: string }[];
};

function normalizeColumnTitle(title: string) {
  return title.trim().toLowerCase();
}

function isPriority(value: unknown): value is Priority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function extractJson(text: string) {
  const trimmed = text.replace(/^﻿/, "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    return fenced[1];
  }

  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const startsWithArray =
    firstBracket >= 0 && (firstBrace === -1 || firstBracket < firstBrace);

  if (startsWithArray) {
    const lastBracket = trimmed.lastIndexOf("]");
    if (lastBracket > firstBracket) {
      return trimmed.slice(firstBracket, lastBracket + 1);
    }
  }

  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function balanceBraces(input: string) {
  let depth = 0;
  let inString = false;
  let escape = false;
  let firstBrace = -1;
  let lastValidEnd = -1;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) firstBrace = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && firstBrace !== -1) {
        lastValidEnd = i;
      }
    }
  }

  if (firstBrace !== -1 && lastValidEnd > firstBrace) {
    return input.slice(firstBrace, lastValidEnd + 1);
  }
  return null;
}

function parseGeminiJson(text: string): unknown {
  const extracted = extractJson(text);
  const balanced = balanceBraces(extracted);
  const candidates = [
    extracted,
    extracted.replace(/,\s*([}\]])/g, "$1"),
    balanced,
    balanced ? balanced.replace(/,\s*([}\]])/g, "$1") : null,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed === "string") {
        return parseGeminiJson(parsed);
      }
      return parsed;
    } catch {
      // Try the next candidate.
    }
  }

  const snippet = text.slice(0, 240).replace(/\s+/g, " ");
  throw new Error(
    `Gemini returned malformed JSON. Please try again. (snippet: ${snippet})`,
  );
}

function buildSystemInstruction({
  boardName,
  columns,
  timezone,
}: {
  boardName: string;
  columns: { _id: Id<"columns">; title: string }[];
  timezone: string;
}) {
  const now = new Date();
  const columnList = columns
    .map((column, index) => `${index + 1}. ${column.title}`)
    .join("\n");

  return `You are an AI assistant embedded inside a kanban board. You help the user plan and refine task cards through natural conversation.

Board name: ${boardName}
Current date/time: ${now.toISOString()}
Timezone for due dates: ${timezone}

Existing board columns (use these names exactly when assigning tasks):
${columnList}

Response shape:
- Always return JSON of shape { "reply": string, "proposedTasks"?: Task[] }.
- "reply" is a short, friendly conversational message to the user (1-3 sentences). It is shown in a chat bubble.
- Include "proposedTasks" ONLY when you are proposing concrete task cards. Omit the field for conversational turns.

When to propose vs. ask a follow-up question:
- If the request is clear and reasonable defaults exist, propose tasks immediately. Do not ask trivial questions.
- If the request is genuinely ambiguous in a way that would change the output materially, ask ONE concise clarifying question first and omit "proposedTasks" for that turn. Examples worth asking about:
  • The user said "plan my week" but you have no idea what they're working on.
  • The user said "add tasks for the launch" but the scope or timeline is wide open.
  • The user asked for due dates but didn't anchor a starting point ("starting when?").
- Prefer proposing a draft + asking a refinement question in the same turn when you can ("Here's a first pass — should the QA tasks happen in parallel or after design?"). Include "proposedTasks" plus a question in "reply".

Refining previous turns:
- When the user asks to add, modify, or refine tasks, return the FULL updated list of proposed tasks in "proposedTasks" — never a diff. The previous list is replaced entirely.
- Handle natural-language edits: "make task 3 urgent", "push everything one day later", "drop the design review", "give them due dates", "rename the first one to Kickoff".

Task rules:
- At most ${MAX_TASKS} tasks per response.
- Keep titles short and specific (under 160 characters).
- Use existing board columns only via "columnTitle". If no column is implied, choose the first available column.
- Do not invent assignees or labels.

Due dates (be proactive — users want these):
- Whenever the user mentions any timing — explicit dates ("Friday", "March 20"), relative phrases ("this week", "by end of month", "in two weeks", "before launch"), or sequence words ("Monday: design, Tuesday: QA") — translate it into a concrete "dueDate" as a Unix timestamp in milliseconds, interpreted in the user's timezone, anchored to the current date/time above.
- For multi-step plans where the user implies a sequence but gives no calendar dates, distribute due dates across upcoming weekdays starting from today (or tomorrow). Briefly mention this in "reply" so they can adjust.
- If the user explicitly asks "add due dates" to existing proposed tasks, assign sensible spaced-out due dates and re-emit the full task list.
- Omit "dueDate" only when there is genuinely no timing signal AND no implicit sequencing.

Priority:
- Set "priority" when the request implies urgency. Words like "ASAP", "blocking", "critical", "this needs to ship today" → "urgent". "Important", "high stakes" → "high". Routine work → omit.

Schema example:
{
  "reply": "Here's a draft for launch week. Want me to adjust anything?",
  "proposedTasks": [
    {
      "title": "Design review",
      "description": "Review final screens and note blockers.",
      "columnTitle": "${columns[0]?.title ?? "Todo"}",
      "dueDate": 1771171200000,
      "priority": "medium"
    }
  ]
}`;
}

function summarizeProposedTasks(tasks: DraftTask[]) {
  if (tasks.length === 0) {
    return "(no tasks)";
  }
  return tasks
    .map((task, index) => {
      const parts = [`${index + 1}. ${task.title}`];
      if (task.columnTitle) parts.push(`column: ${task.columnTitle}`);
      if (task.priority) parts.push(`priority: ${task.priority}`);
      if (task.dueDate) {
        parts.push(`due: ${new Date(task.dueDate).toISOString().slice(0, 10)}`);
      }
      return parts.join(" | ");
    })
    .join("\n");
}

function buildGeminiContents(messages: ChatMessage[]) {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  return recent.map((message) => {
    if (message.role === "assistant") {
      const taskSummary = message.proposedTasks?.length
        ? `\n\n[Previously proposed tasks]\n${summarizeProposedTasks(message.proposedTasks)}`
        : "";
      return {
        role: "model",
        parts: [{ text: `${message.content}${taskSummary}` }],
      };
    }
    return {
      role: "user",
      parts: [{ text: truncate(message.content, MAX_PROMPT_LENGTH) }],
    };
  });
}

async function callGemini({
  apiKey,
  model,
  systemInstruction,
  contents,
}: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  contents: ReturnType<typeof buildGeminiContents>;
}) {
  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        role: "user",
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            reply: { type: "STRING" },
            proposedTasks: {
              type: "ARRAY",
              nullable: true,
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  description: { type: "STRING", nullable: true },
                  columnTitle: { type: "STRING", nullable: true },
                  dueDate: { type: "NUMBER", nullable: true },
                  priority: {
                    type: "STRING",
                    enum: ["low", "medium", "high", "urgent"],
                    nullable: true,
                  },
                },
                required: ["title"],
              },
            },
          },
          required: ["reply"],
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const message =
      response.status === 429
        ? "Gemini is rate limited. Please try again shortly."
        : response.status === 503
          ? "Gemini is currently overloaded. Please try again shortly."
          : response.status === 400 ||
              response.status === 401 ||
              response.status === 403
            ? "Gemini API key is missing, invalid, or not allowed to use this model."
            : `Gemini request failed with status ${response.status}.`;
    throw new Error(`${message}${body ? ` ${body.slice(0, 240)}` : ""}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  const candidate = data.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const blockReason = data.promptFeedback?.blockReason;

  if (blockReason) {
    throw new Error(
      `Gemini blocked the request (${blockReason}). Try rephrasing.`,
    );
  }

  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (finishReason === "MAX_TOKENS") {
    throw new Error(
      "Response was too long and got cut off. Try a shorter request or ask for fewer tasks at a time.",
    );
  }

  if (finishReason && finishReason !== "STOP" && !text) {
    throw new Error(`Gemini stopped generating (${finishReason}).`);
  }

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

function normalizeAssistantResponse({
  raw,
  columns,
}: {
  raw: unknown;
  columns: { _id: Id<"columns">; title: string }[];
}): AssistantResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Gemini returned malformed JSON.");
  }

  const record = raw as Record<string, unknown>;

  const reply =
    typeof record.reply === "string" && record.reply.trim()
      ? truncate(record.reply.trim(), 800)
      : "Done.";

  const rawTasks = Array.isArray(record.proposedTasks)
    ? record.proposedTasks
    : Array.isArray(record.tasks)
      ? record.tasks
      : null;

  if (rawTasks === null) {
    return { reply };
  }

  const columnByTitle = new Map(
    columns.map((column) => [normalizeColumnTitle(column.title), column]),
  );
  const firstColumn = columns[0];
  if (!firstColumn) {
    throw new Error("Add a column before drafting tasks.");
  }

  const normalizedTasks: DraftTask[] = [];

  for (const item of rawTasks) {
    if (!item || typeof item !== "object" || normalizedTasks.length >= MAX_TASKS) {
      continue;
    }

    const task = item as Record<string, unknown>;
    const title = typeof task.title === "string" ? task.title.trim() : "";
    if (!title) {
      continue;
    }

    const requestedColumnTitle =
      typeof task.columnTitle === "string" ? task.columnTitle.trim() : "";
    const matchedColumn = requestedColumnTitle
      ? columnByTitle.get(normalizeColumnTitle(requestedColumnTitle))
      : undefined;
    const column = matchedColumn ?? firstColumn;

    const description =
      typeof task.description === "string" && task.description.trim()
        ? truncate(task.description.trim(), 2000)
        : undefined;
    const dueDate =
      typeof task.dueDate === "number" && Number.isFinite(task.dueDate)
        ? task.dueDate
        : undefined;
    const priority = isPriority(task.priority) ? task.priority : undefined;

    normalizedTasks.push({
      title: truncate(title, 160),
      description,
      columnId: column._id,
      columnTitle: column.title,
      dueDate,
      priority,
    });
  }

  return { reply, proposedTasks: normalizedTasks };
}

export const getDraftContext = internalQuery({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const { board } = await requireBoardAccess(ctx, boardId);
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .take(100);

    return {
      board: {
        _id: board._id,
        name: board.name,
      },
      columns: columns
        .sort((a, b) => a.order.localeCompare(b.order))
        .map((column) => ({
          _id: column._id,
          title: column.title,
        })),
    };
  },
});

const chatMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  proposedTasks: v.optional(v.array(aiTaskDraftValidator)),
});

export const chat = action({
  args: {
    boardId: v.id("boards"),
    timezone: v.string(),
    messages: v.array(chatMessageValidator),
  },
  returns: v.object({
    reply: v.string(),
    proposedTasks: v.optional(v.array(aiTaskDraftValidator)),
  }),
  handler: async (ctx, { boardId, timezone, messages }): Promise<AssistantResponse> => {
    if (messages.length === 0) {
      throw new Error("Send a message to the assistant.");
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      throw new Error("The last message must come from the user.");
    }
    if (!lastMessage.content.trim()) {
      throw new Error("Describe what you want the assistant to do.");
    }

    const context: DraftContext = await ctx.runQuery(
      internal.aiAssistant.getDraftContext,
      { boardId },
    );
    if (context.columns.length === 0) {
      throw new Error("Add a column before chatting with the assistant.");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Convex.");
    }

    const systemInstruction = buildSystemInstruction({
      boardName: context.board.name,
      columns: context.columns,
      timezone: timezone.trim() || "UTC",
    });
    const contents = buildGeminiContents(messages);

    let text: string;
    try {
      text = await callGemini({
        apiKey,
        model: DEFAULT_MODEL,
        systemInstruction,
        contents,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        message.includes("not allowed to use this model") ||
        message.includes("status 404") ||
        message.includes("currently overloaded") ||
        message.includes("status 503")
      ) {
        text = await callGemini({
          apiKey,
          model: FALLBACK_MODEL,
          systemInstruction,
          contents,
        });
      } else {
        throw error;
      }
    }

    const parsed = parseGeminiJson(text);

    return normalizeAssistantResponse({
      raw: parsed,
      columns: context.columns,
    });
  },
});

export const applyTaskDraft = mutation({
  args: {
    boardId: v.id("boards"),
    tasks: v.array(aiTaskDraftValidator),
  },
  returns: v.object({
    createdCardIds: v.array(v.id("cards")),
  }),
  handler: async (ctx, { boardId, tasks }) => {
    const { userId } = await requireBoardAccess(ctx, boardId);
    const columns = await ctx.db
      .query("columns")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .take(100);
    const sortedColumns = columns.sort((a, b) => a.order.localeCompare(b.order));
    const firstColumn = sortedColumns[0];

    if (!firstColumn) {
      throw new Error("Add a column before creating tasks.");
    }

    const columnById = new Map(sortedColumns.map((column) => [column._id, column]));
    const columnByTitle = new Map(
      sortedColumns.map((column) => [normalizeColumnTitle(column.title), column]),
    );
    const lastOrderByColumn = new Map<Id<"columns">, string | null>();

    for (const column of sortedColumns) {
      const existingCards = await ctx.db
        .query("cards")
        .withIndex("by_columnId", (q) => q.eq("columnId", column._id))
        .collect();
      const sortedCards = existingCards.sort((a, b) => {
        const orderComparison = a.order.localeCompare(b.order);
        if (orderComparison !== 0) {
          return orderComparison;
        }
        return a.createdAt - b.createdAt;
      });
      lastOrderByColumn.set(
        column._id,
        sortedCards.length > 0 ? sortedCards[sortedCards.length - 1].order : null,
      );
    }

    const createdCardIds: Id<"cards">[] = [];
    const now = Date.now();

    for (const task of tasks.slice(0, MAX_TASKS)) {
      const title = task.title.trim();
      if (!title) {
        throw new Error("Task title cannot be empty.");
      }

      const targetColumn =
        (task.columnId ? columnById.get(task.columnId) : undefined) ??
        (task.columnTitle
          ? columnByTitle.get(normalizeColumnTitle(task.columnTitle))
          : undefined) ??
        firstColumn;

      if (task.columnId && !columnById.has(task.columnId)) {
        throw new Error("Task target column does not belong to this board.");
      }

      const previousOrder = lastOrderByColumn.get(targetColumn._id) ?? null;
      const order = generateOrderKeyAfter(previousOrder);
      lastOrderByColumn.set(targetColumn._id, order);

      const description = task.description?.trim() || undefined;
      const cardId = await ctx.db.insert("cards", {
        columnId: targetColumn._id,
        boardId,
        title,
        description,
        assignedUserId: null,
        assignedUserIds: [],
        order,
        labelIds: [],
        isComplete: false,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("activityLogs", {
        boardId,
        cardId,
        userId,
        action: "created",
        details: `Created task "${title}" in ${targetColumn.title} with AI assistant`,
        createdAt: Date.now(),
      });

      createdCardIds.push(cardId);
    }

    return { createdCardIds };
  },
});
