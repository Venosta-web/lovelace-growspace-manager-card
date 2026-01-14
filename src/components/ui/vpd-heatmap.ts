import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('vpd-heatmap')
export class VPDHeatmap extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ type: Number }) public temperature!: number;
    @property({ type: Number }) public humidity!: number;
    @property({ type: String }) public stage: 'seedling' | 'vegetative' | 'flower' | 'late_flower' = 'vegetative';

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
        transform: translate(-50%, 50%); /* Adjust for bottom-left origin coordinate system mapping needed */
        pointer-events: none;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
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
    `
    ];

    protected firstUpdated() {
        this._drawHeatmap();
    }

    protected updated(changedProps: Map<string, any>) {
        if (changedProps.has('stage')) {
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
                optMin = 0.4; optMax = 0.8;
                min = 0.2; max = 1.0;
                break;
            case 'vegetative': // Early/Late veg
                optMin = 0.8; optMax = 1.1; // 0.8-1.1 kPa
                min = 0.4; max = 1.4;
                break;
            case 'flower': // Early flower
                optMin = 1.0; optMax = 1.35; // 1.0-1.35 kPa estimate
                min = 0.6; max = 1.6;
                break;
            case 'late_flower':
                optMin = 1.2; optMax = 1.55; // 1.2-1.55 kPa
                min = 0.8; max = 1.8;
                break;
            default:
                optMin = 0.8; optMax = 1.2;
                min = 0.5; max = 1.5;
        }

        if (vpd >= optMin && vpd <= optMax) return '#4caf50'; // Optimal (Green)
        if (vpd < min) return '#2196f3'; // Too Low (Blue/Wet)
        if (vpd > max) return '#f44336'; // Too High (Red/Dry)

        // Transitions
        if (vpd < optMin) return '#ff9800'; // Low-Warning (Orange)
        if (vpd > optMax) return '#ff9800'; // High-Warning (Orange)

        return '#9e9e9e';
    }

    private _drawHeatmap() {
        const canvas = this.shadowRoot?.getElementById('vpdCanvas') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resolution
        const width = canvas.width = 400;
        const height = canvas.height = 300;

        // Axes: Temp (X) 15C to 35C, RH (Y) 30% to 90%
        const minTemp = 15, maxTemp = 35;
        const minRH = 30, maxRH = 90;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Grid size for pixels
        const stepX = width / (maxTemp - minTemp);
        const stepY = height / (maxRH - minRH);

        // Draw Heatmap pixels
        for (let x = 0; x < width; x += 4) { // Optimization: 4px blocks
            for (let y = 0; y < height; y += 4) {
                // Map pixel to Temp/RH
                // x=0 -> minTemp, x=width -> maxTemp
                const temp = minTemp + (x / width) * (maxTemp - minTemp);
                // y=0 -> maxRH, y=height -> minRH (Canvas Y is inverted relative to standard cartesian chart usually)
                // Let's make Y=height be minRH (bottom), Y=0 be maxRH (top)
                const rh = maxRH - (y / height) * (maxRH - minRH);

                const vpd = this._getVPD(temp, rh);
                const color = this._getZoneColor(vpd, this.stage);

                ctx.fillStyle = color;
                ctx.fillRect(x, y, 4, 4);
            }
        }

        // Draw Current Point if data exists
        if (this.temperature && this.humidity) {
            if (this.temperature >= minTemp && this.temperature <= maxTemp &&
                this.humidity >= minRH && this.humidity <= maxRH) {

                const x = ((this.temperature - minTemp) / (maxTemp - minTemp)) * width;
                const y = ((maxRH - this.humidity) / (maxRH - minRH)) * height;

                // Draw dot
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
        return html`
      <canvas id="vpdCanvas"></canvas>
      <div class="legend">
        <div class="legend-item"><div class="legend-color" style="background: #2196f3"></div>Wet</div>
        <div class="legend-item"><div class="legend-color" style="background: #ff9800"></div>Fair</div>
        <div class="legend-item"><div class="legend-color" style="background: #4caf50"></div>Optimal</div>
        <div class="legend-item"><div class="legend-color" style="background: #f44336"></div>Dry</div>
      </div>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'vpd-heatmap': VPDHeatmap;
    }
}
