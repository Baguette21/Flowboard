import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Edit3, Palette } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { DrawingTile, NoteCard } from "@/components/Cards";
import { Screen } from "@/components/Primitives";
import type { AppTheme } from "@/theme/tokens";
import { palette } from "@/theme/tokens";
import type { MobileData, ScreenKey } from "@/types";

export function NotesListScreen({ data, theme, setScreen }: { data: MobileData; theme: AppTheme; setScreen?: (screen: ScreenKey) => void }) {
  return (
    <Screen theme={theme}>
      <AppBar title="Notes" subtitle={`${data.notes.length} notes`} theme={theme} right={<Edit3 color={theme.ink} />} />
      <View style={styles.content}>{data.notes.map((note) => <TouchableOpacity key={note._id} onPress={() => setScreen?.("noteFocused")}><NoteCard note={note} theme={theme} /></TouchableOpacity>)}</View>
    </Screen>
  );
}

export function NoteEditorScreen({ data, theme, focused }: { data: MobileData; theme: AppTheme; focused?: boolean }) {
  const note = data.notes[0];
  const updateNote = useMutation(api.notes.update);
  const removeNote = useMutation(api.notes.remove);
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const firstRender = useRef(true);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    firstRender.current = true;
  }, [note?._id, note?.content, note?.title]);

  useEffect(() => {
    if (!focused || !note) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      if (!title.trim()) {
        setSaveState("error");
        return;
      }
      try {
        setSaveState("saving");
        await updateNote({ noteId: note._id, title: title.trim(), content });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [content, focused, note, title, updateNote]);

  async function deleteNote() {
    if (!note) return;
    try {
      await removeNote({ noteId: note._id });
    } catch (error) {
      Alert.alert("Could not delete note", error instanceof Error ? error.message : "Please try again.");
    }
  }

  if (!note) {
    return (
      <Screen theme={theme}>
        <AppBar title="Note" subtitle="No notes yet" theme={theme} right={<Edit3 color={theme.ink} />} />
        <View style={styles.content}>
          <Text style={[styles.noteBodyInput, { color: theme.muted, backgroundColor: theme.panel, borderColor: theme.whisper }]}>Create a note to start editing.</Text>
        </View>
      </Screen>
    );
  }
  return (
    <Screen theme={theme}>
      <AppBar title={focused ? "Editing" : "Note"} subtitle={focused ? noteSaveLabel(saveState) : "Reading"} theme={theme} right={<TouchableOpacity onLongPress={deleteNote}><Edit3 color={theme.ink} /></TouchableOpacity>} />
      <View style={styles.content}>
        <TextInput value={title} onChangeText={setTitle} editable={focused} style={[styles.noteInputTitle, { color: theme.ink }]} />
        <TextInput multiline editable={focused} value={content} onChangeText={setContent} placeholder="No content yet." placeholderTextColor={theme.subtle} style={[styles.noteBodyInput, { color: theme.muted, backgroundColor: theme.panel, borderColor: theme.whisper }]} />
      </View>
      {focused ? <View style={[styles.formatBar, { backgroundColor: theme.ink }]}>{["B", "I", "H1", "List", "Quote"].map((item) => <Text key={item} style={[styles.formatItem, { color: theme.bg }]}>{item}</Text>)}</View> : null}
    </Screen>
  );
}

function noteSaveLabel(state: "idle" | "saving" | "saved" | "error") {
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "error") return "Could not save";
  return "Autosave";
}

export function DrawingsListScreen({ data, theme }: { data: MobileData; theme: AppTheme }) {
  return (
    <Screen theme={theme}>
      <AppBar title="Drawings" subtitle={`${data.drawings.length} canvases`} theme={theme} right={<Palette color={theme.ink} />} />
      <View style={styles.grid}>{data.drawings.map((drawing) => <DrawingTile key={drawing._id} drawing={drawing} theme={theme} />)}</View>
    </Screen>
  );
}

export function DrawCanvasScreen({ theme }: { theme: AppTheme }) {
  return (
    <Screen theme={theme}>
      <AppBar title="Canvas" subtitle="Drawing workspace" theme={theme} right={<Palette color={theme.ink} />} />
      <View style={styles.content}>
        <View style={[styles.canvas, { backgroundColor: theme.sheet, borderColor: theme.whisper }]}>
          <View style={[styles.canvasCircle, { borderColor: palette.tints.teal.fg }]} />
          <View style={[styles.canvasRect, { borderColor: palette.tints.rose.fg }]} />
          <View style={[styles.canvasLineOne, { backgroundColor: palette.accent }]} />
          <View style={[styles.canvasLineTwo, { backgroundColor: palette.tints.blue.fg }]} />
        </View>
        <View style={[styles.toolRow, { backgroundColor: theme.ink }]}>{["Pen", "Shape", "Text", "Erase"].map((tool) => <Text key={tool} style={[styles.formatItem, { color: theme.bg }]}>{tool}</Text>)}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, gap: 18 },
  grid: { paddingHorizontal: 18, paddingTop: 10, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  noteInputTitle: { fontSize: 28, lineHeight: 34, fontWeight: "800", padding: 0 },
  noteBodyInput: { minHeight: 360, borderRadius: 14, borderWidth: 1, padding: 16, textAlignVertical: "top", fontSize: 15, lineHeight: 23 },
  formatBar: { position: "absolute", left: 18, right: 18, bottom: 18, height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  formatItem: { fontSize: 12, fontWeight: "800" },
  canvas: { height: 460, borderRadius: 18, borderWidth: 1, position: "relative", overflow: "hidden" },
  canvasCircle: { position: "absolute", left: 54, top: 80, width: 74, height: 74, borderRadius: 37, borderWidth: 4 },
  canvasRect: { position: "absolute", right: 50, top: 116, width: 112, height: 74, borderRadius: 10, borderWidth: 4 },
  canvasLineOne: { position: "absolute", left: 42, top: 286, width: 230, height: 5, borderRadius: 5, transform: [{ rotate: "-12deg" }] },
  canvasLineTwo: { position: "absolute", left: 92, top: 250, width: 160, height: 5, borderRadius: 5, transform: [{ rotate: "18deg" }] },
  toolRow: { height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
});
