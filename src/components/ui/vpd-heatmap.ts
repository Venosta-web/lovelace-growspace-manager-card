import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('vpd-heatmap')
export class VPDHeatmap extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Number }) public temperature!: number;
  @property({ type: Number }) public humidity!: number;
  @property({ type: String }) public stage: 'seedling' | 'vegetative' | 'flower' | 'late_flower' =
    'vegetative';

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: relative;
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
      }

      canvas {
        width: 100%;
        height: auto;
        border-radius: 8px;
        background: var(--card-background-color, #202020);
      }

      .current-point {
        position: absolute;
        width: 12px;
        height: 12px;
        background: white;
        border: 2px solid black;
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        z-index: 5;
        transform: translate(-50%, -50%);
      }

      .current-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        z-index: 10;
        transform: translate(8px, -50%); /* Offset to the right of the dot */
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .legend {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 8px;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .legend-color {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }
    `,
  ];

  protected firstUpdated() {
    this._drawHeatmap();
  }

  protected updated(changedProps: Map<string, any>) {
    if (changedProps.has('stage') || changedProps.has('temperature') || changedProps.has('humidity')) {
      this._drawHeatmap();
    }
  }

  private _getVPD(tempC: number, rh: number): number {
    const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const vpd = svp * (1 - rh / 100);
    return vpd;
  }

  private _getZoneColor(vpd: number, stage: string): string {
    // VPD ranges in kPa
    let min, max, optMin, optMax;

    switch (stage) {
      case 'seedling':
        optMin = 0.4;
        optMax = 0.8;
        min = 0.2;
        max = 1.0;
        break;
      case 'vegetative': // Early/Late veg
        optMin = 0.8;
        optMax = 1.1; // 0.8-1.1 kPa
        min = 0.4;
        max = 1.4;
        break;
      case 'flower': // Early flower
        optMin = 1.0;
        optMax = 1.35; // 1.0-1.35 kPa estimate
        min = 0.6;
        max = 1.6;
        break;
      case 'late_flower':
        optMin = 1.2;
        optMax = 1.55; // 1.2-1.55 kPa
        min = 0.8;
        max = 1.8;
        break;
      default:
        optMin = 0.8;
        optMax = 1.2;
        min = 0.5;
        max = 1.5;
    }

    if (vpd >= optMin && vpd <= optMax) return '#4caf50'; // Optimal (Green)
    if (vpd < min) return '#2196f3'; // Wet (Too Low - Blue)
    if (vpd > max) return '#f44336'; // Dry (Too High - Red)

    // Transitions
    return '#ff9800'; // Warning (Orange)
  }

  private _drawHeatmap() {
    const canvas = this.shadowRoot?.getElementById('vpdCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolution
    const width = (canvas.width = 400);
    const height = (canvas.height = 300);

    // Axes: Temp (X) 15C to 35C, RH (Y) 30% to 90%
    const minTemp = 15;
    const maxTemp = 35;
    const minRH = 30;
    const maxRH = 90;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Heatmap pixels
    for (let x = 0; x < width; x += 4) {
      for (let y = 0; y < height; y += 4) {
        const temp = minTemp + (x / width) * (maxTemp - minTemp);
        const rh = maxRH - (y / height) * (maxRH - minRH);

        const vpd = this._getVPD(temp, rh);
        const color = this._getZoneColor(vpd, this.stage);

        ctx.fillStyle = color;
        ctx.fillRect(x, y, 4, 4);
      }
    }

    // Draw Current Point if data exists
    if (this.temperature && this.humidity) {
      if (
        this.temperature >= minTemp &&
        this.temperature <= maxTemp &&
        this.humidity >= minRH &&
        this.humidity <= maxRH
      ) {
        const x = ((this.temperature - minTemp) / (maxTemp - minTemp)) * width;
        const y = ((maxRH - this.humidity) / (maxRH - minRH)) * height;

        // Draw dot in canvas for crispness but we also use DOM overlay for tooltip
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  render() {
    const minTemp = 15;
    const maxTemp = 35;
    const minRH = 30;
    const maxRH = 90;

    let dotX = -100;
    let dotY = -100;
    let currentVpd = 0;
    let hasPoint = false;

    if (this.temperature && this.humidity) {
      hasPoint =
        this.temperature >= minTemp &&
        this.temperature <= maxTemp &&
        this.humidity >= minRH &&
        this.humidity <= maxRH;

      if (hasPoint) {
        dotX = ((this.temperature - minTemp) / (maxTemp - minTemp)) * 100;
        dotY = ((maxRH - this.humidity) / (maxRH - minRH)) * 100;
        currentVpd = parseFloat(this._getVPD(this.temperature, this.humidity).toFixed(2));
      }
    }

    return html`
      <div style="position: relative;">
        <canvas id="vpdCanvas"></canvas>
        ${hasPoint
        ? html`
              <div class="current-point" style="left: ${dotX}%; top: ${dotY}%"></div>
              <div class="current-tooltip" style="left: ${dotX}%; top: ${dotY}%">
                ${currentVpd} kPa
              </div>
            `
        : ''}
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #2196f3"></div>
          Wet
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff9800"></div>
          Fair
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #4caf50"></div>
          Optimal
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f44336"></div>
          Dry
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vpd-heatmap': VPDHeatmap;
  }
}
