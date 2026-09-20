/**
 * The Label Templates dialog.
 *
 * The frame and the gate, and nothing else: the `gs-dialog` chrome plus the
 * one decision about whether the template path may be entered at all. Every
 * surface inside belongs to the `growspace-label-templates` chunk, which is
 * fetched only once the complete capability has been negotiated — a card
 * talking to an old backend never downloads a feature that backend cannot
 * serve, and never shows an entry point to it.
 *
 * **The frame opens before the chunk is fetched**, the same contract the TC
 * dialog is held to: a menu item that silently opens nothing for the length
 * of a network round trip is indistinguishable from a broken one, and a
 * stale-HACS failure has to be reported where the user was reaching.
 *
 * The two unhappy states are deliberately not the same screen. An
 * `incompatible` capability is the backend answering with something this card
 * cannot use, and it says so and offers nothing; it is never rewritten into
 * the Classic Path, because printing through the compatibility workflow after
 * a new operation was refused would put a differently rendered label on paper
 * and call it recovery. A missing chunk is a stale install, and says that.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiLabelOutline } from '@mdi/js';

import { localize } from '../localize/localize';
import { LAZY_CHUNKS, loadLazyChunk } from '../lib/lazy-chunk';
import type { LabelTemplateSupport } from '../slices/labels';
import '../features/shared/ui/gs-dialog';
import '../features/shared/ui/lazy-chunk-error';

type ChunkState = 'loading' | 'ready' | 'missing';

/** The bounded desktop modal the other template-sized dialogs use. */
const CONTAINER_STYLE = 'max-width: 920px; width: 100%; height: 720px; max-height: 85vh';

/**
 * The editor's own frame: a focused full-screen task mode.
 *
 * The editing-loop decision calls for one, and the reason is not aesthetic.
 * A canvas that has to share a bounded modal with the catalogue it was
 * reached from is too small to place a 0.5 mm nudge in and leaves the
 * catalogue too cramped to read, so the surface commits to one job at a time.
 */
const EDITOR_CONTAINER_STYLE = 'width: 100vw; max-width: 100vw; height: 100vh; max-height: 100vh';

@customElement('label-templates-dialog')
export class LabelTemplatesDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  /** Page-global capability state, read from `labelTemplateSupport$` by the host. */
  @property({ attribute: false }) support?: LabelTemplateSupport;
  @property({ type: String }) language = 'en';

  @state() private _chunk: ChunkState = 'loading';
  /** Whether the pane below has entered the editor and wants the whole screen. */
  @state() private _editing = false;

  static styles = css`
    :host {
      display: contents;
    }

    .content-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 16px 24px;
    }

    /* The editor draws its own chrome, so the dialog's padding would only
       shrink the paper. */
    .content-wrapper[data-editing] {
      padding: 0;
      overflow: hidden;
    }

    .supporting {
      opacity: 0.75;
      line-height: 1.45;
    }

    .compatibility {
      color: var(--error-color, #f44336);
    }

    code {
      overflow-wrap: anywhere;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this._loadChunk();
  }

  private async _loadChunk(): Promise<void> {
    // Fetched only on the supported path. An old or unreadable backend must
    // not pay for a chunk whose every surface it cannot serve.
    if (this.support?.status !== 'available') return;
    const view = await loadLazyChunk(
      LAZY_CHUNKS.labelTemplates,
      () => import('../features/labels/label-templates')
    );
    this._chunk = view ? 'ready' : 'missing';
  }

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    if (changed.has('support')) void this._loadChunk();
  }

  private _t(key: string): string {
    return localize(`labels.${key}`, '', '', this.language);
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _renderPane(): TemplateResult {
    const support = this.support;

    if (support?.status === 'incompatible') {
      return html`<p class="supporting compatibility" role="alert" data-state="incompatible">
        ${this._t('incompatible_body')} <code>${support.reason}</code>
      </p>`;
    }
    if (support?.status !== 'available') {
      // `classic` and `unknown` alike: there is no template path to show, and
      // the Classic dialogs the user already has are untouched.
      return html`<p class="supporting" data-state="classic">${this._t('classic_body')}</p>`;
    }
    if (this._chunk === 'missing') {
      return html`<growspace-lazy-chunk-error
        .chunk=${LAZY_CHUNKS.labelTemplates}
      ></growspace-lazy-chunk-error>`;
    }
    if (this._chunk === 'loading') {
      return html`<p class="supporting">${this._t('view_loading')}</p>`;
    }
    return html`<growspace-label-templates
      .capability=${support.capability}
      .language=${this.language}
      @editing=${(event: CustomEvent<{ editing: boolean }>) => {
        this._editing = event.detail.editing;
      }}
    ></growspace-label-templates>`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;

    return html`
      <gs-dialog
        .open=${true}
        .heading=${this._t('view_title')}
        .iconPath=${mdiLabelOutline}
        .containerStyle=${this._editing ? EDITOR_CONTAINER_STYLE : CONTAINER_STYLE}
        @close=${this._close}
      >
        <div class="content-wrapper" ?data-editing=${this._editing}>${this._renderPane()}</div>
      </gs-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'label-templates-dialog': LabelTemplatesDialog;
  }
}
