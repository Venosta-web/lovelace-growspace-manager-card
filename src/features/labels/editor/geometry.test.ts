/**
 * Millimetre arithmetic, and the one thing it must never do.
 *
 * A Label Layout is quantized millimetres on a named stock. The backend
 * *rejects* a finer value rather than rounding it, so every claim here about
 * the grid is a claim about whether a user's edit survives publication at
 * all — not about tidiness.
 */

import { describe, expect, it } from 'vitest';

import type { LabelDocument, LabelFrame } from '../../../slices/labels/draft-schema';
import {
  clampToStock,
  defaultSelection,
  elementById,
  frameAsPercentages,
  pixelsToMm,
  quantize,
  resizeFrame,
  setFrameField,
  translateFrame,
  withFrame,
} from './geometry';

const STOCK = { widthMm: 50, heightMm: 30 };
const FRAME: LabelFrame = { x_mm: 2, y_mm: 2, width_mm: 20, height_mm: 8 };

const TEXT_STYLE = {
  font: 'growspace.sans.bold.v1',
  font_size_mm: 5.6,
  horizontal_align: 'left',
  vertical_align: 'center',
  line_spacing: 'growspace.spacing.compact.v1',
  overflow: 'shrink_ellipsis',
  minimum_font_size_mm: 3,
  maximum_lines: 2,
} as const;

const DOCUMENT: LabelDocument = {
  schema: 'growspace.label-layout',
  version: 1,
  label_size_id: 'growspace.stock.50x30.v1',
  elements: [
    {
      id: 'divider',
      kind: 'divider',
      frame: { ...FRAME, y_mm: 20 },
      rotation: 0,
      style: { fill: 'black' },
    },
    {
      id: 'name',
      kind: 'text',
      frame: FRAME,
      rotation: 0,
      content: { binding: 'strain.name', parameters: {} },
      style: TEXT_STYLE,
    },
  ],
};

describe('the document grid', () => {
  it('snaps to the quantum rather than leaving a value the backend refuses', () => {
    expect(quantize(2.0049)).toBe(2);
    expect(quantize(2.006)).toBe(2.01);
    // Not 2.005: that decimal is 2.00499999999999989 in binary, so it is
    // already below the midpoint before any rounding happens. Either answer
    // is on the grid, which is the only property that matters here.
  });

  it('leaves no float noise behind, because a document is compared by digest', () => {
    // 0.1 + 0.2 arithmetic in the middle of a drag is how a layout that looks
    // identical hashes differently.
    expect(quantize(0.1 + 0.2)).toBe(0.3);
    expect(String(quantize(2.5))).toBe('2.5');
  });

  it('honours a quantum the backend published rather than assuming one', () => {
    expect(quantize(2.26, 0.5)).toBe(2.5);
  });
});

describe('keeping a frame on the paper', () => {
  it('stops a drag at the edge with its size intact', () => {
    const moved = translateFrame(FRAME, 100, 100, STOCK);

    expect(moved).toEqual({ x_mm: 30, y_mm: 22, width_mm: 20, height_mm: 8 });
  });

  it('stops at the near edge too', () => {
    expect(translateFrame(FRAME, -100, -100, STOCK)).toMatchObject({ x_mm: 0, y_mm: 0 });
  });

  it('leaves a frame too large for the stock oversized rather than shrinking it', () => {
    // The backend refuses this with `frame.outside_stock`, naming the real
    // problem. A rectangle quietly resized to fit is one the user did not draw.
    const huge = { x_mm: 0, y_mm: 0, width_mm: 80, height_mm: 8 };

    expect(clampToStock(huge, STOCK).width_mm).toBe(80);
  });
});

