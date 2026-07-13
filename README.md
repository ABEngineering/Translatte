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

Avvia l'app Electron con DevTools aperti. Lo stato dell'agente e' visibile nell'indicatore in alto a destra: "Verifica Ollama..." -> (se assente) "Ollama non trovato - clic per scaricarlo" -> (se il modello manca) "Download modello gemma4:latest: NN%" -> "Agente pronto".

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

Flusso di pubblicazione di una nuova versione:

1. Aggiornare la versione: `npm version patch` (o `minor`/`major`)
2. `gh auth login` (una sola volta, se non gia' autenticato)
3. Esportare il token per electron-builder: PowerShell `$env:GH_TOKEN = gh auth token`, bash `export GH_TOKEN=$(gh auth token)`
4. `npm run release` (build + pubblica la release GitHub in un solo comando)
5. La release viene creata come **bozza**: pubblicarla con `gh release edit vX.Y.Z --draft=false` (o dal sito GitHub) perche' sia visibile e rilevabile dall'auto-update
6. Le app gia' installate rilevano l'aggiornamento al successivo controllo (avvio automatico o pulsante "Verifica aggiornamenti" nel menu Info) e lo scaricano/installano

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
```

## Note sul motore di traduzione

Il motore e' **Ollama** (server locale, `http://127.0.0.1:11434`), modello di default `gemma4:latest`, configurabile cambiando la costante `MODEL_NAME` in `src/llm.js`. Ogni richiesta usa `/api/chat` con output vincolato a JSON Schema: `{ "formal": "...", "informal": "..." }`, con istruzioni di registro specifiche per lingua (es. tedesco "Sie" vs "du", italiano "Lei" vs "tu", inglese fraseggio professionale vs contratto colloquiale).

Limite di lunghezza testo in input: 2000 caratteri per richiesta.
