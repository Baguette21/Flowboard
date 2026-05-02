import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CalendarDays, Inbox, Star, Users } from "lucide-react-native";
import { Avatar, IconWell, Mono, formatDate } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import { palette, tintFrom } from "@/theme/tokens";
import type { MobilePlan, MobileCard, MobileDrawing, MobileLabel, MobileNote } from "@/types";

export function Section({ label, count, action, onAction, theme }: { label: string; count?: number | string; action?: string; onAction?: () => void; theme: AppTheme }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Mono theme={theme}>{label}</Mono>
        {count !== undefined ? <Mono theme={theme} style={{ color: theme.subtle }}>{String(count).padStart(2, "0")}</Mono> : null}
      </View>
      {action ? <Text onPress={onAction} style={[styles.sectionAction, { color: theme.muted }]}>{action}</Text> : null}
    </View>
  );
}

export function PlanCard({ board, theme, tile, taskCount, onPress }: { board: MobilePlan; theme: AppTheme; tile?: boolean; taskCount?: number; onPress?: () => void }) {
  const tint = tintFrom(board.color);
  if (tile) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.boardTile, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
        <IconWell label={board.name} tint={tint} size={34} />
        <Mono theme={theme} style={styles.tileCount}>{taskCount != null ? `${taskCount} TASKS` : board.isFavorite ? "STARRED" : "BOARD"}</Mono>
        <View style={styles.tileText}>
          <Text numberOfLines={2} style={[styles.tileTitle, { color: theme.ink }]}>{board.name}</Text>
          <Text style={[styles.tileMeta, { color: theme.subtle }]}>{board.ownerName ?? board.ownerEmail ?? "Owner"}</Text>
        </View>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.boardRow, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
      <IconWell label={board.name} tint={tint} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowTitleWrap}>
          <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.ink }]}>{board.name}</Text>
          <Users size={13} color={theme.subtle} />
        </View>
        <Text style={[styles.rowMeta, { color: theme.subtle }]}>Updated {formatDate(board.updatedAt)} - {board.ownerName ?? "workspace"}</Text>
      </View>
      {taskCount != null ? <Mono theme={theme} style={{ color: theme.muted }}>{String(taskCount)}</Mono> : board.isFavorite ? <Star size={16} color={palette.accent} fill={palette.accent} /> : null}
    </TouchableOpacity>
  );
}

export function TaskCard({ card, theme, dragging, labels = [], onPress, onLongPress }: { card: MobileCard; theme: AppTheme; dragging?: boolean; labels?: MobileLabel[]; onPress?: () => void; onLongPress?: () => void }) {
  const priority = card.priority ?? "low";
  const priorityColor = priority === "high" || priority === "urgent" ? palette.accent : priority === "medium" ? palette.tints.amber.fg : palette.tints.blue.fg;
  const cardLabels = labels.filter((label) => card.labelIds?.includes(label._id)).slice(0, 4);
  const assignees = card.assignees?.slice(0, 2) ?? [];
  return (
    <TouchableOpacity disabled={!onPress && !onLongPress} onPress={onPress} onLongPress={onLongPress} delayLongPress={280} activeOpacity={0.86} style={[styles.taskCard, { backgroundColor: theme.dark ? "#322D25" : "#FFFCF6", borderColor: theme.whisper }, dragging ? styles.draggingCard : null]}>
      {cardLabels.length > 0 ? (
        <View style={styles.labelRow}>
          {cardLabels.map((label) => <View key={label._id} style={[styles.labelBar, { backgroundColor: label.color || palette.tints.ink.fg }]} />)}
        </View>
      ) : null}
      <Text style={[styles.taskTitle, { color: theme.ink }, card.isComplete ? { textDecorationLine: "line-through", color: theme.muted } : null]}>{card.title}</Text>
      <View style={styles.taskMetaRow}>
        <View style={styles.taskMetaLeft}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          {card.dueDate ? <View style={styles.taskMetaItem}><CalendarDays size={12} color={theme.muted} /><Text style={[styles.taskMeta, { color: theme.muted }]}>{formatDate(card.dueDate)}</Text></View> : null}
          {card.commentsCount ? <View style={styles.taskMetaItem}><Inbox size={12} color={theme.muted} /><Text style={[styles.taskMeta, { color: theme.muted }]}>{card.commentsCount}</Text></View> : null}
        </View>
        {assignees.length > 0 ? <View style={styles.avatarStack}>{assignees.map((member, index) => <View key={member._id} style={{ marginLeft: index === 0 ? 0 : -8 }}><Avatar initials={member.initials} tint={index === 0 ? "amber" : "green"} size={26} /></View>)}</View> : null}
      </View>
    </TouchableOpacity>
  );
}

