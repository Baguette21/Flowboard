export type BlockNoteMark = "bold" | "italic" | "underline" | "strike" | "code";

export type BlockNoteInline = {
  text: string;
  marks: BlockNoteMark[];
};

export type BlockNoteBlock = {
  type: string;
  inlines: BlockNoteInline[];
  level?: number;
  index?: number;
  checked?: boolean;
};

function collectInlines(content: unknown, marks: BlockNoteMark[], out: BlockNoteInline[]) {
  if (content == null) return;
  if (typeof content === "string") {
    if (content.length) out.push({ text: content, marks: [...marks] });
    return;
  }
  if (Array.isArray(content)) {
    for (const item of content) collectInlines(item, marks, out);
    return;
  }
  if (typeof content !== "object") return;
  const node = content as Record<string, unknown>;

  if (node.type === "text" && typeof node.text === "string") {
    const styles = (node.styles && typeof node.styles === "object" ? node.styles : {}) as Record<string, unknown>;
    const next: BlockNoteMark[] = [...marks];
    if (styles.bold) next.push("bold");
    if (styles.italic) next.push("italic");
    if (styles.underline) next.push("underline");
    if (styles.strike) next.push("strike");
    if (styles.code) next.push("code");
    out.push({ text: node.text, marks: next });
    return;
  }
  if (node.type === "link" && Array.isArray(node.content)) {
    collectInlines(node.content, marks, out);
    return;
  }
  if (typeof node.text === "string") {
    out.push({ text: node.text, marks: [...marks] });
  }
  if ("content" in node) collectInlines(node.content, marks, out);
}

function flattenBlocks(value: unknown, out: BlockNoteBlock[], counters: { ol: number[] }) {
  if (!Array.isArray(value)) return;
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Record<string, unknown>;
    const type = typeof block.type === "string" ? block.type : "paragraph";
    const props = (block.props && typeof block.props === "object" ? block.props : {}) as Record<string, unknown>;
    const inlines: BlockNoteInline[] = [];
    collectInlines(block.content, [], inlines);

    if (type === "numberedListItem") {
      counters.ol[0] = (counters.ol[0] ?? 0) + 1;
      out.push({ type, inlines, index: counters.ol[0] });
    } else {
      if (type !== "numberedListItem") counters.ol[0] = 0;
      const level = typeof props.level === "number" ? props.level : undefined;
      const checked = typeof props.checked === "boolean" ? props.checked : undefined;
      out.push({ type, inlines, level, checked });
    }

    if (Array.isArray(block.children)) flattenBlocks(block.children, out, counters);
  }
}

export function parseBlockNote(content?: string | null): BlockNoteBlock[] | null {
  if (!content || !content.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const blocks: BlockNoteBlock[] = [];
  flattenBlocks(parsed, blocks, { ol: [0] });
  return blocks;
}

export function extractPlainText(content?: string | null, maxLength?: number): string {
  if (!content) return "";
  const blocks = parseBlockNote(content);
  let text: string;
  if (blocks) {
    text = blocks
      .map((block) => block.inlines.map((inline) => inline.text).join(""))
      .filter(Boolean)
      .join("\n")
      .trim();
  } else {
    text = content.trim();
  }
  if (maxLength && text.length > maxLength) {
    return `${text.slice(0, maxLength).trimEnd()}...`;
  }
  return text;
}

export function blockNoteToHTML(content?: string | null): string {
  if (!content?.trim()) return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return textToParagraph(content);
  }
  if (!Array.isArray(parsed)) return "";
  return parsed.map(blockToHTML).filter(Boolean).join("");
}

function blockToHTML(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const block = value as Record<string, unknown>;
  const type = typeof block.type === "string" ? block.type : "paragraph";
  const props = (block.props && typeof block.props === "object" ? block.props : {}) as Record<string, unknown>;
  const children = Array.isArray(block.children) ? block.children.map(blockToHTML).join("") : "";

  if (type === "image") {
    const url = stringProp(props, "url") || stringProp(props, "src") || stringProp(block, "url") || stringProp(block, "src");
    if (!url) return children;
    const caption = inlineToHTML(block.content);
    return `<p><img src="${escapeHtml(url)}" alt="${escapeHtml(textFromInline(block.content) || "Note image")}" /></p>${caption ? `<p>${caption}</p>` : ""}${children}`;
  }

  const html = inlineToHTML(block.content);
  const body = html || "<br />";
  const level = typeof props.level === "number" ? Math.max(1, Math.min(3, props.level)) : 1;

  if (type === "heading") return `<h${level}>${body}</h${level}>${children}`;
  if (type === "bulletListItem") return `<ul><li>${body}</li></ul>${children}`;
  if (type === "numberedListItem") return `<ol><li>${body}</li></ol>${children}`;
  if (type === "checkListItem") return `<ul><li>${body}</li></ul>${children}`;
  if (type === "quote") return `<blockquote>${body}</blockquote>${children}`;
  if (type === "codeBlock") return `<pre><code>${escapeHtml(textFromInline(block.content))}</code></pre>${children}`;
  return `<p>${body}</p>${children}`;
}

function inlineToHTML(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return escapeHtml(value);
  if (Array.isArray(value)) return value.map(inlineToHTML).join("");
  if (typeof value !== "object") return "";

  const node = value as Record<string, unknown>;
  if (node.type === "text" && typeof node.text === "string") {
    let html = escapeHtml(node.text);
    const styles = (node.styles && typeof node.styles === "object" ? node.styles : {}) as Record<string, unknown>;
    if (styles.code) html = `<code>${html}</code>`;
    if (styles.bold) html = `<strong>${html}</strong>`;
    if (styles.italic) html = `<em>${html}</em>`;
    if (styles.underline) html = `<u>${html}</u>`;
    if (styles.strike) html = `<s>${html}</s>`;
    return html;
  }

  if (node.type === "link") {
    const href = stringProp((node.props && typeof node.props === "object" ? node.props : {}) as Record<string, unknown>, "url") || "#";
    return `<a href="${escapeHtml(href)}">${inlineToHTML(node.content)}</a>`;
  }

  if (typeof node.text === "string") return escapeHtml(node.text);
  return inlineToHTML(node.content);
}

function textToParagraph(value: string) {
  const body = escapeHtml(value.trim()).replace(/\n/g, "<br />");
  return body ? `<p>${body}</p>` : "";
}

function textFromInline(value: unknown): string {
  const fragments: BlockNoteInline[] = [];
  collectInlines(value, [], fragments);
  return fragments.map((inline) => inline.text).join("");
}

function stringProp(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
