"use babel";

import {CompositeDisposable} from "atom";

export default {
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up
    // with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add("atom-workspace", {
      "symbols-plus:toggle-file-symbols": () => {
        this.getFileFinder().toggle();
      },

      "symbols-plus:toggle-project-symbols": () => {
        this.getProjectFinder().toggle();
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

  getFileFinder() {
    if (!this.fileFinderView) {
      const FileFinderView = require("./finder-view");
      this.fileFinderView = new FileFinderView(this.generator);
    }

    return this.fileFinderView;
  },

  getProjectFinder() {
    if (!this.projectFinderView) {
      const ProjectFinderView = require("./finder-project-view");
      this.projectFinderView = new ProjectFinderView();
    }

    return this.projectFinderView;
  }
};
