import React, { useEffect, useMemo, useState } from "react";
import { Alert, Animated, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { generateKeyBetween } from "fractional-indexing";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, List, MoreHorizontal, Plus, Table2, CalendarDays } from "lucide-react-native";
import { api } from "@convex/_generated/api";
import { convex } from "@/lib/convexClient";
import { AppBar } from "@/components/AppBar";
import { Section, TaskCard } from "@/components/Cards";
import { Mono, Screen, formatDate } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import { palette, tintFrom } from "@/theme/tokens";
import type { MobileCard, MobileData, ScreenKey } from "@/types";

export type BoardPrimaryView = "boardSwipe" | "boardList" | "boardCalendar" | "boardTable";

export function BoardSwipeScreen({ data, theme, setScreen, openTask, dragMode = false, viewOrder, setViewOrder }: { data: MobileData; theme: AppTheme; setScreen: (screen: ScreenKey) => void; openTask?: (cardId?: MobileCard["_id"]) => void; dragMode?: boolean; viewOrder: BoardPrimaryView[]; setViewOrder: (order: BoardPrimaryView[]) => void }) {
  const [localCards, setLocalCards] = useState(data.cards);
  const { width } = useWindowDimensions();
  const columnWidth = Math.max(286, width - 52);

  useEffect(() => setLocalCards(data.cards), [data.cards]);

  function cardPan(card: MobileCard, columnIndex: number) {
    const x = new Animated.Value(0);
    const y = new Animated.Value(0);
    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => dragMode,
      onMoveShouldSetPanResponder: () => dragMode,
      onPanResponderMove: Animated.event([null, { dx: x, dy: y }], { useNativeDriver: false }),
      onPanResponderRelease: async (_, gesture) => {
        const offset = Math.round(gesture.dx / Math.max(160, columnWidth * 0.55));
        const targetIndex = Math.max(0, Math.min(data.columns.length - 1, columnIndex + offset));
        const targetColumn = data.columns[targetIndex];
        const targetCards = localCards
          .filter((item) => item.columnId === targetColumn?._id && item._id !== card._id)
          .sort((a, b) => (a.order ?? "").localeCompare(b.order ?? ""));
        const sourceCards = localCards
          .filter((item) => item.columnId === card.columnId)
          .sort((a, b) => (a.order ?? "").localeCompare(b.order ?? ""));
        const sourceIndex = Math.max(0, sourceCards.findIndex((item) => item._id === card._id));
        const baseIndex = targetColumn?._id === card.columnId ? sourceIndex : targetCards.length;
        const approxIndex = Math.max(0, Math.min(targetCards.length, Math.round(gesture.dy / 92) + baseIndex));
        const insertionIndex = Number.isFinite(approxIndex) && approxIndex >= 0 ? approxIndex : targetCards.length;
        const before = insertionIndex > 0 ? targetCards[insertionIndex - 1]?.order ?? null : null;
        const after = insertionIndex < targetCards.length ? targetCards[insertionIndex]?.order ?? null : null;
        const newOrder = generateKeyBetween(before, after);
        x.setValue(0);
        y.setValue(0);
        if (!targetColumn || String(card._id).startsWith("c")) return;
        setLocalCards((cards) => cards.map((item) => item._id === card._id ? { ...item, columnId: targetColumn._id, order: newOrder } : item));
        try {
          await convex.mutation(api.cards.move, { cardId: card._id, targetColumnId: targetColumn._id, newOrder });
        } catch {
          setLocalCards(data.cards);
        }
      },
    });
    return { transform: [{ translateX: x }, { translateY: y }], panHandlers: pan.panHandlers };
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <AppBar title={data.selectedPlan?.name ?? "Board"} subtitle={`${localCards.length} tasks - ${data.columns.length} columns`} theme={theme} back={() => setScreen("homeMixed")} right={<TouchableOpacity onPress={() => setScreen("boardSettings")}><MoreHorizontal size={22} color={theme.ink} /></TouchableOpacity>} />
      <View style={styles.switchOuter}>
        <BoardViewSwitch active="boardSwipe" theme={theme} setScreen={setScreen} viewOrder={viewOrder} setViewOrder={setViewOrder} />
      </View>
      <ScrollView horizontal snapToInterval={columnWidth + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardColumns}>
        {data.columns.map((column, columnIndex) => {
          const columnCards = localCards.filter((card) => card.columnId === column._id).sort((a, b) => (a.order ?? "").localeCompare(b.order ?? ""));
          return (
            <View key={column._id} style={{ width: columnWidth, gap: 10 }}>
              <ColumnHeader column={column} count={columnCards.length} theme={theme} />
              {columnCards.map((card, index) => {
                const pan = cardPan(card, columnIndex);
                return (
                  <Animated.View key={card._id} style={dragMode ? pan.transform : undefined} {...(dragMode ? pan.panHandlers : {})}>
                    <TaskCard card={card} theme={theme} labels={data.labels} dragging={dragMode} onPress={() => openTask?.(card._id)} />
                  </Animated.View>
                );
              })}
              <AddCardInline data={data} columnId={column._id} theme={theme} onCreated={openTask} />
            </View>
          );
        })}
      </ScrollView>
      {dragMode ? <Text style={[styles.dragHint, { color: theme.muted }]}>Drag the lifted card left or right, then release over a target column.</Text> : null}
    </View>
  );
}

