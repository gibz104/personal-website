import {
  LANGUAGE_WEIGHT,
  LINES_BY_LANGUAGE,
  type CorpusLine,
  type Language,
} from "./corpus";

/** Cells of code the shaders sample. Wide enough to cover any viewport. */
export const GRID_COLS = 256;
export const GRID_ROWS = 128;

const LANGUAGES = Object.keys(LANGUAGE_WEIGHT) as Language[];

/**
 * Builds the code page. Four channels per cell:
 *
 *   R  glyph index
 *   G  token class
 *   B  line id, 1..255, or 0 where no line was placed
 *   A  the cell's position along its line
 *
 * The line id is what lets the reveal work on whole lines rather than on
 * regions. Revealing a rectangle settles the empty cells inside it too, which
 * blanks them and draws a visible band across the noise; revealing a line
 * settles exactly the characters that belong to it and leaves everything around
 * them still flickering.
 *
 * The position along the line drives the order characters land in, so a line
 * lands left to right along itself no matter where it sits on screen.
 *
 * Placement is greedy against the language weights rather than randomly
 * sampled, so the share of the screen each language covers actually matches the
 * declared fluency instead of merely approximating it in expectation. Several
 * lines land per row at independent offsets, which keeps the language variety
 * two-dimensional — you find Rust by moving sideways, not only downward.
 *
 * `bytesPerRow` lands on 512 for a 256-wide grid, already a multiple of the
 * 256-byte alignment WebGPU wants, so no row padding is needed.
 */
export function buildCodeGrid(seed = 7): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(GRID_COLS * GRID_ROWS * 4);
  // 1..255; 0 means "no line here" and must never be handed out.
  let lineId = 0;

  // Deterministic PRNG: the page must be identical in the browser and in the
  // headless preview, or they stop being comparable.
  let state = (seed * 2654435761) >>> 0;
  const rand = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };

  // Characters committed per language so far, against the target share.
  const placed: Record<Language, number> = { python: 0, typescript: 0, rust: 0, c: 0 };
  let total = 0;

  /** Whichever language is furthest below its target share. */
  const nextLanguage = (): Language => {
    let best = LANGUAGES[0]!;
    let worst = -Infinity;
    for (const lang of LANGUAGES) {
      const share = total === 0 ? 0 : placed[lang] / total;
      const deficit = LANGUAGE_WEIGHT[lang] - share;
      if (deficit > worst) {
        worst = deficit;
        best = lang;
      }
    }
    return best;
  };

  // Identity lines are spread on a coarse stride so they never clump, and stay
  // rare enough to feel like something you found.
  const identityRows = new Set<number>();
  for (let row = 5; row < GRID_ROWS; row += 19) {
    identityRows.add(row + Math.floor(rand() * 4));
  }

  const write = (row: number, startCol: number, line: CorpusLine) => {
    lineId = (lineId % 255) + 1;
    for (let i = 0; i < line.cells.length; i++) {
      const col = startCol + i;
      if (col < 0 || col >= GRID_COLS) continue;
      const cell = line.cells[i]!;
      const index = (row * GRID_COLS + col) * 4;
      data[index] = Math.max(0, Math.min(94, cell.char - 32));
      data[index + 1] = cell.token;
      data[index + 2] = lineId;
      data[index + 3] = Math.min(255, i);
    }
    placed[line.lang] += line.cells.length;
    total += line.cells.length;
  };

  for (let row = 0; row < GRID_ROWS; row++) {
    // A few blank rows keep the page from reading as a solid slab.
    if (rand() < 0.10) continue;

    const wantIdentity = identityRows.has(row);
    const placements = wantIdentity ? 1 : rand() < 0.45 ? 2 : 1;

    // Two placements share the row, so each gets half of it to sit in.
    const span = Math.floor(GRID_COLS / placements);

    for (let slot = 0; slot < placements; slot++) {
      const lang = nextLanguage();
      const pool = LINES_BY_LANGUAGE[lang];
      if (pool.length === 0) continue;

      const candidates = wantIdentity ? pool.filter((l) => l.identity) : pool.filter((l) => !l.identity);
      const source = candidates.length > 0 ? candidates : pool;
      const line = source[Math.floor(rand() * source.length)]!;

      const room = Math.max(1, span - line.cells.length);
      const startCol = slot * span + Math.floor(rand() * room);
      write(row, startCol, line);
    }
  }

  return data;
}

/** Realised share of the page per language — used to verify the weighting. */
export function measureGrid(data: Uint8Array): Record<number, number> {
  const counts: Record<number, number> = {};
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const token = data[i + 1]!;
    const glyph = data[i]!;
    if (glyph === 0) continue; // space
    counts[token] = (counts[token] ?? 0) + 1;
    total++;
  }
  for (const key of Object.keys(counts)) counts[Number(key)]! /= total;
  return counts;
}
