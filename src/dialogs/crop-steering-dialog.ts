import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { CropSteeringDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import { mdiChartTimelineVariantShimmer, mdiClose, mdiWaterPercent, mdiSprout, mdiArrowUp, mdiArrowDown, mdiMinus } from '@mdi/js';
import '../components/ui';
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
        --mdc-dialog-min-width: clamp(350px, 600px, 90vw);
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

    private _renderMetricCard(title: string, value: string, icon: string, color: string) {
        return html`
      <div class="metric-card">
        <ha-svg-icon .path=${icon} style="color: ${color}; margin-bottom: 8px;"></ha-svg-icon>
        <div class="metric-value">${value}</div>
        <div class="metric-label">${title}</div>
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
        .open=${this.open}
        @closed=${this._close}
        heading="Crop Steering"
        hideActions
      >
        <!-- Custom Header -->
        <div slot="heading" class="dialog-header">
          <div style="display: flex; flex-direction: column;">
            <h2 class="dialog-title">Crop Steering Diagnostics</h2>
            <div class="dialog-subtitle">${this.growspaceName}</div>
          </div>
          <div class="header-actions">
            <ha-icon-button
              .path=${mdiClose}
              @click=${this._close}
              title="Close"
            ></ha-icon-button>
          </div>
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
                  <div style="font-size: 36px; font-weight: bold; margin-bottom: 8px;">
                    ${score > 0 ? '+' : ''}${score.toFixed(2)}
                  </div>
                  <div class="mode-badge mode-${mode}">
                    ${mode.toUpperCase()} MODE
                  </div>
                </div>

                <div class="metric-grid">
                  ${this._renderMetricCard('Dry-back Event', `${attrs.dryback_percent || 0}%`, mdiWaterPercent, 'var(--primary-color)')}
                  ${this._renderMetricCard('Peak VWC', `${attrs.peak_vwc || 0}%`, mdiWaterPercent, 'var(--success-color, #4CAF50)')}
                  ${this._renderMetricCard('Trough VWC', `${attrs.trough_vwc || 0}%`, mdiWaterPercent, 'var(--warning-color, #FF9800)')}
                  ${this._renderMetricCard('EC Trend', (attrs.ec_trend || 'stable').toUpperCase(), trendIcon, trendColor)}
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
