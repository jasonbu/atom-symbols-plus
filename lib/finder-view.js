"use babel";

import {$, $$, SelectListView} from "atom-space-pen-views";

export default class FinderView extends SelectListView {
  initialize(generator) {
    super.initialize();

    // Store a reference to the symbol generator
    this.generator = generator;

    // Differentiate this from other select-list-views
    this.addClass("symbol-finder");
  }

  destroy() {
    this.cancel();
    if (this.panel) this.panel.destroy();
    if (this.subscriptions) this.subscriptions.dispose();
    this.subscriptions = null;
  }

  getFilterKey() {
    return "text";
    Finder
  }

  getEmptyMessage(itemCount) {
    if (itemCount === 0) {
      return "File has no symbols or it is empty";
    } else {
      return super.getEmptyMessage();
    }
  }

  show() {
    this.storeFocusedElement();
    if (!this.panel) this.panel = atom.workspace.addModalPanel({item: this});
    this.panel.show();
    this.focusFilterEditor();
  }

  hide() {
    if (this.panel) this.panel.hide();
  }

  cancelled() {
    this.hide();
  }

  toggle() {
    if (this.panel && this.panel.isVisible()) {
      this.cancel();
    } else {
      this.populate();
      this.show();
    }
  }

  viewForItem(item) {
    // NOTE: There has to be a better way to do this.
    return $$(function() {
      this.li({"class": "item"}, () => {
        this.div({"class": "item-row"}, () => {
          this.div({"class": "icon " + item.kind}, () => {
            if (item.kind) {
              this.text(item.kind[0]);
            }
          });
          this.div({"class": "symbol-name"}, () => {
            this.text(item.text);
          });
          this.div({"class": "symbol-position"}, () => {
            this.text("Line " + item.position.line);
          });
        });
      });
    });
  }

  populate() {
    this.setLoading("Discovering symbols\u2026");

    // Get the current text editor
    const editor = atom.workspace.getActiveTextEditor();

    // Request symbols for that editor
    const symbols = this.generator.getSymbolsForEditor(editor);
    this.setItems(symbols);
  }

  selectItemView() {
    super.selectItemView.apply(this, arguments);

    // Get the currently selected item
    const item = this.getSelectedItem();

    // Get the current text editor
    // Hopefully this is the same editor as populated this dialog..
    const editor = atom.workspace.getActiveTextEditor();

    // Scroll to the selected symbol
    editor.scrollToBufferPosition({
      row: item.position.line,
    }, {center: true});

    // Move cursor to just before the symbol
    editor.setCursorBufferPosition({
      row: item.position.line,
      column: item.position.begin,
    });
  }

  confirmed(item) {
    this.hide();

    // Re-focus the editor
    atom.workspace.getActivePane().activate();
  }
}
