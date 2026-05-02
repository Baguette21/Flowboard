import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/theme/tokens";
import { parseBlockNote, type BlockNoteBlock, type BlockNoteInline } from "@/lib/blocknote";

export function RichText({ content, theme, placeholder = "No description yet." }: { content?: string | null; theme: AppTheme; placeholder?: string }) {
  const trimmed = content?.trim();
  if (!trimmed) return <Text style={[styles.paragraph, { color: theme.subtle, fontStyle: "italic" }]}>{placeholder}</Text>;

  const blocks = parseBlockNote(trimmed);
  if (!blocks) {
    return <Text style={[styles.paragraph, { color: theme.ink }]}>{trimmed}</Text>;
  }

  return (
    <View style={styles.body}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} theme={theme} />
      ))}
    </View>
  );
}

function BlockView({ block, theme }: { block: BlockNoteBlock; theme: AppTheme }) {
  if (block.inlines.length === 0 && block.type !== "checkListItem") return <View style={{ height: 6 }} />;

  const inlineText = <InlineRun inlines={block.inlines} theme={theme} />;

  switch (block.type) {
    case "heading": {
      const level = block.level ?? 1;
      const sizes = [22, 19, 17];
      const size = sizes[Math.min(level - 1, sizes.length - 1)] ?? 17;
      return <Text style={[styles.heading, { color: theme.ink, fontSize: size, lineHeight: size + 6 }]}>{inlineText}</Text>;
    }
    case "bulletListItem":
      return (
        <View style={styles.listRow}>
          <Text style={[styles.listMarker, { color: theme.muted }]}>{"•"}</Text>
          <Text style={[styles.paragraph, { color: theme.ink, flex: 1 }]}>{inlineText}</Text>
        </View>
      );
    case "numberedListItem":
      return (
        <View style={styles.listRow}>
          <Text style={[styles.listMarker, { color: theme.muted }]}>{`${block.index ?? 1}.`}</Text>
          <Text style={[styles.paragraph, { color: theme.ink, flex: 1 }]}>{inlineText}</Text>
        </View>
      );
    case "checkListItem":
      return (
        <View style={styles.listRow}>
          <Text style={[styles.listMarker, { color: theme.muted }]}>{block.checked ? "☑" : "☐"}</Text>
          <Text style={[styles.paragraph, { color: theme.ink, flex: 1, textDecorationLine: block.checked ? "line-through" : "none" }]}>{inlineText}</Text>
        </View>
      );
    case "quote":
      return (
        <View style={[styles.quote, { borderLeftColor: theme.whisperStrong }]}>
          <Text style={[styles.paragraph, { color: theme.muted, fontStyle: "italic" }]}>{inlineText}</Text>
        </View>
      );
    case "codeBlock":
      return (
        <View style={[styles.codeBlock, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <Text style={[styles.code, { color: theme.ink }]}>{inlineText}</Text>
        </View>
      );
    default:
      return <Text style={[styles.paragraph, { color: theme.ink }]}>{inlineText}</Text>;
  }
}

function InlineRun({ inlines, theme }: { inlines: BlockNoteInline[]; theme: AppTheme }) {
  return (
    <>
      {inlines.map((inline, index) => (
        <Text
          key={index}
          style={[
            inline.marks.includes("bold") ? { fontWeight: "800" } : null,
            inline.marks.includes("italic") ? { fontStyle: "italic" as const } : null,
            inline.marks.includes("underline") ? { textDecorationLine: "underline" as const } : null,
            inline.marks.includes("strike") ? { textDecorationLine: "line-through" as const } : null,
            inline.marks.includes("code") ? { fontFamily: "Courier", backgroundColor: theme.panel } : null,
          ]}
        >
          {inline.text}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: 6 },
  paragraph: { fontSize: 14, lineHeight: 21 },
  heading: { fontWeight: "800", marginTop: 4 },
  listRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  listMarker: { fontSize: 14, lineHeight: 21, minWidth: 18 },
  quote: { borderLeftWidth: 3, paddingLeft: 10 },
  codeBlock: { borderRadius: 8, borderWidth: 1, padding: 10 },
  code: { fontFamily: "Courier", fontSize: 13, lineHeight: 19 },
});
