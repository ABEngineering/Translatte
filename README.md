# A.R.I.A. Translate

App desktop offline per la traduzione tra **Italiano**, **Inglese** e **Tedesco**, con un agente linguistico basato su un modello LLM locale (nessuna connessione internet richiesta per tradurre). Ogni traduzione viene generata in due registri: **formale** e **informale**.

Creatore: **Amaro Balsamo**

## Requisiti di sviluppo

- Node.js 20+ (usato in sviluppo: v24.18.0) e npm
- Windows 10/11 x64 (il motore LLM incluso e' compilato per CPU x64)
- ~4GB di spazio libero (dipendenze + modello + build)

## Setup iniziale

```bash
npm install
npm run download-model
```

`npm run download-model` scarica il modello `Qwen3-1.7B-Instruct` (quantizzazione Q4_K_M, ~1.3GB) da Hugging Face in `resources/models/`. E' necessario eseguirlo una sola volta: il file resta sul disco e non viene mai committato in git (vedi `.gitignore`).

Se il download automatico fallisse (rete lenta o bloccata), scaricare manualmente:

```
https://huggingface.co/bartowski/Qwen_Qwen3-1.7B-GGUF/resolve/main/Qwen_Qwen3-1.7B-Q4_K_M.gguf
```

e salvarlo come `resources/models/Qwen_Qwen3-1.7B-Q4_K_M.gguf`.

## Sviluppo

```bash
npm run dev
```

Avvia l'app Electron con DevTools aperti. Al primo avvio il modello viene caricato in memoria (qualche secondo): lo stato e' visibile nell'indicatore in alto a destra ("Inizializzazione agente..." -> "Agente pronto").

## Build dell'installer Windows

```bash
npm run build
```

Genera l'installer NSIS (`dist/A.R.I.A. Translate Setup <versione>.exe`). L'installer include il modello LLM: funziona completamente offline subito dopo l'installazione, senza bisogno di scaricare nulla al primo avvio.

> Nota: l'installer non e' firmato digitalmente. Windows SmartScreen potrebbe mostrare un avviso "Windows ha protetto il PC" alla prima esecuzione (fare clic su "Ulteriori informazioni" -> "Esegui comunque"). Per rimuovere l'avviso serve un certificato di code-signing (~200-350 USD/anno), non incluso in questa configurazione.

## Aggiornamenti automatici

L'app usa `electron-updater` con provider **GitHub Releases**, configurato in `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: ABEngineering
  repo: Translatte
```

Flusso di pubblicazione di una nuova versione:

1. Aggiornare la versione: `npm version patch` (o `minor`/`major`)
2. `gh auth login` (una sola volta, se non gia' autenticato)
3. Esportare il token per electron-builder: PowerShell `$env:GH_TOKEN = gh auth token`, bash `export GH_TOKEN=$(gh auth token)`
4. `npm run build -- --publish always`
5. electron-builder crea la release GitHub e carica installer + `latest.yml` come asset
6. Le app gia' installate rilevano l'aggiornamento al successivo controllo (avvio automatico o pulsante "Verifica aggiornamenti" nel menu Info) e lo scaricano/installano

## Struttura del progetto

```
main.js              Processo main Electron: finestra, menu, IPC, avvio LLM, auto-update
preload.js           API sicura esposta al renderer (contextBridge)
src/llm.js           Wrapper node-llama-cpp: caricamento modello, generazione JSON formale/informale
src/prompts.js        Prompt di sistema per coppia di lingue e registro
src/languages.js       Metadati lingue supportate
src/menu.js             Template del menu nativo (File, Modifica, Lingue, Info)
src/updater.js           Integrazione electron-updater
src/appInfo.js            Nome/versione/autore
renderer/                 Interfaccia utente (HTML/CSS/JS, tema HUD futuristico chiaro)
resources/models/          Modello .gguf (non versionato)
scripts/download-model.mjs  Script di download del modello
scripts/generate-icon.mjs    Generatore dell'icona applicazione/installer
```

## Note sul motore di traduzione

Il modello gira interamente in locale nel processo main di Electron tramite `node-llama-cpp` (backend CPU). Per ogni richiesta viene generato un JSON vincolato `{ "formal": "...", "informal": "..." }`, con istruzioni di registro specifiche per lingua (es. tedesco "Sie" vs "du", italiano "Lei" vs "tu", inglese fraseggio professionale vs contratto colloquiale).

Limite di lunghezza testo in input: 2000 caratteri per richiesta.
