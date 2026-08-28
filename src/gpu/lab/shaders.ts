import blur from "../shaders/blur.wgsl";
import bright from "../shaders/bright.wgsl";
import cascade from "../shaders/v-cascade.wgsl";
import composite from "../shaders/composite.wgsl";
import focus from "../shaders/v-focus.wgsl";
import reveal from "../shaders/reveal.wgsl";
import trail from "../shaders/v-trail.wgsl";
import type { LabShaders } from "./pipeline";

export const CONCEPT_SHADERS = { trail, focus, cascade } as const;
export type ConceptId = keyof typeof CONCEPT_SHADERS;

export const LAB_SHARED: LabShaders = { reveal, bright, blur, composite };
