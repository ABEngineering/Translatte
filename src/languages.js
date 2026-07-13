// Metadata for the languages supported by A.R.I.A. Translate.
const LANGUAGES = {
  it: { code: "it", name: "Italian" },
  en: { code: "en", name: "English" },
  de: { code: "de", name: "German" },
};

const LANGUAGE_ORDER = ["it", "en", "de"];

function otherLanguages(code) {
  return LANGUAGE_ORDER.filter((c) => c !== code);
}

module.exports = { LANGUAGES, LANGUAGE_ORDER, otherLanguages };
