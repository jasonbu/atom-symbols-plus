"use babel";

export function moveToSymbol(symbol) {
  let editor = atom.workspace.getActiveTextEditor();
  if (!editor || symbol.filename !== editor.getPath()) {
    atom.workspace.open(symbol.filename).then(() => {
      moveToPosition(symbol.position);
    });
  } else {
    moveToPosition(symbol.position);
  }
}

export function moveToPosition(position) {
  let editor = atom.workspace.getActiveTextEditor();
  if (editor) {
    // Scroll to the selected symbol
    editor.scrollToBufferPosition(position, {center: true});

    // Move to just before the symbol
    editor.setCursorBufferPosition(position);
  }
}
