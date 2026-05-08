import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  LinearTransition,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

const HOLD_MS = 260;
const LAYOUT_TX = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));
const DROP_TIMING = { duration: 180, easing: Easing.out(Easing.cubic) };

type DragState = {
  pointerX: SharedValue<number>;
  pointerY: SharedValue<number>;
  fingerOffsetX: SharedValue<number>;
  fingerOffsetY: SharedValue<number>;
  dragSV: SharedValue<BoardView | null>;
  innerOriginX: SharedValue<number>;
  innerOriginY: SharedValue<number>;
  innerWidth: SharedValue<number>;
  innerHeight: SharedValue<number>;
  liftAmount: SharedValue<number>;
};

export function BoardBottomNav({ active, viewOrder, setScreen, setViewOrder, theme }: { active: BoardView; viewOrder: BoardView[]; setScreen: (screen: ScreenKey) => void; setViewOrder: (order: BoardView[]) => void; theme: AppTheme }) {
  const innerRef = useRef<View | null>(null);
  const [dragView, setDragView] = useState<BoardView | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const fingerOffsetX = useSharedValue(0);
  const fingerOffsetY = useSharedValue(0);
  const dragSV = useSharedValue<BoardView | null>(null);
  const innerOriginX = useSharedValue(0);
  const innerOriginY = useSharedValue(0);
  const innerWidth = useSharedValue(0);
  const innerHeight = useSharedValue(0);
  const liftAmount = useSharedValue(0);

  const itemCount = viewOrder.length;

  const measureInner = useCallback(() => {
    innerRef.current?.measureInWindow((x, y, width, height) => {
      innerOriginX.value = x;
      innerOriginY.value = y;
      innerWidth.value = width;
      innerHeight.value = height;
    });
  }, [innerOriginX, innerOriginY, innerWidth, innerHeight]);

  const targetIdx = useDerivedValue<number>(() => {
    if (!dragSV.value || innerWidth.value === 0) return -1;
    const itemW = innerWidth.value / itemCount;
    const relX = pointerX.value - innerOriginX.value;
    const idx = Math.floor(relX / itemW);
    if (idx < 0) return 0;
    if (idx > itemCount - 1) return itemCount - 1;
    return idx;
  });

  useAnimatedReaction(
    () => targetIdx.value,
    (cur, prev) => {
      if (cur === prev) return;
      runOnJS(setPreviewIdx)(cur < 0 ? null : cur);
    },
  );

  const displayOrder = useMemo(() => {
    if (!dragView || previewIdx == null) return viewOrder;
    const filtered = viewOrder.filter((v) => v !== dragView);
    const target = Math.max(0, Math.min(previewIdx, filtered.length));
    filtered.splice(target, 0, dragView);
    return filtered;
  }, [viewOrder, dragView, previewIdx]);

  const handleDragStart = useCallback((view: BoardView) => {
    setDragView(view);
  }, []);

  const handleCommit = useCallback((view: BoardView, idx: number) => {
    const sourceIdx = viewOrder.indexOf(view);
    if (sourceIdx !== -1 && idx >= 0 && sourceIdx !== idx) {
      const next = viewOrder.filter((v) => v !== view);
      const target = Math.max(0, Math.min(idx, next.length));
      next.splice(target, 0, view);
      setViewOrder(next);
    }
    setDragView(null);
    setPreviewIdx(null);
  }, [viewOrder, setViewOrder]);

  const handleDragCancel = useCallback(() => {
    setDragView(null);
    setPreviewIdx(null);
  }, []);

  const state: DragState = {
    pointerX,
    pointerY,
    fingerOffsetX,
    fingerOffsetY,
    dragSV,
    innerOriginX,
    innerOriginY,
    innerWidth,
    innerHeight,
    liftAmount,
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.bottomNav, { backgroundColor: theme.dark ? "rgba(21,19,15,0.98)" : "rgba(250,247,240,0.98)", borderTopColor: theme.whisper }]}>
      <View ref={innerRef} onLayout={measureInner} style={styles.navInner}>
        {displayOrder.map((view) => {
          const meta = BOARD_VIEW_META[view];
          const isActive = view === active;
          const isDragging = view === dragView;
          return (
            <BoardNavItem
              key={view}
              view={view}
              meta={meta}
              isActive={isActive}
              isDragging={isDragging}
              itemCount={itemCount}
              theme={theme}
              setScreen={setScreen}
              measureInner={measureInner}
              state={state}
              onDragStart={handleDragStart}
              onCommit={handleCommit}
              onCancel={handleDragCancel}
            />
          );
        })}
      </View>
      {dragView ? <FloatingNavClone view={dragView} state={state} itemCount={itemCount} theme={theme} isActive={dragView === active} /> : null}
    </SafeAreaView>
  );
}

