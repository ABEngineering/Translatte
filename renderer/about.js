(() => {
  const appVersion = document.getElementById("appVersion");
  const appCreator = document.getElementById("appCreator");
  const appDescription = document.getElementById("appDescription");
  const checkBtn = document.getElementById("checkUpdatesBtn");
  const updateStatus = document.getElementById("updateStatus");

  window.aria.getAppInfo().then((info) => {
    document.title = `About - ${info.name}`;
    appVersion.textContent = info.version;
    appCreator.textContent = info.creator;
    appDescription.textContent = info.description || "";
  });

  checkBtn.addEventListener("click", () => {
    checkBtn.disabled = true;
    updateStatus.textContent = "Checking for updates...";
    window.aria.checkForUpdates();
  });

  window.aria.onUpdateStatus((status) => {
    switch (status.state) {
      case "checking":
        updateStatus.textContent = "Checking for updates...";
        break;
      case "available":
        updateStatus.textContent = `New version available: ${status.version}`;
        break;
      case "not-available":
        updateStatus.textContent = "The software is already up to date.";
        checkBtn.disabled = false;
        break;
      case "downloading":
        updateStatus.textContent = `Downloading update: ${Math.round(status.percent || 0)}%`;
        break;
      case "downloaded":
        updateStatus.textContent = `Update ready (v${status.version}). Restart to install it.`;
        checkBtn.textContent = "Restart and Install";
        checkBtn.disabled = false;
        checkBtn.onclick = () => window.aria.quitAndInstall();
        break;
      case "error":
        updateStatus.textContent = "No update available right now.";
        checkBtn.disabled = false;
        break;
      default:
        break;
    }
  });
})();
