/**
 * Test harness for `gm-entity-picker` (ADR 0043).
 *
 * `ha-entity-picker` belongs to the Home Assistant frontend and is not loaded in
 * the test browser, so tests register a stub with the same contract: a `value`
 * property and a `value-changed` event. `pickEntity` drives that contract the
 * way the real picker does.
 *
 * The picker also needs `hass` for the entity registry. Config tabs stay
 * `hass`-free and receive it through `hassContext`, so tests wrap the element
 * under test in `test-hass-provider`.
 */

import { LitElement, html } from 'lit';
import { provide } from '@lit/context';
import { property } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import { hassContext } from '../../src/lib/context';

/**
 * Stands in for HA's picker. It paints a 56px combobox box so the responsive
 * suite measures a layout close to the real one.
 */
export class HaEntityPickerStub extends HTMLElement {
  value = '';
  includeEntities: string[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        .box {
          box-sizing: border-box;
          min-height: 56px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
      <div class="box"></div>
    `;
  }
}

class TestHassProvider extends LitElement {
  @provide({ context: hassContext })
  @property({ attribute: false })
  hass!: HomeAssistant;

  render() {
    return html`<slot></slot>`;
  }
}

if (!customElements.get('ha-entity-picker')) {
  customElements.define('ha-entity-picker', HaEntityPickerStub);
}
if (!customElements.get('test-hass-provider')) {
  customElements.define('test-hass-provider', TestHassProvider);
}

/** A `hass` carrying just the states the entity pickers read. */
export function hassWithEntities(names: Record<string, string>): HomeAssistant {
  const states = Object.fromEntries(
    Object.entries(names).map(([entityId, friendlyName]) => [
      entityId,
      { entity_id: entityId, state: 'on', attributes: { friendly_name: friendlyName } },
    ])
  );
  return { states } as unknown as HomeAssistant;
}

/** Mount `element` under a `hass` provider so its entity pickers can render. */
export async function mountWithHass<T extends HTMLElement & { updateComplete?: Promise<unknown> }>(
  element: T,
  hass: HomeAssistant
): Promise<T> {
  const provider = document.createElement('test-hass-provider');
  provider.hass = hass;
  provider.appendChild(element);
  document.body.appendChild(provider);
  await provider.updateComplete;
  await element.updateComplete;
  return element;
}

/** Pick `entityId` in the nth `gm-entity-picker` under `root`. */
export function pickEntity(root: ParentNode, entityId: string, index = 0): void {
  const picker = [...root.querySelectorAll('gm-entity-picker')][index];
  if (!picker) throw new Error(`No gm-entity-picker at index ${index}`);
  pickEntityIn(picker, entityId);
}

/** Pick `entityId` in a specific `gm-entity-picker`. */
export function pickEntityIn(picker: Element, entityId: string): void {
  const inner = picker.shadowRoot?.querySelector('ha-entity-picker') as HaEntityPickerStub | null;
  if (!inner) throw new Error('gm-entity-picker rendered no ha-entity-picker (missing hass?)');
  inner.value = entityId;
  inner.dispatchEvent(
    new CustomEvent('value-changed', {
      detail: { value: entityId },
      bubbles: true,
      composed: true,
    })
  );
}

/** The entity ids the nth `gm-entity-picker` under `root` offers. */
export function pickerOptions(root: ParentNode, index = 0): string[] {
  const picker = [...root.querySelectorAll('gm-entity-picker')][index];
  if (!picker) throw new Error(`No gm-entity-picker at index ${index}`);
  const inner = picker.shadowRoot?.querySelector('ha-entity-picker') as HaEntityPickerStub | null;
  if (!inner) throw new Error('gm-entity-picker rendered no ha-entity-picker (missing hass?)');
  return inner.includeEntities;
}

declare global {
  interface HTMLElementTagNameMap {
    'test-hass-provider': TestHassProvider;
  }
}
