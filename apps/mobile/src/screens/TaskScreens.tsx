import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { CalendarDays, Check, MoreHorizontal, Pencil, Plus, Trash2, User, X } from "lucide-react-native";

let DateTimePicker: React.ComponentType<any> | null = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
  DateTimePicker = null;
}
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { TaskCard } from "@/components/Cards";
import { Avatar, Mono, Screen, formatDate } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import { palette } from "@/theme/tokens";
import type { MobileCard, MobileData, ScreenKey } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import { RichText } from "@/components/RichText";
import { RichEditor } from "@/components/RichEditor";

export function TaskSheetScreen({ data, theme, selectedCardId }: { data: MobileData; theme: AppTheme; selectedCardId?: Id<"cards"> }) {
  const card = selectedCard(data, selectedCardId);
  if (!card) return <EmptyTask theme={theme} />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.sheetScrim} />
      <View style={[styles.taskSheet, { backgroundColor: theme.sheet }]}>
        <TaskDetail card={card} data={data} theme={theme} compact />
      </View>
    </View>
  );
}

export function TaskFullScreen({ data, theme, selectedCardId, setScreen, backScreen }: { data: MobileData; theme: AppTheme; selectedCardId?: Id<"cards">; setScreen: (screen: ScreenKey) => void; backScreen: ScreenKey }) {
  const card = selectedCard(data, selectedCardId);
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);
  if (!card) return <EmptyTask theme={theme} />;
  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY }], opacity }}>
      <Screen theme={theme}>
        <AppBar theme={theme} back={() => setScreen(backScreen)} right={<MoreHorizontal color={theme.ink} />} />
        <View style={styles.content}><EditableTaskDetail card={card} data={data} theme={theme} /></View>
      </Screen>
    </Animated.View>
  );
}

