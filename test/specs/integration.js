"use strict";

const assert = require("assert");
const eslint = require("eslint");
const path = require("path");
const { lint } = require("../helpers");

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "rules");
const ERROR_LVL = 2;

const baseEslintOpts = {
  parser: require.resolve("../.."),
  parserOptions: {
    sourceType: "script",
  },
};

describe("Rules:", () => {
  describe("`strict`", () => {
    const ruleId = "strict";

    describe("when set to 'never'", () => {
      const eslintOpts = Object.assign({}, baseEslintOpts, {
        rules: {},
      });
      eslintOpts.rules[ruleId] = [ERROR_LVL, "never"];

      ["global-with", "function-with"].forEach(fixture => {
        it(`should error on ${fixture.match(/^[^-]+/)[0]} directive`, done => {
          lint(
            {
              fixture: path.join(FIXTURES_DIR, "strict", fixture),
              eslint: eslintOpts,
            },
            (err, report) => {
              if (err) return done(err);
              assert(report[0].ruleId === ruleId);
              done();
            }
          );
        });
      });
    });

    describe("when set to 'global'", () => {
      const eslintOpts = Object.assign({}, baseEslintOpts, {
        rules: {},
      });
      eslintOpts.rules[ruleId] = [ERROR_LVL, "global"];

      it("shouldn't error on single global directive", done => {
        lint(
          {
            fixture: path.join(FIXTURES_DIR, "strict", "global-with"),
            eslint: eslintOpts,
          },
          (err, report) => {
            if (err) return done(err);
            assert(!report.length);
            done();
          }
        );
      });

      it("should error twice on global directive: no and function directive: yes", done => {
        lint(
          {
            fixture: path.join(FIXTURES_DIR, "strict", "function-with"),
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

      it("should error on function directive", done => {
        lint(
          {
            fixture: path.join(
              FIXTURES_DIR,
              "strict",
              "global-with-function-with"
            ),
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

      it("should error on no directive", done => {
        lint(
          {
            fixture: path.join(FIXTURES_DIR, "strict", "none"),
            eslint: eslintOpts,
          },
          (err, report) => {
            if (err) return done(err);
            assert(report[0].ruleId === ruleId);
            done();
          }
        );
      });
    });

    describe("when set to 'function'", () => {
      const eslintOpts = Object.assign({}, baseEslintOpts, {
        rules: {},
      });
      eslintOpts.rules[ruleId] = [ERROR_LVL, "function"];

      it("shouldn't error on single function directive", done => {
        lint(
          {
            fixture: path.join(FIXTURES_DIR, "strict", "function-with"),
            eslint: eslintOpts,
          },
          (err, report) => {
            if (err) return done(err);
            assert(!report.length);
            done();
          }
        );
      });

      it("should error twice on function directive: no and global directive: yes", done => {
        lint(
          {
            fixture: path.join(
              FIXTURES_DIR,
              "strict",
              "global-with-function-without"
            ),
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

      it("should error on only global directive", done => {
        lint(
          {
            fixture: path.join(FIXTURES_DIR, "strict", "global-with"),
            eslint: eslintOpts,
          },
          (err, report) => {
            if (err) return done(err);
            assert(report[0].ruleId === ruleId);
            done();
          }
        );
      });

      it("should error on extraneous global directive", done => {
        lint(
          {
            fixture: path.join(
              FIXTURES_DIR,
              "strict",
              "global-with-function-with"
            ),
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
    });
  });
});

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
