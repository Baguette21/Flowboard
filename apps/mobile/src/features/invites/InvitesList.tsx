import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import { useAppNavigation } from "@/navigation/NavigationContext";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

export function InvitesList() {
  const navigation = useAppNavigation();
  const invites = useQuery(api.boardInvites.listMine);
  const acceptInvite = useMutation(api.boardInvites.accept);
  const declineInvite = useMutation(api.boardInvites.decline);

  if (invites === undefined) {
    return <ActivityIndicator color={colors.ink} />;
  }

  if (invites.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No pending invites</Text>
        <Text style={styles.emptyCopy}>Shared boards will appear here when someone invites you.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {invites.map((invite) => (
        <View key={invite._id} style={styles.invite}>
          <View style={styles.inviteHeader}>
            <View style={[styles.colorDot, { backgroundColor: invite.boardColor }]} />
            <View style={styles.inviteCopy}>
              <Text style={styles.boardName}>{invite.boardName}</Text>
              <Text style={styles.meta}>
                From {invite.invitedByName ?? invite.invitedByEmail ?? "a collaborator"}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              variant="secondary"
              onPress={async () => {
                await declineInvite({ inviteId: invite._id });
              }}
              style={styles.actionButton}
            >
              Decline
            </Button>
            <Button
              onPress={async () => {
                const result = await acceptInvite({ inviteId: invite._id });
                navigation.navigate({ name: "board", boardId: result.boardId });
              }}
              style={styles.actionButton}
            >
              Accept
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md
  },
  empty: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.whisperBorder,
    backgroundColor: colors.paperPanel,
    padding: spacing.xl
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6
  },
  emptyCopy: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20
  },
  invite: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.whisperBorder,
    backgroundColor: colors.paperPanel,
    padding: spacing.lg,
    gap: spacing.lg
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  colorDot: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.whisperBorder
  },
  inviteCopy: {
    flex: 1
  },
  boardName: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  meta: {
    color: colors.mutedText,
    fontSize: 13,
    marginTop: 4
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1
  }
});
