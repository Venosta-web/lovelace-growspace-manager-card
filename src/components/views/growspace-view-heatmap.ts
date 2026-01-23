import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GrowspaceDevice } from '../../types';
import '../growspace-header';
import '../heatmap-3d';

/**
 * Wrapper view for the 3D Heatmap that includes the growspace header.
 * This follows the pattern of other view components (header, standard, compact).
 */
@customElement('growspace-view-heatmap')
export class GrowspaceViewHeatmap extends LitElement {
    @property({ attribute: false }) device?: GrowspaceDevice;
    @property({ attribute: false }) hass?: any;
    @property({ attribute: false }) growspaceOptions: Record<string, string> = {};
    @property({ type: Boolean }) editMode3DCords = false;

    static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    growspace-header {
      flex-shrink: 0;
    }

    heatmap-3d {
      flex: 1;
      min-height: 0;
    }
  `;

    private _handleEditModeChange(e: CustomEvent) {
        this.editMode3DCords = e.detail.enabled;
    }

    private _handleSensorPositionChanged(e: CustomEvent) {
        // Bubble the event up for parent components to handle persistence
        this.dispatchEvent(
            new CustomEvent('sensor-position-changed', {
                detail: e.detail,
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        if (!this.device) return html``;

        return html`
      <growspace-header
        .device=${this.device}
        .growspaceOptions=${this.growspaceOptions}
      ></growspace-header>

      <heatmap-3d
        .device=${this.device}
        .hass=${this.hass}
        .editMode3DCords=${this.editMode3DCords}
        @edit-mode-changed=${this._handleEditModeChange}
        @sensor-position-changed=${this._handleSensorPositionChanged}
      ></heatmap-3d>
    `;
    }
}
