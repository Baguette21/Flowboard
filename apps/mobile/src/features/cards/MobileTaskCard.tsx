import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Circle } from "lucide-react-native";
import type { Doc, Id } from "@/lib/api";
import { useAppNavigation } from "@/navigation/NavigationContext";
import { formatDueDate } from "@/lib/dates";
import { colors, radius, spacing } from "@/theme/tokens";

type Member = {
  userId: Id<"users">;
  name: string | null;
  email: string | null;
};

function getAssignedUserIds(card: Doc<"cards">) {
  return card.assignedUserIds ?? (card.assignedUserId ? [card.assignedUserId] : []);
}

export function MobileTaskCard({
  card,
  labels,
  members
}: {
  card: Doc<"cards">;
  labels: Doc<"labels">[];
  members: Member[];
}) {
  const navigation = useAppNavigation();
  const cardLabels = labels.filter((label) => card.labelIds.includes(label._id));
  const assigneeNames = getAssignedUserIds(card)
    .map((userId) => members.find((member) => member.userId === userId))
    .filter((member): member is Member => Boolean(member))
    .map((member) => member.name ?? member.email?.split("@")[0] ?? "User");
  const dueDate = formatDueDate(card.dueDate);

  return (
    <Pressable
      onPress={() => navigation.navigate({ name: "card", cardId: card._id })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.titleRow}>
        {card.isComplete ? (
          <CheckCircle2 color={colors.green} size={20} />
        ) : (
          <Circle color={colors.subtleText} size={20} />
        )}
        <Text style={[styles.title, card.isComplete && styles.completed]} numberOfLines={3}>
          {card.title}
        </Text>
      </View>

      {card.description ? (
        <Text style={styles.description} numberOfLines={2}>{card.description}</Text>
      ) : null}

      {cardLabels.length > 0 ? (
        <View style={styles.labels}>
          {cardLabels.slice(0, 3).map((label) => (
            <View key={label._id} style={[styles.labelChip, { backgroundColor: label.color }]}>
              <Text style={styles.labelText} numberOfLines={1}>{label.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        {card.priority ? <Text style={styles.priority}>{card.priority}</Text> : null}
        {dueDate ? <Text style={styles.metaText}>{dueDate}</Text> : null}
        {assigneeNames.length > 0 ? (
          <Text style={styles.metaText} numberOfLines={1}>{assigneeNames.join(", ")}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.whisperBorder,
    backgroundColor: colors.paperBg,
    padding: spacing.md
  },
  pressed: {
    opacity: 0.7
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21
  },
  completed: {
    color: colors.subtleText,
    textDecorationLine: "line-through"
  },
  description: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18
  },
  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  labelChip: {
    maxWidth: 120,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  labelText: {
    color: colors.paperBg,
    fontSize: 11,
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center"
  },
  priority: {
    color: colors.sproutRed,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  metaText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "600"
  }
});
