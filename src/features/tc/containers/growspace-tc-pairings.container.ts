import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { localize } from '../../../localize/localize';
import { fetchStrainLibrary, strainLibrary$ } from '../../../slices/strain';
import {
  cultureMedia$,
  pairings$,
  fetchPairings,
  savePairing,
  deletePairing,
  phenotypeOptions,
  type Pairing,
  type PairingDraft,
  type CultureMedium,
  type PhenotypeOption,
} from '../../../slices/tc';
import '../components/growspace-tc-pairing-editor';

@customElement('growspace-tc-pairings')
export class GrowspaceTcPairings extends LitElement {
  @property({ type: String }) language = 'en';
  @state() private _pairings: Pairing[] = [];
  @state() private _media: CultureMedium[] = [];
  @state() private _phenotypes: PhenotypeOption[] = [];
  @state() private _libraryLoaded = false;
  @state() private _loading = true;
  @state() private _loadError = '';
  @state() private _error = '';
  @state() private _saving = false;
  private _unsubscribe: Array<() => void> = [];

  connectedCallback(): void {
    super.connectedCallback();
    this._unsubscribe = [
      pairings$.subscribe((rows) => (this._pairings = [...rows])),
      cultureMedia$.subscribe((rows) => (this._media = [...rows])),
      strainLibrary$.subscribe((rows) => (this._phenotypes = phenotypeOptions([...rows]))),
    ];
    void this._load();
  }
  disconnectedCallback(): void {
    this._unsubscribe.forEach((unsubscribe) => unsubscribe());
    super.disconnectedCallback();
  }

  private async _load(): Promise<void> {
    this._loading = true;
    this._loadError = '';
    this._libraryLoaded = false;
    const results = await Promise.allSettled([fetchPairings(), fetchStrainLibrary()]);
    this._libraryLoaded = results[1].status === 'fulfilled';
    this._loadError = results
      .filter((result) => result.status === 'rejected')
      .map((result) => String(result.reason))
      .join(' ');
    this._loading = false;
  }

  private async _mutate(action: () => Promise<unknown>): Promise<void> {
    if (this._saving) return;
    this._saving = true;
    this._error = '';
    try {
      await action();
      this.shadowRoot?.querySelector('growspace-tc-pairing-editor')?.finishEditing();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._saving = false;
    }
  }

  protected render(): TemplateResult {
    return html` ${this._loading
        ? html`<p role="status">${localize('tc.pairing_loading', '', '', this.language)}</p>`
        : nothing}
      ${this._loadError
        ? html`<p role="alert">${this._loadError}</p>
            <button @click=${this._load}>
              ${localize('tc.pairing_retry', '', '', this.language)}
            </button>`
        : nothing}
      <growspace-tc-pairing-editor
        .pairings=${this._pairings}
        .media=${this._media}
        .phenotypes=${this._phenotypes}
        .libraryLoaded=${this._libraryLoaded}
        .saving=${this._saving}
        .error=${this._error}
        .language=${this.language}
        @pairing-save-requested=${(event: CustomEvent<{ id?: string; draft: PairingDraft }>) =>
          this._mutate(() => savePairing(event.detail.draft, event.detail.id))}
        @pairing-delete-requested=${(event: CustomEvent<{ id: string }>) =>
          this._mutate(() => deletePairing(event.detail.id))}
      ></growspace-tc-pairing-editor>`;
  }
}
