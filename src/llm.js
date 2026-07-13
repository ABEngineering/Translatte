// Client HTTP verso un server Ollama locale. Nessuna dipendenza npm nuova:
// il main process Electron chiama fetch() nativo verso 127.0.0.1, senza
// vincoli CORS (niente header Origin/preflight da un processo Node).
const { buildSystemPrompt } = require("./prompts");

const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const MODEL_NAME = "gemma3:4b";

const TRANSLATION_SCHEMA = {
  type: "object",
  properties: {
    formal: { type: "string" },
    informal: { type: "string" },
  },
  required: ["formal", "informal"],
};

let ready = false;
let initError = null;

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isOllamaReachable() {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

async function isModelPulled(modelName) {
  const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 5000);
  if (!res.ok) throw new Error(`Ollama ha risposto con stato ${res.status}`);
  const data = await res.json();
  return (data.models ?? []).some((m) => m.name === modelName || m.model === modelName);
}

async function pullModel(modelName, onProgress) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelName, stream: true }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Impossibile avviare il download del modello (HTTP ${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const progress = JSON.parse(line);
      onProgress?.(progress);
      if (progress.error) throw new Error(progress.error);
    }
  }
}

async function initLLM(onStatus) {
  try {
    ready = false;
    onStatus?.({ state: "checking-ollama" });

    const reachable = await isOllamaReachable();
    if (!reachable) {
      const message = "Ollama non e' in esecuzione. Installalo da ollama.com e avvialo, poi riprova.";
      onStatus?.({ state: "ollama-not-running", message });
      throw new Error(message);
    }

    const pulled = await isModelPulled(MODEL_NAME);
    if (!pulled) {
      onStatus?.({ state: "pulling-model", model: MODEL_NAME, percent: 0 });
      await pullModel(MODEL_NAME, (progress) => {
        const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
        onStatus?.({ state: "pulling-model", model: MODEL_NAME, percent, status: progress.status });
      });
    }

    ready = true;
    onStatus?.({ state: "ready" });
  } catch (err) {
    initError = err;
    onStatus?.({ state: "error", message: err.message });
    throw err;
  }
}

function isReady() {
  return ready;
}

function getInitError() {
  return initError;
}

async function translate({ text, sourceLang, targetLang }) {
  if (!ready) throw new Error("L'agente non e' ancora pronto.");
  if (!text || !text.trim()) return { formal: "", informal: "" };

  const systemPrompt = buildSystemPrompt(sourceLang, targetLang);

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      stream: false,
      format: TRANSLATION_SCHEMA,
      options: { temperature: 0 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama ha risposto con stato ${res.status}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.message.content);

  return {
    formal: String(parsed.formal ?? "").trim(),
    informal: String(parsed.informal ?? "").trim(),
  };
}

module.exports = { initLLM, translate, isReady, getInitError };