export function TaskAssignScreen({ data, theme, selectedCardId }: { data: MobileData; theme: AppTheme; selectedCardId?: Id<"cards"> }) {
  const card = selectedCard(data, selectedCardId);
  if (!card) return <EmptyTask theme={theme} />;
  return (
    <Screen theme={theme}>
      <AppBar title="Assign" subtitle="Choose task owners" theme={theme} right={<User color={theme.ink} />} />
      <View style={styles.content}>
        <TaskDetail card={card} data={data} theme={theme} compact />
        {(data.members.length ? data.members : [{ _id: "preview", name: "Project owner", email: null, initials: "PO", canBeAssigned: false }]).map((member, index) => (
          <View key={member._id} style={[styles.assignRow, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
            <Avatar initials={member.initials} tint={(["amber", "green", "blue", "ink"] as const)[index % 4]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.ink }]}>{member.name ?? member.email ?? "Workspace member"}</Text>
              <Text style={[styles.rowMeta, { color: theme.subtle }]}>{member.canBeAssigned === false ? "Cannot be assigned by members" : "Can be assigned"}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function TaskDetail({ card, data, theme, compact }: { card: MobileCard; data: MobileData; theme: AppTheme; compact?: boolean }) {
  return (
    <View style={styles.taskDetail}>
      <View style={[styles.sheetHandle, { backgroundColor: theme.whisperStrong }]} />
      <Mono theme={theme}>{data.selectedPlan?.name ?? "Launch Plan"}</Mono>
      <Text style={[styles.taskDetailTitle, { color: theme.ink }]}>{card.title}</Text>
      <TaskCard card={card} labels={data.labels} theme={theme} />
      <Property label="Status" value={card.isComplete ? "Done" : "In progress"} theme={theme} />
      <Property label="Due" value={formatDate(card.dueDate)} theme={theme} />
      <Property label="Priority" value={card.priority ?? "low"} theme={theme} />
      {!compact ? (
        <View style={[styles.description, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          {card.descriptionHTML
            ? <Text style={{ color: theme.ink, fontSize: 14, lineHeight: 21 }}>{card.description ?? ""}</Text>
            : <RichText content={card.noteContent ?? card.description} theme={theme} />}
        </View>
      ) : null}
    </View>
  );
}

const LABEL_COLORS = [
  "#E63B2E", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
  "#111111", "#6B7280",
];

function EditableTaskDetail({ card, data, theme }: { card: MobileCard; data: MobileData; theme: AppTheme }) {
  const updateCard = useMutation(api.cards.update);
  const toggleComplete = useMutation(api.cards.toggleComplete);
  const deleteCard = useMutation(api.cards.remove);
  const moveCard = useMutation(api.cards.moveToColumnEnd);
  const createLabel = useMutation(api.labels.create);
  const updateLabel = useMutation(api.labels.update);
  const removeLabel = useMutation(api.labels.remove);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [labelEditor, setLabelEditor] = useState<{ id: Id<"labels"> | "new" | null; name: string; color: string }>({ id: null, name: "", color: LABEL_COLORS[0] });
  const [revealedLabelId, setRevealedLabelId] = useState<Id<"labels"> | null>(null);
  const [draft, setDraft] = useState({
    title: card.title,
    descriptionHTML: card.descriptionHTML ?? "",
    priority: card.priority ?? "low",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const firstRender = useRef(true);
  const selectedColumn = useMemo(() => data.columns.find((column) => column._id === card.columnId), [card.columnId, data.columns]);

  useEffect(() => {
    setDraft({
      title: card.title,
      descriptionHTML: card.descriptionHTML ?? "",
      priority: card.priority ?? "low",
    });
    firstRender.current = true;
  }, [card._id, card.descriptionHTML, card.priority, card.title]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      const title = draft.title.trim();
      if (!title) {
        setSaveState("error");
        return;
      }
      setSaveState("saving");
      try {
        await updateCard({
          cardId: card._id,
          title,
          descriptionHTML: draft.descriptionHTML,
          priority: draft.priority,
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [card._id, draft.descriptionHTML, draft.priority, draft.title, updateCard]);

  async function toggleLabel(labelId: Id<"labels">) {
    const current = card.labelIds ?? [];
    const labelIds = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
    await quickSave(() => updateCard({ cardId: card._id, labelIds }));
  }

  async function toggleAssignee(memberId: Id<"users">) {
    if (!data.canAssignTasks) {
      setSaveState("error");
      Alert.alert("No assignment permission", "The plan owner has not given you permission to assign tasks.");
      return;
    }
    const current = card.assignedUserIds ?? [];
    const assignedUserIds = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId];
    await quickSave(() => updateCard({ cardId: card._id, assignedUserIds }));
  }

  async function quickSave(action: () => Promise<unknown>) {
    setSaveState("saving");
    try {
      await action();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function confirmDelete() {
    Alert.alert("Delete task?", "This removes the task from the board.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void quickSave(() => deleteCard({ cardId: card._id })) },
    ]);
  }

  return (
    <View style={styles.taskDetail}>
      <View style={styles.editorHeader}>
        <View style={[styles.saveBadge, saveBadgeStyle(saveState, theme)]}>
          <Text style={[styles.saveBadgeText, { color: saveTextColor(saveState, theme) }]}>{saveLabel(saveState)}</Text>
        </View>
        <TouchableOpacity onPress={() => void quickSave(() => toggleComplete({ cardId: card._id }))} style={[styles.iconAction, { backgroundColor: card.isComplete ? palette.tints.green.bg : theme.panel, borderColor: theme.whisper }]}>
          <Check size={17} color={card.isComplete ? palette.tints.green.fg : theme.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} style={[styles.iconAction, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
          <Trash2 size={17} color={palette.accent} />
        </TouchableOpacity>
      </View>

      <TextInput
        value={draft.title}
        onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
        placeholder="Task title"
        placeholderTextColor={theme.subtle}
        style={[styles.titleInput, { color: theme.ink, borderBottomColor: theme.whisper }]}
      />

      <View style={styles.pickerBlock}>
        <Mono theme={theme}>Column</Mono>
        <View style={styles.wrapRow}>
          {data.columns.map((column) => (
            <TouchableOpacity key={column._id} onPress={() => void quickSave(() => moveCard({ cardId: card._id, targetColumnId: column._id }))} style={[styles.pill, { backgroundColor: column._id === selectedColumn?._id ? theme.ink : theme.panel, borderColor: theme.whisper }]}>
              <Text style={[styles.pillText, { color: column._id === selectedColumn?._id ? theme.bg : theme.ink }]}>{column.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.twoUp}>
        <View style={styles.fieldGroup}>
          <Mono theme={theme}>Due</Mono>
          <View style={styles.dueRow}>
            <TouchableOpacity onPress={() => DateTimePicker ? setShowDatePicker(true) : Alert.alert("Date picker unavailable", "Rebuild the Android app (pnpm android) so the native date picker module gets linked.")} style={[styles.dueButton, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
              <CalendarDays size={16} color={card.dueDate ? theme.ink : theme.muted} />
              <Text style={[styles.dueButtonText, { color: card.dueDate ? theme.ink : theme.muted }]}>{card.dueDate ? formatDate(card.dueDate) : "Pick a date"}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && DateTimePicker ? (
            <DateTimePicker
              value={card.dueDate ? new Date(card.dueDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event: { type: string }, selected?: Date) => {
                setShowDatePicker(false);
                if (event.type === "set" && selected) {
                  const stamped = new Date(selected);
                  stamped.setHours(12, 0, 0, 0);
                  void quickSave(() => updateCard({ cardId: card._id, dueDate: stamped.getTime() }));
                }
              }}
            />
          ) : null}
        </View>
        <View style={styles.fieldGroup}>
          <Mono theme={theme}>Priority</Mono>
          <View style={styles.wrapRow}>
            {(["low", "medium", "high", "urgent"] as const).map((priority) => (
              <TouchableOpacity key={priority} onPress={() => setDraft((current) => ({ ...current, priority }))} style={[styles.compactPill, { backgroundColor: draft.priority === priority ? theme.ink : theme.panel, borderColor: theme.whisper }]}>
                <Text style={[styles.compactPillText, { color: draft.priority === priority ? theme.bg : theme.muted }]}>{priority}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.pickerBlock}>
        <Mono theme={theme}>Labels</Mono>
        <View style={styles.wrapRow}>
          {data.labels.map((label) => {
            const selected = card.labelIds?.includes(label._id);
            const dot = label.color || theme.subtle;
            const editing = labelEditor.id === label._id;
            if (editing) return null;
            const revealed = revealedLabelId === label._id;
            return (
              <View key={label._id} style={styles.labelRow}>
                {revealed ? (
                  <TouchableOpacity onPress={() => { setLabelEditor({ id: label._id, name: label.name, color: label.color || LABEL_COLORS[0] }); setRevealedLabelId(null); }} style={[styles.labelIconBtn, { borderColor: theme.whisper, backgroundColor: theme.panel }]}>
                    <Pencil size={12} color={theme.muted} />
                  </TouchableOpacity>
                ) : null}
                {revealed ? (
                  <TouchableOpacity
                    onPress={() => {
                      setRevealedLabelId(null);
                      Alert.alert("Delete label?", `"${label.name}" will be removed from all tasks.`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => void quickSave(() => removeLabel({ labelId: label._id })) },
                      ]);
                    }}
                    style={[styles.labelIconBtn, { borderColor: theme.whisper, backgroundColor: theme.panel }]}
                  >
                    <Trash2 size={12} color={palette.accent} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={() => revealed ? setRevealedLabelId(null) : void toggleLabel(label._id)}
                  onLongPress={() => setRevealedLabelId(revealed ? null : label._id)}
                  delayLongPress={280}
                  style={[styles.pill, styles.labelPill, { backgroundColor: selected ? withAlpha(dot, 0.14) : theme.panel, borderColor: selected ? dot : theme.whisper }]}
                >
                  <View style={[styles.labelDot, { backgroundColor: dot }]} />
                  <Text style={[styles.pillText, { color: selected ? theme.ink : theme.muted }]}>{label.name}</Text>
                  {selected ? <Check size={12} color={theme.ink} /> : null}
                </TouchableOpacity>
              </View>
            );
          })}
          {labelEditor.id === null ? (
            <TouchableOpacity onPress={() => setLabelEditor({ id: "new", name: "", color: LABEL_COLORS[0] })} style={[styles.pill, styles.labelPill, { backgroundColor: theme.panel, borderColor: theme.whisper, borderStyle: "dashed" }]}>
              <Plus size={14} color={theme.muted} />
              <Text style={[styles.pillText, { color: theme.muted }]}>New label</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {labelEditor.id !== null ? (
          <View style={[styles.labelEditor, { backgroundColor: theme.panel, borderColor: theme.whisper }]}>
            <TextInput
              autoFocus
              value={labelEditor.name}
              onChangeText={(name) => setLabelEditor((current) => ({ ...current, name }))}
              placeholder="Label name"
              placeholderTextColor={theme.subtle}
              style={[styles.fieldInput, { color: theme.ink, backgroundColor: theme.bg, borderColor: theme.whisper }]}
            />
            <View style={styles.swatchRow}>
              {LABEL_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setLabelEditor((current) => ({ ...current, color }))}
                  style={[styles.swatch, { backgroundColor: color, borderColor: labelEditor.color === color ? theme.ink : "transparent", transform: labelEditor.color === color ? [{ scale: 1.15 }] : [{ scale: 1 }] }]}
                />
              ))}
            </View>
            <View style={styles.labelEditorActions}>
              <TouchableOpacity
                onPress={async () => {
                  const trimmed = labelEditor.name.trim();
                  if (!trimmed) {
                    Alert.alert("Label needs a name");
                    return;
                  }
                  if (labelEditor.id === "new") {
                    if (!data.selectedPlan) return;
                    const planId = data.selectedPlan._id;
                    const editor = labelEditor;
                    await quickSave(async () => {
                      const newId = await createLabel({ planId, name: trimmed, color: editor.color });
                      const current = card.labelIds ?? [];
                      if (!current.includes(newId)) {
                        await updateCard({ cardId: card._id, labelIds: [...current, newId] });
                      }
                    });
                  } else if (labelEditor.id) {
                    const labelId = labelEditor.id;
                    const color = labelEditor.color;
                    await quickSave(() => updateLabel({ labelId, name: trimmed, color }));
                  }
                  setLabelEditor({ id: null, name: "", color: LABEL_COLORS[0] });
                }}
                style={[styles.labelEditorPrimary, { backgroundColor: theme.ink }]}
              >
                <Text style={[styles.labelEditorPrimaryText, { color: theme.bg }]}>{labelEditor.id === "new" ? "Create" : "Save"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLabelEditor({ id: null, name: "", color: LABEL_COLORS[0] })} style={[styles.labelEditorCancel, { borderColor: theme.whisper }]}>
                <X size={14} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.pickerBlock}>
        <Mono theme={theme}>Assignees</Mono>
        {!data.canAssignTasks ? (
          <Text style={[styles.mutedLine, { color: palette.accent }]}>You do not have permission to assign tasks. Ask the plan owner to enable assignment for you.</Text>
        ) : null}
        <View style={styles.wrapRow}>
          {data.members.length ? data.members.map((member) => {
            const selected = card.assignedUserIds?.includes(member._id);
            return (
              <TouchableOpacity key={member._id} disabled={!data.canAssignTasks} onPress={() => void toggleAssignee(member._id)} style={[styles.assigneePill, { backgroundColor: selected ? theme.ink : theme.panel, borderColor: theme.whisper, opacity: data.canAssignTasks ? 1 : 0.62 }]}>
                <Avatar initials={member.initials} tint={selected ? "amber" : "ink"} size={24} />
                <Text style={[styles.pillText, { color: selected ? theme.bg : theme.ink }]}>{member.name ?? member.email ?? "Member"}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={[styles.mutedLine, { color: theme.subtle }]}>No assignable members yet.</Text>}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Mono theme={theme}>Description</Mono>
        <RichEditor
          value={draft.descriptionHTML}
          editable
          onChange={(descriptionHTML) => setDraft((current) => ({ ...current, descriptionHTML }))}
          theme={theme}
          placeholder="Add task details"
          minHeight={220}
        />
      </View>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function saveLabel(state: "idle" | "saving" | "saved" | "error") {
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "error") return "Could not save";
  return "Autosave";
}

function saveBadgeStyle(state: "idle" | "saving" | "saved" | "error", theme: AppTheme) {
  if (state === "saved") return { backgroundColor: palette.tints.green.bg, borderColor: palette.tints.green.fg };
  if (state === "error") return { backgroundColor: theme.accentTint, borderColor: palette.accent };
  return { backgroundColor: theme.panel, borderColor: theme.whisper };
}

function saveTextColor(state: "idle" | "saving" | "saved" | "error", theme: AppTheme) {
  if (state === "saved") return palette.tints.green.fg;
  if (state === "error") return palette.accent;
  return theme.muted;
}

function selectedCard(data: MobileData, cardId?: Id<"cards">) {
  return (cardId ? data.cards.find((card) => card._id === cardId) : null) ?? data.cards[0];
}

function Property({ label, value, theme }: { label: string; value: string; theme: AppTheme }) {
  return <View style={styles.propertyRow}><Mono theme={theme} style={styles.propertyLabel}>{label}</Mono><Text style={[styles.propertyValue, { color: theme.ink }]}>{value}</Text></View>;
}

function EmptyTask({ theme }: { theme: AppTheme }) {
  return (
    <Screen theme={theme}>
      <AppBar title="Task" subtitle="No cards yet" theme={theme} right={<MoreHorizontal color={theme.ink} />} />
      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.muted, backgroundColor: theme.panel, borderColor: theme.whisper }]}>Create a card on a board to use this detail view.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, gap: 18 },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.26)" },
  taskSheet: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: "72%", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  taskDetail: { gap: 14 },
  sheetHandle: { width: 42, height: 4, borderRadius: 4, alignSelf: "center", marginBottom: 4 },
  taskDetailTitle: { fontSize: 28, lineHeight: 32, fontWeight: "800" },
  propertyRow: { minHeight: 38, flexDirection: "row", alignItems: "center" },
  propertyLabel: { width: 108 },
  propertyValue: { flex: 1, fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
  description: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, lineHeight: 21 },
  editorHeader: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  saveBadge: { minHeight: 30, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", marginRight: "auto" },
  saveBadgeText: { fontSize: 11, lineHeight: 13, fontWeight: "800", textTransform: "uppercase" },
  iconAction: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleInput: { fontSize: 28, lineHeight: 34, fontWeight: "800", paddingVertical: 8, borderBottomWidth: 1 },
  pickerBlock: { gap: 10 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { minHeight: 36, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  labelPill: { flexDirection: "row", gap: 8 },
  labelDot: { width: 10, height: 10, borderRadius: 5 },
  pillText: { fontSize: 12, lineHeight: 15, fontWeight: "800", textTransform: "capitalize" },
  twoUp: { gap: 14 },
  fieldGroup: { gap: 10 },
  fieldInput: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, fontWeight: "700" },
  compactPill: { minHeight: 32, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  compactPillText: { fontSize: 11, lineHeight: 13, fontWeight: "800", textTransform: "capitalize" },
  assigneePill: { minHeight: 40, borderRadius: 14, borderWidth: 1, paddingHorizontal: 8, paddingRight: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  mutedLine: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  descriptionInput: { minHeight: 170, borderRadius: 14, borderWidth: 1, padding: 14, textAlignVertical: "top", fontSize: 14, lineHeight: 21 },
  assignRow: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  dueRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  dueButton: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  dueButtonText: { fontSize: 14, fontWeight: "700" },
  dueClear: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  labelIconBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  labelEditor: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  labelEditorActions: { flexDirection: "row", gap: 8 },
  labelEditorPrimary: { flex: 1, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  labelEditorPrimaryText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  labelEditorCancel: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 16, lineHeight: 19, fontWeight: "800" },
  rowMeta: { fontSize: 12, lineHeight: 16, fontWeight: "500", marginTop: 4 },
});
