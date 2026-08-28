/**
 * Renders the real pipeline headless and writes a PNG.
 *
 * This is the whole reason the pipeline takes the vgpu module as a parameter:
 * the passes, shaders and uniforms below are the ones the browser runs, so
 * looking at the output here is looking at the site.
 *
 *   npx tsx scripts/preview.mts --scene field --steps 240 --out preview/field.png
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";
import { resolveShader } from "@vgpu/wgsl/runtime";
import * as node from "vgpu/node";

import { layoutAttractors } from "../src/gpu/layout";
import { createFieldPipeline, type Quality } from "../src/gpu/pipeline";
import { SCENES } from "../src/gpu/scenes";
import type { ShaderBundle } from "../src/gpu/types";
import type { SceneName } from "../src/gpu/types";
import type { Project } from "../src/lib/projects";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const width = Number(arg("width", "1280"));
const height = Number(arg("height", "720"));
const steps = Number(arg("steps", "260"));
const sceneName = arg("scene", "field") as SceneName;
const quality = arg("quality", "high") as Quality;
const out = resolve(arg("out", `preview/${sceneName}.png`));
const pointerX = Number(arg("px", "NaN"));
const pointerY = Number(arg("py", "NaN"));

const SHADER_DIR = new URL("../src/gpu/shaders/", import.meta.url);

async function loadShaders(): Promise<ShaderBundle> {
  const names = ["simulate", "fade", "particles", "attractors", "bright", "blur", "composite"] as const;
  const entries = await Promise.all(
    names.map(async (name) => {
      const resolved = await resolveShader({
        entry: new URL(`${name}.wgsl`, SHADER_DIR).pathname,
      });
      return [name, resolved.wgsl] as const;
    }),
  );
  return Object.fromEntries(entries) as unknown as ShaderBundle;
}

const projects = (
  JSON.parse(
    readFileSync(new URL("../src/data/projects.json", import.meta.url), "utf8"),
  ) as { projects: Project[] }
).projects;

const shaders = await loadShaders();
const attractors = layoutAttractors(projects);

const gpu = await node.init({ label: "field-preview" });
const output = node.target(gpu, { size: [width, height], format: "rgba8unorm", label: "preview-out" });

const pipeline = createFieldPipeline({
  gpu,
  api: node,
  shaders,
  output,
  attractors,
  quality,
});

const scene = { ...SCENES[sceneName] };
for (const key of ["zoom", "flow", "gravity", "coupling", "exposure", "coreGlow"] as const) {
  const v = Number(arg(key, "NaN"));
  if (Number.isFinite(v)) scene[key] = v;
}
const decay = Number(arg("decay", "0.86"));
if (sceneName === "focus") {
  scene.focusIndex = 0;
  scene.centerX = attractors[0]!.x;
  scene.centerY = attractors[0]!.y;
}

const hasPointer = Number.isFinite(pointerX) && Number.isFinite(pointerY);
const dt = 1 / 60;

// Warm up: the field starts as 180k dead particles and needs time to spread,
// braid and reach steady state before it is worth looking at.
for (let i = 0; i < steps; i++) {
  pipeline.render({
    time: i * dt,
    dt,
    pointer: hasPointer ? [pointerX, pointerY] : [999, 999],
    pointerForce: hasPointer ? 1 : 0,
    scene,
    hoverIndex: -1,
    hoverAmount: 0,
    fade: Math.min(1, i / 40),
    decay,
  });
}

await gpu.settled();
const pixels = await output.read();
const png = new PNG({ width, height });
png.data.set(pixels);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out} (${width}x${height}, ${steps} steps, ${pipeline.particleCount} particles)`);
gpu.dispose();
