var spawn = require("cross-spawn");
var fs = require("fs");
var path = require("path");
var util = require("util");

var EXTERNAL = /^\w[a-z\-0-9\.]+$/; // Match "react", "path", "fs", "lodash.random", etc.
var PEERS = /UNMET PEER DEPENDENCY ([a-z\-0-9\.]+)@(.+)/gm;

var defaultOptions = { dev: false, peerDependencies: true };
var erroneous = [];

function normalizeBabelPlugin(plugin, prefix) {
  // Babel plugins can be configured as [plugin, options]
  if (Array.isArray(plugin)) {
    plugin = plugin[0];
  }
  if (plugin.indexOf(prefix) === 0) {
    return plugin;
  }
  return prefix + plugin;
}

module.exports.check = function(request) {
  if (!request) {
    return;
  }

  var namespaced = request.charAt(0) === "@";
  var dep = request.split("/")
    .slice(0, namespaced ? 2 : 1)
    .join("/");

  // Ignore relative modules, which aren't installed by NPM
  if (!dep.match(EXTERNAL) && !namespaced) {
    return;
  }

  // Ignore linked modules
  try {
    var stats = fs.lstatSync(path.join(process.cwd(), "node_modules", dep));

    if (stats.isSymbolicLink()) {
      return;
    }
  } catch(e) {
    // Module exists in node_modules, but isn't symlinked
  }

  // Ignore NPM global modules (e.g. "path", "fs", etc.)
  try {
    var resolved = require.resolve(dep);

    // Global modules resolve to their name, not an actual path
    if (resolved.match(EXTERNAL)) {
      return;
    }
  } catch(e) {
    // Module is not resolveable
  }

  return dep;
};

module.exports.checkPackage = function checkPackage() {
  try {
    require.resolve(path.join(process.cwd(), "package.json"));

    return;
  } catch (e) {
    // package.json does not exist
  }

  console.info("Initializing `%s`...", "package.json");
  spawn.sync("npm", ["init", "-y"], { stdio: "inherit" });
};

module.exports.defaultOptions = defaultOptions;

module.exports.install = function install(options) {
  
  options = Object.assign({}, defaultOptions, options);

  var args = ["install"]

  args.push(options.dev ? "--save-dev" : "--save");

  // Ignore input, capture output, show errors
  var output = spawn.sync("npm", args, {
    stdio: ["ignore", "pipe", "inherit"]
  });

  return output;
};
