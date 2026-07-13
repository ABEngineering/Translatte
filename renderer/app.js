(() => {
  const sourceToggle = document.getElementById("sourceToggle");
  const targetToggle = document.getElementById("targetToggle");
  const inputText = document.getElementById("inputText");
  const charCount = document.getElementById("charCount");
  const translateBtn = document.getElementById("translateBtn");
  const formalOutput = document.getElementById("formalOutput");
  const informalOutput = document.getElementById("informalOutput");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const toast = document.getElementById("toast");

  let llmReady = false;
  let currentState = { sourceLang: "it", targetLang: "en" };

  function updateToggle(toggleEl, activeCode) {
    toggleEl.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.code === activeCode);
    });
  }

  function applyState(state) {
    currentState = { sourceLang: state.sourceLang, targetLang: state.targetLang };
    updateToggle(sourceToggle, currentState.sourceLang);
    updateToggle(targetToggle, currentState.targetLang);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function updateTranslateAvailability() {
    translateBtn.disabled = !llmReady || inputText.value.trim().length === 0;
  }

  function setLlmStatus(status) {
    switch (status.state) {
      case "loading-runtime":
        statusDot.className = "status-dot";
        statusText.textContent = "Avvio motore offline...";
        break;
      case "loading-model":
        statusDot.className = "status-dot";
        statusText.textContent = "Caricamento modello linguistico...";
        break;
      case "creating-context":
        statusDot.className = "status-dot";
        statusText.textContent = "Preparazione agente...";
        break;
      case "ready":
        llmReady = true;
        statusDot.className = "status-dot ready";
        statusText.textContent = "Agente pronto";
        break;
      case "missing-model":
        statusDot.className = "status-dot error";
        statusText.textContent = "Modello non trovato";
        showToast(status.message || "Modello non trovato. Esegui: npm run download-model");
        break;
      case "error":
        statusDot.className = "status-dot error";
        statusText.textContent = "Errore agente";
        break;
      default:
        break;
    }
    updateTranslateAvailability();
  }

  sourceToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-code]");
    if (!btn) return;
    window.aria.setLanguage("source", btn.dataset.code);
  });

  targetToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-code]");
    if (!btn) return;
    window.aria.setLanguage("target", btn.dataset.code);
  });

  inputText.addEventListener("input", () => {
    charCount.textContent = String(inputText.value.length);
    updateTranslateAvailability();
  });

  inputText.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runTranslation();
    }
  });

  translateBtn.addEventListener("click", runTranslation);

  async function runTranslation() {
    const text = inputText.value.trim();
    if (!text || !llmReady) return;

    translateBtn.classList.add("loading");
    translateBtn.disabled = true;

    try {
      const result = await window.aria.translate({
        text,
        sourceLang: currentState.sourceLang,
        targetLang: currentState.targetLang,
      });
      formalOutput.textContent = result.formal || "";
      informalOutput.textContent = result.informal || "";
    } catch (err) {
      showToast("Errore durante la traduzione.");
      console.error(err);
    } finally {
      translateBtn.classList.remove("loading");
      updateTranslateAvailability();
    }
  }

  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.target);
      const text = target?.textContent || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copiato negli appunti");
      } catch (err) {
        console.error(err);
      }
    });
  });

  window.aria.onLanguageChanged(applyState);
  window.aria.onLLMStatus(setLlmStatus);

  (async () => {
    const state = await window.aria.getState();
    applyState(state);
    llmReady = state.llmReady;
    updateTranslateAvailability();
  })();
})();
