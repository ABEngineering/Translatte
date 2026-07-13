const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const { LANGUAGES, LANGUAGE_ORDER, otherLanguages } = require("./src/languages");
const { buildMenuTemplate } = require("./src/menu");
const { getAppInfo } = require("./src/appInfo");
const llm = require("./src/llm");
const updater = require("./src/updater");

const isDev = process.argv.includes("--dev") || !app.isPackaged;

let mainWindow = null;
let aboutWindow = null;

const state = {
  sourceLang: "it",
  targetLang: "en",
};

function getModelPath() {
  const filename = "Qwen_Qwen3-1.7B-Q4_K_M.gguf";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "models", filename);
  }
  return path.join(__dirname, "resources", "models", filename);
}

function rebuildMenu() {
  const template = buildMenuTemplate({
    state,
    onSetLanguage: setLanguage,
    onAbout: openAboutWindow,
    onCheckUpdates: () => updater.checkForUpdates(),
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setLanguage(kind, code) {
  if (kind === "source") {
    state.sourceLang = code;
    if (state.targetLang === code) state.targetLang = otherLanguages(code)[0];
  } else {
    state.targetLang = code;
    if (state.sourceLang === code) state.sourceLang = otherLanguages(code)[0];
  }
  rebuildMenu();
  mainWindow?.webContents.send("language-changed", state);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#eef3f8",
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
}

function openAboutWindow() {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }
  aboutWindow = new BrowserWindow({
    width: 440,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow,
    modal: false,
    backgroundColor: "#eef3f8",
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  aboutWindow.setMenu(null);
  aboutWindow.loadFile(path.join(__dirname, "renderer", "about.html"));
  aboutWindow.on("closed", () => {
    aboutWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle("get-app-info", () => getAppInfo());

  ipcMain.handle("get-state", () => ({
    ...state,
    languages: LANGUAGES,
    languageOrder: LANGUAGE_ORDER,
    llmReady: llm.isReady(),
  }));

  ipcMain.on("set-language", (_event, { kind, code }) => setLanguage(kind, code));

  ipcMain.handle("translate", async (_event, payload) => {
    const text = String(payload?.text ?? "").slice(0, 2000);
    return llm.translate({
      text,
      sourceLang: payload?.sourceLang ?? state.sourceLang,
      targetLang: payload?.targetLang ?? state.targetLang,
    });
  });

  ipcMain.handle("check-for-updates", () => updater.checkForUpdates());

  ipcMain.on("quit-and-install", () => updater.quitAndInstall());
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  rebuildMenu();
  createMainWindow();

  updater.setupUpdater({
    onStatus: (status) => mainWindow?.webContents.send("update-status", status),
  });
  if (app.isPackaged) {
    updater.checkForUpdates();
  }

  const modelPath = getModelPath();
  const sendLlmStatus = (status) => mainWindow?.webContents.send("llm-status", status);

  if (!fs.existsSync(modelPath)) {
    sendLlmStatus({
      state: "missing-model",
      message: `Modello non trovato in ${modelPath}. Esegui "npm run download-model".`,
    });
  } else {
    llm.initLLM(modelPath, sendLlmStatus).catch((err) => {
      console.error("Errore inizializzazione LLM:", err);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
