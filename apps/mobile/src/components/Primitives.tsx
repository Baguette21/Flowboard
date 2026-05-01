import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { AppTheme } from "@/theme/tokens";
import { palette } from "@/theme/tokens";
import type { Tint } from "@/types";

export function Screen({ children, theme }: { children: React.ReactNode; theme: AppTheme }) {
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {children}
      </ScrollView>
    </View>
  );
}

export function Mono({ children, theme, style }: { children: React.ReactNode; theme: AppTheme; style?: object }) {
  return <Text style={[styles.mono, { color: theme.muted }, style]}>{children}</Text>;
}

export function Logo({ theme, size = 38 }: { theme: AppTheme; size?: number }) {
  return (
    <View style={[styles.logoShadow, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Defs>
          <LinearGradient id="ptLogoBg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#1A1A1A" />
            <Stop offset="1" stopColor="#111111" />
          </LinearGradient>
        </Defs>
        <G>
          <Rect x="6" y="6" width="52" height="52" rx="16" fill="url(#ptLogoBg)" />
          <Path d="M 32 48 L 32 20" stroke="#E8E4DD" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Path d="M 32 38 Q 22 42 18 34 Q 24 31 32 34 Z" fill="#E8E4DD" />
          <Path d="M 32 30 Q 42 32 46 24 Q 40 21 32 26 Z" fill="#E8E4DD" />
          <Circle cx="32" cy="18" r="4" fill={palette.accent} />
        </G>
      </Svg>
    </View>
  );
}

export function LogoLockup({ theme, size = 28 }: { theme: AppTheme; size?: number }) {
  return (
    <View style={styles.logoLockup}>
      <Logo theme={theme} size={size} />
      <View>
        <Text style={[styles.logoWordmark, { color: theme.ink, fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.55) }]}>PlanThing</Text>
        <Mono theme={theme} style={styles.logoTagline}>The working garden</Mono>
      </View>
    </View>
  );
}

export function Avatar({ initials = "PT", tint = "amber", size = 34 }: { initials?: string; tint?: Tint; size?: number }) {
  const c = palette.tints[tint];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg }]}>
      <Text style={[styles.avatarText, { color: c.fg, fontSize: Math.max(10, size * 0.34) }]}>{initials}</Text>
    </View>
  );
}

export function IconWell({ label, tint = "red", size = 36 }: { label: string; tint?: Tint; size?: number }) {
  const c = palette.tints[tint];
  return (
    <View style={[styles.iconWell, { width: size, height: size, backgroundColor: c.bg }]}>
      <Text style={[styles.iconWellText, { color: c.fg }]}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function formatDate(ms?: number) {
  if (!ms) return "No date";
  const date = new Date(ms);
  if (date.toDateString() === new Date().toDateString()) return "Today";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 148 },
  mono: { fontSize: 11, lineHeight: 13, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase" },
  logoShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 4 },
  logoLockup: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoWordmark: { fontWeight: "800", letterSpacing: 0 },
  logoTagline: { marginTop: 4 },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.whisper },
  avatarText: { fontWeight: "700" },
  iconWell: { borderRadius: 10, alignItems: "center", justifyContent: "center" },
  iconWellText: { fontWeight: "800", fontSize: 15 },
});
