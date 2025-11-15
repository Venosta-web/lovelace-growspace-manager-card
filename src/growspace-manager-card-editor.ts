import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { LovelaceCardEditor } from "custom-card-helpers";
import type { GrowspaceManagerCardConfig } from "./types";

@customElement("growspace-manager-card-editor")
export class GrowspaceManagerCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: any;
  @property({ attribute: false }) private _config?: GrowspaceManagerCardConfig;
  @state() private _growspaceOptions: string[] = [];

  private _unsubStateChanged?: () => void;

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
    this._loadGrowspaces();
  }

  updated(changedProps: Map<string, any>) {
    if (changedProps.has("hass") && this.hass) {
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

  private _subscribeToSensorUpdates() {
  if (!this.hass || this._unsubStateChanged) return;

  this._unsubStateChanged = this.hass.connection.subscribeEvents(
    (event: any) => {
      const newState = event.data.new_state;
      if (newState?.entity_id === "sensor.growspaces_list") {
        if (Array.isArray(newState.attributes?.growspaces)) {
          this._growspaceOptions = newState.attributes.growspaces;
        } else {
          this._growspaceOptions = [];
        }
      }
    },
    "state_changed"
  );
}

  private _loadGrowspaces() {
    if (!this.hass) return;

    const entity = this.hass.states["sensor.growspaces_list"];
    if (entity && entity.attributes?.growspaces) {
      const gsObj = entity.attributes.growspaces;
      // Option 1: just values (friendly names)
      this._growspaceOptions = Object.values(gsObj);

      // Option 2: key/value pairs if you want IDs as the value
      // this._growspaceOptions = Object.entries(gsObj).map(([id, name]) => ({ id, name }));
    } else {
      this._growspaceOptions = [];
    }
  }

  static styles = css`
    .form-group {
      margin-bottom: 12px;
    }
    label {
      display: block;
      font-weight: bold;
      margin-bottom: 4px;
    }
    select {
      width: 100%;
      padding: 4px;
      box-sizing: border-box;
    }
  `;

  render() {
    if (!this._config) return html``;

    return html`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace ?? ""}
          @change=${(e: Event) =>
            this._valueChanged(
              "default_growspace",
              (e.target as HTMLSelectElement).value
            )}
        >
          <option value="">Select a growspace</option>
          ${this._growspaceOptions.length === 0
            ? html`<option disabled>No growspaces found</option>`
            : this._growspaceOptions.map(
                (gs) => html`<option value="${gs}">${gs}</option>`
              )}
        </select>
      </div>
    `;
  }

  private _valueChanged(key: string, value: any) {
    if (!this._config) return;
    const newConfig = { ...this._config, [key]: value };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }
}
