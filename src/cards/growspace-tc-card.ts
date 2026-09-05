import { LitElement, html, css, nothing, type CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';

import { setHass } from '../services/hass-call';
import { detectTc, type TcPresence } from '../slices/tc';
import { LAZY_CHUNKS, loadLazyChunk } from '../lib/lazy-chunk';
import { lazyChunkErrorEditor } from '../features/shared/ui/lazy-chunk-error';
import '../features/shared/ui/lazy-chunk-error';
import type { GrowspaceTcCardConfig } from '../lib/types/config';

/**
 * The tissue-culture card.
 *
 * A thin host in the entry bundle: it probes for Growspace Manager TC, and only
 * once that probe answers does it fetch the `growspace-tc` chunk that holds the
 * view (TC ADR-0003). Everything else it does is disappear — a dashboard whose
 * TC integration is absent, removed or unloaded gets no TC markup and no
 * further requests.
 *
 * A missing chunk is not the same as a missing integration and is not hidden:
 * the user has TC, and a HACS install serving a stale chunk set has to say so.
 */
@customElement('growspace-tc-card')
export class GrowspaceTcCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _presence: TcPresence = { status: 'unknown' };
  @state() private _viewMissing = false;

  private _chunk?: Promise<unknown>;

  static styles: CSSResultGroup = css`
    :host([hidden]) {
      display: none;
    }
  `;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    const editor = await loadLazyChunk(
      LAZY_CHUNKS.tcCardEditor,
      () => import('./editors/growspace-tc-card-editor.js')
    );
    if (!editor) {
      return lazyChunkErrorEditor(LAZY_CHUNKS.tcCardEditor) as unknown as LovelaceCardEditor;
    }
    return document.createElement('growspace-tc-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Partial<GrowspaceTcCardConfig> {
    return { type: 'custom:growspace-tc-card' };
  }

  public setConfig(config: GrowspaceTcCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    // Nothing is configurable yet: the view is not scoped to a growspace, and
    // TC is detected rather than selected. Validate and drop it rather than
    // hold a field that nothing reads.
  }

  /**
   * Zero until TC has answered.
   *
   * Home Assistant asks for the size before the probe resolves, and a card that
   * claimed rows it will never fill would leave a hole in the dashboard of
   * every user who does not run TC.
   */
  public getCardSize(): number {
    return this._presence.status === 'present' ? 4 : 0;
  }

  protected firstUpdated(): void {
    if (this.hass) setHass(this.hass);
    void this._detect();
  }

  protected updated(changedProps: Map<string | number | symbol, unknown>): void {
    if (changedProps.has('hass') && this.hass) setHass(this.hass);
    // Hiding is an attribute rather than a render branch so that Home
    // Assistant's own layout collapses the slot instead of reserving space
    // around an empty element.
    const hide = this._presence.status !== 'present';
    if (this.hasAttribute('hidden') !== hide) {
      this.toggleAttribute('hidden', hide);
      this._announceVisibility(!hide);
    }
  }

  /**
   * Tell the wrapper that the flag it caches has moved.
   *
   * `hui-card` reads the card's own `hidden` off the element and then keeps
   * that answer until its own `hass`, `config` or `preview` changes. A card
   * that reveals itself out of band — which is exactly what an async probe
   * does — leaves the wrapper holding a stale `true`, and on an idle dashboard
   * nothing arrives to refresh it: the whole TC surface stays collapsed until
   * some unrelated entity happens to change state.
   *
   * `card-visibility-changed` is the event Home Assistant provides for this.
   * `hui-card` subscribes to it on every card element it builds and responds by
   * re-reading the flag, which is all this needs — no rebuild, and the memoised
   * probe is not asked again.
   */
  private _announceVisibility(value: boolean): void {
    this.dispatchEvent(
      new CustomEvent('card-visibility-changed', {
        detail: { value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _detect(): Promise<void> {
    const presence = await detectTc();
    if (presence.status === 'present') {
      // Fetched here, after the answer — this import is the only reference to
      // the TC chunk, so nothing pulls it into the entry bundle.
      const view = await (this._chunk ??= loadLazyChunk(
        LAZY_CHUNKS.tcView,
        () => import('../features/tc/tc')
      ));
      // Without the chunk `<growspace-tc-view>` stays an undefined element: an
      // empty card where the worklist was, and nothing said about why.
      if (!view) this._viewMissing = true;
    }
    this._presence = presence;
  }

  protected render() {
    if (this._presence.status !== 'present') return nothing;

    return html`
      <ha-card>
        ${this._viewMissing
          ? html`<growspace-lazy-chunk-error
              .chunk=${LAZY_CHUNKS.tcView}
            ></growspace-lazy-chunk-error>`
          : html`<growspace-tc-view
              .manifest=${this._presence.manifest}
              .language=${this.hass?.language ?? 'en'}
            ></growspace-tc-view>`}
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-card': GrowspaceTcCard;
  }
}
