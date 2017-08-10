"use strict";

var BABEL_VISITOR_KEYS = require("babel-types").VISITOR_KEYS;

/**
 * Generate extended visitor keys, based on the default keys from ESLint and the
 * VISITOR_KEYS from babel-types
 * 
 * @param {Object} defaultVisitorKeys The default visitor keys from the user's ESLint
 * @returns {Object} a final copy of visitor keys, extending using those from babel-types
 */
module.exports = function extendDefaultVisitorKeys(defaultVisitorKeys) {
  var extendedVisitorKeys = Object.assign(
    {},
    defaultVisitorKeys,
    BABEL_VISITOR_KEYS
  );
  extendedVisitorKeys.MethodDefinition.push("decorators");
  extendedVisitorKeys.Property.push("decorators");
  return extendedVisitorKeys;
};
