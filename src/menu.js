const { LANGUAGES, LANGUAGE_ORDER } = require("./languages");

// Costruisce il template del menu nativo. Va ricostruito (buildMenuTemplate +
// Menu.setApplicationMenu) ogni volta che cambia lo stato lingua, perche' i
// MenuItem di Electron non aggiornano da soli lo stato "checked".
function buildMenuTemplate({ state, onSetLanguage, onAbout, onCheckUpdates }) {
  const languageRadioItems = (kind) =>
    LANGUAGE_ORDER.map((code) => ({
      label: LANGUAGES[code].name,
      type: "radio",
      checked: (kind === "source" ? state.sourceLang : state.targetLang) === code,
      click: () => onSetLanguage(kind, code),
    }));

  return [
    {
      label: "File",
      submenu: [{ role: "quit", label: "Exit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", label: "Undo" },
        { role: "redo", label: "Redo" },
        { type: "separator" },
        { role: "cut", label: "Cut" },
        { role: "copy", label: "Copy" },
        { role: "paste", label: "Paste" },
        { role: "selectAll", label: "Select All" },
      ],
    },
    {
      label: "Languages",
      submenu: [
        { label: "From", submenu: languageRadioItems("source") },
        { label: "To", submenu: languageRadioItems("target") },
      ],
    },
    {
      label: "Info",
      submenu: [
        { label: "Check for Updates", click: onCheckUpdates },
        { type: "separator" },
        { label: "About A.R.I.A. Translate", click: onAbout },
      ],
    },
  ];
}

module.exports = { buildMenuTemplate };
