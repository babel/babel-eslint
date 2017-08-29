"use strict";

var t = require("babel-types");
var eslintScope = require("eslint-scope");

/**
 * Exported utilities
 */
module.exports = {
  visitDecorators,
  visitTypeAnnotation,
  checkIdentifierOrVisit,
  createScopeVariable,
  nestTypeParamScope,
};

var propertyTypes = {
  // loops
  callProperties: { type: "loop", values: ["value"] },
  indexers: { type: "loop", values: ["key", "value"] },
  properties: { type: "loop", values: ["argument", "value"] },
  types: { type: "loop" },
  params: { type: "loop" },
  // single property
  argument: { type: "single" },
  elementType: { type: "single" },
  qualification: { type: "single" },
  rest: { type: "single" },
  returnType: { type: "single" },
  // others
  typeAnnotation: { type: "typeAnnotation" },
  typeParameters: { type: "typeParameters" },
  id: { type: "id" },
};

// iterate through part of babel-types VISITOR_KEYS
var flowFlippedAliasKeys = t.FLIPPED_ALIAS_KEYS.Flow.concat([
  "ArrayPattern",
  "ClassDeclaration",
  "ClassExpression",
  "FunctionDeclaration",
  "FunctionExpression",
  "Identifier",
  "ObjectPattern",
  "RestElement",
]);

var visitorKeysMap = Object.keys(t.VISITOR_KEYS).reduce(function(acc, key) {
  var value = t.VISITOR_KEYS[key];
  if (flowFlippedAliasKeys.indexOf(value) === -1) {
    acc[key] = value;
  }
  return acc;
}, {});

// if there are decorators, then visit each
function visitDecorators(node) {
  if (!node.decorators) {
    return;
  }
  for (var i = 0; i < node.decorators.length; i++) {
    if (node.decorators[i].expression) {
      this.visit(node.decorators[i]);
    }
  }
}

function visitTypeAnnotation(node) {
  // get property to check (params, id, etc...)
  var visitorValues = visitorKeysMap[node.type];
  if (!visitorValues) {
    return;
  }

  // can have multiple properties
  for (var i = 0; i < visitorValues.length; i++) {
    var visitorValue = visitorValues[i];
    var propertyType = propertyTypes[visitorValue];
    var nodeProperty = node[visitorValue];
    // check if property or type is defined
    if (propertyType == null || nodeProperty == null) {
      continue;
    }
    if (propertyType.type === "loop") {
      for (var j = 0; j < nodeProperty.length; j++) {
        if (Array.isArray(propertyType.values)) {
          for (var k = 0; k < propertyType.values.length; k++) {
            var loopPropertyNode = nodeProperty[j][propertyType.values[k]];
            if (loopPropertyNode) {
              checkIdentifierOrVisit.call(this, loopPropertyNode);
            }
          }
        } else {
          checkIdentifierOrVisit.call(this, nodeProperty[j]);
        }
      }
    } else if (propertyType.type === "single") {
      checkIdentifierOrVisit.call(this, nodeProperty);
    } else if (propertyType.type === "typeAnnotation") {
      visitTypeAnnotation.call(this, node.typeAnnotation);
    } else if (propertyType.type === "typeParameters") {
      for (var l = 0; l < node.typeParameters.params.length; l++) {
        checkIdentifierOrVisit.call(this, node.typeParameters.params[l]);
      }
    } else if (propertyType.type === "id") {
      if (node.id.type === "Identifier") {
        checkIdentifierOrVisit.call(this, node.id);
      } else {
        visitTypeAnnotation.call(this, node.id);
      }
    }
  }
}

function checkIdentifierOrVisit(node) {
  if (node.typeAnnotation) {
    visitTypeAnnotation.call(this, node.typeAnnotation);
  } else if (node.type === "Identifier") {
    this.visit(node);
  } else {
    visitTypeAnnotation.call(this, node);
  }
}

function createScopeVariable(node, name) {
  this.currentScope().variableScope.__define(
    name,
    new eslintScope.Definition("Variable", name, node, null, null, null)
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
    scope.__define(
      name,
      new eslintScope.Definition("TypeParameter", name, name)
    );
    if (name.typeAnnotation) {
      checkIdentifierOrVisit.call(this, name);
    }
  }
  scope.__define = function() {
    return parentScope.__define.apply(parentScope, arguments);
  };
  return scope;
}
