"use strict";

const assert = require("assert");
const eslint = require("eslint");
const fs = require("fs");
const path = require("path");

const parser = require("../..");

eslint.linter.defineParser("current-babel-eslint", parser);

const paths = {
  fixtures: path.join(__dirname, "..", "fixtures", "rules"),
};

const encoding = "utf8";
const errorLevel = 2;

const baseEslintOpts = {
  parser: "current-babel-eslint",
  parserOptions: {
    sourceType: "script",
  },
};

/**
 * Load a fixture and run eslint.linter.verify() on it.
 * Pass the return value to done().
 * @param object opts
 * @param function done
 */
function lint(opts, done) {
  readFixture(opts.fixture, (err, src) => {
    if (err) return done(err);
    done(null, eslint.linter.verify(src, opts.eslint));
  });
}

/**
 * Read a fixture file, passing the content to done().
 * @param string|array id
 * @param function done
 */
function readFixture(id, done) {
  if (Array.isArray(id)) id = path.join.apply(path, id);
  if (!path.extname(id)) id += ".js";
  fs.readFile(path.join(paths.fixtures, id), encoding, done);
}
// readFixture

describe("Rules:", () => {
  describe("`strict`", strictSuite);
});
// describe

function strictSuite() {
  const ruleId = "strict";

  describe("when set to 'never'", () => {
    const eslintOpts = Object.assign({}, baseEslintOpts, {
      rules: {},
    });
    eslintOpts.rules[ruleId] = [errorLevel, "never"];

    ["global-with", "function-with"].forEach(fixture => {
      it(`should error on ${fixture.match(/^[^-]+/)[0]} directive`, done => {
        lint(
          {
            fixture: ["strict", fixture],
            eslint: eslintOpts,
          },
          (err, report) => {
            if (err) return done(err);
            assert(report[0].ruleId === ruleId);
            done();
          }
        );
      });
      // it
    });
  });
  // describe

  describe("when set to 'global'", () => {
    const eslintOpts = Object.assign({}, baseEslintOpts, {
      rules: {},
    });
    eslintOpts.rules[ruleId] = [errorLevel, "global"];

    it("shouldn't error on single global directive", done => {
      lint(
        {
          fixture: ["strict", "global-with"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          assert(!report.length);
          done();
        }
      );
    });
    // it

    it("should error twice on global directive: no and function directive: yes", done => {
      lint(
        {
          fixture: ["strict", "function-with"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          [0, 1].forEach(i => {
            assert(report[i].ruleId === ruleId);
          });
          done();
        }
      );
    });
    // it

    it("should error on function directive", done => {
      lint(
        {
          fixture: ["strict", "global-with-function-with"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          assert(report[0].ruleId === ruleId);

          // This is to make sure the test fails prior to adapting Babel AST
          // directive representation to ESLint format. Otherwise it reports an
          // error for missing global directive that masquerades as the expected
          // result of the previous assertion.
          assert(report[0].nodeType !== "Program");
          done();
        }
      );
    });
    // it

    it("should error on no directive", done => {
      lint(
        {
          fixture: ["strict", "none"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          assert(report[0].ruleId === ruleId);
          done();
        }
      );
    });
    // it
  });
  // describe

  describe("when set to 'function'", () => {
    const eslintOpts = Object.assign({}, baseEslintOpts, {
      rules: {},
    });
    eslintOpts.rules[ruleId] = [errorLevel, "function"];

    it("shouldn't error on single function directive", done => {
      lint(
        {
          fixture: ["strict", "function-with"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          assert(!report.length);
          done();
        }
      );
    });
    // it

    it("should error twice on function directive: no and global directive: yes", done => {
      lint(
        {
          fixture: ["strict", "global-with-function-without"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          [0, 1].forEach(i => {
            assert(report[i].ruleId === ruleId);
          });
          done();
        }
      );
    });
    // it

    it("should error on only global directive", done => {
      lint(
        {
          fixture: ["strict", "global-with"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          assert(report[0].ruleId === ruleId);
          done();
        }
      );
    });
    // it

    it("should error on extraneous global directive", done => {
      lint(
        {
          fixture: ["strict", "global-with-function-with"],
          eslint: eslintOpts,
        },
        (err, report) => {
          if (err) return done(err);
          assert(report[0].ruleId === ruleId);
          assert(report[0].nodeType.indexOf("Function") === -1);
          done();
        }
      );
    });
    // it
  });
}

describe("https://github.com/babel/babel-eslint/issues/558", () => {
  it("doesn't crash with eslint-plugin-import", () => {
    const engine = new eslint.CLIEngine({ ignore: false });
    engine.executeOnFiles([
      "fixtures/eslint-plugin-import/a.js",
      "fixtures/eslint-plugin-import/b.js",
      "fixtures/eslint-plugin-import/c.js",
    ]);
  });
});
