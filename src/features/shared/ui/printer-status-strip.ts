import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiBluetooth, mdiBattery, mdiPrinter } from '@mdi/js';

export interface NiimbotPrinter {
  id: string;
  name: string;
  mac: string;
  batteryPct: number | null;
  connected: boolean;
  paperLoaded: boolean;
}

export function getPrinters(hass: HomeAssistant): NiimbotPrinter[] {
  return Object.keys(hass.states)
    .filter((eid) => eid.startsWith('image.') && eid.endsWith('_last_label_made'))
    .map((eid) => {
      const mac = eid.slice('image.'.length, -'_last_label_made'.length);
      const friendlyName = hass.states[eid].attributes.friendly_name || eid;
      const name = friendlyName.replace(' Last Label Made', '');

      const connectionEntity = hass.states[`binary_sensor.${mac}_connection`];
      const connected = connectionEntity?.state === 'on';

      const batteryEntity = hass.states[`sensor.${mac}_battery`];
      const batteryPct = batteryEntity ? parseFloat(batteryEntity.state) : null;

      const paperEntity = hass.states[`binary_sensor.${mac}_paper_loaded`];
      const paperLoaded = paperEntity?.state === 'on';

      return { id: eid, name, mac, batteryPct, connected, paperLoaded };
    });
}

function batteryColorClass(printer: NiimbotPrinter): string {
  if (!printer.connected) return 'grey';
  if (printer.batteryPct === null) return 'grey';
  if (printer.batteryPct > 50) return 'green';
  if (printer.batteryPct > 20) return 'amber';
  return 'red';
}

@customElement('printer-status-strip')
export class PrinterStatusStrip extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) selectedDeviceId = '';

  static styles = css`
    :host {
      display: block;
      font-size: 0.85rem;
    }

    .no-printer {
      color: var(--warning-color);
      display: flex;
      gap: 8px;
      align-items: center;
      opacity: 0.8;
    }

    .strip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .connection {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4caf50;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
      100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
    }

    .offline-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      flex-shrink: 0;
    }

    .connection-label {
      opacity: 0.7;
    }

    .divider {
      width: 1px;
      height: 16px;
      background: rgba(255, 255, 255, 0.15);
    }

    .printer-name {
      font-family: monospace;
      font-size: 0.8rem;
      opacity: 0.9;
    }

    .battery {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .battery.green { color: #4caf50; }
    .battery.amber { color: #ffa726; }
    .battery.red   { color: #ef5350; }
    .battery.grey  { color: rgba(255, 255, 255, 0.3); }

    .paper-indicator {
      display: flex;
      align-items: center;
      opacity: 1;
    }

    .paper-indicator.muted {
      opacity: 0.25;
    }
  `;

  protected render() {
    if (!this.selectedDeviceId) {
      return html`
        <div class="no-printer">
          <ha-svg-icon .path=${mdiPrinter} style="--mdc-icon-size: 16px;"></ha-svg-icon>
          No Niimbot printers discovered. You can still try printing if you have a default printer
          configured in the integration.
        </div>
      `;
    }

    const printer = getPrinters(this.hass).find((p) => p.id === this.selectedDeviceId);
    if (!printer) return nothing;

    const colorClass = batteryColorClass(printer);

    return html`
      <div class="strip">
        <div class="connection">
          ${printer.connected
            ? html`<div class="pulse-dot"></div>`
            : html`<div class="offline-dot"></div>`}
          <span class="connection-label">${printer.connected ? 'Connected' : 'Offline'}</span>
        </div>

        <div class="divider"></div>

        <ha-svg-icon .path=${mdiBluetooth} style="--mdc-icon-size: 16px; opacity: 0.6;"></ha-svg-icon>

        <div class="divider"></div>

        <span class="printer-name">${printer.name} · ${printer.mac}</span>

        <div class="divider"></div>

        <div class="battery ${colorClass}">
          <ha-svg-icon .path=${mdiBattery} style="--mdc-icon-size: 16px;"></ha-svg-icon>
          ${printer.connected && printer.batteryPct !== null
            ? html`<span>${printer.batteryPct}%</span>`
            : nothing}
        </div>

        <div class="divider"></div>

        <div class="paper-indicator ${printer.paperLoaded ? '' : 'muted'}">
          <ha-svg-icon .path=${mdiPrinter} style="--mdc-icon-size: 16px;"></ha-svg-icon>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'printer-status-strip': PrinterStatusStrip;
  }
}
