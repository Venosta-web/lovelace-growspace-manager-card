/**
 * The Tissue Culture dialog.
 *
 * The chrome and nothing else: the `gs-dialog` frame, a tab bar built from
 * `tcSurfaces(manifest)`, and a content pane holding the shared
 * `growspace-tc-view`. Every surface inside that view belongs to the
 * `growspace-tc` chunk and to the standalone card as much as to this dialog,
 * which is why none of it is reached from here except through the view's
 * property interface.
 *
 * **The frame opens before the chunk is fetched.** A menu item that silently
 * opens nothing for the length of a network round trip is indistinguishable
 * from a broken one, and a stale-HACS failure has to be reported where the user
 * was reaching — the same contract `growspace-tc-card` is already held to. So
 * the click always produces a dialog: a loading line, then the view, or
 * `<growspace-lazy-chunk-error>` in the content pane. Escape and the close
 * affordance work in all three states.
 *
 * The chunk is reached through the same memoised `LAZY_CHUNKS.tcView` the
 * standalone card uses, resolving to the same module. `loadLazyChunk` memoises
 * by chunk name, so whichever host reaches it first wins and the other gets
 * that promise — including a memoised `null`, which prints nothing, which is
 * why this dialog renders its own error rather than relying on the console.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiFlaskOutline } from '@mdi/js';

import { localize } from '../localize/localize';
import { LAZY_CHUNKS, loadLazyChunk } from '../lib/lazy-chunk';
import { tcSurfaces, type TcManifest, type TcSurfaceId } from '../slices/tc';
import {
  initialTcDialogSM,
  transition,
  type TcDialogSM,
  type TcTabId,
} from '../features/tc/tc-dialog-sm';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/lazy-chunk-error';

type ChunkState = 'loading' | 'ready' | 'missing';

/** #153's bounded desktop modal; small screens fall back to the full width. */
const CONTAINER_STYLE = 'max-width: 920px; width: 100%; height: 720px; max-height: 85vh';

