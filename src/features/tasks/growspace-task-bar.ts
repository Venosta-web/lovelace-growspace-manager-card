import { consume } from '@lit/context';
import { StoreController } from '@nanostores/lit';
import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { storeContext } from '../../context';
import { localizePlural, localizeWithParams } from '../../localize/localize';
import type { GrowspaceStore } from '../../store/core/growspace-store';
import type { MetricComparisonState } from '../../store/comparisons/metric-comparison-store';
import type { CardTaskState } from './task-state';

@customElement('growspace-task-bar')
export class GrowspaceTaskBar extends LitElement {
  @consume({ context: storeContext, subscribe: true })
  @property({ attribute: false })
  store!: GrowspaceStore;

  @property({ attribute: false }) taskState: CardTaskState = { kind: 'idle' };
  @property({ type: Number }) selectedCount = 0;

  @query('h2') private _heading?: HTMLHeadingElement;
  @query('[data-confirm-delete]') private _deleteConfirmationButton?: HTMLButtonElement;
  @state() private _pendingDeleteId: string | null = null;
  private _comparisonsController?: StoreController<MetricComparisonState>;

  static styles = css`
    :host {
      display: block;
      position: sticky;
      inset-block-start: 0;
      z-index: 8;
    }

    .task-bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px 20px;
      padding: 16px;
      color: var(--primary-text-color, #fff);
      background: color-mix(in srgb, var(--card-background-color, #1e1e1e) 94%, transparent);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24);
      backdrop-filter: blur(12px);
    }

    .copy {
      min-width: 0;
    }

    h2 {
      margin: 0 0 4px;
      font:
        500 1rem/1.3 Roboto,
        sans-serif;
      outline: none;
    }

    h2:focus-visible {
      border-radius: 4px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color, #4caf50) 55%, transparent);
    }

    p {
      max-width: 70ch;
      margin: 0;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font:
        400 0.875rem/1.45 Roboto,
        sans-serif;
      overflow-wrap: anywhere;
    }

    .summary {
      margin-block-start: 6px;
      color: var(--primary-text-color, #fff);
      font-weight: 500;
    }

    .actions,
    .bulk-actions,
    .comparison-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    button {
      min-height: 40px;
      padding: 0 14px;
      border: 0;
      border-radius: 20px;
      color: var(--primary-text-color, #fff);
      background: color-mix(in srgb, var(--primary-text-color, #fff) 8%, transparent);
      font:
        500 0.875rem/1 Roboto,
        sans-serif;
      cursor: pointer;
    }

    button:hover {
      background: color-mix(in srgb, var(--primary-text-color, #fff) 14%, transparent);
    }

    button:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--primary-color, #4caf50) 60%, transparent);
      outline-offset: 2px;
    }

    button.primary {
      color: var(--text-primary-color, #fff);
      background: var(--primary-color, #4caf50);
    }

    button.danger {
      color: var(--error-color, #f44336);
      border: 1px solid currentColor;
      background: transparent;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.38;
    }

    .details {
      grid-column: 1 / -1;
      display: grid;
      gap: 10px;
    }

    .comparison-list {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .comparison-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      padding-block: 8px;
      border-block-start: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    }

    .comparison-label {
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 0.875rem;
    }

    .error {
      color: var(--error-color, #f44336);
      font-size: 0.875rem;
    }

    .delete-confirmation {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px 16px;
      padding-block: 8px;
      border-block-start: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    }

    .delete-confirmation p {
      flex: 1 1 28ch;
      color: var(--primary-text-color, #fff);
    }

    @media (max-width: 600px) {
      .task-bar {
        grid-template-columns: 1fr;
      }

      .actions {
        justify-content: flex-start;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.store && !this._comparisonsController) {
      this._comparisonsController = new StoreController(this, this.store.comparisons.$state);
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has('store') && this.store && !this._comparisonsController) {
      this._comparisonsController = new StoreController(this, this.store.comparisons.$state);
    }
    if (changed.has('taskState')) {
      const previous = changed.get('taskState') as CardTaskState | undefined;
      if (previous?.kind !== this.taskState.kind) {
        this._pendingDeleteId = null;
        this._heading?.focus();
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (this.taskState.kind === 'idle') return nothing;
    const language = this.store?.ui.$language.get() ?? 'en';
    const title = localizeWithParams(`tasks.${this.taskState.kind}`, {}, language);
    const instructions = localizeWithParams(
      `tasks.${this.taskState.kind}_instructions`,
      {},
      language
    );
    const saving =
      (this.taskState.kind === 'arrange' || this.taskState.kind === 'compare') &&
      this.taskState.status === 'saving';

    return html`
      <section class="task-bar" aria-labelledby="active-task-heading">
        <div class="copy">
          <h2 id="active-task-heading" tabindex="-1">${title}</h2>
          <p>${instructions}</p>
          <p class="summary">${this._summary(language)}</p>
        </div>
        <div class="actions">
          ${this.taskState.kind === 'arrange' && this.taskState.status === 'stale'
            ? html`<button @click=${() => this._dispatch('task-reload-layout')}>
                ${localizeWithParams('tasks.reload_layout', {}, language)}
              </button>`
            : nothing}
          <button
            class="primary"
            ?disabled=${saving ||
            (this.taskState.kind === 'arrange' && this.taskState.status === 'stale')}
            @click=${() => this._dispatch('task-done')}
          >
            ${localizeWithParams('tasks.done', {}, language)}
          </button>
          <button ?disabled=${saving} @click=${() => this._dispatch('task-cancel')}>
            ${localizeWithParams('tasks.cancel', {}, language)}
          </button>
        </div>
        ${this._details(language)}
      </section>
    `;
  }

  private _summary(language: string): string {
    if (this.taskState.kind === 'arrange') {
      const moved = Object.keys(this.taskState.draft).filter((id) => {
        const original =
          this.taskState.kind === 'arrange' ? this.taskState.original[id] : undefined;
        const draft = this.taskState.kind === 'arrange' ? this.taskState.draft[id] : undefined;
        return original?.row !== draft?.row || original?.col !== draft?.col;
      }).length;
      return localizePlural('tasks.move_count', moved, {}, language);
    }
    if (this.taskState.kind === 'compare') {
      return localizePlural(
        'tasks.comparison_count',
        this.taskState.draftMetrics.length,
        {},
        language
      );
    }
    return localizePlural('tasks.selected_count', this.selectedCount, {}, language);
  }

  private _details(language: string): TemplateResult | typeof nothing {
    if (this.taskState.kind === 'compare') return this._compareDetails(language);
    if (this.taskState.kind === 'select_plants') return this._selectionDetails(language);
    if (this.taskState.kind === 'arrange' && this.taskState.error) {
      return html`<div class="details">
        <div class="error" role="alert">${this.taskState.error}</div>
      </div>`;
    }
    return nothing;
  }

  private _compareDetails(language: string): TemplateResult {
    const state = this._comparisonsController?.value;
    const comparisons = state?.comparisons ?? [];
    const saving = this.taskState.kind === 'compare' && this.taskState.status === 'saving';
    const pendingDelete = comparisons.find((comparison) => comparison.id === this._pendingDeleteId);
    return html`
      <div class="details">
        ${this.taskState.kind === 'compare' && this.taskState.error
          ? html`<div class="error" role="alert">${this.taskState.error}</div>`
          : nothing}
        <div class="comparison-actions">
          <button
            aria-pressed=${this.taskState.kind === 'compare' && !this.taskState.comparisonId}
            ?disabled=${saving}
            @click=${() => this.store.ui.beginComparisonEdit(null, [], state?.recordRevision ?? 0)}
          >
            ${localizeWithParams('tasks.new_comparison', {}, language)}
          </button>
        </div>
        ${pendingDelete
          ? html`<div
              class="delete-confirmation"
              role="group"
              aria-labelledby="delete-comparison-prompt"
            >
              <p id="delete-comparison-prompt">
                ${localizeWithParams(
                  'tasks.delete_comparison_confirmation',
                  { comparison: this.store.comparisons.labelForComparison(pendingDelete) },
                  language
                )}
              </p>
              <span class="comparison-actions">
                <button
                  data-confirm-delete
                  class="danger"
                  ?disabled=${saving}
                  @click=${() => this._confirmDelete(pendingDelete.id)}
                >
                  ${localizeWithParams('tasks.confirm_delete', {}, language)}
                </button>
                <button ?disabled=${saving} @click=${this._cancelDelete}>
                  ${localizeWithParams('tasks.keep_comparison', {}, language)}
                </button>
              </span>
            </div>`
          : nothing}
        ${comparisons.length > 0
          ? html`<ul
              class="comparison-list"
              aria-label=${localizeWithParams('tasks.comparison_list_label', {}, language)}
            >
              ${comparisons.map(
                (comparison) => html`
                  <li class="comparison-row">
                    <span class="comparison-label"
                      >${this.store.comparisons.labelForComparison(comparison)}</span
                    >
                    <span class="comparison-actions">
                      <button
                        aria-pressed=${this.taskState.kind === 'compare' &&
                        this.taskState.comparisonId === comparison.id}
                        ?disabled=${saving}
                        @click=${() =>
                          this.store.ui.beginComparisonEdit(
                            comparison.id,
                            comparison.metrics,
                            state?.recordRevision ?? 0
                          )}
                      >
                        ${localizeWithParams('tasks.edit', {}, language)}
                      </button>
                      <button
                        class="danger"
                        ?disabled=${saving}
                        @click=${() => this._requestDelete(comparison.id)}
                      >
                        ${localizeWithParams('tasks.delete', {}, language)}
                      </button>
                    </span>
                  </li>
                `
              )}
            </ul>`
          : nothing}
      </div>
    `;
  }

  private _selectionDetails(language: string): TemplateResult {
    const actions = [
      ['select-all', 'select_all'],
      ['clear-selection', 'clear_selection'],
      ['water-selected', 'water_selected'],
      ['training-selected', 'log_training'],
      ['ipm-selected', 'log_ipm'],
      ['clone-selected', 'clone_selected'],
      ['print-labels-selected', 'print_labels'],
      ['delete-selected', 'delete_selected'],
    ] as const;
    return html`<div class="details">
      <div class="bulk-actions">
        ${actions.map(
          ([event, key]) => html`
            <button
              class=${event === 'delete-selected' ? 'danger' : ''}
              ?disabled=${this.selectedCount === 0 &&
              !['select-all', 'clear-selection'].includes(event)}
              @click=${() => this._dispatch(event)}
            >
              ${localizeWithParams(`tasks.${key}`, {}, language)}
            </button>
          `
        )}
      </div>
    </div>`;
  }

  private _requestDelete(id: string): void {
    this._pendingDeleteId = id;
    void this.updateComplete.then(() => this._deleteConfirmationButton?.focus());
  }

  private _confirmDelete(id: string): void {
    this._pendingDeleteId = null;
    this._dispatch('task-delete-comparison', { id });
  }

  private _cancelDelete = (): void => {
    this._pendingDeleteId = null;
    void this.updateComplete.then(() => this._heading?.focus());
  };

  private _dispatch(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-task-bar': GrowspaceTaskBar;
  }
}
