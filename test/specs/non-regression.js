"use strict";

const path = require("path");
const { lintAndAssertMessages } = require("../helpers");

describe("verify", () => {
  it("arrow function support (issue #1)", () => {
    lintAndAssertMessages("describe('stuff', () => {});");
  });

  it("EOL validation (issue #2)", () => {
    lintAndAssertMessages(
      'module.exports = "something";',
      { "eol-last": 1, semi: 1 },
      ["1:30 Newline required at end of file but not found. eol-last"]
    );
  });

  xit("Readable error messages (issue #3)", () => {
    lintAndAssertMessages("{ , res }", {}, [
      "1:3 Parsing error: Unexpected token",
    ]);
  });

  it("Modules support (issue #5)", () => {
    lintAndAssertMessages(
      `
        import Foo from 'foo';
        export default Foo;
        export const c = 'c';
        export class Store {}
      `
    );
  });

  it("Rest parameters (issue #7)", () => {
    lintAndAssertMessages("function foo(...args) { return args; }", {
      "no-undef": 1,
    });
  });

  it("Exported classes should be used (issue #8)", () => {
    lintAndAssertMessages("class Foo {} module.exports = Foo;", {
      "no-unused-vars": 1,
    });
  });

  it("super keyword in class (issue #10)", () => {
    lintAndAssertMessages("class Foo { constructor() { super() } }", {
      "no-undef": 1,
    });
  });

  it("Rest parameter in destructuring assignment (issue #11)", () => {
    lintAndAssertMessages(
      "const [a, ...rest] = ['1', '2', '3']; module.exports = rest;",
      { "no-undef": 1 }
    );
  });

  it("JSX attribute names marked as variables (issue #12)", () => {
    lintAndAssertMessages('module.exports = <div className="foo" />', {
      "no-undef": 1,
    });
  });

  it("Multiple destructured assignment with compound properties (issue #16)", () => {
    lintAndAssertMessages("module.exports = { ...a.a, ...a.b };", {
      "no-dupe-keys": 1,
    });
  });

  it("Arrow function with non-block bodies (issue #20)", () => {
    lintAndAssertMessages(
      '"use strict"; () => 1',
      { strict: [1, "global"] },
      [],
      "script"
    );
  });

  it("#242", () => {
    lintAndAssertMessages('"use strict"; asdf;', {
      "no-irregular-whitespace": 1,
    });
  });

  it("await keyword (issue #22)", () => {
    lintAndAssertMessages("async function foo() { await bar(); }", {
      "no-unused-expressions": 1,
    });
  });

  it("arrow functions (issue #27)", () => {
    lintAndAssertMessages("[1, 2, 3].map(i => i * 2);", {
      "func-names": 1,
      "space-before-blocks": 1,
    });
  });

  it("comment with padded-blocks (issue #33)", () => {
    lintAndAssertMessages(
      `
        if (a) {
          // i'm a comment!
          let b = c
        }
      `,
      { "padded-blocks": [1, "never"] }
    );
  });

  describe("flow", () => {
    it("check regular function", () => {
      lintAndAssertMessages(
        "function a(b, c) { b += 1; c += 1; return b + c; } a;",
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("type alias", () => {
      lintAndAssertMessages("type SomeNewType = any;", { "no-undef": 1 });
    });

    it("type cast expression #102", () => {
      lintAndAssertMessages("for (let a of (a: Array)) {}");
    });

    it("multiple nullable type annotations and return #108", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          function log(foo: ?Foo, foo2: ?Foo2): ?Foo3 {
            console.log(foo, foo2);
          }
          log(1, 2);
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("interface declaration", () => {
      lintAndAssertMessages(
        `
          interface Foo {};
          interface Bar {
            foo: Foo,
          };
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:11 'Bar' is defined but never used. no-unused-vars"]
      );
    });

    it("type parameter bounds (classes)", () => {
      lintAndAssertMessages(
        `
          import type {Foo, Foo2} from 'foo';
          import Base from 'base';
          class Log<T1: Foo, T2: Foo2, T3, T4> extends Base<T3> {
            messages: {[T1]: T2};
          }
          new Log();
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["3:34 'T4' is defined but never used. no-unused-vars"]
      );
    });

    it("type parameter scope (classes)", () => {
      lintAndAssertMessages(
        `
          T;
          class Foo<T> {}
          T;
          new Foo();
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "1:1 'T' is not defined. no-undef",
          "2:11 'T' is defined but never used. no-unused-vars",
          "3:1 'T' is not defined. no-undef",
        ]
      );
    });

    it("type parameter bounds (interfaces)", () => {
      lintAndAssertMessages(
        `
          import type {Foo, Foo2, Bar} from '';
          interface Log<T1: Foo, T2: Foo2, T3, T4> extends Bar<T3> {
            messages: {[T1]: T2};
          }
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "2:11 'Log' is defined but never used. no-unused-vars",
          "2:38 'T4' is defined but never used. no-unused-vars",
        ]
      );
    });

    it("type parameter scope (interfaces)", () => {
      lintAndAssertMessages(
        `
          T;
          interface Foo<T> {};
          T;
          Foo;
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "1:1 'T' is not defined. no-undef",
          "2:15 'T' is defined but never used. no-unused-vars",
          "3:1 'T' is not defined. no-undef",
        ]
      );
    });

    it("type parameter bounds (type aliases)", () => {
      lintAndAssertMessages(
        `
          import type {Foo, Foo2, Foo3} from 'foo';
          type Log<T1: Foo, T2: Foo2, T3> = {
            messages: {[T1]: T2};
            delay: Foo3;
          };
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "2:6 'Log' is defined but never used. no-unused-vars",
          "2:29 'T3' is defined but never used. no-unused-vars",
        ]
      );
    });

    it("type parameter scope (type aliases)", () => {
      lintAndAssertMessages(
        `
          T;
          type Foo<T> = {};
          T;
          Foo;
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "1:1 'T' is not defined. no-undef",
          "2:10 'T' is defined but never used. no-unused-vars",
          "3:1 'T' is not defined. no-undef",
        ]
      );
    });

    it("type parameter bounds (functions)", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          function log<T1: Foo, T2: Foo2, T3, T4>(a: T1, b: T2): T3 { return a + b; }
          log(1, 2);
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["3:37 'T4' is defined but never used. no-unused-vars"]
      );
    });

    it("type parameter scope (functions)", () => {
      lintAndAssertMessages(
        `
          T;
          function log<T>() {}
          T;
          log;
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "1:1 'T' is not defined. no-undef",
          "2:14 'T' is defined but never used. no-unused-vars",
          "3:1 'T' is not defined. no-undef",
        ]
      );
    });

    it("nested type annotations", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          function foo(callback: () => Foo) {
            return callback();
          }
          foo();
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("type in var declaration", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var x: Foo = 1;
          x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("object type annotation", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: {numVal: Foo};
          a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("object property types", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var a = {
            circle: (null : ?{ setNativeProps(props: Foo): Foo2 })
          };
          a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("namespaced types", () => {
      lintAndAssertMessages(
        `
          var React = require('react-native');
          var b = {
            openExternalExample: (null: ?React.Component)
          };
          var c = {
            render(): React.Component {}
          };
          b;
          c;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("ArrayTypeAnnotation", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var x: Foo[]; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("ClassImplements", () => {
      lintAndAssertMessages(
        `
          import type Bar from 'foo';
          export default class Foo implements Bar {}
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("type alias creates declaration + usage", () => {
      lintAndAssertMessages(
        `
          type Foo = any;
          var x : Foo = 1; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("type alias with type parameters", () => {
      lintAndAssertMessages(
        `
          import type Bar from 'foo';
          import type Foo3 from 'foo';
          type Foo<T> = Bar<T, Foo3>
          var x : Foo = 1; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("export type alias", () => {
      lintAndAssertMessages(
        `
          import type Foo2 from 'foo';
          export type Foo = Foo2;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("polymorphic types #109", () => {
      lintAndAssertMessages(
        "export default function groupByEveryN<T>(array: Array<T>, n: number): Array<Array<?T>> { n; }",
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("types definition from import", () => {
      lintAndAssertMessages(
        `
          import type Promise from 'bluebird';
          type Operation = () => Promise;
          x: Operation;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("polymorphic/generic types for class #123", () => {
      lintAndAssertMessages(
        `
          class Box<T> {
            value: T;
          }
          var box = new Box();
          console.log(box.value);
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("polymorphic/generic types for function #123", () => {
      lintAndAssertMessages(
        `
          export function identity<T>(value) {
            var a: T = value; a;
          }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("polymorphic/generic types for type alias #123", () => {
      lintAndAssertMessages(
        `
          import Bar from './Bar';
          type Foo<T> = Bar<T>; var x: Foo = 1; console.log(x);
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("polymorphic/generic types - outside of fn scope #123", () => {
      lintAndAssertMessages(
        `
          export function foo<T>(value) { value; };
          var b: T = 1; b;
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        [
          "1:21 'T' is defined but never used. no-unused-vars",
          "2:8 'T' is not defined. no-undef",
        ]
      );
    });

    it("polymorphic/generic types - extending unknown #123", () => {
      lintAndAssertMessages(
        `
          import Bar from 'bar';
          export class Foo extends Bar<T> {}
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:30 'T' is not defined. no-undef"]
      );
    });

    it("polymorphic/generic types - function calls", () => {
      lintAndAssertMessages(
        `
          function f<T>(): T {}
          f<T>();
        `,
        { "no-unused-vars": 1, "no-undef": 1 },
        ["2:3 'T' is not defined. no-undef"]
      );
    });

    it("polymorphic/generic types - function calls #644", () => {
      lintAndAssertMessages(
        `
          import type {Type} from 'Type';
          function f<T>(): T {}
          f<Type>();
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("support declarations #132", () => {
      lintAndAssertMessages(
        `
          declare class A { static () : number }
          declare module B { declare var x: number; }
          declare function foo<T>(): void;
          declare var bar
          A; B; foo(); bar;
        `,
        { "no-undef": 1, "no-unused-vars": 1 }
      );
    });

    it("supports type spreading", () => {
      lintAndAssertMessages(
        `
          type U = {};
          type T = {a: number, ...U, ...V};
        `,
        { "no-undef": 1, "no-unused-vars": 1 },
        [
          "2:6 'T' is defined but never used. no-unused-vars",
          "2:31 'V' is not defined. no-undef",
        ]
      );
    });

    it("1", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          export default function(a: Foo, b: ?Foo2, c){ a; b; c; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("2", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          export default function(a: () => Foo){ a; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("3", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          export default function(a: (_:Foo) => Foo2){ a; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("4", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          export default function(a: (_1:Foo, _2:Foo2) => Foo3){ a; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("5", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          export default function(a: (_1:Foo, ...foo:Array<Foo2>) => number){ a; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("6", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          export default function(): Foo {}
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("7", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          export default function():() => Foo {}
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("8", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          export default function():(_?:Foo) => Foo2{}
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("9", () => {
      lintAndAssertMessages(
        "export default function <T1, T2>(a: T1, b: T2) { b; }",
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("10", () => {
      lintAndAssertMessages(
        "var a=function<T1,T2>(a: T1, b: T2) {return a + b;}; a;",
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("11", () => {
      lintAndAssertMessages("var a={*id<T>(x: T): T { x; }}; a;", {
        "no-unused-vars": 1,
        "no-undef": 1,
      });
    });

    it("12", () => {
      lintAndAssertMessages("var a={async id<T>(x: T): T { x; }}; a;", {
        "no-unused-vars": 1,
        "no-undef": 1,
      });
    });

    it("13", () => {
      lintAndAssertMessages("var a={123<T>(x: T): T { x; }}; a;", {
        "no-unused-vars": 1,
        "no-undef": 1,
      });
    });

    it("14", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          export default class Bar {set fooProp(value:Foo):Foo2{ value; }}
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("15", () => {
      lintAndAssertMessages(
        `
          import type Foo2 from 'foo';
          export default class Foo {get fooProp(): Foo2{}}
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("16", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var numVal:Foo; numVal;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("17", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: {numVal: Foo;}; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("18", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          var a: ?{numVal: Foo; [indexer: Foo2]: Foo3}; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("19", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var a: {numVal: Foo; subObj?: ?{strVal: Foo2}}; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("20", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          import type Foo4 from 'foo';
          var a: { [a: Foo]: Foo2; [b: Foo3]: Foo4; }; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("21", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          var a: {add(x:Foo, ...y:Array<Foo2>): Foo3}; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("22", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          var a: { id<Foo>(x: Foo2): Foo3; }; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("23", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a:Array<Foo> = [1, 2, 3]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("24", () => {
      lintAndAssertMessages(
        `
          import type Baz from 'baz';
          export default class Bar<T> extends Baz<T> { };
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("25", () => {
      lintAndAssertMessages(
        "export default class Bar<T> { bar(): T { return 42; }}",
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("26", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          export default class Bar { static prop1:Foo; prop2:Foo2; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("27", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var x : Foo | Foo2 = 4; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("28", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var x : () => Foo | () => Foo2; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("29", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var x: typeof Foo | number = Foo2; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("30", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var {x}: {x: Foo; } = { x: 'hello' }; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("31", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var [x]: Array<Foo> = [ 'hello' ]; x;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("32", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          export default function({x}: { x: Foo; }) { x; }
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("33", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          function foo([x]: Array<Foo>) { x; } foo();
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("34", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var a: Map<Foo, Array<Foo2> >; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("35", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: ?Promise<Foo>[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("36", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          var a:(...rest:Array<Foo>) => Foo2; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("37", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          import type Foo4 from 'foo';
          var a: <Foo>(x: Foo2, ...y:Foo3[]) => Foo4; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("38", () => {
      lintAndAssertMessages(
        `
          import type {foo, bar} from 'baz';
          foo; bar;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("39", () => {
      lintAndAssertMessages(
        `
          import type {foo as bar} from 'baz';
          bar;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("40", () => {
      lintAndAssertMessages(
        `
          import type from 'foo';
          type;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("41", () => {
      lintAndAssertMessages(
        `
          import type, {foo} from 'bar';
          type; foo;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("43", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: Foo[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("44", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: ?Foo[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("45", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: (?Foo)[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("46", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: () => Foo[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("47", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: (() => Foo)[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("48", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          var a: typeof Foo[]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });

    it("49", () => {
      lintAndAssertMessages(
        `
          import type Foo from 'foo';
          import type Foo2 from 'foo';
          import type Foo3 from 'foo';
          var a : [Foo, Foo2<Foo3>,] = [123, 'duck',]; a;
        `,
        { "no-unused-vars": 1, "no-undef": 1 }
      );
    });
  });

  it("class usage", () => {
    lintAndAssertMessages("class Lol {} module.exports = Lol;", {
      "no-unused-vars": 1,
    });
  });

  it("class definition: gaearon/redux#24", () => {
    lintAndAssertMessages(
      `
        export default function root(stores) {
        return DecoratedComponent => class ReduxRootDecorator {
        a() { DecoratedComponent; stores; }
        };
        }
      `,
      { "no-undef": 1, "no-unused-vars": 1 }
    );
  });

  it("class properties #71", () => {
    lintAndAssertMessages("class Lol { foo = 'bar'; }", { "no-undef": 1 });
  });

  it("template strings #31", () => {
    lintAndAssertMessages("console.log(`${a}, b`);", { "comma-spacing": 1 });
  });

  it("template with destructuring #31", () => {
    lintAndAssertMessages(
      `
        module.exports = {
        render() {
        var {name} = this.props;
        return Math.max(null, \`Name: \${name}, Name: \${name}\`);
        }
        };
      `,
      { "comma-spacing": 1 }
    );
  });

  it("template with arrow returning template #603", () => {
    lintAndAssertMessages(
      `
        var a = \`\${() => {
            \`\${''}\`
        }}\`;
      `,
      { indent: 1 },
      []
    );
  });

  describe("decorators #72 (legacy)", () => {
    function verifyDecoratorsLegacyAndAssertMessages(
      code,
      rules,
      expectedMessages,
      sourceType
    ) {
      const overrideConfig = {
        parserOptions: {
          sourceType,
          babelOptions: {
            configFile: path.resolve(
              __dirname,
              "../fixtures/config/decorators-legacy/babel.config.decorators-legacy.js"
            ),
          },
        },
      };
      return lintAndAssertMessages(
        code,
        rules,
        expectedMessages,
        sourceType,
        overrideConfig
      );
    }

    it("class declaration", () => {
      verifyDecoratorsLegacyAndAssertMessages(
        `
          import classDeclaration from 'decorator';
          import decoratorParameter from 'decorator';
          @classDeclaration((parameter) => parameter)
          @classDeclaration(decoratorParameter)
          @classDeclaration
          export class TextareaAutosize {}
        `,
        { "no-unused-vars": 1 }
      );
    });

    it("method definition", () => {
      verifyDecoratorsLegacyAndAssertMessages(
        `
          import classMethodDeclarationA from 'decorator';
          import decoratorParameter from 'decorator';
          export class TextareaAutosize {
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          methodDeclaration(e) {
          e();
          }
          }
        `,
        { "no-unused-vars": 1 }
      );
    });

    it("method definition get/set", () => {
      verifyDecoratorsLegacyAndAssertMessages(
        `
          import classMethodDeclarationA from 'decorator';
          import decoratorParameter from 'decorator';
          export class TextareaAutosize {
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          get bar() { }
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          set bar(val) { val; }
          }
        `,
        { "no-unused-vars": 1 }
      );
    });

    it("object property", () => {
      verifyDecoratorsLegacyAndAssertMessages(
        `
          import classMethodDeclarationA from 'decorator';
          import decoratorParameter from 'decorator';
          var obj = {
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          methodDeclaration(e) {
          e();
          }
          };
          obj;
        `,
        { "no-unused-vars": 1 }
      );
    });

    it("object property get/set", () => {
      verifyDecoratorsLegacyAndAssertMessages(
        `
          import classMethodDeclarationA from 'decorator';
          import decoratorParameter from 'decorator';
          var obj = {
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          get bar() { },
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          set bar(val) { val; }
          };
          obj;
        `,
        { "no-unused-vars": 1 }
      );
    });
  });

  describe("decorators #72", () => {
    it("class declaration", () => {
      lintAndAssertMessages(
        `
          import classDeclaration from 'decorator';
          import decoratorParameter from 'decorator';
          export
          @classDeclaration((parameter) => parameter)
          @classDeclaration(decoratorParameter)
          @classDeclaration
          class TextareaAutosize {}
        `,
        { "no-unused-vars": 1 }
      );
    });

    it("method definition", () => {
      lintAndAssertMessages(
        `
          import classMethodDeclarationA from 'decorator';
          import decoratorParameter from 'decorator';
          export class TextareaAutosize {
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          methodDeclaration(e) {
          e();
          }
          }
        `,
        { "no-unused-vars": 1 }
      );
    });

    it("method definition get/set", () => {
      lintAndAssertMessages(
        `
          import classMethodDeclarationA from 'decorator';
          import decoratorParameter from 'decorator';
          export class TextareaAutosize {
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          get bar() { }
          @classMethodDeclarationA((parameter) => parameter)
          @classMethodDeclarationA(decoratorParameter)
          @classMethodDeclarationA
          set bar(val) { val; }
          }
        `,
        { "no-unused-vars": 1 }
      );
    });
  });

  it("detects minimal no-unused-vars case #120", () => {
    lintAndAssertMessages("var unused;", { "no-unused-vars": 1 }, [
      "1:5 'unused' is defined but never used. no-unused-vars",
    ]);
  });

  // This two tests are disabled, as the feature to visit properties when
  // there is a spread/rest operator has been removed as it caused problems
  // with other rules #249
  it.skip("visits excluded properties left of spread #95", () => {
    lintAndAssertMessages(
      "var originalObject = {}; var {field1, field2, ...clone} = originalObject;",
      { "no-unused-vars": 1 }
    );
  });

  it.skip("visits excluded properties left of spread #210", () => {
    lintAndAssertMessages(
      "const props = { yo: 'yo' }; const { ...otherProps } = props;",
      { "no-unused-vars": 1 }
    );
  });

  it("does not mark spread variables false-positive", () => {
    lintAndAssertMessages(
      "var originalObject = {}; var {field1, field2, ...clone} = originalObject;",
      { "no-undef": 1, "no-redeclare": 1 }
    );
  });

  it("does not mark spread variables false-positive", () => {
    lintAndAssertMessages(
      "const props = { yo: 'yo' }; const { ...otherProps } = props;",
      { "no-undef": 1, "no-redeclare": 1 }
    );
  });

  it("does not mark spread variables as use-before-define #249", () => {
    lintAndAssertMessages(
      "var originalObject = {}; var {field1, field2, ...clone} = originalObject;",
      { "no-use-before-define": 1 }
    );
  });

  it("detects no-unused-vars with object destructuring #142", () => {
    lintAndAssertMessages(
      "const {Bacona} = require('baconjs')",
      { "no-undef": 1, "no-unused-vars": 1 },
      ["1:8 'Bacona' is assigned a value but never used. no-unused-vars"]
    );
  });

  it("don't warn no-unused-vars with spread #142", () => {
    lintAndAssertMessages(
      `
        export default function test(data) {
        return {
        foo: 'bar',
        ...data
        };
        }
      `,
      { "no-undef": 1, "no-unused-vars": 1 }
    );
  });

  it("excludes comment tokens #153", () => {
    lintAndAssertMessages(
      `
        var a = [
        1,
        2, // a trailing comment makes this line fail comma-dangle (always-multiline)
        ];
      `,
      { "comma-dangle": [2, "always-multiline"] }
    );

    lintAndAssertMessages(
      `
        switch (a) {
        // A comment here makes the above line fail brace-style
        case 1:
        console.log(a);
        }
      `,
      { "brace-style": 2 }
    );
  });

  it("ternary and parens #149", () => {
    lintAndAssertMessages("true ? (true) : false;", { "space-infix-ops": 1 });
  });

  it("line comment space-in-parens #124", () => {
    lintAndAssertMessages(
      `
        React.createClass({
        render() {
        // return (
        //   <div />
        // ); // <-- this is the line that is reported
        }
        });
      `,
      { "space-in-parens": 1 }
    );
  });

  it("block comment space-in-parens #124", () => {
    lintAndAssertMessages(
      `
        React.createClass({
        render() {
        /*
        return (
          <div />
        ); // <-- this is the line that is reported
        */
        }
        });
      `,
      { "space-in-parens": 1 }
    );
  });

  it("no no-undef error with rest #11", () => {
    lintAndAssertMessages("const [a, ...rest] = ['1', '2', '3']; a; rest;", {
      "no-undef": 1,
      "no-unused-vars": 1,
    });
  });

  it("async function with space-before-function-paren #168", () => {
    lintAndAssertMessages("it('handles updates', async function() {});", {
      "space-before-function-paren": [1, "never"],
    });
  });

  it("default param flow type no-unused-vars #184", () => {
    lintAndAssertMessages(
      `
        type ResolveOptionType = {
        depth?: number,
        identifier?: string
        };

        export default function resolve(
        options: ResolveOptionType = {}
        ): Object {
        options;
        }
      `,
      { "no-unused-vars": 1, "no-undef": 1 }
    );
  });

  it("no-use-before-define #192", () => {
    lintAndAssertMessages(
      `
        console.log(x);
        var x = 1;
      `,
      { "no-use-before-define": 1 },
      ["1:13 'x' was used before it was defined. no-use-before-define"]
    );
  });

  it("jsx and stringliteral #216", () => {
    lintAndAssertMessages("<div className=''></div>");
  });

  it("getter/setter #218", () => {
    lintAndAssertMessages(
      `
        class Person {
            set a (v) { }
        }
      `,
      {
        "space-before-function-paren": 1,
        "keyword-spacing": [1, { before: true }],
        indent: 1,
      }
    );
  });

  it("getter/setter #220", () => {
    lintAndAssertMessages(
      `
        var B = {
        get x () {
        return this.ecks;
        },
        set x (ecks) {
        this.ecks = ecks;
        }
        };
      `,
      { "no-dupe-keys": 1 }
    );
  });

  it("fixes issues with flow types and ObjectPattern", () => {
    lintAndAssertMessages(
      `
        import type Foo from 'bar';
        export default class Foobar {
          foo({ bar }: Foo) { bar; }
          bar({ foo }: Foo) { foo; }
        }
      `,
      { "no-unused-vars": 1, "no-shadow": 1 }
    );
  });

  it("correctly detects redeclares if in script mode #217", () => {
    lintAndAssertMessages(
      `
        var a = 321;
        var a = 123;
      `,
      { "no-redeclare": 1 },
      ["2:5 'a' is already defined. no-redeclare"],
      "script"
    );
  });

  it("correctly detects redeclares if in module mode #217", () => {
    lintAndAssertMessages(
      `
        var a = 321;
        var a = 123;
      `,
      { "no-redeclare": 1 },
      ["2:5 'a' is already defined. no-redeclare"],
      "module"
    );
  });

  it("no-implicit-globals in script", () => {
    lintAndAssertMessages(
      "var leakedGlobal = 1;",
      { "no-implicit-globals": 1 },
      [
        "1:5 Implicit global variable, assign as global property instead. no-implicit-globals",
      ],
      "script",
      {
        env: {},
        parserOptions: { ecmaVersion: 6, sourceType: "script" },
      }
    );
  });

  it("no-implicit-globals in module", () => {
    lintAndAssertMessages(
      "var leakedGlobal = 1;",
      { "no-implicit-globals": 1 },
      [],
      "module",
      {
        env: {},
        parserOptions: { ecmaVersion: 6, sourceType: "module" },
      }
    );
  });

  it("no-implicit-globals in default", () => {
    lintAndAssertMessages(
      "var leakedGlobal = 1;",
      { "no-implicit-globals": 1 },
      [],
      null,
      {
        env: {},
        parserOptions: { ecmaVersion: 6 },
      }
    );
  });

  it("allowImportExportEverywhere option (#327)", () => {
    lintAndAssertMessages(
      `
        if (true) { import Foo from 'foo'; }
        function foo() { import Bar from 'bar'; }
        switch (a) { case 1: import FooBar from 'foobar'; }
      `,
      {},
      [],
      "module",
      {
        env: {},
        parserOptions: {
          ecmaVersion: 6,
          sourceType: "module",
          allowImportExportEverywhere: true,
        },
      }
    );
  });

  it("with does not crash parsing in script mode (strict off) #171", () => {
    lintAndAssertMessages("with (arguments) { length; }", {}, [], "script");
  });

  xit("with does crash parsing in module mode (strict on) #171", () => {
    lintAndAssertMessages("with (arguments) { length; }", {}, [
      "1:1 Parsing error: 'with' in strict mode",
    ]);
  });

  it("new.target is not reported as undef #235", () => {
    lintAndAssertMessages("function foo () { return new.target }", {
      "no-undef": 1,
    });
  });

  it("decorator does not create TypeError #229", () => {
    lintAndAssertMessages(
      `
        class A {
          @test
          f() {}
        }
      `,
      { "no-undef": 1 },
      ["2:4 'test' is not defined. no-undef"]
    );
  });

  it("Flow definition does not trigger warnings #223", () => {
    lintAndAssertMessages(
      `
        import { Map as $Map } from 'immutable';
        function myFunction($state: $Map, { a, b, c } : { a: ?Object, b: ?Object, c: $Map }) {}
      `,
      { "no-dupe-args": 1, "no-redeclare": 1, "no-shadow": 1 }
    );
  });

  it("newline-before-return with comments #289", () => {
    lintAndAssertMessages(
      `
        function a() {
        if (b) {
        /* eslint-disable no-console */
        console.log('test');
        /* eslint-enable no-console */
        }

        return hasGlobal;
        }
      `,
      { "newline-before-return": 1 }
    );
  });

  it("spaced-comment with shebang #163", () => {
    lintAndAssertMessages(
      `
        #!/usr/bin/env babel-node
        import {spawn} from 'foobar';
      `,
      { "spaced-comment": 1 }
    );
  });

  describe("Class Property Declarations", () => {
    it("no-redeclare false positive 1", () => {
      lintAndAssertMessages(
        `
          class Group {
            static propTypes = {};
          }
          class TypicalForm {
            static propTypes = {};
          }
        `,
        { "no-redeclare": 1 }
      );
    });

    it("no-redeclare false positive 2", () => {
      lintAndAssertMessages(
        `
          function validate() {}
          class MyComponent {
            static validate = validate;
          }
        `,
        { "no-redeclare": 1 }
      );
    });

    it("check references", () => {
      lintAndAssertMessages(
        `
          var a;
          class A {
            prop1;
            prop2 = a;
            prop3 = b;
          }
          new A
        `,
        { "no-undef": 1, "no-unused-vars": 1, "no-redeclare": 1 },
        ["5:11 'b' is not defined. no-undef"]
      );
    });
  });

  it("dynamic import support", () => {
    lintAndAssertMessages("import('test-module').then(() => {})");
  });

  it("regex with es6 unicodeCodePointEscapes", () => {
    lintAndAssertMessages(
      "string.replace(/[\u{0000A0}-\u{10FFFF}<>&]/gmiu, (char) => `&#x${char.codePointAt(0).toString(16)};`);"
    );
  });

  describe("private class properties", () => {
    it("should not be undefined", () => {
      lintAndAssertMessages(
        `
            class C {
              #d = 1;
            }
        `,
        { "no-undef": 1 }
      );
    });

    it("should not be unused", () => {
      lintAndAssertMessages(
        `
            export class C {
              #d = 1;
            }
        `,
        { "no-unused-vars": 1 }
      );
    });
  });

  describe("optional chaining operator", () => {
    it("should not be undefined #595", () => {
      lintAndAssertMessages(
        `
            const foo = {};
            foo?.bar;
        `,
        { "no-undef": 1 }
      );
    });
  });

  it("flow types on class method should be visited correctly", () => {
    lintAndAssertMessages(
      `
        import type NodeType from 'foo';
        class NodeUtils {
          finishNodeAt<T : NodeType>(node: T): T { return node; }
        }

        new NodeUtils();
      `,
      { "no-unused-vars": 1 }
    );
  });

  it("works with dynamicImport", () => {
    lintAndAssertMessages(
      `
        import('a');
      `
    );
  });

  it("works with numericSeparator", () => {
    lintAndAssertMessages(
      `
        1_000
      `
    );
  });

  it("works with optionalChaining", () => {
    lintAndAssertMessages(
      `
        a?.b
      `
    );
  });

  it("works with import.meta", () => {
    lintAndAssertMessages(
      `
        import.meta
      `
    );
  });

  it("works with classPrivateProperties", () => {
    lintAndAssertMessages(
      `
        class A { #a = 1; }
      `
    );
  });

  it("works with optionalCatchBinding", () => {
    lintAndAssertMessages(
      `
        try {} catch {}
        try {} catch {} finally {}
      `
    );
  });

  it("exportDefaultFrom", () => {
    lintAndAssertMessages(
      `
        export v from "mod"
      `
    );
  });

  it("exportNamespaceFrom", () => {
    lintAndAssertMessages(
      `
        export * as ns from "mod"
      `
    );
  });

  it("ignore eval in scope analysis", () => {
    lintAndAssertMessages(
      `
        const a = 1;
        console.log(a);
        eval('');
      `,
      { "no-unused-vars": 1, "no-undef": 1 }
    );
  });
});
