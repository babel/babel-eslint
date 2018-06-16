"use strict";

var babel = require("@babel/core");
var tt = require("@babel/parser").tokTypes;
var traverse = require("@babel/traverse").default;
var babelToEstree = require("./babel-to-estree");

var ESLINT_DEFAULT_FILEPATH = "<text>";

module.exports = function(code, options) {
  var opts = {
    filename:
      options.filePath && options.filePath !== ESLINT_DEFAULT_FILEPATH
        ? options.filePath
        : undefined,
    parserOpts: {
      sourceType: options.sourceType,
      allowImportExportEverywhere: options.allowImportExportEverywhere, // consistent with Espree
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      ranges: true,
      tokens: true,
    },
  };

  var ast;

  try {
    ast = babel.parse(code, opts);
  } catch (err) {
    if (err instanceof SyntaxError && err.loc) {
      err.lineNumber = err.loc.line;
      err.column = err.loc.column;
    }

    throw err;
  }

  babelToEstree(ast, traverse, tt, code);

  return ast;
};
