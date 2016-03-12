"use babel";

import {CompositeDisposable} from "atom";
import SymbolGenerator from "./generator";

export default {
  subscriptions: null,

  activate(state) {
    // Create a new symbol generator
    this.generator = new SymbolGenerator();

    // Events subscribed to in atom's system can be easily cleaned up
    // with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add("atom-workspace", {
      "symbols-plus:toggle-file-symbols": () => {
        this.getFinder().toggle();
      },
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
    this.finderView.destroy()
  },

  serialize() {
    // Nothing to serialize
  },

  getFinder() {
    if (!this.finderView) {
      const FinderView = require("./finder-view");
      this.finderView = new FinderView(this.generator);
    }

    return this.finderView;
  }
};
