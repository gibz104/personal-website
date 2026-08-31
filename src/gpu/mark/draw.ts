import { DEFAULT_FACE, type MarkFace } from "./faces";

/**
 * The monogram, rasterised identically in the browser and in the headless
 * preview.
 *
 * Both runtimes have a Canvas2D; only the constructor differs. Drawing it at the
 * live resolution rather than shipping a fixed bitmap keeps the letterforms
 * crisp at any viewport, and keeps the silhouette — which is what the flare
 * lights — free of resampling artefacts along its edge.
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
  measureText(text: string): {
    width: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
  };
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> };
};

export const MARK_TEXT = "RG";

/**
 * Cap height as a fraction of the shorter viewport edge.
 *
 * Cap height, not font size: the two are only loosely related and the ratio
 * differs by face, so sizing on font size would make every candidate a
 * different size on screen. Measuring the drawn capital and solving for the
 * size that hits this target is what makes the faces comparable — and what
 * keeps the mark's weight identical in portrait and landscape.
 */
const CAP_HEIGHT = 0.27;

/** Hard ceiling on the mark's width, as a fraction of the viewport. */
const MAX_WIDTH = 0.50;

type Metrics = { size: number; x: number; y: number; cap: number; width: number };

function fit(ctx: Ctx2D, width: number, height: number, face: MarkFace): Metrics {
  const short = Math.min(width, height);
  const target = short * CAP_HEIGHT;

  const apply = (size: number) => {
    ctx.font = `${face.weight} ${size}px ${face.family}, sans-serif`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-size * face.tracking}px`;
    return ctx.measureText(MARK_TEXT);
  };

  // Probe once to learn this face's cap-height-to-size ratio, then solve.
  const PROBE = 200;
  const probe = apply(PROBE);
  const ratio = (probe.actualBoundingBoxAscent || PROBE * 0.7) / PROBE;
  let size = target / ratio;

  let m = apply(size);
  const maxWidth = width * MAX_WIDTH;
  if (m.width > maxWidth) {
    size = size * (maxWidth / m.width);
    m = apply(size);
  }

  // Centre on the ink, not the baseline: where a baseline sits inside the em
  // is a decision each designer made differently.
  const cap = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  return {
    size,
    x: width / 2,
    y: height / 2 + (cap - descent) / 2,
    cap,
    width: m.width,
  };
}

/**
 * Draws the mark into two channels of one canvas: red is the outline, green is
 * the filled body.
 *
 * The outline is what the flare treats as its emitter. The reference example's
 * logo is thin strokes, so its rim is naturally a thin shape; feeding a solid
 * letterform through the same parameters lights the whole body instead of its
 * edge. The fill is kept separately, only to punch the body black.
 */
export function drawMark(
  ctx: Ctx2D,
  width: number,
  height: number,
  face: MarkFace = DEFAULT_FACE,
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = fit(ctx, width, height, face);

  ctx.fillStyle = "#0f0";
  ctx.fillText(MARK_TEXT, m.x, m.y);

  // Stroked on the path, so the fill punch later removes its inner half and
  // leaves a clean outer edge for the light to escape along.
  ctx.strokeStyle = "#f00";
  ctx.lineWidth = Math.max(1.1, m.cap * face.stroke);
  ctx.lineJoin = "round";
  ctx.strokeText(MARK_TEXT, m.x, m.y);
}

/** Two-channel coverage, row-major: R is the outline, G is the body. */
export function markCoverage(
  ctx: Ctx2D,
  width: number,
  height: number,
  face: MarkFace = DEFAULT_FACE,
): Uint8Array<ArrayBuffer> {
  drawMark(ctx, width, height, face);
  const { data } = ctx.getImageData(0, 0, width, height);
  const out = new Uint8Array(width * height * 2);
  for (let i = 0; i < width * height; i++) {
    out[i * 2] = data[i * 4]!;
    out[i * 2 + 1] = data[i * 4 + 1]!;
  }
  return out;
}

/** Measured box of the drawn mark — used to report and tune its size. */
export function markMetrics(
  ctx: Ctx2D,
  width: number,
  height: number,
  face: MarkFace = DEFAULT_FACE,
): { cap: number; width: number; capShare: number; widthShare: number } {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = fit(ctx, width, height, face);
  return {
    cap: m.cap,
    width: m.width,
    capShare: m.cap / Math.min(width, height),
    widthShare: m.width / width,
  };
}
