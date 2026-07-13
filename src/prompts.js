const { LANGUAGES } = require("./languages");

// Indicazioni di registro specifiche per lingua, usate per guidare lo stile
// formale/informale del modello (piccolo LLM: serve essere espliciti).
const REGISTER_HINTS = {
  it: {
    formal: 'Usa la forma di cortesia "Lei", verbi coniugati in modo formale, lessico professionale, nessuna abbreviazione colloquiale.',
    informal: 'Usa il "tu", un tono amichevole e colloquiale, contrazioni naturali del parlato quotidiano.',
  },
  en: {
    formal: "Use full, professional business phrasing, no contractions (use 'do not' instead of 'don't'), no slang.",
    informal: "Use a casual, friendly tone with natural contractions and everyday conversational phrasing.",
  },
  de: {
    formal: 'Verwende die Höflichkeitsform "Sie", formelle Verbformen und professionellen Wortschatz.',
    informal: 'Verwende die Form "du", einen freundlichen, umgangssprachlichen Ton.',
  },
};

function buildSystemPrompt(sourceCode, targetCode) {
  const source = LANGUAGES[sourceCode];
  const target = LANGUAGES[targetCode];
  const hints = REGISTER_HINTS[targetCode];

  return [
    `You are A.R.I.A., an expert professional human translator working between Italian, English and German.`,
    `Translate the user's message from ${source.name} to ${target.name}.`,
    `Produce exactly TWO translations of the same text into ${target.name}:`,
    `1. "formal": a formal, professional register suitable for official or business communication. ${hints.formal}`,
    `2. "informal": a casual, everyday register suitable for talking to a friend. ${hints.informal}`,
    `Preserve the original meaning precisely. Do not add explanations, notes, quotes or extra commentary — only the translated text in each field.`,
    `If the input text is empty or not real text, return empty strings.`,
  ].join(" ");
}

module.exports = { buildSystemPrompt, REGISTER_HINTS };
