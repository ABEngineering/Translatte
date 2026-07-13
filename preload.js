const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aria", {
  translate: (payload) => ipcRenderer.invoke("translate", payload),
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
  getState: () => ipcRenderer.invoke("get-state"),
  setLanguage: (kind, code) => ipcRenderer.send("set-language", { kind, code }),
  onLanguageChanged: (cb) => {
    const listener = (_event, state) => cb(state);
    ipcRenderer.on("language-changed", listener);
    return () => ipcRenderer.removeListener("language-changed", listener);
  },
  onLLMStatus: (cb) => {
    const listener = (_event, status) => cb(status);
    ipcRenderer.on("llm-status", listener);
    return () => ipcRenderer.removeListener("llm-status", listener);
  },
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  onUpdateStatus: (cb) => {
    const listener = (_event, status) => cb(status);
    ipcRenderer.on("update-status", listener);
    return () => ipcRenderer.removeListener("update-status", listener);
  },
  quitAndInstall: () => ipcRenderer.send("quit-and-install"),
  openOllamaDownload: () => ipcRenderer.send("open-ollama-download"),
});
