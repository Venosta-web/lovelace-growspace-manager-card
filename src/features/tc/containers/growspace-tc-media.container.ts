/**
 * The Culture Medium library's container: the fetch, the editor and the
 * deletion the grower has to confirm.
 *
 * It was extracted out of `growspace-tc-view` unchanged. The view was two
 * things at once — the composition of TC's surfaces, and one of those surfaces
 * — which is exactly the shape that cannot be selected between. With the media
 * surface in a container of its own, mirroring cultures and pairings, the view
 * holds no state at all and becomes a pure function of its properties: the
 * property that lets it be mounted by two hosts which agree on nothing else.
 */

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
  type CultureMedium,
  type CultureMediumDraft,
} from '../../../slices/tc';
import '../components/growspace-tc-medium-library';
import '../components/growspace-tc-medium-form';

type Editing = { open: false } | { open: true; medium?: CultureMedium };

@customElement('growspace-tc-media')
export class GrowspaceTcMedia extends LitElement {
  @property({ type: String }) language = 'en';

  @state() private _media: CultureMedium[] = [];
  @state() private _loading = false;
  @state() private _error = '';
  @state() private _saving = false;
  @state() private _saveError = '';
  @state() private _editing: Editing = { open: false };
  @state() private _pendingDelete?: CultureMedium;

  private _unsubscribe?: () => void;

  static styles: CSSResultGroup = [
    variables,
    sharedStyles,
    css`
      :host {
        display: block;
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

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe?.();
    this._unsubscribe = cultureMedia$.subscribe((media) => {
      this._media = [...media];
    });
    // This element is rendered only where the manifest serves the feature, so
    // being connected is the whole condition for fetching — the view no longer
    // needs a latch to keep a manifest update from fetching twice.
    void this._load();
  }

  disconnectedCallback(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    super.disconnectedCallback();
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
      this._error = GrowspaceTcMedia._message(error);
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
      this._saveError = GrowspaceTcMedia._message(error);
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
      this._error = GrowspaceTcMedia._message(error);
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
    return html`
      <div>
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

declare global {
  interface HTMLElementTagNameMap {
    'growspace-tc-media': GrowspaceTcMedia;
  }
}
