import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderSecondaryUI } from '../../../../../src/features/ui/components/growspace-header-secondary-ui';
import type { HeaderChip } from '../../../../../src/utils/metrics-utils';
import type { NutrientInventory } from '../../../../../src/types';

if (!customElements.get('growspace-header-secondary-ui')) {
  customElements.define('growspace-header-secondary-ui', GrowspaceHeaderSecondaryUI);
}

const makeChip = (overrides: Partial<HeaderChip> = {}): HeaderChip => ({
  key: 'ph',
  icon: 'mdi:flask',
  value: '6.2',
  label: 'pH',
  status: 'ok',
  active: false,
  linked: false,
  groupIndex: 0,
  ...overrides,
});

const mockInventory: NutrientInventory = {
  stocks: {
    'nutrient-1': {
      nutrient_id: 'nutrient-1',
      name: 'CalMag',
      current_ml: 250,
      initial_ml: 1000,
      last_updated: '2026-04-01T00:00:00Z',
    },
    'nutrient-2': {
      nutrient_id: 'nutrient-2',
      name: 'Bloom',
      current_ml: 500,
      initial_ml: 1000,
      last_updated: '2026-04-01T00:00:00Z',
    },
  },
};

describe('GrowspaceHeaderSecondaryUI', () => {
  it('is defined as a custom element', () => {
    expect(customElements.get('growspace-header-secondary-ui')).toBeDefined();
  });

  it('renders without errors', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]}></growspace-header-secondary-ui>
    `);
    expect(el).toBeDefined();
  });

  it('renders secondary strip container', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]}></growspace-header-secondary-ui>
    `);
    expect(el.shadowRoot!.querySelector('.secondary-strip')).not.toBeNull();
  });

  it('renders one growspace-chip per chip', async () => {
    const chips = [makeChip({ key: 'ph' }), makeChip({ key: 'ec', label: 'EC' })];
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${chips}></growspace-header-secondary-ui>
    `);
    expect(el.shadowRoot!.querySelectorAll('growspace-chip').length).toBe(2);
  });

  it('renders no chips when chips is empty', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]}></growspace-header-secondary-ui>
    `);
    expect(el.shadowRoot!.querySelectorAll('growspace-chip').length).toBe(0);
  });

  it('renders nutrient-stock-chip elements when inventory is provided', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]} .inventory=${mockInventory}></growspace-header-secondary-ui>
    `);
    expect(el.shadowRoot!.querySelectorAll('nutrient-stock-chip').length).toBe(2);
  });

  it('renders no stock chips when inventory is null', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]} .inventory=${null}></growspace-header-secondary-ui>
    `);
    expect(el.shadowRoot!.querySelectorAll('nutrient-stock-chip').length).toBe(0);
  });

  it('dispatches toggle-graph when chip is clicked', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'ph' })];
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${chips} @toggle-graph=${handler}></growspace-header-secondary-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.metric).toBe('ph');
  });

  it('dispatches chip-drag-start when chip is dragged', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'ec' })];
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${chips} @chip-drag-start=${handler}></growspace-header-secondary-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip?.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.metric).toBe('ec');
  });

  it('dispatches chip-drop when drop event occurs on chip', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'ph' })];
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${chips} @chip-drop=${handler}></growspace-header-secondary-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip?.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.targetMetric).toBe('ph');
  });

  it('dispatches unlink-graphs when chip emits unlink event', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'ph', groupIndex: 2 })];
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${chips} @unlink-graphs=${handler}></growspace-header-secondary-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip?.dispatchEvent(new CustomEvent('unlink', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.groupIndex).toBe(2);
  });

  it('dispatches open-nutrients when nutrient-stock-chip is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui
        .chips=${[]}
        .inventory=${mockInventory}
        @open-nutrients=${handler}
      ></growspace-header-secondary-ui>
    `);
    const stockChip = el.shadowRoot!.querySelector('nutrient-stock-chip') as HTMLElement;
    stockChip?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('chip is not draggable when isMobile=true and mobileLink=false', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]} .isMobile=${true} .mobileLink=${false}></growspace-header-secondary-ui>
    `);
    expect((el as any)._chipDraggable).toBe('false');
  });

  it('chip is draggable when isMobile=true and mobileLink=true', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]} .isMobile=${true} .mobileLink=${true}></growspace-header-secondary-ui>
    `);
    expect((el as any)._chipDraggable).toBe('true');
  });

  it('chip is always draggable in desktop mode', async () => {
    const el = await fixture<GrowspaceHeaderSecondaryUI>(html`
      <growspace-header-secondary-ui .chips=${[]} .isMobile=${false}></growspace-header-secondary-ui>
    `);
    expect((el as any)._chipDraggable).toBe('true');
  });
});
