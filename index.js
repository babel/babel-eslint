"use strict";

var parse = require("babylon").parse;
var VISITOR_KEYS = require("babel-types").VISITOR_KEYS;
var tt = require("babylon").tokTypes;
var traverse = require("babel-traverse").default;
var codeFrameColumns = require("babel-code-frame").codeFrameColumns;

/**
 * Utils
 */
var babylonToEspree = require("./babylon-to-espree");
var makeEnhancedReferencer = require("./utils/make-enhanced-referencer");
var monkeypatch = require("./utils/monkeypatch");
var getESLintModules = require("./utils/get-eslint-modules");

/**
 * Get the ESLint-related modules
 */
var modules = getESLintModules();
var Traverser = modules.Traverser;
var ScopeManager = modules.ScopeManager;

/**
 * Configure extendedVisitorKeys, based on the default keys from ESLint and the
 * VISITOR_KEYS from babel-types
 */
var DEFAULT_VISITOR_KEYS = Traverser.DEFAULT_VISITOR_KEYS;
var extendedVisitorKeys = Object.assign({}, DEFAULT_VISITOR_KEYS, VISITOR_KEYS);
extendedVisitorKeys.MethodDefinition.push("decorators");
extendedVisitorKeys.Property.push("decorators");

/**
 * Globals
 */
var hasPatched = false;
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
  return parserOptions;
}

/**
 * Use the given parser options to inform the global ESLint configuration options.
 *
 * @param {Object} parserOptions Parser options
 * @returns {void}
 */
function setESLintOptions(parserOptions) {
  eslintOptions.ecmaVersion = parserOptions.ecmaVersion;
  eslintOptions.sourceType = parserOptions.sourceType;
  eslintOptions.allowImportExportEverywhere =
    parserOptions.allowImportExportEverywhere;
  if (parserOptions.sourceType === "module") {
    eslintOptions.globalReturn = false;
  } else {
    delete eslintOptions.globalReturn;
  }
}

/**
 * Standard parse() method which returns an AST, based on the given source code
 * and parser options.
 *
 * @param {String} code Source code
 * @param {Object} options Parser options
 * @returns {Object} AST
 */
exports.parse = function parse(code, options) {
  var parserOptions = ensureDefaultParserOptions(options);
  setESLintOptions(parserOptions);

  if (!hasPatched) {
    hasPatched = true;
    try {
      monkeypatch(modules, eslintOptions);
    } catch (err) {
      console.error(err.stack);
      process.exit(1);
    }
  }

  return exports.parseNoPatch(code, parserOptions);
};

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

  if (!hasPatched) {
    hasPatched = true;
  }

  function analyzeScope(ast) {
    var eslintScopeOptions = {
      ignoreEval: true,
      impliedStrict: eslintOptions.impliedStrict,
      sourceType: eslintOptions.sourceType,
      ecmaVersion: eslintOptions.ecmaVersion,
      childVisitorKeys: extendedVisitorKeys,
      fallback: Traverser.getKeys,
    };

    if (eslintOptions.globalReturn !== undefined) {
      eslintOptions.nodejsScope = eslintOptions.globalReturn;
    }

    var scopeManager = new ScopeManager(eslintScopeOptions);
    var referencer = new EnhancedReferencer(eslintScopeOptions, scopeManager);

    referencer.visit(ast);

    return scopeManager;
  }

  var ast = exports.parseNoPatch(code, parserOptions);

  return {
    ast,
    visitorKeys: extendedVisitorKeys,
    scope: analyzeScope(ast),
  };
};

/**
 * Method to parse the given source code using Babylon, based on the given parser
 * options, and return an Espree-formatted (ESTree) AST.
 * 
 * @param {String} code Source code
 * @param {Object} options Parser options
 * @returns {Object} AST
 */
exports.parseNoPatch = function parseNoPatch(code, options) {
  var opts = {
    codeFrame: options.hasOwnProperty("codeFrame") ? options.codeFrame : true,
    sourceType: options.sourceType,
    allowImportExportEverywhere: options.allowImportExportEverywhere, // consistent with espree
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    ranges: true,
    tokens: true,
    plugins: [
      "flow",
      "jsx",
      "estree",
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
      "dynamicImport",
      "numericSeparator",
      "optionalChaining",
      "importMeta",
      "classPrivateProperties",
      "bigInt",
    ],
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
        err.message =
          "Line " +
          err.lineNumber +
          ": " +
          err.message.replace(/ \((\d+):(\d+)\)$/, "") +
          // add codeframe
          "\n\n" +
          codeFrameColumns(
            code,
            {
              start: {
                line: err.lineNumber,
                column: err.column,
              },
            },
            { highlightCode: true }
          );
      }
    }

    throw err;
  }

  babylonToEspree(ast, traverse, tt, code);

  return ast;
};
