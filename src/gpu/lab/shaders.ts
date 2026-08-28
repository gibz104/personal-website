import blur from "../shaders/blur.wgsl";
import bright from "../shaders/bright.wgsl";
import composite from "../shaders/composite.wgsl";
import emitters from "../shaders/v-emitters.wgsl";
import relief from "../shaders/v-relief.wgsl";
import reveal from "../shaders/reveal.wgsl";
import strata from "../shaders/v-strata.wgsl";
import type { LabShaders } from "./pipeline";

export const CONCEPT_SHADERS = { relief, strata, emitters } as const;
export type ConceptId = keyof typeof CONCEPT_SHADERS;

export const LAB_SHARED: LabShaders = { reveal, bright, blur, composite };
