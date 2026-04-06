import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { CropSteeringDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import { mdiChartTimelineVariantShimmer, mdiClose, mdiWaterPercent, mdiSprout, mdiArrowUp, mdiArrowDown, mdiMinus, mdiCompassOutline } from '@mdi/js';
import '../components/ui';
import '../components/ui/gs-help-tooltip';
import type { GrowspaceStore } from '../store/core/growspace-store';

@customElement('crop-steering-dialog')
export class CropSteeringDialog extends LitElement {
    @consume({ context: hassContext, subscribe: true })
    public hass!: HomeAssistant;

    @consume({ context: storeContext, subscribe: true })
    public store!: GrowspaceStore;

    @property({ type: Boolean }) public open = false;
    @property({ attribute: false }) public dialogState: CropSteeringDialogState | undefined;
    @property({ type: String }) public growspaceName = '';

    static styles = [
        dialogStyles,
        css`
      :host {
        --ha-dialog-width-md: 95vw;
        --ha-dialog-max-width: 98vw;
        --ha-dialog-width-full: 98vw;
        --dialog-content-padding: 0;
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 16px;
      }
      .metric-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-text-color);
        margin: 8px 0;
      }
      .metric-label {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .mode-badge {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: bold;
        text-transform: capitalize;
        margin-top: 8px;
        display: inline-block;
      }
      .mode-vegetative {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }
      .mode-generative {
        background: rgba(244, 67, 54, 0.2);
        color: #F44336;
      }
      .mode-balanced {
        background: rgba(33, 150, 243, 0.2);
        color: #2196F3;
      }
      .header-actions {
        display: flex;
        gap: 8px;
      }
    `,
    ];

    private _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    private _getEntityId() {
        if (!this.dialogState?.growspaceId) return undefined;
        const gs = this.store.data.$devices.get().find(d => d.deviceId === this.dialogState?.growspaceId);
        if (!gs) return undefined;

        // Slugify exactly like metrics-utils
        const slug = gs.name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w-]+/g, '')
            .replace(/[_-]+/g, '_')
            .replace(/^[_-]+/, '')
            .replace(/[_-]+$/, '');

        return `sensor.${slug}_crop_steering`;
    }

    private _renderMetricCard(title: string, value: string, icon: string, color: string, help = '') {
        return html`
      <div class="metric-card">
        <ha-svg-icon .path=${icon} style="color: ${color}; margin-bottom: 8px;"></ha-svg-icon>
        <div class="metric-value">${value}</div>
        <div class="metric-label" style="display:flex;align-items:center;gap:4px;justify-content:center;">
          ${title}
          ${help ? html`<gs-help-tooltip .content=${help} placement="bottom" .label=${title}></gs-help-tooltip>` : ''}
        </div>
      </div>
    `;
    }

    render() {
        if (!this.open || !this.dialogState) return nothing;

        const entityId = this._getEntityId();
        const stateObj = entityId ? this.hass.states[entityId] : undefined;

        const score = stateObj ? parseFloat(stateObj.state) : NaN;
        const attrs = stateObj?.attributes || {};
        const mode = attrs.steering_mode || 'unknown';

        let trendIcon = mdiMinus;
        let trendColor = 'var(--secondary-text-color)';
        if (attrs.ec_trend === 'rising') {
            trendIcon = mdiArrowUp;
            trendColor = 'var(--error-color, #F44336)';
        } else if (attrs.ec_trend === 'falling') {
            trendIcon = mdiArrowDown;
            trendColor = 'var(--success-color, #4CAF50)';
        }

        return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="full"
      >
        <div class="glass-dialog-container">
          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiCompassOutline}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">Crop Steering Diagnostics</h2>
                <gs-help-tooltip
                  content="Real-time analysis of your irrigation strategy. Monitoring EC trend, dry-back rate, and substrate salinity changes to guide steering decisions."
                  placement="bottom"
                  label="Crop Steering"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">${this.growspaceName}</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </button>
          </div>

        <div class="dialog-content">
          ${stateObj === undefined || isNaN(score)
                ? html`
                <div style="text-align: center; padding: 40px; opacity: 0.7;">
                  <ha-svg-icon .path=${mdiChartTimelineVariantShimmer} style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"></ha-svg-icon>
                  <p>Crop steering data is currently unavailable.</p>
                  <p style="font-size: 0.85rem;">Ensure irrigation strategy is enabled and sensors are reporting data.</p>
                </div>
              `
                : html`
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">
                    <div style="font-size: 36px; font-weight: bold;">
                      ${score > 0 ? '+' : ''}${score.toFixed(2)}
                    </div>
                    <gs-help-tooltip
                      content="Crop steering score: positive values indicate generative conditions (promoting flowering), negative values indicate vegetative conditions (promoting growth). Aim for +0.5–+2.0 in late flower."
                      placement="right"
                      label="Crop Steering Score"
                    ></gs-help-tooltip>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
                    <div class="mode-badge mode-${mode}">
                      ${mode.toUpperCase()} MODE
                    </div>
                    <gs-help-tooltip
                      content="Vegetative mode drives leafy growth with smaller, more frequent irrigations. Generative mode promotes flowering and resin by allowing larger dry-backs between irrigations. Balanced is transitional."
                      placement="right"
                      label="Steering Mode"
                    ></gs-help-tooltip>
                  </div>
                </div>

                <div class="metric-grid">
                  ${this._renderMetricCard('Dry-back Event', `${attrs.dryback_percent || 0}%`, mdiWaterPercent, 'var(--primary-color)', 'The % of substrate water content lost between the last irrigation and the trough (driest point). Higher dry-back = more generative stress. Veg: 3–5%. Flower: 5–10%.')}
                  ${this._renderMetricCard('Peak VWC', `${attrs.peak_vwc || 0}%`, mdiWaterPercent, 'var(--success-color, #4CAF50)', 'Volumetric Water Content (VWC) at the highest point after irrigation. Higher peak = more vegetative. Typical range: 50–70% depending on substrate.')}
                  ${this._renderMetricCard('Trough VWC', `${attrs.trough_vwc || 0}%`, mdiWaterPercent, 'var(--warning-color, #FF9800)', 'VWC at the driest point before the next irrigation fires. Lower trough = more generative stress. Typical range: 30–50%.')}
                  ${this._renderMetricCard('EC Trend', (attrs.ec_trend || 'stable').toUpperCase(), trendIcon, trendColor, 'Whether the electrical conductivity (nutrient strength) in the substrate is rising, falling, or stable. Rising EC may indicate under-irrigation or salt build-up.')}
                </div>
                
                <p style="font-size: 0.85rem; opacity: 0.7; margin-top: 24px; text-align: center;">
                  Vegetative steering drives growth with smaller, more frequent irrigations. 
                  Generative steering promotes flowering and ripening through larger dry-backs.
                </p>
              `}
        </div>
      </ha-dialog>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'crop-steering-dialog': CropSteeringDialog;
    }
}
