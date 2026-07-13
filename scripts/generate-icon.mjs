// Genera build/icon.ico (icona app/installer) proceduralmente: un anello HUD
// ciano stile "Jarvis" su sfondo trasparente, senza dipendenze esterne.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "build");
const OUT_PATH = path.join(OUT_DIR, "icon.ico");

const SIZES = [256, 48, 32, 16];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Restituisce un buffer RGBA (top-down) per una dimensione data.
function drawIcon(size) {
  const rgba = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const ringInner = size * 0.36;
  const coreR = size * 0.15;

  const accentDeep = [3, 105, 161];
  const accent = [14, 165, 233];
  const accent2 = [6, 182, 212];
  const white = [255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      let r = 234, g = 243, b = 251, a = 0;

      // Anello esterno (bordo sfumato anti-aliasing morbido)
      const ringEdgeSoft = 1.1;
      const outerEdge = clamp01((outerR + ringEdgeSoft - dist) / (2 * ringEdgeSoft));
      const innerEdge = clamp01((dist - (ringInner - ringEdgeSoft)) / (2 * ringEdgeSoft));
      const ringAlpha = outerEdge * innerEdge;

      if (ringAlpha > 0.01) {
        const t = clamp01((dist - ringInner) / (outerR - ringInner));
        const col = lerpColor(accentDeep, accent, t);
        r = col[0]; g = col[1]; b = col[2];
        a = Math.round(255 * ringAlpha);
      }

      // Nucleo centrale luminoso
      const coreEdgeSoft = 1.2;
      const coreAlpha = clamp01((coreR + coreEdgeSoft - dist) / (2 * coreEdgeSoft));
      if (coreAlpha > 0.01) {
        const t = clamp01(dist / coreR);
        const col = lerpColor(white, accent2, t * 0.85);
        const blended = blend([r, g, b, a / 255], [col[0], col[1], col[2], coreAlpha]);
        r = blended[0]; g = blended[1]; b = blended[2]; a = Math.round(blended[3] * 255);
      }

      // Piccoli tick esterni (N/E/S/W) per l'effetto HUD, solo su icone grandi
      if (size >= 48) {
        const angle = Math.atan2(dy, dx);
        const angDeg = ((angle * 180) / Math.PI + 360) % 90;
        const tickBand = angDeg < 4 || angDeg > 86;
        const tickR = outerR + size * 0.06;
        if (tickBand && dist > outerR + 1 && dist < tickR) {
          r = accent[0]; g = accent[1]; b = accent[2]; a = 200;
        }
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }
  return rgba;
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function blend(dst, src) {
  // src over dst, entrambi [r,g,b,a(0..1)]
  const outA = src[3] + dst[3] * (1 - src[3]);
  if (outA === 0) return [0, 0, 0, 0];
  const r = (src[0] * src[3] + dst[0] * dst[3] * (1 - src[3])) / outA;
  const g = (src[1] * src[3] + dst[1] * dst[3] * (1 - src[3])) / outA;
  const b = (src[2] * src[3] + dst[2] * dst[3] * (1 - src[3])) / outA;
  return [r, g, b, outA];
}

function buildBitmapInfoHeaderImage(size, rgbaTopDown) {
  // BITMAPINFOHEADER (40 byte) + pixel XOR data (BGRA, bottom-up) + AND mask
  const headerSize = 40;
  const pixelDataSize = size * size * 4;
  const andMaskRowBytes = Math.ceil(size / 8 / 4) * 4;
  const andMaskSize = andMaskRowBytes * size;

  const buf = Buffer.alloc(headerSize + pixelDataSize + andMaskSize);
  let o = 0;
  buf.writeUInt32LE(headerSize, o); o += 4;
  buf.writeInt32LE(size, o); o += 4;
  buf.writeInt32LE(size * 2, o); o += 4; // height*2 per spec ICO (include AND mask)
  buf.writeUInt16LE(1, o); o += 2; // planes
  buf.writeUInt16LE(32, o); o += 2; // bpp
  buf.writeUInt32LE(0, o); o += 4; // compression BI_RGB
  buf.writeUInt32LE(pixelDataSize, o); o += 4;
  buf.writeInt32LE(0, o); o += 4;
  buf.writeInt32LE(0, o); o += 4;
  buf.writeUInt32LE(0, o); o += 4;
  buf.writeUInt32LE(0, o); o += 4;

  // Pixel data: bottom-up, BGRA
  for (let y = 0; y < size; y++) {
    const srcRow = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const srcIdx = (srcRow * size + x) * 4;
      const dstIdx = headerSize + (y * size + x) * 4;
      buf[dstIdx] = rgbaTopDown[srcIdx + 2]; // B
      buf[dstIdx + 1] = rgbaTopDown[srcIdx + 1]; // G
      buf[dstIdx + 2] = rgbaTopDown[srcIdx]; // R
      buf[dstIdx + 3] = rgbaTopDown[srcIdx + 3]; // A
    }
  }
  // AND mask: tutti zero (alpha 32bpp e' autoritativo su Vista+)
  buf.fill(0, headerSize + pixelDataSize);

  return buf;
}

function buildIco(images) {
  // images: [{ size, data: Buffer }]
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const imageBuffers = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    const dim = img.size >= 256 ? 0 : img.size;
    entry.writeUInt8(dim, 0);
    entry.writeUInt8(dim, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.data.length;
    dirEntries.push(entry);
    imageBuffers.push(img.data);
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

mkdirSync(OUT_DIR, { recursive: true });

const images = SIZES.map((size) => ({
  size,
  data: buildBitmapInfoHeaderImage(size, drawIcon(size)),
}));

writeFileSync(OUT_PATH, buildIco(images));
console.log(`Icona generata: ${OUT_PATH}`);
