/**
 * Arranging elements, as arithmetic.
 *
 * Every rule in `arrange.ts` is a claim about rectangles, so every test here
 * is numbers rather than a rendered canvas. That matters most for the two
 * operations whose correctness nobody can eyeball: distribution equalizes
 * *gaps* rather than centres, and a multiple selection keeps its internal
 * spacing when it snaps.
 */

import { describe, expect, it } from 'vitest';

import type { LabelDocument, LabelElement, LabelFrame } from '../../../slices/labels/draft-schema';
import {
  align,
  boundsOf,
  distribute,
  duplicate,
  removeElements,
  reorder,
  snapFrame,
  snapLines,
  withElement,
} from './arrange';

const STOCK = { widthMm: 50, heightMm: 30 };

const TEXT_STYLE = {
  font: 'growspace.sans.bold.v1',
  font_size_mm: 4,
  horizontal_align: 'left',
  vertical_align: 'center',
  line_spacing: 'growspace.spacing.compact.v1',
  overflow: 'shrink_ellipsis',
  minimum_font_size_mm: 2.2,
  maximum_lines: 1,
} as const;

function text(id: string, frame: LabelFrame): LabelElement {
  return {
    id,
    kind: 'text',
    frame,
    rotation: 0,
    content: { literal: id },
    style: { ...TEXT_STYLE },
  };
}

function documentOf(...elements: LabelElement[]): LabelDocument {
  return {
    schema: 'growspace.label-layout',
    version: 1,
    label_size_id: 'growspace.stock.50x30.v1',
    elements,
  };
}

const A = text('a', { x_mm: 2, y_mm: 2, width_mm: 10, height_mm: 4 });
const B = text('b', { x_mm: 20, y_mm: 8, width_mm: 6, height_mm: 4 });
const C = text('c', { x_mm: 40, y_mm: 14, width_mm: 8, height_mm: 4 });

describe('alignment', () => {
  it('lines several elements up with the leftmost of them', () => {
    const after = align(documentOf(A, B, C), ['a', 'b', 'c'], 'left', STOCK);

    expect(after.elements.map((element) => element.frame.x_mm)).toEqual([2, 2, 2]);
  });

  it('centres each one inside the selection rather than moving the box', () => {
    // The selection spans 2 mm to 48 mm, so its centre is 25 mm and each
    // element's own width decides where it lands.
    const after = align(documentOf(A, B, C), ['a', 'b', 'c'], 'center', STOCK);

    expect(after.elements.map((element) => element.frame.x_mm)).toEqual([20, 22, 21]);
  });

  it('aligns a single element to the stock, because it is already aligned with itself', () => {
    // The one case where "align" cannot mean "with each other". 50 mm of
    // paper, a 10 mm element: 20 mm from either edge.
    const after = align(documentOf(A, B), ['a'], 'center', STOCK);

    expect(after.elements[0].frame.x_mm).toBe(20);
    expect(after.elements[1].frame).toEqual(B.frame);
  });

  it('never pushes an element off the left edge of the paper', () => {
    // A 52 mm element on 50 mm stock is already too wide -- the backend will
    // say so by name. What alignment must not do is answer that by giving it
    // a negative origin, which is a second, different refusal on top of the
    // real one.
    const wide = text('wide', { x_mm: 0, y_mm: 0, width_mm: 52, height_mm: 4 });
    const after = align(documentOf(wide, C), ['wide', 'c'], 'right', STOCK);

    expect(after.elements[0].frame.x_mm).toBe(0);
    expect(after.elements[0].frame.width_mm).toBe(52);
  });

  it('leaves everything alone when nothing is selected', () => {
    const before = documentOf(A, B);
    expect(align(before, [], 'left', STOCK)).toBe(before);
  });
});

describe('distribution', () => {
  it('equalizes the gaps, not the centres', () => {
    // 2 → 48 is a 46 mm span holding 24 mm of element, so three gaps of
    // (46 - 24) / 2 = 11 mm. Centres would have put the 6 mm element
    // somewhere else entirely.
    const after = distribute(documentOf(A, B, C), ['a', 'b', 'c'], 'horizontal', STOCK);
    const frames = after.elements.map((element) => element.frame);

    expect(frames[0].x_mm).toBe(2);
    expect(frames[2].x_mm).toBe(40);
    expect(frames[1].x_mm - (frames[0].x_mm + frames[0].width_mm)).toBeCloseTo(11, 5);
    expect(frames[2].x_mm - (frames[1].x_mm + frames[1].width_mm)).toBeCloseTo(11, 5);
  });

  it('leaves the outermost two exactly where they were', () => {
    const after = distribute(documentOf(A, B, C), ['a', 'b', 'c'], 'vertical', STOCK);

    expect(after.elements[0].frame.y_mm).toBe(A.frame.y_mm);
    expect(after.elements[2].frame.y_mm).toBe(C.frame.y_mm);
  });

  it('does nothing to two elements, whose single gap is already equal', () => {
    const before = documentOf(A, B);
    expect(distribute(before, ['a', 'b'], 'horizontal', STOCK)).toBe(before);
  });
});

