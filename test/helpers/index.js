"use strict";

const fs = require("fs");
const path = require("path");
const unpad = require("dedent");
const eslint = require("eslint");
const espree = require("espree");
const babelEslint = require("../..");

// Checks if the source ast implements the target ast. Ignores extra keys on source ast.
function assertImplementsAST(target, source, path) {
  if (!path) {
    path = [];
  }

  function error(text) {
    const err = new Error(`At ${path.join(".")}: ${text}:`);
    err.depth = path.length + 1;
    throw err;
  }

  const typeA = target === null ? "null" : typeof target;
  const typeB = source === null ? "null" : typeof source;
  if (typeA !== typeB) {
    error(
      `have different types (${typeA} !== ${typeB}) (${target} !== ${source})`
    );
  } else if (
    typeA === "object" &&
    ["RegExp"].indexOf(target.constructor.name) !== -1 &&
    target.constructor.name !== source.constructor.name
  ) {
    error(
      `object have different constructors (${target.constructor.name} !== ${
        source.constructor.name
      }`
    );
  } else if (typeA === "object") {
    const keysTarget = Object.keys(target);
    for (const i in keysTarget) {
      const key = keysTarget[i];
      path.push(key);
      assertImplementsAST(target[key], source[key], path);
      path.pop();
    }
  } else if (target !== source) {
    error(
      `are different (${JSON.stringify(target)} !== ${JSON.stringify(source)})`
    );
  }
}

function parseAndAssertSame(code) {
  code = unpad(code);
  const esAST = espree.parse(code, {
    ecmaFeatures: {
      // enable JSX parsing
      jsx: true,
      // enable return in global scope
      globalReturn: true,
      // enable implied strict mode (if ecmaVersion >= 5)
      impliedStrict: true,
      // allow experimental object rest/spread
      experimentalObjectRestSpread: true,
    },
    tokens: true,
    loc: true,
    range: true,
    comment: true,
    ecmaVersion: 2018,
    sourceType: "module",
  });
  const babylonAST = babelEslint.parseForESLint(code).ast;
  assertImplementsAST(esAST, babylonAST);
}

function lintAndAssertMessages(
  code,
  rules = {},
  expectedMessages = [],
  sourceType,
  overrideConfig
) {
  code = unpad(`${code}`);
  const linter = new eslint.Linter();
  const config = {
    parser: require.resolve("../.."),
    rules,
    env: {
      node: true,
      es6: true,
    },
    parserOptions: {
      sourceType,
      ecmaFeatures: {
        globalReturn: true,
      },
    },
  };

  if (overrideConfig) {
    for (const key in overrideConfig) {
      config[key] = overrideConfig[key];
    }
  }

  const messages = linter.verify(code, config);

  if (messages.length !== expectedMessages.length) {
    throw new Error(
      `Expected ${expectedMessages.length} message(s), got ${
        messages.length
      }\n${JSON.stringify(messages, null, 2)}`
    );
  }

  messages.forEach((message, i) => {
    const formatedMessage = `${message.line}:${message.column} ${
      message.message
    }${message.ruleId ? ` ${message.ruleId}` : ""}`;
    if (formatedMessage !== expectedMessages[i]) {
      throw new Error(
        `
          Message ${i} does not match:
          Expected: ${expectedMessages[i]}
          Actual:   ${formatedMessage}
        `
      );
    }
  });
}

function readFixture(filePath, done) {
  if (!path.extname(filePath)) {
    filePath += ".js";
  }
  fs.readFile(filePath, "utf8", done);
}

function lint(opts, done) {
  readFixture(opts.fixture, (err, src) => {
    if (err) return done(err);
    done(null, eslint.linter.verify(src, opts.eslint));
  });
}

module.exports = {
  parseAndAssertSame,
  lintAndAssertMessages,
  lint,
};
