import { CODE_LINES, type CorpusLine } from "./corpus";

/**
 * The corpus, as a texture the shader indexes into.
 *
 * The page used to be baked at load: a fixed grid of characters at fixed
 * positions. That repeats — watch for a minute and the same line comes back in
 * the same place. Instead the shader now places lines procedurally from this
 * table, choosing which line and where it sits from a hash of the row and an
 * epoch counter that never stops climbing. Nothing is stored, so nothing can
 * repeat.
 *
 * Layout: one corpus line per texture row. R is the glyph index, G the token
 * class, and R = END marks the end of the line.
 */
export const CORPUS_WIDTH = 128;
export const CORPUS_HEIGHT = 96;

/** Glyph sentinel meaning "past the end of this line". */
export const CORPUS_END = 255;

/** Number of lines actually populated. The shader picks within this. */
export const CORPUS_COUNT = Math.min(CODE_LINES.length, CORPUS_HEIGHT);

export function buildCorpusTexture(): Uint8Array<ArrayBuffer> {
  // 128 cells x 2 bytes = 256, exactly WebGPU's row alignment.
  const data = new Uint8Array(CORPUS_WIDTH * CORPUS_HEIGHT * 2);
  data.fill(0);

  const write = (row: number, line: CorpusLine) => {
    const base = row * CORPUS_WIDTH * 2;
    const length = Math.min(line.cells.length, CORPUS_WIDTH - 1);
    for (let i = 0; i < length; i++) {
      const cell = line.cells[i]!;
      data[base + i * 2] = Math.max(0, Math.min(94, cell.char - 32));
      data[base + i * 2 + 1] = cell.token;
    }
    data[base + length * 2] = CORPUS_END;
  };

  for (let row = 0; row < CORPUS_HEIGHT; row++) {
    const line = CODE_LINES[row % CODE_LINES.length]!;
    write(row, line);
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
