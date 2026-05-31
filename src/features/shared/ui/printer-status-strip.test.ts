import { describe, it, expect, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { getPrinters, type PrinterStatusStrip } from './printer-status-strip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHass(overrides: Record<string, unknown> = {}) {
  return { states: overrides } as any;
}

function connectedPrinterStates(prefix = 'niimbot_6649b9', batteryPct = 75) {
  return {
    [`image.${prefix}_last_label_made`]: {
      state: 'ok',
      attributes: { friendly_name: `Niimbot 6649b9 Last Label Made` },
    },
    [`binary_sensor.${prefix}_connection`]: { state: 'on', attributes: {} },
    [`sensor.${prefix}_battery`]: { state: String(batteryPct), attributes: {} },
    [`binary_sensor.${prefix}_paper_loaded`]: { state: 'on', attributes: {} },
  };
}

const mockTags = ['ha-svg-icon'];
for (const tag of mockTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

// ---------------------------------------------------------------------------
// getPrinters – model construction
// ---------------------------------------------------------------------------

describe('getPrinters – connected printer', () => {
  it('returns one printer with correct id and mac', () => {
    const hass = makeHass(connectedPrinterStates());
    const printers = getPrinters(hass);
    expect(printers).toHaveLength(1);
    expect(printers[0].id).toBe('image.niimbot_6649b9_last_label_made');
    expect(printers[0].mac).toBe('niimbot_6649b9');
  });

  it('strips " Last Label Made" from friendly name', () => {
    const hass = makeHass(connectedPrinterStates());
    expect(getPrinters(hass)[0].name).toBe('Niimbot 6649b9');
  });

  it('resolves connected=true from binary_sensor', () => {
    const hass = makeHass(connectedPrinterStates());
    expect(getPrinters(hass)[0].connected).toBe(true);
  });

  it('resolves batteryPct from sensor state', () => {
    const hass = makeHass(connectedPrinterStates('niimbot_6649b9', 82));
    expect(getPrinters(hass)[0].batteryPct).toBe(82);
  });

  it('resolves paperLoaded=true from binary_sensor', () => {
    const hass = makeHass(connectedPrinterStates());
    expect(getPrinters(hass)[0].paperLoaded).toBe(true);
  });
});

describe('getPrinters – offline printer', () => {
  it('returns connected=false when connection sensor is off', () => {
    const states = {
      ...connectedPrinterStates(),
      'binary_sensor.niimbot_6649b9_connection': { state: 'off', attributes: {} },
    };
    const hass = makeHass(states);
    expect(getPrinters(hass)[0].connected).toBe(false);
  });

  it('retains last known batteryPct even when offline', () => {
    const states = {
      ...connectedPrinterStates('niimbot_6649b9', 60),
      'binary_sensor.niimbot_6649b9_connection': { state: 'off', attributes: {} },
    };
    const hass = makeHass(states);
    expect(getPrinters(hass)[0].batteryPct).toBe(60);
  });
});

describe('getPrinters – low battery printer', () => {
  it('returns batteryPct=15 for a nearly-dead battery', () => {
    const hass = makeHass(connectedPrinterStates('niimbot_6649b9', 15));
    expect(getPrinters(hass)[0].batteryPct).toBe(15);
  });
});

function without(states: Record<string, unknown>, key: string) {
  const copy = { ...states };
  delete copy[key];
  return copy;
}

describe('getPrinters – missing sibling entities', () => {
  it('returns batteryPct=null when battery sensor absent', () => {
    const hass = makeHass(without(connectedPrinterStates(), 'sensor.niimbot_6649b9_battery'));
    expect(getPrinters(hass)[0].batteryPct).toBeNull();
  });

  it('returns connected=false when connection sensor absent', () => {
    const hass = makeHass(
      without(connectedPrinterStates(), 'binary_sensor.niimbot_6649b9_connection')
    );
    expect(getPrinters(hass)[0].connected).toBe(false);
  });

  it('returns paperLoaded=false when paper_loaded sensor absent', () => {
    const hass = makeHass(
      without(connectedPrinterStates(), 'binary_sensor.niimbot_6649b9_paper_loaded')
    );
    expect(getPrinters(hass)[0].paperLoaded).toBe(false);
  });
});

describe('getPrinters – no printers', () => {
  it('returns empty array when hass has no image entities', () => {
    expect(getPrinters(makeHass({ 'sensor.temp': { state: '22', attributes: {} } }))).toEqual([]);
  });

  it('returns empty array for empty states', () => {
    expect(getPrinters(makeHass())).toEqual([]);
  });

  it('ignores image entities that do not end in _last_label_made', () => {
    const hass = makeHass({
      'image.niimbot_6649b9_thumbnail': { state: 'ok', attributes: {} },
    });
    expect(getPrinters(hass)).toEqual([]);
  });

  it('handles multiple printers', () => {
    const hass = makeHass({
      ...connectedPrinterStates('niimbot_aabbcc', 90),
      ...connectedPrinterStates('niimbot_ddeeff', 30),
    });
    expect(getPrinters(hass)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// PrinterStatusStrip component
// ---------------------------------------------------------------------------

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PrinterStatusStrip – no selectedDeviceId', () => {
  it('shows no-printers message when selectedDeviceId is empty', async () => {
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(connectedPrinterStates())}
        .selectedDeviceId=${''}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.textContent).toContain('No Niimbot printers discovered');
  });
});

describe('PrinterStatusStrip – connected printer', () => {
  it('shows "Connected" label', async () => {
    const hass = makeHass(connectedPrinterStates());
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${hass}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.textContent).toContain('Connected');
  });

  it('renders pulse dot when connected', async () => {
    const hass = makeHass(connectedPrinterStates());
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${hass}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.querySelector('.pulse-dot')).not.toBeNull();
  });

  it('shows battery percentage', async () => {
    const hass = makeHass(connectedPrinterStates('niimbot_6649b9', 75));
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${hass}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.textContent).toContain('75%');
  });

  it('shows paper loaded indicator as active', async () => {
    const hass = makeHass(connectedPrinterStates());
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${hass}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    const paperEl = el.shadowRoot!.querySelector('.paper-indicator');
    expect(paperEl).not.toBeNull();
    expect(paperEl!.classList.contains('muted')).toBe(false);
  });
});

