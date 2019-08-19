"use strict";

const config = require("eslint-config-babel");

module.exports = {
  root: true,
  extends: config.extends,
  plugins: config.plugins.concat(["prettier"]),
  rules: Object.assign(config.rules, {
    "no-var": 0,
    "max-len": 0,
    "prettier/prettier": "error",
  }),
  env: Object.assign(config.env, {
    node: true,
    mocha: true,
  }),
  parserOptions: config.parserOptions,
  globals: config.globals,
};
