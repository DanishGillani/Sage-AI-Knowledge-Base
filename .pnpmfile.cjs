// Allow all build scripts — safe for this project since all packages are known
function readPackage(pkg) {
  return pkg
}

module.exports = { hooks: { readPackage } }
