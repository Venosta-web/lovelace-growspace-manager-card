import { LitElement, html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { GrowspaceAnalyticsCardConfig } from '../../lib/types/config';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';
import { computeEditorLabel } from '../../lib/editor-utils';
import { sharedStyles } from '../../styles/shared.styles';

@customElement('growspace-analytics-card-editor')
export class GrowspaceAnalyticsCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config!: GrowspaceAnalyticsCardConfig;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceAnalyticsCardConfig): void {
    this._config = config;
  }

  protected willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  private _computeSchema() {
    return this._gsController.filterUnavailableFields([
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
      {
        name: 'start_in_graph_wall',
        selector: { boolean: {} },
      },
    ]);
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
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        ${this._gsController.renderEmptyState(this.hass?.language)}
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="info-text">
          Enable Start in Graph Wall to reopen this card in its desktop fullscreen view after a
          dashboard reload. Exiting the Wall remains temporary until the next reload.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-analytics-card-editor': GrowspaceAnalyticsCardEditor;
  }
}
