import { fixture } from '@open-wc/testing-helpers';

/**
 * A stand-in for Home Assistant's `hui-card`, reduced to its visibility half.
 *
 * Cards are mounted directly in these tests, which is precisely why a whole
 * class of bug is invisible to them: the flag that decides whether a card is
 * shown does not live on the card. `hui-card` reads `hidden` off the element it
 * built and caches the answer, so a card that reveals itself out of band — an
 * async probe, a lazily resolved integration — can be visible on its own terms
 * and still collapsed on the dashboard (workspace#146).
 *
 * Transcribed from `src/panels/lovelace/cards/hui-card.ts` at frontend
 * 20260729.7, keeping only `_loadElement`, `_updateVisibility` and
 * `_setElementVisibility` and the paths through them that a custom card can
 * reach. Conditional `visibility`, preview mode, grid options and error cards
 * are all left out: they gate the same two methods, and reproducing them would
 * make the double this asserts against harder to trust rather than easier.
 *
 * What must stay faithful is the timing, because that is the bug:
 *
 * - the element's own `hidden` is read only when the wrapper is handed a new
 *   `hass`, or when the element says so with `card-visibility-changed`;
 * - a hidden card is *removed* from the wrapper's DOM, and a card that becomes
 *   visible again is appended back.
 */
export class FakeHuiCard extends HTMLElement {
  public config?: { type: string };

  private _hass?: unknown;
  private _element?: HTMLElement & { hass?: unknown; setConfig?: (config: unknown) => void };

  /** Every `hass` the wrapper has been handed, as `hui-card.update()` sees it. */
  public set hass(hass: unknown) {
    this._hass = hass;
    if (this._element) this._element.hass = hass;
    this._updateVisibility();
  }

  public get hass(): unknown {
    return this._hass;
  }

  public get element(): HTMLElement | undefined {
    return this._element;
  }

  /** `hui-card.load()` — build the card element and adopt it. */
  public load(): void {
    if (!this.config) throw new Error('Cannot build card without config');
    const element = document.createElement(
      this.config.type.replace(/^custom:/, '')
    ) as HTMLElement & { hass?: unknown; setConfig?: (config: unknown) => void };
    element.setConfig?.(this.config);
    this._element = element;
    if (this._hass) element.hass = this._hass;
    element.addEventListener('card-visibility-changed', (ev: Event) => {
      ev.stopPropagation();
      this._updateVisibility();
    });
    this._updateVisibility();
  }

  private _updateVisibility(): void {
    if (!this._element || !this._hass) return;
    this._setElementVisibility(!this._element.hidden);
  }

  private _setElementVisibility(visible: boolean): void {
    if (!this._element) return;
    if (this.hidden !== !visible) {
      this.style.setProperty('display', visible ? '' : 'none');
      this.toggleAttribute('hidden', !visible);
    }
    if (!visible && this._element.parentElement) {
      this.removeChild(this._element);
    } else if (visible && !this._element.parentElement) {
      this.appendChild(this._element);
    }
  }
}

if (!customElements.get('fake-hui-card')) {
  customElements.define('fake-hui-card', FakeHuiCard);
}

/**
 * Mount a card the way a dashboard does: inside the wrapper, handed exactly one
 * `hass`, and then left alone.
 *
 * The last part is the test. An idle instance sends nothing more once the page
 * has settled, so anything the card needs in order to become visible it has to
 * cause itself — assigning `hass` a second time here would paper over the bug
 * the same way a busy dashboard does.
 */
export async function mountInHuiCard(type: string, hass: unknown): Promise<FakeHuiCard> {
  const wrapper = await fixture<FakeHuiCard>('<fake-hui-card></fake-hui-card>');
  wrapper.config = { type };
  wrapper.hass = hass;
  wrapper.load();
  return wrapper;
}
