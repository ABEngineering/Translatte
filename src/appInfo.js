const { app } = require("electron");
const pkg = require("../package.json");

function getAppInfo() {
  return {
    name: "A.R.I.A. Translate",
    version: app.isPackaged ? app.getVersion() : pkg.version,
    creator: "Amaro Balsamo",
    description: pkg.description,
  };
}

module.exports = { getAppInfo };
