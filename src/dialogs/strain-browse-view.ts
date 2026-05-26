import { LitElement, html, css, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiPlus,
  mdiClose,
  mdiMagnify,
  mdiDelete,
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiTuneVariant,
  mdiLeaf,
  mdiCloudUpload,
  mdiDownload,
  mdiBrain,
  mdiChevronLeft,
  mdiChevronRight,
  mdiDotsVertical,
  mdiAccountGroup,
  mdiFileUpload,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { StrainEntry } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import type { LibraryFilter } from './gs-filter-chips';
import './gs-filter-chips';
import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/gs-help-tooltip';

@customElement('strain-browse-view')
export class StrainBrowseView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ attribute: false }) activePlantCounts: Record<string, number> = {};
  @property({ type: String }) libraryFilter: LibraryFilter = 'library';

  @state() private _searchQuery = '';
  @state() private _currentPage = 1;
  @state() private _mobileMenuOpen = false;
  @state() private _pendingDeleteKey: string | null = null;

  private readonly ITEMS_PER_PAGE = 15;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: contents;
        --accent-green: #4caf50;
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

      /* GRID & CARDS */
      .sd-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }

      .strain-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.05));
        transition: all 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        cursor: pointer;
      }

      .strain-card:hover {
        border-color: var(--accent-green);
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
      }

      .sc-thumb {
        height: 180px;
        background: var(--card-background-color, #222);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text-color, #444);
        position: relative;
        overflow: hidden;
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
        color: var(--primary-text-color, #fff);
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

      @media (hover: none) {
        .sc-actions {
          opacity: 1;
        }
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

      /* SEARCH BAR */
      .search-bar-container {
        margin-bottom: 24px;
      }

      .search-input-wrapper {
        position: relative;
        margin-bottom: 12px;
      }

      /* PAGINATION */
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
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        color: var(--primary-text-color, #fff);
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
        background: rgba(255, 255, 255, 0.1);
      }

      .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: transparent;
      }

      /* MOBILE MENU */
      .mobile-menu {
        position: absolute;
        top: 60px;
        right: 16px;
        background: var(--card-background-color, #2d2d2d);
        border-radius: 4px;
        padding: 8px 0;
        min-width: 200px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        z-index: 30;
      }

      .mobile-menu-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--primary-text-color, #fff);
        cursor: pointer;
      }

      .mobile-menu-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .mobile-menu-item svg {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color);
      }

      .menu-overlay {
        position: absolute;
        inset: 0;
        z-index: 25;
      }

      /* FAB */
      .fab-btn {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: var(--accent-green);
        color: #fff;
        border: none;
        box-shadow: 0 4px 8px 3px rgba(0, 0, 0, 0.15);
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 20;
      }

      /* DELETE OVERLAY */
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

      @media (max-width: 600px) {
        .sd-grid {
          grid-template-columns: 1fr;
        }

        .sd-footer {
          display: none;
        }

        .fab-btn {
          display: flex;
        }
      }
    `,
  ];

  render() {
    const query = (this._searchQuery || '').toLowerCase();
    const terms = query.split(/\s+/).filter((t) => t.length > 0);

    const filteredStrains = this._applyFilter(this.strains)
      .filter((s) => {
        if (terms.length === 0) return true;
        const text = `${s.strain} ${s.breeder || ''} ${s.phenotype || ''}`.toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .sort((a, b) => a.strain.localeCompare(b.strain));

    const totalPages = Math.ceil(filteredStrains.length / this.ITEMS_PER_PAGE);
    if (this._currentPage > totalPages && totalPages > 0) this._currentPage = totalPages;
    if (this._currentPage < 1) this._currentPage = 1;

    const start = (this._currentPage - 1) * this.ITEMS_PER_PAGE;
    const paged = filteredStrains.slice(start, start + this.ITEMS_PER_PAGE);

    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
          <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiLeaf}"></path>
          </svg>
        </div>
        <div class="dialog-title-group">
          <div style="display:flex;align-items:center;gap:6px;">
            <h2 class="dialog-title">Strain Library</h2>
            <gs-help-tooltip
              content="Browse and manage your strain database. Assign genetics to plants for tracking lineage and expected traits."
              placement="bottom"
              label="Strain Library"
            ></gs-help-tooltip>
          </div>
        </div>
        <div class="header-actions" style="display:flex; gap:8px;">
          <button
            class="md3-button text"
            @click=${() => (this._mobileMenuOpen = !this._mobileMenuOpen)}
            style="min-width:auto; padding:8px; margin-left: auto;"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDotsVertical}"></path>
            </svg>
          </button>
          <button
            class="md3-button text close"
            @click=${() => this.dispatchEvent(new CustomEvent('close'))}
            style="min-width:auto; padding:8px; margin-left: auto;"
          >
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiClose}"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="sd-content">
        <gs-filter-chips
          .filter=${this.libraryFilter}
          @filter-changed=${(e: CustomEvent) => {
            this._currentPage = 1;
            this.dispatchEvent(new CustomEvent('filter-changed', { detail: e.detail }));
          }}
        ></gs-filter-chips>

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

        <div class="sd-grid">${paged.map((strain) => this._renderStrainCard(strain))}</div>

        ${filteredStrains.length === 0
          ? html`
              <div style="text-align:center; padding: 40px; color: var(--secondary-text-color);">
                <svg
                  style="width:48px;height:48px;fill:currentColor; opacity:0.5;"
                  viewBox="0 0 24 24"
                >
                  <path d="${mdiMagnify}"></path>
                </svg>
                <p>No strains found matching "${query}"</p>
              </div>
            `
          : nothing}
        ${totalPages > 1
          ? html`
              <div class="pagination-container">
                <button
                  class="pagination-btn"
                  ?disabled=${this._currentPage === 1}
                  @click=${() => this._currentPage--}
                >
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiChevronLeft}"></path>
                  </svg>
                </button>
                <span class="pagination-text">Page ${this._currentPage} of ${totalPages}</span>
                <button
                  class="pagination-btn"
                  ?disabled=${this._currentPage === totalPages}
                  @click=${() => this._currentPage++}
                >
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiChevronRight}"></path>
                  </svg>
                </button>
              </div>
            `
          : nothing}
      </div>

      ${this._mobileMenuOpen
        ? html`
            <div class="menu-overlay" @click=${() => (this._mobileMenuOpen = false)}></div>
            <div class="mobile-menu">
              <div
                class="mobile-menu-item"
                @click=${() => {
                  this._emit('new-strain');
                  this._mobileMenuOpen = false;
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg> New Strain
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
                  this._emit('get-recommendation');
                  this._mobileMenuOpen = false;
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg> Get Recommendation
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
                  this._emit('import-requested');
                  this._mobileMenuOpen = false;
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg> Import Strains
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
                  this._emit('export-library');
                  this._mobileMenuOpen = false;
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiDownload}"></path></svg> Export Strains
              </div>
              <div
                class="mobile-menu-item"
                @click=${() => {
                  this._emit('manage-breeders-requested');
                  this._mobileMenuOpen = false;
                }}
              >
                <svg viewBox="0 0 24 24"><path d="${mdiAccountGroup}"></path></svg> Manage Breeders
              </div>
            </div>
          `
        : nothing}

      <button class="fab-btn" @click=${() => this._emit('new-strain')}>
        <svg style="fill:currentColor; width: 24px; height: 24px;" viewBox="0 0 24 24">
          <path d="${mdiPlus}"></path>
        </svg>
      </button>

      <div class="sd-footer">
        <button class="md3-button tonal" @click=${() => this._emit('get-recommendation')}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiBrain}"></path>
          </svg>
          Get Recommendation
        </button>
        <button class="md3-button tonal" @click=${() => this._emit('manage-breeders-requested')}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiAccountGroup}"></path>
          </svg>
          Manage Breeders
        </button>
        <button class="md3-button tonal" @click=${() => this._emit('import-requested')}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiCloudUpload}"></path>
          </svg>
          Import Strains
        </button>
        <button class="md3-button tonal" @click=${() => this._emit('export-library')}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiDownload}"></path>
          </svg>
          Export Strains
        </button>
        <button class="md3-button primary" @click=${() => this._emit('new-strain')}>
          <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiPlus}"></path>
          </svg>
          New Strain
        </button>
      </div>

      ${this._pendingDeleteKey ? this._renderDeleteConfirmation() : nothing}
    `;
  }

  private _renderStrainCard(strain: StrainEntry): TemplateResult {
    let typeIcon = mdiLeaf;
    const typeLabel = strain.type || 'Unknown';
    const lowerType = (strain.type || '').toLowerCase();
    if (lowerType.includes('indica')) typeIcon = mdiWeatherNight;
    else if (lowerType.includes('sativa')) typeIcon = mdiWeatherSunny;
    else if (lowerType.includes('hybrid')) typeIcon = mdiTuneVariant;

    const activePlants = this.activePlantCounts[strain.strain] ?? 0;
    const analytics = strain.strain_analytics || strain.analytics;
    const totalHarvests = analytics?.total_harvests ?? 0;
    const avgFlowerDays = analytics?.avg_flower_days;

    return html`
      <div
        class="strain-card"
        @click=${() =>
          this.dispatchEvent(new CustomEvent('strain-selected', { detail: { strain } }))}
      >
        <div class="sc-thumb">
          ${strain.image
            ? html`<img
                src="${PlantUtils.encodeLocalPath(strain.image)}"
                loading="lazy"
                alt="${strain.strain}"
                style="${strain.image_crop_meta
                  ? `width: 100%; height: 100%; object-fit: cover; object-position: ${strain.image_crop_meta.x}% ${strain.image_crop_meta.y}%; transform: scale(${strain.image_crop_meta.scale}); transform-origin: ${strain.image_crop_meta.x}% ${strain.image_crop_meta.y}%;`
                  : 'width: 100%; height: 100%; object-fit: cover;'}"
              />`
            : html`<svg
                style="width:48px;height:48px;opacity:0.2;fill:currentColor;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiLeaf}"></path>
              </svg>`}
          ${activePlants > 0
            ? html`
                <div
                  style="
              position: absolute; top: 8px; right: 8px;
              background: rgba(76,175,80,0.85); color: #fff;
              border-radius: 999px; padding: 2px 8px;
              font-size: 0.65rem; font-weight: 600;
              backdrop-filter: blur(4px);
            "
                >
                  ${activePlants} active
                </div>
              `
            : nothing}
          <div class="sc-actions">
            <button
              class="sc-action-btn"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._pendingDeleteKey = strain.key;
              }}
            >
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiDelete}"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="sc-content">
          <h3 class="sc-title">
            ${strain.strain} ${strain.phenotype ? `(${strain.phenotype})` : ''}
          </h3>
          <div class="sc-type-row">
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${typeIcon}"></path>
            </svg>
            <span>${typeLabel}</span>
          </div>
          <div class="sc-meta">
            ${strain.flowering_days_min
              ? html`<span
                  >Flower: ${strain.flowering_days_min}–${strain.flowering_days_max || '?'}
                  days</span
                >`
              : nothing}
            ${avgFlowerDays ? html`<span>Avg: ${Math.round(avgFlowerDays)}d</span>` : nothing}
            ${strain.breeder
              ? html`
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${strain.breeder_logo
                      ? html`<img
                          src="${strain.breeder_logo}"
                          style="width: 20px; height: 20px; object-fit: contain; border-radius: 2px; background: rgba(255,255,255,0.05); padding: 2px;"
                        />`
                      : nothing}
                    <span>${strain.breeder}</span>
                  </div>
                `
              : nothing}
            ${totalHarvests > 0
              ? html`<span style="color: var(--secondary-text-color);"
                  >${totalHarvests} harvest${totalHarvests !== 1 ? 's' : ''}</span
                >`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private _renderDeleteConfirmation(): TemplateResult {
    return html`
      <div class="crop-overlay">
        <div
          class="glass-dialog-container"
          style="width: 400px; height: auto; padding: 24px; display: flex; flex-direction: column;"
        >
          <h2 class="dialog-title">Delete Strain?</h2>
          <p
            style="color: var(--secondary-text-color); margin: 16px 0; font-size: 1rem; line-height: 1.5;"
          >
            Are you sure you want to delete this strain? This action cannot be undone.
          </p>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
            <button
              class="md3-button tonal"
              @click=${() => {
                this._pendingDeleteKey = null;
              }}
            >
              Cancel
            </button>
            <button
              class="md3-button text"
              style="color: #f44336;"
              @click=${() => this._confirmDelete()}
            >
              <svg
                style="width:18px;height:18px;fill:currentColor;margin-right:8px;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiDelete}"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _applyFilter(strains: StrainEntry[]): StrainEntry[] {
    if (this.libraryFilter === 'active') {
      return strains.filter((s) => (this.activePlantCounts[s.strain] ?? 0) > 0);
    }
    if (this.libraryFilter === 'library') {
      return strains.filter((s) => !s.is_stub);
    }
    return strains;
  }

  private _confirmDelete() {
    if (this._pendingDeleteKey) {
      this.dispatchEvent(
        new CustomEvent('strain-delete-confirmed', { detail: { key: this._pendingDeleteKey } })
      );
      this._pendingDeleteKey = null;
    }
  }

  private _emit(event: string) {
    this.dispatchEvent(new CustomEvent(event));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'strain-browse-view': StrainBrowseView;
  }
}