@customElement('tc-dialog')
export class TcDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  /** Page-global installation state, read from `tcPresence$` by the host. */
  @property({ attribute: false }) manifest?: TcManifest;
  @property({ type: String }) language = 'en';
  @property({ type: String }) initialTab?: TcTabId;
  @property({ type: String }) scrollToField?: string;

  @state() private _sm: TcDialogSM = initialTcDialogSM('worklist');
  @state() private _chunk: ChunkState = 'loading';

  private _seeded = false;
  private _scrolled = false;

  static styles = css`
    :host {
      display: contents;
    }

    .content-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 16px 24px;
    }

    .tab-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      padding-bottom: 2px;
      flex-shrink: 0;
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      cursor: pointer;
      transition: all 0.2s;
      font-size: var(--font-size-sm);
      font-family: inherit;
    }

    .tab:hover {
      color: var(--primary-text-color, #fff);
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
    }

    .tab.active {
      color: var(--primary-color, #4caf50);
      border-bottom-color: var(--primary-color, #4caf50);
    }

    /* The pane scrolls; the header and the tab bar stay put. The view declares
       no height and no overflow of its own, which is what lets it live in an
       ha-card and in here. */
    .pane {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      --growspace-tc-view-padding: 0;
    }

    .supporting {
      opacity: 0.7;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this._loadChunk();
  }

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    // Seeded from the payload once, the way config and irrigation seed theirs.
    // A fresh element per open makes "once" the whole of the rule.
    if (!this._seeded && (changed.has('manifest') || changed.has('initialTab'))) {
      const available = tcSurfaces(this.manifest);
      if (available.length === 0) return;
      this._seeded = true;
      // An initial tab may name a surface this installation does not offer, so
      // the host clamps rather than handing the view a `surface` it cannot
      // render.
      this._sm = initialTcDialogSM(
        this.initialTab && available.includes(this.initialTab) ? this.initialTab : available[0]
      );
    }
  }

  protected updated(): void {
    if (this._chunk === 'ready' && this.scrollToField && !this._scrolled) this._scrollToField();
  }

  private async _loadChunk(): Promise<void> {
    const view = await loadLazyChunk(LAZY_CHUNKS.tcView, () => import('../features/tc/tc'));
    this._chunk = view ? 'ready' : 'missing';
  }

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private _select(tab: TcTabId): void {
    this._sm = transition(this._sm, { type: 'TabSelected', tab });
  }

  /**
   * The house shape: a plain, non-bubbling `close` on this element, which is
   * where the host's listener sits. The frame's own composed `close` reaches
   * the host too and the host's handler is idempotent — it closes the dialog
   * only while that dialog is the active one.
   */
  private _close(): void {
    this.dispatchEvent(new CustomEvent('close'));
  }

  /**
   * `ConfigDialogState`'s deep-link mechanism, reused rather than reinvented: a
   * `data-scroll-target` inside the surface that is showing, scrolled into view
   * and pulsed once. Inert when nothing matches, which is every caller today —
   * it is a hint a future opener marks a row for, not a selection.
   *
   * The config dialog hands `scrollToField` down and lets the tab that owns the
   * target run the query, because a dialog cannot pierce a shadow boundary with
   * `querySelector`. That is not available here: the shared view's interface is
   * the seam between two hosts and it grows by three things, none of them this.
   * So the search descends through the shadow roots itself, skipping hidden
   * surfaces so the marker is looked for in the tab that is showing, and the
   * pulse is animated directly rather than by adding a class whose styles would
   * have to live in the surface being pointed at. It runs once it succeeds, and
   * is inert — no throw, no timer, no tab change — when nothing matches, which
   * is every caller today.
   */
  private _scrollToField(): void {
    const target = this.scrollToField;
    if (!target) return;
    // Start inside the view's shadow root: everything it composes is in there,
    // and its light DOM is empty.
    const view = this.renderRoot.querySelector('growspace-tc-view');
    const element = view?.shadowRoot && findScrollTarget(view.shadowRoot, target);
    // Not found yet is not the same as not there: the surface fetches its own
    // rows, so the marked one may still be in flight. Looking again on the next
    // update costs a tree walk and stops of its own accord, because a dialog
    // nothing is happening in does not update.
    if (!element) return;
    this._scrolled = true;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.animate?.([{ opacity: '1' }, { opacity: '0.35' }, { opacity: '1' }], {
      duration: 900,
      iterations: 2,
    });
  }

  private _renderPane(): TemplateResult {
    if (this._chunk === 'missing') {
      return html`<growspace-lazy-chunk-error
        .chunk=${LAZY_CHUNKS.tcView}
      ></growspace-lazy-chunk-error>`;
    }
    if (this._chunk === 'loading') {
      return html`<p class="supporting">${this._t('view_loading')}</p>`;
    }
    return html`<growspace-tc-view
      .manifest=${this.manifest}
      .language=${this.language}
      .surface=${this._sm.activeTab}
    ></growspace-tc-view>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;

    const surfaces = tcSurfaces(this.manifest);

    return html`
      <gs-dialog
        .open=${true}
        .heading=${this._t('view_title')}
        .iconPath=${mdiFlaskOutline}
        .containerStyle=${CONTAINER_STYLE}
        @close=${this._close}
      >
        <div class="content-wrapper">
          ${surfaces.length
            ? html`<div class="tab-bar" role="tablist">
                ${surfaces.map(
                  (surface) => html`
                    <button
                      class="tab ${this._sm.activeTab === surface ? 'active' : ''}"
                      role="tab"
                      data-tab=${surface}
                      aria-selected=${this._sm.activeTab === surface}
                      @click=${() => this._select(surface)}
                    >
                      <span>${this._t(TAB_LABEL_KEYS[surface])}</span>
                    </button>
                  `
                )}
              </div>`
            : nothing}
          <div class="pane">${this._renderPane()}</div>
        </div>
      </gs-dialog>
    `;
  }
}

/**
 * The marked element under `root`, looking through shadow roots and past the
 * surfaces this tab is not showing. Returns nothing when the marker is absent,
 * which is the ordinary case.
 */
function findScrollTarget(root: Element | ShadowRoot, target: string): HTMLElement | null {
  const selector = `[data-scroll-target="${CSS.escape(target)}"]`;
  const direct = root.querySelector<HTMLElement>(selector);
  if (direct) return direct;
  for (const child of root.querySelectorAll('*')) {
    if (child.hasAttribute('hidden') || !child.shadowRoot) continue;
    const found = findScrollTarget(child.shadowRoot, target);
    if (found) return found;
  }
  return null;
}

/** Exhaustive by construction: a fifth surface fails to compile without a label. */
const TAB_LABEL_KEYS: Record<TcSurfaceId, string> = {
  worklist: 'tab_worklist',
  cultures: 'tab_cultures',
  media: 'tab_media',
  pairings: 'tab_pairings',
};

declare global {
  interface HTMLElementTagNameMap {
    'tc-dialog': TcDialog;
  }
}
