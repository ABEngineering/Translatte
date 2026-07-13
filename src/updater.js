// Aggiornamenti automatici via electron-updater (provider GitHub Releases,
// configurato in electron-builder.yml). Owner/repo sono segnaposto finche'
// l'utente non pubblica un repository reale: in quel caso ogni controllo
// fallisce silenziosamente (loggato in console) senza bloccare l'app.
const { autoUpdater } = require("electron-updater");

let statusCallback = null;

function setupUpdater({ onStatus }) {
  statusCallback = onStatus;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => statusCallback?.({ state: "checking" }));
  autoUpdater.on("update-available", (info) => statusCallback?.({ state: "available", version: info.version }));
  autoUpdater.on("update-not-available", () => statusCallback?.({ state: "not-available" }));
  autoUpdater.on("download-progress", (p) => statusCallback?.({ state: "downloading", percent: p.percent }));
  autoUpdater.on("update-downloaded", (info) => statusCallback?.({ state: "downloaded", version: info.version }));
  autoUpdater.on("error", (err) => {
    console.warn("Auto-update: errore (probabile repo GitHub non ancora configurato):", err.message);
    statusCallback?.({ state: "error", message: err.message });
  });
}

async function checkForUpdates() {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.warn("Controllo aggiornamenti non riuscito:", err.message);
    statusCallback?.({ state: "error", message: err.message });
  }
}

function quitAndInstall() {
  autoUpdater.quitAndInstall();
}

module.exports = { setupUpdater, checkForUpdates, quitAndInstall };