describe('paint order', () => {
  it('is the array order, front last', () => {
    const after = reorder(documentOf(A, B, C), ['a'], 'front');
    expect(after.elements.map((element) => element.id)).toEqual(['b', 'c', 'a']);
  });

  it('moves one place at a time rather than past everything', () => {
    const after = reorder(documentOf(A, B, C), ['a'], 'forward');
    expect(after.elements.map((element) => element.id)).toEqual(['b', 'a', 'c']);
  });

  it('keeps a multiple selection in its own order while it travels', () => {
    const after = reorder(documentOf(A, B, C), ['a', 'c'], 'back');
    expect(after.elements.map((element) => element.id)).toEqual(['a', 'c', 'b']);
  });

  it('stops at the end rather than wrapping round', () => {
    const before = documentOf(A, B, C);
    const after = reorder(before, ['c'], 'forward');
    expect(after.elements.map((element) => element.id)).toEqual(['a', 'b', 'c']);
  });

  it('changes nothing when everything is selected', () => {
    const before = documentOf(A, B, C);
    expect(reorder(before, ['a', 'b', 'c'], 'front')).toBe(before);
  });
});

describe('duplication', () => {
  it('puts each copy directly above its original, so the copy paints the same', () => {
    let next = 0;
    const after = duplicate(documentOf(A, B), ['a'], () => `copy-${next++}`, STOCK);

    expect(after.document.elements.map((element) => element.id)).toEqual(['a', 'copy-0', 'b']);
    expect(after.ids).toEqual(['copy-0']);
  });

  it('offsets the copy so it is visibly a copy rather than a hidden one', () => {
    const after = duplicate(documentOf(A), ['a'], () => 'copy', STOCK);
    const copy = after.document.elements[1].frame;

    expect(copy.x_mm).toBe(A.frame.x_mm + 1);
    expect(copy.y_mm).toBe(A.frame.y_mm + 1);
  });

  it('keeps everything else about the element, style and content included', () => {
    const after = duplicate(documentOf(A), ['a'], () => 'copy', STOCK);
    const copy = after.document.elements[1];

    expect(copy.kind).toBe('text');
    expect(copy.id).not.toBe('a');
    expect({ ...copy, id: 'a', frame: A.frame }).toEqual(A);
  });

  it('keeps a copy of an element at the far edge on the paper', () => {
    const edge = text('edge', { x_mm: 40, y_mm: 26, width_mm: 10, height_mm: 4 });
    const after = duplicate(documentOf(edge), ['edge'], () => 'copy', STOCK);

    expect(after.document.elements[1].frame.x_mm).toBe(40);
    expect(after.document.elements[1].frame.y_mm).toBe(26);
  });
});

describe('removal and replacement', () => {
  it('removes exactly what was named', () => {
    const after = removeElements(documentOf(A, B, C), ['b']);
    expect(after.elements.map((element) => element.id)).toEqual(['a', 'c']);
  });

  it('replaces one element without touching its neighbours by identity', () => {
    const before = documentOf(A, B);
    const after = withElement(before, { ...B, rotation: 90 });

    expect(after.elements[0]).toBe(before.elements[0]);
    expect(after.elements[1].rotation).toBe(90);
  });
});

describe('snapping', () => {
  const lines = () => snapLines(documentOf(A, B), STOCK, ['moving']);

  it('offers the stock edges and midlines even with nothing else on the label', () => {
    const bare = snapLines(documentOf(), STOCK, []);
    expect(bare).toContainEqual({ axis: 'x', valueMm: 25, source: 'stock-center' });
    expect(bare).toContainEqual({ axis: 'y', valueMm: 30, source: 'stock-edge' });
  });

  it('ignores the elements being dragged, which would otherwise fight the drag', () => {
    const moving = snapLines(documentOf(A, B), STOCK, ['a', 'b']);
    expect(moving.every((line) => line.source.startsWith('stock'))).toBe(true);
  });

  it('pulls a near-miss onto the line and says which line caught it', () => {
    const result = snapFrame({ x_mm: 2.3, y_mm: 20, width_mm: 10, height_mm: 4 }, lines());

    expect(result.frame.x_mm).toBe(2);
    expect(result.guides).toContainEqual({ axis: 'x', valueMm: 2, source: 'element-edge' });
  });

  it('snaps a trailing edge, not only a leading one', () => {
    // The right edge of this frame is at 19.7 mm, a third of a millimetre
    // from B's left edge at 20 — so the frame moves right by 0.3.
    const result = snapFrame({ x_mm: 9.7, y_mm: 20, width_mm: 10, height_mm: 4 }, lines());

    expect(result.frame.x_mm).toBe(10);
  });

  it('leaves a frame that is nowhere near anything exactly where it is', () => {
    const frame = { x_mm: 14.37, y_mm: 21.11, width_mm: 3, height_mm: 3 };
    const result = snapFrame(frame, lines());

    expect(result.frame).toEqual(frame);
    expect(result.guides).toEqual([]);
  });

  it('decides each axis on its own', () => {
    const result = snapFrame({ x_mm: 2.2, y_mm: 21.11, width_mm: 3, height_mm: 3 }, lines());

    expect(result.frame.x_mm).toBe(2);
    expect(result.frame.y_mm).toBe(21.11);
    expect(result.guides).toHaveLength(1);
  });
});

describe('bounds', () => {
  it('is the rectangle every frame fits inside', () => {
    expect(boundsOf([A.frame, C.frame])).toEqual({
      xMm: 2,
      yMm: 2,
      widthMm: 46,
      heightMm: 16,
    });
  });

  it('is nothing at all for no frames', () => {
    expect(boundsOf([])).toBeNull();
  });
});
