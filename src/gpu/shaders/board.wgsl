// Procedural placement of code lines on the character board.
//
// Nothing is stored. Which line sits where, and when it appears, is a hash of
// the row and an epoch counter that never stops climbing — so the page cannot
// repeat itself no matter how long it is watched. The only asset is the corpus
// texture: one code line per row, sorted shortest first, with R the glyph, G
// the token class and B the line's length.
//
// Two rules keep a line from ever appearing broken, which is the one thing this
// field must not do:
//
//  1. A placement is only chosen from lines that fit the current board width,
//     and its start column is clamped so the whole line lands on screen.
//  2. A row carries two placements, and the second is dropped whenever it would
//     land on top of the first. Two lines sharing cells means the later one
//     overwrites the middle of the earlier — which reads exactly like a line
//     cut in half, because it is one.

import { hash2 } from "@vgpu/wgsl-std/hash";

/// Line placements per row of the board.
const SLOTS: u32 = 2u;
/// Seconds one slot holds one line before drawing a new one.
const PERIOD: f32 = 78.0;
/// Seconds a line spends on screen within that period.
const WINDOW: f32 = 9.5;
/// Widest line the corpus texture can hold.
const CORPUS_WIDTH: i32 = 128;
/// Blank columns kept between two lines sharing a row.
const GAP: f32 = 3.0;

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

/// Where one slot has put a line this epoch, before any cell is considered.
struct Slot {
  line: u32,
  start: f32,
  length: f32,
  local: f32,
  seed: f32,
  live: f32,
}

fn slotAt(
  corpus: texture_2d<u32>,
  row: f32,
  slot: u32,
  time: f32,
  usableCount: f32,
  cols: f32,
) -> Slot {
  var out: Slot;
  out.line = 0u;
  out.start = 0.0;
  out.length = 0.0;
  out.local = -1000.0;
  out.seed = 0.0;
  out.live = 0.0;
  if (usableCount < 1.0) { return out; }

  // Each row-slot runs its own clock, offset so the page does not pulse.
  let rowSeed = hash2(vec2f(row * 0.0137 + f32(slot) * 41.7, 5.31)).x;
  let t = time / PERIOD + rowSeed;
  let epoch = floor(t);
  let phase = fract(t) * PERIOD;

  // Everything about this instance: which line, where it starts, when it shows.
  // Keyed on the epoch, so the next turn of the same slot draws an unrelated
  // line in an unrelated place.
  let a = hash2(vec2f(row * 0.911 + f32(slot) * 17.3, epoch * 1.373 + 0.5));
  let b = hash2(vec2f(epoch * 0.7131 + f32(slot) * 5.17, row * 0.379 + 2.91));

  // Only lines short enough for this board are addressable.
  out.line = u32(clamp(a.x, 0.0, 0.999) * usableCount);

  // The row's own length, carried in every texel of it.
  out.length = max(f32(textureLoad(corpus, vec2u(0u, out.line), 0).z), 1.0);
  out.start = floor(a.y * max(cols - out.length - 1.0, 0.0));
  out.local = phase - b.x * max(PERIOD - WINDOW, 1.0);
  out.seed = b.y;
  out.live = 1.0;
  return out;
}

/// True when two slots would share any cell, once a gap is allowed for.
fn collides(a: Slot, b: Slot) -> bool {
  if (a.live < 0.5 || b.live < 0.5) { return false; }
  return a.start < b.start + b.length + GAP && b.start < a.start + a.length + GAP;
}

/// Reads one cell out of a slot, if that slot covers it.
fn readSlot(corpus: texture_2d<u32>, s: Slot, col: f32, out: ptr<function, Placement>) {
  if (s.live < 0.5) { return; }
  let idx = i32(col - s.start);
  if (idx < 0 || idx >= CORPUS_WIDTH) { return; }
  let texel = textureLoad(corpus, vec2u(u32(idx), s.line), 0);
  if (texel.x == 255u) { return; }

  (*out).glyph = texel.x;
  (*out).token = texel.y;
  (*out).present = 1.0;
  (*out).along = clamp(f32(idx) / s.length, 0.0, 1.0);
  (*out).local = s.local;
  (*out).seed = s.seed;
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

  let first = slotAt(corpus, cellId.y, 0u, time, usableCount, cols);
  var second = slotAt(corpus, cellId.y, 1u, time, usableCount, cols);

  // The row resolves its own layout before any cell is read, so every cell in
  // it agrees about which lines exist. Deciding per-cell would truncate one.
  if (collides(first, second)) { second.live = 0.0; }

  readSlot(corpus, first, cellId.x, &out);
  readSlot(corpus, second, cellId.x, &out);
  return out;
}