export function NoteCard({ note, theme }: { note: MobileNote; theme: AppTheme }) {
  const snippet = note.contentHTML ? previewHtml(note.contentHTML) : note.content ? previewText(note.content) : "No content yet.";
  return (
    <View style={[styles.noteCard, { backgroundColor: theme.panel, borderColor: theme.whisper, borderLeftColor: palette.tints.amber.fg }]}>
      <Text style={[styles.noteTitle, { color: theme.ink }]}>{note.title}</Text>
      <Text numberOfLines={3} style={[styles.noteSnippet, { color: theme.muted }]}>{snippet}</Text>
      <Mono theme={theme} style={{ color: theme.subtle }}>{formatDate(note.updatedAt)}</Mono>
    </View>
  );
}

function previewHtml(contentHTML?: string) {
  if (!contentHTML) return "No content yet.";
  const withImageLabels = contentHTML.replace(/<img\b[^>]*>/gi, " Image ");
  const text = withImageLabels
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text || "No content yet.";
}

function previewText(content: string) {
  try {
    const fragments: string[] = [];
    collectText(JSON.parse(content), fragments);
    const text = fragments.join(" ").replace(/\s+/g, " ").trim();
    return text || "No content yet.";
  } catch {
    return content.replace(/\s+/g, " ").trim() || "No content yet.";
  }
}

function collectText(value: unknown, fragments: string[]) {
  if (typeof value === "string") {
    fragments.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, fragments));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") fragments.push(record.text);
  if ("content" in record) collectText(record.content, fragments);
  if ("children" in record) collectText(record.children, fragments);
}

export function DrawingTile({ drawing, theme }: { drawing: MobileDrawing; theme: AppTheme }) {
  return (
    <View style={[styles.drawTile, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
      <View style={[styles.drawPreview, { backgroundColor: palette.tints.teal.bg }]}>
        <View style={[styles.drawCircle, { borderColor: palette.tints.teal.fg }]} />
        <View style={[styles.drawRect, { borderColor: palette.tints.rose.fg }]} />
        <View style={[styles.drawLineOne, { backgroundColor: palette.accent }]} />
      </View>
      <View style={styles.drawCopy}>
        <Text style={[styles.drawTitle, { color: theme.ink }]}>{drawing.title}</Text>
        <Text style={[styles.drawMeta, { color: theme.subtle }]}>{formatDate(drawing.updatedAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: 4, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  sectionAction: { fontSize: 12, fontWeight: "700" },
  boardTile: { width: "48.5%", minHeight: 132, borderRadius: 14, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 18, elevation: 1 },
  tileCount: { position: "absolute", top: 16, right: 14, fontSize: 10 },
  tileText: { marginTop: "auto" },
  tileTitle: { fontSize: 16, lineHeight: 19, fontWeight: "800" },
  tileMeta: { fontSize: 11, lineHeight: 14, fontWeight: "500", marginTop: 4 },
  boardRow: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 18, elevation: 1 },
  rowTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { fontSize: 16, lineHeight: 19, fontWeight: "800" },
  rowMeta: { fontSize: 12, lineHeight: 16, fontWeight: "500", marginTop: 4 },
  taskCard: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  draggingCard: { transform: [{ scale: 1.04 }], shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 22, elevation: 8 },
  labelRow: { flexDirection: "row", gap: 4 },
  labelBar: { width: 28, height: 5, borderRadius: 3 },
  taskTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  taskMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  taskMetaLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  taskMeta: { fontSize: 11, fontWeight: "600" },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  noteCard: { padding: 14, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, gap: 8 },
  noteTitle: { fontSize: 15, lineHeight: 19, fontWeight: "800" },
  noteSnippet: { fontSize: 13, lineHeight: 19 },
  drawTile: { flex: 1, minWidth: 148, borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  drawPreview: { height: 110, position: "relative" },
  drawCircle: { position: "absolute", left: 22, top: 28, width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  drawRect: { position: "absolute", right: 26, top: 21, width: 42, height: 26, borderRadius: 5, borderWidth: 2 },
  drawLineOne: { position: "absolute", left: 18, top: 74, width: 112, height: 2, borderRadius: 2, transform: [{ rotate: "-13deg" }] },
  drawCopy: { paddingHorizontal: 12, paddingVertical: 10 },
  drawTitle: { fontSize: 13, lineHeight: 16, fontWeight: "700" },
  drawMeta: { fontSize: 11, lineHeight: 14, fontWeight: "600", marginTop: 2 },
});
