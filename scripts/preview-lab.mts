/**
 * Renders a hero concept headless and writes a PNG.
 *
 *   npx tsx scripts/preview-lab.mts --concept prism --px 0.62 --py 0.38
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
import { resolveShader } from "@vgpu/wgsl/runtime";
import * as node from "vgpu/node";

import { createLabPipeline } from "../src/gpu/lab/pipeline";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const concept = arg("concept", "prism");
const width = Number(arg("width", "1440"));
const height = Number(arg("height", "900"));
const time = Number(arg("time", "8"));
const clickAge = Number(arg("click", "99"));
const px = Number(arg("px", "0.62"));
const py = Number(arg("py", "0.40"));
const out = resolve(arg("out", `preview/${concept}.png`));

const DIR = new URL("../src/gpu/shaders/", import.meta.url);
const load = async (name: string) =>
  (await resolveShader({ entry: new URL(`${name}.wgsl`, DIR).pathname })).wgsl;

const [scene, bright, blur, composite] = await Promise.all([
  load(concept),
  load("bright"),
  load("blur"),
  load("composite"),
]);

const gpu = await node.init({ label: `lab-${concept}` });
const output = node.target(gpu, { size: [width, height], format: "rgba8unorm" });

const pipeline = createLabPipeline({
  gpu,
  api: node,
  scene,
  shaders: { bright, blur, composite },
  output,
});

pipeline.render({
  time,
  pointer: [px * width, py * height],
  pointerActive: 1,
  clickAge,
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
