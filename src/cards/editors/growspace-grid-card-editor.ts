import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';

import { HassSubscriptionController } from '../../controllers/hass-subscription-controller';

@customElement('growspace-grid-card-editor')
export class GrowspaceGridCardEditor extends LitElement implements LovelaceCardEditor {
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
    .info-box {
      background: rgba(var(--rgb-primary-color), 0.1);
      color: var(--primary-text-color);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.9rem;
      border-left: 4px solid var(--primary-color);
    }
  `;

  render() {
    if (!this._config) return html``;

    return html`
      <div class="card-config">
        <div class="info-box">
          The Grid Card is a localized view locked to the Standard tracking interface. Environment headers and charts are removed.
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

declare global {
  interface HTMLElementTagNameMap {
    'growspace-grid-card-editor': GrowspaceGridCardEditor;
  }
}
