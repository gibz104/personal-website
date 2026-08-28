import { CODE_LINES } from "./corpus";

/** Cells of code the shaders sample. Wide enough to cover any viewport. */
export const GRID_COLS = 256;
export const GRID_ROWS = 128;

/**
 * Builds the code page: one byte of glyph index and one byte of token class per
 * cell, ready for an `rg8uint` texture.
 *
 * `bytesPerRow` lands on 512 for a 256-wide grid, already a multiple of the
 * 256-byte alignment WebGPU wants, so no row padding is needed.
 */
export function buildCodeGrid(seed = 1): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(GRID_COLS * GRID_ROWS * 2);

  // Small deterministic PRNG: the page must be identical in the browser and in
  // the headless preview, or they stop being comparable.
  let state = (seed * 2654435761) >>> 0;
  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };

  for (let row = 0; row < GRID_ROWS; row++) {
    // A few blank rows keep the page from reading as a solid slab.
    if (rand() < 0.08) continue;

    const line = CODE_LINES[Math.floor(rand() * CODE_LINES.length)]!;
    // Stagger the start column so nothing lines up into vertical seams.
    const start = Math.floor(rand() * (GRID_COLS - 8));

    for (let i = 0; i < line.length; i++) {
      const col = start + i;
      if (col >= GRID_COLS) break;
      const cell = line[i]!;
      const index = (row * GRID_COLS + col) * 2;
      data[index] = Math.max(0, Math.min(94, cell.char - 32));
      data[index + 1] = cell.token;
    }
  }

  return data;
}
