"use babel";

import _ from "underscore-plus";
import fs from "fs-plus";
import path from "path";
import {GrammarRegistry} from "first-mate";

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

function process(filename, lines) {
  let previousSymbol = null;
  let results = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex];
    let offset = 0;

    // Skip if there are no tokens on this line
    // Not sure if this can happen -- empty lines seem to have tokens
    if (line.length === 0) continue;

    for (let token of line) {
      // Increment the offset
      offset += token.value.length;

      // Skip if the token text is nil
      if (token.value.trim().length === 0) continue;

      // Find what kind of entity we are (if any)
      let kindScope = match(token.scopes);
      if (!kindScope) continue;

      // Make symbol object
      let symbol = {
        scope: kindScope,
        kind: getKindFromScope(kindScope),
        text: token.value,
        filename: filename,
        position: {
          row: lineIndex,
          column: offset - token.value.length,
        },
        span: {
          begin: offset - token.value.length,
          end: offset,
        }
      };

      // Merge with previous symbol if adajacent
      if (previousSymbol &&
          previousSymbol.position.line === symbol.position.line &&
          previousSymbol.span.end === symbol.span.begin) {
        // This is odd btw
        previousSymbol.span.end = symbol.span.end;
        previousSymbol.text += symbol.text;
      } else {
        // Store symbol
        results.push(symbol);
      }

      previousSymbol = symbol;
    }
  }

  return results;
}

let grammarCache = {}
let grammarRegistry = null;
function loadGrammar(grammarPath, done) {
  if (grammarCache[grammarPath]) return done(grammarCache[grammarPath]);
  if (!grammarPath) return done(null);

  if (!grammarRegistry) {
    let baseModulePath = path.dirname(path.dirname(require.resolve("atom")));
    let GrammarRegistry = require(baseModulePath + "/src/grammar-registry");
    grammarRegistry = new GrammarRegistry();
  }

  grammarRegistry.loadGrammar(grammarPath, (err, grammar) => {
    grammarCache[grammarPath] = grammar;
    done(grammar);
  });
}

export function getSymbolsForFile(filename, grammar, done) {
  // Read in file contents
  fs.readFile(filename, {encoding: "utf8"}, (err, text) => {
    if (err) throw err;

    // Select grammar for file
    loadGrammar(grammar, (err, grammar) => {
      if (!grammar || grammar.scopeName === "text.plain.null-grammar") {
        // No grammar or it's plain-text
        done([]);
      } else {
        // Process..
        let lines = grammar.tokenizeLines(text);
        done(process(filename, lines));
      }
    });
  });
}

export function getSymbolsForEditor(done) {
  return getSymbolsForFile(editor.getPath(), done);
}

export default {
  getSymbolsForEditor,
  getSymbolsForFile,
};
