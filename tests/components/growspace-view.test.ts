/**
 * <growspace-view> — unit tests.
 *
 * Verifies that the component renders exactly the DOM elements prescribed by
 * its LayoutSpec (header / grid / chart slots), and nothing more.
 *
 * We drive the spec via `viewMode$` (which `layoutSpec$` derives from), then
 * inspect the shadow DOM for presence/absence of slot elements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import { ViewMode } from '../../src/constants';
import { viewMode$, setViewMode } from '../../src/slices/ui';
import '../../src/features/shared/layouts/growspace-view';
import type { GrowspaceView } from '../../src/features/shared/layouts/growspace-view';

// Reset viewMode$ before each test so tests are isolated.
beforeEach(() => {
  viewMode$.set(ViewMode.STANDARD);
});

describe('GrowspaceView', () => {
  // ---------------------------------------------------------------------------
  // header slot
  // ---------------------------------------------------------------------------

  it('renders growspace-header when the header slot is present (standard mode)', async () => {
    // STANDARD spec = ['header', 'chart', 'grid']
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();
  });

  it('does not render growspace-header in compact mode (no header slot)', async () => {
    setViewMode(ViewMode.COMPACT);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).toBeNull();
  });

  it('renders growspace-header in header mode', async () => {
    setViewMode(ViewMode.HEADER);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();
  });

  it('renders growspace-header in heatmap mode', async () => {
    setViewMode(ViewMode.HEATMAP);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // grid slot
  // ---------------------------------------------------------------------------

  it('renders growspace-grid-container in standard mode', async () => {
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).not.toBeNull();
  });

  it('renders growspace-grid-container in compact mode', async () => {
    setViewMode(ViewMode.COMPACT);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).not.toBeNull();
  });

  it('does not render growspace-grid-container in header mode (no grid slot)', async () => {
    setViewMode(ViewMode.HEADER);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).toBeNull();
  });

  it('does not render growspace-grid-container in heatmap mode (no grid slot)', async () => {
    setViewMode(ViewMode.HEATMAP);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // chart slot — analytics vs heatmap-3d
  // ---------------------------------------------------------------------------

  it('renders growspace-analytics in standard mode (chart slot, non-heatmap)', async () => {
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-analytics')).not.toBeNull();
  });

  it('does not render heatmap-3d in standard mode', async () => {
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('heatmap-3d')).toBeNull();
  });

  it('renders heatmap-3d in heatmap mode (chart slot, heatmap)', async () => {
    setViewMode(ViewMode.HEATMAP);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('heatmap-3d')).not.toBeNull();
  });

  it('does not render growspace-analytics in heatmap mode', async () => {
    setViewMode(ViewMode.HEATMAP);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-analytics')).toBeNull();
  });

  it('does not render chart elements in compact mode (no chart slot)', async () => {
    setViewMode(ViewMode.COMPACT);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-analytics')).toBeNull();
    expect(el.shadowRoot!.querySelector('heatmap-3d')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Reactivity — spec updates when viewMode changes
  // ---------------------------------------------------------------------------

  it('removes header when switching from standard to compact', async () => {
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();

    setViewMode(ViewMode.COMPACT);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).toBeNull();
  });

  it('adds grid when switching from header to standard', async () => {
    setViewMode(ViewMode.HEADER);
    const el = await fixture<GrowspaceView>(html`<growspace-view></growspace-view>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).toBeNull();

    setViewMode(ViewMode.STANDARD);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).not.toBeNull();
  });
});
