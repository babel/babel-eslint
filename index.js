"use strict";

var babylonToEspree = require("./babylon-to-espree");
var Module          = require("module");
var path            = require("path");
var parse           = require("babylon").parse;
var t               = require("babel-types");
var tt              = require("babylon").tokTypes;
var traverse        = require("babel-traverse").default;
var codeFrame       = require("babel-code-frame");

var hasPatched = false;
var eslintOptions = {};

function getModules() {
  try {
    // avoid importing a local copy of eslint, try to find a peer dependency
    var eslintLoc = Module._resolveFilename("eslint", module.parent);
  } catch (err) {
    try {
      // avoids breaking in jest where module.parent is undefined
      eslintLoc = require.resolve("eslint");
    } catch (err) {
      throw new ReferenceError("couldn't resolve eslint");
    }
  }

  // get modules relative to what eslint will load
  var eslintMod = new Module(eslintLoc);
  eslintMod.filename = eslintLoc;
  eslintMod.paths = Module._nodeModulePaths(path.dirname(eslintLoc));

  var escope  = eslintMod.require("escope");
  var Definition = eslintMod.require("escope/lib/definition").Definition;
  var ParameterDefinition = eslintMod.require("escope/lib/definition").ParameterDefinition;
  var PatternVisitor = eslintMod.require("escope/lib/pattern-visitor");
  var referencer = eslintMod.require("escope/lib/referencer");
  var estraverse = eslintMod.require("estraverse");

  if (referencer.__esModule) referencer = referencer.default;
  if (PatternVisitor.__esModule) PatternVisitor = PatternVisitor.default;

  return {
    estraverse,
    escope,
    referencer,
    Definition,
    ParameterDefinition,
    PatternVisitor,
  };
}

