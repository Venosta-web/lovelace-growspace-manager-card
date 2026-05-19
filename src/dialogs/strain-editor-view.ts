import { LitElement, html, css, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose,
  mdiDelete,
  mdiCheck,
  mdiContentCopy,
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiTuneVariant,
  mdiLeaf,
  mdiArrowLeft,
  mdiCloudUpload,
  mdiPencil,
  mdiDownload,
  mdiCamera,
  mdiImage,
  mdiViewDashboard,
  mdiAccountGroup,
  mdiFileUpload,
  mdiWeb,
} from '@mdi/js';
import './strain-import-dialog';
import { HomeAssistant } from 'custom-card-helpers';
import { StrainEntry, CropMeta } from '../types';
import type { LineageNode } from '../features/plants/types';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/lineage-tree';
import '../features/shared/ui/gs-help-tooltip';

@customElement('strain-editor-view')
export class StrainEditorView extends LitElement {
  @property({ attribute: false }) editingStrain?: StrainEntry;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ attribute: false }) store?: GrowspaceStore;
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) source?: string;
  @property({ attribute: false }) returnPayload?: unknown;

  @state() private _editorState: Partial<StrainEntry> = {};
  @state() private _editorHistory: Partial<StrainEntry>[] = [];
  @state() private _isCropping = false;
  @state() private _isImageSelectorOpen = false;
  @state() private _lineageEditMode = false;
  @state() private _lineageTree: LineageNode | null = null;
  @state() private _importDialogOpen = false;
  @state() private _importReplace = false;
  @state() private _seedfinderDialogOpen = false;
  @state() private _breederDialogOpen = false;
  @state() private _breederEditorState: { name: string; logo: string; originalName: string } | null = null;
  @state() private _pendingDeleteBreeder: string | null = null;

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has('editingStrain')) {
      this._openEditorFor(this.editingStrain);
      this._editorHistory = [];
    }
  }

  private _openEditorFor(strain?: StrainEntry | Partial<StrainEntry>) {
    if (strain) {
      this._editorState = { ...strain };
    } else {
      this._editorState = {
        strain: '',
        phenotype: '',
        breeder: '',
        type: 'Hybrid',
        flowering_days_min: 60,
        flowering_days_max: 70,
        lineage: '',
        sex: 'Feminized',
        description: '',
        image: '',
        breeder_logo: '',
        sativa_percentage: 50,
        indica_percentage: 50,
      };
    }
    this._lineageEditMode = false;
    this._lineageTree = null;
  }

  private _navigateToAncestor(match: StrainEntry) {
    this._editorHistory = [...this._editorHistory, { ...this._editorState }];
    this._openEditorFor(match);
  }

  private _goBack() {
    if (this._editorHistory.length > 0) {
      const prev = this._editorHistory[this._editorHistory.length - 1];
      this._editorHistory = this._editorHistory.slice(0, -1);
      this._openEditorFor(prev);
    } else {
      this.dispatchEvent(new CustomEvent('editor-back', { bubbles: true, composed: true }));
    }
  }

  private _handleSave() {
    if (!this._editorState.strain) return;

    this.dispatchEvent(
      new CustomEvent('save-strain', {
        detail: this._editorState,
        bubbles: true,
        composed: true,
      })
    );

    if (this.source) {
      this.dispatchEvent(
        new CustomEvent('strain-created-at-source', {
          detail: {
            strain: this._editorState,
            source: this.source,
            returnPayload: this.returnPayload,
          },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this._editorHistory = [];
      this.dispatchEvent(new CustomEvent('editor-back', { bubbles: true, composed: true }));
    }
  }

  private _handleDelete(key: string) {
    this.dispatchEvent(
      new CustomEvent('delete-strain', { detail: { key }, bubbles: true, composed: true })
    );
  }

  private async _loadStrainLineageTree(strainName: string) {
    if (!this.store) return;
    try {
      this._lineageTree = await this.store.actions.genetics.getStrainLineageTree(strainName);
    } catch {
      this._lineageTree = null;
    }
  }

  private _handleEditorChange(field: string, value: string | number | CropMeta | undefined) {
    let newState = { ...this._editorState, [field]: value };

    if (field === 'breeder' && typeof value === 'string' && value.trim()) {
      const existing = this.strains.find(
        (s) => s.breeder?.toLowerCase() === value.trim().toLowerCase() && !!s.breeder_logo
      );
      if (existing) {
        newState.breeder_logo = existing.breeder_logo;
      }
    }

    this._editorState = newState;
  }

  private _handlePrintLabel() {
    const s = this._editorState;
    if (!s.strain) return;

    this.dispatchEvent(
      new CustomEvent('open-print-label', {
        detail: {
          strainName: s.strain,
          phenotype: s.phenotype,
          lineage: s.lineage,
          breeder: s.breeder,
          breederLogo: s.breeder_logo,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleCropMode(active: boolean) {
    this._isCropping = active;
  }

  private _toggleImageSelector(isOpen: boolean) {
    this._isImageSelectorOpen = isOpen;
  }

  private _handleSelectLibraryImage(imageUrl: string) {
    this._editorState = { ...this._editorState, image: imageUrl };

    const existing = this.strains.find((s) => s.image === imageUrl && !!s.image_crop_meta);
    if (existing && existing.image_crop_meta) {
      this._editorState.image_crop_meta = { ...existing.image_crop_meta };
    } else {
      delete this._editorState.image_crop_meta;
    }

    this._isImageSelectorOpen = false;
  }

  private _handleImportFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.dispatchEvent(
          new CustomEvent('import-library', {
            detail: { file, replace: this._importReplace },
          })
        );
        this._importDialogOpen = false;
      }
    };
    input.click();
  }

  private getCropStyle(image: string, meta?: CropMeta) {
    if (!meta) return `background-image: url('${image}')`;
    return `
      background-image: url('${image}');
      background-size: ${meta.scale * 100}%;
      background-position: ${meta.x}% ${meta.y}%;
    `;
  }

  private _getUniqueBreeders(): Array<{ name: string; logo: string; strainCount: number }> {
    const breederMap = new Map<string, { logo: string; strainCount: number }>();
    this.strains.forEach((s) => {
      if (s.breeder && s.breeder.trim()) {
        const name = s.breeder.trim();
        const existing = breederMap.get(name);
        if (existing) {
          existing.strainCount++;
          if (!existing.logo && s.breeder_logo) {
            existing.logo = s.breeder_logo;
          }
        } else {
          breederMap.set(name, {
            logo: s.breeder_logo || '',
            strainCount: 1,
          });
        }
      }
    });
    return [...breederMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private _startBreederEdit(name?: string, logo?: string) {
    this._breederEditorState = {
      name: name || '',
      logo: logo || '',
      originalName: name || '',
    };
  }

  private _handleSaveBreeder() {
    const state = this._breederEditorState;
    if (!state || !state.name.trim()) return;

    const newName = state.name.trim();
    const isEdit = !!state.originalName;

    if (isEdit) {
      this.dispatchEvent(
        new CustomEvent('update-breeder', {
          detail: {
            oldName: state.originalName,
            newName: newName,
            logo: state.logo,
          },
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('save-breeder', {
          detail: { name: newName, logo: state.logo },
        })
      );
    }

    this._breederEditorState = null;
  }

  private _handleDeleteBreeder(breederName: string) {
    this._pendingDeleteBreeder = breederName;
  }

  private _confirmDeleteBreeder() {
    if (this._pendingDeleteBreeder) {
      this.dispatchEvent(
        new CustomEvent('delete-breeder', {
          detail: { name: this._pendingDeleteBreeder },
        })
      );
      this._pendingDeleteBreeder = null;
    }
  }

  private _cancelDeleteBreeder() {
    this._pendingDeleteBreeder = null;
  }

  private _handleSeedfinderImport(e: CustomEvent): void {
    const data = e.detail;
    this._editorState = {
      ...this._editorState,
      ...data,
    };
    this._seedfinderDialogOpen = false;
    this.requestUpdate();
  }

  render() {
    return html`
      ${this.renderEditorView()}
      ${this._isCropping ? this.renderCropOverlay() : nothing}
      ${this._isImageSelectorOpen ? this.renderImageSelector() : nothing}
      ${this._importDialogOpen ? this.renderImportDialog() : nothing}
      ${this._breederDialogOpen ? this.renderBreederDialog() : nothing}
      ${this._pendingDeleteBreeder ? this.renderBreederDeleteConfirmation() : nothing}
      ${this._seedfinderDialogOpen ? this.renderSeedfinderDialog() : nothing}
    `;
  }

  private renderEditorView(): TemplateResult {
    const s = this._editorState;
    const isEdit =
      !!s.strain &&
      this.strains.some((ex) => ex.strain === s.strain && ex.phenotype === s.phenotype);
    const uniqueStrains = [...new Set(this.strains.map((st) => st.strain).filter(Boolean))].sort();
    const uniqueBreeders = [
      ...new Set(this.strains.map((st) => st.breeder).filter(Boolean)),
    ].sort();

    const handleFileChange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then((base64) => this._handleEditorChange('image', base64))
          .catch((err) => console.error('Error compressing image:', err));
      }
    };

    return html`
      <datalist id="strain-suggestions">
        ${uniqueStrains.map((name) => html`<option value="${name}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
        ${uniqueBreeders.map((name) => html`<option value="${name}"></option>`)}
      </datalist>

      <div class="dialog-header">
        <div class="dialog-title-group" style="display:flex; align-items:center; gap:16px;">
          <button
            class="md3-button tonal"
            style="padding: 0 12px; height: 32px;"
            @click=${() => this._goBack()}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor; margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiArrowLeft}"></path>
            </svg>
            ${this._editorHistory.length > 0 ? (this._editorHistory[this._editorHistory.length - 1] as StrainEntry).strain ?? 'Back' : 'Back'}
          </button>
          <h2 class="dialog-title">${isEdit ? 'Edit Strain' : 'Add New Strain'}</h2>
        </div>
        <button
          class="md3-button text close"
          @click=${() => this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}
          style="min-width:auto; padding:8px; margin-left: auto;"
        >
          <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiClose}"></path>
          </svg>
        </button>
      </div>

      <div class="sd-content">
        <div class="editor-layout">
          <!-- LEFT COL: IDENTITY -->
          <div class="editor-col">
            <div
              class="photo-upload-area"
              @click=${(e: Event) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest('.crop-btn') &&
          !target.closest('.select-library-btn') &&
          !target.closest('.md3-button')
        ) {
          (e.currentTarget as HTMLElement).querySelector('input')?.click();
        }
      }}
              @dragover=${(e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }}
              @drop=${(e: DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) {
          PlantUtils.compressImage(file)
            .then((base64) => this._handleEditorChange('image', base64))
            .catch((err) => console.error('Error compressing image:', err));
        }
      }}
            >
              <button
                class="select-library-btn"
                @click=${(e: Event) => {
        e.stopPropagation();
        this._toggleImageSelector(true);
      }}
              >
                <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiViewDashboard}"></path>
                </svg>
                Select from Library
              </button>

              ${s.image
        ? html`
                    ${s.image_crop_meta
            ? html`<div
                          style="width:100%; height:100%; border-radius:10px; ${this.getCropStyle(
              s.image,
              s.image_crop_meta
            )}; background-repeat: no-repeat;"
                        ></div>`
            : html`<img
                          src="${s.image}"
                          style="width:100%; height:100%; object-fit:cover; border-radius:10px;"
                        />`}

                    <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                      <button
                        class="crop-btn"
                        style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                        @click=${(e: Event) => {
            e.stopPropagation();
            this._toggleCropMode(true);
          }}
                        title="Crop Image"
                      >
                        <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiContentCopy}"></path>
                        </svg>
                      </button>
                      <div
                        style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;"
                      >
                        <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24">
                          <path d="${mdiPencil}"></path>
                        </svg>
                      </div>
                    </div>
                  `
        : html`
                    <div style="display: flex; gap: 16px; align-items: center;">
                      <div
                        style="display: flex; flex-direction: column; align-items: center; gap: 8px;"
                      >
                        <button
                          class="md3-button tonal"
                          @click=${(e: Event) =>
            (
              (e.currentTarget as HTMLElement)
                .nextElementSibling as HTMLInputElement
            ).click()}
                        >
                          <svg
                            style="width:24px;height:24px;fill:currentColor;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiCamera}"></path>
                          </svg>
                          Camera
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style="display:none"
                          @change=${handleFileChange}
                        />
                      </div>

                      <div
                        style="display: flex; flex-direction: column; align-items: center; gap: 8px;"
                      >
                        <button
                          class="md3-button tonal"
                          @click=${(e: Event) =>
            (
              (e.currentTarget as HTMLElement)
                .nextElementSibling as HTMLInputElement
            ).click()}
                        >
                          <svg
                            style="width:24px;height:24px;fill:currentColor;"
                            viewBox="0 0 24 24"
                          >
                            <path d="${mdiImage}"></path>
                          </svg>
                          Gallery
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          style="display:none"
                          @change=${handleFileChange}
                        />
                      </div>
                    </div>
                    <span style="font-size:0.8rem; margin-top:12px; opacity: 0.7;"
                      >(Or Drag & Drop)</span
                    >
                  `}
            </div>

            <div class="sd-form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                <label class="sd-label" style="margin-bottom:0;">Strain Name *</label>
                <button
                  class="md3-button text"
                  style="height:24px; padding:0 8px; font-size:0.75rem; color:var(--accent-green); min-width:auto;"
                  @click=${() => (this._seedfinderDialogOpen = true)}
                >
                  <svg
                    style="width:14px;height:14px;fill:currentColor; margin-right:4px;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiWeb}"></path>
                  </svg>
                  Seedfinder
                </button>
              </div>
              <input
                type="text"
                class="sd-input"
                list="strain-suggestions"
                .value=${s.strain || ''}
                @input=${(e: InputEvent) =>
        this._handleEditorChange('strain', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Phenotype</label>
              <input
                type="text"
                class="sd-input"
                placeholder="e.g. #1 (Optional)"
                .value=${s.phenotype || ''}
                @input=${(e: InputEvent) => this._handleEditorChange('phenotype', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Breeder/Seedbank</label>
              <input
                type="text"
                class="sd-input"
                list="breeder-suggestions"
                .value=${s.breeder || ''}
                @input=${(e: InputEvent) =>
        this._handleEditorChange('breeder', (e.target as HTMLInputElement).value)}
              />

              <!-- Breeder Logo Upload -->
              <div
                class="breeder-logo-upload"
                style="margin-top: 12px; display: flex; align-items: center; gap: 12px;"
              >
                ${s.breeder_logo
        ? html`
                      <img
                        src="${s.breeder_logo}"
                        style="width: 48px; height: 48px; object-fit: contain; border-radius: 4px; background: rgba(255,255,255,0.05); padding: 4px;"
                      />
                    `
        : html`
                      <div
                        style="width: 48px; height: 48px; border: 1px dashed var(--divider-color); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color);"
                      >
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiImage}"></path>
                        </svg>
                      </div>
                    `}
                <button
                  class="md3-button tonal"
                  style="height: 32px; padding: 0 12px; font-size: 0.8rem;"
                  @click=${(e: Event) =>
        ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}
                >
                  <svg
                    style="width:16px;height:16px;fill:currentColor; margin-right:6px;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiCloudUpload}"></path>
                  </svg>
                  ${s.breeder_logo ? 'Change Logo' : 'Upload Logo'}
                </button>
                <input
                  type="file"
                  accept="image/*"
                  style="display:none"
                  @change=${(e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          PlantUtils.compressImage(file)
            .then((base64) => this._handleEditorChange('breeder_logo', base64))
            .catch((err) => console.error('Error compressing logo:', err));
        }
      }}
                />
                ${s.breeder_logo
        ? html`
                      <button
                        class="md3-button text"
                        style="height: 32px; padding: 0 8px; color: var(--error-color, #ff5252);"
                        @click=${() => this._handleEditorChange('breeder_logo', '')}
                      >
                        <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiDelete}"></path>
                        </svg>
                      </button>
                    `
        : nothing}
              </div>
            </div>
          </div>

          <!-- RIGHT COL: GENETICS -->
          <div class="editor-col">
            <div class="sd-form-group">
              <label class="sd-label">Type *</label>
              <div class="type-selector-grid">
                ${['Indica', 'Sativa', 'Hybrid', 'Ruderalis'].map((t) => {
          let icon = mdiLeaf;
          if (t === 'Indica') icon = mdiWeatherNight;
          if (t === 'Sativa') icon = mdiWeatherSunny;
          if (t === 'Hybrid') icon = mdiTuneVariant;

          const isActive = (s.type || '').toLowerCase() === t.toLowerCase();
          return html`
                    <div
                      class="type-option ${isActive ? 'active' : ''}"
                      @click=${() => this._handleEditorChange('type', t)}
                    >
                      <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                      <span class="type-label" style="font-size:0.85rem; font-weight:500;"
                        >${t}</span
                      >
                    </div>
                  `;
        })}
              </div>
            </div>

            ${(s.type || '').toLowerCase() === 'hybrid'
        ? html`
                  <div style="margin-bottom: 20px;">
                    <label class="sd-label">Hybrid Composition (%)</label>
                    <div
                      class="hg-container"
                      style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;"
                    >
                      <div class="hg-labels">
                        <div
                          class="hg-input-label"
                          style="display:flex; align-items:center; gap:4px;"
                        >
                          <span>Indica:</span>
                          <input
                            class="hg-num-input"
                            type="number"
                            min="0"
                            max="100"
                            .value=${s.indica_percentage || 0}
                            @input=${(e: InputEvent) => {
            let val = Math.floor(parseFloat((e.target as HTMLInputElement).value)) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            this._handleEditorChange('indica_percentage', val);
            this._handleEditorChange('sativa_percentage', 100 - val);
          }}
                          />
                          <span>%</span>
                        </div>
                        <div
                          class="hg-input-label"
                          style="display:flex; align-items:center; gap:4px;"
                        >
                          <span>Sativa:</span>
                          <input
                            class="hg-num-input"
                            type="number"
                            min="0"
                            max="100"
                            .value=${s.sativa_percentage || 0}
                            @input=${(e: InputEvent) => {
            let val = Math.floor(parseFloat((e.target as HTMLInputElement).value)) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            this._handleEditorChange('sativa_percentage', val);
            this._handleEditorChange('indica_percentage', 100 - val);
          }}
                          />
                          <span>%</span>
                        </div>
                      </div>

                      <div
                        class="hg-bar-track"
                        @click=${(e: MouseEvent) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            let percent = Math.round((x / rect.width) * 100);
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            this._handleEditorChange('indica_percentage', percent);
            this._handleEditorChange('sativa_percentage', 100 - percent);
          }}
                      >
                        <div
                          class="hg-bar-indica"
                          style="width: ${s.indica_percentage || 0}%"
                        ></div>
                        <div class="hg-bar-sativa"></div>
                        <div class="hg-tick" style="left: 25%"></div>
                        <div class="hg-tick" style="left: 50%"></div>
                        <div class="hg-tick" style="left: 75%"></div>
                      </div>
                    </div>
                  </div>
                `
        : nothing}

            <div class="sd-form-group">
              <label class="sd-label">Flowering Time (Days)</label>
              <div style="display:flex; gap:16px;">
                <input
                  type="number"
                  class="sd-input"
                  placeholder="Min"
                  .value=${s.flowering_days_min || ''}
                  @input=${(e: InputEvent) =>
        this._handleEditorChange('flowering_days_min', (e.target as HTMLInputElement).value)}
                />
                <input
                  type="number"
                  class="sd-input"
                  placeholder="Max"
                  .value=${s.flowering_days_max || ''}
                  @input=${(e: InputEvent) =>
        this._handleEditorChange('flowering_days_max', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div class="sd-form-group">
              <label class="sd-label" style="display:flex;align-items:center;justify-content:space-between;">
                Lineage
                <button class="sd-btn-text" @click=${async () => {
        this._lineageEditMode = !this._lineageEditMode;
        if (this._lineageEditMode && s.strain) {
          await this._loadStrainLineageTree(s.strain);
        }
      }}>
                  ${this._lineageEditMode ? 'View' : 'Edit tree'}
                </button>
              </label>
              ${this._lineageEditMode
        ? html`<lineage-tree-editor
                    .node=${this._lineageTree}
                    .strainEntries=${(this.strains ?? []).map((st: StrainEntry) => ({
          name: st.strain || (st as unknown as Record<string, string>)['strain_name'] || '',
          phenotype: st.phenotype && st.phenotype !== 'default' ? st.phenotype : undefined,
        })).filter(e => !!e.name)}
                    @lineage-change=${async (e: CustomEvent) => {
            const { parents } = e.detail;
            if (!s.strain || !this.store) return;
            const result = await this.store.actions.genetics.updateStrainLineageTree(s.strain, parents);
            this._handleEditorChange('lineage', result.lineage);
            await this._loadStrainLineageTree(s.strain);
          }}
                  ></lineage-tree-editor>`
        : html`
                    ${this._lineageTree?.parents?.length
            ? html`<lineage-tree
                          .node=${this._lineageTree}
                          .clickable=${true}
                          @node-click=${(e: CustomEvent<{ name: string }>) => {
                const match = (this.strains ?? []).find((st: StrainEntry) => st.strain === e.detail.name);
                if (match) this._navigateToAncestor(match);
              }}
                        ></lineage-tree>`
            : html`<span style="color:var(--secondary-text-color);font-size:12px;font-style:italic;">${s.lineage || 'No lineage recorded'}</span>`}
                  `}
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Sex</label>
              <div style="display:flex; gap:20px; padding: 8px 0;">
                ${['Feminized', 'Regular'].map(
              (sex) => html`
                    <label
                      style="display:flex; align-items:center; gap:8px; cursor:pointer; color:var(, white);"
                    >
                      <input
                        type="radio"
                        name="sex_radio"
                        .checked=${s.sex === sex}
                        @change=${() => this._handleEditorChange('sex', sex)}
                        style="accent-color: var(--accent-green); transform: scale(1.2);"
                      />
                      ${sex}
                    </label>
                  `
            )}
              </div>
            </div>

            <div class="sd-form-group">
              <label class="sd-label">Description</label>
              <textarea
                class="sd-textarea"
                .value=${s.description || ''}
                @input=${(e: InputEvent) => this._handleEditorChange('description', (e.target as HTMLTextAreaElement).value)}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="sd-footer" style="justify-content: space-between;">
        ${s.key
        ? html`
              <button
                class="md3-button text"
                style="color: var(--error-color, #f44336);"
                @click=${() => this._handleDelete(s.key!)}
              >
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiDelete}"></path>
                </svg>
                Delete
              </button>
            `
        : html`<div></div>`}

        <div style="display:flex; gap:12px;">
          ${s.strain ? html`
            <button class="md3-button outlined" @click=${this._handlePrintLabel}>
              <svg style="width:18px;height:18px;fill:currentColor; margin-right:4px;" viewBox="0 0 24 24">
                <path d="${mdiDownload}"></path>
              </svg>
              Print Label
            </button>
          ` : nothing}
          <button class="md3-button tonal" @click=${() => this._goBack()}>Cancel</button>
          <button class="md3-button primary" @click=${() => this._handleSave()}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiCheck}"></path>
            </svg>
            Save Strain
          </button>
        </div>
      </div>
    `;
  }

  private renderCropOverlay(): TemplateResult | typeof nothing {
    const s = this._editorState;
    if (!s.image) return nothing;

    const meta = s.image_crop_meta || { x: 50, y: 50, scale: 1 };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newScale = Math.min(Math.max(meta.scale + delta, 1), 5);
      this._handleEditorChange('image_crop_meta', { ...meta, scale: newScale });
    };

    const handleMouseDown = (e: MouseEvent) => {
      const startX = e.clientX;
      const startY = e.clientY;
      const startMetaX = meta.x;
      const startMetaY = meta.y;

      const onMouseMove = (ev: MouseEvent) => {
        const deltaX = (startX - ev.clientX) * (0.2 / meta.scale);
        const deltaY = (startY - ev.clientY) * (0.2 / meta.scale);
        const newX = Math.min(Math.max(startMetaX + deltaX, 0), 100);
        const newY = Math.min(Math.max(startMetaY + deltaY, 0), 100);
        this._handleEditorChange('image_crop_meta', { ...meta, x: newX, y: newY });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    return html`
      <div class="crop-overlay">
        <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
        <div
          class="crop-viewport"
          @wheel=${handleWheel}
          @mousedown=${handleMouseDown}
          @dragstart=${(e: DragEvent) => e.preventDefault()}
        >
          <div
            style="width: 100%; height: 100%;
              background-image: url('${s.image}');
              background-size: ${meta.scale * 100}%;
              background-position: ${meta.x}% ${meta.y}%;
              background-repeat: no-repeat;
              pointer-events: none;"
          ></div>
        </div>

        <div class="crop-controls">
          <div style="display:flex; justify-content:space-between; color:#ccc; font-size:0.8rem;">
            <span>Zoom: ${(meta.scale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            class="crop-slider"
            min="1"
            max="5"
            step="0.1"
            .value=${meta.scale.toString()}
            @input=${(e: Event) =>
        this._handleEditorChange('image_crop_meta', {
          ...meta,
          scale: parseFloat((e.target as HTMLInputElement).value),
        })}
          />

          <div style="display:flex; gap:12px; margin-top:12px;">
            <button
              class="md3-button tonal"
              style="flex:1"
              @click=${() => this._toggleCropMode(false)}
            >
              Done
            </button>
          </div>
          <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
            Drag to pan • Scroll to zoom
          </div>
        </div>
      </div>
    `;
  }

  private renderImageSelector(): TemplateResult {
    const imageMap = new Map<string, { strain: string; phenotype: string }[]>();
    this.strains.forEach((s) => {
      if (s.image) {
        if (!imageMap.has(s.image)) {
          imageMap.set(s.image, []);
        }
        imageMap.get(s.image)!.push({ strain: s.strain, phenotype: s.phenotype || '' });
      }
    });

    return html`
      <div class="crop-overlay">
        <div
          class="glass-dialog-container"
          style="width: 80%; max-width: 800px; height: 80%; max-height: 600px;"
        >
          <div class="dialog-header">
            <div class="dialog-title-group">
              <h2 class="dialog-title">Select from Library</h2>
            </div>
            <button
              class="md3-button text"
              @click=${() => this._toggleImageSelector(false)}
              style="min-width:auto; padding:8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>
          <div class="sd-content" style="overflow-y: auto;">
            <div
              style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;"
            >
              ${[...imageMap.entries()].map(
      ([img, infoList]) => html`
                  <div
                    style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                    @click=${() => this._handleSelectLibraryImage(img)}
                  >
                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                    <div
                      style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;"
                    >
                      ${infoList.map(
        (info, index) => html`
                          <div
                            style="${index < infoList.length - 1
            ? 'margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);'
            : ''}"
                          >
                            <div style="font-weight: 700;">Strain: ${info.strain}</div>
                            <div style="opacity: 0.9;">Pheno: ${info.phenotype || 'N/A'}</div>
                          </div>
                        `
      )}
                    </div>
                  </div>
                `
    )}
            </div>
            ${imageMap.size === 0
        ? html`<p
                  style="text-align: center; color: var(--secondary-text-color); margin-top: 40px;"
                >
                  No images found in library.
                </p>`
        : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderImportDialog(): TemplateResult {
    const close = () => { this._importDialogOpen = false; };
    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="width: 480px; max-width: 98vw; height: auto;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <ha-svg-icon .path=${mdiFileUpload}></ha-svg-icon>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Import Strains</h2>
            </div>
            <button
              class="md3-button text close"
              @click=${close}
              style="min-width:auto; padding:8px; margin-left: auto;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div style="padding: 24px;">
            <div
              style="font-size: 0.9rem; color: var(--secondary-text-color); line-height: 1.5; margin-bottom: 20px;"
            >
              Select a ZIP file containing your strain library export. You can either merge the new
              strains with your existing library or replace it entirely.
            </div>

            <div
              style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;"
            >
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <input
                  type="radio"
                  name="import_mode"
                  .checked=${!this._importReplace}
                  @change=${() => (this._importReplace = false)}
                  style="accent-color: var(--accent-green); transform: scale(1.2);"
                />
                <div>
                  <div style="font-weight: 600;">Merge</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text-color);">
                    Add new strains, keep existing ones.
                  </div>
                </div>
              </label>

              <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>

              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <input
                  type="radio"
                  name="import_mode"
                  .checked=${this._importReplace}
                  @change=${() => (this._importReplace = true)}
                  style="accent-color: var(--accent-green); transform: scale(1.2);"
                />
                <div>
                  <div style="font-weight: 600;">Replace</div>
                  <div style="font-size: 0.8rem; color: var(--secondary-text-color);">
                    Overwrite entire library with import.
                  </div>
                </div>
              </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
              <button class="md3-button tonal" @click=${close}>
                Cancel
              </button>
              <button class="md3-button primary" @click=${() => this._handleImportFile()}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiCloudUpload}"></path>
                </svg>
                Select File
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private renderBreederDialog(): TemplateResult {
    const breeders = this._getUniqueBreeders();
    const close = () => { this._breederDialogOpen = false; this._breederEditorState = null; };

    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="width: 600px; max-width: 98vw; height: auto; max-height: 90vh;">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiAccountGroup}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
                <div style="display:flex;align-items:center;gap:6px;">
                  <h2 class="dialog-title">Breeder Manager</h2>
                  <gs-help-tooltip
                    content="Manage your breeder database and logos. Breeders can be assigned to strains to track genetics."
                    placement="bottom"
                    label="Breeders"
                  ></gs-help-tooltip>
                </div>
            </div>
            <button
              class="md3-button text close"
              @click=${close}
              style="min-width:auto; padding:8px; margin-left: auto;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="sd-content">
            ${this._breederEditorState
        ? this.renderBreederEditor()
        : this.renderBreederList(breeders)}
          </div>

          ${!this._breederEditorState ? html`
            <div class="sd-footer">
              <span style="font-size:0.8rem; color:var(--secondary-text-color); padding: 0 8px;">
                Breeders appear automatically when strains with breeder info are saved.
              </span>
            </div>
          ` : nothing}
        </div>
      </ha-dialog>
    `;
  }

  private renderBreederList(breeders: Array<{ name: string; logo: string; strainCount: number }>): TemplateResult {
    if (breeders.length === 0) {
      return html`
        <div style="text-align:center; padding:40px; color:var(--secondary-text-color);">
          <svg style="width:48px;height:48px;fill:currentColor;opacity:0.5;" viewBox="0 0 24 24">
            <path d="${mdiAccountGroup}"></path>
          </svg>
          <p>No breeders found. Add strains with breeder info or create a new breeder.</p>
        </div>
      `;
    }

    return html`
      <div class="breeder-list">
        ${breeders.map((b) => html`
          <div class="breeder-card" @click=${() => this._startBreederEdit(b.name, b.logo)}>
            ${b.logo
        ? html`<img class="breeder-logo-preview" src="${b.logo}" alt="${b.name}" />`
        : html`<div class="breeder-logo-placeholder">
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiImage}"></path>
                  </svg>
                </div>`}
            <div class="breeder-info">
              <div class="breeder-name">${b.name}</div>
              <div class="breeder-strain-count">${b.strainCount} strain${b.strainCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="breeder-actions">
              <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); this._startBreederEdit(b.name, b.logo); }}>
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiPencil}"></path>
                </svg>
              </button>
              <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); this._handleDeleteBreeder(b.name); }} style="color:var(--error-color, #f44336);">
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiDelete}"></path>
                </svg>
              </button>
            </div>
          </div>
        `)}
      </div>
    `;
  }

  private renderBreederEditor(): TemplateResult {
    const state = this._breederEditorState!;
    const isEdit = !!state.originalName;
    const affectedStrains = isEdit
      ? this.strains.filter((s) => s.breeder === state.originalName)
      : [];

    const handleLogoUpload = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then((base64) => {
            this._breederEditorState = { ...this._breederEditorState!, logo: base64 };
          })
          .catch((err) => console.error('Error compressing logo:', err));
      }
    };

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <button class="md3-button tonal" style="padding:0 12px; height:32px;" @click=${() => (this._breederEditorState = null)}>
            <svg style="width:18px;height:18px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
              <path d="${mdiArrowLeft}"></path>
            </svg>
            Back
          </button>
          <h3 style="margin:0; color:var(--primary-text-color);">${isEdit ? 'Edit Breeder' : 'New Breeder'}</h3>
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Name *</label>
          <input
            type="text"
            class="sd-input"
            placeholder="e.g. Royal Queen Seeds"
            .value=${state.name}
            @input=${(e: InputEvent) => {
        this._breederEditorState = { ...this._breederEditorState!, name: (e.target as HTMLInputElement).value };
      }}
          />
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Logo</label>
          <div style="display:flex; align-items:center; gap:16px;">
            ${state.logo
        ? html`<img src="${state.logo}" style="width:64px; height:64px; object-fit:contain; border-radius:8px; background:rgba(255,255,255,0.05); padding:4px;" />`
        : html`<div style="width:64px; height:64px; border:1px dashed var(--divider-color); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--secondary-text-color);">
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiImage}"></path></svg>
                </div>`}
            <div style="display:flex; gap:8px;">
              <button class="md3-button tonal" style="height:36px; padding:0 16px; font-size:0.85rem;" @click=${(e: Event) => ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}>
                <svg style="width:16px;height:16px;fill:currentColor;margin-right:6px;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
                ${state.logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input type="file" accept="image/*" style="display:none" @change=${handleLogoUpload} />
              ${state.logo ? html`
                <button class="md3-button text" style="height:36px; padding:0 12px; color:var(--error-color, #ff5252);" @click=${() => { this._breederEditorState = { ...this._breederEditorState!, logo: '' }; }}>
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                </button>
              ` : nothing}
            </div>
          </div>
        </div>

        ${isEdit && affectedStrains.length > 0 ? html`
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--divider-color); border-radius:8px; padding:16px;">
            <label class="sd-label" style="margin-bottom:8px;">Strains using this breeder (${affectedStrains.length})</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${affectedStrains.map((s) => html`
                <span style="background:rgba(76,175,80,0.15); color:var(--accent-green); padding:4px 10px; border-radius:16px; font-size:0.8rem; font-weight:500;">
                  ${s.strain}${s.phenotype ? ` (${s.phenotype})` : ''}
                </span>
              `)}
            </div>
          </div>
        ` : nothing}

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
          <button class="md3-button tonal" @click=${() => (this._breederEditorState = null)}>Cancel</button>
          <button class="md3-button primary" @click=${() => this._handleSaveBreeder()} ?disabled=${!state.name.trim()}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
            ${isEdit ? 'Save Changes' : 'Create Breeder'}
          </button>
        </div>
      </div>
    `;
  }

  private renderBreederDeleteConfirmation(): TemplateResult {
    const breederName = this._pendingDeleteBreeder!;
    const affectedCount = this.strains.filter((s) => s.breeder === breederName).length;

    return html`
      <ha-dialog
        open
        @closed=${this._cancelDeleteBreeder}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="width: 480px; max-width: 98vw; height: auto; padding: 24px; display: flex; flex-direction: column;">
          <h2 class="dialog-title">Remove Breeder?</h2>
          <p style="color:var(--secondary-text-color); margin:16px 0; font-size:1rem; line-height:1.5;">
            This will remove <strong>"${breederName}"</strong> from ${affectedCount} strain${affectedCount !== 1 ? 's' : ''}. The strains themselves will not be deleted.
          </p>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
            <button class="md3-button tonal" @click=${this._cancelDeleteBreeder}>Cancel</button>
            <button class="md3-button text" style="color:#f44336;" @click=${this._confirmDeleteBreeder}>
              <svg style="width:18px;height:18px;fill:currentColor;margin-right:8px;" viewBox="0 0 24 24">
                <path d="${mdiDelete}"></path>
              </svg>
              Remove
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private renderSeedfinderDialog(): TemplateResult {
    return html`
      <strain-import-dialog
        .hass=${this.hass}
        .open=${this._seedfinderDialogOpen}
        .initialStrain=${this._editorState.strain}
        .initialPheno=${this._editorState.phenotype}
        @close=${() => (this._seedfinderDialogOpen = false)}
        @import=${this._handleSeedfinderImport}
      ></strain-import-dialog>
    `;
  }

  static styles = [
    dialogStyles,
    css`
      :host {
        --accent-green: #4caf50;
        display: contents;
      }

      .sd-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .sd-footer {
        padding: 16px 24px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      /* FORMS */
      .sd-form-group {
        margin-bottom: 20px;
      }
      .sd-label {
        display: block;
        color: var(--primary-text-color, --secondary-text-color);
        font-size: 0.85rem;
        margin-bottom: 8px;
        font-weight: 500;
      }
      .sd-input,
      .sd-textarea,
      .sd-select {
        width: 100%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--primary-text-color, #fff);
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .sd-input:focus,
      .sd-textarea:focus,
      .sd-select:focus {
        border-color: var(--accent-green);
      }
      .sd-textarea {
        resize: vertical;
        min-height: 100px;
        width: 100%;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 12px;
        color: var(--primary-text-color, #fff);
        font-family: inherit;
        box-sizing: border-box;
        font-size: 1rem;
      }
      .sd-textarea:focus {
        border-color: var(--accent-green);
        outline: none;
        background: rgba(255, 255, 255, 0.08);
      }

      .sd-btn-text {
        background: none;
        border: none;
        color: var(--accent-green, #4caf50);
        font-size: 0.8rem;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: inherit;
      }
      .sd-btn-text:hover {
        background: rgba(76, 175, 80, 0.1);
      }

      /* EDITOR LAYOUT */
      .editor-layout {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 32px;
      }

      /* PHOTO UPLOAD */
      .photo-upload-area {
        border: 2px dashed var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.02));
        height: 240px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
      }
      .photo-upload-area:hover {
        border-color: var(--accent-green);
        background: rgba(76, 175, 80, 0.05);
      }
      .select-library-btn {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10;
        cursor: pointer;
      }
      .select-library-btn:hover {
        background: var(--accent-green);
        border-color: var(--accent-green);
      }

      /* Crop Overlay */
      .crop-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .crop-viewport {
        width: 300px;
        height: 300px;
        border: 2px solid var(--accent-green);
        overflow: hidden;
        position: relative;
        cursor: move;
        box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.7);
      }
      .crop-controls {
        margin-top: 20px;
        width: 300px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .crop-slider {
        width: 100%;
        accent-color: var(--accent-green);
      }

      /* Type Selector */
      .type-selector-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .type-option {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        text-align: center;
      }
      .type-option:hover {
        border-color: #666;
      }
      .type-option.active {
        background: var(--secondary-background-color, rgba(76, 175, 80, 0.1));
        border-color: var(--accent-green);
        color: var(--primary-text-color, #fff);
      }
      .type-option svg {
        width: 28px;
        height: 28px;
        fill: var(--secondary-text-color);
      }
      .type-option.active svg {
        fill: var(--accent-green);
      }

      /* Hybrid Graph */
      .hg-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        margin-top: 8px;
        font-family: 'Roboto', sans-serif;
      }
      .hg-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--primary-text-color, #fff);
        margin-bottom: 2px;
      }
      .hg-bar-track {
        height: 18px;
        width: 100%;
        background: #333;
        border-radius: 2px;
        position: relative;
        overflow: hidden;
        display: flex;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        cursor: pointer;
      }
      .hg-bar-indica {
        background: #8b5cf6;
        height: 100%;
        transition: width 0.2s ease;
      }
      .hg-bar-sativa {
        background: #eab308;
        height: 100%;
        flex: 1;
        transition: width 0.2s ease;
      }
      .hg-tick {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.4);
        pointer-events: none;
      }
      .hg-num-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--secondary-text-color);
        color: var(--primary-text-color, #fff);
        width: 36px;
        text-align: center;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0;
      }
      .hg-num-input:focus {
        outline: none;
        border-bottom-color: var(--accent-green);
      }

      /* Breeder Dialog */
      .breeder-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .breeder-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .breeder-card:hover {
        border-color: var(--accent-green);
        background: rgba(255, 255, 255, 0.08);
      }
      .breeder-logo-preview {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        object-fit: contain;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px;
        flex-shrink: 0;
      }
      .breeder-logo-placeholder {
        width: 56px;
        height: 56px;
        border-radius: 8px;
        border: 1px dashed var(--divider-color);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }
      .breeder-info {
        flex: 1;
        min-width: 0;
      }
      .breeder-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color, #fff);
        margin: 0 0 4px 0;
      }
      .breeder-strain-count {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .breeder-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .sc-action-btn {
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        cursor: pointer;
      }
      .sc-action-btn:hover {
        background: var(--accent-green);
      }

      /* Glass dialog container for overlays */
      .glass-dialog-container {
        display: flex;
        flex-direction: column;
        background: var(--card-background-color, #1e1e1e);
        border-radius: 16px;
        overflow: hidden;
      }

      @media (max-width: 600px) {
        .editor-layout {
          grid-template-columns: 1fr;
        }
        .sd-footer {
          display: none;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'strain-editor-view': StrainEditorView;
  }
}
