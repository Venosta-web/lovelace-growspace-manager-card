/**
 * LayoutSpec — declarative layout configuration for each ViewMode.
 *
 * Public API:
 *   LayoutSlot         — union of recognised slot names
 *   LayoutSpec         — { slots, overlay? } configuration object
 *   VIEW_MODE_LAYOUT_MAP — static map from every ViewMode to its LayoutSpec
 *   layoutSpec$        — computed atom: the LayoutSpec for the active viewMode$
 */

import { computed } from 'nanostores';
import { ViewMode, GridOverlayMode } from '../../constants';
import type { GrowspaceViewMode, GridOverlayMode as GridOverlayModeType } from '../../types';
import { viewMode$ } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayoutSlot = 'header' | 'grid' | 'chart';

/** Determines which sub-component fills the 'chart' slot. */
export type ChartType = 'analytics' | 'heatmap';

export interface LayoutSpec {
  slots: LayoutSlot[];
  /** The originating ViewMode — used for variant-specific rendering within a slot. */
  viewVariant: GrowspaceViewMode;
  /** Present only when the 'chart' slot is included — selects the sub-component. */
  chartType?: ChartType;
  overlay?: GridOverlayModeType;
}

// ---------------------------------------------------------------------------
// Static map
// ---------------------------------------------------------------------------

export const VIEW_MODE_LAYOUT_MAP: Record<GrowspaceViewMode, LayoutSpec> = {
  [ViewMode.STANDARD]: {
    slots: ['header', 'chart', 'grid'],
    viewVariant: ViewMode.STANDARD,
    chartType: 'analytics',
  },
  [ViewMode.COMPACT]: {
    slots: ['grid'],
    viewVariant: ViewMode.COMPACT,
  },
  [ViewMode.HEADER]: {
    slots: ['header'],
    viewVariant: ViewMode.HEADER,
  },
  [ViewMode.HEATMAP]: {
    slots: ['header', 'chart'],
    viewVariant: ViewMode.HEATMAP,
    chartType: 'heatmap',
  },
};

// ---------------------------------------------------------------------------
// Computed atom
// ---------------------------------------------------------------------------

/** The LayoutSpec that corresponds to the currently active view mode. */
export const layoutSpec$ = computed(viewMode$, (mode) => VIEW_MODE_LAYOUT_MAP[mode]);
