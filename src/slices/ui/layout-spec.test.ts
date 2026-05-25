/**
 * LayoutSpec — unit tests.
 *
 * Covers the VIEW_MODE_LAYOUT_MAP shape for every ViewMode and the
 * layoutSpec$ computed atom that derives a spec from the active viewMode$.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViewMode } from '../../constants';
import { viewMode$, setViewMode } from './index';
import { VIEW_MODE_LAYOUT_MAP, layoutSpec$ } from './layout-spec';

// Reset viewMode$ before each test so tests are isolated.
beforeEach(() => {
  viewMode$.set(ViewMode.STANDARD);
});

// ---------------------------------------------------------------------------
// VIEW_MODE_LAYOUT_MAP — static shape
// ---------------------------------------------------------------------------

describe('VIEW_MODE_LAYOUT_MAP', () => {
  it('standard has slots [header, chart, grid]', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.STANDARD].slots).toEqual(['header', 'chart', 'grid']);
  });

  it('standard has no overlay', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.STANDARD].overlay).toBeUndefined();
  });

  it('compact has slots [grid] only', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.COMPACT].slots).toEqual(['grid']);
  });

  it('compact has no overlay', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.COMPACT].overlay).toBeUndefined();
  });

  it('header has slots [header] only', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEADER].slots).toEqual(['header']);
  });

  it('header has no overlay', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEADER].overlay).toBeUndefined();
  });

  it('heatmap has slots [header, chart]', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEATMAP].slots).toEqual(['header', 'chart']);
  });

  it('heatmap has no overlay', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEATMAP].overlay).toBeUndefined();
  });

  it('standard chartType is analytics', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.STANDARD].chartType).toBe('analytics');
  });

  it('heatmap chartType is heatmap', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEATMAP].chartType).toBe('heatmap');
  });

  it('compact has no chartType (no chart slot)', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.COMPACT].chartType).toBeUndefined();
  });

  it('header has no chartType (no chart slot)', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEADER].chartType).toBeUndefined();
  });

  it('each spec carries the correct viewVariant', () => {
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.STANDARD].viewVariant).toBe(ViewMode.STANDARD);
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.COMPACT].viewVariant).toBe(ViewMode.COMPACT);
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEADER].viewVariant).toBe(ViewMode.HEADER);
    expect(VIEW_MODE_LAYOUT_MAP[ViewMode.HEATMAP].viewVariant).toBe(ViewMode.HEATMAP);
  });

  it('covers all four ViewMode values', () => {
    const defined = Object.values(ViewMode).filter((m) => VIEW_MODE_LAYOUT_MAP[m] !== undefined);
    expect(defined).toHaveLength(Object.values(ViewMode).length);
  });
});

// ---------------------------------------------------------------------------
// layoutSpec$ — computed atom
// ---------------------------------------------------------------------------

describe('layoutSpec$', () => {
  it('returns the standard spec when viewMode is STANDARD', () => {
    expect(layoutSpec$.get()).toEqual(VIEW_MODE_LAYOUT_MAP[ViewMode.STANDARD]);
  });

  it('returns the compact spec when viewMode switches to COMPACT', () => {
    setViewMode(ViewMode.COMPACT);
    expect(layoutSpec$.get()).toEqual(VIEW_MODE_LAYOUT_MAP[ViewMode.COMPACT]);
  });

  it('returns the header spec when viewMode switches to HEADER', () => {
    setViewMode(ViewMode.HEADER);
    expect(layoutSpec$.get()).toEqual(VIEW_MODE_LAYOUT_MAP[ViewMode.HEADER]);
  });

  it('returns the heatmap spec when viewMode switches to HEATMAP', () => {
    setViewMode(ViewMode.HEATMAP);
    expect(layoutSpec$.get()).toEqual(VIEW_MODE_LAYOUT_MAP[ViewMode.HEATMAP]);
  });

  it('updates reactively when viewMode changes multiple times', () => {
    setViewMode(ViewMode.COMPACT);
    setViewMode(ViewMode.HEADER);
    setViewMode(ViewMode.STANDARD);
    expect(layoutSpec$.get()).toEqual(VIEW_MODE_LAYOUT_MAP[ViewMode.STANDARD]);
  });
});
