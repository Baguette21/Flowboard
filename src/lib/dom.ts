export function isTextEditingTarget(target: EventTarget | Element | null) {
  if (!(target instanceof Element)) return false;

  const editable = target.closest(
    'input, textarea, select, [contenteditable="true"], [contenteditable=""], .ProseMirror, .bn-editor, .planthing-note-editor',
  );

  return editable !== null;
}
