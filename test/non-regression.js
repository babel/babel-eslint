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
        { "no-unused-vars": 1, "no-undef": 1 },
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
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("object property types", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var a = {",
            "circle: (null : ?{ setNativeProps(props: Foo): Foo2 })",
          "};",
          "a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
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
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("ArrayTypeAnnotation", function () {
      verifyAndAssertMessages([
          "import type Foo from 'foo';",
          "var x: Foo[]; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("ClassImplements", function () {
      verifyAndAssertMessages([
          "import type Bar from 'foo';",
          "export default class Foo implements Bar {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("type alias creates declaration + usage", function () {
      verifyAndAssertMessages([
          "type Foo = any;",
          "var x : Foo = 1; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("type alias with type parameters", function () {
      verifyAndAssertMessages([
          "import type Bar from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "type Foo<Foo2> = Bar<Foo3>",
          "var x : Foo = 1; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("export type alias", function () {
      verifyAndAssertMessages([
          "import type Foo2 from 'foo';",
          "export type Foo = Foo2;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("polymorphpic types #109", function () {
      verifyAndAssertMessages([
          "export default function groupByEveryN<T>(array: Array<T>, n: number): Array<Array<?T>> {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("types definition from import", function () {
      verifyAndAssertMessages([
          "import type Promise from 'bluebird';",
          "type Operation = () => Promise;",
          "x: Operation;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("polymorphpic/generic types for class #123", function () {
      verifyAndAssertMessages([
          "class Box<T> {",
            "value: T;",
          "}",
          "var box = new Box();",
          "console.log(box.value);"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("polymorphpic/generic types for function #123", function () {
      verifyAndAssertMessages([
          "export function identity<T>(value) {",
            "var a: T = value; a;",
          "}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("1", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default function(a: Foo, b: ?Foo2, c){ a; b; c; }"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("2", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "export default function(a: () => Foo){ a; }"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("3", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default function(a: (_:Foo) => Foo2){ a; }"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("4", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "export default function(a: (_1:Foo, _2:Foo2) => Foo3){ a; }"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("5", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default function(a: (_1:Foo, ...foo:Array<Foo2>) => number){ a; }"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("6", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "export default function(): Foo {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("7", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "export default function():() => Foo {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("8", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default function():(_?:Foo) => Foo2{}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("9", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default function <Foo, Foo2>() {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("10", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var a=function<Foo,Foo2>() {}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("11", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a={*id<Foo>(x: Foo2): Foo3 { x; }}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("12", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a={async id<Foo>(x: Foo2): Foo3 { x; }}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("13", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a={123<Foo>(x: Foo2): Foo3 { x; }}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("14", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default class Bar {set fooProp(value:Foo):Foo2{ value; }}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("15", function () {
      verifyAndAssertMessages(
        [
          "import type Foo2 from 'foo';",
          "export default class Foo {get fooProp(): Foo2{}}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("16", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var numVal:Foo; numVal;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("17", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: {numVal: Foo;}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("18", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a: ?{numVal: Foo; [indexer: Foo2]: Foo3}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("19", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var a: {numVal: Foo; subObj?: ?{strVal: Foo2}}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("20", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "import type Foo4 from 'foo';",
          "var a: { [a: Foo]: Foo2; [b: Foo3]: Foo4; }; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("21", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a: {add(x:Foo, ...y:Array<Foo2>): Foo3}; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("22", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a: { id<Foo>(x: Foo2): Foo3; }; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("23", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a:Array<Foo> = [1, 2, 3]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("24", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import Baz from 'foo';",
          "export default class Bar<Foo> extends Baz<Foo2> { };"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("25", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "export default class Bar<Foo> { bar<Foo2>():Foo3 { return 42; }}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("26", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "export default class Bar { static prop1:Foo; prop2:Foo2; }"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("27", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var x : Foo | Foo2 = 4; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("28", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var x : () => Foo | () => Foo2; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("29", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var x: typeof Foo | number = Foo2; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("30", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var {x}: {x: Foo; } = { x: 'hello' }; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("31", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var [x]: Array<Foo> = [ 'hello' ]; x;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("32", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "export default function({x}: { x: Foo; }) {}"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("33", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "function foo([x]: Array<Foo>) { x; } foo();"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("34", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var a: Map<Foo, Array<Foo2> >; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("35", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: ?Promise<Foo>[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("36", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "var a:(...rest:Array<Foo>) => Foo2; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("37", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "import type Foo4 from 'foo';",
          "var a: <Foo>(x: Foo2, ...y:Foo3[]) => Foo4; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("38", function () {
      verifyAndAssertMessages(
        [
          "import type {foo, bar} from 'baz';",
          "foo; bar;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("39", function () {
      verifyAndAssertMessages(
        [
          "import type {foo as bar} from 'baz';",
          "bar;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("40", function () {
      verifyAndAssertMessages(
        [
          "import type from 'foo';",
          "type;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("41", function () {
      verifyAndAssertMessages(
        [
          "import type, {foo} from 'bar';",
          "type; foo;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("42", function () {
      verifyAndAssertMessages(
        [
          "import type * as namespace from 'bar';",
          "namespace;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("43", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: Foo[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("44", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: ?Foo[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("45", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: (?Foo)[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("46", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: () => Foo[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("47", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: (() => Foo)[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("48", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "var a: typeof Foo[]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("49", function () {
      verifyAndAssertMessages(
        [
          "import type Foo from 'foo';",
          "import type Foo2 from 'foo';",
          "import type Foo3 from 'foo';",
          "var a : [Foo, Foo2<Foo3>,] = [123, 'duck',]; a;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
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

  it("class definition: gaearon/redux#24", function () {
    verifyAndAssertMessages([
        "export default function root(stores) {",
          "return DecoratedComponent => class ReduxRootDecorator {",
            "a() { DecoratedComponent; }",
          "};",
        "}",
      ].join("\n"),
      { "no-undef": 1, "no-unused-vars": 1 },
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

  describe("comprehensions", function () {
    it("array #9", function () {
      verifyAndAssertMessages([
          "let arr = [1, 2, 3];",
          "let b = [for (e of arr) String(e)]; b;"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("array, if statement, multiple blocks", function () {
      verifyAndAssertMessages([
          "let arr = [1, 2, 3];",
          "let arr2 = [1, 2, 3];",
          "[for (x of arr) for (y of arr2) if (x === true && y === true) x + y];"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("expression, if statement, multiple blocks", function () {
      verifyAndAssertMessages([
          "let arr = [1, 2, 3];",
          "let arr2 = [1, 2, 3];",
          "(for (x of arr) for (y of arr2) if (x === true && y === true) x + y)"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });

    it("ArrayPattern", function () {
      verifyAndAssertMessages([
          "let arr = [1, 2, 3];",
          "let arr2 = [1, 2, 3];",
          "[for ([,x] of arr) for ({[start.x]: x, [start.y]: y} of arr2) x]"
        ].join("\n"),
        { "no-unused-vars": 1, "no-undef": 1 },
        []
      );
    });
  });

  describe("decorators #72", function () {
    it("class declaration", function () {
      verifyAndAssertMessages(
        [
          "import classDeclaration from 'decorator';",
          "import decoratorParameter from 'decorator';",
          "@classDeclaration(decoratorParameter)",
          "@classDeclaration",
          "export class TextareaAutosize {}"
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
          "export class TextareaAutosize {",
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
          "export class TextareaAutosize {",
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

  it("detects minimal no-unused-vars case #120", function () {
    verifyAndAssertMessages(
      "var unused;",
      { "no-unused-vars": 1 },
      [ "1:4 unused is defined but never used no-unused-vars" ]
    );
  });

  it("visits excluded properties left of spread #95", function () {
    verifyAndAssertMessages(
      "var originalObject = {}; var {field1, field2, ...clone} = originalObject;",
      { "no-undef": 1, "no-unused-vars": 1 },
      []
    )
  });
});
