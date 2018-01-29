"use strict";

var babylonToEspree = require("./babylon-to-espree");
var tt = require("babylon").tokTypes;
var traverse = require("@babel/traverse").default;
var codeFrameColumns = require("@babel/code-frame").codeFrameColumns;

var ESLINT_DEFAULT_FILEPATH = "<text>";

module.exports = function(code, options) {
  var opts = {
    filename: (options.filePath && options.filePath !== ESLINT_DEFAULT_FILEPATH) ? options.filePath : '',
    parserOpts: {
      sourceType: options.sourceType,
      allowImportExportEverywhere: options.allowImportExportEverywhere, // consistent with Espree
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      ranges: true,
      tokens: true,
    },
  };
  var enableCodeFrame = options.hasOwnProperty("codeFrame") ? options.codeFrame : true;

  var ast;
  var babel;

  try {
    babel = require("@babel/core");
  } catch(e) {
    console.error('Warning: babel-eslint v9.0.0 requires a peer dependency of @babel/core@v7.0.0-beta.40 or higher. If you are not using Babel, consider using the default ESLint parser instead.');
    throw e;
  }

  try {
    ast = babel.parse(code, opts);
  } catch (err) {
    if (err instanceof SyntaxError) {
      if (err.loc) {
        err.lineNumber = err.loc.line;
        err.column = err.loc.column;

        if (enableCodeFrame) {
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
    }

    throw err;
  }

  babylonToEspree(ast, babel.traverse, tt, code);

  return ast;
};
