/**
 * The single entity field for config surfaces — a thin wrapper over Home
 * Assistant's own `ha-entity-picker`, which supplies friendly names, icons,
 * area context, fuzzy search and keyboard/screen-reader behaviour we would
 * otherwise hand-roll (ADR 0043).
 *
 * `options` stays the authority on what may be picked: the Config Dialog
 * already filters by domain, device class and integration platform, and the
 * picker's own `includeDomains`/`includeDeviceClasses` cannot express the
 * platform filter. `allow-custom-entity` is deliberately never set — a typed
 * value that matches no entity must not be committable.
 *
 * `hass` here is the entity registry, not growspace data, so reading it in a
 * component does not cross the store layering rule in CLAUDE.md.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import type { HomeAssistant } from 'custom-card-helpers';
import { hassContext } from '../../../context';
import { ensureEntityPicker } from './ha-entity-picker-loader';

/** Friendly name for an entity id, falling back to the id itself. */
export function entityLabel(hass: HomeAssistant | undefined, entityId: string): string {
  return hass?.states?.[entityId]?.attributes?.friendly_name || entityId;
}

@customElement('gm-entity-picker')
export class GmEntityPicker extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  @property({ attribute: false })
  hass?: HomeAssistant;

  @property() label = '';
  @property() value = '';
  /** The entity ids that may be picked; already filtered by the caller. */
  @property({ attribute: false }) options: string[] = [];
  @property({ type: Boolean }) disabled = false;
  /** Clear the field after a pick — used by the multi-select's add affordance. */
  @property({ type: Boolean, attribute: 'clear-on-pick' }) clearOnPick = false;

  @state() private _ready = customElements.get('ha-entity-picker') !== undefined;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    ha-entity-picker {
      display: block;
      width: 100%;
      /* A registered ha-entity-picker can still throw on its own first render
         (a lazily-loaded-chunk race distinct from the registration this._ready
         already waits for — see ADR 0043 and #673), leaving its shadow root
         empty. This floor keeps the field visible and holds its layout slot
         until a later hass update lets it retry and succeed. */
      min-height: 44px;
    }

    .loading {
      min-height: 44px;
      padding: 12px 0;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 1rem;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._ready) {
      void ensureEntityPicker().then(() => {
        this._ready = true;
      });
    }
  }

  render(): TemplateResult | typeof nothing {
    if (!this.hass) return nothing;
    if (!this._ready) return html`<div class="loading">${this.label}…</div>`;
    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        .includeEntities=${this.options}
        .disabled=${this.disabled}
        @value-changed=${this._picked}
      ></ha-entity-picker>
    `;
  }

  private _picked(event: CustomEvent<{ value?: string }>): void {
    event.stopPropagation();
    const picked = event.detail.value ?? '';
    if (this.clearOnPick) {
      // The binding is already '' here, so Lit would not reset the picker's own
      // value — clear the element directly.
      (event.target as { value?: string }).value = '';
    } else {
      this.value = picked;
    }
    this.dispatchEvent(
      new CustomEvent<string>('entity-picked', {
        detail: picked,
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gm-entity-picker': GmEntityPicker;
  }
}
