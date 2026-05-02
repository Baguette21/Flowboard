import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  LinearTransition,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const CARD_GAP = 10;
const HOLD_MS = 260;
const SCROLL_EDGE = 70;
const SCROLL_SPEED_MAX = 14;
const TIMING = { duration: 200, easing: Easing.out(Easing.cubic) };
const LAYOUT_TX = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));

type Layout = { x: number; y: number; width: number; height: number };

type Props<C, K> = {
  columns: C[];
  cards: K[];
  getColumnId: (col: C) => string;
  getCardId: (card: K) => string;
  getCardColumnId: (card: K) => string;
  getCardOrder: (card: K) => string;
  columnWidth: number;
  renderColumnHeader: (col: C) => React.ReactNode;
  renderColumnFooter?: (col: C) => React.ReactNode;
  renderCard: (card: K) => React.ReactNode;
  onMove: (cardId: string, targetColumnId: string, targetIndex: number) => void;
  onCardPress?: (cardId: string) => void;
  isCardDraggable?: (card: K) => boolean;
  contentContainerStyle?: any;
  placeholderStyle?: any;
};

type DragState<K> = {
  cardId: string;
  sourceCol: string;
  card: K;
  width: number;
  height: number;
};

export function KanbanBoard<C, K>({
  columns,
  cards,
  getColumnId,
  getCardId,
  getCardColumnId,
  getCardOrder,
  columnWidth,
  renderColumnHeader,
  renderColumnFooter,
  renderCard,
  onMove,
  onCardPress,
  isCardDraggable,
  contentContainerStyle,
  placeholderStyle,
}: Props<C, K>) {
  const cardsByColumn = useMemo(() => {
    const map: Record<string, K[]> = {};
    for (const col of columns) map[getColumnId(col)] = [];
    for (const card of cards) {
      const cid = getCardColumnId(card);
      (map[cid] ??= []).push(card);
    }
    for (const k in map) map[k].sort((a, b) => getCardOrder(a).localeCompare(getCardOrder(b)));
    return map;
  }, [cards, columns, getColumnId, getCardColumnId, getCardOrder]);

  const cardRefs = useRef(new Map<string, View>());
  const colRefs = useRef(new Map<string, View>());
  const boardRef = useRef<View | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollX = useRef(0);

  const [drag, setDrag] = useState<DragState<K> | null>(null);
  const [preview, setPreview] = useState<{ col: string; idx: number } | null>(null);

  const dragCardId = useSharedValue<string | null>(null);
  const fingerOffsetX = useSharedValue(0);
  const fingerOffsetY = useSharedValue(0);
  const cardOriginX = useSharedValue(0);
  const cardOriginY = useSharedValue(0);
  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const boardOriginX = useSharedValue(0);
  const boardOriginY = useSharedValue(0);
  const dragHeightSV = useSharedValue(0);

  const colLayouts = useSharedValue<Record<string, Layout>>({});
  const cardLayouts = useSharedValue<Record<string, Layout>>({});
  const orderByCol = useSharedValue<Record<string, string[]>>({});

  useEffect(() => {
    const next: Record<string, string[]> = {};
    for (const k in cardsByColumn) next[k] = cardsByColumn[k].map((c) => getCardId(c));
    orderByCol.value = next;
  }, [cardsByColumn, getCardId, orderByCol]);

  const measureColumns = useCallback(() => {
    colRefs.current.forEach((view, id) => {
      view.measureInWindow((x, y, width, height) => {
        if (!width && !height) return;
        const next = { ...colLayouts.value };
        next[id] = { x, y, width, height };
        colLayouts.value = next;
      });
    });
  }, [colLayouts]);

  const measureCards = useCallback(() => {
    cardRefs.current.forEach((view, id) => {
      view.measureInWindow((x, y, width, height) => {
        if (!width && !height) return;
        const next = { ...cardLayouts.value };
        next[id] = { x, y, width, height };
        cardLayouts.value = next;
      });
    });
  }, [cardLayouts]);

  const measureAll = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      boardOriginX.value = x;
      boardOriginY.value = y;
    });
    measureColumns();
    measureCards();
  }, [boardOriginX, boardOriginY, measureColumns, measureCards]);

  const target = useDerivedValue<{ col: string; idx: number } | null>(() => {
    if (!dragCardId.value) return null;
    const cols = colLayouts.value;
    const layouts = cardLayouts.value;
    const cardCenterY = pointerY.value + (dragHeightSV.value / 2 - fingerOffsetY.value);
    let tCol: string | null = null;
    for (const id in cols) {
      const c = cols[id];
      if (pointerX.value >= c.x && pointerX.value <= c.x + c.width) {
        tCol = id;
        break;
      }
    }
    if (!tCol) return null;
    const ids = orderByCol.value[tCol] ?? [];
    let counted = 0;
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] === dragCardId.value) continue;
      const l = layouts[ids[i]];
      if (!l) {
        counted++;
        continue;
      }
      const center = l.y + l.height / 2;
      if (cardCenterY < center) return { col: tCol, idx: counted };
      counted++;
    }
    return { col: tCol, idx: counted };
  });

  useAnimatedReaction(
    () => target.value,
    (cur, prev) => {
      if (!cur) {
        if (prev) runOnJS(setPreview)(null);
        return;
      }
      if (!prev || prev.col !== cur.col || prev.idx !== cur.idx) {
        runOnJS(setPreview)({ col: cur.col, idx: cur.idx });
      }
    },
  );

  const displayByColumn = useMemo(() => {
    const map: Record<string, Array<{ type: "card"; card: K } | { type: "placeholder" }>> = {};
    for (const col of columns) {
      const colId = getColumnId(col);
      const original = cardsByColumn[colId] ?? [];
      const items: Array<{ type: "card"; card: K } | { type: "placeholder" }> = [];
      for (const c of original) {
        items.push({ type: "card", card: c });
      }
      if (drag && preview && preview.col === colId) {
        const idx = Math.max(0, Math.min(preview.idx, items.length));
        items.splice(idx, 0, { type: "placeholder" });
      }
      map[colId] = items;
    }
    return map;
  }, [cardsByColumn, columns, getColumnId, getCardId, drag, preview]);

  useEffect(() => {
    if (!drag) return;
    let raf = 0;
    const screenW = Dimensions.get("window").width;
    const tick = () => {
      const px = pointerX.value;
      let dx = 0;
      if (px < SCROLL_EDGE) {
        const intensity = Math.min(1, (SCROLL_EDGE - px) / SCROLL_EDGE);
        dx = -SCROLL_SPEED_MAX * intensity;
      } else if (px > screenW - SCROLL_EDGE) {
        const intensity = Math.min(1, (px - (screenW - SCROLL_EDGE)) / SCROLL_EDGE);
        dx = SCROLL_SPEED_MAX * intensity;
      }
      if (dx !== 0) {
        scrollX.current = Math.max(0, scrollX.current + dx);
        scrollViewRef.current?.scrollTo({ x: scrollX.current, animated: false });
        measureColumns();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drag, pointerX, measureColumns]);

  const handleScroll = useCallback((e: any) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    measureColumns();
  }, [measureColumns]);

  const handleDragStart = useCallback((info: DragState<K>) => {
    setDrag(info);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDrag(null);
    setPreview(null);
  }, []);

  const sharedState = {
    dragCardId,
    fingerOffsetX,
    fingerOffsetY,
    cardOriginX,
    cardOriginY,
    pointerX,
    pointerY,
    boardOriginX,
    boardOriginY,
    dragHeightSV,
    cardLayouts,
    colLayouts,
    orderByCol,
    target,
  };

  return (
    <View
      ref={boardRef}
      onLayout={measureAll}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={(e) => {
          handleScroll(e);
          measureAll();
        }}
        onScrollEndDrag={(e) => {
          handleScroll(e);
          measureAll();
        }}
        scrollEventThrottle={16}
        scrollEnabled={!drag}
        contentContainerStyle={[styles.row, contentContainerStyle]}
      >
        {columns.map((col) => {
          const colId = getColumnId(col);
          const items = displayByColumn[colId] ?? [];
          return (
            <View
              key={colId}
              ref={(v) => {
                if (v) colRefs.current.set(colId, v as unknown as View);
                else colRefs.current.delete(colId);
              }}
              onLayout={measureAll}
              style={{ width: columnWidth, gap: CARD_GAP }}
            >
              {renderColumnHeader(col)}
              {items.map((item) => {
                if (item.type === "placeholder") {
                  return (
                    <Animated.View
                      key="__placeholder__"
                      layout={LAYOUT_TX}
                      style={[
                        styles.placeholder,
                        { height: drag?.height ?? 80 },
                        placeholderStyle,
                      ]}
                    />
                  );
                }
                const card = item.card;
                const cardId = getCardId(card);
                const draggable = isCardDraggable ? isCardDraggable(card) : true;
                return (
                  <CardItem
                    key={cardId}
                    cardId={cardId}
                    card={card}
                    columnId={colId}
                    cardRefs={cardRefs}
                    measureAll={measureAll}
                    state={sharedState}
                    onCommit={onMove}
                    onPress={onCardPress}
                    draggable={draggable}
                    dragging={drag?.cardId === cardId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    {renderCard(card)}
                  </CardItem>
                );
              })}
              {renderColumnFooter?.(col)}
            </View>
          );
        })}
      </ScrollView>

      {drag ? <FloatingClone state={sharedState} drag={drag} renderCard={renderCard} /> : null}
    </View>
  );
}

function FloatingClone<K>({
  state,
  drag,
  renderCard,
}: {
  state: any;
  drag: DragState<K>;
  renderCard: (card: K) => React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: state.pointerX.value - state.fingerOffsetX.value - state.boardOriginX.value },
        { translateY: state.pointerY.value - state.fingerOffsetY.value - state.boardOriginY.value },
      ],
    };
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.clone,
          { width: drag.width, position: "absolute", top: 0, left: 0 },
          animatedStyle,
        ]}
      >
        {renderCard(drag.card)}
      </Animated.View>
    </View>
  );
}

