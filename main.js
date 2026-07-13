const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");

const { LANGUAGES, LANGUAGE_ORDER, otherLanguages } = require("./src/languages");
const { buildMenuTemplate } = require("./src/menu");
const { getAppInfo } = require("./src/appInfo");
const llm = require("./src/llm");
const updater = require("./src/updater");

const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download/windows";

let mainWindow = null;
let aboutWindow = null;

const state = {
  sourceLang: "it",
  targetLang: "en",
};

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
    show: false,
    backgroundColor: "#cfe6f9",
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
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
    backgroundColor: "#cfe6f9",
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

  ipcMain.on("open-ollama-download", () => shell.openExternal(OLLAMA_DOWNLOAD_URL));
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

  const sendLlmStatus = (status) => mainWindow?.webContents.send("llm-status", status);
  llm.initLLM(sendLlmStatus).catch((err) => {
    console.error("Errore inizializzazione agente Ollama:", err);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
