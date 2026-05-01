import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bell, Home, Plus, Search, User } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppTheme } from "@/theme/tokens";
import type { ScreenKey } from "@/types";

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
  navLabel: { fontSize: 10, lineHeight: 12, fontWeight: "700" },
  primaryNav: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
