import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, CalendarDays } from "lucide-react-native";
import { AppBar, ProfileAvatar, SearchButton } from "@/components/AppBar";
import { PlanCard, DrawingTile, NoteCard, Section, TaskCard } from "@/components/Cards";
import { Logo, Mono, Screen } from "@/components/Primitives";
import { useMobileProfileAvatar } from "@/hooks/useMobileProfileAvatar";
import type { AppTheme } from "@/theme/tokens";
import type { MobileData, ScreenKey } from "@/types";
import type { Id } from "@convex/_generated/dataModel";

type HomeNav = {
  setScreen: (screen: ScreenKey) => void;
  openPlan: (planId?: Id<"plans">) => void;
  openTask: (cardId?: Id<"cards">) => void;
  openNote: (noteId?: Id<"notes">) => void;
};

export function HomeMixedScreen({ data, theme, setScreen, openPlan, openNote }: { data: MobileData; theme: AppTheme } & HomeNav) {
  const avatar = useMobileProfileAvatar(data.viewer ?? undefined);
  const favoritePlans = data.plans.filter((board) => board.isFavorite).slice(0, 2);
  const dueCards = data.todayCards?.length ? data.todayCards : data.cards.filter((card) => card.dueDate);
  const taskCount = (planId: Id<"plans">) => data.cards.filter((card) => card.planId === planId).length;
  return (
    <Screen theme={theme}>
      <AppBar title="Workspace" subtitle={`${avatar.name ?? "PlanThing"} - ${dueCards.length} things due`} theme={theme} right={<><TouchableOpacity onPress={() => setScreen("search")}><SearchButton theme={theme} /></TouchableOpacity><TouchableOpacity onPress={() => setScreen("profile")}><ProfileAvatar name={avatar.name} imageUrl={avatar.imageUrl} /></TouchableOpacity></>} />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => setScreen("homeToday")} style={[styles.todayStrip, { backgroundColor: theme.accentTint, borderColor: theme.accent }]}>
          <Logo theme={theme} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayTitle, { color: theme.ink }]}>{dueCards.length} tasks due today</Text>
            <Text style={[styles.todayMeta, { color: theme.muted }]}>{data.selectedPlan?.name ?? "No plan"} - tap to focus</Text>
          </View>
          <ChevronRight size={18} color={theme.ink} />
        </TouchableOpacity>

        <View>
          <Section theme={theme} label="Favorites" count={favoritePlans.length} />
          <View style={styles.grid}>{(favoritePlans.length ? favoritePlans : data.plans.slice(0, 2)).map((board) => <PlanCard key={board._id} board={board} theme={theme} tile taskCount={taskCount(board._id)} onPress={() => openPlan(board._id)} />)}</View>
        </View>

        <View>
          <Section theme={theme} label="Plans" count={data.plans.length} action="See all" onAction={() => setScreen("homeTabs")} />
          <View style={styles.stack}>{data.plans.slice(0, 4).map((board) => <PlanCard key={board._id} board={board} theme={theme} taskCount={taskCount(board._id)} onPress={() => openPlan(board._id)} />)}</View>
        </View>

        <NotesPreview data={data} theme={theme} setScreen={setScreen} openNote={openNote} />
        <DrawingsPreview data={data} theme={theme} setScreen={setScreen} />
      </View>
    </Screen>
  );
}

