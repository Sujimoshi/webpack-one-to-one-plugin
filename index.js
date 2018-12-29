const path = require('path')

module.exports = class OneToOnePlugin {
  constructor (opts = {}) {
    this.ignorePattern = opts.ignorePattern || /node_modules/
    this.ignoreExternals = !!opts.ignoreExternals
    this.outputPath = opts.path
    this.validModules = {}
    this.context = opts.context || null
  }

  shouldIgnore (pathName) {
    return !pathName || this.ignorePattern.test(pathName)
  }

  shouldProduceSourceMap () {
    const sourceMapType = this.compiler.options.devtool
    if (!sourceMapType) return false
    if (sourceMapType === 'source-map') return true
    throw new Error('OneToOnePlugin works only with `devtool = "source-map"`')
  }

  /**
     * After compile occurs after each iteration of transpiling
     *
     * Here we get transpiled code and write it in
     * 'this.validModules' HashMap: {[path_to_module]: 'transpiled source code'}
     * @param {Object} compilation
     * @param {Function} cb
     */
  handleAfterCompile (compilation, cb) {
    const { modules } = compilation
    modules.forEach((mod) => {
      const absolutePath = mod.resource // Absolute path to module

      if (this.ignoreExternals && mod.external) return // Ignore external modules
      if (this.shouldIgnore(absolutePath)) return // Ignore patterned modules

      // Used for vendor chunk
      if (mod.constructor.name === 'MultiModule') return

      let dest = path.join(this.outputPath, absolutePath.replace(this.context, '')) // Calculating output path of module
      if (!/\.js$/.test(dest)) dest += '.js' // All modules after transpilation should be js files

      // Saving transpiled source code to temp variable, later (handleAfterEmit) we will record it to output folder
      this.validModules[dest] = mod._source
    })
    cb()
  }

  /**
     * After emmit hook, calls only once, after transpilation has ended
     * and all bundles has been written to output directory.
     *
     * Here we take keys(path to module) and values(transpiled source code) of 'this.validModules' map
     * and write transpiled source code to output directory
     * @param {Object} compilation
     * @param {Function} cb
     */
  handleAfterEmit (compilation, cb) {
    const promises = Object.keys(this.validModules).map((dest) => {
      const source = this.validModules[dest]
      const fileName = path.basename(dest)
      const enableSourceMap = this.shouldProduceSourceMap()
      return new Promise((resolve, reject) => {
        this.compiler.outputFileSystem.mkdirp(path.dirname(dest), err => {
          if (err) return reject(err)
          // Write Trinspiled source to output folder
          const transpiledSource = enableSourceMap
            ? source._value + `\n //# sourceMappingURL=${fileName}.map`
            : source._value
          this.compiler.outputFileSystem
            .writeFile(dest, transpiledSource, err => {
              if (err) return reject(err)
              if (enableSourceMap) {
                const sourceMap = source.map()
                sourceMap.file = fileName
                sourceMap.sources = sourceMap.sources.map(el => path.relative(path.dirname(dest), el))
                // Write source maps
                this.compiler.outputFileSystem.writeFile(dest + '.map', JSON.stringify(sourceMap), err => {
                  if (err) return reject(err)
                  resolve()
                })
              }
            })
        })
      })
    })
    // Since writeFile and mkdirp async functions, we wait until all writings will be done
    Promise.all(promises).then(() => cb()).catch(cb)
  }

  apply (compiler) {
    this.compiler = compiler
    this.context = this.context || this.compiler.options.context
    this.outputPath = this.outputPath || this.compiler.options.output.path

    // Subscribing on Webpack compiler events. More: https://webpack.js.org/api/compiler-hooks/
    if (this.compiler.hooks) { // For webpack 4 compability
      this.compiler.hooks.afterCompile.tapAsync('OneToOnePlugin', this.handleAfterCompile.bind(this))
      this.compiler.hooks.afterEmit.tapAsync('OneToOnePlugin', this.handleAfterEmit.bind(this))
    } else if (this.compiler.plugin) { // For webpack 3 compability
      this.compiler.plugin('after-compile', this.handleAfterCompile.bind(this))
      this.compiler.plugin('after-emit', this.handleAfterEmit.bind(this))
    }
  }
}
