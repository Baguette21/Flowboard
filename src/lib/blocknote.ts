import type { PartialBlock } from "@blocknote/core";

function collectText(node: unknown, fragments: string[]) {
  if (typeof node === "string") {
    fragments.push(node);
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectText(item, fragments));
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;

  if (typeof record.text === "string") {
    fragments.push(record.text);
  }

  if ("content" in record) {
    collectText(record.content, fragments);
  }

  if ("children" in record) {
    collectText(record.children, fragments);
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function plainTextToBlocks(content?: string): PartialBlock[] | undefined {
  const trimmed = content?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: "paragraph" as const,
      content: paragraph.replace(/\s*\n+\s*/g, " "),
    }));
}

export function parseBlockNoteContent(content?: string): PartialBlock[] | undefined {
  const trimmed = content?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as PartialBlock[];
    }
  } catch {
    return plainTextToBlocks(trimmed);
  }

  return plainTextToBlocks(trimmed);
}

export function extractPlainTextFromBlockNoteContent(
  content?: string,
  maxLength?: number,
) {
  if (!content?.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    const fragments: string[] = [];
    collectText(parsed, fragments);
    const plainText = fragments.join(" ").replace(/\s+/g, " ").trim();
    if (!maxLength || plainText.length <= maxLength) {
      return plainText;
    }

    return `${plainText.slice(0, maxLength).trimEnd()}...`;
  } catch {
    const plainText = content.replace(/\s+/g, " ").trim();
    if (!maxLength || plainText.length <= maxLength) {
      return plainText;
    }

    return `${plainText.slice(0, maxLength).trimEnd()}...`;
  }
}
