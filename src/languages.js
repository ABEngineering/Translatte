// Metadati delle lingue supportate da A.R.I.A. Translate.
const LANGUAGES = {
  it: { code: "it", name: "Italiano", englishName: "Italian" },
  en: { code: "en", name: "Inglese", englishName: "English" },
  de: { code: "de", name: "Tedesco", englishName: "German" },
};

const LANGUAGE_ORDER = ["it", "en", "de"];

function otherLanguages(code) {
  return LANGUAGE_ORDER.filter((c) => c !== code);
}

module.exports = { LANGUAGES, LANGUAGE_ORDER, otherLanguages };
