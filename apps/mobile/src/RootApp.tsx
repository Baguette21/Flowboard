import React, { useEffect, useMemo, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "@/components/AppChrome";
import { PlanthingLoadingScreen } from "@/components/PlanthingLoading";
import { useMobileData } from "@/data/useMobileData";
import { makeTheme, mobileAppearancePresets, type MobilePalette } from "@/theme/tokens";
import type { ScreenKey } from "@/types";
import { AuthScreen } from "@/screens/AuthScreens";
import { HomeMixedScreen, HomeTabsScreen, HomeTodayScreen } from "@/screens/HomeScreens";
import {
  BoardCalendarScreen,
  BoardListScreen,
  BoardLongPressScreen,
  BoardSingleScreen,
  BoardStackedScreen,
  BoardSwipeScreen,
  BoardTableScreen,
  type BoardPrimaryView,
} from "@/screens/BoardScreens";
import { TaskAssignScreen, TaskFullScreen, TaskSheetScreen } from "@/screens/TaskScreens";
import { DrawCanvasScreen, DrawingsListScreen, NoteEditorScreen, NotesListScreen } from "@/screens/NotesDrawScreens";
import { BoardSettingsScreen, CreateScreen, InboxScreen, ProfileScreen, SearchScreen, SettingsScreen } from "@/screens/UtilityScreens";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const APPEARANCE_STORAGE_KEY = "planthing.mobile.appearance";
const BOARD_VIEW_ORDER_STORAGE_KEY = "planthing.mobile.boardViewOrder";
const DEFAULT_BOARD_VIEW_ORDER: BoardPrimaryView[] = ["boardSwipe", "boardCalendar", "boardTable", "boardList"];
const LEGACY_BOARD_VIEW_ORDER: BoardPrimaryView[] = ["boardSwipe", "boardList", "boardCalendar", "boardTable"];
const MOBILE_TO_SHARED_VIEW: Record<BoardPrimaryView, "board" | "calendar" | "table" | "list"> = {
  boardSwipe: "board",
  boardCalendar: "calendar",
  boardTable: "table",
  boardList: "list",
};
const SHARED_TO_MOBILE_VIEW: Record<string, BoardPrimaryView | null> = {
  board: "boardSwipe",
  calendar: "boardCalendar",
  table: "boardTable",
  list: "boardList",
  draw: null,
};

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitizePalette(value: unknown, fallback: MobilePalette): MobilePalette {
  const candidate = value as Partial<MobilePalette> | null | undefined;
  return {
    accent: isHexColor(candidate?.accent) ? candidate.accent : fallback.accent,
    background: isHexColor(candidate?.background) ? candidate.background : fallback.background,
    panel: isHexColor(candidate?.panel) ? candidate.panel : fallback.panel,
    text: isHexColor(candidate?.text) ? candidate.text : fallback.text,
  };
}

function sanitizeBoardViewOrder(value: unknown): BoardPrimaryView[] {
  const parsed = Array.isArray(value) ? value : [];
  const valid = parsed.filter((item): item is BoardPrimaryView =>
    DEFAULT_BOARD_VIEW_ORDER.includes(item as BoardPrimaryView),
  );
  if (
    valid.length === LEGACY_BOARD_VIEW_ORDER.length &&
    valid.every((item, index) => item === LEGACY_BOARD_VIEW_ORDER[index])
  ) {
    return DEFAULT_BOARD_VIEW_ORDER;
  }
  return [
    ...valid,
    ...DEFAULT_BOARD_VIEW_ORDER.filter((item) => !valid.includes(item)),
  ];
}

function sharedToMobileViewOrder(value: unknown): BoardPrimaryView[] {
  const parsed = Array.isArray(value) ? value : [];
  return sanitizeBoardViewOrder(
    parsed
      .map((item) => SHARED_TO_MOBILE_VIEW[String(item)] ?? null)
      .filter((item): item is BoardPrimaryView => item !== null),
  );
}

export function RootApp() {
  const [screen, setScreen] = useState<ScreenKey>("welcome");
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"plans"> | undefined>();
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | undefined>();
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | undefined>();
  const [dark, setDark] = useState(false);
  const [appearancePresetId, setAppearancePresetId] = useState("classic");
  const [customPalette, setCustomPalette] = useState<MobilePalette>(mobileAppearancePresets[0].light);
  const [boardViewOrder, setBoardViewOrder] = useState<BoardPrimaryView[]>(DEFAULT_BOARD_VIEW_ORDER);
  const [boardViewOrderDirty, setBoardViewOrderDirty] = useState(false);
  const activePalette = useMemo(() => {
    const preset = mobileAppearancePresets.find((item) => item.id === appearancePresetId) ?? mobileAppearancePresets[0];
    return preset.id === "custom" ? sanitizePalette(customPalette, dark ? preset.dark : preset.light) : dark ? preset.dark : preset.light;
  }, [appearancePresetId, customPalette, dark]);
  const theme = useMemo(() => makeTheme(dark, activePalette), [activePalette, dark]);
  const { data, status } = useMobileData(selectedPlanId);
  const savePlanViewPreference = useMutation(api.planViewPreferences.set);
  const activeNav = screen === "search" || screen === "searchBlank" ? "search" : screen === "inbox" ? "inbox" : screen === "profile" ? "me" : "home";
  const authScreens = ["welcome", "signin", "signup", "otp", "empty"] as const;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      AsyncStorage.getItem(APPEARANCE_STORAGE_KEY),
      AsyncStorage.getItem(BOARD_VIEW_ORDER_STORAGE_KEY),
    ]).then(([appearanceValue, orderValue]) => {
      if (cancelled) return;
      if (appearanceValue) {
        const parsed = JSON.parse(appearanceValue) as {
          dark?: boolean;
          appearancePresetId?: string;
          customPalette?: MobilePalette;
        };
        if (typeof parsed.dark === "boolean") setDark(parsed.dark);
        if (typeof parsed.appearancePresetId === "string") {
          const legacyPresetId = parsed.appearancePresetId === "sage" ? "terminal" : parsed.appearancePresetId === "blueprint" ? "slate" : parsed.appearancePresetId;
          setAppearancePresetId(mobileAppearancePresets.some((preset) => preset.id === legacyPresetId) ? legacyPresetId : "classic");
        }
        if (parsed.customPalette) setCustomPalette(sanitizePalette(parsed.customPalette, mobileAppearancePresets[0].light));
      }
      if (orderValue) setBoardViewOrder(sanitizeBoardViewOrder(JSON.parse(orderValue)));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ dark, appearancePresetId, customPalette }),
    ).catch(() => {});
  }, [appearancePresetId, customPalette, dark]);

  useEffect(() => {
    void AsyncStorage.setItem(
      BOARD_VIEW_ORDER_STORAGE_KEY,
      JSON.stringify(boardViewOrder),
    ).catch(() => {});
  }, [boardViewOrder]);

  useEffect(() => {
    if (!selectedPlanId || !boardViewOrderDirty) return;
    void savePlanViewPreference({
      planId: selectedPlanId,
      viewOrder: boardViewOrder.map((view) => MOBILE_TO_SHARED_VIEW[view]),
    }).then(() => setBoardViewOrderDirty(false)).catch(() => {});
  }, [boardViewOrder, boardViewOrderDirty, savePlanViewPreference, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlanId || boardViewOrderDirty) return;
    const syncedOrder = data.planViewOrders?.[selectedPlanId];
    if (!syncedOrder) return;
    const targetOrder = sharedToMobileViewOrder(syncedOrder);
    setBoardViewOrder(targetOrder);
    if (["boardSwipe", "boardCalendar", "boardTable", "boardList"].includes(screen)) {
      const targetScreen = targetOrder[0] ?? "boardSwipe";
      if (screen !== targetScreen) setScreen(targetScreen);
    }
  }, [boardViewOrderDirty, data.planViewOrders, screen, selectedPlanId]);

  function setUserBoardViewOrder(order: BoardPrimaryView[]) {
    setBoardViewOrder(order);
    setBoardViewOrderDirty(true);
  }

  useEffect(() => {
    if (status === "live" && data.viewer && (authScreens as readonly string[]).includes(screen)) {
      setScreen("homeMixed");
    }
  }, [data.viewer, screen, status]);

  function openPlan(planId?: Id<"plans">) {
    const syncedOrder = planId ? data.planViewOrders?.[planId] : undefined;
    const targetOrder = syncedOrder ? sharedToMobileViewOrder(syncedOrder) : boardViewOrder;
    setSelectedPlanId(planId);
    setBoardViewOrder(targetOrder);
    setBoardViewOrderDirty(false);
    setScreen(targetOrder[0] ?? "boardSwipe");
  }

  function openTask(cardId?: Id<"cards">) {
    setSelectedCardId(cardId);
    setScreen("taskFull");
  }

  function openNote(noteId?: Id<"notes">) {
    setSelectedNoteId(noteId);
    setScreen("noteFocused");
  }

  let body: React.ReactNode;
  if ((authScreens as readonly string[]).includes(screen)) body = <AuthScreen type={screen as (typeof authScreens)[number]} theme={theme} setScreen={setScreen} />;
  else if (screen === "homeTabs") body = <HomeTabsScreen data={data} theme={theme} setScreen={setScreen} openPlan={openPlan} openTask={openTask} openNote={openNote} />;
  else if (screen === "homeToday") body = <HomeTodayScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} />;
  else if (screen === "create") body = <CreateScreen data={data} theme={theme} setScreen={setScreen} openPlan={openPlan} openTask={openTask} />;
  else if (screen === "boardList") body = <BoardListScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardCalendar") body = <BoardCalendarScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardTable") body = <BoardTableScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardSwipe") body = <BoardSwipeScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardSingle") body = <BoardSingleScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardStacked") body = <BoardStackedScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardDrag") body = <BoardSwipeScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} dragMode viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "boardLongPress") body = <BoardLongPressScreen data={data} theme={theme} setScreen={setScreen} viewOrder={boardViewOrder} setViewOrder={setUserBoardViewOrder} />;
  else if (screen === "taskSheet") body = <TaskSheetScreen data={data} theme={theme} selectedCardId={selectedCardId} />;
  else if (screen === "taskFull") body = <TaskFullScreen data={data} theme={theme} selectedCardId={selectedCardId} />;
  else if (screen === "taskAssign") body = <TaskAssignScreen data={data} theme={theme} selectedCardId={selectedCardId} />;
  else if (screen === "notesList") body = <NotesListScreen data={data} theme={theme} setScreen={setScreen} openNote={openNote} />;
  else if (screen === "noteEditor") body = <NoteEditorScreen data={data} theme={theme} selectedNoteId={selectedNoteId} setScreen={setScreen} />;
  else if (screen === "noteFocused") body = <NoteEditorScreen data={data} theme={theme} selectedNoteId={selectedNoteId} setScreen={setScreen} focused />;
  else if (screen === "drawingsList") body = <DrawingsListScreen data={data} theme={theme} />;
  else if (screen === "drawCanvas") body = <DrawCanvasScreen theme={theme} />;
  else if (screen === "search") body = <SearchScreen data={data} theme={theme} />;
  else if (screen === "searchBlank") body = <SearchScreen data={data} theme={theme} blank />;
  else if (screen === "inbox") body = <InboxScreen data={data} theme={theme} />;
  else if (screen === "boardSettings") body = <BoardSettingsScreen data={data} theme={theme} dark={dark} setDark={setDark} setScreen={setScreen} firstBoardView={boardViewOrder[0] ?? "boardSwipe"} />;
  else if (screen === "settings") body = <SettingsScreen data={data} theme={theme} dark={dark} setDark={setDark} />;
  else if (screen === "profile") body = <ProfileScreen data={data} theme={theme} dark={dark} setDark={setDark} appearancePresetId={appearancePresetId} setAppearancePresetId={setAppearancePresetId} customPalette={customPalette} setCustomPalette={setCustomPalette} />;
  else body = <HomeMixedScreen data={data} theme={theme} setScreen={setScreen} openPlan={openPlan} openTask={openTask} openNote={openNote} />;

  if (status === "loading") {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
        <PlanthingLoadingScreen message="Loading PlanThing..." theme={theme} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.bg }]}>
        <View style={styles.body}>{body}</View>
        {!["noteFocused", "welcome", "signin", "signup", "otp"].includes(screen) ? <BottomNav active={activeNav} setScreen={setScreen} theme={theme} /> : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
});