export function HomeTabsScreen({ data, theme, setScreen, openPlan, openTask, openNote }: { data: MobileData; theme: AppTheme } & HomeNav) {
  const [tab, setTab] = useState<"plans" | "tasks" | "notes">("plans");
  const taskCount = (planId: Id<"plans">) => data.cards.filter((card) => card.planId === planId).length;
  return (
    <Screen theme={theme}>
      <AppBar title="Workspace" subtitle={data.viewer?.name ?? "Plans, notes, drawings"} theme={theme} right={<TouchableOpacity onPress={() => setScreen("search")}><SearchButton theme={theme} /></TouchableOpacity>} />
      <View style={styles.content}>
        <View style={[styles.segment, { backgroundColor: theme.panel }]}>
          {(["plans", "tasks", "notes"] as const).map((id) => (
            <TouchableOpacity key={id} onPress={() => setTab(id)} style={[styles.segmentItem, tab === id ? { backgroundColor: theme.ink } : null]}>
              <Text style={[styles.segmentText, { color: tab === id ? theme.bg : theme.muted }]}>{id}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === "plans" ? data.plans.map((board) => <PlanCard key={board._id} board={board} theme={theme} taskCount={taskCount(board._id)} onPress={() => openPlan(board._id)} />) : null}
        {tab === "tasks" ? data.cards.map((card) => <TaskCard key={card._id} card={card} labels={data.labels} theme={theme} onPress={() => openTask(card._id)} />) : null}
        {tab === "notes" ? <NotesPreview data={data} theme={theme} setScreen={setScreen} openNote={openNote} full /> : null}
      </View>
    </Screen>
  );
}

export function HomeTodayScreen({ data, theme, openTask }: { data: MobileData; theme: AppTheme; setScreen: (screen: ScreenKey) => void; openTask: (cardId?: Id<"cards">) => void }) {
  return (
    <Screen theme={theme}>
      <AppBar title="Today" subtitle="Agenda first" theme={theme} right={<CalendarDays color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.agendaHero, { backgroundColor: theme.ink }]}>
          <Mono theme={theme} style={{ color: theme.bg }}>May 1</Mono>
          <Text style={[styles.agendaTitle, { color: theme.bg }]}>Keep the garden moving.</Text>
          <Text style={[styles.agendaMeta, { color: theme.dark ? "rgba(238,232,222,0.62)" : "rgba(255,252,246,0.68)" }]}>{data.cards.length} plan tasks, {data.notes.length} notes, {data.drawings.length} drawings</Text>
        </View>
        {(data.todayCards?.length ? data.todayCards : data.cards).slice(0, 6).map((card) => <TaskCard key={card._id} card={card} labels={data.labels} theme={theme} onPress={() => openTask(card._id)} />)}
      </View>
    </Screen>
  );
}

function NotesPreview({ data, theme, setScreen, openNote, full }: { data: MobileData; theme: AppTheme; setScreen?: (screen: ScreenKey) => void; openNote?: (noteId?: Id<"notes">) => void; full?: boolean }) {
  return (
    <View>
      <Section theme={theme} label="Recent notes" count={data.notes.length} action={full ? undefined : "See all"} onAction={() => setScreen?.("notesList")} />
      <View style={styles.stack}>{data.notes.slice(0, full ? 10 : 2).map((note) => <TouchableOpacity key={note._id} activeOpacity={0.86} onPress={() => openNote?.(note._id)}><NoteCard note={note} theme={theme} /></TouchableOpacity>)}</View>
    </View>
  );
}

function DrawingsPreview({ data, theme, setScreen }: { data: MobileData; theme: AppTheme; setScreen?: (screen: ScreenKey) => void }) {
  return (
    <View>
      <Section theme={theme} label="Drawings" count={data.drawings.length} action="See all" onAction={() => setScreen?.("drawingsList")} />
      <View style={styles.grid}>{data.drawings.slice(0, 2).map((drawing) => <DrawingTile key={drawing._id} drawing={drawing} theme={theme} />)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, gap: 22 },
  grid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  stack: { gap: 10 },
  todayStrip: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  todayTitle: { fontSize: 14, lineHeight: 17, fontWeight: "800" },
  todayMeta: { fontSize: 12, lineHeight: 16, fontWeight: "500", marginTop: 2 },
  segment: { flexDirection: "row", padding: 4, borderRadius: 14 },
  segmentItem: { flex: 1, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  agendaHero: { minHeight: 176, borderRadius: 18, padding: 20, justifyContent: "flex-end" },
  agendaTitle: { fontSize: 31, lineHeight: 34, fontWeight: "800", marginTop: 12 },
  agendaMeta: { fontSize: 13, lineHeight: 18, fontWeight: "600", marginTop: 8 },
});
