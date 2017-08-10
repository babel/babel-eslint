"use strict";

/**
 * Lib helpers
 */
var parseWithBabylon = require("./lib/parse-with-babylon");
var makeEnhancedReferencer = require("./lib/make-enhanced-referencer");
var getESLintModules = require("./lib/get-eslint-modules");
var extendDefaultVisitorKeys = require("./lib/extend-default-visitor-keys");

/**
 * Dynamically look up the ESLint-related modules
 */
var modules = getESLintModules();
var Traverser = modules.Traverser;
var ScopeManager = modules.ScopeManager;

/**
 * Configure extendedVisitorKeys, based on the default keys from ESLint and the
 * VISITOR_KEYS from babel-types
 */
var extendedVisitorKeys = extendDefaultVisitorKeys(
  Traverser.DEFAULT_VISITOR_KEYS
);

/**
 * Globals
 */
var eslintOptions = {};
var EnhancedReferencer = makeEnhancedReferencer(modules, extendedVisitorKeys);

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
    var eslintScopeOptions = {
      ignoreEval: true,
      impliedStrict: eslintOptions.ecmaFeatures.impliedStrict,
      sourceType: eslintOptions.sourceType,
      ecmaVersion: eslintOptions.ecmaVersion,
      childVisitorKeys: extendedVisitorKeys,
      fallback: Traverser.getKeys,
    };

    if (eslintOptions.ecmaFeatures.globalReturn !== undefined) {
      eslintScopeOptions.nodejsScope = eslintOptions.ecmaFeatures.globalReturn;
    }

    var scopeManager = new ScopeManager(eslintScopeOptions);
    var referencer = new EnhancedReferencer(eslintScopeOptions, scopeManager);

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
