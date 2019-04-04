# babel-eslint [![npm](https://img.shields.io/npm/v/babel-eslint.svg)](https://www.npmjs.com/package/babel-eslint) [![travis](https://img.shields.io/travis/babel/babel-eslint/master.svg)](https://travis-ci.org/babel/babel-eslint) [![npm-downloads](https://img.shields.io/npm/dm/babel-eslint.svg)](https://www.npmjs.com/package/babel-eslint)

**babel-eslint** allows you to lint **ALL** valid Babel code with the fantastic
[ESLint](https://github.com/eslint/eslint).

## Breaking change in v11.x.x

As of the v11.x.x release, babel-eslint now requires Babel as a peer dependency and expects a valid [Babel configuration file](https://babeljs.io/docs/en/configuration) to exist. This ensures that the same Babel configuration is used during both linting and compilation.

## When should I use babel-eslint?

ESLint's default parser and core rules [only support the latest final ECMAScript standard](https://github.com/eslint/eslint/blob/a675c89573836adaf108a932696b061946abf1e6/README.md#what-about-experimental-features) and do not support experimental (such as new features) and non-standard (such as Flow or TypeScript types) syntax provided by Babel. babel-eslint is a parser that allows ESLint to run on source code that is transformed by Babel.

**Note:** You only need to use babel-eslint if you are using Babel to transform your code. If this is not the case, please use the relevant parser for your chosen flavor of ECMAScript (note that the default parser supports all non-experimental syntax as well as JSX).

## How does it work?

ESLint allows for the use of [custom parsers](https://eslint.org/docs/developer-guide/working-with-custom-parsers). When using this plugin, your code is parsed by Babel's parser (using the configuration specified in your [Babel configuration file](https://babeljs.io/docs/en/configuration)) and the resulting AST is
transformed into an [ESTree](https://github.com/estree/estree)-compliant structure that ESLint can understand. All location info such as line numbers,
columns is also retained so you can track down errors with ease.

**Note:** ESLint's core rules do not support experimental syntax and may therefore not work as expected when using babel-eslint. Please use the companion [`eslint-plugin-babel`](https://github.com/babel/eslint-plugin-babel) plugin for core rules that you have issues with.

## Usage

### Installation

```sh
$ npm install eslint babel-eslint --save-dev
# or
$ yarn add eslint babel-eslint -D
```

**Note:** babel-eslint requires `babel/core@>=7.2.0` and a valid Babel configuration file to run. If you do not have this already set up, please see the [Babel Usage Guide](https://babeljs.io/docs/en/usage).

### Setup

To use babel-eslint, `"babel-eslint"` must be specified as the `parser` in your ESLint configuration file (see [here](https://eslint.org/docs/user-guide/configuring#specifying-parser) for more detailed information).

**.eslintrc.js**

```js
module.exports = {
  parser: "babel-eslint",
};
```

With the parser set, your configuration can be configured as described in the [Configuring ESLint](https://eslint.org/docs/user-guide/configuring) documentation.

**Note:** The `parserOptions` described in the [official documentation](https://eslint.org/docs/user-guide/configuring#specifying-parser-options) are for the default parser and are not necessarily supported by babel-eslint. Please see the section directly below for supported `parserOptions`.

### Additional parser configuration

Additional configuration options can be set in your ESLint configuration under the `parserOptions` key. Please note that the `ecmaFeatures` config property may still be required for ESLint to work properly with features not in ECMAScript 5 by default.

- `requireConfigFile` (default `true`) can be set to `false` to allow babel-eslint to run on files that do not have a Babel configuration associated with them. This can be useful for linting files that are not transformed by Babel (such as tooling configuration files), though we recommend using the default parser via [glob-based configuration](https://eslint.org/docs/user-guide/configuring#configuration-based-on-glob-patterns). Note: babel-eslint will not parse any experimental syntax when no configuration file is found.
- `sourceType` can be set to `"module"`(default) or `"script"` if your code isn't using ECMAScript modules.
- `allowImportExportEverywhere` (default `false`) can be set to `true` to allow import and export declarations to appear anywhere a statement is allowed if your build environment supports that. Otherwise import and export declarations can only appear at a program's top level.
- `ecmaFeatures.globalReturn` (default `false`) allow return statements in the global scope when used with `sourceType: "script"`.
- `babelOptions` passes through Babel's configuration [loading](https://babeljs.io/docs/en/options#config-loading-options) and [merging](https://babeljs.io/docs/en/options#config-merging-options) options (for instance, in case of a monorepo). When not defined, babel-eslint will use Babel's default configuration file resolution logic.

**.eslintrc.js**

```js
module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module",
    allowImportExportEverywhere: false,
    ecmaFeatures: {
      globalReturn: false,
    },
    babelOptions: {
      configFile: "path/to/config.js",
    },
  },
};
```

**.eslintrc.js using glob-based configuration**

This configuration would use the default parser for all files except for those found by the `"files/transformed/by/babel/*.js"` glob.

```js
module.exports = {
  rules: {
    indent: "error"
  },
  overrides: [
    {
      files: ["files/transformed/by/babel/*.js"],
      parser: "babel-eslint",
    }
  ]
};
```

### Run

```sh
$ ./node_modules/.bin/eslint yourfile.js
```

## Known issues

Flow:

> Check out [eslint-plugin-flowtype](https://github.com/gajus/eslint-plugin-flowtype): An `eslint` plugin that makes flow type annotations global variables and marks declarations as used. Solves the problem of false positives with `no-undef` and `no-unused-vars`.

- `no-undef` for global flow types: `ReactElement`, `ReactClass` [#130](https://github.com/babel/babel-eslint/issues/130#issuecomment-111215076)
  - Workaround: define types as globals in `.eslintrc` or define types and import them `import type ReactElement from './types'`
- `no-unused-vars/no-undef` with Flow declarations (`declare module A {}`) [#132](https://github.com/babel/babel-eslint/issues/132#issuecomment-112815926)

Modules/strict mode

- `no-unused-vars: ["error", { vars: local }]` [#136](https://github.com/babel/babel-eslint/issues/136)

Please check out [eslint-plugin-react](https://github.com/yannickcr/eslint-plugin-react) for React/JSX issues.

- `no-unused-vars` with jsx

Please check out [eslint-plugin-babel](https://github.com/babel/eslint-plugin-babel) for other issues.

## Questions and support

If you have an issue, please first check if it can be reproduced with the default parser and with the latest versions of `eslint` and `babel-eslint`. If it is not reproducible with the default parser, it is most likely an issue with babel-eslint.

For questions and support please visit the [`#discussion`](https://babeljs.slack.com/messages/discussion/) Babel Slack channel (sign up [here](https://github.com/babel/notes/issues/38)) or the ESLint [Gitter](https://gitter.im/eslint/eslint).