type CardItemProps<K> = {
  cardId: string;
  card: K;
  columnId: string;
  cardRefs: React.MutableRefObject<Map<string, View>>;
  measureAll: () => void;
  state: any;
  onCommit: (cardId: string, targetColumnId: string, targetIndex: number) => void;
  onPress?: (cardId: string) => void;
  draggable: boolean;
  dragging: boolean;
  onDragStart: (info: DragState<K>) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
};

function CardItem<K>({
  cardId,
  card,
  columnId,
  cardRefs,
  measureAll,
  state,
  onCommit,
  onPress,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  children,
}: CardItemProps<K>) {
  const setRef = useCallback(
    (v: View | null) => {
      if (v) cardRefs.current.set(cardId, v);
      else cardRefs.current.delete(cardId);
    },
    [cardId, cardRefs],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(220)
        .onEnd((_e, success) => {
          "worklet";
          if (!success) return;
          if (onPress) runOnJS(onPress)(cardId);
        }),
    [cardId, onPress],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(HOLD_MS)
        .enabled(draggable)
        .onTouchesDown(() => {
          "worklet";
          runOnJS(measureAll)();
        })
        .onStart((e) => {
          "worklet";
          const layout = state.cardLayouts.value[cardId];
          if (!layout) return;
          state.fingerOffsetX.value = e.absoluteX - layout.x;
          state.fingerOffsetY.value = e.absoluteY - layout.y;
          state.cardOriginX.value = layout.x;
          state.cardOriginY.value = layout.y;
          state.dragHeightSV.value = layout.height;
          state.pointerX.value = e.absoluteX;
          state.pointerY.value = e.absoluteY;
          state.dragCardId.value = cardId;
          runOnJS(onDragStart)({
            cardId,
            sourceCol: columnId,
            card,
            width: layout.width,
            height: layout.height,
          });
        })
        .onUpdate((e) => {
          "worklet";
          state.pointerX.value = e.absoluteX;
          state.pointerY.value = e.absoluteY;
        })
        .onEnd(() => {
          "worklet";
          const t = state.target.value;
          const id = cardId;
          if (!t) {
            const destX = state.cardOriginX.value + state.fingerOffsetX.value;
            const destY = state.cardOriginY.value + state.fingerOffsetY.value;
            state.pointerX.value = withTiming(destX, TIMING);
            state.pointerY.value = withTiming(destY, TIMING);
            state.dragCardId.value = null;
            runOnJS(onDragEnd)();
            return;
          }
          const cols = state.colLayouts.value;
          const layouts = state.cardLayouts.value;
          const ids = state.orderByCol.value[t.col] ?? [];
          const colLayout = cols[t.col];
          let destX = colLayout ? colLayout.x : state.cardOriginX.value;
          let destY = colLayout ? colLayout.y : state.cardOriginY.value;
          let counted = 0;
          let placed = false;
          let lastBottom = colLayout ? colLayout.y : state.cardOriginY.value;
          for (let i = 0; i < ids.length; i++) {
            if (ids[i] === id) continue;
            const l = layouts[ids[i]];
            if (!l) {
              counted++;
              continue;
            }
            if (counted === t.idx) {
              destX = l.x;
              destY = l.y;
              placed = true;
              break;
            }
            lastBottom = l.y + l.height + CARD_GAP;
            destX = l.x;
            counted++;
          }
          if (!placed) destY = lastBottom;
          const finalPointerX = destX + state.fingerOffsetX.value;
          const finalPointerY = destY + state.fingerOffsetY.value;
          state.pointerX.value = withTiming(finalPointerX, TIMING);
          state.pointerY.value = withTiming(finalPointerY, TIMING);
          runOnJS(onCommit)(id, t.col, t.idx);
          state.dragCardId.value = null;
          runOnJS(onDragEnd)();
        })
        .onFinalize((_e, success) => {
          "worklet";
          if (!success && state.dragCardId.value === cardId) {
            state.dragCardId.value = null;
            runOnJS(onDragEnd)();
          }
        }),
    [cardId, columnId, card, draggable, measureAll, onCommit, onDragStart, onDragEnd, state],
  );

  const composed = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        ref={setRef as any}
        onLayout={measureAll}
        layout={LAYOUT_TX}
        style={dragging ? styles.hiddenDragSource : null}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 126 },
  placeholder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.28)",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  clone: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  hiddenDragSource: {
    opacity: 0,
  },
});
