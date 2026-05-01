import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Briefcase,
  FileText,
  Palette,
  Star,
  Users,
  type LucideIcon
} from "lucide-react-native";
import type { Doc, Id } from "@/lib/api";
import { useAppNavigation } from "@/navigation/NavigationContext";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

type BoardListItem = {
  _id: Id<"boards">;
  name: string;
  color: string;
  icon: string | null;
  isFavorite: boolean;
  role: "owner" | "member";
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: number;
  updatedAt: number;
};

const ICONS: Record<string, LucideIcon> = {
  palette: Palette,
  briefcase: Briefcase,
  board: Briefcase,
  note: FileText,
  drawing: Palette
};

function iconForBoard(icon: string | null) {
  return ICONS[icon ?? ""] ?? Briefcase;
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function extractPreview(content?: string) {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as unknown;
    const fragments: string[] = [];
    const visit = (node: unknown) => {
      if (typeof node === "string") {
        fragments.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (typeof record.text === "string") fragments.push(record.text);
      if ("content" in record) visit(record.content);
      if ("children" in record) visit(record.children);
    };
    visit(parsed);
    return fragments.join(" ").replace(/\s+/g, " ").trim().slice(0, 140);
  } catch {
    return content.replace(/\s+/g, " ").trim().slice(0, 140);
  }
}

export function WorkspaceBoardCard({ board }: { board: BoardListItem }) {
  const Icon = iconForBoard(board.icon);
  const navigation = useAppNavigation();
  return (
    <Pressable
      onPress={() => navigation.navigate({ name: "board", boardId: board._id })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWell, { backgroundColor: `${board.color}24` }]}>
          <Icon color={board.color || colors.ink} size={20} strokeWidth={2.4} />
        </View>
        <View style={styles.actions}>
          {board.role === "member" ? (
            <View style={styles.sharedPill}>
              <Users color={colors.mutedText} size={12} />
              <Text style={styles.sharedText}>Shared</Text>
            </View>
          ) : null}
          {board.isFavorite ? <Star color="#D39B19" fill="#D39B19" size={18} /> : null}
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{board.name}</Text>
      <View style={styles.dotMeta}>
        <View style={[styles.dot, { backgroundColor: board.color }]} />
        <Text style={styles.meta}>{formatDate(board.createdAt)}</Text>
      </View>
      {board.role === "member" ? (
        <Text style={styles.meta} numberOfLines={1}>
          Owner: {board.ownerName ?? board.ownerEmail ?? "Unknown"}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function WorkspaceNoteCard({ note }: { note: Doc<"notes"> }) {
  const preview = extractPreview(note.content);
  const navigation = useAppNavigation();
  return (
    <Pressable
      onPress={() => navigation.navigate({ name: "note", noteId: note._id })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.noteIconWell}>
          <FileText color={colors.sproutRed} size={20} strokeWidth={2.4} />
        </View>
        {note.isFavorite ? <Star color="#D39B19" fill="#D39B19" size={18} /> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{note.title || "Untitled"}</Text>
      <Text style={preview ? styles.preview : styles.emptyPreview} numberOfLines={2}>
        {preview || "Empty note"}
      </Text>
      <Text style={styles.meta}>{formatDate(note.updatedAt)}</Text>
    </Pressable>
  );
}

export function WorkspaceDrawingCard({ drawing }: { drawing: Doc<"drawings"> }) {
  const navigation = useAppNavigation();
  return (
    <Pressable
      onPress={() => navigation.navigate({ name: "drawing", drawingId: drawing._id })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.drawingIconWell}>
          <Palette color={colors.blue} size={20} strokeWidth={2.4} />
        </View>
        {drawing.isFavorite ? <Star color="#D39B19" fill="#D39B19" size={18} /> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{drawing.title || "Untitled"}</Text>
      <Text style={styles.emptyPreview} numberOfLines={2}>Drawing canvas</Text>
      <Text style={styles.meta}>{formatDate(drawing.updatedAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 156,
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.whisperBorder,
    backgroundColor: colors.paperPanel,
    padding: spacing.lg,
    ...shadow.card
  },
  pressed: {
    opacity: 0.74
  },
  topRow: {
    minHeight: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  noteIconWell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230, 59, 46, 0.12)"
  },
  drawingIconWell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36, 118, 199, 0.12)"
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sharedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.whisperBorder,
    backgroundColor: colors.paperBg,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  sharedText: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700"
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26
  },
  preview: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20
  },
  emptyPreview: {
    color: colors.subtleText,
    fontSize: 14,
    lineHeight: 20
  },
  dotMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  meta: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: "600"
  }
});
