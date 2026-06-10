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

  it('updates _deckIndex on scroll in mobile mode', async () => {
    const chips = [
      makeChip({ key: 'temperature' }),
      makeChip({ key: 'humidity', label: 'Humidity' }),
      makeChip({ key: 'co2', label: 'CO2' }),
    ];
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui .chips=${chips} .isMobile=${true}></growspace-header-hero-ui>
    `);

    const deckScroll = el.shadowRoot!.querySelector('.deck-scroll') as HTMLElement;
    expect(deckScroll).not.toBeNull();

    // Stub offsetWidth of the first child
    const firstItem = deckScroll.firstElementChild as HTMLElement;
    Object.defineProperty(firstItem, 'offsetWidth', { value: 100, configurable: true });

    // Mock scrollLeft directly on the scroll container to bypass layout limitations
    Object.defineProperty(deckScroll, 'scrollLeft', { value: 112, configurable: true });

    // Dispatch scroll event
    deckScroll.dispatchEvent(new Event('scroll'));
    await el.updateComplete;

    // Verify the second dot becomes active
    const dots = el.shadowRoot!.querySelectorAll('.deck-dot');
    expect(dots[1].classList.contains('active')).toBe(true);
  });

  it('renders crop steering phase hero card when chip is steering_phase and irrigation strategy is enabled', async () => {
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P3 · 22:40' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };
    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
      ></growspace-header-hero-ui>
    `);

    // Verify it renders the phase-hero-card class
    const card = el.shadowRoot!.querySelector('.phase-hero-card');
    expect(card).not.toBeNull();
    
    // Since historyCache is empty, it should not render a chart SVG
    expect(el.shadowRoot!.querySelector('.phase-chart-svg')).toBeNull();
  });

  it('returns null chart and does not render SVG when historyCache is invalid or lacks enough data points', async () => {
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P3 · 22:40' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };

    // Case 1: Only 1 data point
    const historyCache1 = {
      soil_moisture: [
        { last_changed: new Date().toISOString(), state: '55.5' }
      ]
    };
    const el1 = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache1}
      ></growspace-header-hero-ui>
    `);
    expect(el1.shadowRoot!.querySelector('.phase-chart-svg')).toBeNull();

    // Case 2: Data points are 'unavailable' or 'unknown'
    const historyCache2 = {
      soil_moisture: [
        { last_changed: new Date(Date.now() - 3600000).toISOString(), state: 'unavailable' },
        { last_changed: new Date().toISOString(), state: 'unknown' }
      ]
    };
    const el2 = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache2}
      ></growspace-header-hero-ui>
    `);
    expect(el2.shadowRoot!.querySelector('.phase-chart-svg')).toBeNull();
  });

  it('renders SVG chart with target and trigger lines when valid history cache is provided', async () => {
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P2 · 12:30' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };
    const now = Date.now();
    const historyCache = {
      soil_moisture: [
        { last_changed: new Date(now - 24 * 60 * 60 * 1000).toISOString(), state: '50.0' },
        { last_changed: new Date(now - 12 * 60 * 60 * 1000).toISOString(), state: '62.0' },
        { last_changed: new Date(now).toISOString(), state: '55.5' },
      ]
    };

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    // Verify VWC readout is rendered in header
    const vwcReadout = el.shadowRoot!.querySelector('.phase-vwc-readout');
    expect(vwcReadout?.textContent?.replace(/\s/g, '')).toBe('VWC55.5%');

    // Verify SVG chart container and svg exist
    expect(el.shadowRoot!.querySelector('.phase-chart-container')).not.toBeNull();
    const svg = el.shadowRoot!.querySelector('.phase-chart-svg');
    expect(svg).not.toBeNull();

    // Verify SVG elements (lines, texts for Target VWC and P3 trigger VWC)
    const texts = Array.from(svg!.querySelectorAll('text'));
    expect(texts.some(t => t.textContent?.includes('Target 60%'))).toBe(true);
    expect(texts.some(t => t.textContent?.includes('P3 trigger 45%'))).toBe(true);
  });

  it('handles mousemove and mouseleave on SVG chart for hover details', async () => {
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P2 · 12:30' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };
    const now = Date.now();
    const historyCache = {
      soil_moisture: [
        { last_changed: new Date(now - 24 * 60 * 60 * 1000).toISOString(), state: '50.0' },
        { last_changed: new Date(now - 12 * 60 * 60 * 1000).toISOString(), state: '62.0' },
        { last_changed: new Date(now).toISOString(), state: '55.5' },
      ]
    };

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    const svg = el.shadowRoot!.querySelector('.phase-chart-svg') as SVGElement;
    expect(svg).not.toBeNull();

    // Stub getBoundingClientRect
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 10,
      width: 100,
      height: 50,
      right: 110,
      bottom: 60,
      x: 10,
      y: 10,
      toJSON: () => {},
    });

    // 1. Hover at 50% width
    const moveEvent = new MouseEvent('mousemove', {
      clientX: 60, // (60 - 10) / 100 = 0.5
      clientY: 25,
      bubbles: true,
    });
    svg.dispatchEvent(moveEvent);
    await el.updateComplete;

    // Verify hover tooltip is rendered
    const tooltip = el.shadowRoot!.querySelector('.phase-tooltip') as HTMLElement;
    expect(tooltip).not.toBeNull();
    // It should render "left: 50%" approximately
    expect(tooltip.style.left).toBe('50%');

    // 2. Mouse leave should clear hover details
    svg.dispatchEvent(new MouseEvent('mouseleave'));
    await el.updateComplete;

    // Verify tooltip is removed
    expect(el.shadowRoot!.querySelector('.phase-tooltip')).toBeNull();
  });

  it('renders multi-day phase segments when timeRange is 7d', async () => {
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P2 · 12:30' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };
    const now = Date.now();
    const historyCache = {
      soil_moisture: [
        { last_changed: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), state: '50.0' },
        { last_changed: new Date(now).toISOString(), state: '55.5' },
      ]
    };

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
        .timeRange=${'7d'}
      ></growspace-header-hero-ui>
    `);

    // Verify phase-bar-seg elements are rendered
    const segments = el.shadowRoot!.querySelectorAll('.phase-bar-seg');
    expect(segments.length).toBeGreaterThan(0);
  });

  it('dispatches drag and click events on phase-hero-card', async () => {
    const toggleHandler = vi.fn();
    const dragHandler = vi.fn();
    const dropHandler = vi.fn();
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P2 · 12:30' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };
    const now = Date.now();
    const historyCache = {
      soil_moisture: [
        { last_changed: new Date(now - 3600000).toISOString(), state: '50.0' },
        { last_changed: new Date(now).toISOString(), state: '55.5' },
      ]
    };

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
        @toggle-graph=${toggleHandler}
        @chip-drag-start=${dragHandler}
        @chip-drop=${dropHandler}
      ></growspace-header-hero-ui>
    `);

    const card = el.shadowRoot!.querySelector('.phase-hero-card') as HTMLElement;
    expect(card).not.toBeNull();

    // Trigger click
    card.click();
    expect(toggleHandler).toHaveBeenCalledOnce();
    expect(toggleHandler.mock.calls[0][0].detail.metric).toBe('steering_phase');

    // Trigger dragstart
    const dragEvent = new DragEvent('dragstart', { bubbles: true, composed: true });
    card.dispatchEvent(dragEvent);
    expect(dragHandler).toHaveBeenCalledOnce();

    // Trigger dragover
    const dragOverEvent = new DragEvent('dragover', { bubbles: true, composed: true, cancelable: true });
    vi.spyOn(dragOverEvent, 'preventDefault');
    card.dispatchEvent(dragOverEvent);
    expect(dragOverEvent.preventDefault).toHaveBeenCalled();

    // Trigger drop
    const dropEvent = new DragEvent('drop', { bubbles: true, composed: true, cancelable: true });
    vi.spyOn(dropEvent, 'preventDefault');
    card.dispatchEvent(dropEvent);
    expect(dropEvent.preventDefault).toHaveBeenCalled();
    expect(dropHandler).toHaveBeenCalledOnce();
  });

  it('renders P3 Dryback badge when current phase is P3', async () => {
    const chips = [
      makeChip({ key: 'steering_phase', label: 'Phase', value: 'P3 · 22:40' })
    ];
    const strategy = {
      enabled: true,
      targetVwcPercent: 60,
      maintenanceDrybackPercent: 15,
      lightsOnTime: '06:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
    };
    const now = Date.now();
    const historyCache = {
      soil_moisture: [
        { last_changed: new Date(now - 3600000).toISOString(), state: '50.0' },
        { last_changed: new Date(now).toISOString(), state: '55.5' },
      ]
    };

    const el = await fixture<GrowspaceHeaderHeroUI>(html`
      <growspace-header-hero-ui
        .chips=${chips}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);

    const badge = el.shadowRoot!.querySelector('.phase-badge--dryback');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Dryback');
  });

  it('handles hover calculation edge cases directly', () => {
    const el = new GrowspaceHeaderHeroUI();
    const now = Date.now();
    const historyData = [
      { last_changed: new Date(now - 3600000).toISOString(), state: '50.0' },
      { last_changed: new Date(now).toISOString(), state: '60.0' },
    ];
    const chart = (el as any)._buildPhaseChart(historyData, 60, 45, 300, 68);
    expect(chart).not.toBeNull();
    // Pass t = 1.5 to trigger the fallback return currentVwc line (line 611)
    expect(chart.hoverVwc(1.5)).toBe(60.0);
  });
});

