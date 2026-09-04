import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { variables } from '../../../styles/variables';
import { sharedStyles } from '../../../styles/shared.styles';
import {
  createCultureMedium,
  cultureMedia$,
  deleteCultureMedium,
  fetchCultureMedia,
  updateCultureMedium,
  TC_FEATURE_CULTURE_MEDIA,
  type CultureMedium,
  type CultureMediumDraft,
  type TcManifest,
} from '../../../slices/tc';
import '../components/growspace-tc-medium-library';
import '../components/growspace-tc-medium-form';

type Editing = { open: false } | { open: true; medium?: CultureMedium };

/**
 * The tissue-culture view.
 *
 * It holds the Culture Medium library today; the remaining V1 model tickets add
 * the due/overdue worklist, the culture board and the pairing editor around it.
 * What it proves is the whole load path — the presence probe answered, the
 * chunk was fetched, and the surface rendered inside a card that ships no TC
 * code in its entry bundle.
 *
 * Every surface is gated on a manifest feature rather than on the installed
 * release: a TC that predates the medium library answers the presence probe
 * perfectly well, and the honest response to that is a view without a library,
 * not a library whose every call fails.
 */
@customElement('growspace-tc-view')
export class GrowspaceTcView extends LitElement {
  @property({ attribute: false }) manifest?: TcManifest;
  @property({ type: String }) language = 'en';

  @state() private _media: CultureMedium[] = [];
  @state() private _loading = false;
  @state() private _error = '';
  @state() private _saving = false;
  @state() private _saveError = '';
  @state() private _editing: Editing = { open: false };
  @state() private _pendingDelete?: CultureMedium;

  private _unsubscribe?: () => void;
  private _requested = false;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
        padding: 16px;
      }

      .state {
        padding: 24px 16px;
        text-align: center;
      }

      h3 {
        margin: 0 0 4px;
      }

      .supporting {
        opacity: 0.7;
      }

      .error {
        color: var(--error-color, #f44336);
      }

      .confirm {
        border: 1px solid var(--error-color, #f44336);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .confirm p {
        margin: 0 0 8px;
      }

      .confirm-buttons {
        display: flex;
        gap: 8px;
      }

      button {
        font: inherit;
        color: inherit;
        background: none;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        padding: 6px 14px;
        min-height: 36px;
        cursor: pointer;
      }
    `,
  ];

  private get _hasMediumLibrary(): boolean {
    return this.manifest?.features.includes(TC_FEATURE_CULTURE_MEDIA) ?? false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = cultureMedia$.subscribe((media) => {
      this._media = [...media];
    });
  }

  disconnectedCallback(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    super.disconnectedCallback();
  }

  protected updated(changed: Map<string | number | symbol, unknown>): void {
    // Driven by the manifest rather than by the first render: the card sets
    // `.manifest` once the presence probe answers, and a view that fetched in
    // `firstUpdated` would decide against a manifest it did not have yet.
    if (changed.has('manifest') && this._hasMediumLibrary && !this._requested) {
      this._requested = true;
      void this._load();
    }
  }

  private _t(key: string): string {
    return localize(`tc.${key}`, '', '', this.language);
  }

  private static _message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async _load(): Promise<void> {
    this._loading = true;
    this._error = '';
    try {
      await fetchCultureMedia();
    } catch (error) {
      this._error = GrowspaceTcView._message(error);
    } finally {
      this._loading = false;
    }
  }

  private _startCreate(): void {
    this._saveError = '';
    this._editing = { open: true };
  }

  private _startEdit(event: CustomEvent<{ id: string }>): void {
    const medium = this._media.find((entry) => entry.id === event.detail.id);
    if (!medium) return;
    this._saveError = '';
    this._editing = { open: true, medium };
  }

  private _cancelEdit(): void {
    this._editing = { open: false };
    this._saveError = '';
  }

  private async _save(
    event: CustomEvent<{ id?: string; draft: CultureMediumDraft }>
  ): Promise<void> {
    const { id, draft } = event.detail;
    this._saving = true;
    this._saveError = '';
    try {
      if (id) {
        await updateCultureMedium(id, draft);
      } else {
        await createCultureMedium(draft);
      }
      this._editing = { open: false };
    } catch (error) {
      // The form stays open holding the draft: the backend rejected a value,
      // and throwing the grower's typing away would be the second failure.
      this._saveError = GrowspaceTcView._message(error);
    } finally {
      this._saving = false;
    }
  }

  private _askToDelete(event: CustomEvent<{ id: string }>): void {
    this._pendingDelete = this._media.find((entry) => entry.id === event.detail.id);
  }

  private async _confirmDelete(): Promise<void> {
    const medium = this._pendingDelete;
    if (!medium) return;
    this._pendingDelete = undefined;
    try {
      await deleteCultureMedium(medium.id);
      if (this._editing.open && this._editing.medium?.id === medium.id) {
        this._editing = { open: false };
      }
    } catch (error) {
      this._error = GrowspaceTcView._message(error);
    }
  }

  /**
   * Deleting a medium takes its whole version history with it, so the prompt
   * says so and counts the versions rather than asking "are you sure?".
   */
  private _renderDeleteConfirmation(medium: CultureMedium): TemplateResult {
    return html`
      <div class="confirm" role="alertdialog" aria-label=${this._t('medium_delete')}>
        <p>
          ${localizeWithParams(
            'tc.medium_delete_confirm',
            { name: medium.name, count: medium.versions.length },
            this.language
          )}
        </p>
        <div class="confirm-buttons">
          <button @click=${() => (this._pendingDelete = undefined)}>
            ${this._t('medium_cancel')}
          </button>
          <button @click=${this._confirmDelete}>${this._t('medium_delete')}</button>
        </div>
      </div>
    `;
  }

  protected render(): TemplateResult {
    if (!this._hasMediumLibrary) {
      return html`
        <div class="state" role="region" aria-label=${this._t('view_title')}>
          <h3>${this._t('empty_title')}</h3>
          <p class="supporting">${this._t('empty_body')}</p>
        </div>
      `;
    }

    return html`
      <div role="region" aria-label=${this._t('view_title')}>
        ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
        ${this._pendingDelete ? this._renderDeleteConfirmation(this._pendingDelete) : nothing}
        ${this._editing.open
          ? html`<growspace-tc-medium-form
              .medium=${this._editing.medium}
              .saving=${this._saving}
              .error=${this._saveError}
              .language=${this.language}
              @medium-save-requested=${this._save}
              @medium-cancel-requested=${this._cancelEdit}
            ></growspace-tc-medium-form>`
          : html`<growspace-tc-medium-library
              .media=${this._media}
              .language=${this.language}
              @medium-create-requested=${this._startCreate}
              @medium-edit-requested=${this._startEdit}
              @medium-delete-requested=${this._askToDelete}
            ></growspace-tc-medium-library>`}
        ${this._loading ? html`<p class="supporting">${this._t('medium_loading')}</p>` : nothing}
      </div>
    `;
  }
}