describe('PrinterStatusStrip – offline printer', () => {
  it('shows "Offline" label', async () => {
    const states = {
      ...connectedPrinterStates(),
      'binary_sensor.niimbot_6649b9_connection': { state: 'off', attributes: {} },
    };
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(states)}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.textContent).toContain('Offline');
  });

  it('does not render pulse dot when offline', async () => {
    const states = {
      ...connectedPrinterStates(),
      'binary_sensor.niimbot_6649b9_connection': { state: 'off', attributes: {} },
    };
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(states)}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.querySelector('.pulse-dot')).toBeNull();
  });

  it('hides battery percentage when offline', async () => {
    const states = {
      ...connectedPrinterStates('niimbot_6649b9', 60),
      'binary_sensor.niimbot_6649b9_connection': { state: 'off', attributes: {} },
    };
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(states)}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.textContent).not.toContain('60%');
  });

  it('applies grey class to battery glyph when offline', async () => {
    const states = {
      ...connectedPrinterStates(),
      'binary_sensor.niimbot_6649b9_connection': { state: 'off', attributes: {} },
    };
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(states)}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.querySelector('.battery.grey')).not.toBeNull();
  });
});

describe('PrinterStatusStrip – battery colour thresholds', () => {
  async function renderWithBattery(pct: number, connected = true) {
    const states = {
      ...connectedPrinterStates('niimbot_6649b9', pct),
      'binary_sensor.niimbot_6649b9_connection': { state: connected ? 'on' : 'off', attributes: {} },
    };
    return fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(states)}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
  }

  it('applies green class above 50%', async () => {
    const el = await renderWithBattery(75);
    expect(el.shadowRoot!.querySelector('.battery.green')).not.toBeNull();
  });

  it('applies amber class between 20% and 50%', async () => {
    const el = await renderWithBattery(35);
    expect(el.shadowRoot!.querySelector('.battery.amber')).not.toBeNull();
  });

  it('applies red class below 20%', async () => {
    const el = await renderWithBattery(15);
    expect(el.shadowRoot!.querySelector('.battery.red')).not.toBeNull();
  });

  it('applies amber class at exactly 50%', async () => {
    const el = await renderWithBattery(50);
    expect(el.shadowRoot!.querySelector('.battery.amber')).not.toBeNull();
  });

  it('applies red class at exactly 20%', async () => {
    const el = await renderWithBattery(20);
    expect(el.shadowRoot!.querySelector('.battery.red')).not.toBeNull();
  });
});

describe('PrinterStatusStrip – paper loaded indicator', () => {
  it('mutes paper indicator when paper is not loaded', async () => {
    const states = {
      ...connectedPrinterStates(),
      'binary_sensor.niimbot_6649b9_paper_loaded': { state: 'off', attributes: {} },
    };
    const el = await fixture<PrinterStatusStrip>(html`
      <printer-status-strip
        .hass=${makeHass(states)}
        .selectedDeviceId=${'image.niimbot_6649b9_last_label_made'}
      ></printer-status-strip>
    `);
    expect(el.shadowRoot!.querySelector('.paper-indicator.muted')).not.toBeNull();
  });
});
