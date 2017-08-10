"use strict";

var parse = require("babylon").parse;
var tt = require("babylon").tokTypes;
var traverse = require("babel-traverse").default;
var codeFrameColumns = require("babel-code-frame").codeFrameColumns;

var babylonToEspree = require("./babylon-to-espree");

/**
 * Method to parse the given source code using Babylon, based on the given parser
 * options, and return an Espree-formatted (ESTree) AST.
 * 
 * @param {String} code Source code
 * @param {Object} options Parser options
 * @returns {Object} AST
 */
module.exports = function parseWithBabylon(code, options) {
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
