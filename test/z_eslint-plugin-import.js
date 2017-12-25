"use strict";

const eslint = require("eslint");

describe("https://github.com/babel/babel-eslint/issues/558", () => {
  it("don't crash with eslint-plugin-import", () => {
    const engine = new eslint.CLIEngine({ ignore: false });
    engine.executeOnFiles([
      "test/fixtures/eslint-plugin-import/a.js",
      "test/fixtures/eslint-plugin-import/b.js",
      "test/fixtures/eslint-plugin-import/c.js",
    ]);
  });
});
