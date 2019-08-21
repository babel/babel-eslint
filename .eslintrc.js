"use strict";

const config = require("eslint-config-babel");

module.exports = {
  root: true,
  parser: "./lib",
  extends: config.extends,
  plugins: config.plugins.concat(["prettier"]),
  rules: Object.assign(config.rules, {
    "max-len": "off",
    strict: "error",
    "prettier/prettier": "error",
  }),
  env: Object.assign(config.env, {
    node: true,
  }),
  parserOptions: Object.assign(config.parserOptions, {
    sourceType: "script",
  }),
  globals: config.globals,
  overrides: [
    {
      files: ["test/**/*"],
      env: {
        mocha: true,
      },
    },
  ],
};
