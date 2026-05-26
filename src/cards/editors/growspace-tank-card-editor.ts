import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-tank-card-editor')
export class GrowspaceTankCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: GrowspaceManagerCardConfig;
  @state() private _sensorGrowspaces: { id: string; name: string }[] = [];

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
    this._loadGrowspaces();
  }

  private _loadGrowspaces(): void {
    if (!this.hass) return;

    const growspaceListSensor = this.hass.states['sensor.growspaces_list'];
    if (growspaceListSensor?.attributes.growspaces) {
      const raw = growspaceListSensor.attributes.growspaces;
      if (Array.isArray(raw)) {
        this._sensorGrowspaces = raw.map((g: any) => ({ id: g.id, name: g.name || g.id }));
      } else {
        this._sensorGrowspaces = Object.entries(raw).map(([id, name]) => ({
          id,
          name: String(name) || id,
        }));
      }
    } else {
      this._sensorGrowspaces = [];
    }
  }

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass')) {
      this._loadGrowspaces();
    }
  }

  public get _default_growspace(): string {
    return this._config?.default_growspace || '';
  }

  private _computeSchema() {
    return [
      {
        name: 'default_growspace',
        selector: {
          select: {
            options: [
              { label: 'Select a growspace...', value: '' },
              ...this._sensorGrowspaces.map((gs) => ({ label: gs.name, value: gs.id })),
            ],
          },
        },
      },
    ];
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) return;

    this._config = ev.detail.value;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  static styles: CSSResultGroup = [
    sharedStyles,
    css`
      .card-config {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .info-text {
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
    `,
  ];

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${(s: any) =>
            s.name === 'default_growspace' ? 'Target Growspace' : s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <div class="info-text">
          Displays all irrigation tanks configured for the selected growspace with live fill levels,
          depletion status, and time remaining.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tank-card-editor': GrowspaceTankCardEditor;
  }
}
