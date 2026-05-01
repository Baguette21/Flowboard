import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Id } from "@/lib/api";
import { useAppNavigation } from "@/navigation/NavigationContext";
import { colors, radius, shadow, spacing } from "@/theme/tokens";

type BoardListItem = {
  _id: Id<"boards">;
  name: string;
  color: string;
  icon: string | null;
  role: "owner" | "member";
  ownerName: string | null;
  ownerEmail: string | null;
};

export function BoardCard({ board }: { board: BoardListItem }) {
  const navigation = useAppNavigation();
  return (
    <Pressable
      onPress={() => navigation.navigate({ name: "board", boardId: board._id })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWell, { backgroundColor: board.color || colors.paperPanel }]}>
        <Text style={styles.icon}>{board.icon ?? board.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{board.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {board.role === "owner"
            ? "Owned by you"
            : `Shared by ${board.ownerName ?? board.ownerEmail ?? "a collaborator"}`}
        </Text>
      </View>
      <Text style={styles.role}>{board.role}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.whisperBorder,
    backgroundColor: colors.paperPanel,
    padding: spacing.lg,
    ...shadow.card
  },
  pressed: {
    opacity: 0.72
  },
  iconWell: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)"
  },
  icon: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 5
  },
  role: {
    color: colors.subtleText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  }
});
