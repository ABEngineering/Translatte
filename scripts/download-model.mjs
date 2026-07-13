// Scarica il modello LLM offline (GGUF) usato da A.R.I.A. Translate.
// Va eseguito una volta prima di "npm run dev" o "npm run build".
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL_URL =
  "https://huggingface.co/bartowski/Qwen_Qwen3-1.7B-GGUF/resolve/main/Qwen_Qwen3-1.7B-Q4_K_M.gguf";
const MODEL_DIR = path.join(__dirname, "..", "resources", "models");
const MODEL_FILENAME = "Qwen_Qwen3-1.7B-Q4_K_M.gguf";
const MODEL_PATH = path.join(MODEL_DIR, MODEL_FILENAME);
const MIN_EXPECTED_BYTES = 1_000_000_000; // ~1GB, guardia contro download troncati

async function main() {
  mkdirSync(MODEL_DIR, { recursive: true });

  if (existsSync(MODEL_PATH)) {
    const { size } = statSync(MODEL_PATH);
    if (size >= MIN_EXPECTED_BYTES) {
      console.log(`Modello gia' presente: ${MODEL_PATH} (${(size / 1e9).toFixed(2)} GB). Nulla da fare.`);
      return;
    }
    console.log("File modello incompleto trovato, lo rimuovo e riscarico...");
    unlinkSync(MODEL_PATH);
  }

  console.log(`Scaricamento modello da:\n  ${MODEL_URL}\nverso:\n  ${MODEL_PATH}\n`);

  const response = await fetch(MODEL_URL, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download fallito: HTTP ${response.status} ${response.statusText}`);
  }

  const totalBytes = Number(response.headers.get("content-length") || 0);
  let downloadedBytes = 0;
  let lastPrint = Date.now();

  const progressStream = new TransformStreamProgress((chunkLength) => {
    downloadedBytes += chunkLength;
    const now = Date.now();
    if (now - lastPrint > 1000) {
      lastPrint = now;
      const pct = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : "?";
      const mb = (downloadedBytes / 1e6).toFixed(0);
      const totalMb = totalBytes ? (totalBytes / 1e6).toFixed(0) : "?";
      process.stdout.write(`\r  ${mb}MB / ${totalMb}MB (${pct}%)   `);
    }
  });

  const tmpPath = `${MODEL_PATH}.part`;
  await pipeline(response.body.pipeThrough(progressStream), createWriteStream(tmpPath));
  process.stdout.write("\n");

  const finalSize = statSync(tmpPath).size;
  if (finalSize < MIN_EXPECTED_BYTES) {
    unlinkSync(tmpPath);
    throw new Error(
      `Download troppo piccolo (${finalSize} byte): probabilmente troncato. Riprova l'esecuzione dello script.`
    );
  }

  const { renameSync } = await import("node:fs");
  renameSync(tmpPath, MODEL_PATH);
  console.log(`Fatto. Modello salvato in ${MODEL_PATH} (${(finalSize / 1e9).toFixed(2)} GB).`);
}

function TransformStreamProgress(onChunk) {
  return new TransformStream({
    transform(chunk, controller) {
      onChunk(chunk.byteLength);
      controller.enqueue(chunk);
    },
  });
}

main().catch((err) => {
  console.error("\nErrore durante il download del modello:", err.message);
  console.error(
    `\nPuoi scaricarlo manualmente da:\n  ${MODEL_URL}\ne salvarlo come:\n  ${MODEL_PATH}`
  );
  process.exit(1);
});
