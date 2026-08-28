// Browser-side shader bundle. The bundler loader resolves each import graph at
// build time; `scripts/preview.mts` resolves the same files from disk. Both
// hand the pipeline an identical bundle.
import attractors from "./shaders/attractors.wgsl";
import blur from "./shaders/blur.wgsl";
import bright from "./shaders/bright.wgsl";
import composite from "./shaders/composite.wgsl";
import fade from "./shaders/fade.wgsl";
import particles from "./shaders/particles.wgsl";
import simulate from "./shaders/simulate.wgsl";
import type { ShaderBundle } from "./types";

export const SHADERS: ShaderBundle = {
  simulate,
  fade,
  particles,
  attractors,
  bright,
  blur,
  composite,
};
