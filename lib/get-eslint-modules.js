var Module = require("module");
var path = require("path");

/**
 * We can't just require in libraries related to ESLint, scope traversal etc.
 * We need to look them up based on what the end user has installed.
 *
 * This function handles tracking down all the relevant libraries in this area
 * and returns an object which includes them as properties.
 */
module.exports = function getESLintModules() {
  try {
    // avoid importing a local copy of eslint, try to find a peer dependency
    var eslintLoc = Module._resolveFilename("eslint", module.parent);
  } catch (err) {
    try {
      // avoids breaking in jest where module.parent is undefined
      eslintLoc = require.resolve("eslint");
    } catch (err) {
      throw new ReferenceError("couldn't resolve eslint");
    }
  }

  // get modules relative to what eslint will load
  var eslintMod = new Module(eslintLoc);
  eslintMod.filename = eslintLoc;
  eslintMod.paths = Module._nodeModulePaths(path.dirname(eslintLoc));

  var eslintScope = eslintMod.require("eslint-scope");
  var Definition = eslintMod.require("eslint-scope/lib/definition").Definition;
  var Referencer = eslintMod.require("eslint-scope/lib/referencer");
  var Traverser = eslintMod.require("eslint/lib/util/traverser");
  var ScopeManager = eslintMod.require("eslint-scope/lib/scope-manager");

  if (Referencer.__esModule) Referencer = Referencer.default;

  return {
    Definition,
    eslintScope,
    Referencer,
    Traverser,
    ScopeManager,
  };
};
