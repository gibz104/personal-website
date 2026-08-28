import aperture from "../shaders/aperture.wgsl";
import blur from "../shaders/blur.wgsl";
import bright from "../shaders/bright.wgsl";
import composite from "../shaders/composite.wgsl";
import decode from "../shaders/decode.wgsl";
import prism from "../shaders/prism.wgsl";
import type { LabShaders } from "./pipeline";

export const CONCEPT_SHADERS = { prism, aperture, decode } as const;
export type ConceptId = keyof typeof CONCEPT_SHADERS;

export const LAB_SHARED: LabShaders = { bright, blur, composite };
