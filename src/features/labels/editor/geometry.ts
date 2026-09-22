/**
 * Millimetres on the stock, and where they land on a screen.
 *
 * Two rules hold everything here together.
 *
 * **The document is millimetres and nothing else.** A Label Layout holds no
 * pixels, no DPI and no device, which is what lets one saved revision print
 * on a printer nobody has bought yet. So every edit is computed in
 * millimetres and quantized to the document's own grid before it is written;
 * a value finer than the quantum is *rejected* by the backend rather than
 * rounded, so rounding here is not a nicety, it is the only way an edit
 * survives publication.
 *
 * **Screen pixels are measured, never assumed.** A pointer arrives in CSS
 * pixels, and the map from those to millimetres comes from the stage's own
 * `getBoundingClientRect()` — which already folds in browser zoom, device
 * pixel ratio, and any CSS transform on the way down. That is why dragging
 * behaves identically at 50% and 200% zoom: not because anything corrects for
 * zoom, but because nothing ever assumes a scale in the first place.
 *
 * Nothing in this module mutates. Every function returns a new frame, which
 * is what lets the undo stack hold documents rather than reverse operations.
 */

import type { LabelDocument, LabelElement, LabelFrame } from '../../../slices/labels/draft-schema';

/** The document grid, in millimetres. The backend publishes it; this is the fallback. */
export const DEFAULT_QUANTUM_MM = 0.01;

/** How far an arrow key moves a selection, and how far Shift takes it. */
export const NUDGE_MM = 0.5;
export const COARSE_NUDGE_MM = 2;

/** The stock a layout sits on, as the editor needs it. */
export interface StockMm {
  widthMm: number;
  heightMm: number;
}

/** Which corner or edge a resize is pulling. */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** Nothing smaller than this is a rectangle anybody meant to make. */
const MINIMUM_EXTENT_MM = 1;

/**
 * Snap one millimetre value onto the document grid.
 *
 * Rounded rather than truncated so a drag does not drift one way over a
 * hundred small moves, and passed through `Number.parseFloat` so the result
 * is 2.5 rather than 2.5000000000000004 — a document is compared by digest,
 * and float noise in the JSON is a different layout to the backend.
 */
export function quantize(value: number, quantumMm: number = DEFAULT_QUANTUM_MM): number {
  const steps = Math.round(value / quantumMm);
  return Number.parseFloat((steps * quantumMm).toFixed(6));
}

/** Quantize all four edges of a frame at once. */
export function quantizeFrame(frame: LabelFrame, quantumMm = DEFAULT_QUANTUM_MM): LabelFrame {
  return {
    x_mm: quantize(frame.x_mm, quantumMm),
    y_mm: quantize(frame.y_mm, quantumMm),
    width_mm: quantize(frame.width_mm, quantumMm),
    height_mm: quantize(frame.height_mm, quantumMm),
  };
}

/**
 * Keep a frame on the paper.
 *
 * Moving, not shrinking: a drag that reaches the edge stops there with its
 * size intact, which is what a user expects from dragging. A frame too large
 * for the stock is left at the origin oversized rather than silently made to
 * fit — the backend will refuse it with `frame.outside_stock`, and that
 * refusal naming the real problem beats a rectangle that quietly became
 * something the user did not draw.
 */
export function clampToStock(
  frame: LabelFrame,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): LabelFrame {
  const x = Math.min(Math.max(frame.x_mm, 0), Math.max(stock.widthMm - frame.width_mm, 0));
  const y = Math.min(Math.max(frame.y_mm, 0), Math.max(stock.heightMm - frame.height_mm, 0));
  return quantizeFrame({ ...frame, x_mm: x, y_mm: y }, quantumMm);
}

/** Move a frame by a millimetre delta, quantized and kept on the paper. */
export function translateFrame(
  frame: LabelFrame,
  deltaXMm: number,
  deltaYMm: number,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): LabelFrame {
  return clampToStock(
    { ...frame, x_mm: frame.x_mm + deltaXMm, y_mm: frame.y_mm + deltaYMm },
    stock,
    quantumMm
  );
}

/**
 * Resize a frame by dragging one handle.
 *
 * The opposite edge is the anchor, so pulling the west handle moves the left
 * edge and leaves the right one alone — the behaviour a handle implies. A
 * pull that would invert or collapse the rectangle stops at
 * {@link MINIMUM_EXTENT_MM} instead of flipping it: a negative extent is not
 * a shape a Label Layout can express, and a rectangle that turned inside out
 * under the cursor is never what somebody meant.
 */
