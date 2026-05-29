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
  mdiImage,
  mdiAccountGroup,
  mdiFileUpload,
  mdiWeb,
  mdiPlus,
  mdiStar,
  mdiStarOutline,
  mdiCamera,
  mdiImageMultiple,
} from '@mdi/js';
import './strain-import-dialog';
import { HomeAssistant } from 'custom-card-helpers';
import { StrainEntry, StrainGalleryImage, CropMeta } from '../types';
import type { LineageNode } from '../features/plants/types';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../features/shared/ui/lineage-tree';
import '../features/shared/ui/gs-help-tooltip';
import { createInitialSM, transition, type StrainEditorSM } from './strain-editor-view-sm';

@customElement('strain-editor-view')
export class StrainEditorView extends LitElement {
  @property({ attribute: false }) editingStrain?: StrainEntry;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ attribute: false }) store?: GrowspaceStore;
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) source?: string;
  @property({ attribute: false }) returnPayload?: unknown;
  @property({ attribute: false }) onSave?: (strain: Partial<StrainEntry>) => Promise<void>;

  @state() private _sm: StrainEditorSM = createInitialSM();
  @state() private _lineageTree: LineageNode | null = null;

  private _dispatchStateChange() {
    this.dispatchEvent(
      new CustomEvent('editing-strain-changed', {
        detail: { strain: this._sm.draft },
        bubbles: true,
        composed: true,
      })
    );
  }

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has('editingStrain')) {
      const currentKey = this._sm.draft?.key || this._sm.draft?.strain;
      const newKey = this.editingStrain?.key || this.editingStrain?.strain;
      if (currentKey !== newKey) {
        const draft = this.editingStrain
          ? { ...this.editingStrain }
          : {
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
              images: [],
              breeder_logo: '',
              sativa_percentage: 50,
              indica_percentage: 50,
            };
        // Preserve overlay sub-state across strain switches, but reset lineage-editing
        // since lineage tree is strain-specific.
        const sub = this._sm.sub.kind === 'lineage-editing' ? { kind: 'idle' as const } : this._sm.sub;
        this._sm = { ...createInitialSM(draft), sub };
        this._lineageTree = null;
        this._dispatchStateChange();
      }
    }
  }

  private _viewLineageInTree() {
    this.dispatchEvent(
      new CustomEvent('view-lineage', {
        detail: { strain: this._sm.draft },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _navigateToAncestor(match: StrainEntry) {
    this._sm = transition(this._sm, { type: 'NavigateToRelated', strain: { ...match } });
    this._lineageTree = null;
    this._dispatchStateChange();
  }

  private _goBack() {
    if (this._sm.history.length > 0) {
      this._sm = transition(this._sm, { type: 'NavigateBack' });
      this._lineageTree = null;
      this._dispatchStateChange();
    } else {
      this.dispatchEvent(new CustomEvent('editor-back', { bubbles: true, composed: true }));
    }
  }

  private async _handleSave() {
    if (!this._sm.draft.strain) return;

    this._sm = transition(this._sm, { type: 'SaveRequested' });

    try {
      const images = this._sm.draft.images ?? [];
      const hasRemote = images.some((img) => img.path.startsWith('http'));
      if (hasRemote) {
        const downloaded = await this._downloadRemoteImages(images);
        let updatedDraft = { ...this._sm.draft, images: downloaded };
        const thumb = downloaded.find((img) => img.is_thumbnail);
        if (thumb) {
          updatedDraft = { ...updatedDraft, image: thumb.path, image_crop_meta: thumb.crop_meta };
        } else if (downloaded.length > 0) {
          const promoted = downloaded.map((img, i) => ({ ...img, is_thumbnail: i === 0 }));
          updatedDraft = {
            ...updatedDraft,
            images: promoted,
            image: promoted[0].path,
            image_crop_meta: promoted[0].crop_meta,
          };
        }
        this._sm = transition(this._sm, {
          type: 'DraftFieldChanged',
          field: 'images',
          value: updatedDraft.images,
        });
        if (updatedDraft.image !== this._sm.draft.image) {
          this._sm = transition(this._sm, {
            type: 'DraftFieldChanged',
            field: 'image',
            value: updatedDraft.image,
          });
        }
      }

      const finalDraft = this._sm.draft;
      if (this.onSave) {
        await this.onSave(finalDraft);
      } else {
        this.dispatchEvent(
          new CustomEvent('save-strain', { detail: finalDraft, bubbles: true, composed: true })
        );
      }

      if (this.source) {
        this.dispatchEvent(
          new CustomEvent('strain-created-at-source', {
            detail: { strain: finalDraft, source: this.source, returnPayload: this.returnPayload },
            bubbles: true,
            composed: true,
          })
        );
      }

      this._sm = transition(this._sm, { type: 'SaveResolved' });
      this.dispatchEvent(new CustomEvent('editor-back', { bubbles: true, composed: true }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      this._sm = transition(this._sm, { type: 'SaveFailed', message });
    }
  }

  private async _downloadRemoteImages(images: StrainGalleryImage[]): Promise<StrainGalleryImage[]> {
    const strain = this._sm.draft.strain ?? 'unknown';
    const phenotype = this._sm.draft.phenotype ?? 'default';
    const result: StrainGalleryImage[] = [];
    for (const img of images) {
      if (!img.path.startsWith('http')) {
        result.push(img);
        continue;
      }
      try {
        const response = await this.hass.connection.sendMessagePromise<{ path: string }>({
          type: 'growspace_manager/download_strain_image',
          url: img.path,
          strain,
          phenotype,
        });
        result.push({ ...img, path: response.path });
      } catch {
        // Download failed — skip this image rather than storing a broken remote URL
        console.warn('[StrainEditorView] Failed to download image, skipping:', img.path);
      }
    }
    return result;
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
    const newDraft = { ...this._sm.draft, [field]: value };

    if (field === 'breeder' && typeof value === 'string' && value.trim()) {
      const existing = this.strains.find(
        (s) => s.breeder?.toLowerCase() === value.trim().toLowerCase() && !!s.breeder_logo
      );
      if (existing) {
        newDraft.breeder_logo = existing.breeder_logo;
      }
    }

    if (field === 'image_crop_meta' && newDraft.images?.length) {
      newDraft.images = newDraft.images.map((img) =>
        img.is_thumbnail ? { ...img, crop_meta: value as CropMeta | undefined } : img
      );
    }

    this._sm = transition(this._sm, {
      type: 'DraftFieldChanged',
      field: field as keyof StrainEntry,
      value: newDraft[field as keyof typeof newDraft],
    });
    if (field === 'breeder' && newDraft.breeder_logo !== this._sm.draft.breeder_logo) {
      this._sm = transition(this._sm, {
        type: 'DraftFieldChanged',
        field: 'breeder_logo',
        value: newDraft.breeder_logo,
      });
    }
    if (field === 'image_crop_meta' && newDraft.images) {
      this._sm = transition(this._sm, {
        type: 'DraftFieldChanged',
        field: 'images',
        value: newDraft.images,
      });
    }
    this._dispatchStateChange();
  }

  private _handlePrintLabel() {
    const s = this._sm.draft;
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
    this._sm = transition(this._sm, { type: active ? 'CropRequested' : 'CropExited' });
  }

  getCropStyle(path: string, meta?: CropMeta): string {
    const safeUrl = PlantUtils.encodeLocalPath(path);
    if (meta) {
      return `background-image: url('${safeUrl}'); background-size: ${meta.scale * 100}%; background-position: ${meta.x}% ${meta.y}%;`;
    }
    return `background-image: url('${safeUrl}');`;
  }

  private _handleImportFile() {
    const replace = this._sm.sub.kind === 'importing' ? this._sm.sub.replace : false;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.dispatchEvent(
          new CustomEvent('import-library', { detail: { file, replace } })
        );
        this._sm = transition(this._sm, { type: 'ImportCompleted' });
      }
    };
    input.click();
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
    if (name) {
      this._sm = transition(this._sm, {
        type: 'BreederEditRequested',
        name,
        logo: logo ?? '',
      });
    } else {
      this._sm = transition(this._sm, { type: 'BreederAddRequested' });
    }
  }

  private _handleSaveBreeder() {
    if (this._sm.sub.kind !== 'breeder-editing') return;
    const draft = this._sm.sub.draft;
    if (!draft.name.trim()) return;

    const newName = draft.name.trim();
    const isEdit = !!draft.originalName;

    if (isEdit) {
      this.dispatchEvent(
        new CustomEvent('update-breeder', {
          detail: { oldName: draft.originalName, newName, logo: draft.logo },
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('save-breeder', { detail: { name: newName, logo: draft.logo } })
      );
    }

    this._sm = transition(this._sm, { type: 'BreederSaved' });
  }

  private _handleDeleteBreeder(breederName: string) {
    this._sm = transition(this._sm, { type: 'BreederDeleteRequested', name: breederName });
  }

  private _confirmDeleteBreeder() {
    if (this._sm.sub.kind !== 'breeder-confirm-delete') return;
    this.dispatchEvent(
      new CustomEvent('delete-breeder', { detail: { name: this._sm.sub.name } })
    );
    this._sm = transition(this._sm, { type: 'BreederDeleteConfirmed' });
  }

  private _cancelDeleteBreeder() {
    this._sm = transition(this._sm, { type: 'BreederDeleteCancelled' });
  }

  private _handleSeedfinderImport(e: CustomEvent): void {
    const data = e.detail;
    const gallery: StrainGalleryImage[] | undefined = data.images?.length
      ? data.images.map((url: string, i: number) => ({
          path: url,
          is_thumbnail: i === 0,
        }))
      : undefined;
    const merged = {
      ...this._sm.draft,
      ...data,
      ...(gallery ? { images: gallery, image: gallery[0].path } : {}),
    };
    // Apply merged fields individually via DraftFieldChanged
    for (const [key, value] of Object.entries(merged)) {
      if (merged[key as keyof typeof merged] !== this._sm.draft[key as keyof typeof this._sm.draft]) {
        this._sm = transition(this._sm, {
          type: 'DraftFieldChanged',
          field: key as keyof StrainEntry,
          value,
        });
      }
    }
    this._sm = transition(this._sm, { type: 'SeedfinderClosed' });
    this._dispatchStateChange();
    this.requestUpdate();
  }

  private _gallery(): StrainGalleryImage[] {
    return this._sm.draft.images ?? [];
  }

  private async _handleGalleryUpload(file: File): Promise<void> {
    this._sm = transition(this._sm, { type: 'SaveRequested' });
    try {
      const base64 = await PlantUtils.compressImage(file);
      const strain = this._sm.draft.strain ?? 'unknown';
      const phenotype = this._sm.draft.phenotype ?? 'default';
      const response = await this.hass.connection.sendMessagePromise<{ path: string }>({
        type: 'growspace_manager/upload_strain_image',
        strain,
        phenotype,
        image_base64: base64,
      });
      const gallery = [
        ...this._gallery(),
        { path: response.path, is_thumbnail: this._gallery().length === 0 },
      ];
      this._sm = transition(this._sm, {
        type: 'DraftFieldChanged',
        field: 'images',
        value: gallery,
      });
      if (gallery.length === 1) {
        this._sm = transition(this._sm, {
          type: 'DraftFieldChanged',
          field: 'image',
          value: response.path,
        });
      }
      this._dispatchStateChange();
    } catch (err) {
      console.error('Gallery upload failed:', err);
    } finally {
      this._sm = transition(this._sm, { type: 'SaveResolved' });
    }
  }

  private _handleSetThumbnail(index: number): void {
    const gallery = this._gallery().map((img, i) => ({ ...img, is_thumbnail: i === index }));
    const thumb = gallery[index];
    this._sm = transition(this._sm, { type: 'DraftFieldChanged', field: 'images', value: gallery });
    this._sm = transition(this._sm, { type: 'DraftFieldChanged', field: 'image', value: thumb.path });
    this._sm = transition(this._sm, {
      type: 'DraftFieldChanged',
      field: 'image_crop_meta',
      value: thumb.crop_meta,
    });
    this._dispatchStateChange();
  }

  private _handleRemoveGalleryImage(index: number): void {
    const prev = this._gallery();
    const wasThumb = prev[index].is_thumbnail;
    const gallery = prev.filter((_, i) => i !== index);
    if (wasThumb && gallery.length > 0) {
      gallery[0] = { ...gallery[0], is_thumbnail: true };
    }
    const thumb = gallery.find((img) => img.is_thumbnail);
    this._sm = transition(this._sm, { type: 'DraftFieldChanged', field: 'images', value: gallery });
    this._sm = transition(this._sm, {
      type: 'DraftFieldChanged',
      field: 'image',
      value: thumb?.path ?? '',
    });
    this._sm = transition(this._sm, {
      type: 'DraftFieldChanged',
      field: 'image_crop_meta',
      value: thumb?.crop_meta,
    });
    this._dispatchStateChange();
  }

  render() {
    const sub = this._sm.sub;
    return html`
      ${this.renderEditorView()}
      ${sub.kind === 'cropping' ? this.renderCropOverlay() : nothing}
      ${sub.kind === 'importing' ? this.renderImportDialog() : nothing}
      ${sub.kind === 'breeder-list' || sub.kind === 'breeder-editing' ? this.renderBreederDialog() : nothing}
      ${sub.kind === 'breeder-confirm-delete' ? this.renderBreederDeleteConfirmation() : nothing}
      ${sub.kind === 'seedfinder' ? this.renderSeedfinderDialog() : nothing}
    `;
  }

  private renderEditorView(): TemplateResult {
    const s = this._sm.draft;
    const isEdit =
      !!s.strain &&
      this.strains.some((ex) => ex.strain === s.strain && ex.phenotype === s.phenotype);
    const uniqueStrains = [...new Set(this.strains.map((st) => st.strain).filter(Boolean))].sort();
    const uniqueBreeders = [
      ...new Set(this.strains.map((st) => st.breeder).filter(Boolean)),
    ].sort();

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
            ${this._sm.history.length > 0
              ? ((this._sm.history[this._sm.history.length - 1] as StrainEntry).strain ?? 'Back')
              : 'Back'}
          </button>
          <h2 class="dialog-title">${isEdit ? 'Edit Strain' : 'Add New Strain'}</h2>
        </div>
        <button
          class="md3-button text close"
          @click=${() =>
            this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}
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
            ${this._renderGallery()}

            <div class="sd-form-group">
              <div
                style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;"
              >
                <label class="sd-label" style="margin-bottom:0;">Strain Name *</label>
                <button
                  class="md3-button text"
                  style="height:24px; padding:0 8px; font-size:0.75rem; color:var(--accent-green); min-width:auto;"
                  @click=${() => { this._sm = transition(this._sm, { type: 'SeedfinderOpened' }); }}
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
                @input=${(e: InputEvent) =>
                  this._handleEditorChange('phenotype', (e.target as HTMLInputElement).value)}
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
                    (
                      (e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement
                    ).click()}
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
                              let val =
                                Math.floor(parseFloat((e.target as HTMLInputElement).value)) || 0;
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
                              let val =
                                Math.floor(parseFloat((e.target as HTMLInputElement).value)) || 0;
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
                    this._handleEditorChange(
                      'flowering_days_min',
                      (e.target as HTMLInputElement).value
                    )}
                />
                <input
                  type="number"
                  class="sd-input"
                  placeholder="Max"
                  .value=${s.flowering_days_max || ''}
                  @input=${(e: InputEvent) =>
                    this._handleEditorChange(
                      'flowering_days_max',
                      (e.target as HTMLInputElement).value
                    )}
                />
              </div>
            </div>

            <div class="sd-form-group">
              <label
                class="sd-label"
                style="display:flex;align-items:center;justify-content:space-between;"
              >
                Lineage
                <div style="display:flex; gap:8px;">
                  <button
                    class="sd-btn-text"
                    type="button"
                    @click=${() => this._viewLineageInTree()}
                  >
                    View lineage
                  </button>
                  <button
                    class="sd-btn-text"
                    type="button"
                    @click=${async () => {
                      const entering = this._sm.sub.kind !== 'lineage-editing';
                      this._sm = transition(this._sm, {
                        type: entering ? 'LineageEditRequested' : 'LineageEditExited',
                      });
                      if (entering && s.strain) {
                        await this._loadStrainLineageTree(s.strain);
                      }
                    }}
                  >
                    ${this._sm.sub.kind === 'lineage-editing' ? 'View' : 'Edit tree'}
                  </button>
                </div>
              </label>
              ${this._sm.sub.kind === 'lineage-editing'
                ? html`<lineage-tree-editor
                    .node=${this._lineageTree}
                    .strainEntries=${(this.strains ?? [])
                      .map((st: StrainEntry) => ({
                        name:
                          st.strain ||
                          (st as unknown as Record<string, string>)['strain_name'] ||
                          '',
                        phenotype:
                          st.phenotype && st.phenotype !== 'default' ? st.phenotype : undefined,
                      }))
                      .filter((e) => !!e.name)}
                    @lineage-change=${async (e: CustomEvent) => {
                      const { parents } = e.detail;
                      if (!s.strain || !this.store) return;
                      const result = await this.store.actions.genetics.updateStrainLineageTree(
                        s.strain,
                        parents
                      );
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
                            const match = (this.strains ?? []).find(
                              (st: StrainEntry) => st.strain === e.detail.name
                            );
                            if (match) this._navigateToAncestor(match);
                          }}
                        ></lineage-tree>`
                      : html`<span
                          style="color:var(--secondary-text-color);font-size:12px;font-style:italic;"
                          >${s.lineage || 'No lineage recorded'}</span
                        >`}
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
                @input=${(e: InputEvent) =>
                  this._handleEditorChange('description', (e.target as HTMLTextAreaElement).value)}
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
          ${s.strain
            ? html`
                <button class="md3-button outlined" @click=${this._handlePrintLabel}>
                  <svg
                    style="width:18px;height:18px;fill:currentColor; margin-right:4px;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiDownload}"></path>
                  </svg>
                  Print Label
                </button>
              `
            : nothing}
          <button
            class="md3-button tonal"
            ?disabled=${this._sm.status.kind === 'applying'}
            @click=${() => this._goBack()}
          >
            Cancel
          </button>
          <button
            class="md3-button primary"
            ?disabled=${this._sm.status.kind === 'applying'}
            @click=${() => this._handleSave()}
          >
            ${this._sm.status.kind === 'applying'
              ? html`
                  <span
                    style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;margin-right:8px;flex-shrink:0;"
                  ></span>
                  Saving...
                `
              : html`
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiCheck}"></path>
                  </svg>
                  Save Strain
                `}
          </button>
        </div>
      </div>
    `;
  }

  private renderCropOverlay(): TemplateResult | typeof nothing {
    const s = this._sm.draft;
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
              background-image: url('${PlantUtils.encodeLocalPath(s.image)}');
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

  private _renderGallery(): TemplateResult {
    const gallery = this._gallery();
    const thumbIndex = gallery.findIndex((img) => img.is_thumbnail);

    const handleFileChange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this._handleGalleryUpload(file);
      (e.target as HTMLInputElement).value = '';
      this._sm = transition(this._sm, { type: 'PhotoMenuClosed' });
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file) this._handleGalleryUpload(file);
    };

    return html`
      <div class="sd-form-group" style="margin-bottom: 16px; position: relative;">
        <label class="sd-label">Photo Gallery</label>

        <div
          class="gallery-drop-area"
          style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-bottom: 8px;"
          @dragover=${(e: DragEvent) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'copy';
          }}
          @drop=${handleDrop}
        >
          ${gallery.map(
            (img, i) => html`
              <div
                style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 2px solid ${img.is_thumbnail
                  ? 'var(--accent-green, #4caf50)'
                  : 'rgba(255,255,255,0.1)'};"
              >
                <img
                  src="${PlantUtils.encodeLocalPath(img.path)}"
                  style="width:100%; height:100%; object-fit:cover;"
                />
                <div
                  style="position:absolute; top:0; left:0; right:0; display:flex; justify-content:space-between; padding:4px;"
                >
                  <button
                    title="${img.is_thumbnail ? 'Thumbnail' : 'Set as thumbnail'}"
                    style="background:rgba(0,0,0,0.6); border:none; padding:3px; border-radius:50%; cursor:pointer; color:${img.is_thumbnail
                      ? '#ffc107'
                      : 'white'};"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._handleSetThumbnail(i);
                    }}
                  >
                    <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${img.is_thumbnail ? mdiStar : mdiStarOutline}"></path>
                    </svg>
                  </button>
                  <button
                    title="Remove"
                    style="background:rgba(0,0,0,0.6); border:none; padding:3px; border-radius:50%; cursor:pointer; color:white;"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this._handleRemoveGalleryImage(i);
                    }}
                  >
                    <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiClose}"></path>
                    </svg>
                  </button>
                </div>
                ${img.is_thumbnail
                  ? html`
                      <button
                        title="Adjust crop"
                        style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.6); border:none; padding:3px; border-radius:50%; cursor:pointer; color:white;"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this._toggleCropMode(true);
                        }}
                      >
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${mdiContentCopy}"></path>
                        </svg>
                      </button>
                    `
                  : nothing}
              </div>
            `
          )}

          <!-- Add button — opens choice menu -->
          <button
            style="aspect-ratio:1; border-radius:8px; border:2px dashed rgba(255,255,255,0.2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:${this._sm.status.kind === 'applying'
              ? 'wait'
              : 'pointer'}; color:var(--secondary-text-color); font-size:0.75rem; background:none;"
            ?disabled=${this._sm.status.kind === 'applying'}
            @click=${() => {
              if (this._sm.status.kind !== 'applying') {
                this._sm = transition(this._sm, { type: 'PhotoMenuToggled' });
              }
            }}
          >
            ${this._sm.status.kind === 'applying'
              ? html`<div
                  style="width:20px;height:20px;border:2px solid rgba(255,255,255,0.2);border-top-color:var(--accent-green);border-radius:50%;animation:spin 1s linear infinite;"
                ></div>`
              : html`
                  <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiPlus}"></path>
                  </svg>
                  Add
                `}
          </button>

          <!-- Hidden inputs: one for camera, one for file picker -->
          <input
            id="gallery-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            style="display:none"
            @change=${handleFileChange}
          />
          <input
            id="gallery-library-input"
            type="file"
            accept="image/*"
            style="display:none"
            @change=${handleFileChange}
          />
        </div>

        ${thumbIndex >= 0 && gallery[thumbIndex]?.crop_meta
          ? html`
              <div style="font-size:0.75rem; color:var(--secondary-text-color); margin-top:4px;">
                Thumbnail crop applied · click ✂ to adjust
              </div>
            `
          : nothing}

        <!-- Add-photo choice menu -->
        ${this._sm.sub.kind === 'photo-menu'
          ? html`
              <div
                style="position:fixed; inset:0; z-index:500; background:rgba(0,0,0,0.5);"
                @click=${() => { this._sm = transition(this._sm, { type: 'PhotoMenuClosed' }); }}
              ></div>
              <div
                style="position:fixed; bottom:0; left:0; right:0; z-index:501; background:var(--card-background-color, #1e1e1e); border-radius:16px 16px 0 0; padding:16px 16px 32px; display:flex; flex-direction:column; gap:8px;"
              >
                <div
                  style="width:40px; height:4px; border-radius:2px; background:rgba(255,255,255,0.2); margin:0 auto 8px;"
                ></div>
                <button
                  style="display:flex; align-items:center; gap:16px; padding:16px; border-radius:12px; border:none; background:rgba(255,255,255,0.05); color:var(--primary-text-color,#fff); font-size:1rem; font-family:inherit; cursor:pointer; text-align:left;"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._sm = transition(this._sm, { type: 'PhotoMenuClosed' });
                    (
                      this.shadowRoot?.getElementById('gallery-camera-input') as HTMLInputElement
                    )?.click();
                  }}
                >
                  <svg
                    style="width:24px;height:24px;fill:var(--accent-green,#4caf50);flex-shrink:0;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiCamera}"></path>
                  </svg>
                  Take Photo
                </button>
                <button
                  style="display:flex; align-items:center; gap:16px; padding:16px; border-radius:12px; border:none; background:rgba(255,255,255,0.05); color:var(--primary-text-color,#fff); font-size:1rem; font-family:inherit; cursor:pointer; text-align:left;"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._sm = transition(this._sm, { type: 'PhotoMenuClosed' });
                    (
                      this.shadowRoot?.getElementById('gallery-library-input') as HTMLInputElement
                    )?.click();
                  }}
                >
                  <svg
                    style="width:24px;height:24px;fill:var(--accent-green,#4caf50);flex-shrink:0;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiImageMultiple}"></path>
                  </svg>
                  Choose from Library
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderImportDialog(): TemplateResult {
    const close = () => { this._sm = transition(this._sm, { type: 'ImportCancelled' }); };
    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="height: auto;">
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
                  .checked=${this._sm.sub.kind === 'importing' && !this._sm.sub.replace}
                  @change=${() => { if (this._sm.sub.kind === 'importing' && this._sm.sub.replace) this._sm = transition(this._sm, { type: 'ImportReplaceToggled' }); }}
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
                  .checked=${this._sm.sub.kind === 'importing' && this._sm.sub.replace}
                  @change=${() => { if (this._sm.sub.kind === 'importing' && !this._sm.sub.replace) this._sm = transition(this._sm, { type: 'ImportReplaceToggled' }); }}
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
              <button class="md3-button tonal" @click=${close}>Cancel</button>
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
    const close = () => { this._sm = transition(this._sm, { type: 'BreederDialogClosed' }); };

    return html`
      <ha-dialog
        open
        @closed=${close}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div class="glass-dialog-container" style="height: auto; max-height: 90vh;">
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
            ${this._sm.sub.kind === 'breeder-editing'
              ? this.renderBreederEditor()
              : this.renderBreederList(breeders)}
          </div>

          ${this._sm.sub.kind !== 'breeder-editing'
            ? html`
                <div class="sd-footer">
                  <span
                    style="font-size:0.8rem; color:var(--secondary-text-color); padding: 0 8px;"
                  >
                    Breeders appear automatically when strains with breeder info are saved.
                  </span>
                </div>
              `
            : nothing}
        </div>
      </ha-dialog>
    `;
  }

  private renderBreederList(
    breeders: Array<{ name: string; logo: string; strainCount: number }>
  ): TemplateResult {
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
        ${breeders.map(
          (b) => html`
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
                <div class="breeder-strain-count">
                  ${b.strainCount} strain${b.strainCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div class="breeder-actions">
                <button
                  class="sc-action-btn"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._startBreederEdit(b.name, b.logo);
                  }}
                >
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiPencil}"></path>
                  </svg>
                </button>
                <button
                  class="sc-action-btn"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._handleDeleteBreeder(b.name);
                  }}
                  style="color:var(--error-color, #f44336);"
                >
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiDelete}"></path>
                  </svg>
                </button>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderBreederEditor(): TemplateResult {
    const state = (this._sm.sub as Extract<typeof this._sm.sub, { kind: 'breeder-editing' }>).draft;
    const isEdit = !!state.originalName;
    const affectedStrains = isEdit
      ? this.strains.filter((s) => s.breeder === state.originalName)
      : [];

    const handleLogoUpload = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then((base64) => {
            this._sm = transition(this._sm, {
              type: 'BreederEditFieldChanged',
              field: 'logo',
              value: base64,
            });
          })
          .catch((err) => console.error('Error compressing logo:', err));
      }
    };

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <button
            class="md3-button tonal"
            style="padding:0 12px; height:32px;"
            @click=${() => { this._sm = transition(this._sm, { type: 'BreederSaved' }); }}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiArrowLeft}"></path>
            </svg>
            Back
          </button>
          <h3 style="margin:0; color:var(--primary-text-color);">
            ${isEdit ? 'Edit Breeder' : 'New Breeder'}
          </h3>
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Name *</label>
          <input
            type="text"
            class="sd-input"
            placeholder="e.g. Royal Queen Seeds"
            .value=${state.name}
            @input=${(e: InputEvent) => {
              this._sm = transition(this._sm, {
                type: 'BreederEditFieldChanged',
                field: 'name',
                value: (e.target as HTMLInputElement).value,
              });
            }}
          />
        </div>

        <div class="sd-form-group">
          <label class="sd-label">Breeder Logo</label>
          <div style="display:flex; align-items:center; gap:16px;">
            ${state.logo
              ? html`<img
                  src="${state.logo}"
                  style="width:64px; height:64px; object-fit:contain; border-radius:8px; background:rgba(255,255,255,0.05); padding:4px;"
                />`
              : html`<div
                  style="width:64px; height:64px; border:1px dashed var(--divider-color); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--secondary-text-color);"
                >
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiImage}"></path>
                  </svg>
                </div>`}
            <div style="display:flex; gap:8px;">
              <button
                class="md3-button tonal"
                style="height:36px; padding:0 16px; font-size:0.85rem;"
                @click=${(e: Event) =>
                  ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}
              >
                <svg
                  style="width:16px;height:16px;fill:currentColor;margin-right:6px;"
                  viewBox="0 0 24 24"
                >
                  <path d="${mdiCloudUpload}"></path>
                </svg>
                ${state.logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              <input
                type="file"
                accept="image/*"
                style="display:none"
                @change=${handleLogoUpload}
              />
              ${state.logo
                ? html`
                    <button
                      class="md3-button text"
                      style="height:36px; padding:0 12px; color:var(--error-color, #ff5252);"
                      @click=${() => {
                        this._sm = transition(this._sm, { type: 'BreederEditFieldChanged', field: 'logo', value: '' });
                      }}
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

        ${isEdit && affectedStrains.length > 0
          ? html`
              <div
                style="background:rgba(255,255,255,0.03); border:1px solid var(--divider-color); border-radius:8px; padding:16px;"
              >
                <label class="sd-label" style="margin-bottom:8px;"
                  >Strains using this breeder (${affectedStrains.length})</label
                >
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  ${affectedStrains.map(
                    (s) => html`
                      <span
                        style="background:rgba(76,175,80,0.15); color:var(--accent-green); padding:4px 10px; border-radius:16px; font-size:0.8rem; font-weight:500;"
                      >
                        ${s.strain}${s.phenotype ? ` (${s.phenotype})` : ''}
                      </span>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
          <button class="md3-button tonal" @click=${() => { this._sm = transition(this._sm, { type: 'BreederSaved' }); }}>
            Cancel
          </button>
          <button
            class="md3-button primary"
            @click=${() => this._handleSaveBreeder()}
            ?disabled=${!state.name.trim()}
          >
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiCheck}"></path>
            </svg>
            ${isEdit ? 'Save Changes' : 'Create Breeder'}
          </button>
        </div>
      </div>
    `;
  }

  private renderBreederDeleteConfirmation(): TemplateResult {
    const breederName = (this._sm.sub as Extract<typeof this._sm.sub, { kind: 'breeder-confirm-delete' }>).name;
    const affectedCount = this.strains.filter((s) => s.breeder === breederName).length;

    return html`
      <ha-dialog
        open
        @closed=${this._cancelDeleteBreeder}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div
          class="glass-dialog-container"
          style="height: auto; padding: 24px; display: flex; flex-direction: column;"
        >
          <h2 class="dialog-title">Remove Breeder?</h2>
          <p
            style="color:var(--secondary-text-color); margin:16px 0; font-size:1rem; line-height:1.5;"
          >
            This will remove <strong>"${breederName}"</strong> from ${affectedCount}
            strain${affectedCount !== 1 ? 's' : ''}. The strains themselves will not be deleted.
          </p>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
            <button class="md3-button tonal" @click=${this._cancelDeleteBreeder}>Cancel</button>
            <button
              class="md3-button text"
              style="color:#f44336;"
              @click=${this._confirmDeleteBreeder}
            >
              <svg
                style="width:18px;height:18px;fill:currentColor;margin-right:8px;"
                viewBox="0 0 24 24"
              >
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
        .open=${this._sm.sub.kind === 'seedfinder'}
        .initialStrain=${this._sm.draft.strain}
        .initialPheno=${this._sm.draft.phenotype}
        @close=${() => { this._sm = transition(this._sm, { type: 'SeedfinderClosed' }); }}
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

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
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
