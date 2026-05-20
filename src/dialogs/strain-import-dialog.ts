import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { 
  mdiMagnify, 
  mdiClose, 
  mdiSeed, 
  mdiCheck, 
  mdiWeb, 
  mdiChevronRight,
  mdiInformationOutline,
  mdiChartDonut,
  mdiClockOutline,
  mdiText,
  mdiDna,
  mdiLeaf,
  mdiAccountGroup,
  mdiImage,
  mdiTrophy,
  mdiChartBar,
  mdiArrowUp
} from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/md3-text-input';

interface ExternalStrainResult {
  name: string;
  breeder: string;
  url: string;
}

interface ExternalStrainDetails {
  name: string;
  breeder: string;
  type: string;
  indica_percentage?: number;
  sativa_percentage?: number;
  flowering_days?: number;
  description?: string;
  image?: string;
  images?: string[];
  yield_potential?: string;
  height?: string;
  thc?: number;
  awards?: string[];
  parents?: any;
}

@customElement('strain-import-dialog')
export class StrainImportDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public open = false;
  @property({ type: String }) public initialStrain = '';
  @property({ type: String }) public initialPheno = '';

  @state() private _searchQuery = '';
  @state() private _searching = false;
  @state() private _results: ExternalStrainResult[] = [];
  @state() private _selectedUrl: string | null = null;
  @state() private _fetchingDetails = false;
  @state() private _details: ExternalStrainDetails | null = null;
  @state() private _error: string | null = null;

  @state() private _importFields = new Set<string>([
    'name', 'breeder', 'type', 'composition', 'flowering', 'description', 'lineage', 'image', 'yield', 'height', 'thc', 'awards'
  ]);
  @state() private _importing = false;

  protected willUpdate(changedProps: Map<string, any>) {
    if (changedProps.has('open') && this.open) {
      const pheno = this.initialPheno && this.initialPheno.toLowerCase() !== 'default' ? ` ${this.initialPheno}` : '';
      this._searchQuery = this.initialStrain + pheno;
      this._results = [];
      this._selectedUrl = null;
      this._details = null;
      this._error = null;
      if (this._searchQuery) {
        this._search();
      }
    }
  }

  private async _search() {
    if (!this._searchQuery) return;
    this._searching = true;
    this._error = null;
    this._results = [];
    this._selectedUrl = null;
    this._details = null;

    if (!this.hass) {
      this._error = 'Home Assistant connection not available';
      this._searching = false;
      return;
    }

    try {
      const response = await this.hass.callWS<ExternalStrainResult[]>({
        type: 'growspace_manager/query_external_strain',
        query: this._searchQuery,
      });
      this._results = response;
    } catch (err: any) {
      this._error = err.message || 'Search failed';
    } finally {
      this._searching = false;
    }
  }

  private async _selectResult(result: ExternalStrainResult) {
    this._selectedUrl = result.url;
    this._fetchingDetails = true;
    this._error = null;
    this._details = null;

    if (!this.hass) {
      this._error = 'Home Assistant connection not available';
      this._fetchingDetails = false;
      return;
    }

    try {
      const response = await this.hass.callWS<ExternalStrainDetails>({
        type: 'growspace_manager/get_external_strain_details',
        url: result.url,
      });
      this._details = response;
    } catch (err: any) {
      this._error = err.message || 'Failed to fetch details';
    } finally {
      this._fetchingDetails = false;
    }
  }

  private _toggleField(field: string) {
    const newFields = new Set(this._importFields);
    if (newFields.has(field)) {
      newFields.delete(field);
    } else {
      newFields.add(field);
    }
    this._importFields = newFields;
  }

  private async _import() {
    if (!this._details) return;

    const result: Partial<ExternalStrainDetails> = {};
    if (this._importFields.has('name')) result.name = this._details.name;
    if (this._importFields.has('breeder')) result.breeder = this._details.breeder;
    if (this._importFields.has('type')) result.type = this._details.type;
    if (this._importFields.has('composition')) {
      result.indica_percentage = this._details.indica_percentage;
      result.sativa_percentage = this._details.sativa_percentage;
    }
    if (this._importFields.has('flowering')) result.flowering_days = this._details.flowering_days;
    if (this._importFields.has('description')) result.description = this._details.description;
    if (this._importFields.has('image')) {
      result.images = this._details.images && this._details.images.length > 0
        ? this._details.images
        : undefined;
      result.image = this._details.image ?? this._details.images?.[0];
    }
    if (this._importFields.has('yield')) result.yield_potential = this._details.yield_potential;
    if (this._importFields.has('height')) (result as any).height = this._details.height;
    if (this._importFields.has('thc')) (result as any).thc = this._details.thc;
    if (this._importFields.has('awards')) (result as any).awards = this._details.awards;
    if (this._importFields.has('lineage')) result.parents = this._details.parents;

    if (this._importFields.has('image') && (result.images?.length || result.image)) {
      this._importing = true;
      try {
        const strainName = result.name ?? this.initialStrain ?? 'unknown';
        const phenotype = this.initialPheno && this.initialPheno.toLowerCase() !== 'default'
          ? this.initialPheno
          : 'default';
        const imageUrls = result.images ?? (result.image ? [result.image] : []);
        const downloadedUrls: string[] = [];
        for (const url of imageUrls) {
          if (!url) continue;
          try {
            const resp = await this.hass.connection.sendMessagePromise<{ path: string }>({
              type: 'growspace_manager/download_strain_image',
              url,
              strain: strainName,
              phenotype,
            });
            downloadedUrls.push(resp.path);
          } catch {
            downloadedUrls.push(url);
          }
        }
        result.images = downloadedUrls.length > 0 ? downloadedUrls : undefined;
        result.image = downloadedUrls[0] ?? undefined;
      } finally {
        this._importing = false;
      }
      if (!this.open) return;
    }

    this.dispatchEvent(new CustomEvent('import', {
      detail: result
    }));
    this._close();
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  static styles = [
    dialogStyles,
    css`
      .content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
        min-height: 400px;
        max-height: 70vh;
        overflow-y: auto;
      }
      .search-box {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .results-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .result-item:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--accent-green, #4caf50);
      }
      .result-item.selected {
        background: rgba(76, 175, 80, 0.1);
        border-color: var(--accent-green, #4caf50);
      }
      .result-info {
        flex: 1;
      }
      .result-name {
        font-weight: 700;
        font-size: 1rem;
      }
      .result-breeder {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }
      .details-preview {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .preview-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      .preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }
      .field-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .field-row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .field-checkbox {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 2px solid var(--divider-color);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .field-checkbox.checked {
        background: var(--accent-green);
        border-color: var(--accent-green);
      }
      .field-checkbox svg {
        width: 14px;
        height: 14px;
        fill: white;
      }
      .field-content {
        flex: 1;
      }
      .field-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .field-label svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }
      .field-value {
        font-size: 0.95rem;
        word-break: break-word;
      }
      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        gap: 16px;
        color: var(--secondary-text-color);
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: var(--accent-green);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .error-box {
        padding: 12px 16px;
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        color: #ff5252;
        border-radius: 8px;
        font-size: 0.9rem;
      }
      .description-text {
        font-size: 0.9rem;
        line-height: 1.5;
        max-height: 100px;
        overflow-y: auto;
        padding-right: 8px;
      }
      .preview-image {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: 12px;
        margin-bottom: 12px;
        background: rgba(255, 255, 255, 0.05);
      }
      .awards-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }
      .award-tag {
        font-size: 0.75rem;
        padding: 4px 8px;
        background: rgba(255, 193, 7, 0.1);
        color: #ffc107;
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `
  ];

  render() {
    if (!this.open) return nothing;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        heading="Import from Seedfinder"
        .scrimClickAction=${''}
      >
        <div class="glass-dialog-container" style="width: 600px; max-width: 95vw;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiWeb}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Seedfinder Import</h2>
              <div class="dialog-subtitle">Fetch detailed strain data and lineage</div>
            </div>
            <button class="md3-button text" @click=${this._close} style="min-width:auto; padding:8px;">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="content">
            <div class="search-box">
              <md3-text-input
                style="flex: 1;"
                placeholder="Strain Name..."
                .value=${this._searchQuery}
                @change=${(e: CustomEvent) => this._searchQuery = e.detail}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._search()}
              ></md3-text-input>
              <button class="md3-button filled" @click=${this._search} ?disabled=${this._searching}>
                <svg style="width:20px;height:20px;fill:currentColor; margin-right:8px;" viewBox="0 0 24 24">
                  <path d="${mdiMagnify}"></path>
                </svg>
                Search
              </button>
            </div>

            ${this._error ? html`<div class="error-box">${this._error}</div>` : nothing}

            ${this._searching 
              ? html`
                  <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>Searching Seedfinder...</span>
                  </div>
                `
              : this._details 
                ? this._renderDetails()
                : this._results.length > 0
                  ? html`
                      <div class="results-list">
                        <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-bottom:4px;">Select a match:</div>
                        ${this._results.map(r => html`
                          <div class="result-item" @click=${() => this._selectResult(r)}>
                            <div class="result-info">
                              <div class="result-name">${r.name}</div>
                              <div class="result-breeder">${r.breeder}</div>
                            </div>
                            <svg style="width:20px;height:20px;fill:var(--secondary-text-color);" viewBox="0 0 24 24">
                              <path d="${mdiChevronRight}"></path>
                            </svg>
                          </div>
                        `)}
                      </div>
                    `
                  : this._searchQuery && !this._searching 
                    ? html`<div style="text-align:center; padding:20px; color:var(--secondary-text-color);">No results found for "${this._searchQuery}"</div>`
                    : nothing
            }
          </div>

          <div class="sd-footer">
            <button class="md3-button tonal" @click=${this._close} ?disabled=${this._importing}>Cancel</button>
            ${this._details ? html`
              <button class="md3-button filled" @click=${this._import} ?disabled=${this._importing}>
                ${this._importing ? html`
                  <span style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;margin-right:8px;flex-shrink:0;"></span>
                  Downloading...
                ` : html`
                  <svg style="width:20px;height:20px;fill:currentColor; margin-right:8px;" viewBox="0 0 24 24">
                    <path d="${mdiCheck}"></path>
                  </svg>
                  Import Selected
                `}
              </button>
            ` : nothing}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _renderDetails() {
    if (!this._details) return nothing;
    const d = this._details;

    return html`
      <div class="details-preview">
        <div class="preview-header">
          <svg style="width:24px;height:24px;fill:var(--accent-green);" viewBox="0 0 24 24">
            <path d="${mdiInformationOutline}"></path>
          </svg>
          <span style="font-weight:700;">Select fields to import:</span>
        </div>

        <div class="preview-grid">
          ${(d.image || (d.images && d.images.length > 0)) ? html`
            <div class="field-row full-width" @click=${() => this._toggleField('image')}>
              <div class="field-checkbox ${this._importFields.has('image') ? 'checked' : ''}">
                ${this._importFields.has('image') ? html`<svg viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>` : nothing}
              </div>
              <div class="field-content">
                <div class="field-label">
                  <svg viewBox="0 0 24 24"><path d="${mdiImage}"></path></svg>
                  Image${d.images && d.images.length > 1 ? ` (${d.images.length} available)` : ''}
                </div>
                <img class="preview-image" src="${d.image ?? d.images![0]}" />
              </div>
            </div>
          ` : nothing}
          ${this._renderFieldRow('name', 'Name', d.name, mdiSeed)}
          ${this._renderFieldRow('breeder', 'Breeder', d.breeder, mdiAccountGroup)}
          ${this._renderFieldRow('type', 'Type', d.type, mdiLeaf)}
          ${this._renderFieldRow('composition', 'Composition', 
            d.indica_percentage !== undefined ? `${d.indica_percentage}% Indica / ${d.sativa_percentage}% Sativa` : 'Unknown', 
            mdiChartDonut)}
          ${this._renderFieldRow('flowering', 'Flowering', 
            d.flowering_days ? `${d.flowering_days} days` : 'Unknown', 
            mdiClockOutline)}
          ${this._renderFieldRow('thc', 'THC', 
            d.thc ? `${d.thc}%` : 'Unknown', 
            mdiChartBar)}
          ${this._renderFieldRow('yield', 'Yield Potential', 
            d.yield_potential || 'Unknown', 
            mdiChartBar)}
          ${this._renderFieldRow('height', 'Height', 
            d.height || 'Unknown', 
            mdiArrowUp)}
          ${this._renderFieldRow('awards', 'Awards', 
            d.awards && d.awards.length > 0 ? html`
              <div class="awards-list">
                ${d.awards.map(a => html`<div class="award-tag"><svg style="width:12px;height:12px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiTrophy}"></path></svg>${a}</div>`)}
              </div>
            ` : 'None', 
            mdiTrophy)}
          ${this._renderFieldRow('description', 'Description', 
            d.description ? html`<div class="description-text">${d.description}</div>` : 'None', 
            mdiText)}
          ${this._renderFieldRow('lineage', 'Genetic Lineage', 
            d.parents ? 'Full lineage tree detected' : 'None', 
            mdiDna)}
        </div>
      </div>
    `;
  }

  private _renderFieldRow(id: string, label: string, value: any, icon: string) {
    const checked = this._importFields.has(id);
    return html`
      <div class="field-row" @click=${() => this._toggleField(id)}>
        <div class="field-checkbox ${checked ? 'checked' : ''}">
          ${checked ? html`<svg viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>` : nothing}
        </div>
        <div class="field-content">
          <div class="field-label">
            <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
            ${label}
          </div>
          <div class="field-value">${value}</div>
        </div>
      </div>
    `;
  }
}

