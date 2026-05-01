import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Check, MoreHorizontal, Trash2, User } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { TaskCard } from "@/components/Cards";
import { Avatar, Mono, Screen, formatDate } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import { palette, tintFrom } from "@/theme/tokens";
import type { MobileCard, MobileData } from "@/types";
import type { Id } from "@convex/_generated/dataModel";

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

export function TaskFullScreen({ data, theme, selectedCardId }: { data: MobileData; theme: AppTheme; selectedCardId?: Id<"cards"> }) {
  const card = selectedCard(data, selectedCardId);
  if (!card) return <EmptyTask theme={theme} />;
  return (
    <Screen theme={theme}>
      <AppBar title="Task" subtitle={data.selectedBoard?.name ?? ""} theme={theme} right={<MoreHorizontal color={theme.ink} />} />
      <View style={styles.content}><EditableTaskDetail card={card} data={data} theme={theme} /></View>
    </Screen>
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
      <Mono theme={theme}>{data.selectedBoard?.name ?? "Launch Plan"}</Mono>
      <Text style={[styles.taskDetailTitle, { color: theme.ink }]}>{card.title}</Text>
      <TaskCard card={card} labels={data.labels} theme={theme} />
      <Property label="Status" value={card.isComplete ? "Done" : "In progress"} theme={theme} />
      <Property label="Due" value={formatDate(card.dueDate)} theme={theme} />
      <Property label="Priority" value={card.priority ?? "low"} theme={theme} />
      {!compact ? <Text style={[styles.description, { color: theme.muted, backgroundColor: theme.panel, borderColor: theme.whisper }]}>{card.description ?? card.noteContent ?? "No description yet."}</Text> : null}
    </View>
  );
}

function EditableTaskDetail({ card, data, theme }: { card: MobileCard; data: MobileData; theme: AppTheme }) {
  const updateCard = useMutation(api.cards.update);
  const toggleComplete = useMutation(api.cards.toggleComplete);
  const deleteCard = useMutation(api.cards.remove);
  const moveCard = useMutation(api.cards.moveToColumnEnd);
  const [draft, setDraft] = useState({
    title: card.title,
    description: card.description ?? card.noteContent ?? "",
    priority: card.priority ?? "low",
    dueDateText: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const firstRender = useRef(true);
  const selectedColumn = useMemo(() => data.columns.find((column) => column._id === card.columnId), [card.columnId, data.columns]);

  useEffect(() => {
    setDraft({
      title: card.title,
      description: card.description ?? card.noteContent ?? "",
      priority: card.priority ?? "low",
      dueDateText: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : "",
    });
    firstRender.current = true;
  }, [card._id, card.description, card.dueDate, card.noteContent, card.priority, card.title]);

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
      const dueDate = parseDueDate(draft.dueDateText);
      if (draft.dueDateText.trim() && dueDate === undefined) {
        setSaveState("error");
        return;
      }
      setSaveState("saving");
      try {
        await updateCard({
          cardId: card._id,
          title,
          description: draft.description,
          priority: draft.priority,
          ...(dueDate ? { dueDate } : {}),
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [card._id, draft.description, draft.dueDateText, draft.priority, draft.title, updateCard]);

  async function toggleLabel(labelId: Id<"labels">) {
    const current = card.labelIds ?? [];
    const labelIds = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
    await quickSave(() => updateCard({ cardId: card._id, labelIds }));
  }

  async function toggleAssignee(memberId: Id<"users">) {
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
          <TextInput value={draft.dueDateText} onChangeText={(dueDateText) => setDraft((current) => ({ ...current, dueDateText }))} placeholder="YYYY-MM-DD" placeholderTextColor={theme.subtle} style={[styles.fieldInput, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.whisper }]} />
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
          {data.labels.length ? data.labels.map((label) => {
            const selected = card.labelIds?.includes(label._id);
            return (
              <TouchableOpacity key={label._id} onPress={() => void toggleLabel(label._id)} style={[styles.pill, { backgroundColor: selected ? palette.tints[tintFrom(label.color)].bg : theme.panel, borderColor: selected ? palette.tints[tintFrom(label.color)].fg : theme.whisper }]}>
                <Text style={[styles.pillText, { color: selected ? palette.tints[tintFrom(label.color)].fg : theme.muted }]}>{label.name}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={[styles.mutedLine, { color: theme.subtle }]}>No labels on this board.</Text>}
        </View>
      </View>

      <View style={styles.pickerBlock}>
        <Mono theme={theme}>Assignees</Mono>
        <View style={styles.wrapRow}>
          {data.members.length ? data.members.map((member) => {
            const selected = card.assignedUserIds?.includes(member._id);
            return (
              <TouchableOpacity key={member._id} onPress={() => void toggleAssignee(member._id)} style={[styles.assigneePill, { backgroundColor: selected ? theme.ink : theme.panel, borderColor: theme.whisper }]}>
                <Avatar initials={member.initials} tint={selected ? "amber" : "ink"} size={24} />
                <Text style={[styles.pillText, { color: selected ? theme.bg : theme.ink }]}>{member.name ?? member.email ?? "Member"}</Text>
              </TouchableOpacity>
            );
          }) : <Text style={[styles.mutedLine, { color: theme.subtle }]}>No assignable members yet.</Text>}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Mono theme={theme}>Description</Mono>
        <TextInput
          multiline
          value={draft.description}
          onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
          placeholder="Add task details"
          placeholderTextColor={theme.subtle}
          style={[styles.descriptionInput, { color: theme.ink, backgroundColor: theme.panel, borderColor: theme.whisper }]}
        />
      </View>
    </View>
  );
}

function parseDueDate(value: string) {
  if (!value.trim()) return undefined;
  const timestamp = new Date(`${value.trim()}T12:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
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
  sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.26)" },
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
  rowTitle: { fontSize: 16, lineHeight: 19, fontWeight: "800" },
  rowMeta: { fontSize: 12, lineHeight: 16, fontWeight: "500", marginTop: 4 },
});
