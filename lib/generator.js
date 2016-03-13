"use babel";

import _ from "underscore-plus";

// Target scopes -- this is what we are trying to get
const patterns = [
  // Class declarations
  {
    filter: /^entity\.name(\.type)?\.class/,
  },
  // Function declarations
  {
    filter: /^entity\.name\.function/,
    reject: /function-call|decorator/,
  },
  // Aside: CSS Mixin declarations (stylus/less/scss/etc.)
  {
    filter: /^entity\.other\.attribute-name\.class\.mixin\.css$/,
    reject: /^meta\.property-list\.css$/,
  },
  // CSS
  {
    filter: /^entity\.other\.attribute-name.*?\.css$/,
  },
];

function match(scopes) {
  // Run through the scope list to attempt to match a target
  for (let scope of scopes) {
    for (let pattern of patterns) {
      if (pattern.filter.test(scope)) {
        let rejected = null;
        if (pattern.reject != null) {
          rejected = false;
          // Found a match with this pattern -- check again to see if it rejects
          for (let scope_ of scopes) {
            if (pattern.reject.test(scope_)) {
              // Reject fired
              rejected = true;
              break;
            }
          }
        }

        // If we didn't reject -- we're good
        if (!rejected) return scope;
        else if (rejected == true) return null;
      }
    }
  }
}

function getKindFromScope(scope) {
  if (scope.indexOf("variable") >= 0) return "variable";
  if (scope.indexOf("css") >= 0) return "selector";
  if (scope.indexOf("function") >= 0) return "function";
  if (scope.indexOf("class") >= 0) return "class";
  return null;
}

export default class SymbolGenerator {
  constructor() {
    this.symbols = new Map();
  }

  getSymbolsForEditor(editor) {
    const lineCount = editor.buffer.lines.length;
    const lines = editor.tokenizedLinesForScreenRows(0, lineCount);
    const results = [];
    const pathname = atom.project.relativizePath(editor.getPath())[1];
    let previousSymbol = null;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let line = lines[lineIndex];

      // Skip if there are no tokens on this line
      // Not sure if this can happen -- empty lines seem to have tokens
      if (line.getTokenCount() === 0) continue;

      const iterator = line.getTokenIterator();
      do {
        const text = iterator.getText();

        // Skip if the token text is nil
        if (text.trim().length === 0) continue;

        // Find what kind of entity we are (if any)
        let kindScope = match(iterator.getScopes());
        if (!kindScope) continue;

        // Make symbol object
        let symbol = {
          scope: kindScope,
          kind: getKindFromScope(kindScope),
          text: iterator.getText(),
          path: pathname,
          position: {
            line: lineIndex,
            begin: iterator.getBufferStart(),
            end: iterator.getBufferEnd(),
          }
        };

        // Merge with previous symbol if adajacent
        if (previousSymbol &&
            previousSymbol.position.line === symbol.position.line &&
            previousSymbol.position.end === symbol.position.begin) {
          // This is odd btw
          previousSymbol.position.end = symbol.position.end;
          previousSymbol.text += symbol.text;
        } else {
          // Store symbol
          results.push(symbol);
        }

        previousSymbol = symbol;
      } while (iterator.next());
    }

    return results;
  }
}
