import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LovelaceCardEditor, HomeAssistant } from 'custom-card-helpers';

import { localize } from '../../localize/localize';
import { variables } from '../../styles/variables';
import type { GrowspaceTcCardConfig } from '../../lib/types/config';

/**
 * The Growspace Tissue Culture card editor.
 *
 * There is nothing to configure: the card is not scoped to a growspace, and
 * Growspace Manager TC is detected rather than selected. It exists so the
 * visual editor says that, instead of dropping the user into raw YAML with no
 * explanation — and so every registered card type keeps the editor chunk
 * `npm run validate:hacs-release` expects of it.
 */
@customElement('growspace-tc-card-editor')
export class GrowspaceTcCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  public setConfig(_config: GrowspaceTcCardConfig): void {
    // Accepted and kept as-is; this editor never emits `config-changed`.
  }

  static styles = [
    variables,
    css`
      p {
        margin: 0;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
    `,
  ];

  protected render(): TemplateResult {
    return html`<p>${localize('tc.editor_note', '', '', this.hass?.language ?? 'en')}</p>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-card-editor': GrowspaceTcCardEditor;
  }
}
