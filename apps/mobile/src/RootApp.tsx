import React, { useEffect, useMemo, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "@/components/AppChrome";
import { useMobileData } from "@/data/useMobileData";
import { makeTheme } from "@/theme/tokens";
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
import type { Id } from "@convex/_generated/dataModel";

export function RootApp() {
  const [screen, setScreen] = useState<ScreenKey>("welcome");
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"boards"> | undefined>();
  const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | undefined>();
  const [dark, setDark] = useState(false);
  const [boardViewOrder, setBoardViewOrder] = useState<BoardPrimaryView[]>(["boardSwipe", "boardList", "boardCalendar", "boardTable"]);
  const theme = useMemo(() => makeTheme(dark), [dark]);
  const { data, status } = useMobileData(selectedBoardId);
  const activeNav = screen === "search" || screen === "searchBlank" ? "search" : screen === "inbox" ? "inbox" : screen === "profile" ? "me" : "home";
  const authScreens = ["welcome", "signin", "signup", "otp", "empty"] as const;

  useEffect(() => {
    if (status === "live" && data.viewer && (authScreens as readonly string[]).includes(screen)) {
      setScreen("homeMixed");
    }
  }, [data.viewer, screen, status]);

  function openBoard(boardId?: Id<"boards">) {
    setSelectedBoardId(boardId);
    setScreen("boardSwipe");
  }

  function openTask(cardId?: Id<"cards">) {
    setSelectedCardId(cardId);
    setScreen("taskFull");
  }

  let body: React.ReactNode;
  if ((authScreens as readonly string[]).includes(screen)) body = <AuthScreen type={screen as (typeof authScreens)[number]} theme={theme} setScreen={setScreen} />;
  else if (screen === "homeTabs") body = <HomeTabsScreen data={data} theme={theme} setScreen={setScreen} openBoard={openBoard} openTask={openTask} />;
  else if (screen === "homeToday") body = <HomeTodayScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} />;
  else if (screen === "create") body = <CreateScreen data={data} theme={theme} setScreen={setScreen} openBoard={openBoard} openTask={openTask} />;
  else if (screen === "boardList") body = <BoardListScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardCalendar") body = <BoardCalendarScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardTable") body = <BoardTableScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardSwipe") body = <BoardSwipeScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardSingle") body = <BoardSingleScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardStacked") body = <BoardStackedScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardDrag") body = <BoardSwipeScreen data={data} theme={theme} setScreen={setScreen} openTask={openTask} dragMode viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "boardLongPress") body = <BoardLongPressScreen data={data} theme={theme} setScreen={setScreen} viewOrder={boardViewOrder} setViewOrder={setBoardViewOrder} />;
  else if (screen === "taskSheet") body = <TaskSheetScreen data={data} theme={theme} selectedCardId={selectedCardId} />;
  else if (screen === "taskFull") body = <TaskFullScreen data={data} theme={theme} selectedCardId={selectedCardId} />;
  else if (screen === "taskAssign") body = <TaskAssignScreen data={data} theme={theme} selectedCardId={selectedCardId} />;
  else if (screen === "notesList") body = <NotesListScreen data={data} theme={theme} setScreen={setScreen} />;
  else if (screen === "noteEditor") body = <NoteEditorScreen data={data} theme={theme} />;
  else if (screen === "noteFocused") body = <NoteEditorScreen data={data} theme={theme} focused />;
  else if (screen === "drawingsList") body = <DrawingsListScreen data={data} theme={theme} />;
  else if (screen === "drawCanvas") body = <DrawCanvasScreen theme={theme} />;
  else if (screen === "search") body = <SearchScreen data={data} theme={theme} />;
  else if (screen === "searchBlank") body = <SearchScreen data={data} theme={theme} blank />;
  else if (screen === "inbox") body = <InboxScreen data={data} theme={theme} />;
  else if (screen === "boardSettings") body = <BoardSettingsScreen data={data} theme={theme} dark={dark} setDark={setDark} setScreen={setScreen} />;
  else if (screen === "settings") body = <SettingsScreen data={data} theme={theme} dark={dark} setDark={setDark} />;
  else if (screen === "profile") body = <ProfileScreen data={data} theme={theme} />;
  else body = <HomeMixedScreen data={data} theme={theme} setScreen={setScreen} openBoard={openBoard} openTask={openTask} />;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.bg }]}>
        {status === "loading" ? <Text style={[styles.status, { color: theme.muted }]}>Loading live workspace...</Text> : null}
        <View style={styles.body}>{body}</View>
        {!["noteFocused", "welcome", "signin", "signup", "otp"].includes(screen) ? <BottomNav active={activeNav} setScreen={setScreen} theme={theme} /> : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
  status: { paddingHorizontal: 18, paddingTop: 6, fontSize: 11, fontWeight: "700" },
});
