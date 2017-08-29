"use strict";

var eslintScope = require("eslint-scope");

/**
 * Lib helpers
 */
var parseWithBabylon = require("./lib/parse-with-babylon");
var EnhancedReferencer = require("./lib/enhanced-referencer");
var extendedVisitorKeys = require("./lib/extended-visitor-keys");

/**
 * Globals
 */
var eslintOptions = {};

/**
 * Ensure that reasonable default parser options are set.
 *
 * @param {Object} options Parser options
 * @returns {Object} parserOptions with defaults set if appropriate
 */
function ensureDefaultParserOptions(options) {
  var parserOptions = (options = options || {});
  parserOptions.ecmaVersion = options.ecmaVersion || 6;
  parserOptions.sourceType = options.sourceType || "module";
  parserOptions.allowImportExportEverywhere =
    options.allowImportExportEverywhere || false;
  parserOptions.allowReturnOutsideFunction =
    options.allowReturnOutsideFunction || true;
  return parserOptions;
}

/**
 * Use the given parser options to inform the global ESLint configuration options.
 *
 * @param {Object} parserOptions Parser options
 * @returns {void}
 */
function setESLintOptions(parserOptions) {
  eslintOptions = eslintOptions || {};
  eslintOptions.ecmaVersion = parserOptions.ecmaVersion;
  eslintOptions.sourceType = parserOptions.sourceType;
  eslintOptions.ecmaFeatures = eslintOptions.ecmaFeatures || {};
  eslintOptions.ecmaFeatures.allowImportExportEverywhere =
    parserOptions.allowImportExportEverywhere;
  eslintOptions.ecmaFeatures.globalReturn =
    parserOptions.allowReturnOutsideFunction;
}

/**
 * Special parseForESLint() method which returns an object which contains the AST,
 * custom scope analysis logic and the final VISITOR_KEYS to be used during traversal.
 *
 * @param {String} code Source code
 * @param {Object} options Parser options
 * @returns {Object} ESLint parser result object
 */
exports.parseForESLint = function parseForESLint(code, options) {
  var parserOptions = ensureDefaultParserOptions(options);
  setESLintOptions(parserOptions);

  function analyzeScope(ast) {
    var scopeOptions = {
      ignoreEval: true,
      impliedStrict: eslintOptions.ecmaFeatures.impliedStrict,
      sourceType: eslintOptions.sourceType,
      ecmaVersion: eslintOptions.ecmaVersion,
      childVisitorKeys: extendedVisitorKeys,
      fallback: eslintScope.Traverser.getKeys,
    };

    if (eslintOptions.ecmaFeatures.globalReturn !== undefined) {
      scopeOptions.nodejsScope = eslintOptions.ecmaFeatures.globalReturn;
    }

    var scopeManager = new eslintScope.ScopeManager(scopeOptions);
    var referencer = new EnhancedReferencer(scopeOptions, scopeManager);

    referencer.visit(ast);

    return scopeManager;
  }

  var ast = parseWithBabylon(code, parserOptions);

  return {
    ast,
    visitorKeys: extendedVisitorKeys,
    scopeManager: analyzeScope(ast),
  };
};

exports.parse = function parse() {
  throw new Error(
    "babel-eslint does not expose a general parse() method, it is designed to be used with ESLint, so you should use parseForESLint() instead."
  );
};
