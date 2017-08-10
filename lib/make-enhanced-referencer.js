"use strict";

var t = require("babel-types");

var visitTypeAnnotation = require("./shared").visitTypeAnnotation;
var checkIdentifierOrVisit = require("./shared").checkIdentifierOrVisit;
var visitDecorators = require("./shared").visitDecorators;

/**
 * Returns an EnhancedReferencer class which will be used during the custom
 * scope analysis logic in parseForESLint() when visiting AST nodes.
 * 
 * @param {Object} modules The ESLint-related libraries we want to patch
 * @param {Object} extendedVisitorKeys The final VISITOR_KEYS object to be used
 * @returns {class} EnhancedReferencer class
 */
module.exports = function makeEnhancedReferencer(modules, extendedVisitorKeys) {
  var Referencer = modules.Referencer;
  var eslintScope = modules.eslintScope;
  var Definition = modules.Definition;

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

  class EnhancedReferencer extends Referencer {
    // visit decorators that are in: ClassDeclaration / ClassExpression
    visitClass(node) {
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
      // Execute default Referencer logic
      super.visitClass(node);
      if (typeParamScope) {
        this.close(node);
      }
    }

    // visit decorators that are in: Property / MethodDefinition
    visitProperty(node) {
      if (node.value && node.value.type === "TypeCastExpression") {
        visitTypeAnnotation.call(this, node.value);
      }
      visitDecorators.call(this, node);
      // Execute default Referencer logic
      super.visitProperty(node);
    }

    // visit ClassProperty as a Property.
    ClassProperty(node) {
      if (node.typeAnnotation) {
        visitTypeAnnotation.call(this, node.typeAnnotation);
      }
      this.visitProperty(node);
    }

    // visit ClassPrivateProperty as a Property.
    ClassPrivateProperty(node) {
      if (node.typeAnnotation) {
        visitTypeAnnotation.call(this, node.typeAnnotation);
      }
      this.visitProperty(node);
    }

    Decorator(node) {
      if (node.expression) {
        this.visit(node.expression);
      }
    }

    // visit flow type in FunctionDeclaration, FunctionExpression, ArrowFunctionExpression
    visitFunction(node) {
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
      extendedVisitorKeys.ObjectPattern = ["properties"];
      extendedVisitorKeys.ArrayPattern = ["elements"];
      // Execute default Referencer logic
      super.visitFunction(node);
      // set them back to normal...
      extendedVisitorKeys.ObjectPattern = t.VISITOR_KEYS.ObjectPattern;
      extendedVisitorKeys.ArrayPattern = t.VISITOR_KEYS.ArrayPattern;
      if (typeParamScope) {
        this.close(node);
      }
    }

    // visit flow type in VariableDeclaration
    VariableDeclaration(node) {
      if (node.declarations) {
        for (var i = 0; i < node.declarations.length; i++) {
          var id = node.declarations[i].id;
          var typeAnnotation = id.typeAnnotation;
          if (typeAnnotation) {
            checkIdentifierOrVisit.call(this, typeAnnotation);
          }
        }
      }
      // Execute default Referencer logic
      super.VariableDeclaration(node);
    }

    InterfaceDeclaration(node) {
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
    }

    TypeAlias(node) {
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
    }

    DeclareModule(node) {
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
    }

    DeclareFunction(node) {
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
    }

    DeclareVariable(node) {
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
    }

    DeclareClass(node) {
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
    }
  }

  return EnhancedReferencer;
};
