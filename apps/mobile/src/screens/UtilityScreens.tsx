import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Bell, Camera, Check, ChevronDown, ChevronRight, FileText, KanbanSquare, LogOut, Palette, PencilRuler, Plus, Search, Settings, SquarePen, Trash2, User } from "lucide-react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { TaskCard } from "@/components/Cards";
import { Avatar, Logo, Screen, formatDate } from "@/components/Primitives";
import { useMobileProfileAvatar } from "@/hooks/useMobileProfileAvatar";
import type { AppTheme, MobilePalette } from "@/theme/tokens";
import { mobileAppearancePresets, palette } from "@/theme/tokens";
import type { MobileCard, MobileData, ScreenKey } from "@/types";

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const COLOR_OPTIONS = {
  accent: ["#E63B2E", "#6B7280", "#2563EB", "#15803D", "#0891B2", "#F05C4F", "#9CA3AF", "#7CA7FF", "#22C55E", "#22D3EE"],
  background: ["#F5F3EE", "#F2F2F0", "#F8F6F1", "#F4F8F1", "#F3F6F8", "#161215", "#111111", "#171A20", "#0F1411", "#101820"],
  panel: ["#E8E4DD", "#E5E5E2", "#ECE8DD", "#E4ECDF", "#E1E7EC", "#26222B", "#1F1F1F", "#212530", "#1A211C", "#1B2530"],
  text: ["#111111", "#1C1C1A", "#1D1B16", "#132017", "#111827", "#F2EDF5", "#E5E5E5", "#F4EFE5", "#E7F3EA", "#EAF2F8"],
} as const;

type CreateScreenProps = {
  data: MobileData;
  theme: AppTheme;
  setScreen: (screen: ScreenKey) => void;
  openPlan: (planId?: MobileData["plans"][number]["_id"]) => void;
  openTask: (cardId?: MobileCard["_id"]) => void;
};

