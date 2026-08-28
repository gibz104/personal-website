/**
 * The monogram, rasterised identically in the browser and in the headless
 * preview.
 *
 * Both runtimes have a Canvas2D; only the constructor differs. Drawing it at the
 * live resolution rather than shipping a fixed bitmap keeps the letterforms
 * crisp at any viewport, and keeps the silhouette — which is what occludes the
 * light — free of resampling artefacts along its edge.
 */

/** The slice of Canvas2D this needs. Satisfied by the DOM and by @napi-rs/canvas. */
export type Ctx2D = {
  fillStyle: unknown;
  font: string;
  textAlign: unknown;
  textBaseline: unknown;
  letterSpacing?: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  measureText(text: string): { width: number };
  fillText(text: string, x: number, y: number): void;
  getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> };
};

export const MARK_TEXT = "RG";

/**
 * Heavy on purpose: the mark's job is to block light, and a light weight leaks
 * so much through the counters that there is no silhouette left to flare around.
 */
const STACK = '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Cap height as a fraction of the shorter viewport edge. */
const SCALE = 0.46;

export function drawMark(ctx: Ctx2D, width: number, height: number): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const short = Math.min(width, height);
  let size = short * SCALE;
  ctx.font = `900 ${size}px ${STACK}`;
  // Tighten the pair so the two letters read as one mark.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${-size * 0.045}px`;

  // Never let the mark crowd the edges on a wide-but-short viewport.
  const maxWidth = width * 0.52;
  const measured = ctx.measureText(MARK_TEXT).width;
  if (measured > maxWidth) {
    size = size * (maxWidth / measured);
    ctx.font = `900 ${size}px ${STACK}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-size * 0.045}px`;
  }

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Optical centring: "middle" sits a touch low for all-caps.
  ctx.fillText(MARK_TEXT, width / 2, height / 2 + size * 0.035);
}

/** Single-channel coverage, row-major. */
export function markCoverage(
  ctx: Ctx2D,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  drawMark(ctx, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4]!;
  return out;
}
