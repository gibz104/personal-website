// Procedural placement of code lines on the character board.
//
// Nothing is stored. Which line sits where, and when it appears, is a hash of
// the row and an epoch counter that never stops climbing — so the page cannot
// repeat itself no matter how long it is watched. The only asset is the corpus
// texture: one code line per row, R the glyph and G the token class, with
// R = 255 marking the end of a line.

import { hash2 } from "@vgpu/wgsl-std/hash";

export const CELL: vec2f = vec2f(12.0, 20.0);

/// Line placements per row of the board.
const SLOTS: u32 = 2u;
/// Seconds one slot holds one line before drawing a new one.
const PERIOD: f32 = 78.0;
/// Seconds a line spends on screen within that period.
const WINDOW: f32 = 9.5;
/// Widest line the corpus texture can hold.
const CORPUS_WIDTH: i32 = 128;
/// Character count a line's landing order is normalised against.
const LINE_LENGTH: f32 = 68.0;

export struct Placement {
  glyph: u32,
  token: u32,
  /// 1 when a line covers this cell.
  present: f32,
  /// Position along the line, 0..1.
  along: f32,
  /// Seconds into this line's visible window. Negative before it appears.
  local: f32,
  /// Per-instance randomness, stable for the life of this placement.
  seed: f32,
}

/// What, if anything, is written at this cell right now.
export fn placementAt(
  corpus: texture_2d<u32>,
  cellId: vec2f,
  time: f32,
  corpusCount: f32,
  cols: f32,
) -> Placement {
  var out: Placement;
  out.glyph = 0u;
  out.token = 0u;
  out.present = 0.0;
  out.along = 0.0;
  out.local = -1000.0;
  out.seed = 0.0;

  for (var slot = 0u; slot < SLOTS; slot = slot + 1u) {
    // Each row-slot runs its own clock, offset so the page does not pulse.
    let rowSeed = hash2(vec2f(cellId.y * 0.0137 + f32(slot) * 41.7, 5.31)).x;
    let t = time / PERIOD + rowSeed;
    let epoch = floor(t);
    let phase = fract(t) * PERIOD;

    // Everything about this instance: which line, where it starts, when it
    // shows. Keyed on the epoch, so the next turn of the same slot draws an
    // unrelated line in an unrelated place.
    let a = hash2(vec2f(cellId.y * 0.911 + f32(slot) * 17.3, epoch * 1.373 + 0.5));
    let b = hash2(vec2f(epoch * 0.7131 + f32(slot) * 5.17, cellId.y * 0.379 + 2.91));

    let lineIndex = u32(clamp(a.x, 0.0, 0.999) * corpusCount);
    let startCol = floor(a.y * max(cols - 34.0, 4.0));
    let appearAt = b.x * max(PERIOD - WINDOW, 1.0);

    let idx = i32(cellId.x - startCol);
    if (idx < 0 || idx >= CORPUS_WIDTH) { continue; }

    let texel = textureLoad(corpus, vec2u(u32(idx), lineIndex), 0);
    if (texel.x == 255u) { continue; }

    out.glyph = texel.x;
    out.token = texel.y;
    out.present = 1.0;
    out.along = clamp(f32(idx) / LINE_LENGTH, 0.0, 1.0);
    out.local = phase - appearAt;
    out.seed = b.y;
  }

  return out;
}
