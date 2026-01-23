import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from './types';

import { HassSubscriptionController } from './controllers/hass-subscription-controller';

@customElement('growspace-manager-card-editor')
export class GrowspaceManagerCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config: GrowspaceManagerCardConfig | undefined;
  @state() private _growspaceOptions: { id: string; name: string }[] = [];

  private _subscriptionController = new HassSubscriptionController(this);
  private _hasSubscription = false;

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
    this._hasSubscription = false;
  }

  private async _subscribeToSensorUpdates() {
    if (!this.hass || this._hasSubscription) return;

    this._hasSubscription = true;
    await this._subscriptionController.subscribeEvents(
      this.hass,
      (event: unknown) => {
        const customEvent = event as { data?: { new_state?: { entity_id?: string; attributes?: { growspaces?: Record<string, unknown> } } } };
        const newState = customEvent.data?.new_state;
        if (newState?.entity_id === 'sensor.growspaces_list') {
          const gsObj = newState.attributes?.growspaces;
          if (gsObj) {
            this._growspaceOptions = Object.entries(gsObj).map(([id, name]) => ({
              id,
              name: String(name),
            }));
          } else {
            this._growspaceOptions = [];
          }
        }
      },
      'state_changed'
    );
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
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    label {
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    select {
      width: 100%;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      font-size: 1rem;
    }
  `;

  render() {
    if (!this._config) return html``;

    return html`
      <div class="card-config">
        <div class="form-group">
          <label>Initial View Mode</label>
          <select
            .value=${this._config.initial_view_mode || 'standard'}
            @change=${(e: Event) =>
        this._valueChanged('initial_view_mode', (e.target as HTMLSelectElement).value)}
          >
            <option value="standard">Standard</option>
            <option value="compact">Compact (Grid Only)</option>
            <option value="header">Header Only (Collapsed)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Default Growspace</label>
          <select
            .value=${this._config.default_growspace ?? ''}
            @change=${(e: Event) =>
        this._valueChanged('default_growspace', (e.target as HTMLSelectElement).value)}
          >
            <option value="">Select a growspace</option>
            ${this._growspaceOptions.map(
          (gs) => html`<option value="${gs.id}">${gs.name}</option>`
        )}
          </select>
        </div>

        <div class="form-group">
          <label>Keyboard Rotation (3D View)</label>
          <ha-form-switch
            .checked=${this._config.keyboard_rotate_enabled || false}
            @change=${(e: any) => this._valueChanged('keyboard_rotate_enabled', e.target.checked)}
          ></ha-form-switch>
        </div>

        <div class="form-group">
          <label>Rotation Speed (${(this._config.keyboard_rotate_speed || 1.0).toFixed(1)}x)</label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            .value=${this._config.keyboard_rotate_speed || 1.0}
            @change=${(e: any) => this._valueChanged('keyboard_rotate_speed', parseFloat(e.target.value))}
          />
        </div>
      </div>
    `;
  }

  private _valueChanged(key: string, value: unknown) {
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
