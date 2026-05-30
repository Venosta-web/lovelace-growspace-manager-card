import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { storeContext } from '../../../context';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import type { PlantEntity } from '../../../types';
import type { LineageNode } from '../types';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/lineage-tree';

@customElement('plant-genetics-tab')
export class PlantGeneticsTab extends LitElement {
  @consume({ context: storeContext }) private store!: GrowspaceStore;

  @property({ attribute: false }) plant!: PlantEntity;

  @state() private _lineageTree: LineageNode | null = null;
  @state() private _lineageLoading = false;
  @state() private _seedBatchSearchOpen = false;
  @state() private _sexSaving = false;

  static styles = [dialogStyles];

  connectedCallback(): void {
    super.connectedCallback();
    void this._loadLineageTree();
  }

  willUpdate(changedProps: Map<string, unknown>): void {
    if (changedProps.has('plant') && this.plant && this.isConnected) {
      void this._loadLineageTree();
    }
  }

  render(): TemplateResult {
    const attrs = this.plant?.attributes ?? {};
    const seedBatchId = (attrs.seed_batch_id as string | null) ?? null;
    const generation = (attrs.generation as string) ?? '';
    const sex = (attrs.sex as string) ?? '';
    const sexOptions = [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
      { value: 'hermaphrodite', label: 'Hermaphrodite' },
    ];

    return html`
      <div style="padding: 16px; display: flex; flex-direction: column; gap: 20px;">
        <!-- Seed batch origin -->
        <div>
          <h4
            style="margin: 0 0 12px; font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px;"
          >
            Origin
          </h4>
          ${seedBatchId
            ? html`
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span
                    style="
                    background: rgba(139,195,74,0.15);
                    border: 1px solid #8bc34a;
                    border-radius: 16px;
                    padding: 4px 12px;
                    font-size: 13px;
                  "
                    >🌱 ${seedBatchId}${generation ? ` · ${generation}` : ''}</span
                  >
                  <button
                    class="md3-button text"
                    style="font-size: 12px; color: var(--secondary-text-color);"
                    @click=${async () => {
                      const plantId = attrs.plant_id as string;
                      await this.store?.actions.genetics.unlinkSeedBatch(plantId);
                    }}
                  >
                    Unlink
                  </button>
                </div>
              `
            : html`
                <div>
                  <button
                    class="md3-button tonal"
                    style="font-size: 13px;"
                    @click=${() => {
                      this._seedBatchSearchOpen = !this._seedBatchSearchOpen;
                    }}
                  >
                    🔗 Link to seed batch
                  </button>
                  ${this._seedBatchSearchOpen
                    ? html`
                        <div
                          style="margin-top: 8px; padding: 12px; border: 1px solid var(--divider-color); border-radius: 8px;"
                        >
                          <p
                            style="font-size: 12px; color: var(--secondary-text-color); margin: 0 0 8px;"
                          >
                            To link this plant to a seed batch, use the Seed Inventory panel in
                            Strain Library → Seeds tab, then tap Sow.
                          </p>
                        </div>
                      `
                    : nothing}
                </div>
              `}
        </div>

        <!-- Sex -->
        <div>
          <h4
            style="margin: 0 0 12px; font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px;"
          >
            Sex
          </h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${sexOptions.map(
              (opt) => html`
                <button
                  class="md3-chip ${sex === opt.value ? 'selected' : ''}"
                  style="
                    border: 1px solid ${sex === opt.value ? 'var(--primary-color)' : 'var(--divider-color)'};
                    background: ${sex === opt.value ? 'var(--primary-color)' : 'transparent'};
                    color: ${sex === opt.value ? 'var(--primary-text-color)' : 'var(--secondary-text-color)'};
                    border-radius: 16px; padding: 4px 12px; font-size: 13px; cursor: pointer;
                  "
                  ?disabled=${this._sexSaving}
                  @click=${async () => {
                    if (sex === opt.value) return;
                    this._sexSaving = true;
                    try {
                      await this.store?.actions.genetics.setPlantSex(
                        attrs.plant_id as string,
                        opt.value
                      );
                    } finally {
                      this._sexSaving = false;
                    }
                  }}
                >
                  ${opt.label}
                </button>
              `
            )}
          </div>
        </div>

        <!-- Lineage tree -->
        <div>
          <h4
            style="margin: 0 0 12px; font-size: 13px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px; display:flex; align-items:center; justify-content:space-between;"
          >
            Lineage
            <button
              class="md3-button text"
              style="font-size:11px;"
              @click=${() => {
                const strainName = this.plant?.attributes?.strain as string | undefined;
                const phenotype = this.plant?.attributes?.phenotype as string | undefined;
                if (strainName) {
                  this.dispatchEvent(
                    new CustomEvent('open-strain-editor', {
                      detail: { strain: strainName, phenotype, focusLineage: true },
                      bubbles: true,
                      composed: true,
                    })
                  );
                }
              }}
            >
              Edit lineage
            </button>
          </h4>
          <lineage-tree .node=${this._lineageTree} .loading=${this._lineageLoading}></lineage-tree>
        </div>
      </div>
    `;
  }

  private async _loadLineageTree(): Promise<void> {
    const plantId = this.plant?.attributes?.plant_id as string | undefined;
    if (!plantId || !this.store) return;
    this._lineageLoading = true;
    this._lineageTree = null;
    try {
      const tree = await this.store.actions.genetics.getLineageTree(plantId);
      this._lineageTree = tree;
    } catch {
      this._lineageTree = null;
    } finally {
      this._lineageLoading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'plant-genetics-tab': PlantGeneticsTab;
  }
}
