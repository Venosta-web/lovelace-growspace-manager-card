/**
 * Acting on more than one element at once, and on where they line up.
 *
 * Everything here is arithmetic over documents: a function takes a document
 * and returns another, never touching the DOM, a session, or a pointer. That
 * is what lets alignment, distribution, paint ordering, duplication and
 * snapping be *proved* rather than demonstrated — each is a rule about
 * rectangles, and a rule about rectangles is a test with numbers in it.
 *
 * Two conventions hold throughout.
 *
 * **Paint order is the array order**, because the canonical document has no
 * `z_index` and refuses one by name. So "bring forward" is a splice, and the
 * end of the array is the front.
 *
 * **Nothing repairs.** A frame that would leave the stock is clamped by
 * {@link clampToStock} on the way out, exactly as a drag is, and nothing else
 * is adjusted: an element too large for the paper stays too large and the
 * backend names it, rather than being quietly resized into something the user
 * did not draw.
 */

import type { LabelDocument, LabelElement, LabelFrame } from '../../../slices/labels/draft-schema';
import { DEFAULT_QUANTUM_MM, clampToStock, quantize, type StockMm } from './geometry';

/** The six ways a set of elements can be brought into line. */
export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

/** The two axes gaps can be equalized along. */
export type Distribution = 'horizontal' | 'vertical';

/** Where in the paint order a move sends an element. */
export type Ordering = 'front' | 'forward' | 'backward' | 'back';

