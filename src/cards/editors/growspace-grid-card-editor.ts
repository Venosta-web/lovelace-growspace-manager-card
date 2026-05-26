import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceManagerCardConfig } from '../../lib/types/config';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';
import { computeEditorLabel } from '../../lib/editor-utils';

@customElement('growspace-grid-card-editor')
export class GrowspaceGridCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config: GrowspaceManagerCardConfig | undefined;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceManagerCardConfig): void {
    this._config = config;
  }

  willUpdate(changedProps: Map<string, unknown>) {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  static styles = css`
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
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

  render() {
    if (!this._config) return html``;

    return html`
      <div class="card-config">
        <div class="info-box">
          The Grid Card is a localized view locked to the Standard tracking interface. Environment
          headers and charts are removed.
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config) return;
    this._config = ev.detail.value;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
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
