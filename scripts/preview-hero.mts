/**
 * Renders the hero headless and writes a PNG.
 *
 *   npx tsx scripts/preview-hero.mts --variant rays --px 0.40 --py 0.42
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { registerMarkFonts } from "../src/gpu/mark/node-fonts";
import { PNG } from "pngjs";
import { resolveShader } from "@vgpu/wgsl/runtime";
import * as node from "vgpu/node";

import { createHeroPipeline } from "../src/gpu/hero/pipeline";
import { heroVariantById, HERO_VARIANTS } from "../src/gpu/hero/presets";
import { faceById, DEFAULT_FACE } from "../src/gpu/mark/faces";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

registerMarkFonts();

const id = arg("variant", "flare");
const face = faceById(arg("face", DEFAULT_FACE.id)) ?? DEFAULT_FACE;
const variant = heroVariantById(id) ?? HERO_VARIANTS[0]!;
const width = Number(arg("width", "1440"));
const height = Number(arg("height", "900"));
const time = Number(arg("time", "9"));
const px = Number(arg("px", "0.42"));
const py = Number(arg("py", "0.44"));
const out = resolve(arg("out", `preview/hero-${variant.id}.png`));

const DIR = new URL("../src/gpu/shaders/", import.meta.url);
const load = async (name: string) =>
  (await resolveShader({ entry: new URL(`${name}.wgsl`, DIR).pathname })).wgsl;

const [background, rim, blur, composite] = await Promise.all([
  load("hero-bg"), load("flare-rim"), load("flare-blur"), load("flare-composite"),
]);

const gpu = await node.init({ label: `hero-${variant.id}` });
const output = node.target(gpu, { size: [width, height], format: "rgba8unorm" });

const pipeline = createHeroPipeline({
  gpu,
  api: node,
  shaders: { background, rim, blur, composite },
  output,
  canvas: (w, h) => createCanvas(w, h) as never,
  preset: variant.preset,
  face,
  gridSeed: Number(arg("seed", "7")),
});

pipeline.render({
  time,
  dt: 1 / 60,
  pointer: [px * width, py * height],
  pointerActive: 1,
  intro: 1,
});

await gpu.settled();
const pixels = await output.read();
const png = new PNG({ width, height });
png.data.set(pixels);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out}`);
gpu.dispose();
