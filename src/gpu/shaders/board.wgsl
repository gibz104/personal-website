// Procedural placement of code lines on the character board.
//
// Nothing is stored. Which line sits where, and when it appears, is a hash of
// the row and an epoch counter that never stops climbing — so the page cannot
// repeat itself no matter how long it is watched. The only asset is the corpus
// texture: one code line per row, sorted shortest first, with R the glyph, G
// the token class and B the line's length.
//
// A placement is only ever chosen from lines that fit the current board width,
// and its start column is clamped so the whole line lands on screen. A line
// that runs off the edge is clipped mid-token, and clipped code reads as broken
// code — which is the one thing this field must never do.

import { hash2 } from "@vgpu/wgsl-std/hash";

/// Line placements per row of the board.
const SLOTS: u32 = 2u;
/// Seconds one slot holds one line before drawing a new one.
const PERIOD: f32 = 78.0;
/// Seconds a line spends on screen within that period.
const WINDOW: f32 = 9.5;
/// Widest line the corpus texture can hold.
const CORPUS_WIDTH: i32 = 128;

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
  usableCount: f32,
  cols: f32,
) -> Placement {
  var out: Placement;
  out.glyph = 0u;
  out.token = 0u;
  out.present = 0.0;
  out.along = 0.0;
  out.local = -1000.0;
  out.seed = 0.0;

  if (usableCount < 1.0) { return out; }

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

    // Only lines short enough for this board are addressable.
    let lineIndex = u32(clamp(a.x, 0.0, 0.999) * usableCount);

    // The row's own length, carried in every texel of it.
    let header = textureLoad(corpus, vec2u(0u, lineIndex), 0);
    let lineLen = max(f32(header.z), 1.0);

    // Clamped so the whole line lands on screen, never clipped by the edge.
    let startCol = floor(a.y * max(cols - lineLen - 1.0, 0.0));

    let idx = i32(cellId.x - startCol);
    if (idx < 0 || idx >= CORPUS_WIDTH) { continue; }

    let texel = textureLoad(corpus, vec2u(u32(idx), lineIndex), 0);
    if (texel.x == 255u) { continue; }

    out.glyph = texel.x;
    out.token = texel.y;
    out.present = 1.0;
    out.along = clamp(f32(idx) / lineLen, 0.0, 1.0);
    out.local = phase - b.x * max(PERIOD - WINDOW, 1.0);
    out.seed = b.y;
  }

  return out;
}
