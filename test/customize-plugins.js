const assert = require("assert");
const CLIEngine = require("eslint").CLIEngine;

describe("support customizing plugins via parser options", () => {
  it("remove flow if typescript is existed", () => {
    const code = "function fn(arg: ?number) {}";
    const cli = new CLIEngine({
      parser: require.resolve("../lib"),
      parserOptions: {
        plugins: ["typescript"],
      },
      useEslintrc: false,
    });

    const report = cli.executeOnText(code);
    assert.strictEqual(report.errorCount, 1);
    assert.ok(
      report.results[0].messages[0].message.includes("Unexpected token")
    );
  });

  it("support excluding specific plugins", () => {
    const cli = new CLIEngine({
      parser: require.resolve("../lib"),
      parserOptions: {
        excludePlugins: ["flow", "dynamicImport"],
      },
      useEslintrc: false,
    });

    let report = cli.executeOnText("function fn(arg: ?number) {}");
    assert.strictEqual(report.errorCount, 1);
    assert.ok(
      report.results[0].messages[0].message.includes("Unexpected token")
    );

    report = cli.executeOnText('import(".")');
    assert.strictEqual(report.errorCount, 1);
    assert.ok(report.results[0].messages[0].message.includes("experimental"));
  });
});
