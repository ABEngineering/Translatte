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
      submenu: [{ role: "quit", label: "Esci" }],
    },
    {
      label: "Modifica",
      submenu: [
        { role: "undo", label: "Annulla" },
        { role: "redo", label: "Ripeti" },
        { type: "separator" },
        { role: "cut", label: "Taglia" },
        { role: "copy", label: "Copia" },
        { role: "paste", label: "Incolla" },
        { role: "selectAll", label: "Seleziona tutto" },
      ],
    },
    {
      label: "Lingue",
      submenu: [
        { label: "Da", submenu: languageRadioItems("source") },
        { label: "A", submenu: languageRadioItems("target") },
      ],
    },
    {
      label: "Info",
      submenu: [
        { label: "Verifica aggiornamenti", click: onCheckUpdates },
        { type: "separator" },
        { label: "Informazioni su A.R.I.A. Translate", click: onAbout },
      ],
    },
  ];
}

module.exports = { buildMenuTemplate };
