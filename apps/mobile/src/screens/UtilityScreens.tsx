import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Bell, FileText, KanbanSquare, PencilRuler, Plus, Search, Settings, SquarePen, User } from "lucide-react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { TaskCard } from "@/components/Cards";
import { Avatar, Logo, Screen, formatDate } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import { palette } from "@/theme/tokens";
import type { MobileCard, MobileData, ScreenKey } from "@/types";

type CreateScreenProps = {
  data: MobileData;
  theme: AppTheme;
  setScreen: (screen: ScreenKey) => void;
  openBoard: (boardId?: MobileData["boards"][number]["_id"]) => void;
  openTask: (cardId?: MobileCard["_id"]) => void;
};

export function CreateScreen({ data, theme, setScreen, openBoard, openTask }: CreateScreenProps) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"board" | "card" | "note" | "drawing" | null>(null);
  const createBoard = useMutation(api.boards.create);
  const createCard = useMutation(api.cards.create);
  const createNote = useMutation(api.notes.create);
  const createDrawing = useMutation(api.drawings.create);

  const cleanTitle = title.trim();
  const firstColumn = data.columns[0];

  async function run(kind: "board" | "card" | "note" | "drawing") {
    if (!cleanTitle) {
      Alert.alert("Name required", "Add a title first.");
      return;
    }
    try {
      setBusy(kind);
      if (kind === "board") {
        const boardId = await createBoard({ name: cleanTitle, color: "#E8E4DD" });
        setTitle("");
        openBoard(boardId);
      } else if (kind === "card") {
        if (!data.selectedBoard || !firstColumn) {
          Alert.alert("No board selected", "Open or create a board before adding a task.");
          return;
        }
        const cardId = await createCard({ boardId: data.selectedBoard._id, columnId: firstColumn._id, title: cleanTitle, priority: "medium" });
        setTitle("");
        openTask(cardId);
      } else if (kind === "note") {
        await createNote({ title: cleanTitle });
        setTitle("");
        setScreen("notesList");
      } else {
        await createDrawing({ title: cleanTitle });
        setTitle("");
        setScreen("drawingsList");
      }
    } catch (error) {
      Alert.alert("Could not create item", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Create" subtitle={data.selectedBoard?.name ?? "Workspace"} theme={theme} back={() => setScreen("homeMixed")} right={<Plus color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.createPanel, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Name it"
            placeholderTextColor={theme.subtle}
            style={[styles.titleInput, { color: theme.ink, borderBottomColor: theme.whisper }]}
            returnKeyType="done"
          />
          <Text style={[styles.createHint, { color: theme.muted }]}>Creates real Convex records in the current workspace.</Text>
        </View>
        <CreateAction theme={theme} icon={<KanbanSquare size={20} color={palette.accent} />} title="Board" meta="New board with default columns" disabled={busy !== null} busy={busy === "board"} onPress={() => run("board")} />
        <CreateAction theme={theme} icon={<SquarePen size={20} color={palette.tints.green.fg} />} title="Task" meta={data.selectedBoard ? `Add to ${data.selectedBoard.name}` : "Open a board first"} disabled={busy !== null || !data.selectedBoard || !firstColumn} busy={busy === "card"} onPress={() => run("card")} />
        <CreateAction theme={theme} icon={<FileText size={20} color={palette.tints.teal.fg} />} title="Note" meta="Start a note from this title" disabled={busy !== null} busy={busy === "note"} onPress={() => run("note")} />
        <CreateAction theme={theme} icon={<PencilRuler size={20} color={palette.tints.violet.fg} />} title="Drawing" meta="Create a drawing workspace" disabled={busy !== null} busy={busy === "drawing"} onPress={() => run("drawing")} />
      </View>
    </Screen>
  );
}

export function SearchScreen({ data, theme, blank }: { data: MobileData; theme: AppTheme; blank?: boolean }) {
  const [query, setQuery] = useState("");
  const searchResult = useQuery(api.mobile.search, query.trim() ? { query: query.trim() } : "skip");
  const cards = query.trim() ? searchResult?.cards ?? [] : [];
  const boards = query.trim() ? searchResult?.boards ?? [] : [];
  const isSearching = query.trim() && searchResult === undefined;
  const hasResults = boards.length > 0 || cards.length > 0;

  return (
    <Screen theme={theme}>
      <AppBar title="Search" subtitle={query.trim() ? `${boards.length + cards.length} results` : "Find boards and tasks"} theme={theme} right={<Search color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <Search size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search boards and tasks"
            placeholderTextColor={theme.subtle}
            autoCapitalize="none"
            style={[styles.searchInput, { color: theme.ink }]}
          />
        </View>
        {!query.trim() ? <EmptyState theme={theme} title="Search your workspace" body="Type a board name or task title to find it." /> : null}
        {isSearching ? <Text style={[styles.stateText, { color: theme.muted }]}>Searching workspace...</Text> : null}
        {query.trim() && !isSearching && !hasResults ? <EmptyState theme={theme} title="No matches found" body="Try a shorter task title or board name." /> : null}
        {boards.length > 0 ? <View><Text style={[styles.groupLabel, { color: theme.muted }]}>Boards</Text>{boards.map((board) => <SettingRow key={board._id} theme={theme} label={board.name} value="Board" />)}</View> : null}
        {cards.length > 0 ? <View><Text style={[styles.groupLabel, { color: theme.muted }]}>Tasks</Text>{cards.map((card) => <TaskCard key={card._id} card={card} labels={data.labels} theme={theme} />)}</View> : null}
      </View>
    </Screen>
  );
}

export function InboxScreen({ data, theme }: { data: MobileData; theme: AppTheme }) {
  const markRead = useMutation(api.notifications.markRead);
  async function openNotification(notificationId: MobileData["notifications"][number]["_id"]) {
    try {
      await markRead({ notificationId });
    } catch (error) {
      Alert.alert("Could not update inbox", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Inbox" subtitle={`${data.notifications.length} notifications`} theme={theme} right={<Bell color={theme.ink} />} />
      <View style={styles.content}>
        {data.notifications.map((item) => (
          <TouchableOpacity key={item._id} onPress={() => openNotification(item._id)} style={[styles.notificationRow, { backgroundColor: theme.panel, borderColor: item.isRead ? theme.whisper : palette.accent }]}>
            <Bell size={18} color={item.isRead ? theme.subtle : palette.accent} />
            <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: theme.ink }]}>{item.taskTitle}</Text><Text style={[styles.rowMeta, { color: theme.subtle }]}>Assigned task - {formatDate(item.createdAt)}</Text></View>
          </TouchableOpacity>
        ))}
        {data.notifications.length === 0 ? <EmptyState theme={theme} title="Inbox is clear" body="Assignments and board updates will appear here." /> : null}
      </View>
    </Screen>
  );
}

export function SettingsScreen({ data, theme, dark, setDark }: { data: MobileData; theme: AppTheme; dark: boolean; setDark: (dark: boolean) => void }) {
  return (
    <Screen theme={theme}>
      <AppBar title="Settings" subtitle={data.viewer ? "Signed in and syncing" : "Preview data"} theme={theme} right={<Settings color={theme.ink} />} />
      <View style={styles.content}>
        <SettingRow theme={theme} label="Theme" value={dark ? "Dark" : "Light"} onPress={() => setDark(!dark)} />
        <SettingRow theme={theme} label="Connection" value={data.viewer ? "Live workspace" : "Preview mode"} />
        <SettingRow theme={theme} label="Boards on this device" value={String(data.boards.length)} />
        <SettingRow theme={theme} label="Notes on this device" value={String(data.notes.length)} />
      </View>
    </Screen>
  );
}

export function BoardSettingsScreen({ data, theme, dark, setDark, setScreen }: { data: MobileData; theme: AppTheme; dark: boolean; setDark: (dark: boolean) => void; setScreen: (screen: ScreenKey) => void }) {
  const updateBoard = useMutation(api.boards.update);
  const [name, setName] = useState(data.selectedBoard?.name ?? "");
  const [busy, setBusy] = useState(false);

  async function saveBoardName() {
    if (!data.selectedBoard || !name.trim()) {
      Alert.alert("Board name required", "Add a board name before saving.");
      return;
    }
    try {
      setBusy(true);
      await updateBoard({ boardId: data.selectedBoard._id, name: name.trim() });
    } catch (error) {
      Alert.alert("Could not update board", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite() {
    if (!data.selectedBoard) return;
    try {
      await updateBoard({ boardId: data.selectedBoard._id, isFavorite: !data.selectedBoard.isFavorite });
    } catch (error) {
      Alert.alert("Could not update board", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Board settings" subtitle={data.selectedBoard?.name ?? ""} theme={theme} right={<Settings color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.createPanel, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <TextInput value={name} onChangeText={setName} placeholder="Board name" placeholderTextColor={theme.subtle} style={[styles.settingsInput, { color: theme.ink, borderBottomColor: theme.whisper }]} />
          <TouchableOpacity disabled={busy} onPress={saveBoardName} style={[styles.saveButton, { backgroundColor: theme.ink, opacity: busy ? 0.62 : 1 }]}><Text style={[styles.saveButtonText, { color: theme.bg }]}>{busy ? "Saving" : "Save board name"}</Text></TouchableOpacity>
        </View>
        <SettingRow theme={theme} label="Board mode" value="Open board view" onPress={() => setScreen("boardSwipe")} />
        <SettingRow theme={theme} label="Single column" value="Focus one column" onPress={() => setScreen("boardSingle")} />
        <SettingRow theme={theme} label="Stacked columns" value="Show all columns vertically" onPress={() => setScreen("boardStacked")} />
        <SettingRow theme={theme} label="Reorder cards" value="Drag cards between columns" onPress={() => setScreen("boardDrag")} />
        <SettingRow theme={theme} label="Favorite board" value={data.selectedBoard?.isFavorite ? "On" : "Off"} onPress={toggleFavorite} />
        <SettingRow theme={theme} label="Member assignment" value="Managed on web" />
        <SettingRow theme={theme} label="Theme" value={dark ? "Dark" : "Light"} onPress={() => setDark(!dark)} />
        <SettingRow theme={theme} label="Board color" value={data.selectedBoard?.color ?? "Default"} />
        <SettingRow theme={theme} label="Archived cards" value="Managed on web" />
      </View>
    </Screen>
  );
}

export function ProfileScreen({ data, theme }: { data: MobileData; theme: AppTheme }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(data.viewer?.name ?? "");
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    if (!name.trim()) {
      Alert.alert("Name required", "Add your name before saving.");
      return;
    }
    try {
      setBusy(true);
      await updateProfile({ name: name.trim() });
    } catch (error) {
      Alert.alert("Could not update profile", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Profile" subtitle="Account and workspace" theme={theme} right={<User color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.profileHero, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <Avatar initials={(data.viewer?.name ?? "PT").slice(0, 2).toUpperCase()} size={64} />
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.subtle} style={[styles.profileNameInput, { color: theme.ink, borderBottomColor: theme.whisper }]} />
          <Text style={[styles.profileEmail, { color: theme.muted }]}>{data.viewer?.email ?? "Convex preview mode"}</Text>
          <TouchableOpacity disabled={busy} onPress={saveProfile} style={[styles.saveButton, { backgroundColor: theme.ink, opacity: busy ? 0.62 : 1 }]}><Text style={[styles.saveButtonText, { color: theme.bg }]}>{busy ? "Saving" : "Save profile"}</Text></TouchableOpacity>
        </View>
        <SettingRow theme={theme} label="Boards" value={String(data.boards.length)} />
        <SettingRow theme={theme} label="Notes" value={String(data.notes.length)} />
        <SettingRow theme={theme} label="Drawings" value={String(data.drawings.length)} />
      </View>
    </Screen>
  );
}

function SettingRow({ theme, label, value, onPress }: { theme: AppTheme; label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity disabled={!onPress} activeOpacity={0.76} onPress={onPress} style={[styles.settingRow, { backgroundColor: theme.panel, borderColor: theme.whisper, opacity: onPress ? 1 : 0.82 }]}>
      <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.ink }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.rowMeta, { color: theme.muted }]}>{value}</Text>
    </TouchableOpacity>
  );
}

function CreateAction({ theme, icon, title, meta, disabled, busy, onPress }: { theme: AppTheme; icon: React.ReactNode; title: string; meta: string; disabled?: boolean; busy?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.createAction, { backgroundColor: theme.panel, borderColor: theme.whisper, opacity: disabled ? 0.54 : 1 }]}>
      <View style={[styles.createIcon, { backgroundColor: theme.bg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: theme.ink }]}>{title}</Text>
        <Text style={[styles.rowMeta, { color: theme.subtle }]}>{busy ? "Creating..." : meta}</Text>
      </View>
      <Plus size={18} color={theme.muted} />
    </TouchableOpacity>
  );
}

function EmptyState({ theme, title, body }: { theme: AppTheme; title: string; body: string }) {
  return <View style={[styles.emptyBox, { backgroundColor: theme.panel, borderColor: theme.whisper }]}><Logo theme={theme} size={54} /><Text style={[styles.emptyTitle, { color: theme.ink }]}>{title}</Text><Text style={[styles.emptyBody, { color: theme.muted }]}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, gap: 18 },
  createPanel: { padding: 16, borderRadius: 14, borderWidth: 1 },
  titleInput: { minHeight: 48, borderBottomWidth: 1, fontSize: 26, lineHeight: 31, fontWeight: "800" },
  createHint: { fontSize: 12, lineHeight: 17, fontWeight: "600", marginTop: 12 },
  createAction: { minHeight: 72, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  createIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  searchBox: { height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 15, fontWeight: "700", paddingVertical: 0 },
  stateText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  groupLabel: { fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  notificationRow: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  settingsInput: { minHeight: 44, borderBottomWidth: 1, fontSize: 18, lineHeight: 22, fontWeight: "800" },
  saveButton: { alignSelf: "flex-start", minHeight: 38, borderRadius: 13, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginTop: 12 },
  saveButtonText: { fontSize: 13, fontWeight: "800" },
  settingRow: { minHeight: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  rowTitle: { flex: 1, fontSize: 16, lineHeight: 19, fontWeight: "800" },
  rowMeta: { maxWidth: "46%", fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 4, textAlign: "right" },
  profileHero: { alignItems: "center", padding: 22, borderRadius: 16, borderWidth: 1 },
  profileName: { fontSize: 22, lineHeight: 27, fontWeight: "800", marginTop: 12 },
  profileNameInput: { minWidth: 220, textAlign: "center", fontSize: 22, lineHeight: 27, fontWeight: "800", marginTop: 12, borderBottomWidth: 1, paddingVertical: 6 },
  profileEmail: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  emptyBox: { alignItems: "center", padding: 24, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 21, lineHeight: 25, fontWeight: "800", marginTop: 14 },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
});
