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
  strokeStyle: unknown;
  lineWidth: number;
  lineJoin: unknown;
  font: string;
  textAlign: unknown;
  textBaseline: unknown;
  letterSpacing?: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  measureText(text: string): { width: number };
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> };
};

export const MARK_TEXT = "RG";

/**
 * Heavy on purpose: the mark's job is to block light, and a light weight leaks
 * so much through the counters that there is no silhouette left to flare around.
 */
const STACK = '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Cap height as a fraction of the shorter viewport edge. */
const SCALE = 0.37;

/**
 * Outline weight as a fraction of cap height.
 *
 * Thin on purpose. The reference's logo is a hairline, and the flare reads as
 * light escaping an edge only while the edge is finer than the glow around it;
 * a heavy stroke turns the same maths into a lit slab.
 */
const STROKE = 0.014;

/**
 * Draws the mark into two channels of one canvas: red is the outline, green is
 * the filled body.
 *
 * The outline is what the flare treats as its emitter. The reference example's
 * logo is genuinely thin strokes, so its rim is naturally a thin shape; feeding
 * a solid letterform through the same parameters lights the whole body instead
 * of its edge. The fill is kept separately, only to punch the body black.
 */
export function drawMark(ctx: Ctx2D, width: number, height: number): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const short = Math.min(width, height);
  let size = short * SCALE;
  ctx.font = `900 ${size}px ${STACK}`;
  // Tighten the pair so the two letters read as one mark.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${-size * 0.045}px`;

  // Never let the mark crowd the edges on a wide-but-short viewport.
  const maxWidth = width * 0.44;
  const measured = ctx.measureText(MARK_TEXT).width;
  if (measured > maxWidth) {
    size = size * (maxWidth / measured);
    ctx.font = `900 ${size}px ${STACK}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-size * 0.045}px`;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Optical centring: "middle" sits a touch low for all-caps.
  const x = width / 2;
  const y = height / 2 + size * 0.035;

  // Green: the body. Red: the contour, stroked on the path so the fill punch
  // later removes its inner half and leaves a clean outer edge.
  ctx.fillStyle = "#0f0";
  ctx.fillText(MARK_TEXT, x, y);

  ctx.strokeStyle = "#f00";
  ctx.lineWidth = Math.max(1.5, size * STROKE);
  ctx.lineJoin = "round";
  ctx.strokeText(MARK_TEXT, x, y);
}

/** Two-channel coverage, row-major: R is the outline, G is the body. */
export function markCoverage(
  ctx: Ctx2D,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  drawMark(ctx, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const out = new Uint8Array(width * height * 2);
  for (let i = 0; i < width * height; i++) {
    out[i * 2] = data[i * 4]!;
    out[i * 2 + 1] = data[i * 4 + 1]!;
  }
  return out;
}
