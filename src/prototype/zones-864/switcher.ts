/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Floating bottom bar: ← variant →, plus the scenario the fixture renders.
 * Arrow keys cycle variants unless a text field has focus.
 */
import { LitElement, css, html } from 'lit';
import { SCENARIOS, type Scenario } from './fixture';
import { VARIANTS, bind, set, ui } from './store';

class ZpSwitcher extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      left: 50%;
      bottom: 14px;
      transform: translateX(-50%);
      z-index: 100000;
      font:
        13px/1.2 system-ui,
        sans-serif;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 999px;
      background: #fff;
      color: #111;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
      border: 2px solid #ff1f8e;
    }
    button {
      all: unset;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #111;
      color: #fff;
      font-size: 15px;
    }
    .label {
      min-width: 190px;
      text-align: center;
      font-weight: 700;
    }
    .tag {
      font-weight: 800;
      color: #ff1f8e;
      letter-spacing: 0.04em;
      font-size: 11px;
    }
    select {
      font: inherit;
      padding: 4px 6px;
      border-radius: 8px;
      border: 1px solid #bbb;
      background: #f4f4f4;
      color: #111;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    bind(this);
    window.addEventListener('keydown', this._onKey);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKey);
    super.disconnectedCallback();
  }

  private _onKey = (e: KeyboardEvent) => {
    const t = e.composedPath()[0] as HTMLElement | undefined;
    if (
      t &&
      (t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        t.isContentEditable)
    )
      return;
    if (e.key === 'ArrowLeft') this._cycle(-1);
    if (e.key === 'ArrowRight') this._cycle(1);
  };

  private _cycle(d: number) {
    const i = VARIANTS.findIndex((v) => v.key === ui.variant);
    const next = VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length];
    set({ variant: next.key, editing: false, selectedAttempt: null, scope: 'tent' });
  }

  render() {
    const v = VARIANTS.find((x) => x.key === ui.variant)!;
    return html`<div class="bar">
      <span class="tag">PROTOTYPE #864</span>
      <button title="Previous variant" @click=${() => this._cycle(-1)}>←</button>
      <span class="label">${v.key} (${v.label})</span>
      <button title="Next variant" @click=${() => this._cycle(1)}>→</button>
      <select
        title="Scenario"
        @change=${(e: Event) =>
          set({
            scenario: (e.target as HTMLSelectElement).value as Scenario,
            scope: 'tent',
            cells: {},
            extraZones: [],
            selectedAttempt: null,
          })}
      >
        ${SCENARIOS.map(
          (s) => html`<option value=${s.key} ?selected=${s.key === ui.scenario}>${s.label}</option>`
        )}
      </select>
    </div>`;
  }
}

if (!customElements.get('zp-switcher')) customElements.define('zp-switcher', ZpSwitcher);

export function mountSwitcher() {
  if (document.querySelector('zp-switcher')) return;
  document.body.appendChild(document.createElement('zp-switcher'));
}
