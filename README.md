# webpack-one-to-one-plugin
Allow to make webpack build without bundling to one file. This plugin will emit all files in the dependency tree to `output.path` as separate files.

Fork of [this plugin](https://github.com/DrewML/webpack-emit-all-plugin), but with some fixes and refactoring, also support webpack 3 and webpack 4

## Install
```sh
npm install -D webpack-one-to-one-plugin
```

## Usage
In your `webpack.config.js`:
```js
const path = require('path');
const OneToOnePlugin = require('webpack-one-to-one-plugin');
{
    plugins: [
        new OneToOnePlugin({
            ignorePattern: /node_modules/ // default,
            path: path.join(__dirname, 'unbundled-out') // defaults to `output.path`
        })
    ]
}
```
