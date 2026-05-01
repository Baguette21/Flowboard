import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Briefcase, CheckCircle2, Circle, Plus, Star, Users } from "lucide-react-native";
import { api, type Doc, type Id } from "@/lib/api";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { MobileTaskCard } from "@/features/cards/MobileTaskCard";
import { useAppNavigation } from "@/navigation/NavigationContext";
import { parseDateTimeInput } from "@/lib/dates";
import { colors, radius, spacing } from "@/theme/tokens";

function sortByOrder<T extends { order: string; createdAt?: number; _id: string }>(items: T[]) {
  return [...items].sort((a, b) => a.order.localeCompare(b.order) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

function Header({ title, eyebrow, right }: { title: string; eyebrow: string; right?: React.ReactNode }) {
  const navigation = useAppNavigation();
  return <View style={styles.header}><Pressable onPress={navigation.back} style={styles.backButton}><ArrowLeft color={colors.ink} size={22} /></Pressable><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.headerTitle} numberOfLines={1}>{title}</Text></View>{right}</View>;
}

export function BoardScreen({ boardId }: { boardId: Id<"boards"> }) {
  const navigation = useAppNavigation();
  const { width } = useWindowDimensions();
  const board = useQuery(api.boards.get, { boardId });
  const accessInfo = useQuery(api.boards.getAccessInfo, { boardId });
  const columns = useQuery(api.columns.listByBoard, { boardId });
  const cards = useQuery(api.cards.listByBoard, { boardId });
  const labels = useQuery(api.labels.listByBoard, { boardId });
  const members = useQuery(api.boardMembers.listForBoard, { boardId });
  const createCard = useMutation(api.cards.create);
  const updateBoard = useMutation(api.boards.update);
  const columnWidth = Math.min(Math.max(width * 0.86, 300), 390);
  const orderedColumns = useMemo(() => sortByOrder(columns ?? []), [columns]);
  const cardsByColumn = useMemo(() => {
    const map = new Map<Id<"columns">, Doc<"cards">[]>();
    for (const card of cards ?? []) map.set(card.columnId, [...(map.get(card.columnId) ?? []), card]);
    return map;
  }, [cards]);
  if (board === undefined || columns === undefined || cards === undefined || labels === undefined || members === undefined) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.ink} /></View></Screen>;
  if (!board) return <Screen><View style={styles.loading}><Text>Board not found</Text></View></Screen>;
  return <Screen><View style={{ flex: 1 }}><View style={styles.boardHeader}><Pressable onPress={navigation.back} style={styles.backButton}><ArrowLeft color={colors.ink} size={22} /></Pressable><View style={[styles.boardIconWell, { backgroundColor: `${board.color}24` }]}><Briefcase color={board.color || colors.ink} size={20} /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>{accessInfo?.role ?? "Board"}</Text><Text style={styles.headerTitle} numberOfLines={1}>{board.name}</Text><View style={styles.metaRow}><Text style={styles.meta}>{orderedColumns.length} groups</Text><Text style={styles.meta}>Â·</Text><Text style={styles.meta}>{cards.length} tasks</Text><Text style={styles.meta}>Â·</Text><Users color={colors.subtleText} size={12} /><Text style={styles.meta}>{accessInfo?.memberCount ?? 1}</Text></View></View><Pressable onPress={() => updateBoard({ boardId, isFavorite: !board.isFavorite })} style={styles.iconButton}><Star color={board.isFavorite ? "#D39B19" : colors.subtleText} fill={board.isFavorite ? "#D39B19" : "none"} size={20} /></Pressable></View><ScrollView horizontal snapToInterval={columnWidth + spacing.md} decelerationRate="fast" contentContainerStyle={styles.columnRail}>{orderedColumns.map((column) => <ColumnLane key={column._id} column={column} cards={cardsByColumn.get(column._id) ?? []} labels={labels} members={members} width={columnWidth} onCreateCard={(title) => createCard({ boardId, columnId: column._id, title, priority: undefined, dueDate: undefined })} />)}</ScrollView></View></Screen>;
}

