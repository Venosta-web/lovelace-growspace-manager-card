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
  mdiCog,
  mdiAccountGroup,
  mdiSprout,
  mdiFilterRemoveOutline,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { StrainEntry } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { dialogStyles } from '../styles/dialog.styles';
import type { LibraryFilter } from './gs-filter-chips';
import {
  filterAndSortStrains,
  paginateStrains,
  classifyEmptyState,
  type EmptyStateReason,
} from './strain-browse-view-logic';
import './gs-filter-chips';
import '../features/shared/ui/md3-text-input';
import '../features/shared/ui/gs-help-tooltip';

const MANAGE_MENU_ID = 'strain-library-manage-menu';

@customElement('strain-browse-view')
export class StrainBrowseView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ attribute: false }) activePlantCounts: Record<string, number> = {};
  @property({ type: String }) libraryFilter: LibraryFilter = 'library';

  @state() private _searchQuery = '';
  @state() private _currentPage = 1;
  @state() private _manageMenuOpen = false;
  @state() private _pendingDeleteKey: string | null = null;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: contents;
        --accent-green: var(--gm-primary-color);
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
        flex-wrap: wrap;
      }

      /* GRID & CARDS */
      .sd-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }

      .strain-card {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: var(--border-radius-md, 12px);
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
        color: var(--text-muted);
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
        font-size: var(--font-size-md);
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
        font-size: var(--font-size-supporting);
        color: var(--secondary-text-color);
      }

      /*
       * The card title carries the primary "open strain" activation and stretches
       * its hit area over the whole card via ::after. The card itself stays a
       * non-interactive container so the delete button is a sibling target rather
       * than nested inside another control.
       */
      .sc-open-btn {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }

      .sc-open-btn::after {
        content: '';
        position: absolute;
        inset: 0;
      }

      .sc-open-btn:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      .sc-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s;
        /* Sits above the title's stretched hit area so it stays clickable. */
        z-index: 1;
      }

      .strain-card:hover .sc-actions,
      .strain-card:focus-within .sc-actions {
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
        color: var(--text-primary);
        cursor: pointer;
      }

      .sc-action-btn:hover {
        background: var(--accent-green);
      }

      .sc-action-btn:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
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
        font-size: var(--font-size-sm);
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

      .pagination-btn:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      /* MANAGE MENU */
      .manage-menu {
        position: absolute;
        top: 60px;
        right: 16px;
        background: var(--card-background-color, #2d2d2d);
        border-radius: var(--border-radius-xs, 4px);
        padding: 8px 0;
        min-width: 200px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        z-index: 30;
      }

      .manage-menu-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        width: 100%;
        background: none;
        border: none;
        font: inherit;
        text-align: left;
      }

      .manage-menu-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .manage-menu-item:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }

      .manage-menu-item svg {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color);
      }

      .menu-overlay {
        position: absolute;
        inset: 0;
        z-index: 25;
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

      /* Empty state */
      .empty-state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 56px 24px;
        gap: 8px;
      }

      .empty-state-icon {
        width: 56px;
        height: 56px;
        fill: var(--secondary-text-color);
        opacity: 0.45;
        margin-bottom: 8px;
      }

      .empty-state-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--primary-text-color, #fff);
        margin: 0;
      }

      .empty-state-subtitle {
        font-size: 0.9rem;
        color: var(--secondary-text-color);
        margin: 0 0 12px 0;
        max-width: 380px;
        line-height: 1.5;
      }

      .empty-state-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 4px;
      }

      @media (max-width: 600px) {
        .sd-grid {
          grid-template-columns: 1fr;
        }

        /* Same two actions as desktop, stacked so neither is truncated. */
        .sd-footer {
          padding: 12px 16px;
          flex-direction: column-reverse;
        }

        .sd-footer .md3-button {
          width: 100%;
          justify-content: center;
        }

        .manage-menu {
          right: 8px;
          left: 8px;
          min-width: 0;
        }
      }
    `,
  ];

  render() {
    const query = (this._searchQuery || '').toLowerCase();
    const filteredStrains = filterAndSortStrains(
      this.strains,
      query,
      this.libraryFilter,
      this.activePlantCounts
    );
    const emptyReason = classifyEmptyState(
      this.strains,
      filteredStrains.length,
      this._searchQuery,
      this.libraryFilter,
      this.activePlantCounts
    );
    const { paged, totalPages, currentPage } = paginateStrains(filteredStrains, this._currentPage);
    this._currentPage = currentPage;

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
            class="md3-button text manage-menu-trigger"
            aria-haspopup="menu"
            aria-expanded=${this._manageMenuOpen ? 'true' : 'false'}
            aria-controls=${this._manageMenuOpen ? MANAGE_MENU_ID : nothing}
            @click=${() => this._toggleManageMenu()}
            style="margin-left: auto;"
          >
            <svg
              aria-hidden="true"
              style="width:20px;height:20px;fill:currentColor;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiCog}"></path>
            </svg>
            Manage
          </button>
          <button
            class="md3-button text close"
            aria-label="Close strain library"
            @click=${() => this.dispatchEvent(new CustomEvent('close'))}
            style="min-width:auto; padding:8px; margin-left: auto;"
          >
            <svg
              aria-hidden="true"
              style="width:24px;height:24px;fill:currentColor;"
              viewBox="0 0 24 24"
            >
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

        ${emptyReason ? this._renderEmptyState(emptyReason) : nothing}
        ${totalPages > 1
          ? html`
              <div class="pagination-container">
                <button
                  class="pagination-btn"
                  aria-label="Previous page"
                  ?disabled=${this._currentPage === 1}
                  @click=${() => this._currentPage--}
                >
                  <svg
                    aria-hidden="true"
                    style="width:24px;height:24px;fill:currentColor;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiChevronLeft}"></path>
                  </svg>
                </button>
                <span class="pagination-text" aria-live="polite"
                  >Page ${this._currentPage} of ${totalPages}</span
                >
                <button
                  class="pagination-btn"
                  aria-label="Next page"
                  ?disabled=${this._currentPage === totalPages}
                  @click=${() => this._currentPage++}
                >
                  <svg
                    aria-hidden="true"
                    style="width:24px;height:24px;fill:currentColor;"
                    viewBox="0 0 24 24"
                  >
                    <path d="${mdiChevronRight}"></path>
                  </svg>
                </button>
              </div>
            `
          : nothing}
      </div>

      ${this._manageMenuOpen
        ? html`
            <div class="menu-overlay" @click=${() => this._closeManageMenu()}></div>
            <div
              id=${MANAGE_MENU_ID}
              class="manage-menu"
              role="menu"
              aria-label="Manage library"
              @keydown=${this._onManageMenuKeydown}
            >
              ${this._renderMenuItem(mdiCloudUpload, 'Import Strains', 'import-requested')}
              ${this._renderMenuItem(mdiDownload, 'Export Strains', 'export-library')}
              ${this._renderMenuItem(
                mdiAccountGroup,
                'Manage Breeders',
                'manage-breeders-requested'
              )}
            </div>
          `
        : nothing}

      <div class="sd-footer">
        <button class="md3-button tonal" @click=${() => this._emit('get-recommendation')}>
          <svg
            aria-hidden="true"
            style="width:18px;height:18px;fill:currentColor;"
            viewBox="0 0 24 24"
          >
            <path d="${mdiBrain}"></path>
          </svg>
          Get Recommendation
        </button>
        <button class="md3-button primary" @click=${() => this._emit('new-strain')}>
          <svg
            aria-hidden="true"
            style="width:18px;height:18px;fill:currentColor;"
            viewBox="0 0 24 24"
          >
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
      <div class="strain-card">
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
              background: rgba(76,175,80,0.85); color: var(--text-primary);
              border-radius: var(--border-radius-full, 9999px); padding: 2px 8px;
              font-size: var(--font-size-xs); font-weight: 600;
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
              aria-label="Delete ${strain.strain}"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._deleteTrigger = e.currentTarget as HTMLElement;
                this._pendingDeleteKey = strain.key;
              }}
            >
              <svg
                aria-hidden="true"
                style="width:16px;height:16px;fill:currentColor;"
                viewBox="0 0 24 24"
              >
                <path d="${mdiDelete}"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="sc-content">
          <h3 class="sc-title">
            <button
              class="sc-open-btn"
              @click=${() =>
                this.dispatchEvent(new CustomEvent('strain-selected', { detail: { strain } }))}
            >
              ${strain.strain} ${strain.phenotype ? `(${strain.phenotype})` : ''}
            </button>
          </h3>
          <div class="sc-type-row">
            <svg
              aria-hidden="true"
              style="width:16px;height:16px;fill:currentColor;"
              viewBox="0 0 24 24"
            >
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
                          alt=""
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

  private _renderMenuItem(icon: string, label: string, event: string): TemplateResult {
    return html`
      <button
        class="manage-menu-item"
        role="menuitem"
        @click=${() => {
          this._emit(event);
          this._closeManageMenu();
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="${icon}"></path></svg> ${label}
      </button>
    `;
  }

  private _toggleManageMenu() {
    if (this._manageMenuOpen) this._closeManageMenu();
    else this._manageMenuOpen = true;
  }

  private _closeManageMenu() {
    if (!this._manageMenuOpen) return;
    this._manageMenuOpen = false;
    this.shadowRoot?.querySelector<HTMLElement>('.manage-menu-trigger')?.focus();
  }

  private _onManageMenuKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this._closeManageMenu();
    }
  };

  private _renderDeleteConfirmation(): TemplateResult {
    return html`
      <div class="crop-overlay" @keydown=${this._onDeleteKeydown}>
        <div
          class="glass-dialog-container"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-strain-title"
          style="width: 400px; height: auto; padding: 24px; display: flex; flex-direction: column;"
        >
          <h2 class="dialog-title" id="delete-strain-title">Delete Strain?</h2>
          <p
            style="color: var(--secondary-text-color); margin: 16px 0; font-size: 1rem; line-height: 1.5;"
          >
            Are you sure you want to delete this strain? This action cannot be undone.
          </p>
          <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
            <button class="md3-button tonal delete-cancel-btn" @click=${() => this._cancelDelete()}>
              Cancel
            </button>
            <button
              class="md3-button text"
              style="color: var(--gm-error-color);"
              @click=${() => this._confirmDelete()}
            >
              <svg
                aria-hidden="true"
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

  /**
   * The delete button that opened the confirmation, so focus can return to it
   * once the prompt closes. Cards re-render on delete, so the element may be
   * gone by then — `isConnected` guards that.
   */
  private _deleteTrigger: HTMLElement | null = null;

  updated(changedProperties: Map<string, unknown>) {
    // Only on open — refocusing on every render would yank focus back to Cancel
    // whenever an unrelated re-render lands while the prompt is up.
    if (changedProperties.has('_pendingDeleteKey') && this._pendingDeleteKey) {
      this.shadowRoot?.querySelector<HTMLElement>('.delete-cancel-btn')?.focus();
    }
    if (changedProperties.has('_manageMenuOpen') && this._manageMenuOpen) {
      this.shadowRoot?.querySelector<HTMLElement>('.manage-menu-item')?.focus();
    }
  }

  private _onDeleteKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this._cancelDelete();
    }
  };

  private _restoreDeleteFocus() {
    const trigger = this._deleteTrigger;
    this._deleteTrigger = null;
    if (trigger?.isConnected) trigger.focus();
  }

  private _cancelDelete() {
    this._pendingDeleteKey = null;
    this._restoreDeleteFocus();
  }

  private _confirmDelete() {
    if (this._pendingDeleteKey) {
      this.dispatchEvent(
        new CustomEvent('strain-delete-confirmed', { detail: { key: this._pendingDeleteKey } })
      );
      this._pendingDeleteKey = null;
      this._restoreDeleteFocus();
    }
  }

  private static readonly FILTER_LABELS: Record<LibraryFilter, string> = {
    library: 'Library',
    active: 'Active',
    all: 'All',
  };

  private _renderEmptyState(reason: EmptyStateReason): TemplateResult {
    switch (reason) {
      case 'first-use':
        return html`
          <div class="empty-state-container">
            <svg class="empty-state-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="${mdiSprout}"></path>
            </svg>
            <p class="empty-state-title">Your Strain Library is empty</p>
            <p class="empty-state-subtitle">
              Start by creating your first strain or importing an existing library.
            </p>
            <div class="empty-state-actions">
              <button class="md3-button primary" @click=${() => this._emit('new-strain')}>
                <svg
                  style="width:18px;height:18px;fill:currentColor;"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="${mdiPlus}"></path>
                </svg>
                Create first strain
              </button>
              <button class="md3-button tonal" @click=${() => this._emit('import-requested')}>
                <svg
                  style="width:18px;height:18px;fill:currentColor;"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="${mdiCloudUpload}"></path>
                </svg>
                Import library
              </button>
            </div>
          </div>
        `;

      case 'filter-empty':
        return html`
          <div class="empty-state-container">
            <svg class="empty-state-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="${mdiFilterRemoveOutline}"></path>
            </svg>
            <p class="empty-state-title">
              No strains match the "${StrainBrowseView.FILTER_LABELS[this.libraryFilter]}" filter
            </p>
            <p class="empty-state-subtitle">Try a different filter to see your strains.</p>
            <div class="empty-state-actions">
              <button class="md3-button tonal" @click=${() => this._resetFilter()}>
                Show all strains
              </button>
            </div>
          </div>
        `;

      case 'search-empty':
        return html`
          <div class="empty-state-container">
            <svg class="empty-state-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="${mdiMagnify}"></path>
            </svg>
            <p class="empty-state-title">No strains match "${this._searchQuery}"</p>
            <p class="empty-state-subtitle">Check spelling or try a broader search term.</p>
            <div class="empty-state-actions">
              <button class="md3-button tonal" @click=${() => this._clearSearch()}>
                Clear search
              </button>
            </div>
          </div>
        `;

      case 'combined-empty':
        return html`
          <div class="empty-state-container">
            <svg class="empty-state-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="${mdiFilterRemoveOutline}"></path>
            </svg>
            <p class="empty-state-title">
              No strains match "${this._searchQuery}" in
              ${StrainBrowseView.FILTER_LABELS[this.libraryFilter]}
            </p>
            <p class="empty-state-subtitle">Remove the filter or broaden your search.</p>
            <div class="empty-state-actions">
              <button class="md3-button tonal" @click=${() => this._clearSearch()}>
                Clear search
              </button>
              <button class="md3-button tonal" @click=${() => this._resetFilter()}>
                Show all strains
              </button>
            </div>
          </div>
        `;
    }
  }

  private _clearSearch(): void {
    this._searchQuery = '';
    this._currentPage = 1;
    requestAnimationFrame(() => {
      this.shadowRoot?.querySelector<HTMLElement>('md3-text-input')?.focus();
    });
  }

  private _resetFilter(): void {
    this._currentPage = 1;
    this.dispatchEvent(new CustomEvent('filter-changed', { detail: { filter: 'all' } }));
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
