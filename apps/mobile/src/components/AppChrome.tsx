import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bell, CalendarDays, Home, LayoutGrid, List, Plus, Search, Table2, User } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppTheme } from "@/theme/tokens";
import type { ScreenKey } from "@/types";

export type BoardView = "boardSwipe" | "boardList" | "boardCalendar" | "boardTable";

const BOARD_VIEW_META: Record<BoardView, { label: string; icon: typeof Home }> = {
  boardSwipe: { label: "Board", icon: LayoutGrid },
  boardCalendar: { label: "Calendar", icon: CalendarDays },
  boardTable: { label: "Table", icon: Table2 },
  boardList: { label: "List", icon: List },
};

export function BoardBottomNav({ active, viewOrder, setScreen, setViewOrder, theme }: { active: BoardView; viewOrder: BoardView[]; setScreen: (screen: ScreenKey) => void; setViewOrder: (order: BoardView[]) => void; theme: AppTheme }) {
  function reorder(target: BoardView) {
    const index = viewOrder.indexOf(target);
    if (index <= 0) return;
    const next = [...viewOrder];
    next[index - 1] = target;
    next[index] = viewOrder[index - 1];
    setViewOrder(next);
  }
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.bottomNav, { backgroundColor: theme.dark ? "rgba(21,19,15,0.98)" : "rgba(250,247,240,0.98)", borderTopColor: theme.whisper }]}>
      <View style={styles.navInner}>
        {viewOrder.map((view) => {
          const meta = BOARD_VIEW_META[view];
          const Icon = meta.icon;
          const isActive = view === active;
          return (
            <TouchableOpacity
              key={view}
              onPress={() => setScreen(view)}
              onLongPress={() => reorder(view)}
              delayLongPress={280}
              style={[styles.navItem, { flex: 1 }]}
            >
              {isActive ? <View style={[styles.navActiveDot, { backgroundColor: theme.ink }]} /> : null}
              <Icon size={22} color={isActive ? theme.ink : theme.subtle} />
              <Text style={[styles.navLabel, { color: isActive ? theme.ink : theme.subtle }]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function BottomNav({ active, setScreen, theme }: { active: string; setScreen: (screen: ScreenKey) => void; theme: AppTheme }) {
  const items = [
    { id: "home", label: "Home", icon: Home, screen: "homeMixed" as ScreenKey },
    { id: "search", label: "Search", icon: Search, screen: "search" as ScreenKey },
    { id: "create", label: "", icon: Plus, screen: "create" as ScreenKey, primary: true },
    { id: "inbox", label: "Inbox", icon: Bell, screen: "inbox" as ScreenKey },
    { id: "me", label: "Me", icon: User, screen: "profile" as ScreenKey },
  ];
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.bottomNav, { backgroundColor: theme.dark ? "rgba(21,19,15,0.98)" : "rgba(250,247,240,0.98)", borderTopColor: theme.whisper }]}>
      <View style={styles.navInner}>
        {items.map((item) => {
          const Icon = item.icon;
          if (item.primary) {
            return (
              <TouchableOpacity key={item.id} onPress={() => setScreen(item.screen)} style={[styles.primaryNav, { backgroundColor: theme.ink }]}>
                <Icon size={24} color={theme.bg} />
              </TouchableOpacity>
            );
          }
          const isActive = item.id === active;
          return (
            <TouchableOpacity key={item.id} onPress={() => setScreen(item.screen)} style={styles.navItem}>
              <Icon size={21} color={isActive ? theme.ink : theme.subtle} />
              <Text style={[styles.navLabel, { color: isActive ? theme.ink : theme.subtle }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 0.5 },
  navInner: { height: 58, paddingHorizontal: 8, paddingTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  navItem: { minWidth: 56, height: 48, alignItems: "center", justifyContent: "center", gap: 2 },
  navActiveDot: { position: "absolute", top: 0, width: 22, height: 3, borderRadius: 2 },
  navLabel: { fontSize: 10, lineHeight: 12, fontWeight: "700" },
  primaryNav: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
