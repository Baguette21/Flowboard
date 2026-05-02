import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowRight, Check, List, Trash2, User } from "lucide-react-native";
import { Alert } from "react-native";

import { TaskCard } from "@/components/Cards";
import { convex } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { palette } from "@/theme/tokens";
import type { AppTheme } from "@/theme/tokens";
import type { MobileCard, MobileData, MobileLabel, ScreenKey } from "@/types";

type Props = {
  visible: boolean;
  card: MobileCard | null;
  labels: MobileLabel[];
  theme: AppTheme;
  onClose: () => void;
  onOpenTask?: (cardId: MobileCard["_id"]) => void;
  onSelectTask?: (cardId: MobileCard["_id"]) => void;
  setScreen?: (screen: ScreenKey) => void;
};

export function TaskActionMenu({ visible, card, labels, theme, onClose, onOpenTask, onSelectTask, setScreen }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      lift.setValue(0.94);
      return;
    }
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }),
    ]).start();
  }, [visible, fade, lift]);

  if (!card) return null;

  async function run(action: "complete" | "delete") {
    if (!card) return;
    try {
      if (action === "complete") await convex.mutation(api.cards.toggleComplete, { cardId: card._id });
      if (action === "delete") await convex.mutation(api.cards.remove, { cardId: card._id });
    } catch (error) {
      Alert.alert("Could not update task", error instanceof Error ? error.message : "Please try again.");
    }
  }

  const items: { label: string; icon: typeof ArrowRight; danger?: boolean; onPress: () => void }[] = [
    { label: "Open task", icon: ArrowRight, onPress: () => { onClose(); onOpenTask?.(card._id); } },
    { label: "Move to...", icon: List, onPress: () => { onSelectTask?.(card._id); onClose(); setScreen?.("boardDrag"); } },
    { label: "Assign someone", icon: User, onPress: () => { onSelectTask?.(card._id); onClose(); setScreen?.("taskAssign"); } },
    { label: "Mark complete", icon: Check, onPress: () => { onClose(); void run("complete"); } },
    { label: "Delete", icon: Trash2, danger: true, onPress: () => { onClose(); void run("delete"); } },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <View pointerEvents="box-none" style={styles.center}>
          <Animated.View style={[styles.card, { transform: [{ scale: lift }] }]}>
            <TaskCard card={card} labels={labels} theme={theme} />
          </Animated.View>
          <Animated.View style={[styles.sheet, { backgroundColor: theme.sheet, borderColor: theme.whisper, transform: [{ scale: lift }] }]}>
            {items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                activeOpacity={0.7}
                style={[styles.row, i === items.length - 1 ? null : { borderBottomColor: theme.whisper, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <item.icon size={18} color={item.danger ? palette.accent : theme.ink} />
                <Text style={[styles.rowLabel, { color: item.danger ? palette.accent : theme.ink }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(10,10,12,0.32)" },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: 26, gap: 22 },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  sheet: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
});
