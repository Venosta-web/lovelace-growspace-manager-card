import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderHeroUI } from '../../../../../src/features/ui/components/growspace-header-hero-ui';
import type { HeaderChip } from '../../../../../src/utils/metrics-utils';
import { ChartUtils } from '../../../../../src/utils/chart-utils';

if (!customElements.get('growspace-header-hero-ui')) {
  customElements.define('growspace-header-hero-ui', GrowspaceHeaderHeroUI);
}

const makeChip = (overrides: Partial<HeaderChip> = {}): HeaderChip => ({
  key: 'temperature',
  icon: 'mdi:thermometer',
  value: '24.5 °C',
  label: 'Temperature',
  status: 'ok',
  active: false,
  linked: false,
  groupIndex: 0,
  ...overrides,
});

describe('GrowspaceHeaderHeroUI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('is defined as a custom element', () => {
    expect(customElements.get('growspace-header-hero-ui')).toBeDefined();
  });

  it('renders nothing when chips is empty', async () => {
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${[]}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-card')).toBeNull();
  });

  it('renders one hero-card per chip', async () => {
    const chips = [makeChip({ key: 'temperature' }), makeChip({ key: 'humidity', label: 'Humidity' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelectorAll('.hero-card').length).toBe(2);
  });

  it('renders label text for each chip', async () => {
    const chips = [makeChip({ key: 'temperature', label: 'Temperature' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-label')?.textContent).toBe('Temperature');
  });

  it('renders value text from chip.value', async () => {
    const chips = [makeChip({ value: '24.5 °C' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    const valueEl = el.shadowRoot!.querySelector('.hero-value');
    expect(valueEl?.textContent).toBe('24.5');
    const unitEl = el.shadowRoot!.querySelector('.hero-unit');
    expect(unitEl?.textContent).toBe('°C');
  });

  it('renders multi-values when chip.multiValues is set', async () => {
    const chips = [makeChip({ value: '', multiValues: ['22°C', '65%'] })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-multi-values')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.hero-value')).toBeNull();
  });

  it('applies active class when chip.active is true', async () => {
    const chips = [makeChip({ active: true })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-card.active')).not.toBeNull();
  });

  it('applies linked class when chip.linked is true', async () => {
    const chips = [makeChip({ linked: true })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-card.linked')).not.toBeNull();
  });

  it('applies status class when chip.status is set', async () => {
    const chips = [makeChip({ status: 'warning' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-card.status-warning')).not.toBeNull();
  });

  it('dispatches toggle-graph event when hero card is clicked', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'temperature' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} @toggle-graph=${handler}></growspace-header-hero-ui>
    `);
    const card = el.shadowRoot!.querySelector('.hero-card') as HTMLElement;
    card?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.metric).toBe('temperature');
  });

  it('sets dataTransfer and dispatches chip-drag-start event on dragstart', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'humidity' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} @chip-drag-start=${handler}></growspace-header-hero-ui>
    `);
    const card = el.shadowRoot!.querySelector('.hero-card') as HTMLElement;
    
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: '',
    };
    const event = new DragEvent('dragstart', { bubbles: true, composed: true });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });

    card?.dispatchEvent(event);
    
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'humidity');
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.metric).toBe('humidity');
  });

  it('prevents default and dispatches chip-drop event on drop', async () => {
    const handler = vi.fn();
    const chips = [makeChip({ key: 'temperature' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} @chip-drop=${handler}></growspace-header-hero-ui>
    `);
    const card = el.shadowRoot!.querySelector('.hero-card') as HTMLElement;
    
    const event = new DragEvent('drop', { bubbles: true, composed: true, cancelable: true });
    vi.spyOn(event, 'preventDefault');

    card?.dispatchEvent(event);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.targetMetric).toBe('temperature');
  });

  it('prevents default on dragover', async () => {
    const chips = [makeChip({ key: 'temperature' })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    const card = el.shadowRoot!.querySelector('.hero-card') as HTMLElement;
    
    const event = new DragEvent('dragover', { bubbles: true, composed: true, cancelable: true });
    vi.spyOn(event, 'preventDefault');

    card?.dispatchEvent(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('renders multi-entity sparklines when multiple entity IDs are provided', async () => {
    const chips = [makeChip({ key: 'co2', entityIds: ['id1', 'id2'] })];
    const historyCache = {
      'co2:id1': [{ x: 0, y: 400 }, { x: 1, y: 450 }],
      'co2:id2': [{ x: 0, y: 500 }, { x: 1, y: 550 }],
    };
    
    vi.spyOn(ChartUtils, 'generateSparklinePath').mockReturnValue('M 0 0 L 10 10');

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    const sparkline = el.shadowRoot!.querySelector('.hero-sparkline');
    expect(sparkline).not.toBeNull();
    const paths = sparkline!.querySelectorAll('path');
    // 2 paths for history + 1 for gradient area
    expect(paths.length).toBe(3);
    expect(paths[1].getAttribute('stroke')).toContain('color-mix');
  });

  it('renders VPD sparkline segments when chip is vpd and device/hass are present', async () => {
    const chips = [makeChip({ key: 'vpd' })];
    const device = { overviewEntityId: 'sensor.grow_tent_vpd' } as any;
    const hass = {
      states: {
        'sensor.grow_tent_vpd': {
          attributes: {
            day_vpd_target_min: 0.9,
            day_vpd_target_max: 1.1,
          }
        }
      }
    } as any;
    const historyCache = {
      vpd: [{ x: 0, y: 1.0 }],
      light: [{ x: 0, v: 1 }],
    };

    vi.spyOn(ChartUtils, 'generateVpdSparklineSegments').mockReturnValue([
      { path: 'M 0 0 L 10 10', color: 'green' }
    ]);

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .device=${device}
        .hass=${hass}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    expect(ChartUtils.generateVpdSparklineSegments).toHaveBeenCalled();
    const sparkline = el.shadowRoot!.querySelector('.hero-sparkline');
    expect(sparkline).not.toBeNull();
    expect(sparkline!.querySelectorAll('path').length).toBe(1);
    expect(sparkline!.querySelector('path')?.getAttribute('stroke')).toBe('green');
  });

  it('uses default VPD target values when attributes are missing', async () => {
    const chips = [makeChip({ key: 'vpd' })];
    const device = { overviewEntityId: 'sensor.grow_tent_vpd' } as any;
    const hass = {
      states: {
        'sensor.grow_tent_vpd': {
          attributes: {}
        }
      }
    } as any;
    const historyCache = { vpd: [{ x: 0, y: 1.0 }] };

    const spy = vi.spyOn(ChartUtils, 'generateVpdSparklineSegments');

    await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .device=${device}
        .hass=${hass}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        day: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 },
        night: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 }
      },
      expect.anything(),
      expect.anything()
    );
  });

  it('renders single-entity sparkline when path is generated', async () => {
    const chips = [makeChip({ key: 'temperature' })];
    const historyCache = {
      temperature: [{ x: 0, y: 20 }, { x: 1, y: 25 }],
    };
    
    vi.spyOn(ChartUtils, 'generateSparklinePath').mockReturnValue('M 0 0 L 10 10');

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    expect(el.shadowRoot!.querySelector('.hero-sparkline')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('path').length).toBe(2); // Path + Gradient area
  });

  it('uses specific night attributes for VPD when provided', async () => {
    const chips = [makeChip({ key: 'vpd' })];
    const device = { overviewEntityId: 'sensor.grow_tent_vpd' } as any;
    const hass = {
      states: {
        'sensor.grow_tent_vpd': {
          attributes: {
            night_vpd_target_min: 0.5,
          }
        }
      }
    } as any;
    const historyCache = { vpd: [{ x: 0, y: 1.0 }] };

    const spy = vi.spyOn(ChartUtils, 'generateVpdSparklineSegments');

    await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .device=${device}
        .hass=${hass}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        night: expect.objectContaining({ targetMin: 0.5 })
      }),
      expect.anything(),
      expect.anything()
    );
  });

  it('handles missing overviewEntity in VPD logic gracefully', async () => {
    const chips = [makeChip({ key: 'vpd' })];
    const device = { overviewEntityId: 'sensor.missing' } as any;
    const hass = { states: {} } as any; // Empty states
    const historyCache = { vpd: [{ x: 0, y: 1.0 }] };

    const spy = vi.spyOn(ChartUtils, 'generateVpdSparklineSegments');

    await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .device=${device}
        .hass=${hass}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        day: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 },
        night: { targetMin: 0.8, targetMax: 1.2, dangerMin: 0.4, dangerMax: 1.6 }
      },
      expect.anything(),
      expect.anything()
    );
  });

  it('handles null paths in multi-entity sparklines', async () => {
    const chips = [makeChip({ key: 'co2', entityIds: ['id1', 'id2'] })];
    const historyCache = {
      'co2:id1': [{ x: 0, y: 400 }],
      'co2:id2': [{ x: 0, y: 500 }],
    };
    
    // Return null for the first entity, then M 0 0 for the second
    vi.spyOn(ChartUtils, 'generateSparklinePath')
      .mockReturnValueOnce(null as any)
      .mockReturnValueOnce('M 0 0 L 10 10');

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    const paths = el.shadowRoot!.querySelectorAll('.hero-sparkline path');
    // Only id2 path + gradient area = 2 paths
    expect(paths.length).toBe(2);
  });

  it('does not apply active or status classes when false/undefined', async () => {
    const chips = [makeChip({ active: false, status: undefined })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    const card = el.shadowRoot!.querySelector('.hero-card');
    expect(card?.classList.contains('active')).toBe(false);
    expect(Array.from(card?.classList || []).some(c => c.startsWith('status-'))).toBe(false);
  });

  it('handles missing dataTransfer in dragstart', async () => {
    const handler = vi.fn();
    const chips = [makeChip()];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} @chip-drag-start=${handler}></growspace-header-hero-ui>
    `);
    const card = el.shadowRoot!.querySelector('.hero-card') as HTMLElement;
    
    // Explicitly nullify dataTransfer
    const event = new DragEvent('dragstart', { bubbles: true, composed: true });
    Object.defineProperty(event, 'dataTransfer', { value: null });

    card?.dispatchEvent(event);
    expect(handler).toHaveBeenCalled(); // Should still dispatch event
  });

  it('handles missing overviewEntityId in device', async () => {
    const chips = [makeChip({ key: 'vpd' })];
    const device = { overviewEntityId: undefined } as any;
    const historyCache = { vpd: [{ x: 0, y: 1.0 }] };

    const spy = vi.spyOn(ChartUtils, 'generateVpdSparklineSegments');

    await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .device=${device}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    expect(spy).toHaveBeenCalled();
  });

  it('sets draggable attribute correctly based on mobile settings', async () => {
    const chips = [makeChip()];
    
    // Case 1: Not mobile -> draggable
    const el1 = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} .isMobile=${false}></growspace-header-hero-ui>
    `);
    expect(el1.shadowRoot!.querySelector('.hero-card')?.getAttribute('draggable')).toBe('true');

    // Case 2: Mobile, no link -> NOT draggable
    const el2 = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} .isMobile=${true} .mobileLink=${false}></growspace-header-hero-ui>
    `);
    expect(el2.shadowRoot!.querySelector('.hero-card')?.getAttribute('draggable')).toBe('false');

    // Case 3: Mobile, with link -> draggable
    const el3 = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} .isMobile=${true} .mobileLink=${true}></growspace-header-hero-ui>
    `);
    expect(el3.shadowRoot!.querySelector('.hero-card')?.getAttribute('draggable')).toBe('true');
  });

  it('falls back to chip key when label is missing', async () => {
    const chips = [makeChip({ key: 'co2', label: undefined })];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips}></growspace-header-hero-ui>
    `);
    expect(el.shadowRoot!.querySelector('.hero-label')?.textContent).toBe('co2');
  });
});

