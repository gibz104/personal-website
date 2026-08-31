/**
 * Downloads the display faces the monogram can be set in.
 *
 * They are committed rather than loaded from a CDN because the mark is
 * rasterised through Canvas2D in the browser and through @napi-rs/canvas in the
 * headless preview. Both need the same file on disk, or the preview stops
 * matching the page.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const OUT = "public/fonts";
// A legacy user-agent makes the API answer with TrueType rather than woff2,
// which is what @napi-rs/canvas can register.
const UA = "Mozilla/4.0";

const FACES = [
  ["hanken", "Hanken+Grotesk:wght@800"],
  ["syne", "Syne:wght@800"],
  ["archivo", "Archivo:wght@800"],
  ["fraunces", "Fraunces:opsz,wght,SOFT,WONK@144,900,100,1"],
  ["bodoni", "Bodoni+Moda:opsz,wght@96,700"],
  ["instrument", "Instrument+Serif"],
  ["cormorant", "Cormorant+Garamond:wght@700"],
];

mkdirSync(OUT, { recursive: true });

for (const [id, query] of FACES) {
  const path = `${OUT}/${id}.ttf`;
  if (existsSync(path)) {
    console.log(`  ${id} already present`);
    continue;
  }
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${query}`, {
    headers: { "user-agent": UA },
  }).then((r) => r.text());

  const url = css.match(/url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
  if (!url) {
    console.log(`  ${id} FAILED — no truetype url in the response`);
    continue;
  }
  const bytes = new Uint8Array(await fetch(url).then((r) => r.arrayBuffer()));
  writeFileSync(path, bytes);
  console.log(`  ${id} ${(bytes.length / 1024).toFixed(0)}KB`);
}
