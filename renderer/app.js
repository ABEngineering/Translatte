(() => {
  const sourceToggle = document.getElementById("sourceToggle");
  const targetToggle = document.getElementById("targetToggle");
  const inputText = document.getElementById("inputText");
  const charCount = document.getElementById("charCount");
  const translateBtn = document.getElementById("translateBtn");
  const translateMeta = document.getElementById("translateMeta");
  const formalOutput = document.getElementById("formalOutput");
  const informalOutput = document.getElementById("informalOutput");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const toast = document.getElementById("toast");

  let llmReady = false;
  let currentState = { sourceLang: "it", targetLang: "en" };

  const RATE_STORAGE_KEY = "aria_sec_per_char";
  const DEFAULT_SEC_PER_CHAR = 1.3;
  let elapsedTimerId = null;
  let translateStartTime = 0;

  function formatSeconds(seconds) {
    return `${seconds.toFixed(1)}s`;
  }

  function getStoredRate() {
    const stored = parseFloat(localStorage.getItem(RATE_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_SEC_PER_CHAR;
  }

  function updateStoredRate(elapsedSeconds, charCount) {
    if (charCount <= 0) return;
    const sample = elapsedSeconds / charCount;
    const blended = getStoredRate() * 0.7 + sample * 0.3;
    localStorage.setItem(RATE_STORAGE_KEY, String(blended));
  }

  function showEstimate(charCount) {
    if (!charCount) {
      translateMeta.textContent = "";
      return;
    }
    const estimate = Math.max(1, charCount * getStoredRate());
    translateMeta.textContent = `Est. ~${formatSeconds(estimate)}`;
  }

  function updateElapsedDisplay() {
    const elapsed = (performance.now() - translateStartTime) / 1000;
    translateMeta.textContent = `${formatSeconds(elapsed)} elapsed`;
  }

  function startElapsedTimer() {
    translateStartTime = performance.now();
    updateElapsedDisplay();
    elapsedTimerId = setInterval(updateElapsedDisplay, 100);
  }

  function stopElapsedTimer() {
    if (elapsedTimerId) {
      clearInterval(elapsedTimerId);
      elapsedTimerId = null;
    }
    return (performance.now() - translateStartTime) / 1000;
  }

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
    statusText.onclick = null;
    statusText.classList.remove("status-link");
    switch (status.state) {
      case "checking-ollama":
        statusDot.className = "status-dot";
        statusText.textContent = "Checking Ollama...";
        break;
      case "ollama-not-running":
        statusDot.className = "status-dot error";
        statusText.textContent = "Ollama not found - click to download";
        statusText.classList.add("status-link");
        statusText.onclick = () => window.aria.openOllamaDownload();
        showToast(status.message || "Install and start Ollama, then try again.");
        break;
      case "pulling-model":
        statusDot.className = "status-dot";
        statusText.textContent = `Downloading model ${status.model}: ${status.percent ?? 0}%`;
        break;
      case "ready":
        llmReady = true;
        statusDot.className = "status-dot ready";
        statusText.textContent = "Agent ready";
        break;
      case "error":
        statusDot.className = "status-dot error";
        statusText.textContent = "Agent error";
        showToast(status.message || "Error in the translation agent.");
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
    if (!elapsedTimerId) showEstimate(inputText.value.trim().length);
  });

  inputText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
    startElapsedTimer();

    try {
      const result = await window.aria.translate({
        text,
        sourceLang: currentState.sourceLang,
        targetLang: currentState.targetLang,
      });
      const elapsed = stopElapsedTimer();
      translateMeta.textContent = `Done in ${formatSeconds(elapsed)}`;
      updateStoredRate(elapsed, text.length);
      formalOutput.textContent = result.formal || "";
      informalOutput.textContent = result.informal || "";
    } catch (err) {
      stopElapsedTimer();
      translateMeta.textContent = "";
      showToast("Translation failed.");
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
        showToast("Copied to clipboard");
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