function BoardNavItem({
  view,
  meta,
  isActive,
  isDragging,
  itemCount,
  theme,
  setScreen,
  measureInner,
  state,
  onDragStart,
  onCommit,
  onCancel,
}: {
  view: BoardView;
  meta: { label: string; icon: typeof Home };
  isActive: boolean;
  isDragging: boolean;
  itemCount: number;
  theme: AppTheme;
  setScreen: (screen: ScreenKey) => void;
  measureInner: () => void;
  state: DragState;
  onDragStart: (view: BoardView) => void;
  onCommit: (view: BoardView, idx: number) => void;
  onCancel: () => void;
}) {
  const Icon = meta.icon;
  const labelColor = isActive ? theme.ink : theme.subtle;

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(220)
      .onEnd((_e, success) => {
        "worklet";
        if (success) runOnJS(setScreen)(view);
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(HOLD_MS)
      .onTouchesDown(() => {
        "worklet";
        runOnJS(measureInner)();
      })
      .onStart((e) => {
        "worklet";
        state.fingerOffsetX.value = e.x;
        state.fingerOffsetY.value = e.y;
        state.pointerX.value = e.absoluteX;
        state.pointerY.value = e.absoluteY;
        state.dragSV.value = view;
        state.liftAmount.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
        runOnJS(onDragStart)(view);
      })
      .onUpdate((e) => {
        "worklet";
        state.pointerX.value = e.absoluteX;
        state.pointerY.value = e.absoluteY;
      })
      .onEnd(() => {
        "worklet";
        const itemW = state.innerWidth.value / itemCount;
        let idx = -1;
        if (itemW > 0) {
          const relX = state.pointerX.value - state.innerOriginX.value;
          idx = Math.max(0, Math.min(itemCount - 1, Math.floor(relX / itemW)));
        }
        state.dragSV.value = null;
        state.liftAmount.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
        runOnJS(onCommit)(view, idx);
      })
      .onFinalize((_e, success) => {
        "worklet";
        if (state.dragSV.value === view) {
          state.dragSV.value = null;
          state.liftAmount.value = withTiming(0, { duration: 160 });
          if (!success) runOnJS(onCancel)();
        }
      });

    return Gesture.Exclusive(pan, tap);
  }, [view, itemCount, measureInner, setScreen, onDragStart, onCommit, onCancel, state]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={LAYOUT_TX}
        pointerEvents="box-only"
        style={[styles.navItem, { flex: 1 }, isDragging ? styles.hiddenSource : null]}
      >
        {isActive ? <View style={[styles.navActiveDot, { backgroundColor: theme.ink }]} /> : null}
        <Icon size={22} color={labelColor} />
        <Text style={[styles.navLabel, { color: labelColor }]}>{meta.label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

function FloatingNavClone({ view, state, itemCount, theme, isActive }: { view: BoardView; state: DragState; itemCount: number; theme: AppTheme; isActive: boolean }) {
  const meta = BOARD_VIEW_META[view];
  const Icon = meta.icon;

  const animatedStyle = useAnimatedStyle(() => {
    const itemW = state.innerWidth.value > 0 ? state.innerWidth.value / itemCount : 0;
    const cloneTopInInner = state.pointerY.value - state.innerOriginY.value - state.fingerOffsetY.value;
    const cloneLeftInInner = state.pointerX.value - state.innerOriginX.value - state.fingerOffsetX.value;
    const lift = state.liftAmount.value;
    return {
      width: itemW,
      transform: [
        { translateX: cloneLeftInInner },
        { translateY: cloneTopInInner - 12 * lift },
        { scale: 1 + 0.08 * lift },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + 0.18 * state.liftAmount.value,
  }));

  const labelColor = isActive ? theme.ink : theme.subtle;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { left: 0, top: 0 }]}>
      <Animated.View style={[styles.clone, { backgroundColor: theme.dark ? "rgba(21,19,15,0.98)" : "rgba(250,247,240,0.98)", borderColor: theme.whisper }, animatedStyle]}>
        <Animated.View style={[styles.cloneShadow, shadowStyle]} />
        <Icon size={22} color={labelColor} />
        <Text style={[styles.navLabel, { color: labelColor }]}>{meta.label}</Text>
      </Animated.View>
    </View>
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
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 0.5, overflow: "visible" },
  navInner: { height: 58, paddingHorizontal: 8, paddingTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  navItem: { minWidth: 56, height: 48, alignItems: "center", justifyContent: "center", gap: 2 },
  navActiveDot: { position: "absolute", top: 0, width: 22, height: 3, borderRadius: 2 },
  navLabel: { fontSize: 10, lineHeight: 12, fontWeight: "700" },
  primaryNav: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  hiddenSource: { opacity: 0 },
  clone: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 14,
    borderWidth: 0.5,
    shadowColor: "#000",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cloneShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    shadowColor: "#000",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});
