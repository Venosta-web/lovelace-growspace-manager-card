import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-ai-insight-card-editor')
export class GrowspaceAiInsightCardEditor extends LitElement implements LovelaceCardEditor {
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
    if (growspaceListSensor && growspaceListSensor.attributes.growspaces) {
      const raw = growspaceListSensor.attributes.growspaces;
      if (Array.isArray(raw)) {
        this._sensorGrowspaces = raw.map((g: any) => ({ id: g.id, name: g.name || g.id }));
      } else {
        this._sensorGrowspaces = Object.entries(raw).map(([id, name]) => ({
          id,
          name: String(name) || id,
        }));
      }
    }
  }

  protected firstUpdated(): void {
    this._loadGrowspaces();
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
        margin-top: 8px;
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
          This card will provide AI insights and chat functionality targeted toward the selected
          growspace.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-ai-insight-card-editor': GrowspaceAiInsightCardEditor;
  }
}
