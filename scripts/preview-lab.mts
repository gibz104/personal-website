/**
 * Renders a hero concept headless and writes a PNG.
 *
 *   npx tsx scripts/preview-lab.mts --concept trail --px 0.62 --py 0.38
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
import { resolveShader } from "@vgpu/wgsl/runtime";
import * as node from "vgpu/node";

import { createLabPipeline } from "../src/gpu/lab/pipeline";
import { conceptById } from "../src/gpu/lab/concepts";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const concept = arg("concept", "relief");
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

const [scene, reveal, bright, blur, composite] = await Promise.all([
  load(`v-${concept}`),
  load("reveal"),
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
  shaders: { reveal, bright, blur, composite },
  tuning: conceptById(concept)!.tuning,
  gridSeed: Number(arg("seed", "7")),
  output,
});

// The persistent field needs frames to build up, so a still is rendered by
// sweeping the pointer along a path rather than by stamping one dot.
const steps = Number(arg("steps", "90"));
const dt = 1 / 60;
const target: [number, number] = [px * width, py * height];
// A curved stroke that ends on the target: the persistent field only shows up
// in a still if the pointer actually travelled somewhere.
const path = (t: number): [number, number] => [
  target[0] - width * 0.42 * (1 - t),
  target[1] - height * 0.22 * Math.sin((1 - t) * Math.PI * 0.9),
];
let previous: [number, number] = path(0);

for (let i = 0; i < steps; i++) {
  const t = i / (steps - 1);
  const current = path(t);
  pipeline.render({
    time: time - (steps - i) * dt,
    dt,
    pointer: current,
    previousPointer: previous,
    click: [px * width, py * height],
    pointerActive: 1,
    clickAge,
    speed: Number(arg("speed", "700")) * (0.4 + 0.6 * (1 - t)),
    intro: 1,
  });
  previous = current;
}

await gpu.settled();
const pixels = await output.read();
const png = new PNG({ width, height });
png.data.set(pixels);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out}`);
gpu.dispose();