function monkeypatch(modules) {
  var estraverse = modules.estraverse;
  var escope = modules.escope;
  var referencer = modules.referencer;
  var Definition = modules.Definition;
  var ParameterDefinition = modules.ParameterDefinition;
  var PatternVisitor = modules.PatternVisitor;

  // This estraverse is used by ESLint for traversal in the rules. This is not
  // the same estraverse used by escope to build the ScopeManager.
  Object.assign(estraverse.VisitorKeys, t.VISITOR_KEYS);
  estraverse.VisitorKeys.MethodDefinition
    = estraverse.VisitorKeys.MethodDefinition.concat("decorators");
  estraverse.VisitorKeys.Property
    = estraverse.VisitorKeys.Property.concat("decorators");

  var analyze = escope.analyze;
  escope.analyze = function (ast, opts) {
    opts.ecmaVersion = eslintOptions.ecmaVersion;
    opts.sourceType = eslintOptions.sourceType;
    if (eslintOptions.globalReturn !== undefined) {
      opts.nodejsScope = eslintOptions.globalReturn;
    }
    // escope is (most likely) using a different estraverse than ESLint.
    // Instead of guessing and trying to find it, simply pass the visitor keys
    // we want to use:
    opts.childVisitorKeys = t.VISITOR_KEYS;
    var results = analyze.call(this, ast, opts);
    return results;
  };

  // new
  PatternVisitor.prototype.ObjectPattern = function(node) {
    if (node.typeAnnotation) {
      this.rightHandNodes.push(node.typeAnnotation);
    }
    node.properties.forEach(this.visit, this);
  };

  // override
  PatternVisitor.prototype.Identifier = function(pattern) {
    // <custom>
    if (pattern.typeAnnotation) {
      this.rightHandNodes.push(pattern.typeAnnotation);
    }
    // </custom>
    var lastRestElement = this.restElements[this.restElements.length - 1] || null;
    this.callback(pattern, {
      topLevel: pattern === this.rootPattern,
      rest: lastRestElement != null && lastRestElement.argument === pattern,
      assignments: this.assignments
    });
  };

  // override
  PatternVisitor.prototype.ArrayPattern = function(pattern) {
    // <custom>
    if (pattern.typeAnnotation) {
      this.rightHandNodes.push(pattern.typeAnnotation);
    }
    // </custom>
    pattern.elements.forEach(this.visit, this);
  };

  class TypeParametersScope extends escope.Scope {
    constructor(scopeManager, upperScope, block) {
      super(scopeManager, "type-parameters", upperScope, block, false);
    }
  }

  // new
  escope.ScopeManager.prototype.__nestTypeParamatersScope = function(node) {
    return this.__nestScope(new TypeParametersScope(this, this.__currentScope, node));
  };

  // new
  referencer.prototype.visitTypeParameterDeclaration = function(node) {
    for (var i = 0; i < node.params.length; i++) {
      var param = node.params[i];
      this.currentScope().__define(
        param,
        new Definition("TypeParameter", param, param, node, i, null)
      );
      if (param.typeAnnotation) {
        this.visit(param.typeAnnotation);
      }
    }
  };

  // override
  referencer.prototype.ClassExpression =
  referencer.prototype.ClassDeclaration = function(node) {
    // <custom>
    if (node.decorators) {
      node.decorators.forEach(this.visit, this);
    }
    // </custom>
    if (node.type === "ClassDeclaration") {
      this.currentScope().__define(
        node.id,
        new Definition(escope.Variable.ClassName, node.id, node, null, null, null)
      );
    }
    // FIXME: Maybe consider TDZ.
    this.visit(node.superClass);
    this.scopeManager.__nestClassScope(node);
    if (node.id) {
      this.currentScope().__define(
        node.id,
        new Definition(escope.Variable.ClassName, node.id, node)
      );
    }
    // <custom>
    if (node.typeParameters) {
      this.scopeManager.__nestTypeParamatersScope(node);
      this.visitTypeParameterDeclaration(node.typeParameters);
    }
    if (node.superTypeParameters) {
      this.visit(node.superTypeParameters);
    }
    if (node.implements) {
      node.implements.forEach(this.visit, this);
    }
    // </custom>
    this.visit(node.body);
    this.close(node); // Shared with __nestTypeParamatersScope
  };

  // new
  referencer.prototype.ClassProperty =
  // override
  referencer.prototype.MethodDefinition =
  referencer.prototype.Property = function(node) {
    // <custom>
    if (node.typeAnnotation) {
      this.visit(node.typeAnnotation);
    }
    if (node.decorators) {
      node.decorators.forEach(this.visit, this);
    }
    // </custom>
    this.visitProperty(node);
  };

  // new
  referencer.prototype.Decorator = function(node) {
    this.visitChildren(node);
  };

  // override
  referencer.prototype.FunctionDeclaration =
  referencer.prototype.FunctionExpression =
  referencer.prototype.ArrowFunctionExpression = function(node) {
    // FunctionDeclaration name is defined in upper scope
    // NOTE: Not referring variableScope. It is intended.
    // Since
    //  in ES5, FunctionDeclaration should be in FunctionBody.
    //  in ES6, FunctionDeclaration should be block scoped.
    if (node.type === "FunctionDeclaration") {
      // id is defined in upper scope
      this.currentScope().__define(
        node.id,
        new Definition(escope.Variable.FunctionName, node.id, node, null, null, null)
      );
    }

    // FunctionExpression with name creates its special scope;
    // FunctionExpressionNameScope.
    if (node.type === "FunctionExpression" && node.id) {
      this.scopeManager.__nestFunctionExpressionNameScope(node);
    }

    // Consider this function is in the MethodDefinition.
    this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);

    // <custom>
    if (node.typeParameters) {
      this.scopeManager.__nestTypeParamatersScope(node);
      this.visitTypeParameterDeclaration(node.typeParameters);
    }
    if (node.returnType) {
      this.visit(node.returnType);
    }
    // </custom>

    // Process parameter declarations.
    for (var i = 0, iz = node.params.length; i < iz; ++i) {
      this.visitPattern(
        node.params[i],
        { processRightHandNodes: true },
        (pattern, info) => {
          this.currentScope().__define(
            pattern,
            new ParameterDefinition(pattern, node, i, info.rest)
          );
          this.referencingDefaultValue(pattern, info.assignments, null, true);
        }
      );
    }

    // if there's a rest argument, add that
    if (node.rest) {
      this.visitPattern({
        type: "RestElement",
        argument: node.rest
      }, (pattern) => {
        this.currentScope().__define(
          pattern,
          new ParameterDefinition(pattern, node, node.params.length, true)
        );
      });
    }

    // Skip BlockStatement to prevent creating BlockStatement scope.
    if (node.body.type === "BlockStatement") {
      this.visitChildren(node.body);
    } else {
      this.visit(node.body);
    }

    this.close(node); // Shared with __nestTypeParamatersScope
  };

  // new
  referencer.prototype.InterfaceDeclaration =
  referencer.prototype.TypeAlias = function(node) {
    this.currentScope().variableScope.__define(
      node.id,
      new Definition("Variable", node.id, node, null, null, null)
    );
    if (node.typeParameters) {
      this.scopeManager.__nestTypeParamatersScope(node);
      this.visitTypeParameterDeclaration(node.typeParameters);
    }
    if (node.type === "TypeAlias") {
      this.visit(node.right);
    } else if (node.type === "InterfaceDeclaration") {
      // TODO: Handle mixins
      node.extends.forEach(this.visit, this);
      this.visit(node.body);
    }
    if (node.typeParameters) {
      this.close(node);
    }
  };

  // new
  referencer.prototype.DeclareModule =
  referencer.prototype.DeclareFunction =
  referencer.prototype.DeclareVariable =
  referencer.prototype.DeclareClass = function(node) {
    if (node.id) {
      this.currentScope().variableScope.__define(
        node.id,
        new Definition("Variable", node.id, node, null, null, null)
      );
    }
    if (node.typeParameters) {
      this.scopeManager.__nestTypeParamatersScope(node);
      this.visitTypeParameterDeclaration(node.typeParameters);
      this.close(node);
    }
  };
}

