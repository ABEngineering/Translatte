(() => {
  const appVersion = document.getElementById("appVersion");
  const appCreator = document.getElementById("appCreator");
  const appDescription = document.getElementById("appDescription");
  const checkBtn = document.getElementById("checkUpdatesBtn");
  const updateStatus = document.getElementById("updateStatus");

  window.aria.getAppInfo().then((info) => {
    document.title = `Informazioni - ${info.name}`;
    appVersion.textContent = info.version;
    appCreator.textContent = info.creator;
    appDescription.textContent = info.description || "";
  });

  checkBtn.addEventListener("click", () => {
    checkBtn.disabled = true;
    updateStatus.textContent = "Ricerca aggiornamenti in corso...";
    window.aria.checkForUpdates();
  });

  window.aria.onUpdateStatus((status) => {
    switch (status.state) {
      case "checking":
        updateStatus.textContent = "Ricerca aggiornamenti in corso...";
        break;
      case "available":
        updateStatus.textContent = `Nuova versione disponibile: ${status.version}`;
        break;
      case "not-available":
        updateStatus.textContent = "Il software e' gia' aggiornato.";
        checkBtn.disabled = false;
        break;
      case "downloading":
        updateStatus.textContent = `Download aggiornamento: ${Math.round(status.percent || 0)}%`;
        break;
      case "downloaded":
        updateStatus.textContent = `Aggiornamento pronto (v${status.version}). Riavvia per installarlo.`;
        checkBtn.textContent = "Riavvia e installa";
        checkBtn.disabled = false;
        checkBtn.onclick = () => window.aria.quitAndInstall();
        break;
      case "error":
        updateStatus.textContent = "Nessun aggiornamento disponibile al momento.";
        checkBtn.disabled = false;
        break;
      default:
        break;
    }
  });
})();
