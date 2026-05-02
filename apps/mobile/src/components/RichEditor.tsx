import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RichText, Toolbar, useEditorBridge } from "@10play/tentap-editor";
import type { WebViewMessageEvent } from "react-native-webview";
import { AlignCenter, AlignLeft, AlignRight, Crop, Maximize2, Minimize2, MoveHorizontal, X } from "lucide-react-native";
import type { AppTheme } from "@/theme/tokens";

type RichEditorProps = {
  value: string;
  editable: boolean;
  onChange: (html: string) => void;
  theme: AppTheme;
  placeholder?: string;
  minHeight?: number;
  showToolbar?: boolean;
};

export function RichEditor({ value, editable, onChange, theme, placeholder, minHeight = 360, showToolbar = true }: RichEditorProps) {
  const [ready, setReady] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const hydratedRef = useRef(false);
  const lastEmittedRef = useRef("");
  const lastExternalRef = useRef("");
  const applyingExternalRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorTheme = useMemo(
    () => ({
      webview: {
        backgroundColor: "transparent",
      },
      webviewContainer: {
        backgroundColor: "transparent",
      },
      toolbar: {
        toolbarBody: {
          height: 44,
          minWidth: "100%",
          borderTopWidth: 0,
          borderBottomWidth: 0,
          backgroundColor: theme.dark ? "rgba(43,39,32,0.88)" : "rgba(255,252,246,0.88)",
        },
        toolbarButton: {
          paddingHorizontal: 8,
          backgroundColor: "transparent",
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
        iconWrapper: {
          borderRadius: 8,
          backgroundColor: "transparent",
        },
        iconWrapperActive: {
          backgroundColor: theme.dark ? "rgba(238,232,222,0.12)" : "rgba(0,0,0,0.07)",
        },
        icon: {
          height: 27,
          width: 27,
          tintColor: theme.dark ? "rgba(238,232,222,0.66)" : "rgba(0,0,0,0.45)",
        },
        iconDisabled: {
          tintColor: theme.dark ? "rgba(238,232,222,0.2)" : "rgba(0,0,0,0.18)",
        },
        linkBarTheme: {
          addLinkContainer: {
            height: 44,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            backgroundColor: theme.dark ? "rgba(43,39,32,0.92)" : "rgba(255,252,246,0.92)",
          },
          linkInput: {
            color: theme.ink,
          },
          placeholderTextColor: theme.subtle,
          doneButton: {
            backgroundColor: theme.accentTint,
          },
          doneButtonText: {
            color: theme.accent,
          },
        },
      },
    }),
    [theme],
  );

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: value || "",
    editable,
    dynamicHeight: false,
    theme: editorTheme,
  });

  const editorCss = useMemo(
    () => `
      html, body, #root, .tiptap, .ProseMirror {
        background: transparent !important;
      }
      body {
        margin: 0 !important;
        color: ${theme.ink};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .ProseMirror {
        min-height: ${minHeight - (editable && showToolbar ? 56 : 0)}px;
        padding: 2px 2px ${editable && showToolbar ? 64 : 2}px !important;
        outline: none !important;
        caret-color: ${theme.accent};
      }
      .ProseMirror p {
        margin: 0 0 10px;
        font-size: 16px;
        line-height: 1.55;
      }
      .ProseMirror h1,
      .ProseMirror h2,
      .ProseMirror h3 {
        margin: 0 0 12px;
        color: ${theme.ink};
      }
      .ProseMirror img,
      .ProseMirror [data-content-type="image"] img,
      .ProseMirror figure img {
        display: block;
        max-width: 100% !important;
        height: auto !important;
        margin: 12px 0;
        border-radius: 12px;
        object-fit: contain;
      }
      .ProseMirror img[data-flowboard-selected="true"] {
        outline: 2px solid ${theme.accent};
        outline-offset: 3px;
      }
      .ProseMirror figure,
      .ProseMirror [data-content-type="image"] {
        margin: 14px 0;
        max-width: 100%;
      }
      .ProseMirror p.is-editor-empty:first-child::before {
        color: ${theme.subtle};
        content: "${cssString(placeholder ?? "Write something ...")}";
        float: left;
        height: 0;
        pointer-events: none;
      }
    `,
    [editable, minHeight, placeholder, showToolbar, theme],
  );

  useEffect(() => {
    const off = editor._subscribeToEditorStateUpdate((state) => {
      if (state.isReady) setReady(true);
    });
    const timer = setTimeout(() => setReady(true), 500);
    return () => {
      clearTimeout(timer);
      off?.();
    };
  }, [editor]);

  useEffect(() => {
    if (!ready) return;
    editor.webviewRef.current?.injectJavaScript(`
      (function() {
        var existing = document.getElementById('flowboard-editor-surface');
        if (existing) existing.remove();
        var style = document.createElement('style');
        style.id = 'flowboard-editor-surface';
        style.innerHTML = ${JSON.stringify(editorCss)};
        document.head.appendChild(style);
        if (!window.__flowboardImageToolsInstalled) {
          window.__flowboardImageToolsInstalled = true;
          document.addEventListener('click', function(event) {
            var target = event.target;
            var image = target && target.closest ? target.closest('.ProseMirror img') : null;
            document.querySelectorAll('.ProseMirror img[data-flowboard-selected="true"]').forEach(function(img) {
              if (img !== image) img.removeAttribute('data-flowboard-selected');
            });
            if (image) {
              image.setAttribute('data-flowboard-selected', 'true');
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'flowboard-image-selected' }));
            } else {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'flowboard-image-cleared' }));
            }
          }, true);
        }
        true;
      })();
    `);
  }, [editor, editorCss, ready]);

  useEffect(() => {
    if (!ready) return;
    if (hydratedRef.current && value === lastExternalRef.current && value === lastEmittedRef.current) return;
    hydratedRef.current = true;
    applyingExternalRef.current = true;
    lastExternalRef.current = value;
    lastEmittedRef.current = value;
    editor.setContent(value || "");
  }, [editor, ready, value]);

  useEffect(() => {
    const off = editor._subscribeToContentUpdate(() => {
      if (applyingExternalRef.current) {
        applyingExternalRef.current = false;
        return;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const html = await editor.getHTML();
          if (html === lastEmittedRef.current) return;
          lastEmittedRef.current = html;
          onChange(html);
        } catch {
          // ignore
        }
      }, 600);
    });
    return () => {
      off?.();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, onChange]);

  function handleMessage(event: WebViewMessageEvent) {
    const data = event.nativeEvent.data;
    if (typeof data !== "string") return;
    try {
      const message = JSON.parse(data) as { type?: string; html?: string };
      if (message.type === "flowboard-image-selected") {
        setImageSelected(true);
      } else if (message.type === "flowboard-image-cleared") {
        setImageSelected(false);
      } else if (message.type === "flowboard-image-updated" && typeof message.html === "string") {
        lastEmittedRef.current = message.html;
        lastExternalRef.current = message.html;
        onChange(message.html);
        editor.setContent(message.html);
      }
    } catch {
      // TenTap also sends messages through this channel.
    }
  }

  function editSelectedImage(command: ImageCommand) {
    editor.webviewRef.current?.injectJavaScript(`
      (function() {
        var img = document.querySelector('.ProseMirror img[data-flowboard-selected="true"]');
        if (!img) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'flowboard-image-cleared' }));
          return true;
        }
        var command = ${JSON.stringify(command)};
        var currentWidth = parseInt(img.style.width || img.getAttribute('width') || '100', 10);
        if (!Number.isFinite(currentWidth) || currentWidth < 20) currentWidth = 100;
        if (command === 'smaller') {
          var nextWidth = Math.max(25, currentWidth - 15);
          img.style.width = nextWidth + '%';
          img.setAttribute('width', String(nextWidth));
        }
        if (command === 'larger') {
          var nextWidthLarge = Math.min(100, currentWidth + 15);
          img.style.width = nextWidthLarge + '%';
          img.setAttribute('width', String(nextWidthLarge));
        }
        if (command === 'left') {
          img.style.marginLeft = '0';
          img.style.marginRight = 'auto';
          if (img.parentElement) img.parentElement.style.textAlign = 'left';
        }
        if (command === 'center') {
          img.style.marginLeft = 'auto';
          img.style.marginRight = 'auto';
          if (img.parentElement) img.parentElement.style.textAlign = 'center';
        }
        if (command === 'right') {
          img.style.marginLeft = 'auto';
          img.style.marginRight = '0';
          if (img.parentElement) img.parentElement.style.textAlign = 'right';
        }
        if (command === 'crop') {
          var cropped = img.getAttribute('data-flowboard-crop') === 'cover';
          if (cropped) {
            img.removeAttribute('data-flowboard-crop');
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
            img.style.objectPosition = '';
          } else {
            img.setAttribute('data-flowboard-crop', 'cover');
            img.style.width = '100%';
            img.style.height = '220px';
            img.style.objectFit = 'cover';
            img.style.objectPosition = img.style.objectPosition || '50% 50%';
          }
        }
        if (command === 'clear') {
          img.removeAttribute('data-flowboard-selected');
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'flowboard-image-cleared' }));
          return true;
        }
        if (command === 'pan-left' || command === 'pan-right') {
          img.setAttribute('data-flowboard-crop', 'cover');
          img.style.objectFit = 'cover';
          img.style.height = img.style.height && img.style.height !== 'auto' ? img.style.height : '220px';
          var parts = (img.style.objectPosition || '50% 50%').split(' ');
          var x = parseInt(parts[0], 10);
          if (!Number.isFinite(x)) x = 50;
          x = Math.max(0, Math.min(100, x + (command === 'pan-left' ? -10 : 10)));
          img.style.objectPosition = x + '% 50%';
        }
        var html = document.querySelector('.ProseMirror').innerHTML;
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'flowboard-image-updated', html: html }));
        return true;
      })();
    `);
  }

  return (
    <View style={[styles.surface, { minHeight }]}>
      <RichText
        editor={editor}
        onMessage={handleMessage}
        exclusivelyUseCustomOnMessage={false}
        originWhitelist={["*"]}
        mixedContentMode="always"
        domStorageEnabled
        javaScriptEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        setSupportMultipleWindows={false}
      />
      {editable && imageSelected ? (
        <View style={[styles.imageTools, { backgroundColor: theme.sheet, borderColor: theme.whisper }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageToolsScroll}>
            <ImageTool icon={<AlignLeft size={17} color={theme.ink} />} label="Left" onPress={() => editSelectedImage("left")} />
            <ImageTool icon={<AlignCenter size={17} color={theme.ink} />} label="Center" onPress={() => editSelectedImage("center")} />
            <ImageTool icon={<AlignRight size={17} color={theme.ink} />} label="Right" onPress={() => editSelectedImage("right")} />
            <ImageTool icon={<Minimize2 size={17} color={theme.ink} />} label="Smaller" onPress={() => editSelectedImage("smaller")} />
            <ImageTool icon={<Maximize2 size={17} color={theme.ink} />} label="Larger" onPress={() => editSelectedImage("larger")} />
            <ImageTool icon={<Crop size={17} color={theme.ink} />} label="Crop" onPress={() => editSelectedImage("crop")} />
            <ImageTool icon={<MoveHorizontal size={17} color={theme.ink} />} label="Left crop" onPress={() => editSelectedImage("pan-left")} />
            <ImageTool icon={<MoveHorizontal size={17} color={theme.ink} />} label="Right crop" onPress={() => editSelectedImage("pan-right")} />
            <ImageTool icon={<X size={17} color={theme.ink} />} label="Done" onPress={() => editSelectedImage("clear")} />
          </ScrollView>
        </View>
      ) : null}
      {editable && showToolbar ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.toolbarWrap}>
          <Toolbar editor={editor} />
        </KeyboardAvoidingView>
      ) : null}
      {!editable && !value ? (
        <Text style={[styles.placeholder, { color: theme.subtle }]}>{placeholder}</Text>
      ) : null}
    </View>
  );
}

type ImageCommand = "left" | "center" | "right" | "smaller" | "larger" | "crop" | "pan-left" | "pan-right" | "clear";

function ImageTool({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.imageToolButton}>
      {icon}
      <Text style={styles.imageToolText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, overflow: "visible" },
  toolbarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
  imageTools: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 52,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageToolsScroll: { paddingHorizontal: 6, paddingVertical: 6, gap: 4 },
  imageToolButton: { minWidth: 62, minHeight: 42, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 8 },
  imageToolText: { fontSize: 10, lineHeight: 12, fontWeight: "700", color: "#555" },
  placeholder: { paddingTop: 2, fontSize: 16, lineHeight: 24, fontStyle: "italic" },
});

function cssString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
