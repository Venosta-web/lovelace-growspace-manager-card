/**
 * <growspace-view> — unit tests.
 *
 * Verifies that the component renders exactly the DOM elements prescribed by
 * its LayoutSpec (header / grid / chart slots), and nothing more.
 *
 * View mode is now per card: `<growspace-view>` derives its layout from its own
 * `store.ui.$layoutSpec`. Each test builds a fresh store, drives it via
 * `store.ui.setViewMode`, and passes it to the element as `.store`.
 */

import { describe, it, expect } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import { atom } from 'nanostores';
import { ViewMode } from '../../src/constants';
import { GrowspaceUIStore } from '../../src/store/ui/ui-store';
import '../../src/features/shared/layouts/growspace-view';
import type { GrowspaceView } from '../../src/features/shared/layouts/growspace-view';

// Minimal per-card store: `<growspace-view>` only reads `ui.$layoutSpec`
// (drives the slots) and `$viewStandardState` (transplant source panel).
function makeStore(mode: ViewMode = ViewMode.STANDARD) {
  const ui = new GrowspaceUIStore();
  ui.setViewMode(mode);
  return { ui, $viewStandardState: atom({ devices: [] }) };
}

async function renderView(mode: ViewMode = ViewMode.STANDARD): Promise<GrowspaceView> {
  const store = makeStore(mode);
  const el = await fixture<GrowspaceView>(
    html`<growspace-view .store=${store as never}></growspace-view>`
  );
  await el.updateComplete;
  return el;
}

describe('GrowspaceView', () => {
  // ---------------------------------------------------------------------------
  // header slot
  // ---------------------------------------------------------------------------

  it('renders growspace-header when the header slot is present (standard mode)', async () => {
    // STANDARD spec = ['header', 'chart', 'grid']
    const el = await renderView(ViewMode.STANDARD);
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();
  });

  it('does not render growspace-header in compact mode (no header slot)', async () => {
    const el = await renderView(ViewMode.COMPACT);
    expect(el.shadowRoot!.querySelector('growspace-header')).toBeNull();
  });

  it('renders growspace-header in header mode', async () => {
    const el = await renderView(ViewMode.HEADER);
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();
  });

  it('renders growspace-header in heatmap mode', async () => {
    const el = await renderView(ViewMode.HEATMAP);
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // grid slot
  // ---------------------------------------------------------------------------

  it('renders growspace-grid-container in standard mode', async () => {
    const el = await renderView(ViewMode.STANDARD);
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).not.toBeNull();
  });

  it('renders growspace-grid-container in compact mode', async () => {
    const el = await renderView(ViewMode.COMPACT);
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).not.toBeNull();
  });

  it('does not render growspace-grid-container in header mode (no grid slot)', async () => {
    const el = await renderView(ViewMode.HEADER);
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).toBeNull();
  });

  it('does not render growspace-grid-container in heatmap mode (no grid slot)', async () => {
    const el = await renderView(ViewMode.HEATMAP);
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // chart slot — analytics vs heatmap-3d
  // ---------------------------------------------------------------------------

  it('renders growspace-analytics in standard mode (chart slot, non-heatmap)', async () => {
    const el = await renderView(ViewMode.STANDARD);
    expect(el.shadowRoot!.querySelector('growspace-analytics')).not.toBeNull();
  });

  it('does not render heatmap-3d in standard mode', async () => {
    const el = await renderView(ViewMode.STANDARD);
    expect(el.shadowRoot!.querySelector('heatmap-3d')).toBeNull();
  });

  it('renders heatmap-3d in heatmap mode (chart slot, heatmap)', async () => {
    const el = await renderView(ViewMode.HEATMAP);
    expect(el.shadowRoot!.querySelector('heatmap-3d')).not.toBeNull();
  });

  it('does not render growspace-analytics in heatmap mode', async () => {
    const el = await renderView(ViewMode.HEATMAP);
    expect(el.shadowRoot!.querySelector('growspace-analytics')).toBeNull();
  });

  it('does not render chart elements in compact mode (no chart slot)', async () => {
    const el = await renderView(ViewMode.COMPACT);
    expect(el.shadowRoot!.querySelector('growspace-analytics')).toBeNull();
    expect(el.shadowRoot!.querySelector('heatmap-3d')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Reactivity — spec updates when the card's own view mode changes
  // ---------------------------------------------------------------------------

  it('removes header when switching from standard to compact', async () => {
    const store = makeStore(ViewMode.STANDARD);
    const el = await fixture<GrowspaceView>(
      html`<growspace-view .store=${store as never}></growspace-view>`
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).not.toBeNull();

    store.ui.setViewMode(ViewMode.COMPACT);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-header')).toBeNull();
  });

  it('adds grid when switching from header to standard', async () => {
    const store = makeStore(ViewMode.HEADER);
    const el = await fixture<GrowspaceView>(
      html`<growspace-view .store=${store as never}></growspace-view>`
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).toBeNull();

    store.ui.setViewMode(ViewMode.STANDARD);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('growspace-grid-container')).not.toBeNull();
  });
});