function ColumnLane({ column, cards, labels, members, width, onCreateCard }: { column: Doc<"columns">; cards: Doc<"cards">[]; labels: Doc<"labels">[]; members: any[]; width: number; onCreateCard: (title: string) => Promise<unknown> }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const sorted = sortByOrder(cards);
  return <View style={[styles.column, { width }]}><View style={styles.columnHeader}><Text style={styles.columnTitle}>{column.title} <Text style={styles.meta}>{sorted.length}</Text></Text><Pressable style={styles.iconButton} onPress={() => setAdding((v) => !v)}><Plus color={colors.ink} size={18} /></Pressable></View>{adding ? <View style={styles.addPanel}><TextInput value={title} onChangeText={setTitle} placeholder="Task name" placeholderTextColor={colors.subtleText} style={styles.input} /><Button onPress={async () => { if (!title.trim()) return; await onCreateCard(title.trim()); setTitle(""); setAdding(false); }}>Add Task</Button></View> : null}<ScrollView contentContainerStyle={styles.cardList}>{sorted.map((card) => <MobileTaskCard key={card._id} card={card} labels={labels} members={members} />)}</ScrollView></View>;
}

export function CardScreen({ cardId }: { cardId: Id<"cards"> }) {
  const card = useQuery(api.cards.get, { cardId });
  const columns = useQuery(api.columns.listByBoard, card ? { boardId: card.boardId } : "skip");
  const labels = useQuery(api.labels.listByBoard, card ? { boardId: card.boardId } : "skip");
  const members = useQuery(api.boardMembers.listForBoard, card ? { boardId: card.boardId } : "skip");
  const updateCard = useMutation(api.cards.update);
  const toggleComplete = useMutation(api.cards.toggleComplete);
  const moveToColumnEnd = useMutation(api.cards.moveToColumnEnd);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  useEffect(() => { if (card) { setTitle(card.title); setDue(card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 16) : ""); } }, [card?._id]);
  if (card === undefined) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.ink} /></View></Screen>;
  if (!card) return <Screen><View style={styles.loading}><Text>Task not found</Text></View></Screen>;
  const assigned = card.assignedUserIds ?? (card.assignedUserId ? [card.assignedUserId] : []);
  return <Screen><Header title={card.title} eyebrow="Task" /><ScrollView contentContainerStyle={styles.content}><View style={styles.section}><Pressable style={styles.complete} onPress={() => toggleComplete({ cardId })}>{card.isComplete ? <CheckCircle2 color={colors.green} size={22} /> : <Circle color={colors.subtleText} size={22} />}<Text style={styles.completeText}>{card.isComplete ? "Completed" : "Mark complete"}</Text></Pressable><TextField label="Title" value={title} onChangeText={setTitle} multiline /><TextField label="Due Date" value={due} onChangeText={setDue} placeholder="2026-05-01 14:30" /><Button onPress={() => updateCard({ cardId, title: title.trim() || card.title, dueDate: parseDateTimeInput(due) || undefined })}>Save Details</Button></View>{columns ? <OptionSection title="Move to group" items={columns.map((c) => ({ id: c._id, label: c.title, active: c._id === card.columnId, onPress: () => moveToColumnEnd({ cardId, targetColumnId: c._id }) }))} /> : null}{labels ? <OptionSection title="Labels" items={labels.map((l) => ({ id: l._id, label: l.name, active: card.labelIds.includes(l._id), onPress: () => updateCard({ cardId, labelIds: card.labelIds.includes(l._id) ? card.labelIds.filter((id) => id !== l._id) : [...card.labelIds, l._id] }) }))} /> : null}{members ? <OptionSection title="Assignees" items={members.map((m) => ({ id: m.userId, label: m.name ?? m.email ?? "Member", active: assigned.includes(m.userId), onPress: () => { const next = assigned.includes(m.userId) ? assigned.filter((id) => id !== m.userId) : [...assigned, m.userId]; return updateCard({ cardId, assignedUserIds: next, assignedUserId: next[0] ?? null }); } }))} /> : null}</ScrollView></Screen>;
}

function OptionSection({ title, items }: { title: string; items: Array<{ id: string; label: string; active: boolean; onPress: () => unknown }> }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.optionGrid}>{items.map((item) => <Pressable key={item.id} onPress={item.onPress} style={[styles.option, item.active && styles.optionActive]}><Text style={[styles.optionText, item.active && styles.optionTextActive]}>{item.label}</Text></Pressable>)}</View></View>;
}

