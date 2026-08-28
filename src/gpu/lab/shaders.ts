import blur from "../shaders/blur.wgsl";
import bright from "../shaders/bright.wgsl";
import charge from "../shaders/v-charge.wgsl";
import composite from "../shaders/composite.wgsl";
import lantern from "../shaders/v-lantern.wgsl";
import reveal from "../shaders/reveal.wgsl";
import wake from "../shaders/v-wake.wgsl";
import type { LabShaders } from "./pipeline";

export const CONCEPT_SHADERS = { lantern, wake, charge } as const;
export type ConceptId = keyof typeof CONCEPT_SHADERS;

export const LAB_SHARED: LabShaders = { reveal, bright, blur, composite };
