import { LitElement, html, css, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiPlus, mdiClose, mdiMagnify, mdiDelete, mdiCheck,
  mdiContentCopy, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant,
  mdiLeaf, mdiArrowLeft, mdiCloudUpload, mdiPencil,
  mdiDownload, mdiBrain, mdiCamera, mdiImage, mdiViewDashboard,
  mdiChevronLeft, mdiChevronRight, mdiDotsVertical
} from '@mdi/js';
import { StrainEntry, CropMeta } from '../types';
import { PlantUtils } from '../utils';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';

@customElement('strain-library-dialog')
export class StrainLibraryDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) strains: StrainEntry[] = [];

  @state() private _view: 'browse' | 'editor' = 'browse';
  @state() private _searchQuery = '';
  @state() private _editorState: Partial<StrainEntry> = {};
  @state() private _isCropping = false;
  @state() private _isImageSelectorOpen = false;
  @state() private _importDialogOpen = false;
  @state() private _mobileMenuOpen = false;

  @state() private _importReplace = false;

  // Pagination State
  @state() private _currentPage = 1;
  private readonly ITEMS_PER_PAGE = 15;

  static styles = [
    dialogStyles,
    css`
    :host {
      --accent-green: #4CAF50;
      /* Using dialogStyles variables where possible */
    }

    /* Additional specific styles */
    
    /* Layout Overrides */
    .strain-dialog-container {
        @apply .glass-dialog-container; 
        /* Since we can't use @apply in standard css without processor, we must duplicate or rely on .glass-dialog-container class in render */
        /* But we will use the class in render */
    }

    .glass-dialog-container {
        width: 80vw;
        max-width: 95vw;
        height: 85vh;
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
        background: rgba(0,0,0,0.2);
        border-top: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    /* GRID & CARDS */
    .sd-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .strain-card {
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.05);
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        cursor: pointer;
    }
    .strain-card:hover {
        border-color: var(--accent-green);
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    }
    .sc-thumb {
        height: 180px;
        background: #222;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #444;
        position: relative;
    }
    .sc-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .sc-content {
        padding: 16px;
        flex: 1;
    }
    .sc-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: #fff;
    }
    .sc-type-row {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--accent-green);
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 12px;
    }
    .sc-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
    }
    .sc-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s;
    }
    .strain-card:hover .sc-actions {
        opacity: 1;
    }
    .sc-action-btn {
        background: rgba(0,0,0,0.6);
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

    /* SEARCH BAR */
    .search-bar-container {
        margin-bottom: 24px;
    }
    .search-input-wrapper {
        position: relative;
        margin-bottom: 12px;
    }
    .search-input-wrapper svg {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color);
        pointer-events: none;
    }
    .search-bar-input {
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 14px 14px 14px 48px;
        color: #fff;
        font-size: 1rem;
        outline: none;
        box-sizing: border-box;
        font-family: inherit;
    }
    .search-bar-input:focus {
        border-color: var(--accent-green);
        background: rgba(255,255,255,0.08);
    }
    
    /* EDITOR LAYOUT */
    .editor-layout {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 32px;
    }
    @media (max-width: 800px) {
        .editor-layout { grid-template-columns: 1fr; }
    }

    /* PHOTO UPLOAD */
    .photo-upload-area {
        border: 2px dashed rgba(255,255,255,0.1);
        border-radius: 12px;
        background: rgba(255,255,255,0.02);
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
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(255,255,255,0.2);
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
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9);
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
        box-shadow: 0 0 0 100vmax rgba(0,0,0,0.7);
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
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
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
        background: rgba(76, 175, 80, 0.1);
        border-color: var(--accent-green);
        color: #fff;
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
        color: #fff;
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
        border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer;
    }
    .hg-bar-indica {
        background: #8B5CF6; /* Purple */
        height: 100%;
        transition: width 0.2s ease;
    }
    .hg-bar-sativa {
        background: #EAB308; /* Yellow */
        height: 100%;
        flex: 1;
        transition: width 0.2s ease;
    }
    .hg-tick {
        position: absolute;
        top: 0; bottom: 0;
        width: 1px;
        background: rgba(255,255,255,0.4);
        pointer-events: none;
    }
    
    .hg-num-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--secondary-text-color);
        color: #fff;
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
    
    /* Pagination */
    .pagination-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-top: 24px;
        padding-bottom: 8px;
    }
    .pagination-text {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        font-weight: 500;
    }
    .pagination-btn {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: #fff;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
    }
    .pagination-btn:hover:not(:disabled) {
        border-color: var(--accent-green);
        color: var(--accent-green);
        background: rgba(255,255,255,0.1);
    }
    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: transparent;
    }

    /* Mobile Responsive */
     @media (max-width: 600px) {
       .glass-dialog-container {
         width: 95vw;
         height: 90vh;
         max-width: 95vw;
       }
       .sd-header { padding: 16px; }
       .sd-content { padding: 16px; }
       .sd-grid { grid-template-columns: 1fr; }
       .sd-footer { display: none; }
     }
     
     .fab-btn {
        position: absolute;
        bottom: 24px; right: 24px;
        width: 56px; height: 56px;
        border-radius: 16px;
        background: var(--accent-green);
        color: #fff;
        border: none;
        box-shadow: 0 4px 8px 3px rgba(0,0,0,0.15);
        display: none; /* Hidden on desktop */
        align-items: center; justify-content: center;
        cursor: pointer;
        z-index: 20;
     }

     .sd-textarea {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          color: #fff;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
          font-size: 1rem; 
     }
     .sd-textarea:focus {
        border-color: var(--accent-green);
        outline: none;
        background: rgba(255,255,255,0.08);
     }
     
     /* Mobile menu */
     .mobile-menu {
        position: absolute;
        top: 60px; right: 16px;
        background: #2d2d2d;
        border-radius: 4px;
        padding: 8px 0;
        min-width: 200px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.5);
        z-index: 30;
      }
      .mobile-menu-item {
        padding: 12px 16px;
        display: flex; align-items: center; gap: 12px;
        color: #fff; cursor: pointer;
      }
      .mobile-menu-item:hover { background: rgba(255,255,255,0.08); }
      .mobile-menu-item svg { width: 20px; height: 20px; fill: var(--secondary-text-color); }
      .menu-overlay { position: absolute; inset:0; z-index: 25; }
      
      /* Mobile Button Visibility */
      @media (max-width: 600px) {
        .fab-btn { display: flex; }
      }
    `
  ];

  private _startEdit(strain?: StrainEntry) {
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
        sativa_percentage: 50,
        indica_percentage: 50
      };
    }
    this._view = 'editor';
  }

  private _handleSave() {
    if (!this._editorState.strain) return;
    this.dispatchEvent(new CustomEvent('save-strain', { detail: this._editorState }));
    this._view = 'browse';
  }

  private _handleDelete(key: string) {
    if (confirm('Are you sure you want to delete this strain?')) {
      this.dispatchEvent(new CustomEvent('delete-strain', { detail: { key } }));
    }
  }

  private _handleEditorChange(field: string, value: any) {
    this._editorState = { ...this._editorState, [field]: value };
  }

  private _toggleCropMode(active: boolean) {
    this._isCropping = active;
  }

  private _toggleImageSelector(isOpen: boolean) {
    this._isImageSelectorOpen = isOpen;
  }

  private _handleSelectLibraryImage(imageUrl: string) {
    this._editorState = { ...this._editorState, image: imageUrl };

    // Find existing crop meta
    const existing = this.strains.find(s => s.image === imageUrl && !!s.image_crop_meta);
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
        this.dispatchEvent(new CustomEvent('import-library', {
          detail: { file, replace: this._importReplace }
        }));
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

  private getImgStyle(meta?: CropMeta): string {
    if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
    return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
  }

  render() {
    if (!this.open) return nothing;

    return html`
      <ha-dialog
        open
        @closed=${() => this.dispatchEvent(new CustomEvent('close'))}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container">
          ${this._view === 'browse' ? this.renderBrowseView() : this.renderEditorView()}
        </div>

        ${this._isCropping ? this.renderCropOverlay() : nothing}
        ${this._isImageSelectorOpen ? this.renderImageSelector() : nothing}
        ${this._importDialogOpen ? this.renderImportDialog() : nothing}
      </ha-dialog>
    `;
  }

  private renderBrowseView(): TemplateResult {
    const query = this._searchQuery.toLowerCase();
    const filteredStrains = this.strains.filter(s =>
      s.strain.toLowerCase().includes(query) ||
      (s.breeder && s.breeder.toLowerCase().includes(query)) ||
      (s.phenotype && s.phenotype.toLowerCase().includes(query))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredStrains.length / this.ITEMS_PER_PAGE);

    if (this._currentPage > totalPages && totalPages > 0) {
      this._currentPage = totalPages;
    }
    if (this._currentPage < 1) this._currentPage = 1;

    const startIndex = (this._currentPage - 1) * this.ITEMS_PER_PAGE;
    const paginatedStrains = filteredStrains.slice(startIndex, startIndex + this.ITEMS_PER_PAGE);

    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
            <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiLeaf}"></path></svg>
        </div>
        <div class="dialog-title-group">
            <h2 class="dialog-title">Strain Library</h2>
        </div>
        
        <div class="header-actions" style="display:flex; gap:8px;">
            <button class="md3-button text" @click=${() => this._mobileMenuOpen = !this._mobileMenuOpen} style="min-width:auto; padding:8px; display: none;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
            </button>
            <style>@media(max-width:600px){ button[style*="mdiDotsVertical"] { display: flex !important; } }</style>
            
            <button class="md3-button text" @click=${() => this.dispatchEvent(new CustomEvent('close'))} style="min-width:auto; padding:8px;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
            </button>
        </div>
      </div>

      <div class="sd-content">
        <div class="search-bar-container">
          <div class="search-input-wrapper">
             <md3-text-input 
                placeholder="Search Strains by Name, Breeder..."
                .value=${this._searchQuery}
                @change=${(e: CustomEvent) => {
        this._searchQuery = e.detail;
        this._currentPage = 1;
      }}
             ></md3-text-input>
          </div>
        </div>

        <div class="sd-grid">
          ${paginatedStrains.map(strain => this.renderStrainCard(strain))}
        </div>

        ${filteredStrains.length === 0 ? html`
          <div style="text-align:center; padding: 40px; color: var(--secondary-text-color);">
            <svg style="width:48px;height:48px;fill:currentColor; opacity:0.5;" viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
            <p>No strains found matching "${query}"</p>
          </div>
        ` : nothing}

        ${totalPages > 1 ? html`
            <div class="pagination-container">
                <button 
                    class="pagination-btn" 
                    ?disabled=${this._currentPage === 1}
                    @click=${() => this._currentPage--}
                >
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronLeft}"></path></svg>
                </button>
                <span class="pagination-text">Page ${this._currentPage} of ${totalPages}</span>
                <button 
                    class="pagination-btn" 
                    ?disabled=${this._currentPage === totalPages}
                    @click=${() => this._currentPage++}
                >
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronRight}"></path></svg>
                </button>
            </div>
        ` : nothing}
      </div>

      <!-- Mobile Menu Dropdown -->
      ${this._mobileMenuOpen ? html`
        <div class="menu-overlay" @click=${() => this._mobileMenuOpen = false}></div>
        <div class="mobile-menu">
            <div class="mobile-menu-item" @click=${() => { this.dispatchEvent(new CustomEvent('get-recommendation')); this._mobileMenuOpen = false; }}>
                <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg> Get Recommendation
            </div>
            <div class="mobile-menu-item" @click=${() => { this._importDialogOpen = true; this._mobileMenuOpen = false; }}>
                <svg viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg> Import Strains
            </div>
            <div class="mobile-menu-item" @click=${() => { this.dispatchEvent(new CustomEvent('export-library')); this._mobileMenuOpen = false; }}>
                <svg viewBox="0 0 24 24"><path d="${mdiDownload}"></path></svg> Export Strains
            </div>
        </div>
      ` : nothing}

      <!-- Mobile FAB -->
      <button class="fab-btn" @click=${() => this._startEdit()}>
        <svg style="fill:currentColor; width: 24px; height: 24px;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
      </button>

      <div class="sd-footer">
        <button class="md3-button tonal" @click=${() => this.dispatchEvent(new CustomEvent('get-recommendation'))}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
          Get Recommendation
        </button>
        <button class="md3-button tonal" @click=${() => this._importDialogOpen = true}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
          Import Strains
        </button>
        <button class="md3-button tonal" @click=${() => this.dispatchEvent(new CustomEvent('export-library'))}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDownload}"></path></svg>
          Export Strains
        </button>
        <button class="md3-button primary" @click=${() => this._startEdit()}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
          New Strain
        </button>
      </div>
    `;
  }

  private renderStrainCard(strain: StrainEntry): TemplateResult {
    let typeIcon = mdiLeaf;
    let typeLabel = strain.type || 'Unknown';
    const lowerType = (strain.type || '').toLowerCase();

    if (lowerType.includes('indica')) typeIcon = mdiWeatherNight;
    else if (lowerType.includes('sativa')) typeIcon = mdiWeatherSunny;
    else if (lowerType.includes('hybrid')) typeIcon = mdiTuneVariant;

    return html`
      <div class="strain-card" @click=${() => this._startEdit(strain)}>
        <div class="sc-thumb">
          ${strain.image
        ? html`<img src="${strain.image}" loading="lazy" alt="${strain.strain}" style="${this.getImgStyle(strain.image_crop_meta)}" />`
        : html`<svg style="width:48px;height:48px;opacity:0.2;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiLeaf}"></path></svg>`
      }
          <div class="sc-actions">
            <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); this._handleDelete(strain.key); }}>
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
            </button>
          </div>
        </div>
        <div class="sc-content">
          <h3 class="sc-title">${strain.strain} ${strain.phenotype ? `(${strain.phenotype})` : ''}</h3>
          <div class="sc-type-row">
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${typeIcon}"></path></svg>
            <span>${typeLabel}</span>
          </div>
          <div class="sc-meta">
            ${strain.flowering_days_min ? html`<span>Flowering: ${strain.flowering_days_min}-${strain.flowering_days_max || '?'} Days</span>` : nothing}
            ${strain.breeder ? html`<span>Breeder: ${strain.breeder}</span>` : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderEditorView(): TemplateResult {
    const s = this._editorState;
    const isEdit = !!s.strain && this.strains.some(ex => ex.strain === s.strain && ex.phenotype === s.phenotype);
    const uniqueStrains = [...new Set(this.strains.map(st => st.strain).filter(Boolean))].sort();
    const uniqueBreeders = [...new Set(this.strains.map(st => st.breeder).filter(Boolean))].sort();

    const handleFileChange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        PlantUtils.compressImage(file)
          .then(base64 => this._handleEditorChange('image', base64))
          .catch(err => console.error("Error compressing image:", err));
      }
    };

    return html`
      <datalist id="strain-suggestions">
        ${uniqueStrains.map(name => html`<option value="${name}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
        ${uniqueBreeders.map(name => html`<option value="${name}"></option>`)}
      </datalist>

      <div class="dialog-header">
         <div style="display:flex; align-items:center; gap:16px;">
           <button class="md3-button tonal" style="padding: 0 12px; height: 32px;" @click=${() => this._view = 'browse'}>
             <svg style="width:18px;height:18px;fill:currentColor; margin-right:4px;" viewBox="0 0 24 24"><path d="${mdiArrowLeft}"></path></svg>
             Back
           </button>
           <h2 class="dialog-title">${isEdit ? 'Edit Strain' : 'Add New Strain'}</h2>
         </div>
         <button class="md3-button text" @click=${() => this.dispatchEvent(new CustomEvent('close'))} style="min-width:auto; padding:8px;">
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
        <div class="editor-layout">
          <!-- LEFT COL: IDENTITY -->
          <div class="editor-col">
            <div class="photo-upload-area"
                @click=${(e: Event) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.crop-btn') && !target.closest('.select-library-btn') && !target.closest('.md3-button')) {
          (e.currentTarget as HTMLElement).querySelector('input')?.click();
        }
      }}
                @dragover=${(e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'copy'; }}
                @drop=${(e: DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) {
          PlantUtils.compressImage(file)
            .then(base64 => this._handleEditorChange('image', base64))
            .catch(err => console.error("Error compressing image:", err));
        }
      }}>

              <button class="select-library-btn" @click=${(e: Event) => {
        e.stopPropagation();
        this._toggleImageSelector(true);
      }}>
                  <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
                  Select from Library
              </button>

              ${s.image ? html`
                ${s.image_crop_meta
          ? html`<div style="width:100%; height:100%; border-radius:10px; ${this.getCropStyle(s.image, s.image_crop_meta)}; background-repeat: no-repeat;"></div>`
          : html`<img src="${s.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`}

                <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                    <button class="crop-btn"
                            style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                            @click=${(e: Event) => { e.stopPropagation(); this._toggleCropMode(true); }}
                            title="Crop Image">
                      <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
                    </button>
                    <div style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;">
                      <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                    </div>
                </div>
              ` : html`
                <div style="display: flex; gap: 16px; align-items: center;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                      <button class="md3-button tonal" @click=${(e: Event) => ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}>
                        <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCamera}"></path></svg>
                        Camera
                      </button>
                      <input type="file" accept="image/*" capture="environment" style="display:none" @change=${handleFileChange} />
                  </div>
                  
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                      <button class="md3-button tonal" @click=${(e: Event) => ((e.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement).click()}>
                        <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiImage}"></path></svg>
                        Gallery
                      </button>
                      <input type="file" accept="image/*" style="display:none" @change=${handleFileChange} />
                  </div>
                </div>
                <span style="font-size:0.8rem; margin-top:12px; opacity: 0.7;">(Or Drag & Drop)</span>
              `}
            </div>

            <md3-text-input 
              label="Strain Name *" 
              .value=${s.strain || ''}
              list="strain-suggestions"
              @change=${(e: CustomEvent) => this._handleEditorChange('strain', e.detail)}>
            </md3-text-input>

            <md3-text-input 
              label="Phenotype"
              placeholder="e.g. #1 (Optional)" 
              .value=${s.phenotype || ''} 
              @change=${(e: CustomEvent) => this._handleEditorChange('phenotype', e.detail)}>
            </md3-text-input>

            <md3-text-input 
              label="Breeder/Seedbank"
              list="breeder-suggestions"
              .value=${s.breeder || ''} 
              @change=${(e: CustomEvent) => this._handleEditorChange('breeder', e.detail)}>
            </md3-text-input>
            
          </div>

          <!-- RIGHT COL: GENETICS -->
          <div class="editor-col">
            <div style="margin-bottom: 20px;">
              <label class="md3-label" style="display:block; margin-bottom:8px; color:var(--secondary-text-color);">Type *</label>
              <div class="type-selector-grid">
                ${['Indica', 'Sativa', 'Hybrid', 'Ruderalis'].map(t => {
            let icon = mdiLeaf;
            if (t === 'Indica') icon = mdiWeatherNight;
            if (t === 'Sativa') icon = mdiWeatherSunny;
            if (t === 'Hybrid') icon = mdiTuneVariant;

            const isActive = (s.type || '').toLowerCase() === t.toLowerCase();
            return html`
                    <div class="type-option ${isActive ? 'active' : ''}"
                        @click=${() => this._handleEditorChange('type', t)}>
                      <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                      <span class="type-label" style="font-size:0.85rem; font-weight:500;">${t}</span>
                    </div>
                  `;
          })}
              </div>
            </div>

            ${(s.type || '').toLowerCase() === 'hybrid' ? html`
              <div style="margin-bottom: 20px;">
                <label class="md3-label" style="display:block; margin-bottom:8px; color:var(--secondary-text-color);">Hybrid Composition (%)</label>
                <div class="hg-container" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                  <div class="hg-labels">
                    <div class="hg-input-label" style="display:flex; align-items:center; gap:4px;">
                      <span>Indica:</span>
                      <input class="hg-num-input" type="number" min="0" max="100"
                        .value=${s.indica_percentage || 0}
                        @input=${(e: any) => {
          let val = Math.floor(parseFloat(e.target.value)) || 0;
          if (val < 0) val = 0; if (val > 100) val = 100;
          this._handleEditorChange('indica_percentage', val);
          this._handleEditorChange('sativa_percentage', 100 - val);
        }} />
                      <span>%</span>
                    </div>
                    <div class="hg-input-label" style="display:flex; align-items:center; gap:4px;">
                      <span>Sativa:</span>
                      <input class="hg-num-input" type="number" min="0" max="100"
                        .value=${s.sativa_percentage || 0}
                        @input=${(e: any) => {
          let val = Math.floor(parseFloat(e.target.value)) || 0;
          if (val < 0) val = 0; if (val > 100) val = 100;
          this._handleEditorChange('sativa_percentage', val);
          this._handleEditorChange('indica_percentage', 100 - val);
        }} />
                      <span>%</span>
                    </div>
                  </div>

                  <div class="hg-bar-track"
                        @click=${(e: MouseEvent) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          let percent = Math.round((x / rect.width) * 100);
          if (percent < 0) percent = 0; if (percent > 100) percent = 100;
          this._handleEditorChange('indica_percentage', percent);
          this._handleEditorChange('sativa_percentage', 100 - percent);
        }}>
                    <div class="hg-bar-indica" style="width: ${s.indica_percentage || 0}%"></div>
                    <div class="hg-bar-sativa"></div>
                    <div class="hg-tick" style="left: 25%"></div>
                    <div class="hg-tick" style="left: 50%"></div>
                    <div class="hg-tick" style="left: 75%"></div>
                  </div>
                </div>
              </div>
            ` : nothing}

            <div style="display:flex; gap:16px; margin-bottom: 20px;">
                <div style="flex:1">
                    <md3-number-input 
                        label="Min Flowering Days" 
                        .value=${s.flowering_days_min || ''} 
                         @change=${(e: CustomEvent) => this._handleEditorChange('flowering_days_min', e.detail)}>
                    </md3-number-input>
                </div>
                <div style="flex:1">
                    <md3-number-input 
                        label="Max Flowering Days" 
                        .value=${s.flowering_days_max || ''} 
                         @change=${(e: CustomEvent) => this._handleEditorChange('flowering_days_max', e.detail)}>
                    </md3-number-input>
                </div>
            </div>

            <md3-text-input 
                label="Lineage" 
                .value=${s.lineage || ''} 
                @change=${(e: CustomEvent) => this._handleEditorChange('lineage', e.detail)}>
            </md3-text-input>

            <div style="margin-bottom: 20px;">
              <label class="md3-label" style="display:block; margin-bottom:8px; color:var(--secondary-text-color);">Sex</label>
              <div style="display:flex; gap:20px; padding: 8px 0;">
                ${['Feminized', 'Regular'].map(sex => html`
                  <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                    <input type="radio" name="sex_radio"
                          .checked=${s.sex === sex}
                          @change=${() => this._handleEditorChange('sex', sex)}
                          style="accent-color: var(--accent-green); transform: scale(1.2);" />
                    ${sex}
                  </label>
                `)}
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <label class="md3-label" style="display:block; margin-bottom:8px; color:var(--secondary-text-color);">Description</label>
              <textarea class="sd-textarea" 
                .value=${s.description || ''} 
                @input=${(e: any) => this._handleEditorChange('description', e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="sd-footer">
        <button class="md3-button tonal" @click=${() => this._view = 'browse'}>Cancel</button>
        <button class="md3-button primary" @click=${() => this._handleSave()}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
          Save Strain
        </button>
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
        let newX = Math.min(Math.max(startMetaX + deltaX, 0), 100);
        let newY = Math.min(Math.max(startMetaY + deltaY, 0), 100);
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
        <div class="crop-viewport"
              @wheel=${handleWheel}
              @mousedown=${handleMouseDown}
              @dragstart=${(e: DragEvent) => e.preventDefault()}>
          <div style="width: 100%; height: 100%;
              background-image: url('${s.image}');
              background-size: ${meta.scale * 100}%;
              background-position: ${meta.x}% ${meta.y}%;
              background-repeat: no-repeat;
              pointer-events: none;">
          </div>
        </div>

        <div class="crop-controls">
          <div style="display:flex; justify-content:space-between; color:#ccc; font-size:0.8rem;">
            <span>Zoom: ${(meta.scale * 100).toFixed(0)}%</span>
          </div>
          <input type="range" class="crop-slider" min="1" max="5" step="0.1"
                  .value=${meta.scale.toString()}
                  @input=${(e: Event) => this._handleEditorChange('image_crop_meta', { ...meta, scale: parseFloat((e.target as HTMLInputElement).value) })} />

          <div style="display:flex; gap:12px; margin-top:12px;">
            <button class="md3-button tonal" style="flex:1" @click=${() => this._toggleCropMode(false)}>Done</button>
          </div>
          <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
            Drag to pan • Scroll to zoom
          </div>
        </div>
      </div>
    `;
  }

  private renderImageSelector(): TemplateResult {
    const imageMap = new Map<string, { strain: string, phenotype: string }[]>();
    this.strains.forEach(s => {
      if (s.image) {
        if (!imageMap.has(s.image)) {
          imageMap.set(s.image, []);
        }
        imageMap.get(s.image)!.push({ strain: s.strain, phenotype: s.phenotype || '' });
      }
    });

    return html`
      <div class="crop-overlay">
        <div class="glass-dialog-container" style="width: 80%; max-width: 800px; height: 80%; max-height: 600px;">
          <div class="dialog-header">
            <h2 class="dialog-title">Select from Library</h2>
            <button class="md3-button text" @click=${() => this._toggleImageSelector(false)} style="min-width:auto; padding:8px;">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
            </button>
          </div>
          <div class="sd-content" style="overflow-y: auto;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
              ${[...imageMap.entries()].map(([img, infoList]) => html`
                <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                      @click=${() => this._handleSelectLibraryImage(img)}>
                  <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                  <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                    ${infoList.map((info, index) => html`
                      <div style="${index < infoList.length - 1 ? 'margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);' : ''}">
                        <div style="font-weight: 700;">Strain: ${info.strain}</div>
                        <div style="opacity: 0.9;">Pheno: ${info.phenotype || 'N/A'}</div>
                      </div>
                    `)}
                  </div>
                </div>
              `)}
            </div>
            ${imageMap.size === 0 ? html`<p style="text-align: center; color: var(--secondary-text-color); margin-top: 40px;">No images found in library.</p>` : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderImportDialog(): TemplateResult {
    return html`
      <div class="crop-overlay">
        <div class="glass-dialog-container" style="width: 400px; max-width: 90vw; height: auto;">
          <div class="dialog-header">
            <h2 class="dialog-title">Import Strains</h2>
            <button class="md3-button text" @click=${() => this._importDialogOpen = false} style="min-width:auto; padding:8px;">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
            </button>
          </div>
          
          <div style="padding: 24px;">
            <div style="font-size: 0.9rem; color: var(--secondary-text-color); line-height: 1.5; margin-bottom: 20px;">
                Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
            </div>

            <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <input type="radio" name="import_mode"
                        .checked=${!this._importReplace}
                        @change=${() => this._importReplace = false}
                        style="accent-color: var(--accent-green); transform: scale(1.2);" />
                <div>
                    <div style="font-weight: 600;">Merge</div>
                    <div style="font-size: 0.8rem; color: var(--secondary-text-color);">Add new strains, keep existing ones.</div>
                </div>
                </label>

                <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>

                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                <input type="radio" name="import_mode"
                        .checked=${this._importReplace}
                        @change=${() => this._importReplace = true}
                        style="accent-color: var(--accent-green); transform: scale(1.2);" />
                <div>
                    <div style="font-weight: 600;">Replace</div>
                    <div style="font-size: 0.8rem; color: var(--secondary-text-color);">Overwrite entire library with import.</div>
                </div>
                </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                <button class="md3-button tonal" @click=${() => this._importDialogOpen = false}>
                Cancel
                </button>
                <button class="md3-button primary" @click=${() => this._handleImportFile()}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
                Select File
                </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