export function NoteScreen({ noteId }: { noteId: Id<"notes"> }) {
  const note = useQuery(api.notes.get, { noteId });
  const updateNote = useMutation(api.notes.update);
  const removeNote = useMutation(api.notes.remove);
  const navigation = useAppNavigation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  useEffect(() => { if (note) { setTitle(note.title || "Untitled"); setContent(note.content ?? ""); } }, [note?._id]);
  if (note === undefined) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.ink} /></View></Screen>;
  if (!note) return <Screen><View style={styles.loading}><Text>Note not found</Text></View></Screen>;
  return <Screen><Header title={note.title || "Untitled" } eyebrow="Note" right={<Pressable onPress={() => updateNote({ noteId, isFavorite: !note.isFavorite })} style={styles.iconButton}><Star color={note.isFavorite ? "#D39B19" : colors.subtleText} fill={note.isFavorite ? "#D39B19" : "none"} size={20} /></Pressable>} /><ScrollView contentContainerStyle={styles.content}><View style={styles.section}><TextField label="Title" value={title} onChangeText={setTitle} /><TextField label="Note" value={content} onChangeText={setContent} multiline style={{ minHeight: 260 }} /><Button onPress={() => updateNote({ noteId, title: title.trim() || "Untitled", content })}>Save Note</Button></View><Button variant="danger" onPress={async () => { await removeNote({ noteId }); navigation.replace({ name: "main", tab: "workspace" }); }}>Delete Note</Button></ScrollView></Screen>;
}

export function DrawingScreen({ drawingId }: { drawingId: Id<"drawings"> }) {
  const drawing = useQuery(api.drawings.get, { drawingId });
  const updateDrawing = useMutation(api.drawings.update);
  const removeDrawing = useMutation(api.drawings.remove);
  const navigation = useAppNavigation();
  const [title, setTitle] = useState("");
  useEffect(() => { if (drawing) setTitle(drawing.title || "Untitled"); }, [drawing?._id]);
  if (drawing === undefined) return <Screen><View style={styles.loading}><ActivityIndicator color={colors.ink} /></View></Screen>;
  if (!drawing) return <Screen><View style={styles.loading}><Text>Drawing not found</Text></View></Screen>;
  return <Screen><Header title={drawing.title || "Untitled"} eyebrow="Drawing" /><ScrollView contentContainerStyle={styles.content}><View style={styles.section}><Text style={styles.sectionTitle}>Canvas preview</Text><Text style={styles.meta}>Mobile drawing editing is not implemented yet, but drawings stay visible in the workspace.</Text></View><View style={styles.section}><TextField label="Title" value={title} onChangeText={setTitle} /><Button onPress={() => updateDrawing({ drawingId, title: title.trim() || "Untitled" })}>Save Drawing</Button></View><Button variant="danger" onPress={async () => { await removeDrawing({ drawingId }); navigation.replace({ name: "main", tab: "workspace" }); }}>Delete Drawing</Button></ScrollView></Screen>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.whisperBorder, backgroundColor: colors.headerWash },
  boardHeader: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.whisperBorder, backgroundColor: colors.headerWash },
  backButton: { minWidth: 46, minHeight: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.paperPanel, borderWidth: 1, borderColor: colors.whisperBorder },
  boardIconWell: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  iconButton: { minWidth: 42, minHeight: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.sproutRed, fontSize: 10, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { color: colors.ink, fontSize: 21, fontWeight: "900", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  meta: { color: colors.subtleText, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  columnRail: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  column: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, overflow: "hidden" },
  columnHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.whisperBorder },
  columnTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  addPanel: { gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.whisperBorder },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperBg, color: colors.ink, paddingHorizontal: spacing.md, fontSize: 15 },
  cardList: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.whisperBorder, backgroundColor: colors.paperPanel, padding: spacing.lg },
  complete: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  completeText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: { minHeight: 44, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.whisperBorder, paddingHorizontal: 14, backgroundColor: colors.paperBg },
  optionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  optionTextActive: { color: colors.paperBg }
});