/** A rectangle over several frames, in millimetres. */
export interface Bounds {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

/** The elements a selection names, in document order. Unknown ids are dropped. */
export function selectedElements(document: LabelDocument, ids: readonly string[]): LabelElement[] {
  return document.elements.filter((element) => ids.includes(element.id));
}

/** The rectangle every one of these frames fits inside. */
export function boundsOf(frames: readonly LabelFrame[]): Bounds | null {
  if (frames.length === 0) return null;
  const left = Math.min(...frames.map((frame) => frame.x_mm));
  const top = Math.min(...frames.map((frame) => frame.y_mm));
  const right = Math.max(...frames.map((frame) => frame.x_mm + frame.width_mm));
  const bottom = Math.max(...frames.map((frame) => frame.y_mm + frame.height_mm));
  return { xMm: left, yMm: top, widthMm: right - left, heightMm: bottom - top };
}

/**
 * Replace several elements' frames in one pass.
 *
 * One document per *operation* rather than one per element, so an alignment
 * of four elements is one undo step and one autosave rather than four of
 * each. Elements not named are returned untouched, by identity, which keeps
 * the document a shallow patch of the one it came from.
 */
export function withFrames(
  document: LabelDocument,
  frames: ReadonlyMap<string, LabelFrame>
): LabelDocument {
  return {
    ...document,
    elements: document.elements.map((element) => {
      const frame = frames.get(element.id);
      return frame === undefined ? element : { ...element, frame };
    }),
  };
}

/** Replace one element wholesale — the way a style or content change lands. */
export function withElement(document: LabelDocument, element: LabelElement): LabelDocument {
  return {
    ...document,
    elements: document.elements.map((existing) =>
      existing.id === element.id ? element : existing
    ),
  };
}

/**
 * Bring a set of elements into line.
 *
 * The rectangle they align to is the selection's own bounding box when there
 * are several, and **the stock** when there is exactly one — which is the
 * difference between "line these up with each other" and "centre this on the
 * label", two things a user means by the same button depending on what they
 * have selected. Anything else would make the single-selection case do
 * nothing at all, since one frame is already aligned with itself.
 */
export function align(
  document: LabelDocument,
  ids: readonly string[],
  alignment: Alignment,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): LabelDocument {
  const elements = selectedElements(document, ids);
  if (elements.length === 0) return document;
  const box =
    elements.length === 1
      ? { xMm: 0, yMm: 0, widthMm: stock.widthMm, heightMm: stock.heightMm }
      : boundsOf(elements.map((element) => element.frame))!;

  const frames = new Map<string, LabelFrame>();
  for (const element of elements) {
    const frame = element.frame;
    const moved: LabelFrame = { ...frame };
    switch (alignment) {
      case 'left':
        moved.x_mm = box.xMm;
        break;
      case 'center':
        moved.x_mm = box.xMm + (box.widthMm - frame.width_mm) / 2;
        break;
      case 'right':
        moved.x_mm = box.xMm + box.widthMm - frame.width_mm;
        break;
      case 'top':
        moved.y_mm = box.yMm;
        break;
      case 'middle':
        moved.y_mm = box.yMm + (box.heightMm - frame.height_mm) / 2;
        break;
      case 'bottom':
        moved.y_mm = box.yMm + box.heightMm - frame.height_mm;
        break;
    }
    frames.set(element.id, clampToStock(moved, stock, quantumMm));
  }
  return withFrames(document, frames);
}

/**
 * Equalize the gaps between three or more elements.
 *
 * The outermost two do not move — they are what defines the span — and the
 * ones between them are spread so the *gaps* are equal rather than the
 * centres, because elements of different widths spaced by their centres do
 * not look evenly spaced, which is the whole point of the operation.
 *
 * Fewer than three is returned unchanged: two elements have one gap, and a
 * single gap is already equal to itself.
 */
export function distribute(
  document: LabelDocument,
  ids: readonly string[],
  axis: Distribution,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): LabelDocument {
  const elements = selectedElements(document, ids);
  if (elements.length < 3) return document;

  const horizontal = axis === 'horizontal';
  const start = (frame: LabelFrame): number => (horizontal ? frame.x_mm : frame.y_mm);
  const extent = (frame: LabelFrame): number => (horizontal ? frame.width_mm : frame.height_mm);

  const ordered = [...elements].sort((a, b) => start(a.frame) - start(b.frame));
  const first = ordered[0].frame;
  const last = ordered[ordered.length - 1].frame;
  const span = start(last) + extent(last) - start(first);
  const occupied = ordered.reduce((total, element) => total + extent(element.frame), 0);
  const gap = (span - occupied) / (ordered.length - 1);

  const frames = new Map<string, LabelFrame>();
  let cursor = start(first);
  for (const element of ordered) {
    const moved: LabelFrame = horizontal
      ? { ...element.frame, x_mm: cursor }
      : { ...element.frame, y_mm: cursor };
    frames.set(element.id, clampToStock(moved, stock, quantumMm));
    cursor += extent(element.frame) + gap;
  }
  return withFrames(document, frames);
}

/**
 * Move a set of elements through the paint order.
 *
 * The selection keeps its own relative order whichever way it travels, and
 * `forward`/`backward` move it by exactly one place rather than past every
 * unselected neighbour at once — so repeated presses walk a selection through
 * a stack the way a user watching it expects.
 */
export function reorder(
  document: LabelDocument,
  ids: readonly string[],
  ordering: Ordering
): LabelDocument {
  const moving = document.elements.filter((element) => ids.includes(element.id));
  if (moving.length === 0 || moving.length === document.elements.length) return document;
  const rest = document.elements.filter((element) => !ids.includes(element.id));

  if (ordering === 'front') return { ...document, elements: [...rest, ...moving] };
  if (ordering === 'back') return { ...document, elements: [...moving, ...rest] };

  const elements = [...document.elements];
  const indices = elements
    .map((element, index) => (ids.includes(element.id) ? index : -1))
    .filter((index) => index >= 0);
  // Forward walks from the front so the leading element of the selection
  // never swaps with one of its own; backward walks from the back for the
  // same reason.
  const walk = ordering === 'forward' ? [...indices].reverse() : indices;
  for (const index of walk) {
    const target = ordering === 'forward' ? index + 1 : index - 1;
    if (target < 0 || target >= elements.length) continue;
    if (ids.includes(elements[target].id)) continue;
    [elements[index], elements[target]] = [elements[target], elements[index]];
  }
  return { ...document, elements };
}

/** How far a duplicate lands from its original, so the copy is visibly a copy. */
export const DUPLICATE_OFFSET_MM = 1;

/**
 * Copy elements, offset, and select the copies.
 *
 * Each copy goes in directly above its original rather than at the front of
 * the document: a duplicate that jumped the paint order would come back
 * looking different from the thing it was copied from, which is the one
 * property a duplicate has to keep.
 */
export function duplicate(
  document: LabelDocument,
  ids: readonly string[],
  mintId: () => string,
  stock: StockMm,
  quantumMm = DEFAULT_QUANTUM_MM
): { document: LabelDocument; ids: string[] } {
  const copies: string[] = [];
  const elements: LabelElement[] = [];
  for (const element of document.elements) {
    elements.push(element);
    if (!ids.includes(element.id)) continue;
    const id = mintId();
    copies.push(id);
    elements.push({
      ...element,
      id,
      frame: clampToStock(
        {
          ...element.frame,
          x_mm: element.frame.x_mm + DUPLICATE_OFFSET_MM,
          y_mm: element.frame.y_mm + DUPLICATE_OFFSET_MM,
        },
        stock,
        quantumMm
      ),
    });
  }
  return { document: { ...document, elements }, ids: copies };
}

/** Remove elements. The layout may stop being publishable; the backend says so. */
export function removeElements(document: LabelDocument, ids: readonly string[]): LabelDocument {
  return {
    ...document,
    elements: document.elements.filter((element) => !ids.includes(element.id)),
  };
}

/** Add one element at the front of the paint order. */
export function addElement(document: LabelDocument, element: LabelElement): LabelDocument {
  return { ...document, elements: [...document.elements, element] };
}

// ---------------------------------------------------------------------------
// Snapping, and the guides that explain it
// ---------------------------------------------------------------------------

/** How close a dragged edge has to come, in millimetres, before it snaps. */
export const SNAP_TOLERANCE_MM = 0.6;

/** One line a frame can snap to, and what it is a line of. */
export interface SnapLine {
  axis: 'x' | 'y';
  valueMm: number;
  /** What the line belongs to, so a guide can say rather than merely appear. */
  source: 'stock-edge' | 'stock-center' | 'element-edge' | 'element-center';
}

/**
 * Every line a moving frame could line up with.
 *
 * The stock's own edges and midlines, plus each unselected element's edges
 * and midlines. Selected elements are excluded because a frame snapping to
 * one it is being dragged alongside would fight the drag.
 */
export function snapLines(
  document: LabelDocument,
  stock: StockMm,
  excluding: readonly string[]
): SnapLine[] {
  const lines: SnapLine[] = [
    { axis: 'x', valueMm: 0, source: 'stock-edge' },
    { axis: 'x', valueMm: stock.widthMm, source: 'stock-edge' },
    { axis: 'x', valueMm: stock.widthMm / 2, source: 'stock-center' },
    { axis: 'y', valueMm: 0, source: 'stock-edge' },
    { axis: 'y', valueMm: stock.heightMm, source: 'stock-edge' },
    { axis: 'y', valueMm: stock.heightMm / 2, source: 'stock-center' },
  ];
  for (const element of document.elements) {
    if (excluding.includes(element.id)) continue;
    const frame = element.frame;
    lines.push(
      { axis: 'x', valueMm: frame.x_mm, source: 'element-edge' },
      { axis: 'x', valueMm: frame.x_mm + frame.width_mm, source: 'element-edge' },
      { axis: 'x', valueMm: frame.x_mm + frame.width_mm / 2, source: 'element-center' },
      { axis: 'y', valueMm: frame.y_mm, source: 'element-edge' },
      { axis: 'y', valueMm: frame.y_mm + frame.height_mm, source: 'element-edge' },
      { axis: 'y', valueMm: frame.y_mm + frame.height_mm / 2, source: 'element-center' }
    );
  }
  return lines;
}

export interface SnapResult {
  frame: LabelFrame;
  /** The lines that actually caught it — at most one per axis. */
  guides: SnapLine[];
}

/**
 * Pull a moving frame onto the nearest line, per axis, within tolerance.
 *
 * Each axis is decided independently and each considers the frame's leading
 * edge, centre and trailing edge, so a rectangle can align its right edge to
 * a neighbour's left one without its own left edge having to be near
 * anything. The nearest candidate wins; a tie keeps the first, which is the
 * stock's own geometry, because a user who has dragged something to the
 * middle of the paper meant the paper.
 *
 * The returned frame is quantized but **not** clamped — clamping is the
 * caller's, and doing both here would let a snap silently move a frame that
 * the stock had already stopped.
 */
export function snapFrame(
  frame: LabelFrame,
  lines: readonly SnapLine[],
  toleranceMm = SNAP_TOLERANCE_MM,
  quantumMm = DEFAULT_QUANTUM_MM
): SnapResult {
  const guides: SnapLine[] = [];
  const snapped: LabelFrame = { ...frame };

  for (const axis of ['x', 'y'] as const) {
    const origin = axis === 'x' ? frame.x_mm : frame.y_mm;
    const extent = axis === 'x' ? frame.width_mm : frame.height_mm;
    const offsets = [0, extent / 2, extent];

    let best: { line: SnapLine; delta: number; distance: number } | null = null;
    for (const line of lines) {
      if (line.axis !== axis) continue;
      for (const offset of offsets) {
        const delta = line.valueMm - (origin + offset);
        const distance = Math.abs(delta);
        if (distance > toleranceMm) continue;
        if (best === null || distance < best.distance) best = { line, delta, distance };
      }
    }
    if (best === null) continue;
    guides.push(best.line);
    if (axis === 'x') snapped.x_mm = quantize(origin + best.delta, quantumMm);
    else snapped.y_mm = quantize(origin + best.delta, quantumMm);
  }

  return { frame: snapped, guides };
}