type BoardNavProps = {
  setScreen: (screen: ScreenKey) => void;
  openTask?: (cardId?: MobileCard["_id"]) => void;
  viewOrder: BoardPrimaryView[];
  setViewOrder: (order: BoardPrimaryView[]) => void;
};

export function BoardSingleScreen({ data, theme, openTask }: { data: MobileData; theme: AppTheme } & BoardNavProps) {
  const [index, setIndex] = useState(1);
  const column = data.columns[index] ?? data.columns[0];
  const cards = data.cards.filter((card) => card.columnId === column?._id).sort((a, b) => (a.order ?? "").localeCompare(b.order ?? ""));
  return (
    <Screen theme={theme}>
      <View style={styles.singleTop}>
        <Mono theme={theme}>{data.selectedPlan?.name ?? "Board"} - column {index + 1} of {data.columns.length}</Mono>
        <View style={styles.columnSwitcher}>
          <TouchableOpacity onPress={() => setIndex(Math.max(0, index - 1))} style={[styles.switchButton, { backgroundColor: theme.panel }]}><ChevronLeft size={18} color={theme.muted} /></TouchableOpacity>
          <Text style={[styles.singleColumnTitle, { color: theme.ink }]}>{column?.title ?? "Column"}</Text>
          <TouchableOpacity onPress={() => setIndex(Math.min(data.columns.length - 1, index + 1))} style={[styles.switchButton, { backgroundColor: theme.ink }]}><ChevronRight size={18} color={theme.bg} /></TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>{cards.map((card) => <TaskCard key={card._id} card={card} labels={data.labels} theme={theme} onPress={() => openTask?.(card._id)} />)}</View>
    </Screen>
  );
}

export function BoardStackedScreen({ data, theme, setScreen, openTask }: { data: MobileData; theme: AppTheme } & BoardNavProps) {
  return (
    <Screen theme={theme}>
      <AppBar title={data.selectedPlan?.name ?? "Board"} subtitle="All columns stacked" theme={theme} back={() => setScreen("boardSwipe")} right={<MoreHorizontal color={theme.ink} />} />
      <View style={styles.content}>
        {data.columns.map((column) => {
          const cards = data.cards.filter((card) => card.columnId === column._id).sort((a, b) => (a.order ?? "").localeCompare(b.order ?? ""));
          return <View key={column._id} style={styles.stack}><ColumnHeader column={column} count={cards.length} theme={theme} />{cards.map((card) => <TaskCard key={card._id} card={card} labels={data.labels} theme={theme} onPress={() => openTask?.(card._id)} />)}</View>;
        })}
      </View>
    </Screen>
  );
}

