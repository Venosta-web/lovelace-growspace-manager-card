import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { sharedStyles } from '../../styles/shared.styles';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';

@customElement('growspace-ai-insight-card-editor')
export class GrowspaceAiInsightCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: GrowspaceManagerCardConfig;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
  }

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
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
              ...this._gsController.options.map((gs) => ({ label: gs.name, value: gs.id })),
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
          .computeLabel=${(s: { name: string }) =>
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
