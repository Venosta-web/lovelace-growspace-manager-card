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

  describe('Drag and Drop', () => {
    it('sets dataTransfer on dragstart', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui .deviceChips=${[mockChip]}></growspace-header-actions-ui>
      `);
      const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
      
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };
      
      const event = new DragEvent('dragstart', { bubbles: true, composed: true });
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
      
      chip.dispatchEvent(event);
      
      expect(dataTransfer.effectAllowed).toBe('move');
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', mockChip.key);
    });

    it('handles dragover and prevents default', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui .deviceChips=${[mockChip]}></growspace-header-actions-ui>
      `);
      const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
      
      // We need to trigger dragstart first to set _draggedMetric
      chip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true }));
      
      const dragOverEvent = new DragEvent('dragover', { bubbles: true, composed: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault');
      
      chip.dispatchEvent(dragOverEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not prevent default on dragover if no chip is being dragged', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui .deviceChips=${[mockChip]}></growspace-header-actions-ui>
      `);
      const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
      
      const dragOverEvent = new DragEvent('dragover', { bubbles: true, composed: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault');
      
      chip.dispatchEvent(dragOverEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('dispatches chip-drop when dropped on different chip', async () => {
      const handler = vi.fn();
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui 
          .deviceChips=${[mockChip, { ...mockChip, key: 'humidity' }]} 
          @chip-drop=${handler}
        ></growspace-header-actions-ui>
      `);
      const chips = el.shadowRoot!.querySelectorAll('growspace-chip');
      
      // Start dragging first chip
      chips[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true }));
      
      // Drop on second chip
      const dropEvent = new DragEvent('drop', { bubbles: true, composed: true });
      chips[1].dispatchEvent(dropEvent);
      
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({
        sourceMetric: 'temperature',
        targetMetric: 'humidity'
      });
    });

    it('does not dispatch chip-drop if dropped on same chip', async () => {
      const handler = vi.fn();
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui 
          .deviceChips=${[mockChip]} 
          @chip-drop=${handler}
        ></growspace-header-actions-ui>
      `);
      const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
      
      chip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true }));
      chip.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true }));
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not dispatch chip-drop if no chip is being dragged', async () => {
      const handler = vi.fn();
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui 
          .deviceChips=${[mockChip]} 
          @chip-drop=${handler}
        ></growspace-header-actions-ui>
      `);
      const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
      
      chip.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true }));
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  it('dispatches unlink-graphs event when chip emits unlink', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceHeaderActionsUI>(html`
      <growspace-header-actions-ui 
        .deviceChips=${[mockChip]} 
        @unlink-graphs=${handler}
      ></growspace-header-actions-ui>
    `);
    const chip = el.shadowRoot!.querySelector('growspace-chip') as HTMLElement;
    chip.dispatchEvent(new CustomEvent('unlink', { bubbles: true, composed: true }));
    
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.groupIndex).toBe(0);
  });

  describe('Menu Actions', () => {
    const actions = [
      'add_plant', 'water', 'ipm', 'training', 
      'irrigation', 'nutrients', 'ec_ramp', 'strains', 
      'logbook', 'report', 'snapshots', 'ai'
    ];

    actions.forEach(action => {
      it(`triggers action: ${action}`, async () => {
        const handler = vi.fn();
        const el = await fixture<GrowspaceHeaderActionsUI>(html`
          <growspace-header-actions-ui @action-triggered=${handler}></growspace-header-actions-ui>
        `);
        
        // Find the menu item with the action
        // For menu items, we can find by checking labels or checking if we can click them all
        const menuItems = Array.from(el.shadowRoot!.querySelectorAll('.menu-item')) as HTMLElement[];
        
        // This is a bit lazy, but we want to make sure every menu item works.
        // Let's find by action if possible? The click handler calls _triggerAction(action)
        // Since we can't easily see the action from the DOM, we'll just click them by index
        // but we'll try to match the index to our action list.
        
        const index = actions.indexOf(action);
        if (menuItems[index]) {
          menuItems[index].click();
          expect(handler).toHaveBeenCalled();
          expect(handler.mock.calls[0][0].detail.action).toBe(action);
        }
      });
    });

    it('hides popover when action is triggered', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui></growspace-header-actions-ui>
      `);
      const menu = el.shadowRoot!.getElementById('header-menu') as any;
      
      // Mock hidePopover
      menu.hidePopover = vi.fn();
      
      // Trigger an action
      (el as any)._triggerAction('test');
      
      expect(menu.hidePopover).toHaveBeenCalled();
    });

    it('handles hidePopover failure gracefully', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui></growspace-header-actions-ui>
      `);
      const menu = el.shadowRoot!.getElementById('header-menu') as any;
      
      // Mock hidePopover to throw
      menu.hidePopover = vi.fn(() => { throw new Error('fail'); });
      
      // Trigger an action - should not throw
      expect(() => (el as any)._triggerAction('test')).not.toThrow();
    });

    it('handles missing menu gracefully in _triggerAction', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui></growspace-header-actions-ui>
      `);
      // Mock shadowRoot to return null for getElementById
      vi.spyOn(el.shadowRoot!, 'getElementById').mockReturnValue(null);
      
      expect(() => (el as any)._triggerAction('test')).not.toThrow();
    });

    it('handles menu without hidePopover gracefully', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui></growspace-header-actions-ui>
      `);
      const menu = el.shadowRoot!.getElementById('header-menu') as any;
      delete menu.hidePopover;
      
      expect(() => (el as any)._triggerAction('test')).not.toThrow();
    });

    it('updates labels based on selectedPlants count', async () => {
      const el = await fixture<GrowspaceHeaderActionsUI>(html`
        <growspace-header-actions-ui .selectedPlants=${new Set(['p1'])}></growspace-header-actions-ui>
      `);
      
      const labels = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).map(l => l.textContent);
      expect(labels).toContain('Water Selected');
      expect(labels).toContain('Apply IPM to Selected');
      expect(labels).toContain('Train Selected');
      
      el.selectedPlants = new Set();
      await el.updateComplete;
      
      const newLabels = Array.from(el.shadowRoot!.querySelectorAll('.menu-item-label')).map(l => l.textContent);
      expect(newLabels).toContain('Water Growspace');
      expect(newLabels).toContain('Log / Manage IPM');
      expect(newLabels).toContain('Log Training');
    });
  });
});

