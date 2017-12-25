"use strict";

exports.parse = function(code, options) {
  return require("./parse-with-patch")(code, options);
};

exports.parseForESLint = function(code, options) {
  if (options.eslintVisitorKeys && options.eslintScopeManager) {
    return require("./parse-with-scope")(code, options);
  }

  return { ast: require("./parse-with-patch")(code, options) };
};

exports.parseNoPatch = function(code, options) {
  return require("./parse")(code, options);
};
