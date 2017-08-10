var assert = require("assert");
var babelEslint = require("..");
var espree = require("espree");
var eslintScope = require("eslint-scope");
var util = require("util");
var unpad = require("dedent");

// Checks if the source ast implements the target ast. Ignores extra keys on source ast
function assertImplementsAST(target, source, path) {
  if (!path) {
    path = [];
  }

  function error(text) {
    var err = new Error(`At ${path.join(".")}: ${text}:`);
    err.depth = path.length + 1;
    throw err;
  }

  var typeA = target === null ? "null" : typeof target;
  var typeB = source === null ? "null" : typeof source;
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
      `object have different constructors (${target.constructor
        .name} !== ${source.constructor.name}`
    );
  } else if (typeA === "object") {
    var keysTarget = Object.keys(target);
    for (var i in keysTarget) {
      var key = keysTarget[i];
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

function lookup(obj, keypath, backwardsDepth) {
  if (!keypath) {
    return obj;
  }

  return keypath
    .split(".")
    .slice(0, -1 * backwardsDepth)
    .reduce((base, segment) => {
      return base && base[segment], obj;
    });
}

function parseForESLintAndAssertSame(code) {
  var esAST = espree.parse(code, {
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
    attachComment: true,
    ecmaVersion: 8,
    sourceType: "module",
  });
  var babylonResult = babelEslint.parseForESLint(code);
  var babylonAST = babylonResult.ast;
  try {
    assertImplementsAST(esAST, babylonAST);
  } catch (err) {
    var traversal = err.message.slice(3, err.message.indexOf(":"));
    if (esAST.tokens) {
      delete esAST.tokens;
    }
    if (babylonAST.tokens) {
      delete babylonAST.tokens;
    }
    err.message += unpad(`
      espree:
      ${util.inspect(lookup(esAST, traversal, 2), {
        depth: err.depth,
        colors: true,
      })}
      babel-eslint:
      ${util.inspect(lookup(babylonAST, traversal, 2), {
        depth: err.depth,
        colors: true,
      })}
    `);
    throw err;
  }
}

describe("parseForESLint: babylon-to-espree", () => {
  describe("compatibility", () => {
    it("should allow ast.analyze to be called without options", function() {
      var esAST = babelEslint.parseForESLint("`test`").ast;

      assert.doesNotThrow(
        () => {
          eslintScope.analyze(esAST);
        },
        TypeError,
        "Should allow no options argument."
      );
    });
  });

  describe("templates", () => {
    it("empty template string", () => {
      parseForESLintAndAssertSame("``");
    });

    it("template string", () => {
      parseForESLintAndAssertSame("`test`");
    });

    it("template string using $", () => {
      parseForESLintAndAssertSame("`$`");
    });

    it("template string with expression", () => {
      parseForESLintAndAssertSame("`${a}`");
    });

    it("template string with multiple expressions", () => {
      parseForESLintAndAssertSame("`${a}${b}${c}`");
    });

    it("template string with expression and strings", () => {
      parseForESLintAndAssertSame("`a${a}a`");
    });

    it("template string with binary expression", () => {
      parseForESLintAndAssertSame("`a${a + b}a`");
    });

    it("tagged template", () => {
      parseForESLintAndAssertSame("jsx`<Button>Click</Button>`");
    });

    it("tagged template with expression", () => {
      parseForESLintAndAssertSame("jsx`<Button>Hi ${name}</Button>`");
    });

    it("tagged template with new operator", () => {
      parseForESLintAndAssertSame("new raw`42`");
    });

    it("template with nested function/object", () => {
      parseForESLintAndAssertSame(
        "`outer${{x: {y: 10}}}bar${`nested${function(){return 1;}}endnest`}end`"
      );
    });

    it("template with braces inside and outside of template string #96", () => {
      parseForESLintAndAssertSame(
        "if (a) { var target = `{}a:${webpackPort}{}}}}`; } else { app.use(); }"
      );
    });

    it("template also with braces #96", () => {
      parseForESLintAndAssertSame(
        unpad(`
          export default function f1() {
            function f2(foo) {
              const bar = 3;
              return \`\${foo} \${bar}\`;
            }
            return f2;
          }
        `)
      );
    });

    it("template with destructuring #31", () => {
      parseForESLintAndAssertSame(
        unpad(`
          module.exports = {
            render() {
              var {name} = this.props;
              return Math.max(null, \`Name: \${name}, Name: \${name}\`);
            }
          };
        `)
      );
    });
  });

  it("simple expression", () => {
    parseForESLintAndAssertSame("a = 1");
  });

  it("class declaration", () => {
    parseForESLintAndAssertSame("class Foo {}");
  });

  it("class expression", () => {
    parseForESLintAndAssertSame("var a = class Foo {}");
  });

  it("jsx expression", () => {
    parseForESLintAndAssertSame("<App />");
  });

  it("jsx expression with 'this' as identifier", () => {
    parseForESLintAndAssertSame("<this />");
  });

  it("jsx expression with a dynamic attribute", () => {
    parseForESLintAndAssertSame("<App foo={bar} />");
  });

  it("jsx expression with a member expression as identifier", () => {
    parseForESLintAndAssertSame("<foo.bar />");
  });

  it("jsx expression with spread", () => {
    parseForESLintAndAssertSame("var myDivElement = <div {...this.props} />;");
  });

  it("empty jsx text", () => {
    parseForESLintAndAssertSame("<a></a>");
  });

  it("jsx text with content", () => {
    parseForESLintAndAssertSame("<a>Hello, world!</a>");
  });

  it("nested jsx", () => {
    parseForESLintAndAssertSame("<div>\n<h1>Wat</h1>\n</div>");
  });

  it("default import", () => {
    parseForESLintAndAssertSame('import foo from "foo";');
  });

  it("import specifier", () => {
    parseForESLintAndAssertSame('import { foo } from "foo";');
  });

  it("import specifier with name", () => {
    parseForESLintAndAssertSame('import { foo as bar } from "foo";');
  });

  it("import bare", () => {
    parseForESLintAndAssertSame('import "foo";');
  });

  it("export default class declaration", () => {
    parseForESLintAndAssertSame("export default class Foo {}");
  });

  it("export default class expression", () => {
    parseForESLintAndAssertSame("export default class {}");
  });

  it("export default function declaration", () => {
    parseForESLintAndAssertSame("export default function Foo() {}");
  });

  it("export default function expression", () => {
    parseForESLintAndAssertSame("export default function () {}");
  });

  it("export all", () => {
    parseForESLintAndAssertSame('export * from "foo";');
  });

  it("export named", () => {
    parseForESLintAndAssertSame("export { foo };");
  });

  it("export named alias", () => {
    parseForESLintAndAssertSame("export { foo as bar };");
  });

  it.skip("empty program with line comment", () => {
    parseForESLintAndAssertSame("// single comment");
  });

  it.skip("empty program with block comment", () => {
    parseForESLintAndAssertSame("  /* multiline\n * comment\n*/");
  });

  it("line comments", () => {
    parseForESLintAndAssertSame(
      unpad(`
        // single comment
        var foo = 15; // comment next to statement
        // second comment after statement
      `)
    );
  });

  it("block comments", () => {
    parseForESLintAndAssertSame(
      unpad(`
        /* single comment */
        var foo = 15; /* comment next to statement */
        /*
         * multiline
         * comment
         */
       `)
    );
  });

  it("block comments #124", () => {
    parseForESLintAndAssertSame(
      unpad(`
        React.createClass({
          render() {
            // return (
            //   <div />
            // ); // <-- this is the line that is reported
          }
        });
      `)
    );
  });

  it("null", () => {
    parseForESLintAndAssertSame("null");
  });

  it("boolean", () => {
    parseForESLintAndAssertSame("if (true) {} else if (false) {}");
  });

  it("regexp", () => {
    parseForESLintAndAssertSame("/affix-top|affix-bottom|affix|[a-z]/");
  });

  it("regexp", () => {
    parseForESLintAndAssertSame("const foo = /foo/;");
  });

  it("regexp y flag", () => {
    parseForESLintAndAssertSame("const foo = /foo/y;");
  });

  it("regexp u flag", () => {
    parseForESLintAndAssertSame("const foo = /foo/u;");
  });

  it("regexp in a template string", () => {
    parseForESLintAndAssertSame('`${/\\d/.exec("1")[0]}`');
  });

  it("first line is empty", () => {
    parseForESLintAndAssertSame('\nimport Immutable from "immutable";');
  });

  it("empty", () => {
    parseForESLintAndAssertSame("");
  });

  it("jsdoc", () => {
    parseForESLintAndAssertSame(
      unpad(`
        /**
        * @param {object} options
        * @return {number}
        */
        const test = function({ a, b, c }) {
          return a + b + c;
        };
        module.exports = test;
      `)
    );
  });

  it("empty block with comment", () => {
    parseForESLintAndAssertSame(
      unpad(`
        function a () {
          try {
            b();
          } catch (e) {
            // asdf
          }
        }
      `)
    );
  });

  describe("babel tests", () => {
    it("MethodDefinition", () => {
      parseForESLintAndAssertSame(
        unpad(`
          export default class A {
            a() {}
          }
        `)
      );
    });

    it("MethodDefinition 2", () => {
      parseForESLintAndAssertSame(
        "export default class Bar { get bar() { return 42; }}"
      );
    });

    it("ClassMethod", () => {
      parseForESLintAndAssertSame(
        unpad(`
          class A {
            constructor() {
            }
          }
        `)
      );
    });

    it("ClassMethod multiple params", () => {
      parseForESLintAndAssertSame(
        unpad(`
          class A {
            constructor(a, b, c) {
            }
          }
        `)
      );
    });

    it("ClassMethod multiline", () => {
      parseForESLintAndAssertSame(
        unpad(`
          class A {
            constructor (
              a,
              b,
              c
            )

            {

            }
          }
        `)
      );
    });

    it("ClassMethod oneline", () => {
      parseForESLintAndAssertSame("class A { constructor(a, b, c) {} }");
    });

    it("ObjectMethod", () => {
      parseForESLintAndAssertSame(
        unpad(`
          var a = {
            b(c) {
            }
          }
        `)
      );
    });

    it("do not allow import export everywhere", () => {
      assert.throws(() => {
        parseForESLintAndAssertSame('function F() { import a from "a"; }');
      }, /SyntaxError: 'import' and 'export' may only appear at the top level/);
    });

    it("return outside function", () => {
      parseForESLintAndAssertSame("return;");
    });

    it("super outside method", () => {
      parseForESLintAndAssertSame("function F() { super(); }");
    });

    it("StringLiteral", () => {
      parseForESLintAndAssertSame("");
      parseForESLintAndAssertSame("");
      parseForESLintAndAssertSame("a");
    });

    it("getters and setters", () => {
      parseForESLintAndAssertSame("class A { get x ( ) { ; } }");
      parseForESLintAndAssertSame(
        unpad(`
          class A {
            get x(
            )
            {
              ;
            }
          }
        `)
      );
      parseForESLintAndAssertSame("class A { set x (a) { ; } }");
      parseForESLintAndAssertSame(
        unpad(`
          class A {
            set x(a
            )
            {
              ;
            }
          }
        `)
      );
      parseForESLintAndAssertSame(
        unpad(`
          var B = {
            get x () {
              return this.ecks;
            },
            set x (ecks) {
              this.ecks = ecks;
            }
          };
        `)
      );
    });

    it("RestOperator", () => {
      parseForESLintAndAssertSame("var { a, ...b } = c");
      parseForESLintAndAssertSame("var [ a, ...b ] = c");
      parseForESLintAndAssertSame("var a = function (...b) {}");
    });

    it("SpreadOperator", () => {
      parseForESLintAndAssertSame("var a = { b, ...c }");
      parseForESLintAndAssertSame("var a = [ a, ...b ]");
      parseForESLintAndAssertSame("var a = sum(...b)");
    });

    it("Async/Await", () => {
      parseForESLintAndAssertSame(
        unpad(`
          async function a() {
            await 1;
          }
        `)
      );
    });
  });
});
