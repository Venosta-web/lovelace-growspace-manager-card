import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type LibraryFilter = 'library' | 'active' | 'all';

@customElement('gs-filter-chips')
export class GsFilterChips extends LitElement {
  @property({ type: String }) filter: LibraryFilter = 'library';

  static styles = css`
    .library-filter-chips {
      display: flex;
      gap: 6px;
      padding: 4px 0 8px;
    }

    .filter-chip {
      padding: 4px 14px;
      border-radius: 16px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: transparent;
      color: var(--primary-text-color);
      font-size: 13px;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s;
    }

    .filter-chip.active {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color);
    }
  `;

  private static readonly OPTS: Array<{ key: LibraryFilter; label: string }> = [
    { key: 'library', label: 'Library' },
    { key: 'active', label: 'Active' },
    { key: 'all', label: 'All' },
  ];

  render() {
    return html`
      <div class="library-filter-chips">
        ${GsFilterChips.OPTS.map(
          (o) => html`
            <button
              class="filter-chip ${this.filter === o.key ? 'active' : ''}"
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('filter-changed', { detail: { filter: o.key } })
                )}
            >
              ${o.label}
            </button>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gs-filter-chips': GsFilterChips;
  }
}
