/*eslint-env mocha*/
"use strict";
var eslint = require("eslint");

function verifyAndAssertMessages(code, rules, expectedMessages) {
  var messages = eslint.linter.verify(
    code,
    {
      parser: require.resolve(".."),
      rules: rules,
      env: {
        node: true
      }
    }
  );

  if (messages.length !== expectedMessages.length) {
    throw new Error("Expected " + expectedMessages.length + " message(s), got " + messages.length + " " + JSON.stringify(messages));
  }

  messages.forEach(function (message, i) {
    var formatedMessage = message.line + ":" + message.column + " " + message.message + (message.ruleId ? " " + message.ruleId : "");
    if (formatedMessage !== expectedMessages[i]) {
      throw new Error("Message " + i + " does not match:\nExpected: " + expectedMessages[i] + "\nActual:   " + formatedMessage);
    }
  });
}

describe("verify", function () {
  it("arrow function support (issue #1)", function () {
    verifyAndAssertMessages(
      "describe('stuff', () => {});",
      {},
      []
    );
  });

  it("EOL validation (issue #2)", function () {
    verifyAndAssertMessages(
      "module.exports = \"something\";",
      { "eol-last": 1, "semi": 1 },
      [ "1:1 Newline required at end of file but not found. eol-last" ]
    );
  });

  it("Readable error messages (issue #3)", function () {
    verifyAndAssertMessages(
      "{ , res }",
      {},
      [ "1:2 Unexpected token" ]
    );
  });

  it("Modules support (issue #5)", function () {
    verifyAndAssertMessages(
      "import Foo from 'foo';\n" +
      "export default Foo;",
      {},
      []
    );
  });

  it("Rest parameters (issue #7)", function () {
    verifyAndAssertMessages(
      "function foo(...args) { return args; }",
      { "no-undef": 1 },
      []
    );
  });

  it("Exported classes should be used (issue #8)", function () {
    verifyAndAssertMessages(
      "class Foo {} module.exports = Foo;",
      { "no-unused-vars": 1 },
      []
    );
  });

  it("super keyword in class (issue #10)", function () {
    verifyAndAssertMessages(
      "class Foo { constructor() { super() } }",
      { "no-undef": 1 },
      []
    );
  });

  it("Rest parameter in destructuring assignment (issue #11)", function () {
    verifyAndAssertMessages(
      "const [a, ...rest] = ['1', '2', '3']; module.exports = rest;",
      { "no-undef": 1 },
      []
    );
  });

  it("JSX attribute names marked as variables (issue #12)", function () {
    verifyAndAssertMessages(
      "module.exports = <div className=\"foo\" />",
      { "no-undef": 1 },
      []
    );
  });

  it("Multiple destructured assignment with compound properties (issue #16)", function () {
    verifyAndAssertMessages(
      "module.exports = { ...a.a, ...a.b };",
      { "no-dupe-keys": 1 },
      []
    );
  });

  it("Arrow function with non-block bodies (issue #20)", function () {
    verifyAndAssertMessages(
      "\"use strict\"; () => 1",
      { "strict": 1 },
      []
    );
  });

  it("await keyword (issue #22)", function () {
    verifyAndAssertMessages(
      "async function foo() { await bar(); }",
      { "no-unused-expressions": 1 },
      []
    );
  });

  describe("flow", function () {
    it("check regular function", function () {
      verifyAndAssertMessages([
          "function a(b, c) { b += 1; c += 1; } a;",
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });

    it("type alias", function () {
      verifyAndAssertMessages(
        "type SomeNewType = any;",
        { "no-undef": 1 },
        []
      );
    });

    it("type cast expression #102", function () {
      verifyAndAssertMessages(
        "for (let a of (a: Array)) {}",
        {},
        []
      );
    });

    it("multiple nullable type annotations and return #108", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "function log(foo: ?Foo, foo2: ?Foo2): ?Foo3 {",
            "console.log(foo, foo2);",
          "}",
          "log(1, 2);"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("type parameters", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "function log<Foo, Foo2>() {}",
          "log();"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("nested type annotations", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "function foo(callback: () => Foo) {",
            "return callback();",
          "}",
          "foo();"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("type in var declaration", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "var x: Foo = 1;",
          "x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("object type annotation", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "var a: {numVal: Foo};",
          "a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });

    it("object property types", function () {
      verifyAndAssertMessages([
          "var a = {",
            "circle: (null : ?{ setNativeProps(props: Object): void })",
          "};",
          "a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });

    it("namespaced types", function () {
      verifyAndAssertMessages([
          "var React = require('react-native');",
          "var b = {",
            "openExternalExample: (null: ?React.Component)",
          "};",
          "var c = {",
            "render(): React.Component {}",
          "};",
          "b;",
          "c;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });

    it("ArrayTypeAnnotation", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "var x: Foo[]; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });

    it("ClassImplements", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "import type Bar from 'foo';",
          "class Foo implements Bar {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });

    it("type alias creates declaration + usage", function () {
      verifyAndAssertMessages([
          "type Foo = any;",
          "var x : Foo = 1; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1},
        []
      );
    });
  });

  it("class usage", function () {
    verifyAndAssertMessages(
      "class Lol {} module.exports = Lol;",
      { "no-unused-vars": 1 },
      []
    );
  });

  it("class properties", function () {
    verifyAndAssertMessages(
      "class Lol { foo = 'bar'; }",
      { "no-undef": 1 },
      []
    );
  });

  it("template strings #31", function () {
    verifyAndAssertMessages(
      "console.log(`${a}, b`);",
      { "comma-spacing": 1 },
      []
    );
  });

  it("template with destructuring #31", function () {
    verifyAndAssertMessages([
      "module.exports = {",
        "render() {",
          "var {name} = this.props;",
          "return Math.max(null, `Name: ${name}, Name: ${name}`);",
        "}",
      "};"].join("\n"),
      { "comma-spacing": 1 },
      []
    );
  });

  describe("decorators #72", function () {
    it("class declaration", function () {
      verifyAndAssertMessages(
        [
          "import classDeclaration from 'decorator';",
          "import decoratorParameter from 'decorator';",
          "@classDeclaration(decoratorParameter)",
          "@classDeclaration",
          "class TextareaAutosize {}"
        ].join("\n"),
        { "no-unused-vars": 1 },
        []
      );
    });

    it("method definition", function () {
      verifyAndAssertMessages(
        [
          "import classMethodDeclarationA from 'decorator';",
          "import decoratorParameter from 'decorator';",
          "class TextareaAutosize {",
            "@classMethodDeclarationA(decoratorParameter)",
            "@classMethodDeclarationA",
            "methodDeclaration(e) {",
              "e();",
            "}",
          "}"
        ].join("\n"),
        { "no-unused-vars": 1 },
        []
      );
    });

    it("method definition get/set", function () {
      verifyAndAssertMessages(
        [
          "import classMethodDeclarationA from 'decorator';",
          "import decoratorParameter from 'decorator';",
          "class TextareaAutosize {",
            "@classMethodDeclarationA(decoratorParameter)",
            "@classMethodDeclarationA",
            "get bar() { }",
            "@classMethodDeclarationA(decoratorParameter)",
            "@classMethodDeclarationA",
            "set bar() { }",
          "}"
        ].join("\n"),
        { "no-unused-vars": 1 },
        []
      );
    });

    it("object property", function () {
      verifyAndAssertMessages(
        [
          "import classMethodDeclarationA from 'decorator';",
          "import decoratorParameter from 'decorator';",
          "var obj = {",
            "@classMethodDeclarationA(decoratorParameter)",
            "@classMethodDeclarationA",
            "methodDeclaration(e) {",
              "e();",
            "}",
          "};",
          "obj;"
        ].join("\n"),
        { "no-unused-vars": 1 },
        []
      );
    });

    it("object property get/set", function () {
      verifyAndAssertMessages(
        [
          "import classMethodDeclarationA from 'decorator';",
          "import decoratorParameter from 'decorator';",
          "var obj = {",
            "@classMethodDeclarationA(decoratorParameter)",
            "@classMethodDeclarationA",
            "get bar() { },",
            "@classMethodDeclarationA(decoratorParameter)",
            "@classMethodDeclarationA",
            "set bar() { }",
          "};",
          "obj;"
        ].join("\n"),
        { "no-unused-vars": 1 },
        []
      );
    });
  });
});
