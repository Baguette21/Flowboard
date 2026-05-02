const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "del",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "code", "pre",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "span", "div",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  p: new Set(["style"]),
  img: new Set(["src", "alt", "title", "width", "height", "style", "data-flowboard-crop"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

const URL_SCHEMES = /^(https?:|mailto:|tel:|\/|#|data:image\/)/i;

const VOID_TAGS = new Set(["br", "img"]);

type Token =
  | { kind: "text"; text: string }
  | { kind: "open"; tag: string; attrs: string }
  | { kind: "close"; tag: string }
  | { kind: "self"; tag: string; attrs: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?\s*([a-zA-Z][a-zA-Z0-9]*)([^<>]*?)\/?>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", text: input.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("<!--") || raw.startsWith("<![CDATA[")) {
      lastIndex = re.lastIndex;
      continue;
    }
    const tag = (match[1] || "").toLowerCase();
    const attrs = match[2] || "";
    const isClose = raw.startsWith("</");
    const isSelf = raw.endsWith("/>");
    if (isClose) tokens.push({ kind: "close", tag });
    else if (isSelf || VOID_TAGS.has(tag)) tokens.push({ kind: "self", tag, attrs });
    else tokens.push({ kind: "open", tag, attrs });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < input.length) {
    tokens.push({ kind: "text", text: input.slice(lastIndex) });
  }
  return tokens;
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function sanitizeAttrs(tag: string, attrString: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) return "";
  const out: string[] = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    if (!allowed.has(name)) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if ((name === "href" || name === "src") && !URL_SCHEMES.test(value)) continue;
    if (tag === "p" && name === "style") {
      const style = sanitizeParagraphStyle(value);
      if (style) out.push(`style="${escapeAttr(style)}"`);
      continue;
    }
    if (tag === "img" && name === "style") {
      const style = sanitizeImageStyle(value);
      if (style) out.push(`style="${escapeAttr(style)}"`);
      continue;
    }
    if (tag === "img" && name === "data-flowboard-crop" && value !== "cover") continue;
    if (/^on/i.test(name)) continue;
    if (/javascript:/i.test(value)) continue;
    out.push(`${name}="${escapeAttr(value)}"`);
  }
  if (tag === "a") {
    const hasRel = out.some((part) => part.startsWith("rel="));
    if (!hasRel) out.push('rel="noopener noreferrer"');
  }
  return out.length ? ` ${out.join(" ")}` : "";
}

function sanitizeParagraphStyle(value: string): string {
  const match = /(?:^|;)\s*text-align\s*:\s*(left|center|right)\s*(?:;|$)/i.exec(value);
  return match ? `text-align: ${match[1].toLowerCase()}` : "";
}

function sanitizeImageStyle(value: string): string {
  const allowed: Record<string, (raw: string) => string | null> = {
    width: (raw) => {
      const match = /^(\d{1,3})(%|px)$/i.exec(raw.trim());
      if (!match) return null;
      const amount = Math.max(1, Math.min(match[2] === "%" ? 100 : 2000, Number(match[1])));
      return `${amount}${match[2]}`;
    },
    height: (raw) => {
      const trimmed = raw.trim().toLowerCase();
      if (trimmed === "auto") return "auto";
      const match = /^(\d{1,4})px$/i.exec(trimmed);
      if (!match) return null;
      return `${Math.max(1, Math.min(1600, Number(match[1])))}px`;
    },
    "max-width": (raw) => raw.trim() === "100%" ? "100%" : null,
    margin: (raw) => /^[-\w.%\s]+$/.test(raw.trim()) ? raw.trim() : null,
    "margin-left": (raw) => /^(auto|0|0px|\d{1,3}%)$/.test(raw.trim()) ? raw.trim() : null,
    "margin-right": (raw) => /^(auto|0|0px|\d{1,3}%)$/.test(raw.trim()) ? raw.trim() : null,
    display: (raw) => raw.trim() === "block" ? "block" : null,
    "border-radius": (raw) => /^(\d{1,2})px$/.test(raw.trim()) ? raw.trim() : null,
    "object-fit": (raw) => /^(contain|cover)$/.test(raw.trim()) ? raw.trim() : null,
    "object-position": (raw) => /^(\d{1,3}%|left|center|right)(\s+(\d{1,3}%|top|center|bottom))?$/.test(raw.trim()) ? raw.trim() : null,
  };
  const out: string[] = [];
  for (const part of value.split(";")) {
    const index = part.indexOf(":");
    if (index === -1) continue;
    const name = part.slice(0, index).trim().toLowerCase();
    const raw = part.slice(index + 1);
    const clean = allowed[name]?.(raw);
    if (clean) out.push(`${name}: ${clean}`);
  }
  return out.join("; ");
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  const tokens = tokenize(input);
  const stack: string[] = [];
  let out = "";
  for (const token of tokens) {
    if (token.kind === "text") {
      out += escapeText(token.text);
    } else if (token.kind === "open") {
      if (!ALLOWED_TAGS.has(token.tag)) continue;
      stack.push(token.tag);
      out += `<${token.tag}${sanitizeAttrs(token.tag, token.attrs)}>`;
    } else if (token.kind === "self") {
      if (!ALLOWED_TAGS.has(token.tag)) continue;
      out += `<${token.tag}${sanitizeAttrs(token.tag, token.attrs)} />`;
    } else if (token.kind === "close") {
      if (!ALLOWED_TAGS.has(token.tag)) continue;
      const idx = stack.lastIndexOf(token.tag);
      if (idx === -1) continue;
      while (stack.length > idx) {
        const closing = stack.pop();
        if (closing) out += `</${closing}>`;
      }
    }
  }
  while (stack.length) {
    const closing = stack.pop();
    if (closing) out += `</${closing}>`;
  }
  return out;
}

export function htmlToPlainText(html: string | null | undefined, maxLength = 240): string {
  if (!html) return "";
  const stripped = html
    .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= maxLength) return stripped;
  return `${stripped.slice(0, maxLength).trimEnd()}...`;
}
