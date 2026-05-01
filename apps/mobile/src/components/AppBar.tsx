import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, Search } from "lucide-react-native";
import { Avatar } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";

export function AppBar({ title, subtitle, theme, back, right }: { title: string; subtitle?: string; theme: AppTheme; back?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        {back ? (
          <TouchableOpacity onPress={back} style={[styles.smallButton, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
            <ChevronLeft size={19} color={theme.ink} />
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.ink }]}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.appActions}>{right}</View>
    </View>
  );
}

export function SearchButton({ theme }: { theme: AppTheme }) {
  return <View style={[styles.smallButton, { backgroundColor: theme.panel, borderColor: theme.whisper }]}><Search size={19} color={theme.ink} /></View>;
}

export function ProfileAvatar({ name }: { name?: string | null }) {
  return <Avatar initials={(name ?? "PT").slice(0, 2).toUpperCase()} />;
}

const styles = StyleSheet.create({
  appBar: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  appBarLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  appActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 29, lineHeight: 32, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 17, fontWeight: "500", marginTop: 4 },
  smallButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