describe('resizing by a handle', () => {
  it('anchors the opposite edge', () => {
    const resized = resizeFrame(FRAME, 'w', -1, 0, STOCK);

    expect(resized.x_mm).toBe(1);
    expect(resized.x_mm + resized.width_mm).toBe(FRAME.x_mm + FRAME.width_mm);
  });

  it('grows from the east handle without moving the west edge', () => {
    const resized = resizeFrame(FRAME, 'e', 5, 0, STOCK);

    expect(resized).toMatchObject({ x_mm: 2, width_mm: 25 });
  });

  it('refuses to turn a rectangle inside out', () => {
    // A negative extent is not a shape a Label Layout can express, and a frame
    // that flipped under the cursor is never what anybody meant.
    const resized = resizeFrame(FRAME, 'w', 999, 0, STOCK);

    expect(resized.width_mm).toBeGreaterThan(0);
    expect(resized.x_mm).toBeLessThan(FRAME.x_mm + FRAME.width_mm);
  });

  it('cannot pull an edge off the paper', () => {
    const resized = resizeFrame(FRAME, 'se', 999, 999, STOCK);

    expect(resized.x_mm + resized.width_mm).toBeLessThanOrEqual(STOCK.widthMm);
    expect(resized.y_mm + resized.height_mm).toBeLessThanOrEqual(STOCK.heightMm);
  });
});

describe('the exact millimetre controls', () => {
  it('clamp the same way a drag does, so the two views of one frame agree', () => {
    const typed = setFrameField(FRAME, 'x_mm', 999, STOCK);
    const dragged = translateFrame(FRAME, 999, 0, STOCK);

    expect(typed).toEqual(dragged);
  });

  it('quantize a typed value', () => {
    expect(setFrameField(FRAME, 'x_mm', 3.14159, STOCK).x_mm).toBe(3.14);
  });
});

describe('pixels to millimetres', () => {
  it('scales by the measured box, which is what makes zoom irrelevant', () => {
    // The same 50 mm of paper, drawn at two sizes: one pixel means different
    // millimetres in each, and nothing here reads a zoom level to know it.
    const atOneHundred = pixelsToMm(40, 0, { width: 400, height: 240 }, STOCK);
    const atTwoHundred = pixelsToMm(80, 0, { width: 800, height: 480 }, STOCK);

    expect(atOneHundred.deltaXMm).toBe(5);
    expect(atTwoHundred.deltaXMm).toBe(5);
  });

  it('answers zero for an unmeasured stage rather than dividing by it', () => {
    expect(pixelsToMm(40, 40, { width: 0, height: 0 }, STOCK)).toEqual({
      deltaXMm: 0,
      deltaYMm: 0,
    });
  });

  it('places a frame as percentages of the paper', () => {
    expect(frameAsPercentages(FRAME, STOCK)).toEqual({
      left: '4%',
      top: `${(2 / 30) * 100}%`,
      width: '40%',
      height: `${(8 / 30) * 100}%`,
    });
  });
});

describe('editing a document without reshaping it', () => {
  it('carries every other property of the element it moved', () => {
    // The document makes a round trip — in on `open`, out on `autosave` — and
    // the backend's schema is closed, so anything lost here comes back as a
    // validation error on the user's own work.
    const next = withFrame(DOCUMENT, 'name', { ...FRAME, x_mm: 5 });
    const element = next.elements[1];

    expect(element.kind === 'text' && element.content).toEqual({
      binding: 'strain.name',
      parameters: {},
    });
    expect(element.kind === 'text' && element.style).toEqual(TEXT_STYLE);
    expect(element.frame.x_mm).toBe(5);
  });

  it('leaves every other element identical', () => {
    const next = withFrame(DOCUMENT, 'name', { ...FRAME, x_mm: 5 });

    expect(next.elements[0]).toBe(DOCUMENT.elements[0]);
    expect(DOCUMENT.elements[1].frame.x_mm).toBe(2);
  });

  it('selects the required strain-name element, not merely the first one', () => {
    expect(defaultSelection(DOCUMENT)).toBe('name');
  });

  it('falls back to the first element when no required one is recognisable', () => {
    const foreign: LabelDocument = { ...DOCUMENT, elements: [DOCUMENT.elements[0]] };

    expect(defaultSelection(foreign)).toBe('divider');
  });

  it('finds nothing for an empty selection', () => {
    expect(elementById(DOCUMENT, null)).toBeUndefined();
  });
});
