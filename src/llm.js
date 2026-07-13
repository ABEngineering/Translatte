// Wrapper attorno a node-llama-cpp: carica il modello GGUF locale una sola
// volta e genera traduzioni formali/informali vincolate a JSON.
// node-llama-cpp e' un pacchetto ESM-only: viene caricato con import()
// dinamico anche se questo file resta CommonJS (richiesto dal main process
// Electron), come da vincolo emerso in fase di analisi tecnica.
const { buildSystemPrompt } = require("./prompts");

const TRANSLATION_SCHEMA = {
  type: "object",
  properties: {
    formal: { type: "string" },
    informal: { type: "string" },
  },
  required: ["formal", "informal"],
};

let llama = null;
let model = null;
let context = null;
let grammar = null;
let initError = null;
let ready = false;

async function initLLM(modelPath, onStatus) {
  try {
    onStatus?.({ state: "loading-runtime" });
    const { getLlama, LlamaChatSession } = await import("node-llama-cpp");
    llamaModuleCache.LlamaChatSession = LlamaChatSession;

    llama = await getLlama();

    onStatus?.({ state: "loading-model" });
    model = await llama.loadModel({ modelPath });

    onStatus?.({ state: "creating-context" });
    context = await model.createContext();

    try {
      grammar = await llama.createGrammarForJsonSchema(TRANSLATION_SCHEMA);
    } catch (grammarErr) {
      console.warn("Grammar JSON schema non disponibile, uso fallback di parsing manuale:", grammarErr.message);
      grammar = null;
    }

    ready = true;
    onStatus?.({ state: "ready" });
  } catch (err) {
    initError = err;
    onStatus?.({ state: "error", message: err.message });
    throw err;
  }
}

const llamaModuleCache = {};

function isReady() {
  return ready;
}

function getInitError() {
  return initError;
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Nessun JSON trovato nella risposta del modello.");
  return JSON.parse(match[0]);
}

async function translate({ text, sourceLang, targetLang }) {
  if (!ready) throw new Error("Il modello non e' ancora pronto.");
  if (!text || !text.trim()) return { formal: "", informal: "" };

  const { LlamaChatSession } = llamaModuleCache;
  const systemPrompt = buildSystemPrompt(sourceLang, targetLang);
  const sequence = context.getSequence();

  try {
    const session = new LlamaChatSession({ contextSequence: sequence, systemPrompt });
    const promptOptions = { temperature: 0.3, maxTokens: 600 };
    if (grammar) promptOptions.grammar = grammar;

    const responseText = await session.prompt(text, promptOptions);

    let parsed;
    if (grammar) {
      parsed = grammar.parse(responseText);
    } else {
      parsed = extractJson(responseText);
    }

    return {
      formal: String(parsed.formal ?? "").trim(),
      informal: String(parsed.informal ?? "").trim(),
    };
  } finally {
    sequence.dispose();
  }
}

module.exports = { initLLM, translate, isReady, getInitError };
