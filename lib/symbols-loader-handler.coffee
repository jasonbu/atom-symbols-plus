# REF: https://raw.githubusercontent.com/atom/fuzzy-finder/master/lib/load-paths-handler.coffee

async = require 'async'
fs = require 'fs'
path = require 'path'
_ = require 'underscore-plus'
{GitRepository} = require 'atom'
{Minimatch} = require 'minimatch'

# NOTE: The idea is to eventually abstract this so a different kind of
#       symbol provider could be used (aside from the default grammar-based
#       provider) on a per-scope basis
symbolGenerator = require "./generator"

class PathLoader
  constructor: (@rootPath, ignoreVcsIgnores, @traverseSymlinkDirectories, @ignoredNames) ->
    # @paths = []
    @realPathCache = {}
    @repo = null
    if ignoreVcsIgnores
      repo = GitRepository.open(@rootPath, refreshOnWindowFocus: false)
      @repo = repo if repo?.relativize(path.join(@rootPath, 'test')) is 'test'

  load: (done) ->
    @loadPath @rootPath, =>
      # @flushPaths()
      @repo?.destroy()
      done()

  isIgnored: (loadedPath) ->
    relativePath = path.relative(@rootPath, loadedPath)
    if @repo?.isPathIgnored(relativePath)
      true
    else
      for ignoredName in @ignoredNames
        return true if ignoredName.match(relativePath)

  pathLoaded: ({filename, stats}, done) ->
    unless @isIgnored(filename)
      emit('symbols-loader:path-found', {filename})

      # @paths.push(loadedPath)
      # emittedPaths.add(loadedPath)

    # if @paths.length is PathsChunkSize
    #   @flushPaths()
    done()

  # flushPaths: ->
  #   emit('load-paths:paths-found', @paths)
  #   @paths = []

  loadPath: (pathToLoad, done) ->
    return done() if @isIgnored(pathToLoad)
    fs.lstat pathToLoad, (error, stats) =>
      return done() if error?
      if stats.isSymbolicLink()
        @isInternalSymlink pathToLoad, (isInternal) =>
          return done() if isInternal
          fs.stat pathToLoad, (error, stats) =>
            return done() if error?
            if stats.isFile()
              @pathLoaded({filename: pathToLoad, stats}, done)
            else if stats.isDirectory()
              if @traverseSymlinkDirectories
                @loadFolder(pathToLoad, done)
              else
                done()
            else
              done()
      else if stats.isDirectory()
        @loadFolder(pathToLoad, done)
      else if stats.isFile()
        @pathLoaded({filename: pathToLoad, stats}, done)
      else
        done()

  loadFolder: (folderPath, done) ->
    fs.readdir folderPath, (error, children=[]) =>
      async.each(
        children,
        (childName, next) =>
          @loadPath(path.join(folderPath, childName), next)
        done
      )

  isInternalSymlink: (pathToLoad, done) ->
    fs.realpath pathToLoad, @realPathCache, (err, realPath) =>
      if err
        done(false)
      else
        done(realPath.search(@rootPath) is 0)

module.exports = (rootPaths, followSymlinks, ignoreVcsIgnores, ignores=[]) ->
  ignoredNames = []
  for ignore in ignores when ignore
    try
      ignoredNames.push(new Minimatch(ignore, matchBase: true, dot: true))
    catch error
      console.warn "Error parsing ignore pattern (#{ignore}): #{error.message}"

  done = this.async();

  queue = async.queue (({filename, grammar}, next) ->
    symbolGenerator.getSymbolsForFile filename, grammar, (symbols) ->
      emit("symbols-loader:symbols-found", {filename, symbols})
      next()
  ), 25

  process.on "message", (task) ->
    queue.push(task)

  async.each(
    rootPaths,
    (rootPath, next) ->
      new PathLoader(
        rootPath,
        ignoreVcsIgnores,
        followSymlinks,
        ignoredNames
      ).load(next)
    () ->
      # Do nothing.. yet
      # FIXME: This causes the task to end after the first file is procesed
      queue.drain = ->
        done();
  )
