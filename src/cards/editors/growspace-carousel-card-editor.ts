import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';
import type { GrowspaceCarouselCardConfig } from '../../lib/types/config';
import { GrowspaceOptionsController } from '../../controllers/growspace-options-controller';
import { computeEditorLabel } from '../../lib/editor-utils';

@customElement('growspace-carousel-card-editor')
export class GrowspaceCarouselCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private _config: GrowspaceCarouselCardConfig | undefined;

  private _gsController = new GrowspaceOptionsController(this);

  public setConfig(config: GrowspaceCarouselCardConfig): void {
    this._config = config;
  }

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has('hass') && this.hass) {
      this._gsController.update(this.hass);
    }
  }

  private _computeSchema() {
    return [
      {
        name: 'growspaces',
        selector: {
          select: {
            multiple: true,
            custom_value: true,
            options: this._gsController.options.map((gs) => ({ label: gs.name, value: gs.id })),
          },
        },
      },
      {
        name: 'interval',
        selector: {
          number: {
            min: 5,
            max: 300,
            step: 1,
            unit_of_measurement: 'seconds',
          },
        },
      },
      {
        name: 'filter_empty',
        selector: { boolean: {} },
      },
    ];
  }

  render() {
    if (!this._config) return html``;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._computeSchema()}
        .computeLabel=${computeEditorLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
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

  static styles = css`
    ha-form {
      display: block;
      margin-bottom: 24px;
    }
  `;
}
