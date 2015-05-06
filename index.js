var acornToEsprima = require("./acorn-to-esprima");
var traverse       = require("babel-core").traverse;
var assign         = require("lodash.assign");
var Module         = require("module");
var parse          = require("babel-core").parse;
var path           = require("path");
var t              = require("babel-core").types;

var estraverse;
var hasPatched = false;

function defaultOptions() {
    return {
        optimistic: false,
        directive: false,
        nodejsScope: false,
        sourceType: "script", // one of ['script', 'module']
        ecmaVersion: 5
    };
}

function updateDeeply(target, override) {
    var key, val;

    function isHashObject(target) {
        return typeof target === "object" && target instanceof Object && !(target instanceof RegExp);
    }

    for (key in override) {
        if (override.hasOwnProperty(key)) {
            val = override[key];
            if (isHashObject(val)) {
                if (isHashObject(target[key])) {
                    updateDeeply(target[key], val);
                } else {
                    target[key] = updateDeeply({}, val);
                }
            } else {
                target[key] = val;
            }
        }
    }
    return target;
}

function createModule(filename) {
  var mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  return mod;
}

function monkeypatch() {
  if (hasPatched) return;
  hasPatched = true;

  var eslintLoc;
  try {
    eslintLoc = Module._resolveFilename("eslint", module.parent);
  } catch (err) {
    throw new ReferenceError("couldn't resolve eslint");
  }

  // get modules relative to what eslint will load
  var eslintMod = createModule(eslintLoc);
  var escopeLoc = Module._resolveFilename("escope", eslintMod);
  var escopeMod = createModule(escopeLoc);
  var referencerLoc = Module._resolveFilename("./referencer", escopeMod)
  // monkeypatch estraverse
  estraverse = escopeMod.require("estraverse");
  assign(estraverse.VisitorKeys, t.VISITOR_KEYS);

  // monkeypath referencer
  var Referencer = escopeMod.require("./referencer");

  // monkeypatch escope
  var escope  = require(escopeLoc);
  escope.analyze = function (ast, opts) {
    opts.ecmaVersion = 6;
    opts.sourceType = "module";
    // Don't visit TypeAlias when analyzing scope, but retain them for other
    // eslint rules.
    var TypeAliasKeys = estraverse.VisitorKeys.TypeAlias;
    estraverse.VisitorKeys.TypeAlias = [];

    var options = updateDeeply(defaultOptions(), opts);

    var scopeManager = new escope.ScopeManager(options);

    var referencer = new Referencer(scopeManager);

    // Make sure the decorators are visited
    var originalVisitClass = referencer.visitClass;

    referencer.visitClass = function visitClass(node) {
        if(node.decorators){
          for (var i in node.decorators) {
            if(node.decorators[i].expression) {
              this.visit(node.decorators[i]);
            }
          }
        }
        originalVisitClass.call(this, node);
      }.bind(referencer);



    referencer.visit(ast);
    estraverse.VisitorKeys.TypeAlias = TypeAliasKeys;
    return scopeManager;
  };
}

exports.attachComments = function(ast, comments, tokens) {
  estraverse.attachComments(ast, comments, tokens);

  if (comments.length) {
    var firstComment = comments[0];
    var lastComment = comments[comments.length - 1];
    // fixup program start
    if (!tokens.length) {
      // if no tokens, the program starts at the end of the last comment
      ast.range[0] = lastComment.range[1];
      ast.loc.start.line = lastComment.loc.end.line;
      ast.loc.start.column = lastComment.loc.end.column;
    } else if (firstComment.start < tokens[0].range[0]) {
      // if there are comments before the first token, the program starts at the first token
      var token = tokens[0];
      ast.range[0] = token.range[0];
      ast.loc.start.line = token.loc.start.line;
      ast.loc.start.column = token.loc.start.column;

      // estraverse do not put leading comments on first node when the comment
      // appear before the first token
      if (ast.body.length) {
        var node = ast.body[0];
        node.leadingComments = [];
        var firstTokenStart = token.range[0];
        var len = comments.length;
        for(var i = 0; i < len && comments[i].start < firstTokenStart; i++ ) {
          node.leadingComments.push(comments[i]);
        }
      }
    }
    // fixup program end
    if (tokens.length) {
      var lastToken = tokens[tokens.length - 1];
      if (lastComment.end > lastToken.range[1]) {
        // If there is a comment after the last token, the program ends at the
        // last token and not the comment
        ast.range[1] = lastToken.range[1];
        ast.loc.end.line = lastToken.loc.end.line;
        ast.loc.end.column = lastToken.loc.end.column;
      }
    }
  }
};

exports.parse = function (code) {
  try {
    monkeypatch();
  } catch (err) {
    console.error(err.stack);
    process.exit(1);
  }

  var opts = {
    locations: true,
    ranges: true,
  };

  var comments = opts.onComment = [];
  var tokens = opts.onToken = [];

  var ast;
  try {
    ast = parse(code, opts);
  } catch (err) {
    if (err instanceof SyntaxError) {
      err.lineNumber = err.loc.line;
      err.column = err.loc.column;

      // remove trailing "(LINE:COLUMN)" acorn message and add in esprima syntax error message start
      err.message = "Line X: " + err.message.replace(/ \((\d+):(\d+)\)$/, "");
    }

    throw err;
  }

  // remove EOF token, eslint doesn't use this for anything and it interferes with some rules
  // see https://github.com/babel/babel-eslint/issues/2 for more info
  // todo: find a more elegant way to do this
  tokens.pop();

  // convert tokens
  ast.tokens = tokens.map(acornToEsprima.toToken);

  // add comments
  ast.comments = comments;
  exports.attachComments(ast, comments, tokens);

  // transform esprima and acorn divergent nodes
  acornToEsprima.toAST(ast);

  return ast;
};
