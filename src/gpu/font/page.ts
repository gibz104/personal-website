import { CODE_LINES, type CorpusLine } from "./corpus";

/**
 * The corpus, as a texture the shader indexes into.
 *
 * The page used to be baked at load: a fixed grid of characters at fixed
 * positions, which repeats. The shader now places lines procedurally from this
 * table, choosing which line and where it sits from a hash of the row and an
 * epoch counter that never stops climbing. Nothing is stored, so nothing can
 * repeat.
 *
 * Rows are sorted by length, shortest first. That ordering is what lets a
 * narrow viewport stay correct: the pipeline counts how many lines fit the
 * current column width and the shader only ever indexes below that count, so a
 * line can never be placed where it would run off the edge and be clipped
 * mid-token. Clipped code reads as broken code.
 *
 * Layout per row: R the glyph index, G the token class, B the line's length in
 * characters (the same in every texel of the row), A unused.
 */
export const CORPUS_WIDTH = 128;
export const CORPUS_HEIGHT = 96;

/** Glyph sentinel meaning "past the end of this line". */
export const CORPUS_END = 255;

const SORTED: CorpusLine[] = [...CODE_LINES].sort(
  (a, b) => a.cells.length - b.cells.length,
);

/** Lengths of the populated rows, ascending — same order as the texture. */
export const CORPUS_LENGTHS: number[] = SORTED.map((line) =>
  Math.min(line.cells.length, CORPUS_WIDTH - 1),
);

export const CORPUS_COUNT = Math.min(SORTED.length, CORPUS_HEIGHT);

/**
 * How many lines fit a board this many columns wide.
 *
 * Lengths are ascending, so this is just the count below the limit — and
 * because the shader indexes into `[0, usable)`, every placement is guaranteed
 * to sit entirely on screen.
 */
export function usableLineCount(columns: number): number {
  const limit = Math.floor(columns) - 2;
  let count = 0;
  while (count < CORPUS_COUNT && CORPUS_LENGTHS[count]! <= limit) count++;
  return count;
}

export function buildCorpusTexture(): Uint8Array<ArrayBuffer> {
  // 128 cells x 4 bytes = 512, a multiple of WebGPU's 256-byte row alignment.
  const data = new Uint8Array(CORPUS_WIDTH * CORPUS_HEIGHT * 4);

  for (let row = 0; row < CORPUS_HEIGHT; row++) {
    const line = SORTED[row % SORTED.length]!;
    const base = row * CORPUS_WIDTH * 4;
    const length = Math.min(line.cells.length, CORPUS_WIDTH - 1);
    for (let i = 0; i < length; i++) {
      const cell = line.cells[i]!;
      data[base + i * 4] = Math.max(0, Math.min(94, cell.char - 32));
      data[base + i * 4 + 1] = cell.token;
      data[base + i * 4 + 2] = length;
    }
    data[base + length * 4] = CORPUS_END;
    data[base + length * 4 + 2] = length;
  }

  return data;
}

/** Realised language mix, weighted by line length — the share of the page. */
export function measureCorpus(): Record<string, number> {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const line of CODE_LINES) {
    counts[line.lang] = (counts[line.lang] ?? 0) + line.cells.length;
    total += line.cells.length;
  }
  for (const key of Object.keys(counts)) counts[key]! /= total;
  return counts;
}
