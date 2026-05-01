import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { Bell, FileText, Inbox, Layers, LayoutGrid, Palette, Plus, Search, Star, UserCircle } from "lucide-react-native";
import { api } from "@/lib/api";
import { Button } from "@/components/Button";
import { PlanthingMark } from "@/components/PlanthingMark";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { InvitesList } from "@/features/invites/InvitesList";
import { WorkspaceBoardCard, WorkspaceDrawingCard, WorkspaceNoteCard } from "@/features/workspace/WorkspaceCard";
import { useAppNavigation, type MainTab } from "@/navigation/NavigationContext";
import { colors, radius, spacing } from "@/theme/tokens";

type FilterTab = "all" | "boards" | "notes" | "drawings";

function WorkspaceScreen() {
  const navigation = useAppNavigation();
  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list);
  const drawings = useQuery(api.drawings.list);
  const invites = useQuery(api.boardInvites.listMine);
  const createBoard = useMutation(api.boards.create);
  const createNote = useMutation(api.notes.create);
  const createDrawing = useMutation(api.drawings.create);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [error, setError] = useState("");
  const q = search.trim().toLowerCase();
  const filteredBoards = (boards ?? []).filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
  const filteredNotes = (notes ?? []).filter((n) => (q ? (n.title || "").toLowerCase().includes(q) : true));
  const filteredDrawings = (drawings ?? []).filter((d) => (q ? (d.title || "").toLowerCase().includes(q) : true));
  const favorites = filteredBoards.filter((b) => b.isFavorite);
  const feed = useMemo(() => {
    const items: Array<any> = [];
    if (filter !== "notes" && filter !== "drawings") items.push(...filteredBoards.filter((b) => !b.isFavorite).map((board) => ({ kind: "board", updatedAt: board.updatedAt, board })));
    if (filter !== "boards" && filter !== "drawings") items.push(...filteredNotes.map((note) => ({ kind: "note", updatedAt: note.updatedAt, note })));
    if (filter !== "boards" && filter !== "notes") items.push(...filteredDrawings.map((drawing) => ({ kind: "drawing", updatedAt: drawing.updatedAt, drawing })));
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filter, filteredBoards, filteredNotes, filteredDrawings]);
  const loading = boards === undefined || notes === undefined || drawings === undefined;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <PlanthingMark size={30} />
          <Text style={styles.wordmark}>Planthing<Text style={styles.accent}>.</Text></Text>
        </View>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PlanThing</Text>
            <Text style={styles.title}>Workspace</Text>
            <Text style={styles.subtitle}>{loading ? "Loading..." : `${boards?.length ?? 0} boards · ${notes?.length ?? 0} notes · ${drawings?.length ?? 0} drawings`}</Text>
          </View>
          <Pressable style={styles.fab} onPress={() => setCreatingBoard((v) => !v)}>
            <Plus color={colors.paperBg} size={22} />
          </Pressable>
        </View>
        <View style={styles.searchShell}>
          <Search color={colors.subtleText} size={18} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search workspace..." placeholderTextColor={colors.subtleText} style={styles.searchInput} />
        </View>
        {invites && invites.length > 0 ? (
          <Pressable style={styles.inviteBanner} onPress={() => navigation.navigate({ name: "invites" })}>
            <Text style={styles.inviteTitle}>{invites.length} pending invite{invites.length === 1 ? "" : "s"}</Text>
            <Text style={styles.inviteCopy}>Review shared boards</Text>
          </Pressable>
        ) : null}
        <View style={styles.quickActions}>
          <Button onPress={() => setCreatingBoard(true)} style={styles.quickButton}>New Board</Button>
          <Button variant="secondary" onPress={async () => navigation.navigate({ name: "note", noteId: await createNote({ title: "Untitled" }) })} style={styles.quickButton}>New Note</Button>
          <Button variant="secondary" onPress={async () => {
            try { navigation.navigate({ name: "drawing", drawingId: await createDrawing({ title: "Untitled" }) }); }
            catch (e) { setError(e instanceof Error ? e.message : "Drawings require Pro."); }
          }} style={styles.quickButton}>Draw</Button>
        </View>
        {creatingBoard ? (
          <View style={styles.createPanel}>
            <TextField label="Board Name" value={boardName} onChangeText={setBoardName} />
            <Button onPress={async () => {
              const name = boardName.trim();
              if (!name) return;
              const boardId = await createBoard({ name });
              setBoardName("");
              setCreatingBoard(false);
              navigation.navigate({ name: "board", boardId });
            }}>Create Board</Button>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.filterRail}>
          {([
            ["all", "All", Star],
            ["boards", "Boards", LayoutGrid],
            ["notes", "Notes", FileText],
            ["drawings", "Draw", Palette]
          ] as const).map(([key, label, Icon]) => {
            const active = filter === key;
            return <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterPill, active && styles.filterPillActive]}><Icon color={active ? colors.paperBg : colors.mutedText} size={15} /><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
          })}
        </View>
        {loading ? <ActivityIndicator color={colors.ink} /> : (
          <View style={styles.sections}>
            {favorites.length > 0 && !q && filter !== "notes" && filter !== "drawings" ? <View style={styles.section}><Text style={styles.sectionTitle}>Favorites</Text><View style={styles.grid}>{favorites.map((board) => <WorkspaceBoardCard key={board._id} board={board} />)}</View></View> : null}
            <View style={styles.section}><Text style={styles.sectionTitle}>{q ? "Results" : "Library"}</Text><View style={styles.grid}>{feed.map((item) => item.kind === "board" ? <WorkspaceBoardCard key={item.board._id} board={item.board} /> : item.kind === "note" ? <WorkspaceNoteCard key={item.note._id} note={item.note} /> : <WorkspaceDrawingCard key={item.drawing._id} drawing={item.drawing} />)}</View></View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function InboxScreen() {
  return <Screen><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>Inbox</Text><Text style={styles.title}>Invites</Text><InvitesList /></ScrollView></Screen>;
}

function NotificationsScreen() {
  const navigation = useAppNavigation();
  const notifications = useQuery(api.notifications.listMine);
  const markRead = useMutation(api.notifications.markRead);
  return <Screen><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>Updates</Text><Text style={styles.title}>Notifications</Text>{notifications === undefined ? <ActivityIndicator color={colors.ink} /> : notifications.map((n) => <Pressable key={n._id} style={styles.notification} onPress={async () => { await markRead({ notificationId: n._id }); navigation.navigate({ name: "board", boardId: n.boardId }); }}><View style={[styles.dot, { backgroundColor: n.boardColor }]} /><View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{n.actorName ?? n.actorEmail ?? "Someone"} assigned you</Text><Text style={styles.subtitle}>{n.taskTitle} on {n.boardName}</Text></View></Pressable>)}</ScrollView></Screen>;
}

function ProfileScreen() {
  const navigation = useAppNavigation();
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  return <Screen><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>Account</Text><Text style={styles.title}>Profile</Text>{me === undefined ? <ActivityIndicator color={colors.ink} /> : <View style={styles.profileCard}><Text style={styles.avatarText}>{(me?.name ?? me?.email ?? "P").slice(0, 1).toUpperCase()}</Text><Text style={styles.profileName}>{me?.name ?? "PlanThing user"}</Text><Text style={styles.subtitle}>{me?.email ?? "No email"}</Text></View>}<Button variant="secondary" onPress={async () => { await signOut(); navigation.replace({ name: "signIn" }); }}>Sign Out</Button></ScrollView></Screen>;
}

export function MainTabs({ tab }: { tab: MainTab }) {
  const navigation = useAppNavigation();
  const body = tab === "workspace" ? <WorkspaceScreen /> : tab === "inbox" ? <InboxScreen /> : tab === "notifications" ? <NotificationsScreen /> : <ProfileScreen />;
  return (
    <View style={{ flex: 1 }}>
      {body}
      <View style={styles.tabBar}>
        {([
          ["workspace", "Workspace", Layers],
          ["inbox", "Inbox", Inbox],
          ["notifications", "Updates", Bell],
          ["profile", "Profile", UserCircle]
        ] as const).map(([key, label, Icon]) => {
          const active = tab === key;
          return <Pressable key={key} onPress={() => navigation.replace({ name: "main", tab: key })} style={styles.tabItem}><Icon color={active ? colors.ink : colors.subtleText} size={22} /><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text></Pressable>;
        })}
      </View>
    </View>
  );
}

export function InvitesScreen() {
  return <Screen><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>Shared boards</Text><Text style={styles.title}>Invites</Text><InvitesList /></ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 112, gap: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  wordmark: { color: colors.ink, fontSize: 24, fontWeight: "900", fontStyle: "italic" },
  accent: { color: colors.sproutRed },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.lg },
  eyebrow: { color: colors.subtleText, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 32, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 6 },
  fab: { minWidth: 50, minHeight: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  searchShell: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, paddingHorizontal: spacing.lg },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15 },
  inviteBanner: { borderRadius: radius.lg, padding: spacing.lg, backgroundColor: "rgba(230, 59, 46, 0.10)", borderWidth: 1, borderColor: "rgba(230, 59, 46, 0.22)" },
  inviteTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  inviteCopy: { color: colors.mutedText, fontSize: 13, marginTop: 3 },
  quickActions: { flexDirection: "row", gap: spacing.sm },
  quickButton: { flex: 1, paddingHorizontal: 10 },
  createPanel: { gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, padding: spacing.lg },
  error: { color: colors.sproutRed, fontSize: 13, lineHeight: 18 },
  filterRail: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filterPill: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, paddingHorizontal: spacing.md },
  filterPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.mutedText, fontSize: 13, fontWeight: "800" },
  filterTextActive: { color: colors.paperBg },
  sections: { gap: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.mutedText, fontSize: 13, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  grid: { gap: spacing.md },
  tabBar: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 72, flexDirection: "row", backgroundColor: colors.headerWash, borderTopWidth: 1, borderTopColor: colors.whisperBorder, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { color: colors.subtleText, fontSize: 11, fontWeight: "700" },
  tabLabelActive: { color: colors.ink },
  notification: { minHeight: 86, flexDirection: "row", gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, padding: spacing.lg },
  notificationTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  dot: { width: 42, height: 42, borderRadius: radius.md },
  profileCard: { alignItems: "center", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, padding: spacing.xl },
  avatarText: { width: 76, height: 76, borderRadius: 38, textAlign: "center", textAlignVertical: "center", backgroundColor: colors.ink, color: colors.paperBg, fontSize: 30, fontWeight: "900", marginBottom: spacing.lg },
  profileName: { color: colors.ink, fontSize: 22, fontWeight: "900" }
});
