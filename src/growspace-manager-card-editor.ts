import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from './types';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';

@customElement('growspace-manager-card-editor')
export class GrowspaceManagerCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public accessor hass: any | undefined;
  @property({ attribute: false }) private accessor _config: GrowspaceManagerCardConfig | undefined;
  @state() private accessor _growspaceOptions: { id: string; name: string }[] = [];

  private _unsubStateChanged?: () => void;

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
    this._loadGrowspaces();
  }

  updated(changedProps: Map<string, any>) {
    if (changedProps.has('hass') && this.hass) {
      this._loadGrowspaces();
      this._subscribeToSensorUpdates();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubStateChanged) {
      this._unsubStateChanged();
      this._unsubStateChanged = undefined;
    }
  }

  private async _subscribeToSensorUpdates() {
    if (!this.hass || this._unsubStateChanged) return;

    this._unsubStateChanged = await this.hass.connection.subscribeEvents((event: any) => {
      const newState = event.data.new_state;
      if (newState?.entity_id === 'sensor.growspaces_list') {
        const gsObj = newState.attributes.growspaces;
        if (gsObj) {
          this._growspaceOptions = Object.entries(gsObj).map(([id, name]) => ({
            id,
            name: String(name),
          }));
        } else {
          this._growspaceOptions = [];
        }
      }
    }, 'state_changed');
  }

  private _loadGrowspaces() {
    if (!this.hass) return;

    const entity = this.hass.states['sensor.growspaces_list'];
    if (entity && entity.attributes?.growspaces) {
      const gsObj = entity.attributes.growspaces;
      this._growspaceOptions = Object.entries(gsObj).map(([id, name]) => ({
        id,
        name: String(name),
      }));
    } else {
      this._growspaceOptions = [];
    }
  }

  static styles = css`
    .form-group {
      margin-bottom: 12px;
    }
    md-filled-select {
      width: 100%;
    }
  `;

  render() {
    if (!this._config) return html``;

    return html`
      <div class="form-group">
        <md-filled-select
          label="Initial View Mode"
          .value=${this._config.initial_view_mode || 'standard'}
          @change=${(e: Event) =>
        this._valueChanged('initial_view_mode', (e.target as any).value)}
        >
          <md-select-option value="standard">
            <div slot="headline">Standard</div>
          </md-select-option>
          <md-select-option value="compact">
            <div slot="headline">Compact (Grid Only)</div>
          </md-select-option>
          <md-select-option value="header">
            <div slot="headline">Header Only (Collapsed)</div>
          </md-select-option>
        </md-filled-select>
      </div>

      <div class="form-group">
        <md-filled-select
          label="Default Growspace"
          .value=${this._config.default_growspace ?? ''}
          @change=${(e: Event) =>
        this._valueChanged('default_growspace', (e.target as any).value)}
        >
          <md-select-option value="">
             <div slot="headline">Select a growspace</div>
          </md-select-option>
          ${this._growspaceOptions.map(
          (gs) => html`
            <md-select-option value="${gs.id}">
                <div slot="headline">${gs.name}</div>
            </md-select-option>`
        )}
        </md-filled-select>
      </div>
    `;
  }

  private _valueChanged(key: string, value: any) {
    if (!this._config) return;
    const newConfig = { ...this._config, [key]: value };
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }
}
