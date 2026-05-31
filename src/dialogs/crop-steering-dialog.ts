import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { CropSteeringDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import {
  mdiChartTimelineVariantShimmer,
  mdiWaterPercent,
  mdiArrowUp,
  mdiArrowDown,
  mdiMinus,
  mdiCompassOutline,
} from '@mdi/js';
import '../features/shared/ui';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { activeDevices$ } from '../slices/grid';
import type { GrowspaceDevice } from '../services/types';
import {
  createInitialSM,
  transition,
  requestTabSwitch,
  discardAndSwitch,
  isActiveTabDirty,
  type DialogSM,
} from './crop-steering-dialog-sm';

@customElement('crop-steering-dialog')
export class CropSteeringDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) public open = false;
  @property({ attribute: false }) public dialogState: CropSteeringDialogState | undefined;
  @property({ type: String }) public growspaceName = '';

  @state() private _sm: DialogSM = createInitialSM();

  static styles = [
    dialogStyles,
    css`
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
        color: #4caf50;
      }
      .mode-generative {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
      .mode-balanced {
        background: rgba(33, 150, 243, 0.2);
        color: #2196f3;
      }
      .header-actions {
        display: flex;
        gap: 8px;
      }
    `,
  ];

  private _device(): GrowspaceDevice | undefined {
    if (!this.dialogState?.growspaceId) return undefined;
    return activeDevices$
      .get()
      .find((d) => d.deviceId === this.dialogState?.growspaceId);
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      const device = this._device();
      this._sm = createInitialSM(device);
    }
  }

  private _transition(event: Parameters<typeof transition>[1]) {
    this._sm = transition(this._sm, event);
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _switchTab(tab: 'diagnostics' | 'settings') {
    const device = this._device();
    if (!device) {
      this._transition({ type: 'SWITCH_TAB', tab });
      return;
    }
    if (isActiveTabDirty(this._sm, device)) {
      this._transition({ type: 'REQUEST_TAB', tab });
    } else {
      this._transition({ type: 'SWITCH_TAB', tab });
    }
  }

  private _confirmDiscard() {
    const device = this._device();
    if (!device) return;
    this._sm = discardAndSwitch(this._sm, device);
  }

  private _requestTabSwitch(tab: 'diagnostics' | 'settings') {
    const device = this._device();
    if (!device) return;
    this._sm = requestTabSwitch(this._sm, tab, device);
  }

  private _getEntityId() {
    if (!this.dialogState?.growspaceId) return undefined;
    const device = this._device();
    if (!device) return undefined;

    const slug = device.name
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
        <div
          class="metric-label"
          style="display:flex;align-items:center;gap:4px;justify-content:center;"
        >
          ${title}
          ${help
            ? html`<gs-help-tooltip
                .content=${help}
                placement="bottom"
                .label=${title}
              ></gs-help-tooltip>`
            : ''}
        </div>
      </div>
    `;
  }

  private _renderDiagnosticsTab() {
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

    if (stateObj === undefined || isNaN(score)) {
      return html`
        <div style="text-align: center; padding: 40px; opacity: 0.7;">
          <ha-svg-icon
            .path=${mdiChartTimelineVariantShimmer}
            style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"
          ></ha-svg-icon>
          <p>Crop steering data is currently unavailable.</p>
          <p style="font-size: 0.85rem;">
            Ensure irrigation strategy is enabled and sensors are reporting data.
          </p>
        </div>
      `;
    }

    return html`
      <div style="text-align: center; margin-bottom: 24px;">
        <div
          style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;"
        >
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
          <div class="mode-badge mode-${mode}">${mode.toUpperCase()} MODE</div>
          <gs-help-tooltip
            content="Vegetative mode drives leafy growth with smaller, more frequent irrigations. Generative mode promotes flowering and resin by allowing larger dry-backs between irrigations. Balanced is transitional."
            placement="right"
            label="Steering Mode"
          ></gs-help-tooltip>
        </div>
      </div>

      <div class="metric-grid">
        ${this._renderMetricCard(
          'Dry-back Event',
          `${attrs.dryback_percent || 0}%`,
          mdiWaterPercent,
          'var(--primary-color)',
          'The % of substrate water content lost between the last irrigation and the trough (driest point). Higher dry-back = more generative stress. Veg: 3–5%. Flower: 5–10%.'
        )}
        ${this._renderMetricCard(
          'Peak VWC',
          `${attrs.peak_vwc || 0}%`,
          mdiWaterPercent,
          'var(--success-color, #4CAF50)',
          'Volumetric Water Content (VWC) at the highest point after irrigation. Higher peak = more vegetative. Typical range: 50–70% depending on substrate.'
        )}
        ${this._renderMetricCard(
          'Trough VWC',
          `${attrs.trough_vwc || 0}%`,
          mdiWaterPercent,
          'var(--warning-color, #FF9800)',
          'VWC at the driest point before the next irrigation fires. Lower trough = more generative stress. Typical range: 30–50%.'
        )}
        ${this._renderMetricCard(
          'EC Trend',
          (attrs.ec_trend || 'stable').toUpperCase(),
          trendIcon,
          trendColor,
          'Whether the electrical conductivity (nutrient strength) in the substrate is rising, falling, or stable. Rising EC may indicate under-irrigation or salt build-up.'
        )}
      </div>

      <p style="font-size: 0.85rem; opacity: 0.7; margin-top: 24px; text-align: center;">
        Vegetative steering drives growth with smaller, more frequent irrigations.
        Generative steering promotes flowering and ripening through larger dry-backs.
      </p>
    `;
  }

  render() {
    if (!this.open || !this.dialogState) return nothing;

    const sm = this._sm;

    return html`
      <gs-dialog
        .open=${this.open}
        heading="Crop Steering Diagnostics"
        .subtitle=${this.growspaceName}
        .iconPath=${mdiCompassOutline}
        @close=${this._close}
      >
        <gs-help-tooltip
          slot="header-extra"
          content="Real-time analysis of your irrigation strategy. Monitoring EC trend, dry-back rate, and substrate salinity changes to guide steering decisions."
          placement="bottom"
          label="Crop Steering"
        ></gs-help-tooltip>

        <div class="dialog-content">
          ${sm.activeTab === 'diagnostics'
            ? this._renderDiagnosticsTab()
            : nothing}
        </div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'crop-steering-dialog': CropSteeringDialog;
  }
}
