import { LitElement, html, css, PropertyValues, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  mdiClose,
  mdiCloudUpload,
  mdiFileUpload,
  mdiArrowExpand,
  mdiArrowCollapse,
  mdiArrowLeft,
} from '@mdi/js';
import './gs-breeder-manager';
import './gs-filter-chips';
import './strain-browse-view';
import './strain-import-dialog';
import './seeds-genetics-tab';
import './strain-editor-view';
import { updateStrainMeta, fetchStrainLibrary } from '../slices/strain';
import { showToast } from '../slices/ui';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, StrainEntry, SeedBatch, PollinationEvent } from '../types';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { dialogStyles } from '../styles/dialog.styles';
import { buildStrainTreeNodes } from '../utils/strain-tree-utils';
import '../features/shared/ui/md3-number-input';
import '../features/shared/ui/gs-help-tooltip';
import '../features/shared/ui/lineage-tree';
import '../features/shared/ui/genetics-tree-view';
import type { TreeNode } from '../features/shared/ui/genetics-tree-layout';

@customElement('strain-library-dialog')
export class StrainLibraryDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) store?: GrowspaceStore;
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ type: Object }) editingStrain?: StrainEntry;
  @property({ attribute: false }) activePlantCounts: Record<string, number> = {};
  @property({ type: Boolean }) focusLineage = false;
  @property({ type: String }) source?: string;
  @property({ type: Object }) returnPayload?: unknown;

  @state() private _view: 'browse' | 'editor' = 'browse';

  // Seeds & Genetics tab state
  @property({ type: Array }) seedBatches: SeedBatch[] = [];
  @property({ type: Array }) pollinationEvents: PollinationEvent[] = [];
  @property({ type: Array }) plants: GrowspaceDevice[] = [];
  @property({ type: String }) initialTab: 'strains' | 'seeds' | 'tree' = 'strains';
  /** When set, the seeds tab opens directly on this sub-view instead of the list. */
  @property({ type: String }) initialSubView?: 'list' | 'log-pollination';
  /** Pre-fills the receiver plant field in the log-pollination form. */
  @property({ type: String }) prefilledReceiverId?: string;
  @property({ type: Function }) onSeedDataChanged?: () => void;
  @property({ attribute: false }) onAddSeedBatch?: (data: {
    strain_name: string;
    breeder: string;
    quantity: number;
    acquisition_date: string;
    generation: string;
    parent_1_strain?: string | null;
    parent_1_phenotype?: string | null;
    parent_2_strain?: string | null;
    parent_2_phenotype?: string | null;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onUpdateSeedBatch?: (data: {
    batch_id: string;
    strain_name?: string;
    breeder?: string;
    quantity?: number;
    acquisition_date?: string;
    generation?: string;
    lineage?: string;
    parent_1_strain?: string | null;
    parent_1_phenotype?: string | null;
    parent_2_strain?: string | null;
    parent_2_phenotype?: string | null;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onLogPollination?: (data: {
    date: string;
    donor_plant_id: string;
    receiver_plant_id: string;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onHarvestSeeds?: (data: {
    event_id: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onUpdatePollination?: (data: {
    event_id: string;
    date?: string;
    donor_plant_id?: string;
    receiver_plant_id?: string;
    notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onDeletePollination?: (event_id: string) => Promise<void>;
  @property({ attribute: false }) onDeleteSeedBatch?: (batch_id: string) => Promise<void>;
  @property({ attribute: false }) onSowSeeds?: (data: {
    growspace_id: string;
    strain: string;
    amount: number;
    seed_batch_id: string;
    generation?: string;
  }) => Promise<void>;

  @state() private _activeMainTab: 'strains' | 'seeds' | 'tree' = 'strains';
  @state() private _libraryFilter: 'library' | 'active' | 'all' = 'library';
  @state() private _treeNodes: TreeNode[] = [];
  @state() private _treeMaximized = false;

  @state() private _importDialogOpen = false;
  @state() private _importReplace = false;
  @state() private _breederDialogOpen = false;

  // Editor navigation state
  @state() private _editingStrain: StrainEntry | undefined = undefined;
  @state() private _cameFromEditor = false;

  willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has('editingStrain') && this.editingStrain) {
      this._editingStrain = this.editingStrain;
      this._view = 'editor';
    }
    if (
      changedProps.has('strains') ||
      changedProps.has('seedBatches') ||
      changedProps.has('_libraryFilter')
    ) {
      const filteredStrains = this._applyLibraryFilter(this.strains);
      this._treeNodes = buildStrainTreeNodes(this.strains, this.seedBatches, filteredStrains);
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('initialTab')) {
      this._activeMainTab = this.initialTab;
    }
    if (changedProperties.has('_treeMaximized')) {
      this.classList.toggle('tree-maximized', this._treeMaximized);
    }
  }
  static styles = [
    dialogStyles,
    css`
      :host {
        --accent-green: var(--gm-primary-color);
      }

      .btn-close-tree {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        background: rgba(255, 255, 255, 0.05);
        color: var(--primary-text-color, #fff);
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        padding: 0;
        outline: none;
      }
      .btn-close-tree:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--accent-green, #4caf50);
        color: var(--accent-green, #4caf50);
      }
      .btn-close-tree:focus-visible {
        border-color: var(--accent-green, #4caf50);
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
      }

      /* Additional specific styles */

      /* Layout Overrides */
      .glass-dialog-container {
        width: 100%;
        max-width: 100%;
        min-height: 500px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background: transparent;
      }

      @media (min-width: 601px) {
        .glass-dialog-container {
          height: 85vh;
        }
      }

      @media (min-width: 601px) {
        .dialog-header {
          justify-content: space-between;
        }
        .dialog-header .dialog-title-group {
          flex: none;
        }
      }
      /* Mobile Responsive */
      @media (max-width: 600px) {
        ha-dialog {
          --ha-dialog-width-md: 100vw;
          --ha-dialog-max-width: 100vw;
          --ha-dialog-width-full: 100vw;
          --dialog-surface-width: 100vw;
          --dialog-surface-max-width: 100vw;
          --dialog-content-width: 100vw;
          --dialog-surface-margin: 0;
          --dialog-surface-margin-top: 0;
        }
        .glass-dialog-container {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          border-radius: 0;
        }
      }

      .tab-content-tree {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /*
       * Layout-transparent wrapper: exists to carry the tabpanel semantics for the
       * workspace tablist, so it must pass the container's flex sizing straight
       * through to whichever tab content it holds.
       */
      .workspace-panel {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Main tab bar */
      .main-tab-bar {
        display: flex;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        flex-shrink: 0;
        align-items: center;
      }
      .tab-btn {
        flex: 1;
        padding: 14px 16px;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--secondary-text-color);
        font-size: var(--font-size-sm);
        font-weight: 500;
        cursor: pointer;
        transition:
          color 0.2s,
          border-color 0.2s;
        font-family: inherit;
      }
      .tab-btn.active {
        color: var(--accent-green, #4caf50);
        border-bottom-color: var(--accent-green, #4caf50);
      }
      .tab-btn:hover:not(.active) {
        color: var(--primary-text-color);
      }
      .tab-btn:focus-visible,
      .tab-maximize-btn:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
      .tab-maximize-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        flex-shrink: 0;
        margin-right: 4px;
        border-radius: var(--border-radius-xs, 4px);
      }
      .tab-maximize-btn:hover {
        color: var(--primary-text-color);
        background: rgba(255, 255, 255, 0.06);
      }

      /* Maximized tree view — ha-dialog width="full" handles dialog sizing;
         just ensure the inner container fills the full surface */
      :host(.tree-maximized) ha-dialog {
        --ha-dialog-width-md: 100vw;
        --ha-dialog-max-width: 100vw;
        --ha-dialog-width-full: 100vw;
        --dialog-surface-width: 100vw;
        --dialog-surface-max-width: 100vw;
        --dialog-content-width: 100vw;
        --dialog-surface-margin: 0;
        --dialog-surface-margin-top: 0;
      }
      :host(.tree-maximized) .glass-dialog-container {
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
      }
    `,
  ];
  render() {
    if (!this.open) return nothing;

    return html`
      <ha-dialog
        open
        @closed=${() => this.dispatchEvent(new CustomEvent('close'))}
        hideActions
        without-header
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        width="${this._treeMaximized ? 'full' : 'large'}"
      >
        <div class="glass-dialog-container">
          ${this._renderTabBar()}
          <div
            class="workspace-panel"
            role="tabpanel"
            id="workspace-panel-${this._activeMainTab}"
            aria-labelledby="workspace-tab-${this._activeMainTab}"
          >
            ${this._activeMainTab === 'tree'
              ? this._renderTreeViewTab()
              : this._activeMainTab === 'seeds'
                ? html`
                    <seeds-genetics-tab
                      .strains=${this.strains}
                      .seedBatches=${this.seedBatches}
                      .pollinationEvents=${this.pollinationEvents}
                      .plants=${this.plants}
                      .onSeedDataChanged=${this.onSeedDataChanged}
                      .onAddSeedBatch=${this.onAddSeedBatch}
                      .onUpdateSeedBatch=${this.onUpdateSeedBatch}
                      .onLogPollination=${this.onLogPollination}
                      .onHarvestSeeds=${this.onHarvestSeeds}
                      .onUpdatePollination=${this.onUpdatePollination}
                      .onDeletePollination=${this.onDeletePollination}
                      .onDeleteSeedBatch=${this.onDeleteSeedBatch}
                      .onSowSeeds=${this.onSowSeeds}
                      .initialSubView=${this.initialSubView}
                      .prefilledReceiverId=${this.prefilledReceiverId}
                      @close=${() => this.dispatchEvent(new CustomEvent('close'))}
                    ></seeds-genetics-tab>
                  `
                : this._view === 'browse'
                  ? html`
                      <strain-browse-view
                        .hass=${this.hass}
                        .strains=${this.strains}
                        .activePlantCounts=${this.activePlantCounts}
                        .libraryFilter=${this._libraryFilter}
                        @strain-selected=${(e: CustomEvent) => {
                          this._editingStrain = e.detail.strain;
                          this._view = 'editor';
                        }}
                        @new-strain=${() => {
                          this._editingStrain = undefined;
                          this._view = 'editor';
                        }}
                        @filter-changed=${(e: CustomEvent) => {
                          this._libraryFilter = e.detail.filter;
                        }}
                        @manage-breeders-requested=${() => {
                          this._breederDialogOpen = true;
                        }}
                        @import-requested=${() => {
                          this._importDialogOpen = true;
                        }}
                        @get-recommendation=${() =>
                          this.dispatchEvent(new CustomEvent('get-recommendation'))}
                        @export-library=${() =>
                          this.dispatchEvent(new CustomEvent('export-library'))}
                        @strain-delete-confirmed=${(e: CustomEvent) =>
                          this.dispatchEvent(
                            new CustomEvent('delete-strain', { detail: e.detail })
                          )}
                        @close=${() => this.dispatchEvent(new CustomEvent('close'))}
                      ></strain-browse-view>
                    `
                  : html`
                      <strain-editor-view
                        .editingStrain=${this._editingStrain}
                        .strains=${this.strains}
                        .store=${this.store}
                        .hass=${this.hass}
                        .source=${this.source}
                        .returnPayload=${this.returnPayload}
                        .onSave=${async (strain: import('../types').StrainEntry) => {
                          await updateStrainMeta(strain);
                          await fetchStrainLibrary({ cache: true, force: true });
                          this.dispatchEvent(new CustomEvent('data-changed'));
                          showToast('Strain updated successfully!', 'success');
                          this._view = 'browse';
                          this._editingStrain = undefined;
                        }}
                        @view-lineage=${(_e: CustomEvent) => {
                          this.focusLineage = true;
                          this._cameFromEditor = true;
                          this._activeMainTab = 'tree';
                        }}
                        @editing-strain-changed=${(e: CustomEvent) => {
                          this._editingStrain = e.detail.strain;
                        }}
                        @editor-back=${() => {
                          this._view = 'browse';
                          this._editingStrain = undefined;
                        }}
                        @delete-strain=${(e: CustomEvent) => {
                          this.dispatchEvent(
                            new CustomEvent('delete-strain', { detail: e.detail })
                          );
                          this._view = 'browse';
                          this._editingStrain = undefined;
                        }}
                        @strain-created-at-source=${(e: CustomEvent) => {
                          this.dispatchEvent(
                            new CustomEvent('strain-created-at-source', {
                              detail: e.detail,
                              bubbles: true,
                              composed: true,
                            })
                          );
                        }}
                        @open-print-label=${(e: CustomEvent) => {
                          this.dispatchEvent(
                            new CustomEvent('open-print-label', {
                              detail: e.detail,
                              bubbles: true,
                              composed: true,
                            })
                          );
                        }}
                        @import-library=${(e: CustomEvent) => {
                          this.dispatchEvent(
                            new CustomEvent('import-library', { detail: e.detail })
                          );
                        }}
                        @update-breeder=${(e: CustomEvent) => {
                          this.dispatchEvent(
                            new CustomEvent('update-breeder', { detail: e.detail })
                          );
                        }}
                        @save-breeder=${(e: CustomEvent) => {
                          this.dispatchEvent(new CustomEvent('save-breeder', { detail: e.detail }));
                        }}
                        @delete-breeder=${(e: CustomEvent) => {
                          this.dispatchEvent(
                            new CustomEvent('delete-breeder', { detail: e.detail })
                          );
                        }}
                        @close=${() => this.dispatchEvent(new CustomEvent('close'))}
                      ></strain-editor-view>
                    `}
          </div>
        </div>
      </ha-dialog>

      ${this._importDialogOpen ? this.renderImportDialog() : nothing}
      <gs-breeder-manager
        .strains=${this.strains}
        .open=${this._breederDialogOpen}
        @save-breeder=${(e: CustomEvent) =>
          this.dispatchEvent(new CustomEvent('save-breeder', { detail: e.detail }))}
        @update-breeder=${(e: CustomEvent) =>
          this.dispatchEvent(new CustomEvent('update-breeder', { detail: e.detail }))}
        @delete-breeder=${(e: CustomEvent) =>
          this.dispatchEvent(new CustomEvent('delete-breeder', { detail: e.detail }))}
        @close=${() => {
          this._breederDialogOpen = false;
        }}
      ></gs-breeder-manager>
    `;
  }

  private renderImportDialog(): TemplateResult {
    const close = () => {
      this._importDialogOpen = false;
    };
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
              aria-label="Close import strains"
              @click=${close}
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

          <div style="padding: 24px;">
            <div
              style="font-size: var(--font-size-sm); color: var(--secondary-text-color); line-height: 1.5; margin-bottom: 20px;"
            >
              Select a ZIP file containing your strain library export. You can either merge the new
              strains with your existing library or replace it entirely.
            </div>

            <div
              style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: var(--border-radius-sm, 8px); border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;"
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
                  <div
                    style="font-size: var(--font-size-supporting); color: var(--secondary-text-color);"
                  >
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
                  <div
                    style="font-size: var(--font-size-supporting); color: var(--secondary-text-color);"
                  >
                    Overwrite entire library with import.
                  </div>
                </div>
              </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
              <button class="md3-button tonal" @click=${close}>Cancel</button>
              <button
                class="md3-button primary"
                @click=${() => {
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
                }}
              >
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

  /**
   * `aria-controls` is set only on the selected tab: panels render conditionally,
   * so pointing at a panel id that isn't in the DOM would dangle.
   */
  private _renderWorkspaceTab(tab: 'strains' | 'seeds' | 'tree', label: string): TemplateResult {
    const selected = this._activeMainTab === tab;
    return html`
      <button
        class="tab-btn ${selected ? 'active' : ''}"
        role="tab"
        id="workspace-tab-${tab}"
        aria-selected=${selected ? 'true' : 'false'}
        aria-controls=${ifDefined(selected ? `workspace-panel-${tab}` : undefined)}
        @click=${() => {
          this._activeMainTab = tab;
          this.focusLineage = false;
          this._cameFromEditor = false;
        }}
      >
        ${label}
      </button>
    `;
  }

  private _renderTabBar(): TemplateResult {
    return html`
      <div class="main-tab-bar" role="tablist" aria-label="Strain library workspace">
        ${this._renderWorkspaceTab('strains', 'Strains')}
        ${this._renderWorkspaceTab('seeds', 'Seeds & Genetics')}
        ${this._renderWorkspaceTab('tree', 'Tree View')}
        ${this._activeMainTab === 'tree'
          ? html`
              <button
                class="tab-maximize-btn"
                aria-label="${this._treeMaximized ? 'Restore tree view' : 'Maximize tree view'}"
                aria-pressed=${this._treeMaximized ? 'true' : 'false'}
                title="${this._treeMaximized ? 'Restore' : 'Maximize'}"
                @click=${() => {
                  this._treeMaximized = !this._treeMaximized;
                }}
              >
                <svg
                  aria-hidden="true"
                  style="width:18px;height:18px;fill:currentColor;"
                  viewBox="0 0 24 24"
                >
                  <path d="${this._treeMaximized ? mdiArrowCollapse : mdiArrowExpand}"></path>
                </svg>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _applyLibraryFilter(strains: StrainEntry[]): StrainEntry[] {
    if (this._libraryFilter === 'active') {
      return strains.filter((s) => (this.activePlantCounts[s.strain] ?? 0) > 0);
    }
    if (this._libraryFilter === 'library') {
      return strains.filter((s) => !s.is_stub);
    }
    return strains;
  }

  private _renderTreeViewTab(): TemplateResult {
    return html`
      <div class="tab-content-tree">
        <div
          style="padding: 8px 16px 0; display: flex; justify-content: space-between; align-items: center;"
        >
          <gs-filter-chips
            .filter=${this._libraryFilter}
            @filter-changed=${(e: CustomEvent) => {
              this._libraryFilter = e.detail.filter;
            }}
          ></gs-filter-chips>
          <div style="display: flex; align-items: center; gap: 12px;">
            ${this._cameFromEditor
              ? html`
                  <button
                    class="btn-back-editor"
                    @click=${() => {
                      this.focusLineage = false;
                      this._cameFromEditor = false;
                      this._activeMainTab = 'strains';
                    }}
                    style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid var(--accent-green, #4caf50); border-radius: var(--border-radius-full, 9999px); color: var(--accent-green, #4caf50); font-weight: 500; font-size: var(--font-size-supporting); cursor: pointer; transition: all 0.2s ease-in-out; outline: none; margin-right: 0;"
                    onmouseover="this.style.background='rgba(76, 175, 80, 0.25)'"
                    onmouseout="this.style.background='rgba(76, 175, 80, 0.15)'"
                  >
                    <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${mdiArrowLeft}"></path>
                    </svg>
                    <span>Back to Editor</span>
                  </button>
                `
              : nothing}
            <button
              class="btn-close-tree"
              @click=${() => {
                this.dispatchEvent(new CustomEvent('close'));
              }}
            >
              <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>
        </div>
        <genetics-tree-view
          .nodes=${this._treeNodes}
          .focalId=${this.focusLineage && (this._editingStrain || this.editingStrain)
            ? this._editingStrain?.key || this.editingStrain?.key
            : null}
          .libraryKeys=${new Set(this.strains.map((s) => s.key))}
          @open-strain-editor=${(e: CustomEvent<{ id: string }>) => {
            const strain = this.strains.find((s) => s.key === e.detail.id);
            if (strain) {
              this._editingStrain = strain;
              this._view = 'editor';
              this._activeMainTab = 'strains';
            }
          }}
        ></genetics-tree-view>
      </div>
    `;
  }
}
