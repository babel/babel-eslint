"use strict";

var t = require("babel-types");
var visitTypeAnnotation = require("./shared").visitTypeAnnotation;
var checkIdentifierOrVisit = require("./shared").checkIdentifierOrVisit;
var visitDecorators = require("./shared").visitDecorators;

/**
 * We need to monkey patch some of the ESLint-related modules in order to get
 * them to work properly with some babel-supported constructs.
 *
 * @param {Object} modules The ESLint-related libraries we want to patch
 * @param {Object} eslintOptions The given ESLint configuration options
 * @returns {void}
 */
module.exports = function monkeypatch(modules, eslintOptions) {
  var Definition = modules.Definition;
  var eslintScope = modules.eslintScope;
  var estraverse = modules.estraverse;
  var Referencer = modules.Referencer;

  Object.assign(estraverse.VisitorKeys, t.VISITOR_KEYS);
  estraverse.VisitorKeys.MethodDefinition.push("decorators");
  estraverse.VisitorKeys.Property.push("decorators");

  patchESLintScopeAnalyze(eslintScope, eslintOptions);

  function createScopeVariable(node, name) {
    this.currentScope().variableScope.__define(
      name,
      new Definition("Variable", name, node, null, null, null)
    );
  }

  function nestTypeParamScope(manager, node) {
    var parentScope = manager.__currentScope;
    var scope = new eslintScope.Scope(
      manager,
      "type-parameters",
      parentScope,
      node,
      false
    );
    manager.__nestScope(scope);
    for (var j = 0; j < node.typeParameters.params.length; j++) {
      var name = node.typeParameters.params[j];
      scope.__define(name, new Definition("TypeParameter", name, name));
      if (name.typeAnnotation) {
        checkIdentifierOrVisit.call(this, name);
      }
    }
    scope.__define = function() {
      return parentScope.__define.apply(parentScope, arguments);
    };
    return scope;
  }

  // visit decorators that are in: ClassDeclaration / ClassExpression
  var visitClass = Referencer.prototype.visitClass;
  Referencer.prototype.visitClass = function(node) {
    visitDecorators.call(this, node);
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    // visit flow type: ClassImplements
    if (node.implements) {
      for (var i = 0; i < node.implements.length; i++) {
        checkIdentifierOrVisit.call(this, node.implements[i]);
      }
    }
    if (node.superTypeParameters) {
      for (var k = 0; k < node.superTypeParameters.params.length; k++) {
        checkIdentifierOrVisit.call(this, node.superTypeParameters.params[k]);
      }
    }
    visitClass.call(this, node);
    if (typeParamScope) {
      this.close(node);
    }
  };

  // visit decorators that are in: Property / MethodDefinition
  var visitProperty = Referencer.prototype.visitProperty;
  Referencer.prototype.visitProperty = function(node) {
    if (node.value && node.value.type === "TypeCastExpression") {
      visitTypeAnnotation.call(this, node.value);
    }
    visitDecorators.call(this, node);
    visitProperty.call(this, node);
  };

  function visitClassProperty(node) {
    if (node.typeAnnotation) {
      visitTypeAnnotation.call(this, node.typeAnnotation);
    }
    this.visitProperty(node);
  }

  // visit ClassProperty as a Property.
  Referencer.prototype.ClassProperty = visitClassProperty;

  // visit ClassPrivateProperty as a Property.
  Referencer.prototype.ClassPrivateProperty = visitClassProperty;

  // visit flow type in FunctionDeclaration, FunctionExpression, ArrowFunctionExpression
  var visitFunction = Referencer.prototype.visitFunction;
  Referencer.prototype.visitFunction = function(node) {
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    if (node.returnType) {
      checkIdentifierOrVisit.call(this, node.returnType);
    }
    // only visit if function parameters have types
    if (node.params) {
      for (var i = 0; i < node.params.length; i++) {
        var param = node.params[i];
        if (param.typeAnnotation) {
          checkIdentifierOrVisit.call(this, param);
        } else if (t.isAssignmentPattern(param)) {
          if (param.left.typeAnnotation) {
            checkIdentifierOrVisit.call(this, param.left);
          }
        }
      }
    }
    // set ArrayPattern/ObjectPattern visitor keys back to their original. otherwise
    // eslint-scope will traverse into them and include the identifiers within as declarations
    estraverse.VisitorKeys.ObjectPattern = ["properties"];
    estraverse.VisitorKeys.ArrayPattern = ["elements"];
    visitFunction.call(this, node);
    // set them back to normal...
    estraverse.VisitorKeys.ObjectPattern = t.VISITOR_KEYS.ObjectPattern;
    estraverse.VisitorKeys.ArrayPattern = t.VISITOR_KEYS.ArrayPattern;
    if (typeParamScope) {
      this.close(node);
    }
  };

  // visit flow type in VariableDeclaration
  var variableDeclaration = Referencer.prototype.VariableDeclaration;
  Referencer.prototype.VariableDeclaration = function(node) {
    if (node.declarations) {
      for (var i = 0; i < node.declarations.length; i++) {
        var id = node.declarations[i].id;
        var typeAnnotation = id.typeAnnotation;
        if (typeAnnotation) {
          checkIdentifierOrVisit.call(this, typeAnnotation);
        }
      }
    }
    variableDeclaration.call(this, node);
  };

  Referencer.prototype.InterfaceDeclaration = function(node) {
    createScopeVariable.call(this, node, node.id);
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    // TODO: Handle mixins
    for (var i = 0; i < node.extends.length; i++) {
      visitTypeAnnotation.call(this, node.extends[i]);
    }
    visitTypeAnnotation.call(this, node.body);
    if (typeParamScope) {
      this.close(node);
    }
  };

  Referencer.prototype.TypeAlias = function(node) {
    createScopeVariable.call(this, node, node.id);
    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    if (node.right) {
      visitTypeAnnotation.call(this, node.right);
    }
    if (typeParamScope) {
      this.close(node);
    }
  };

  Referencer.prototype.DeclareModule = Referencer.prototype.DeclareFunction = Referencer.prototype.DeclareVariable = Referencer.prototype.DeclareClass = function(
    node
  ) {
    if (node.id) {
      createScopeVariable.call(this, node, node.id);
    }

    var typeParamScope;
    if (node.typeParameters) {
      typeParamScope = nestTypeParamScope.call(this, this.scopeManager, node);
    }
    if (typeParamScope) {
      this.close(node);
    }
  };
};

/**
 * We need to patch the analyze method from eslint-scope in order to set the correct
 * options based on the ESLint config.
 *
 * @private
 * @param {Object} eslintScope The eslint-scope library
 * @param {Object} eslintOptions The given ESLint configuration options
 * @returns {void}
 */
function patchESLintScopeAnalyze(eslintScope, eslintOptions) {
  var analyze = eslintScope.analyze;
  eslintScope.analyze = function(ast, opts) {
    opts = opts || {};
    opts.ecmaVersion = eslintOptions.ecmaVersion;
    opts.sourceType = eslintOptions.sourceType;
    if (eslintOptions.globalReturn !== undefined) {
      opts.nodejsScope = eslintOptions.globalReturn;
    }
    var results = analyze.call(this, ast, opts);
    return results;
  };
}
