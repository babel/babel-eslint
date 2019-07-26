"use strict";

const eslint = require("eslint");
const unpad = require("dedent");

const parser = require("../..");

function verifyAndAssertMessagesWithSpecificESLint(
  code,
  rules,
  expectedMessages,
  sourceType,
  overrideConfig,
  linter
) {
  const config = {
    parser: "current-babel-eslint",
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
    const expectedMessage = expectedMessages[i];
    if (typeof expectedMessage === "string") {
      if (formatedMessage !== expectedMessage) {
        throw new Error(
          `
          Message ${i} does not match:
          Expected: ${expectedMessage}
          Actual:   ${formatedMessage}
        `
        );
      }
    } else if (
      typeof expectedMessage === "object" &&
      expectedMessage !== null &&
      typeof expectedMessage.matcher === "function" &&
      typeof expectedMessage.message === "string"
    ) {
      if (!expectedMessage.matcher(formatedMessage)) {
        throw new Error(
          `
          Message ${i} does not match:
          Expected: ${expectedMessage.message}
          Actual:   ${formatedMessage}
        `
        );
      }
    } else {
      throw new Error(
        "expected messages must be string or object { matcher: function, message: string }: " +
          i +
          " -> " +
          typeof expectedMessage[i]
      );
    }
  });
}

function verifyAndAssertMessages(
  code,
  rules,
  expectedMessages,
  sourceType,
  overrideConfig
) {
  const linter = new eslint.Linter();
  linter.defineParser("current-babel-eslint", parser);

  verifyAndAssertMessagesWithSpecificESLint(
    unpad(`${code}`),
    rules || {},
    expectedMessages || [],
    sourceType,
    overrideConfig,
    linter
  );
}

describe("babel options", () => {
  it("uses the plugins and presets specified in the options", () => {
    const code = "class AClass { classProp = 123 };";

    const rules = { "no-unused-vars": 1, semi: 1 };

    const babelOptions = {
      root: __dirname,
      rootMode: "root",
      babelrc: false,
      presets: ["@babel/preset-env"],
      plugins: [],
    };

    verifyAndAssertMessages(
      code,
      rules,
      [
        {
          matcher: message => message.startsWith("1:25 Parsing error:"),
          message: "1:25 Parsing error: <path> <rest of message>",
        },
      ],
      undefined,
      {
        parserOptions: {
          requireConfigFile: false,
          babelOptions: {
            ...babelOptions,
            presets: ["@babel/preset-env"],
            plugins: [],
          },
        },
      }
    );

    verifyAndAssertMessages(
      code,
      rules,
      ["1:7 'AClass' is defined but never used. no-unused-vars"],
      undefined,
      {
        parserOptions: {
          requireConfigFile: false,
          babelOptions: {
            ...babelOptions,
            presets: ["@babel/preset-env"],
            plugins: ["@babel/plugin-proposal-class-properties"],
          },
        },
      }
    );
  });
});
