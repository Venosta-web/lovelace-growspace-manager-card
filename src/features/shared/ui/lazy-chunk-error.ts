import { LitElement, html, css, TemplateResult, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiAlertCircleOutline } from '@mdi/js';

import { LazyChunk, lazyChunkMessage } from '../../../lib/lazy-chunk';
import { variables } from '../../../styles/variables';

/**
 * `<growspace-lazy-chunk-error>` — what a surface renders in place of a feature
 * whose chunk could not be loaded.
 *
 * It is part of the eager graph on purpose: the whole point is to be there when
 * the lazily loaded half of the card is not. It also stands in for a Lovelace
 * card editor, which is why it answers `setConfig`.
 */
@customElement('growspace-lazy-chunk-error')
export class GrowspaceLazyChunkError extends LitElement {
  /** The chunk that failed. Nothing renders while this is null. */
  @property({ attribute: false }) chunk: LazyChunk | null = null;

  static styles: CSSResultGroup = [
    variables,
    css`
      :host {
        display: block;
      }
      .lazy-chunk-error {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm);
        color: var(--error-color);
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        border-radius: var(--border-radius-md);
        padding: var(--spacing-md);
        margin: var(--spacing-md) 0;
        font-size: var(--font-size-sm);
        line-height: 1.4;
      }
      svg {
        flex: none;
        width: 20px;
        height: 20px;
        fill: currentColor;
      }
    `,
  ];

  protected render(): TemplateResult | typeof nothing {
    if (!this.chunk) return nothing;

    return html`
      <div class="lazy-chunk-error" role="alert">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${mdiAlertCircleOutline}"></path></svg>
        <span>${lazyChunkMessage(this.chunk)}</span>
      </div>
    `;
  }

  /** Lovelace calls this on a card editor; there is nothing to configure. */
  public setConfig(): void {}
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-lazy-chunk-error': GrowspaceLazyChunkError;
  }
}

/** A stand-in editor element for a card whose editor chunk is missing. */
export function lazyChunkErrorEditor(chunk: LazyChunk): GrowspaceLazyChunkError {
  const el = document.createElement('growspace-lazy-chunk-error');
  el.chunk = chunk;
  return el;
}
