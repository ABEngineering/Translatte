# A.R.I.A. Translate

App desktop offline per la traduzione tra **Italiano**, **Inglese** e **Tedesco**, con un agente linguistico basato su un modello LLM locale eseguito tramite **Ollama** (nessuna connessione internet richiesta per tradurre, una volta scaricato il modello). Ogni traduzione viene generata in due registri: **formale** e **informale**.

Creatore: **Amaro Balsamo**

## Requisiti

- Node.js 20+ (usato in sviluppo: v24.18.0) e npm
- Windows 10/11 x64
- **[Ollama](https://ollama.com/download)** installato e in esecuzione (server locale su `http://127.0.0.1:11434`)
- Il modello `gemma4:latest` scaricato in Ollama: `ollama pull gemma4:latest` (~9.6GB). Se non presente, l'app lo scarica automaticamente al primo avvio mostrando una barra di avanzamento.
- Per prestazioni migliori: una GPU dedicata (Ollama la usa automaticamente se disponibile); su sola CPU la traduzione resta funzionante ma piu' lenta.

## Setup iniziale

```bash
npm install
```

Non serve scaricare alcun modello manualmente per lo sviluppo: l'app si collega a Ollama in esecuzione sulla macchina e verifica/scarica `gemma4:latest` al primo avvio.

## Sviluppo

```bash
npm run dev
```

Avvia l'app Electron (l'interfaccia e' in inglese). Lo stato dell'agente e' visibile nell'indicatore in alto a destra: "Checking Ollama..." -> (se assente) "Ollama not found - click to download" -> (se il modello manca) "Downloading model gemma4:latest: NN%" -> "Agent ready". Per aprire i DevTools manualmente durante lo sviluppo: `Ctrl+Shift+I` nella finestra dell'app.

## Build dell'installer Windows

```bash
npm run build
```

Genera l'installer NSIS (`dist/A.R.I.A. Translate Setup <versione>.exe`). L'installer **non include piu' il modello LLM** (Ollama lo gestisce separatamente): e' molto piu' leggero rispetto alla versione precedente basata su modello incorporato.

> Nota: l'installer non e' firmato digitalmente. Windows SmartScreen potrebbe mostrare un avviso "Windows ha protetto il PC" alla prima esecuzione (fare clic su "Ulteriori informazioni" -> "Esegui comunque"). Per rimuovere l'avviso serve un certificato di code-signing (~200-350 USD/anno), non incluso in questa configurazione.

## Aggiornamenti automatici

L'app usa `electron-updater` con provider **GitHub Releases**, configurato in `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: ABEngineering
  repo: Translatte
```

Pubblicare una nuova versione e' un singolo comando:

```bash
npm run release          # bump di versione "patch" (default)
npm run release -- minor # oppure "minor" / "major"
```

Richiede solo di essere autenticati una volta con `gh auth login`. Lo script `scripts/release.mjs` fa tutto il resto in automatico:

1. `npm version <patch|minor|major>` — aggiorna `package.json`, crea il commit e il tag git (es. `v1.0.3`)
2. `git push` + `git push origin <tag>` — sincronizza commit e tag su GitHub
3. Recupera il token da `gh auth token` e compila l'installer
4. Pubblica la release GitHub con `electron-builder --publish always` (carica installer + `latest.yml`)
5. Rimuove automaticamente lo stato di bozza (`gh release edit <tag> --draft=false`) perche' sia subito visibile e rilevabile dall'auto-update

Le app gia' installate rilevano l'aggiornamento al successivo controllo (avvio automatico o pulsante "Verifica aggiornamenti" nel menu Info) e lo scaricano/installano.

## Struttura del progetto

```
main.js              Processo main Electron: finestra, menu, IPC, avvio agente, auto-update
preload.js           API sicura esposta al renderer (contextBridge)
src/llm.js           Client HTTP verso Ollama: verifica/pull del modello, generazione JSON formale/informale
src/prompts.js        Prompt di sistema per coppia di lingue e registro
src/languages.js       Metadati lingue supportate
src/menu.js             Template del menu nativo (File, Modifica, Lingue, Info)
src/updater.js           Integrazione electron-updater
src/appInfo.js            Nome/versione/autore
renderer/                 Interfaccia utente (HTML/CSS/JS, tema HUD futuristico chiaro)
scripts/generate-icon.mjs  Generatore dell'icona applicazione/installer
scripts/release.mjs         Automatizza bump versione + push + build + release GitHub
```

## Note sul motore di traduzione

Il motore e' **Ollama** (server locale, `http://127.0.0.1:11434`), modello di default `gemma4:latest`, configurabile cambiando la costante `MODEL_NAME` in `src/llm.js`. Ogni richiesta usa `/api/chat` con output vincolato a JSON Schema: `{ "formal": "...", "informal": "..." }`, con istruzioni di registro specifiche per lingua (es. tedesco "Sie" vs "du", italiano "Lei" vs "tu", inglese fraseggio professionale vs contratto colloquiale).

Limite di lunghezza testo in input: 2000 caratteri per richiesta.
