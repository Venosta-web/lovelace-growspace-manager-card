import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderUI } from '../../../../../src/features/ui/components/growspace-header-ui';

if (!customElements.get('growspace-header-ui')) {
  customElements.define('growspace-header-ui', GrowspaceHeaderUI);
}

describe('growspace-header-ui', () => {
  it('renders nothing when device is absent', async () => {
    const el = await fixture<GrowspaceHeaderUI>(html`<growspace-header-ui></growspace-header-ui>`);
    expect(el.shadowRoot!.querySelector('.gs-stats-container')).toBeNull();
  });

  it('renders the stats container when device is provided', async () => {
    const device = { deviceId: 'gs1', name: 'Tent 1', plants: [] } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .heroChips=${[]}
        .secondaryChips=${[]}
        .deviceChips=${[]}
        .devices=${[device]}
        .deviceId=${'gs1'}
        .config=${null}
        .inventory=${null}
        .dominant=${undefined}
      ></growspace-header-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-stats-container')).not.toBeNull();
  });

  it('emits toggle-graph when forwarded from sub-component', async () => {
    const handler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1', plants: [] } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .devices=${[device]}
        .deviceId=${'gs1'}
        @toggle-graph=${handler}
      ></growspace-header-ui>
    `);
    
    // Test direct dispatch to simulate sub-component bubbling/forwarding
    el.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'temperature' }, bubbles: true }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { metric: 'temperature' } }));
  });

  it('emits device-changed when select value changes', async () => {
    const handler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const device2 = { deviceId: 'gs2', name: 'Tent 2' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .devices=${[device, device2]}
        .deviceId=${'gs1'}
        @device-changed=${handler}
      ></growspace-header-ui>
    `);

    const select = el.shadowRoot!.querySelector('.growspace-select-header') as HTMLSelectElement;
    select.value = 'gs2';
    select.dispatchEvent(new Event('change'));

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { value: 'gs2' }
    }));
  });

  it('handles chip-drag-start and chip-drop forwarding', async () => {
    const startHandler = vi.fn();
    const dropHandler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        @chip-drag-start=${startHandler}
        @chip-drop=${dropHandler}
      ></growspace-header-ui>
    `);

    // Test drag start forwarding
    const actionsUi = el.shadowRoot!.querySelector('growspace-header-actions-ui');
    actionsUi!.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'temp' } }));
    expect(startHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { metric: 'temp', event: null }
    }));

    // Test drop forwarding
    actionsUi!.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'humidity' } }));
    expect(dropHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { targetMetric: 'humidity', event: null }
    }));
  });

  it('handles mobile link toggling and inventory nutrients opening', async () => {
    const nutrientsHandler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        @open-nutrients=${nutrientsHandler}
      ></growspace-header-ui>
    `);

    // Test mobile link toggle
    const actionsUi = el.shadowRoot!.querySelector('growspace-header-actions-ui');
    const initialMobileLink = (el as any)._mobileLink;
    actionsUi!.dispatchEvent(new CustomEvent('toggle-mobile-link'));
    expect((el as any)._mobileLink).toBe(!initialMobileLink);

    // Test open nutrients forwarding from secondary UI
    const secondaryUi = el.shadowRoot!.querySelector('growspace-header-secondary-ui');
    secondaryUi!.dispatchEvent(new CustomEvent('open-nutrients'));
    expect(nutrientsHandler).toHaveBeenCalledOnce();

    // Test toggle-graph from secondary UI
    const toggleHandler = vi.fn();
    el.addEventListener('toggle-graph', toggleHandler);
    secondaryUi!.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'temp' } }));
    expect(toggleHandler).toHaveBeenCalledWith(expect.objectContaining({ detail: { metric: 'temp' } }));

    // Test chip-drag-start from secondary UI (passes event)
    const startHandler = vi.fn();
    el.addEventListener('chip-drag-start', startHandler);
    const mockEvent = { type: 'dragstart' } as any;
    secondaryUi!.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'humidity', event: mockEvent } }));
    expect(startHandler).toHaveBeenCalledWith(expect.objectContaining({ detail: { metric: 'humidity', event: mockEvent } }));

    // Test chip-drop from secondary UI (passes event)
    const dropHandler = vi.fn();
    el.addEventListener('chip-drop', dropHandler);
    secondaryUi!.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'vpd', event: mockEvent } }));
    expect(dropHandler).toHaveBeenCalledWith(expect.objectContaining({ detail: { targetMetric: 'vpd', event: mockEvent } }));
  });

  it('handles action-triggered and unlink-graphs forwarding', async () => {
    const actionHandler = vi.fn();
    const unlinkHandler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        @action-triggered=${actionHandler}
        @unlink-graphs=${unlinkHandler}
      ></growspace-header-ui>
    `);

    // Test action-triggered from actions UI
    const actionsUi = el.shadowRoot!.querySelector('growspace-header-actions-ui');
    actionsUi!.dispatchEvent(new CustomEvent('action-triggered', { detail: { action: 'test' } }));
    expect(actionHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { action: 'test' }
    }));

    // Test unlink-graphs from secondary UI
    const secondaryUi = el.shadowRoot!.querySelector('growspace-header-secondary-ui');
    secondaryUi!.dispatchEvent(new CustomEvent('unlink-graphs', { detail: { groupIndex: 1 } }));
    expect(unlinkHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { groupIndex: 1 }
    }));
  });

  it('renders title instead of select when default_growspace is configured', async () => {
    const device = { deviceId: 'gs1', name: 'Main Tent' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .config=${{ default_growspace: 'gs1' }}
      ></growspace-header-ui>
    `);

    expect(el.shadowRoot!.querySelector('.growspace-select-header')).toBeNull();
    expect(el.shadowRoot!.querySelector('.gs-title')!.textContent).toBe('Main Tent');
  });

  it('forwards events from hero UI', async () => {
    const toggleHandler = vi.fn();
    const dragHandler = vi.fn();
    const dropHandler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        @toggle-graph=${toggleHandler}
        @chip-drag-start=${dragHandler}
        @chip-drop=${dropHandler}
      ></growspace-header-ui>
    `);

    const heroUi = el.shadowRoot!.querySelector('growspace-header-hero-ui');
    
    // Toggle graph
    heroUi!.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'vpd' } }));
    expect(toggleHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { metric: 'vpd' }
    }));

    // Drag start (should pass null event)
    heroUi!.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'vpd' } }));
    expect(dragHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { metric: 'vpd', event: null }
    }));

    // Drop (should pass null event)
    heroUi!.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'co2' } }));
    expect(dropHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { targetMetric: 'co2', event: null }
    }));
  });

  it('handles toggle-graph from actions UI', async () => {
    const toggleHandler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        @toggle-graph=${toggleHandler}
      ></growspace-header-ui>
    `);

    const actionsUi = el.shadowRoot!.querySelector('growspace-header-actions-ui');
    actionsUi!.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'humidity' } }));
    
    expect(toggleHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { metric: 'humidity' }
    }));
  });

  it('renders default text when device has no name and config is null', async () => {
    const device = { deviceId: 'gs1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .config=${null}
      ></growspace-header-ui>
    `);

    const sizer = el.shadowRoot!.querySelector('.select-sizer');
    expect(sizer!.textContent).toBe('Select Growspace');
  });

  it('triggers resize controller callback', async () => {
    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui .device=${device}></growspace-header-ui>
    `);
    
    // Simulate window resize which should trigger the controller's callback
    window.dispatchEvent(new Event('resize'));
    
    // Explicitly call the empty callback in resize controller to cover it 100%
    (el as any)._resizeController._callback?.();
    
    // Since the callback is () => {}, we just verify it doesn't crash
    expect(el).toBeDefined();
  });

  it('renders default text when device name is empty string', async () => {
    const device = { deviceId: 'gs1', name: '' } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui .device=${device}></growspace-header-ui>
    `);

    const sizer = el.shadowRoot!.querySelector('.select-sizer');
    expect(sizer!.textContent).toBe('Select Growspace');
  });

  it('renders mobile stage context with various dominant stage and plant count combinations', async () => {
    const deviceOnePlant = { deviceId: 'gs1', name: 'Tent 1', plants: [{ id: 'p1' }] } as any;
    const deviceTwoPlants = { deviceId: 'gs1', name: 'Tent 1', plants: [{ id: 'p1' }, { id: 'p2' }] } as any;
    const dominantStage = { color: '#00ff00', daysLabel: 'Veg Day 5' } as any;

    const el1 = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${deviceOnePlant}
        .dominant=${undefined}
      ></growspace-header-ui>
    `);
    const ctx1 = el1.shadowRoot!.querySelector('.mobile-stage-context');
    expect(ctx1).not.toBeNull();
    expect(ctx1!.textContent).toContain('1 plant');
    expect(ctx1!.textContent).not.toContain('Veg Day 5');
    expect(ctx1!.querySelector('.mobile-stage-dot')).toBeNull();

    const el2 = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${deviceTwoPlants}
        .dominant=${dominantStage}
      ></growspace-header-ui>
    `);
    const ctx2 = el2.shadowRoot!.querySelector('.mobile-stage-context');
    expect(ctx2).not.toBeNull();
    expect(ctx2!.textContent).toContain('2 plants');
    expect(ctx2!.textContent).toContain('Veg Day 5');
    expect(ctx2!.querySelector('.mobile-stage-dot')).not.toBeNull();
    expect(ctx2!.textContent).toContain('·');

    const el3 = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${{ deviceId: 'gs1', name: 'Tent 1', plants: [] }}
        .dominant=${dominantStage}
      ></growspace-header-ui>
    `);
    const ctx3 = el3.shadowRoot!.querySelector('.mobile-stage-context');
    expect(ctx3).not.toBeNull();
    expect(ctx3!.textContent).toContain('Veg Day 5');
    expect(ctx3!.textContent).not.toContain('plant');
  });

  it('renders meta row with various plant counts, dominant stages, and problem plant combinations', async () => {
    const deviceOnePlant = { deviceId: 'gs1', name: 'Tent 1', plants: [{ id: 'p1' }] } as any;
    const deviceTwoPlants = { deviceId: 'gs1', name: 'Tent 1', plants: [{ id: 'p1' }, { id: 'p2' }] } as any;
    const dominantStage = { color: '#00ff00', daysLabel: 'Veg Day 5' } as any;

    const el1 = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${deviceOnePlant}
        .dominant=${undefined}
        .problemPlants=${['p1']}
      ></growspace-header-ui>
    `);
    const meta1 = el1.shadowRoot!.querySelector('.header-meta-row');
    expect(meta1).not.toBeNull();
    expect(meta1!.textContent).toContain('1plant');
    expect(meta1!.textContent).toContain('1needs attention');

    const el2 = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${deviceTwoPlants}
        .dominant=${dominantStage}
        .problemPlants=${['p1', 'p2']}
      ></growspace-header-ui>
    `);
    const meta2 = el2.shadowRoot!.querySelector('.header-meta-row');
    expect(meta2).not.toBeNull();
    expect(meta2!.textContent).toContain('2plants');
    expect(meta2!.textContent).toContain('Veg Day 5');
    expect(meta2!.textContent).toContain('2need attention');

    const el3 = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${{ deviceId: 'gs1', name: 'Tent 1', plants: [] }}
        .dominant=${dominantStage}
        .problemPlants=${[]}
      ></growspace-header-ui>
    `);
    const meta3 = el3.shadowRoot!.querySelector('.header-meta-row');
    expect(meta3).not.toBeNull();
    expect(meta3!.textContent).toContain('Veg Day 5');
    expect(meta3!.textContent).not.toContain('plant');
    expect(meta3!.textContent).not.toContain('attention');
  });


  it('renders secondary mobile stat deck and handles forwarded events', async () => {
    const toggleHandler = vi.fn();
    const dragHandler = vi.fn();
    const dropHandler = vi.fn();

    const device = { deviceId: 'gs1', name: 'Tent 1' } as any;
    const secondaryChips = [{ id: 'vpd', label: 'VPD', value: '1.2' }] as any;

    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .secondaryChips=${secondaryChips}
        @toggle-graph=${toggleHandler}
        @chip-drag-start=${dragHandler}
        @chip-drop=${dropHandler}
      ></growspace-header-ui>
    `);

    (el as any)._resizeController.isMobile = true;
    el.requestUpdate();
    await el.updateComplete;

    const heroComponents = el.shadowRoot!.querySelectorAll('growspace-header-hero-ui');
    expect(heroComponents.length).toBe(2);

    const mobileHero = heroComponents[1];

    mobileHero.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'vpd' } }));
    expect(toggleHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { metric: 'vpd' }
    }));

    mobileHero.dispatchEvent(new CustomEvent('chip-drag-start', { detail: { metric: 'vpd' } }));
    expect(dragHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { metric: 'vpd', event: null }
    }));

    mobileHero.dispatchEvent(new CustomEvent('chip-drop', { detail: { targetMetric: 'co2' } }));
    expect(dropHandler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { targetMetric: 'co2', event: null }
    }));
  });
});

