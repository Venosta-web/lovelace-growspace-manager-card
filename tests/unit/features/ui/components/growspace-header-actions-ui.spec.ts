import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderActionsUI } from '../../../../../src/features/ui/components/growspace-header-actions-ui';
import type { HeaderChip } from '../../../../../src/utils/metrics-utils';
import { ViewMode } from '../../../../../src/constants';

if (!customElements.get('growspace-header-actions-ui')) {
  customElements.define('growspace-header-actions-ui', GrowspaceHeaderActionsUI);
}

const mockChip: HeaderChip = {
  key: 'temperature',
  icon: 'mdi:thermometer',
  value: '24°C',
  label: 'Temp',
  status: 'ok',
  active: false,
  linked: false,
  groupIndex: 0,
};

describe('GrowspaceHeaderActionsUI', () => {
  it('is defined as a custom element', () => {
    expect(customElements.get('growspace-header-actions-ui')).toBeDefined();
  });

  it('renders without errors', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui></growspace-header-actions-ui>
    `);
    expect(el).toBeDefined();
  });

  it('renders chip container', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .deviceChips=${[mockChip]}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-device-chips-container')).not.toBeNull();
  });

  it('dispatches action-triggered event when Edit Mode button clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui @action-triggered=${handler}></growspace-header-actions-ui>
    `);
    const iconButtons = el.shadowRoot!.querySelectorAll('.icon-button') as NodeListOf<HTMLElement>;
    // First icon button that has a title matching Edit Mode
    const editBtn = Array.from(iconButtons).find((b) => b.title === 'Edit Mode');
    editBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.action).toBe('edit');
  });

  it('dispatches action-triggered event when Settings button clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui @action-triggered=${handler}></growspace-header-actions-ui>
    `);
    const iconButtons = el.shadowRoot!.querySelectorAll('.icon-button') as NodeListOf<HTMLElement>;
    const settingsBtn = Array.from(iconButtons).find((b) => b.title === 'Settings');
    settingsBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.action).toBe('config');
  });

  it('dispatches action-triggered event when 3D Heatmap button clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui @action-triggered=${handler}></growspace-header-actions-ui>
    `);
    const iconButtons = el.shadowRoot!.querySelectorAll('.icon-button') as NodeListOf<HTMLElement>;
    const heatmapBtn = Array.from(iconButtons).find((b) => b.title === '3D Heatmap');
    heatmapBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.action).toBe('heatmap');
  });

  it('applies active class to Edit Mode button when isEditMode is true', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isEditMode=${true}></growspace-header-actions-ui>
    `);
    const iconButtons = el.shadowRoot!.querySelectorAll('.icon-button') as NodeListOf<HTMLElement>;
    const editBtn = Array.from(iconButtons).find((b) => b.title === 'Edit Mode');
    expect(editBtn?.classList.contains('active')).toBe(true);
  });

  it('applies active class to 3D Heatmap button when in HEATMAP view mode', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .viewMode=${ViewMode.HEATMAP}></growspace-header-actions-ui>
    `);
    const iconButtons = el.shadowRoot!.querySelectorAll('.icon-button') as NodeListOf<HTMLElement>;
    const heatmapBtn = Array.from(iconButtons).find((b) => b.title === '3D Heatmap');
    expect(heatmapBtn?.classList.contains('active')).toBe(true);
  });

  it('renders mobile link button in mobile mode', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true}></growspace-header-actions-ui>
    `);
    const mobileLinkBtn = el.shadowRoot!.querySelector('.icon-button.mobile-link') as HTMLElement;
    expect(mobileLinkBtn).not.toBeNull();
  });

  it('dispatches toggle-mobile-link event when mobile link button clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true} @toggle-mobile-link=${handler}></growspace-header-actions-ui>
    `);
    const mobileLinkBtn = el.shadowRoot!.querySelector('.icon-button.mobile-link') as HTMLElement;
    mobileLinkBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not render mobile link button in desktop mode', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.icon-button.mobile-link')).toBeNull();
  });

  it('renders menu dropdown', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui></growspace-header-actions-ui>
    `);
    expect(el.shadowRoot!.querySelector('.menu-dropdown')).not.toBeNull();
  });

  it('dispatches action-triggered event when menu item clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui @action-triggered=${handler}></growspace-header-actions-ui>
    `);
    const menuItems = el.shadowRoot!.querySelectorAll('.menu-item') as NodeListOf<HTMLElement>;
    expect(menuItems.length).toBeGreaterThan(0);
    menuItems[0]?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('shows Water Selected in menu when plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .selectedPlants=${new Set(['p1', 'p2'])}></growspace-header-actions-ui>
    `);
    const menuItems = el.shadowRoot!.querySelectorAll('.menu-item-label');
    const labels = Array.from(menuItems).map((i) => i.textContent);
    expect(labels.some((l) => l?.includes('Water Selected'))).toBe(true);
  });

  it('shows Water Growspace in menu when no plants are selected', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .selectedPlants=${new Set()}></growspace-header-actions-ui>
    `);
    const menuItems = el.shadowRoot!.querySelectorAll('.menu-item-label');
    const labels = Array.from(menuItems).map((i) => i.textContent);
    expect(labels.some((l) => l?.includes('Water Growspace'))).toBe(true);
  });

  it('dispatches chip-drag-start when chip is dragged', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .deviceChips=${[mockChip]}
        @chip-drag-start=${handler}
      ></growspace-header-actions-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip?.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches toggle-graph when chip is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui
        .deviceChips=${[mockChip]}
        @toggle-graph=${handler}
      ></growspace-header-actions-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('chip is not draggable in mobile mode without mobileLink', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true} .mobileLink=${false}></growspace-header-actions-ui>
    `);
    expect((el as any)._chipDraggable).toBe('false');
  });

  it('chip is draggable in mobile mode with mobileLink enabled', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${true} .mobileLink=${true}></growspace-header-actions-ui>
    `);
    expect((el as any)._chipDraggable).toBe('true');
  });

  it('chip is always draggable in desktop mode', async () => {
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui .isMobile=${false}></growspace-header-actions-ui>
    `);
    expect((el as any)._chipDraggable).toBe('true');
  });
});