exports.parse = function (code, options) {
  options = options || {};
  eslintOptions.ecmaVersion = options.ecmaVersion = options.ecmaVersion || 6;
  eslintOptions.sourceType = options.sourceType = options.sourceType || "module";
  eslintOptions.allowImportExportEverywhere = options.allowImportExportEverywhere = options.allowImportExportEverywhere || false;
  if (options.sourceType === "module") {
    eslintOptions.globalReturn = false;
  } else {
    delete eslintOptions.globalReturn;
  }

  if (!hasPatched) {
    hasPatched = true;
    try {
      monkeypatch(getModules());
    } catch (err) {
      console.error(err.stack);
      process.exit(1);
    }
  }

  return exports.parseNoPatch(code, options);
};

exports.parseNoPatch = function (code, options) {
  var opts = {
    codeFrame: options.hasOwnProperty("codeFrame") ? options.codeFrame : true,
    sourceType: options.sourceType,
    allowImportExportEverywhere: options.allowImportExportEverywhere, // consistent with espree
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    plugins: [
      "flow",
      "jsx",
      "asyncFunctions",
      "asyncGenerators",
      "classConstructorCall",
      "classProperties",
      "decorators",
      "doExpressions",
      "exponentiationOperator",
      "exportExtensions",
      "functionBind",
      "functionSent",
      "objectRestSpread",
      "trailingFunctionCommas",
      "dynamicImport"
    ]
  };

  var ast;
  try {
    ast = parse(code, opts);
  } catch (err) {
    if (err instanceof SyntaxError) {

      err.lineNumber = err.loc.line;
      err.column = err.loc.column;

      if (opts.codeFrame) {
        err.lineNumber = err.loc.line;
        err.column = err.loc.column + 1;

        // remove trailing "(LINE:COLUMN)" acorn message and add in esprima syntax error message start
        err.message = "Line " + err.lineNumber + ": " + err.message.replace(/ \((\d+):(\d+)\)$/, "") +
        // add codeframe
        "\n\n" +
        codeFrame(code, err.lineNumber, err.column, { highlightCode: true });
      }
    }

    throw err;
  }

  babylonToEspree(ast, traverse, tt, code);

  return ast;
};
