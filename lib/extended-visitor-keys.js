"use strict";

var BABEL_VISITOR_KEYS = require("babel-types").VISITOR_KEYS;
var eslintScope = require("eslint-scope");

/**
 * Extended visitorKeys, based on the default keys from eslint-scope and the
 * VISITOR_KEYS from babel-types
 */
module.exports = Object.assign(
  {},
  eslintScope.Traverser.DEFAULT_VISITOR_KEYS,
  BABEL_VISITOR_KEYS,
  {
    MethodDefinition: eslintScope.Traverser.DEFAULT_VISITOR_KEYS.MethodDefinition.concat(
      ["decorators"]
    ),
    Property: eslintScope.Traverser.DEFAULT_VISITOR_KEYS.Property.concat([
      "decorators",
    ]),
  }
);