export function CreateScreen({ data, theme, setScreen, openPlan, openTask }: CreateScreenProps) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"board" | "card" | "note" | "drawing" | null>(null);
  const createPlan = useMutation(api.plans.create);
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
        const planId = await createPlan({ name: cleanTitle, color: "#E8E4DD" });
        setTitle("");
        openPlan(planId);
      } else if (kind === "card") {
        if (!data.selectedPlan || !firstColumn) {
          Alert.alert("No plan selected", "Open or create a plan before adding a task.");
          return;
        }
        const cardId = await createCard({ planId: data.selectedPlan._id, columnId: firstColumn._id, title: cleanTitle, priority: "medium" });
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
      <AppBar title="Create" subtitle={data.selectedPlan?.name ?? "Workspace"} theme={theme} back={() => setScreen("homeMixed")} right={<Plus color={theme.ink} />} />
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
        <CreateAction theme={theme} icon={<KanbanSquare size={20} color={palette.accent} />} title="Plan" meta="New plan with default columns" disabled={busy !== null} busy={busy === "board"} onPress={() => run("board")} />
        <CreateAction theme={theme} icon={<SquarePen size={20} color={palette.tints.green.fg} />} title="Task" meta={data.selectedPlan ? `Add to ${data.selectedPlan.name}` : "Open a plan first"} disabled={busy !== null || !data.selectedPlan || !firstColumn} busy={busy === "card"} onPress={() => run("card")} />
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
  const plans = query.trim() ? searchResult?.plans ?? [] : [];
  const isSearching = query.trim() && searchResult === undefined;
  const hasResults = plans.length > 0 || cards.length > 0;

  return (
    <Screen theme={theme}>
      <AppBar title="Search" subtitle={query.trim() ? `${plans.length + cards.length} results` : "Find plans and tasks"} theme={theme} right={<Search color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <Search size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search plans and tasks"
            placeholderTextColor={theme.subtle}
            autoCapitalize="none"
            style={[styles.searchInput, { color: theme.ink }]}
          />
        </View>
        {!query.trim() ? <EmptyState theme={theme} title="Search your workspace" body="Type a plan name or task title to find it." /> : null}
        {isSearching ? <Text style={[styles.stateText, { color: theme.muted }]}>Searching workspace...</Text> : null}
        {query.trim() && !isSearching && !hasResults ? <EmptyState theme={theme} title="No matches found" body="Try a shorter task title or plan name." /> : null}
        {plans.length > 0 ? <View><Text style={[styles.groupLabel, { color: theme.muted }]}>Plans</Text>{plans.map((board) => <SettingRow key={board._id} theme={theme} label={board.name} value="Plan" />)}</View> : null}
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
        {data.notifications.length === 0 ? <EmptyState theme={theme} title="Inbox is clear" body="Assignments and plan updates will appear here." /> : null}
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
        <SettingRow theme={theme} label="Plans on this device" value={String(data.plans.length)} />
        <SettingRow theme={theme} label="Notes on this device" value={String(data.notes.length)} />
      </View>
    </Screen>
  );
}

export function BoardSettingsScreen({ data, theme, dark, setDark, setScreen, firstBoardView = "boardSwipe" }: { data: MobileData; theme: AppTheme; dark: boolean; setDark: (dark: boolean) => void; setScreen: (screen: ScreenKey) => void; firstBoardView?: ScreenKey }) {
  const updatePlan = useMutation(api.plans.update);
  const [name, setName] = useState(data.selectedPlan?.name ?? "");
  const [busy, setBusy] = useState(false);

  async function saveBoardName() {
    if (!data.selectedPlan || !name.trim()) {
      Alert.alert("Plan name required", "Add a plan name before saving.");
      return;
    }
    try {
      setBusy(true);
      await updatePlan({ planId: data.selectedPlan._id, name: name.trim() });
    } catch (error) {
      Alert.alert("Could not update plan", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite() {
    if (!data.selectedPlan) return;
    try {
      await updatePlan({ planId: data.selectedPlan._id, isFavorite: !data.selectedPlan.isFavorite });
    } catch (error) {
      Alert.alert("Could not update plan", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Plan settings" subtitle={data.selectedPlan?.name ?? ""} theme={theme} right={<Settings color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.createPanel, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <TextInput value={name} onChangeText={setName} placeholder="Plan name" placeholderTextColor={theme.subtle} style={[styles.settingsInput, { color: theme.ink, borderBottomColor: theme.whisper }]} />
          <TouchableOpacity disabled={busy} onPress={saveBoardName} style={[styles.saveButton, { backgroundColor: theme.ink, opacity: busy ? 0.62 : 1 }]}><Text style={[styles.saveButtonText, { color: theme.bg }]}>{busy ? "Saving" : "Save plan name"}</Text></TouchableOpacity>
        </View>
        <SettingRow theme={theme} label="Plan view" value="Open first view" onPress={() => setScreen(firstBoardView)} />
        <SettingRow theme={theme} label="Single column" value="Focus one column" onPress={() => setScreen("boardSingle")} />
        <SettingRow theme={theme} label="Stacked columns" value="Show all columns vertically" onPress={() => setScreen("boardStacked")} />
        <SettingRow theme={theme} label="Reorder cards" value="Drag cards between columns" onPress={() => setScreen("boardDrag")} />
        <SettingRow theme={theme} label="Favorite plan" value={data.selectedPlan?.isFavorite ? "On" : "Off"} onPress={toggleFavorite} />
        <SettingRow theme={theme} label="Member assignment" value="Managed on web" />
        <SettingRow theme={theme} label="Theme" value={dark ? "Dark" : "Light"} onPress={() => setDark(!dark)} />
        <SettingRow theme={theme} label="Plan color" value={data.selectedPlan?.color ?? "Default"} />
        <SettingRow theme={theme} label="Archived cards" value="Managed on web" />
      </View>
    </Screen>
  );
}

type ProfileScreenProps = {
  data: MobileData;
  theme: AppTheme;
  dark: boolean;
  setDark: (dark: boolean) => void;
  appearancePresetId: string;
  setAppearancePresetId: (id: string) => void;
  customPalette: MobilePalette;
  setCustomPalette: (palette: MobilePalette) => void;
  onSignedOut: () => void;
};

export function ProfileScreen({ data, theme, dark, setDark, appearancePresetId, setAppearancePresetId, customPalette, setCustomPalette, onSignedOut }: ProfileScreenProps) {
  const convex = useConvex();
  const { signOut } = useAuthActions();
  const updateProfile = useMutation(api.users.updateProfile);
  const setProfileImageKey = useMutation(api.users.setProfileImageKey);
  const profile = useMobileProfileAvatar(data.viewer ?? undefined);
  const [name, setName] = useState(profile.name ?? "");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [customColorsOpen, setCustomColorsOpen] = useState(false);
  const imageKey = profile.imageKey;
  const activePreset = mobileAppearancePresets.find((preset) => preset.id === appearancePresetId) ?? mobileAppearancePresets[0];

  React.useEffect(() => {
    setName(profile.name ?? "");
  }, [profile.name]);

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

  async function removeProfilePicture() {
    if (!imageKey) return;
    try {
      setAvatarBusy(true);
      const { previousKey } = await setProfileImageKey({ imageKey: null });
      if (previousKey) {
        try {
          await convex.action(api.r2.deleteProfileImageObject, { key: previousKey });
        } catch {
          // The profile is already detached; object cleanup can fail without blocking the user.
        }
      }
    } catch (error) {
      Alert.alert("Could not remove profile picture", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function replaceProfilePicture() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photos permission required", "Allow photo access to choose a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.8,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("No image selected", "Choose an image from your library.");
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_PROFILE_IMAGE_SIZE_BYTES) {
        Alert.alert("Image too large", "Choose an image that is 5 MB or smaller.");
        return;
      }

      const contentType = asset.mimeType ?? "image/jpeg";
      if (!contentType.startsWith("image/")) {
        Alert.alert("Unsupported file", "Choose an image file.");
        return;
      }

      setAvatarBusy(true);
      const fileName = asset.fileName ?? `profile-${Date.now()}.jpg`;
      const { key, uploadUrl } = await convex.action(api.r2.createProfileImageUploadUrl, {
        fileName,
        contentType,
      });
      const fileResponse = await fetch(asset.uri);
      const body = await fileResponse.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { previousKey } = await setProfileImageKey({ imageKey: key });
      if (previousKey) {
        try {
          await convex.action(api.r2.deleteProfileImageObject, { key: previousKey });
        } catch {
          // Replacement succeeded; old object cleanup can be retried later.
        }
      }
    } catch (error) {
      Alert.alert("Could not update profile photo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Log out?", "You will return to the welcome screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void handleSignOut() },
    ]);
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut();
      onSignedOut();
    } catch (error) {
      Alert.alert("Could not log out", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Profile" subtitle="Account and workspace" theme={theme} right={<User color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.profileHero, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <TouchableOpacity disabled={avatarBusy} onPress={replaceProfilePicture} activeOpacity={0.78} style={styles.avatarReplaceButton}>
            <Avatar initials={profile.initials} imageUrl={profile.imageUrl} size={58} />
            <View style={[styles.avatarCameraBadge, { backgroundColor: theme.ink, borderColor: theme.panel }]}>
              <Camera size={13} color={theme.bg} />
            </View>
          </TouchableOpacity>
          <View style={styles.profileIdentity}>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.subtle} style={[styles.profileNameInput, { color: theme.ink, borderBottomColor: theme.whisper }]} />
            <Text numberOfLines={1} style={[styles.profileEmail, { color: theme.muted }]}>{profile.email ?? "Convex preview mode"}</Text>
            <Text style={[styles.profilePhotoNote, { color: profile.imageError ? theme.accent : theme.subtle }]}>{avatarBusy ? "Updating profile photo..." : profile.imageError ? "Profile photo could not load" : imageKey ? "Tap photo to replace" : "Tap photo to upload"}</Text>
          </View>
          <TouchableOpacity disabled={busy} onPress={saveProfile} style={[styles.compactSaveButton, { backgroundColor: theme.ink, opacity: busy ? 0.62 : 1 }]}><Text style={[styles.saveButtonText, { color: theme.bg }]}>{busy ? "Saving" : "Save"}</Text></TouchableOpacity>
        </View>
        {imageKey ? (
          <TouchableOpacity disabled={avatarBusy} onPress={removeProfilePicture} style={[styles.photoRow, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
            <Trash2 size={16} color={theme.accent} />
            <Text style={[styles.photoRowText, { color: theme.accent }]}>{avatarBusy ? "Removing web profile photo..." : "Remove profile photo"}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={[styles.settingsGroup, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <TouchableOpacity activeOpacity={0.78} onPress={() => setCustomizationOpen(!customizationOpen)} style={styles.settingsGroupHeader}>
            <View style={styles.settingsGroupTitle}>
              <Palette size={17} color={theme.muted} />
              <View>
                <Text style={[styles.rowTitle, { color: theme.ink }]}>Customization</Text>
                <Text style={[styles.settingsGroupMeta, { color: theme.muted }]}>{activePreset.name} - {dark ? "Dark" : "Light"}</Text>
              </View>
            </View>
            {customizationOpen ? <ChevronDown size={18} color={theme.muted} /> : <ChevronRight size={18} color={theme.muted} />}
          </TouchableOpacity>
          {customizationOpen ? (
            <View style={[styles.settingsGroupBody, { borderTopColor: theme.whisper }]}>
              <TouchableOpacity onPress={() => setDark(!dark)} style={styles.compactSettingRow}>
                <Text style={[styles.compactSettingLabel, { color: theme.ink }]}>Theme</Text>
                <Text style={[styles.compactSettingValue, { color: theme.muted }]}>{dark ? "Dark" : "Light"}</Text>
              </TouchableOpacity>
              <Text style={[styles.groupLabel, { color: theme.muted, marginTop: 10 }]}>Preset</Text>
              <View style={styles.compactPresetList}>
                {mobileAppearancePresets.map((preset) => {
                  const selected = appearancePresetId === preset.id;
                  const swatch = dark ? preset.dark : preset.light;
                  return (
                    <TouchableOpacity key={preset.id} onPress={() => setAppearancePresetId(preset.id)} style={[styles.compactPresetRow, { borderColor: selected ? theme.ink : theme.whisper }]}>
                      <View style={styles.swatches}>
                        <View style={[styles.swatchSmall, { backgroundColor: swatch.background }]} />
                        <View style={[styles.swatchSmall, { backgroundColor: swatch.panel }]} />
                        <View style={[styles.swatchSmall, { backgroundColor: swatch.accent }]} />
                      </View>
                      <View style={styles.presetTextBlock}>
                        <Text style={[styles.presetTitle, { color: theme.ink }]}>{preset.name}</Text>
                        <Text style={[styles.presetMeta, { color: theme.muted }]}>{preset.description}</Text>
                      </View>
                      {selected ? <Check size={17} color={theme.ink} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {appearancePresetId === "custom" ? (
                <>
                  <TouchableOpacity onPress={() => setCustomColorsOpen(!customColorsOpen)} style={styles.compactSettingRow}>
                    <Text style={[styles.compactSettingLabel, { color: theme.ink }]}>Custom colors</Text>
                    {customColorsOpen ? <ChevronDown size={17} color={theme.muted} /> : <ChevronRight size={17} color={theme.muted} />}
                  </TouchableOpacity>
                  {customColorsOpen ? (
                    <View style={[styles.customPanel, { borderColor: theme.whisper }]}>
                      <ColorSelector theme={theme} label="Accent" value={customPalette.accent} options={COLOR_OPTIONS.accent} onChange={(accent) => setCustomPalette({ ...customPalette, accent })} />
                      <ColorSelector theme={theme} label="Background" value={customPalette.background} options={COLOR_OPTIONS.background} onChange={(background) => setCustomPalette({ ...customPalette, background })} />
                      <ColorSelector theme={theme} label="Panel" value={customPalette.panel} options={COLOR_OPTIONS.panel} onChange={(panel) => setCustomPalette({ ...customPalette, panel })} />
                      <ColorSelector theme={theme} label="Text" value={customPalette.text} options={COLOR_OPTIONS.text} onChange={(text) => setCustomPalette({ ...customPalette, text })} />
                      <TouchableOpacity onPress={() => setCustomPalette(mobileAppearancePresets[0].light)} style={[styles.resetColorButton, { borderColor: theme.whisper }]}>
                        <Text style={[styles.resetColorText, { color: theme.muted }]}>Reset colors</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
        </View>
        <SettingRow theme={theme} label="Plans" value={String(data.plans.length)} />
        <SettingRow theme={theme} label="Notes" value={String(data.notes.length)} />
        <SettingRow theme={theme} label="Drawings" value={String(data.drawings.length)} />
        <TouchableOpacity disabled={signingOut} onPress={confirmSignOut} style={[styles.logoutRow, { backgroundColor: theme.panel, borderColor: theme.whisper, opacity: signingOut ? 0.62 : 1 }]}>
          <View style={styles.logoutTitle}>
            <LogOut size={17} color={theme.accent} />
            <Text style={[styles.logoutText, { color: theme.accent }]}>Log out</Text>
          </View>
          {signingOut ? <ActivityIndicator color={theme.accent} /> : <Text style={[styles.logoutMeta, { color: theme.muted }]}>Exit</Text>}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

function ColorSelector({ theme, label, value, options, onChange }: { theme: AppTheme; label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.colorSelector}>
      <View style={styles.colorSelectorHeader}>
        <Text style={[styles.colorLabel, { color: theme.muted }]}>{label}</Text>
        <Text style={[styles.colorValue, { color: theme.muted }]}>{value}</Text>
      </View>
      <View style={styles.colorOptionRow}>
        {options.map((option) => {
          const selected = option.toLowerCase() === value.toLowerCase();
          return (
            <TouchableOpacity key={option} onPress={() => onChange(option)} style={[styles.colorOption, { borderColor: selected ? theme.ink : theme.whisperStrong }]}>
              <View style={[styles.colorOptionFill, { backgroundColor: option }]} />
              {selected ? <Check size={13} color={theme.ink} style={styles.colorOptionCheck} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
  removeButton: { minHeight: 38, borderRadius: 13, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderWidth: 1, marginTop: 12 },
  removeButtonText: { fontSize: 12, fontWeight: "800" },
  settingRow: { minHeight: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  rowTitle: { flex: 1, fontSize: 16, lineHeight: 19, fontWeight: "800" },
  rowMeta: { maxWidth: "46%", fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 4, textAlign: "right" },
  logoutRow: { minHeight: 56, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  logoutTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  logoutText: { fontSize: 16, lineHeight: 19, fontWeight: "800" },
  logoutMeta: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  profileHero: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  avatarReplaceButton: { position: "relative" },
  avatarCameraBadge: { position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  profileIdentity: { flex: 1, minWidth: 0 },
  compactSaveButton: { minHeight: 36, borderRadius: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 22, lineHeight: 27, fontWeight: "800", marginTop: 12 },
  profileNameInput: { minHeight: 32, fontSize: 18, lineHeight: 22, fontWeight: "800", borderBottomWidth: 1, paddingVertical: 2 },
  profileEmail: { fontSize: 12, lineHeight: 16, fontWeight: "700", marginTop: 3 },
  profilePhotoNote: { fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  photoRow: { minHeight: 46, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  photoRowText: { fontSize: 13, lineHeight: 17, fontWeight: "800" },
  settingsGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  settingsGroupHeader: { minHeight: 62, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  settingsGroupTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  settingsGroupMeta: { fontSize: 12, lineHeight: 16, fontWeight: "700", marginTop: 2 },
  settingsGroupBody: { borderTopWidth: 1, padding: 12, gap: 10 },
  compactSettingRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  compactSettingLabel: { fontSize: 14, lineHeight: 18, fontWeight: "800" },
  compactSettingValue: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  compactPresetList: { gap: 8 },
  compactPresetRow: { minHeight: 58, padding: 10, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  presetTextBlock: { flex: 1, minWidth: 0 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  presetCard: { width: "48%", minHeight: 116, padding: 12, borderRadius: 12, borderWidth: 1 },
  swatches: { flexDirection: "row", overflow: "hidden", alignSelf: "flex-start", borderRadius: 8, marginBottom: 10 },
  swatch: { width: 22, height: 28 },
  swatchSmall: { width: 18, height: 24 },
  presetTitle: { fontSize: 14, lineHeight: 18, fontWeight: "800" },
  presetMeta: { fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 3 },
  customPanel: { padding: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  customTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  customTitle: { fontSize: 14, fontWeight: "800" },
  colorField: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10 },
  colorDot: { width: 26, height: 26, borderRadius: 8, borderWidth: 1 },
  colorLabel: { width: 82, fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase" },
  colorInput: { flex: 1, minHeight: 36, borderBottomWidth: 1, fontSize: 13, fontWeight: "800", paddingVertical: 0 },
  colorSelector: { gap: 8 },
  colorSelectorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  colorValue: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  colorOptionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorOption: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, padding: 3, alignItems: "center", justifyContent: "center" },
  colorOptionFill: { width: "100%", height: "100%", borderRadius: 8 },
  colorOptionCheck: { position: "absolute" },
  resetColorButton: { alignSelf: "flex-start", minHeight: 34, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  resetColorText: { fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase" },
  emptyBox: { alignItems: "center", padding: 24, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 21, lineHeight: 25, fontWeight: "800", marginTop: 14 },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6 },
});
