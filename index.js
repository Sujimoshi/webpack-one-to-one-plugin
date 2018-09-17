const path = require('path');

module.exports = class OneToOnePlugin {
    constructor(opts = {}) {
        this.ignorePattern = opts.ignorePattern || /node_modules/;
        this.ignoreExternals = !!opts.ignoreExternals;
        this.path = opts.path;
    }

    shouldIgnore(path) {
        return !path || this.ignorePattern.test(path);
    }

    apply(compiler) {
        let validModules;
        compiler.hooks.afterCompile.tapAsync(
            'OneToOnePlugin',
            (compilation, cb) => {
                const { modules } = compilation;
                validModules = modules.reduce((temp, mod) => {
                    const absolutePath = mod.resource;

                    if (this.ignoreExternals && mod.external) return temp;
                    if (this.shouldIgnore(absolutePath)) return temp;

                    // Used for vendor chunk
                    if (mod.constructor.name === 'MultiModule') return temp;

                    const source = mod._source._value;
                    const projectRoot = compiler.context;
                    const out = this.path || compiler.options.output.path;

                    let dest = path.join(
                        out,
                        absolutePath.replace(projectRoot, '')
                    );

                    if(!/\.js$/.test(dest)) dest += '.js';

                    return { ...temp, [dest]: source };
                }, {});
                cb();
            }
        );
        compiler.hooks.afterEmit.tapAsync(
            'OneToOnePlugin',
            (compilation, cb) => {
                const promises = Object.keys(validModules).map((dest) => {
                    const source = validModules[dest]
                    return new Promise(function(resolve, reject) {
                        compiler.outputFileSystem.mkdirp(
                            path.dirname(dest),
                            err => {
                                if (err) return reject(err);
                                compiler.outputFileSystem.writeFile(
                                    dest,
                                    source,
                                    err => {
                                        if (err) return reject(err);
                                        resolve()
                                    }
                                );
                            }
                        );
                    })
                })

                Promise.all(promises).then(() => cb()).catch(cb);
            });
    }
};