export function BoardLongPressScreen({ data, theme, setScreen, viewOrder, setViewOrder }: { data: MobileData; theme: AppTheme; setScreen: (screen: ScreenKey) => void; viewOrder: BoardPrimaryView[]; setViewOrder: (order: BoardPrimaryView[]) => void }) {
  const card = data.cards[0];
  async function run(label: string) {
    if (!card) return;
    try {
      if (label === "Mark complete") await convex.mutation(api.cards.toggleComplete, { cardId: card._id });
      if (label === "Delete") await convex.mutation(api.cards.remove, { cardId: card._id });
      setScreen("boardSwipe");
    } catch (error) {
      Alert.alert("Could not update task", error instanceof Error ? error.message : "Please try again.");
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <BoardSwipeScreen data={data} theme={theme} setScreen={setScreen} viewOrder={viewOrder} setViewOrder={setViewOrder} />
      <View style={styles.overlay} />
      {card ? <View style={[styles.contextCard, { backgroundColor: theme.sheet }]}><TaskCard card={card} labels={data.labels} theme={theme} dragging /></View> : null}
      <View style={[styles.contextMenu, { backgroundColor: theme.sheet, borderColor: theme.whisper }]}>
        {[["Open task", "taskFull"], ["Move to...", "boardDrag"], ["Assign someone", "taskAssign"], ["Mark complete", "boardSwipe"], ["Delete", "boardSwipe"]].map(([label, screen]) => (
          <TouchableOpacity key={label} onPress={() => label === "Mark complete" || label === "Delete" ? void run(label) : setScreen(screen as ScreenKey)} style={[styles.menuRow, { borderBottomColor: theme.whisper }]}>
            <Text style={[styles.menuRowText, { color: label === "Delete" ? palette.accent : theme.ink }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function BoardListScreen({ data, theme, setScreen, openTask, viewOrder, setViewOrder }: { data: MobileData; theme: AppTheme } & BoardNavProps) {
  return (
    <Screen theme={theme}>
      <AppBar title="List view" subtitle={data.selectedPlan?.name ?? ""} theme={theme} back={() => setScreen("boardSwipe")} right={<List color={theme.ink} />} />
      <View style={styles.content}>
        <BoardViewSwitch active="boardList" theme={theme} setScreen={setScreen} viewOrder={viewOrder} setViewOrder={setViewOrder} />
        {data.columns.map((column) => {
          const cards = data.cards.filter((card) => card.columnId === column._id);
          return <View key={column._id}><Section theme={theme} label={column.title} count={cards.length} />{cards.map((card) => <TouchableOpacity key={card._id} onPress={() => openTask?.(card._id)} style={[styles.listRow, { borderBottomColor: theme.whisper }]}><Check size={16} color={card.isComplete ? palette.tints.green.fg : theme.subtle} /><Text style={[styles.listRowTitle, { color: theme.ink }]}>{card.title}</Text><Text style={[styles.listRowDate, { color: theme.subtle }]}>{formatDate(card.dueDate)}</Text></TouchableOpacity>)}</View>;
        })}
      </View>
    </Screen>
  );
}

export function BoardCalendarScreen({ data, theme, setScreen, openTask, viewOrder, setViewOrder }: { data: MobileData; theme: AppTheme } & BoardNavProps) {
  const [selectedDate, setSelectedDate] = useState(startOfDay(Date.now()));
  const [monthCursor, setMonthCursor] = useState(startOfMonth(Date.now()));
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const firstColumn = data.columns[0];
  const days = useMemo(() => calendarDays(monthCursor), [monthCursor]);
  const calendarRows = useMemo(() => chunkDays(days), [days]);
  const selectedCards = data.cards.filter((card) => isSameDay(card.dueDate, selectedDate));
  const monthLabel = new Date(monthCursor).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedLabel = new Date(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  async function createDatedTask() {
    const cleanTitle = title.trim();
    if (!cleanTitle || !data.selectedPlan || !firstColumn) {
      Alert.alert("Task needs a title", data.selectedPlan && firstColumn ? "Name the task first." : "Open a plan before adding a task.");
      return;
    }
    try {
      setBusy(true);
      const cardId = await convex.mutation(api.cards.create, {
        planId: data.selectedPlan._id,
        columnId: firstColumn._id,
        title: cleanTitle,
        priority: "medium",
        dueDate: selectedDate,
      });
      setTitle("");
      openTask?.(cardId);
    } catch (error) {
      Alert.alert("Could not create task", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen theme={theme}>
      <AppBar title="Calendar" subtitle={data.selectedPlan?.name ?? monthLabel} theme={theme} back={() => setScreen("boardSwipe")} right={<CalendarDays color={theme.ink} />} />
      <View style={styles.content}>
        <BoardViewSwitch active="boardCalendar" theme={theme} setScreen={setScreen} viewOrder={viewOrder} setViewOrder={setViewOrder} />
        <View style={[styles.calendarHero, { backgroundColor: theme.sheet, borderColor: theme.whisper }]}>
          <View style={styles.calendarHeroTop}>
            <TouchableOpacity onPress={() => setMonthCursor(addMonths(monthCursor, -1))} style={[styles.switchButton, { backgroundColor: theme.panel }]}><ChevronLeft size={18} color={theme.ink} /></TouchableOpacity>
            <View style={styles.calendarTitleWrap}>
              <Text style={[styles.calendarTitle, { color: theme.ink }]}>{monthLabel}</Text>
              <Text style={[styles.calendarSubtitle, { color: theme.muted }]}>{selectedLabel}</Text>
            </View>
            <TouchableOpacity onPress={() => setMonthCursor(addMonths(monthCursor, 1))} style={[styles.switchButton, { backgroundColor: theme.ink }]}><ChevronRight size={18} color={theme.bg} /></TouchableOpacity>
          </View>
          <View style={styles.weekHeader}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <Text key={day} style={[styles.weekLabel, { color: theme.subtle }]}>{day}</Text>)}</View>
          <View style={styles.calendarGridLarge}>
            {calendarRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.calendarWeekRow}>
                {row.map((day) => {
                  const count = data.cards.filter((card) => isSameDay(card.dueDate, day.time)).length;
                  const selected = isSameDay(day.time, selectedDate);
                  return (
                    <TouchableOpacity key={day.time} onPress={() => setSelectedDate(day.time)} style={[styles.calendarDayLarge, { backgroundColor: selected ? theme.ink : day.inMonth ? theme.panel : theme.bg, borderColor: selected ? theme.ink : theme.whisper, opacity: day.inMonth ? 1 : 0.46 }]}>
                      <Text style={[styles.calendarDayLargeText, { color: selected ? theme.bg : theme.ink }]}>{day.date}</Text>
                      {count > 0 ? <Text style={[styles.calendarCount, { color: selected ? theme.bg : palette.accent }]}>{count}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.addForDate, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={data.selectedPlan && firstColumn ? `Add task for ${new Date(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Open a plan to add dated tasks"}
            placeholderTextColor={theme.subtle}
            editable={Boolean(data.selectedPlan && firstColumn)}
            style={[styles.addForDateInput, { color: theme.ink }]}
          />
          <TouchableOpacity disabled={busy} onPress={createDatedTask} style={[styles.addForDateButton, { backgroundColor: theme.ink, opacity: busy ? 0.62 : 1 }]}><Plus size={18} color={theme.bg} /></TouchableOpacity>
        </View>

        <Section theme={theme} label={selectedLabel} count={selectedCards.length} />
        {selectedCards.length ? selectedCards.map((card) => <TaskCard key={card._id} card={card} labels={data.labels} theme={theme} onPress={() => openTask?.(card._id)} />) : <Text style={[styles.emptyCalendarText, { color: theme.muted }]}>No tasks due on this date. Add one above to plan it.</Text>}
      </View>
    </Screen>
  );
}

export function BoardTableScreen({ data, theme, setScreen, openTask, viewOrder, setViewOrder }: { data: MobileData; theme: AppTheme } & BoardNavProps) {
  return (
    <Screen theme={theme}>
      <AppBar title="Table view" subtitle="Sticky title column" theme={theme} back={() => setScreen("boardSwipe")} right={<Table2 color={theme.ink} />} />
      <View style={styles.content}>
        <BoardViewSwitch active="boardTable" theme={theme} setScreen={setScreen} viewOrder={viewOrder} setViewOrder={setViewOrder} />
        <View style={[styles.tableHeader, { backgroundColor: theme.panel }]}><Mono theme={theme} style={styles.tableTitleCell}>Task</Mono><Mono theme={theme}>Status</Mono><Mono theme={theme}>Due</Mono></View>
        {data.cards.map((card) => <TouchableOpacity key={card._id} onPress={() => openTask?.(card._id)} style={[styles.tableRow, { borderBottomColor: theme.whisper }]}><Text numberOfLines={2} style={[styles.tableTitleCell, styles.tableText, { color: theme.ink }]}>{card.title}</Text><Text style={[styles.tableText, { color: theme.muted }]}>{card.isComplete ? "Done" : "Open"}</Text><Text style={[styles.tableText, { color: theme.muted }]}>{formatDate(card.dueDate)}</Text></TouchableOpacity>)}
      </View>
    </Screen>
  );
}

function BoardViewSwitch({ active, theme, setScreen, viewOrder, setViewOrder }: { active: BoardPrimaryView; theme: AppTheme; setScreen: (screen: ScreenKey) => void; viewOrder: BoardPrimaryView[]; setViewOrder: (order: BoardPrimaryView[]) => void }) {
  const [movedView, setMovedView] = useState<BoardPrimaryView | null>(null);

  function reorder(target: BoardPrimaryView) {
    const index = viewOrder.indexOf(target);
    if (index <= 0) return;
    const next = [...viewOrder];
    const previous = next[index - 1];
    next[index - 1] = target;
    next[index] = previous;
    setViewOrder(next);
    setMovedView(target);
    setTimeout(() => setMovedView(null), 1300);
  }

  return (
    <View style={styles.segmentedWrap}>
      <View style={[styles.segmentedSwitch, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
        {viewOrder.map((target) => {
          const selected = target === active;
          const moved = target === movedView;
          const Icon = viewMeta[target].icon;
          return (
            <TouchableOpacity
              key={target}
              activeOpacity={0.72}
              onPress={() => setScreen(target)}
              onLongPress={() => reorder(target)}
              delayLongPress={280}
              style={[styles.segmentedItem, selected ? { backgroundColor: theme.sheet, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 } : null, moved ? { borderColor: theme.ink, borderWidth: 1 } : null]}
            >
              <Icon size={15} color={selected || moved ? theme.ink : theme.muted} />
              <Text numberOfLines={1} style={[styles.segmentedText, { color: selected || moved ? theme.ink : theme.muted }]}>{viewMeta[target].label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const viewMeta: Record<BoardPrimaryView, { label: string; icon: typeof LayoutGrid }> = {
  boardSwipe: { label: "Board", icon: LayoutGrid },
  boardList: { label: "List", icon: List },
  boardCalendar: { label: "Calendar", icon: CalendarDays },
  boardTable: { label: "Table", icon: Table2 },
};

function ColumnHeader({ column, count, theme }: { column: MobileData["columns"][number]; count: number; theme: AppTheme }) {
  const tint = tintFrom(column.color, column.title === "In progress" ? "amber" : "ink");
  return (
    <View style={styles.columnHeader}>
      <View style={styles.columnTitle}><View style={[styles.columnDot, { backgroundColor: palette.tints[tint].fg }]} /><Text style={[styles.columnName, { color: theme.ink }]}>{column.title}</Text><Mono theme={theme} style={{ color: theme.subtle }}>{count}</Mono></View>
      <MoreHorizontal size={17} color={theme.ink} />
    </View>
  );
}

function AddCardInline({ data, columnId, theme, onCreated }: { data: MobileData; columnId: MobileData["columns"][number]["_id"]; theme: AppTheme; onCreated?: (cardId?: MobileCard["_id"]) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function createCard() {
    const cleanTitle = title.trim();
    if (!cleanTitle || !data.selectedPlan) {
      Alert.alert("Task needs a title", data.selectedPlan ? "Name the task first." : "Open a plan before adding a task.");
      return;
    }
    try {
      setBusy(true);
      const cardId = await convex.mutation(api.cards.create, { planId: data.selectedPlan._id, columnId, title: cleanTitle, priority: "medium" });
      setTitle("");
      setOpen(false);
      onCreated?.(cardId);
    } catch (error) {
      Alert.alert("Could not create task", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <TouchableOpacity onPress={() => setOpen(true)} style={[styles.addCard, { borderColor: theme.whisperStrong }]}><Text style={[styles.addCardText, { color: theme.muted }]}>+ Add card</Text></TouchableOpacity>;
  }

  return (
    <View style={[styles.addCardPanel, { backgroundColor: theme.sheet, borderColor: theme.whisper }]}>
      <TextInput autoFocus value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor={theme.subtle} style={[styles.addCardInput, { color: theme.ink, borderBottomColor: theme.whisper }]} />
      <View style={styles.addCardActions}>
        <TouchableOpacity onPress={() => setOpen(false)}><Text style={[styles.addCardText, { color: theme.muted }]}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={createCard} style={[styles.addCardButton, { backgroundColor: theme.ink, opacity: busy ? 0.62 : 1 }]}><Text style={[styles.addCardButtonText, { color: theme.bg }]}>{busy ? "Adding" : "Add"}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function startOfDay(value: number) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function startOfMonth(value: number) {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function addMonths(value: number, months: number) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return startOfMonth(date.getTime());
}

function isSameDay(a: number | undefined, b: number) {
  if (!a) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function calendarDays(month: number) {
  const first = new Date(month);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    date.setHours(12, 0, 0, 0);
    return { time: date.getTime(), date: date.getDate(), inMonth: date.getMonth() === first.getMonth() };
  });
}

function chunkDays(days: ReturnType<typeof calendarDays>) {
  const rows: Array<typeof days> = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }
  return rows;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 10, gap: 18, paddingBottom: 118 },
  stack: { gap: 10 },
  switchOuter: { paddingHorizontal: 18 },
  segmentedWrap: { marginBottom: 8 },
  segmentedSwitch: { minHeight: 52, borderRadius: 14, borderWidth: 1, padding: 4, flexDirection: "row", alignItems: "center", gap: 3 },
  segmentedItem: { flex: 1, minHeight: 42, borderRadius: 11, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: "transparent" },
  segmentedText: { fontSize: 12, lineHeight: 15, fontWeight: "800" },
  boardColumns: { paddingHorizontal: 18, paddingTop: 4, gap: 12, paddingBottom: 126 },
  columnHeader: { paddingHorizontal: 4, paddingVertical: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  columnTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnName: { fontSize: 14, fontWeight: "800" },
  addCard: { height: 40, borderWidth: 1, borderStyle: "dashed", borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addCardText: { fontSize: 13, fontWeight: "700" },
  addCardPanel: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  addCardInput: { minHeight: 40, borderBottomWidth: 1, fontSize: 15, fontWeight: "700" },
  addCardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addCardButton: { height: 34, borderRadius: 11, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  addCardButtonText: { fontSize: 13, fontWeight: "800" },
  dragHint: { textAlign: "center", marginTop: 12, fontSize: 12, fontWeight: "600" },
  singleTop: { paddingHorizontal: 18, paddingTop: 18, gap: 12 },
  columnSwitcher: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchButton: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  singleColumnTitle: { flex: 1, textAlign: "center", fontSize: 26, lineHeight: 30, fontWeight: "800" },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.44)" },
  contextCard: { position: "absolute", top: 170, left: 30, right: 30, padding: 12, borderRadius: 14 },
  contextMenu: { position: "absolute", top: 364, left: 30, right: 30, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuRow: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  menuRowText: { fontSize: 15, fontWeight: "700" },
  listRow: { minHeight: 48, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  listRowTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  listRowDate: { fontSize: 12, fontWeight: "600" },
  calendarHero: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 14 },
  calendarHeroTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  calendarTitleWrap: { flex: 1, alignItems: "center" },
  calendarTitle: { fontSize: 22, lineHeight: 26, fontWeight: "800" },
  calendarSubtitle: { fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 3 },
  weekHeader: { flexDirection: "row", gap: 5 },
  weekLabel: { flex: 1, textAlign: "center", fontSize: 10, lineHeight: 12, fontWeight: "800", textTransform: "uppercase" },
  calendarGridLarge: { gap: 5 },
  calendarWeekRow: { flexDirection: "row", gap: 5 },
  calendarDayLarge: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, padding: 7, justifyContent: "space-between" },
  calendarDayLargeText: { fontSize: 14, lineHeight: 17, fontWeight: "800" },
  calendarCount: { fontSize: 11, lineHeight: 13, fontWeight: "900" },
  addForDate: { minHeight: 58, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  addForDateInput: { flex: 1, minHeight: 46, fontSize: 15, fontWeight: "700" },
  addForDateButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyCalendarText: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  tableHeader: { height: 36, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  tableRow: { minHeight: 54, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 },
  tableTitleCell: { flex: 1.4 },
  tableText: { flex: 1, fontSize: 12, fontWeight: "600" },
});
