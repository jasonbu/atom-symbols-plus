"use babel";

import fs from "fs-plus";
import {Task} from "atom";
import async from "async";
import microtime from "microtime";

export function startTask(callback) {
  let results = {};
  let followSymlinks = atom.config.get("core.followSymlinks");
  let taskPath = require.resolve("./symbols-loader-handler");
  let ignoreVcsIgnores = atom.config.get("core.excludeVcsIgnoredPaths");
  let ignoredNames = atom.config.get("core.ignoredNames");
  let projectPaths = atom.project.getPaths().map((path) =>
    fs.realpathSync(path));

  let startTime = microtime.now();

  let task = Task.once(
    taskPath,
    projectPaths,
    followSymlinks,
    ignoreVcsIgnores,
    ignoredNames, () => {
      // Report elapsed time
      let endTime = microtime.now();
      let elapsed = ((endTime - startTime) / (1000 * 1000)).toFixed(4)
      console.debug("Indexed project symbols in", elapsed, "seconds")

      // All done!
      callback(results);
    }
  );

  let queue = async.queue(({filename}, next) => {
    task.childProcess.send({
      filename, grammar: atom.grammars.selectGrammar(filename).path
    }, () => {
      next();
    });
  }, 1);

  task.on("symbols-loader:path-found", ({filename}) => {
    // Determine grammar
    queue.push({filename});
  });

  task.on("symbols-loader:symbols-found", ({filename, symbols}) => {
    console.log("accept?", filename, symbols);
    results[filename] = symbols;
  });

  return task;
}