export function resizeFrame(
  frame: LabelFrame,
  handle: ResizeHandle,
  deltaXMm: number,
  deltaYMm: number,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): LabelFrame {
  let { x_mm: x, y_mm: y, width_mm: width, height_mm: height } = frame;

  if (handle.includes('w')) {
    const right = x + width;
    x = Math.min(Math.max(x + deltaXMm, 0), right - MINIMUM_EXTENT_MM);
    width = right - x;
  } else if (handle.includes('e')) {
    width = Math.min(Math.max(width + deltaXMm, MINIMUM_EXTENT_MM), stock.widthMm - x);
  }

  if (handle.includes('n')) {
    const bottom = y + height;
    y = Math.min(Math.max(y + deltaYMm, 0), bottom - MINIMUM_EXTENT_MM);
    height = bottom - y;
  } else if (handle.includes('s')) {
    height = Math.min(Math.max(height + deltaYMm, MINIMUM_EXTENT_MM), stock.heightMm - y);
  }

  return quantizeFrame({ x_mm: x, y_mm: y, width_mm: width, height_mm: height }, quantumMm);
}

/**
 * Set one edge directly, the way the exact millimetre controls do.
 *
 * The same clamping as a drag, because a number typed into a field and a
 * rectangle dragged to the same place have to produce the same document. An
 * exact control that could express geometry a drag could not would make the
 * two views of one frame disagree.
 */
export function setFrameField(
  frame: LabelFrame,
  field: keyof LabelFrame,
  value: number,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): LabelFrame {
  const next: LabelFrame = { ...frame, [field]: Math.max(value, 0) };
  if (field === 'width_mm') next.width_mm = Math.max(next.width_mm, MINIMUM_EXTENT_MM);
  if (field === 'height_mm') next.height_mm = Math.max(next.height_mm, MINIMUM_EXTENT_MM);
  return clampToStock(next, stock, quantumMm);
}

/**
 * Convert a pointer displacement in CSS pixels to one in millimetres.
 *
 * `rect` is the stage's measured box and `stock` the paper it represents, so
 * the ratio between them is the only scale this module ever uses. Nothing
 * here reads `devicePixelRatio`, a zoom level or a transform: a measured box
 * has all three in it already.
 */
export function pixelsToMm(
  deltaXPx: number,
  deltaYPx: number,
  rect: { width: number; height: number },
  stock: StockMm
): { deltaXMm: number; deltaYMm: number } {
  if (rect.width <= 0 || rect.height <= 0) return { deltaXMm: 0, deltaYMm: 0 };
  return {
    deltaXMm: (deltaXPx / rect.width) * stock.widthMm,
    deltaYMm: (deltaYPx / rect.height) * stock.heightMm,
  };
}

/** Where a frame sits on the stage, as percentages the stylesheet can use. */
export function frameAsPercentages(
  frame: LabelFrame,
  stock: StockMm
): { left: string; top: string; width: string; height: string } {
  const percent = (value: number, total: number): string =>
    `${total > 0 ? (value / total) * 100 : 0}%`;
  return {
    left: percent(frame.x_mm, stock.widthMm),
    top: percent(frame.y_mm, stock.heightMm),
    width: percent(frame.width_mm, stock.widthMm),
    height: percent(frame.height_mm, stock.heightMm),
  };
}

// ---------------------------------------------------------------------------
// Editing a document without reshaping it
// ---------------------------------------------------------------------------

/**
 * Return the document with one element's frame replaced.
 *
 * A structured clone with one field patched, never a rebuild from a parsed
 * model. The backend's document schema is **closed**: a property this card
 * did not know about and dropped on the way through would come back as a
 * validation error on the user's own work, and a property a newer backend
 * added is exactly the case a rebuild would silently lose.
 */
export function withFrame(
  document: LabelDocument,
  elementId: string,
  frame: LabelFrame
): LabelDocument {
  return {
    ...document,
    elements: document.elements.map((element) =>
      element.id === elementId ? { ...element, frame } : element
    ),
  };
}

/** The element the editor is acting on, or nothing. */
export function elementById(
  document: LabelDocument,
  elementId: string | null
): LabelElement | undefined {
  if (elementId === null) return undefined;
  return document.elements.find((element) => element.id === elementId);
}

/**
 * The element a newly opened draft selects.
 *
 * The required strain-name text element where there is one, because it is the
 * element every publishable layout has and the one this editor is about; the
 * first element otherwise, so a document whose required element the card
 * cannot recognise still opens onto something rather than onto nothing.
 */
export function defaultSelection(document: LabelDocument): string | null {
  const required = document.elements.find(
    (element) =>
      element.kind === 'text' &&
      (element as { content?: { binding?: string } }).content?.binding === 'strain.name'
  );
  return (required ?? document.elements[0])?.id ?? null;
}
