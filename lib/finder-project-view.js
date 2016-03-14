"use babel";

import _ from "underscore-plus";
import {$, $$} from "atom-space-pen-views";
import FinderView from "./finder-view";
import * as SymbolsLoader from "./symbols-loader";
import * as utils from "./utils";

export default class ProjectFinderView extends FinderView {
  initialize() {
    super.initialize.apply(this, arguments);
    this.addClass("symbol-project-finder");
  }

  getEmptyMessage(itemCount) {
    if (itemCount === 0) {
      return "Project has no symbols or it is empty";
    } else {
      return super.getEmptyMessage();
    }
  }

  viewForItem(item) {
    // NOTE: There has to be a better way to do this.
    const mode = this.mode;
    return $$(function() {
      this.li({"class": "one-line"}, () => {
        this.div({"class": "primary-line"}, () => {
          this.div({"class": "icon " + item.kind}, () => {
            if (item.kind) {
              this.div({"class": "icon-letter"}, () => {
                this.text(item.kind[0]);
              });
            }
          });
          this.div({"class": "symbol-name"}, () => {
            this.text(item.text);
          });
          this.div({"class": "symbol-position"}, () => {
            let filename = atom.project.relativizePath(item.filename)[1]
            this.text(filename + ":" + item.position.row);
          });
        });
      });
    });
  }

  populate() {
    this.setLoading("Indexing project symbols\u2026");

    // Run task, ask for all the symbols
    let task = this.runLoadSymbolsTask((results) => {
      // We now have all the symbols..
      this.setItems(_.flatten(_.values(results)));
    });
  }

  runLoadSymbolsTask(callback) {
    if (this.loadSymbolsTask) this.loadSymbolsTask.terminate();
    this.loadSymbolsTask = SymbolsLoader.startTask((results) => {
      callback(results);
    });
  }

  selectItemView() {
    super.selectItemView.apply(this, arguments);

    // Do nothing on selection for project-finder
  }

  confirmed(item) {
    this.hide();

    // Move to symbol
    utils.moveToSymbol(item);

    // Re-focus the editor
    atom.workspace.getActivePane().activate();
  }
}
