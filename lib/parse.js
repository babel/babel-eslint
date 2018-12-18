"use strict";

const babylonToEspree = require("./babylon-to-espree");
const { parseSync: parse, traverse } = require("@babel/core");
const tt = require("@babel/parser").tokTypes;

module.exports = function(code, options) {
  const opts = {
    sourceType: options.sourceType,
    configFile: options.configFile,
    parserOpts: {
      allowImportExportEverywhere: options.allowImportExportEverywhere, // consistent with espree
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      ranges: true,
      tokens: true,
      plugins: ["estree"],
    },
  };

  let ast;
  try {
    ast = parse(code, opts);
  } catch (err) {
    if (err instanceof SyntaxError) {
      err.lineNumber = err.loc.line;
      err.column = err.loc.column;
    }

    throw err;
  }

  babylonToEspree(ast, traverse, tt, code);

  return ast;
};
