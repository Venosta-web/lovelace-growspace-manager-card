import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiLeaf,
  mdiClose,
  mdiPencil,
  mdiCheck,
  mdiDelete,
} from '@mdi/js';
import type { StrainEntry, SeedBatch, PollinationEvent, GrowspaceDevice } from '../types';
import { dialogStyles } from '../styles/dialog.styles';

@customElement('seeds-genetics-tab')
export class SeedsGeneticsTab extends LitElement {
  @property({ type: Array }) strains: StrainEntry[] = [];
  @property({ type: Array }) seedBatches: SeedBatch[] = [];
  @property({ type: Array }) pollinationEvents: PollinationEvent[] = [];
  @property({ type: Array }) plants: GrowspaceDevice[] = [];

  @property({ attribute: false }) onSeedDataChanged?: () => void;
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
    date: string; donor_plant_id: string; receiver_plant_id: string; notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onHarvestSeeds?: (data: {
    event_id: string; quantity: number; notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onUpdatePollination?: (data: {
    event_id: string; date?: string; donor_plant_id?: string; receiver_plant_id?: string; notes?: string;
  }) => Promise<void>;
  @property({ attribute: false }) onDeletePollination?: (event_id: string) => Promise<void>;
  @property({ attribute: false }) onDeleteSeedBatch?: (batch_id: string) => Promise<void>;
  @property({ attribute: false }) onSowSeeds?: (data: {
    growspace_id: string; strain: string; amount: number; seed_batch_id: string; generation?: string;
  }) => Promise<void>;

  @state() private _seedSubView: 'list' | 'add-batch' | 'log-pollination' | 'harvest' = 'list';
  @state() private _editingBatchId: string | null = null;
  @state() private _editingEventId: string | null = null;
  @state() private _confirmDeleteEventId: string | null = null;
  @state() private _confirmDeleteBatchId: string | null = null;
  @state() private _sowBatchId: string | null = null;
  @state() private _sowGrowspaceId = '';
  @state() private _sowQuantity = 1;
  @state() private _sowSubmitting = false;
  @state() private _submitError: string | null = null;
  @state() private _selectedEventId: string | null = null;
  @state() private _batchForm = {
    strain_name: '',
    breeder: '',
    quantity: 1,
    acquisition_date: '',
    generation: 'F1',
    parent_1_key: '',
    parent_2_key: '',
    notes: '',
  };
  @state() private _pollinationForm = {
    date: '', donor_plant_id: '', receiver_plant_id: '', notes: ''
  };
  @state() private _harvestForm = { quantity: 1, notes: '' };

  static styles = [
    ...dialogStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .sd-content {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .seeds-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .seeds-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10px;
      }
      .seeds-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .seed-batch-card {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 10px;
      }
      .seed-batch-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }
      .seed-batch-name {
        font-weight: 700;
        font-size: 1rem;
        color: var(--primary-text-color);
      }
      .seed-batch-edit-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--secondary-text-color);
        cursor: pointer;
        padding: 0;
        transition: background 0.15s, color 0.15s;
      }
      .seed-batch-edit-btn:hover {
        background: var(--divider-color, rgba(255,255,255,0.1));
        color: var(--primary-text-color);
      }
      .seed-batch-edit-btn svg {
        fill: currentColor;
      }
      .seed-batch-meta {
        font-size: 0.82rem;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
      }
      .seed-batch-parents {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
      }
      .seed-batch-parent-chip {
        font-size: 0.78rem;
        color: var(--primary-text-color);
        background: var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 6px;
        padding: 2px 7px;
      }
      .seed-batch-parent-sep {
        font-size: 0.78rem;
        color: var(--secondary-text-color);
        font-weight: 600;
      }
      .seed-batch-lineage {
        font-size: 0.8rem;
        color: var(--accent-green, #4caf50);
        margin-bottom: 4px;
      }
      .seed-batch-notes {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-style: italic;
      }
      .seed-batch-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .sow-form {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
        padding: 10px 12px;
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
        border-radius: 8px;
      }
      .sow-select {
        flex: 1;
        min-width: 120px;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 13px;
      }
      .sow-qty {
        width: 64px;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-size: 13px;
        text-align: center;
      }
      .pollination-card {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .pollination-date {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--primary-text-color);
      }
      .pollination-plants {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }
      .pollination-notes {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-style: italic;
      }
      .pollination-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pollination-card-actions {
        display: flex;
        gap: 4px;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--secondary-text-color);
        padding: 2px;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      .icon-btn:hover {
        color: var(--primary-text-color);
        background: var(--divider-color, rgba(255,255,255,0.08));
      }
      .icon-btn.danger:hover {
        color: var(--error-color, #f44336);
      }
      .delete-confirm-text {
        font-size: 0.75rem;
        color: var(--error-color, #f44336);
        align-self: center;
      }
      .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.78rem;
        font-weight: 600;
        margin-top: 4px;
      }
      .badge.success {
        background: rgba(76, 175, 80, 0.15);
        color: var(--accent-green, #4caf50);
      }
      .empty-state {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        margin: 8px 0 16px 0;
      }

      /* Form view alignment */
      .form-view {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 4px;
      }
      .form-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .form-view label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .form-view input, .form-view select {
        background: var(--secondary-background-color, rgba(255,255,255,0.05));
        border: 1px solid var(--divider-color, rgba(255,255,255,0.15));
        border-radius: 8px;
        padding: 10px 14px;
        color: var(--primary-text-color, #fff);
        font-size: 0.95rem;
        outline: none;
        font-family: inherit;
      }
      .form-view input:focus, .form-view select:focus {
        border-color: var(--accent-green, #4caf50);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
      }
      .form-error {
        color: var(--error-color, #f44336);
        font-size: 0.85rem;
        margin: 4px 0 0;
      }
    `,
  ];

  private get _flowerVegPlants(): Array<{ plant_id: string; label: string }> {
    const ELIGIBLE_STAGES = ['flower', 'veg'];
    return this.plants.flatMap((device) =>
      device.plants
        .filter((p) => ELIGIBLE_STAGES.includes(p.attributes.stage))
        .map((p) => {
          const stage = p.attributes.stage;
          const stageDays = p.attributes[`${stage}_days` as keyof typeof p.attributes] as number | null | undefined;
          const daysStr = stageDays != null ? ` · Day ${stageDays}` : '';
          const strain = p.attributes.strain ?? '';
          const phenotype = p.attributes.phenotype;
          const phenoStr = phenotype ? ` (${phenotype})` : '';
          const label = `${strain}${phenoStr} · ${stage}${daysStr} · ${device.name}`;
          return { plant_id: p.attributes.plant_id, label };
        })
    );
  }

  private _getPlantLabel(plant_id: string): string {
    for (const device of this.plants) {
      for (const p of device.plants) {
        if (p.attributes.plant_id === plant_id) {
          const strain = p.attributes.strain ?? '';
          const phenotype = p.attributes.phenotype;
          return phenotype ? `${strain} (${phenotype})` : (strain || plant_id);
        }
      }
    }
    return plant_id;
  }

  render(): TemplateResult {
    if (this._seedSubView === 'add-batch') return this._renderAddBatchForm();
    if (this._seedSubView === 'log-pollination') return this._renderLogPollinationForm();
    if (this._seedSubView === 'harvest') return this._renderHarvestForm();
    return this._renderSeedList();
  }

  private _renderSeedList(): TemplateResult {
    return html`
      <div class="dialog-header">
        <div class="dialog-icon">
          <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiLeaf}"></path>
          </svg>
        </div>
        <div class="dialog-title-group">
          <h2 class="dialog-title">Seeds &amp; Genetics</h2>
        </div>
        <div class="header-actions" style="display:flex; gap:8px;">
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
      </div>
      <div class="sd-content">
        <div class="seeds-section">
          <div class="seeds-header">
            <h3>Seed inventory</h3>
            <button class="md3-button filled" @click=${() => {
        this._editingBatchId = null;
        this._batchForm = { strain_name: '', breeder: '', quantity: 1, acquisition_date: '', generation: 'F1', parent_1_key: '', parent_2_key: '', notes: '' };
        this._submitError = null;
        this._seedSubView = 'add-batch';
      }}>
              Add batch
            </button>
          </div>
          ${this.seedBatches.length === 0
        ? html`<p class="empty-state">No seed batches yet.</p>`
        : this.seedBatches.map(b => html`
              <div class="seed-batch-card">
                <div class="seed-batch-card-header">
                  <div class="seed-batch-name">${b.strain_name}</div>
                  <button class="seed-batch-edit-btn" title="Edit batch" @click=${() => {
            const p1Key = b.parent_1_strain
              ? `${b.parent_1_strain}||${b.parent_1_phenotype ?? ''}`
              : '';
            const p2Key = b.parent_2_strain
              ? `${b.parent_2_strain}||${b.parent_2_phenotype ?? ''}`
              : '';
            this._batchForm = {
              strain_name: b.strain_name,
              breeder: b.breeder,
              quantity: b.quantity,
              acquisition_date: b.acquisition_date,
              generation: b.generation,
              parent_1_key: p1Key,
              parent_2_key: p2Key,
              notes: b.notes ?? '',
            };
            this._editingBatchId = b.batch_id;
            this._submitError = null;
            this._seedSubView = 'add-batch';
          }}>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="${mdiPencil}"></path>
                    </svg>
                  </button>
                </div>
                <div class="seed-batch-meta">${b.breeder} · ${b.generation} · ${b.quantity} seeds · ${b.acquisition_date}</div>
                ${(b.parent_1_strain || b.parent_2_strain) ? html`
                  <div class="seed-batch-parents">
                    ${b.parent_1_strain ? html`<span class="seed-batch-parent-chip">♀ ${b.parent_1_strain}${b.parent_1_phenotype ? ` (${b.parent_1_phenotype})` : ''}</span>` : nothing}
                    ${(b.parent_1_strain && b.parent_2_strain) ? html`<span class="seed-batch-parent-sep">×</span>` : nothing}
                    ${b.parent_2_strain ? html`<span class="seed-batch-parent-chip">♂ ${b.parent_2_strain}${b.parent_2_phenotype ? ` (${b.parent_2_phenotype})` : ''}</span>` : nothing}
                  </div>
                ` : nothing}
                ${b.lineage ? html`<div class="seed-batch-lineage">${b.lineage}</div>` : nothing}
                ${b.notes ? html`<div class="seed-batch-notes">${b.notes}</div>` : nothing}
                <div class="seed-batch-actions">
                  <button class="md3-button tonal" style="font-size:12px;" @click=${() => {
            if (this._sowBatchId === b.batch_id) {
              this._sowBatchId = null;
            } else {
              this._sowBatchId = b.batch_id;
              this._sowQuantity = 1;
              this._sowGrowspaceId = this.plants[0]?.deviceId ?? '';
            }
            this._confirmDeleteBatchId = null;
          }}>🌱 Sow seeds</button>
                  ${this._confirmDeleteBatchId === b.batch_id
            ? html`
                        <span style="font-size:12px; color:var(--secondary-text-color);">Delete?</span>
                        <button class="icon-btn danger" title="Confirm delete" @click=${async () => {
                await this.onDeleteSeedBatch?.(b.batch_id);
                this._confirmDeleteBatchId = null;
                this.onSeedDataChanged?.();
              }}>
                          <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiCheck}"></path></svg>
                        </button>
                        <button class="icon-btn" title="Cancel" @click=${() => { this._confirmDeleteBatchId = null; }}>
                          <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiClose}"></path></svg>
                        </button>
                      `
            : html`
                        <button class="icon-btn danger" title="Delete batch" @click=${() => { this._confirmDeleteBatchId = b.batch_id; this._sowBatchId = null; }}>
                          <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiDelete}"></path></svg>
                        </button>
                      `
          }
                </div>
                ${this._sowBatchId === b.batch_id ? html`
                  <div class="sow-form">
                    <select
                      class="sow-select"
                      .value=${this._sowGrowspaceId}
                      @change=${(e: Event) => { this._sowGrowspaceId = (e.target as HTMLSelectElement).value; }}
                    >
                      ${this.plants.map(g => html`
                        <option value=${g.deviceId} ?selected=${g.deviceId === this._sowGrowspaceId}>${g.name}</option>
                      `)}
                    </select>
                    <input
                      type="number"
                      class="sow-qty"
                      min="1"
                      max=${b.quantity}
                      .value=${String(this._sowQuantity)}
                      @input=${(e: Event) => { this._sowQuantity = Number((e.target as HTMLInputElement).value); }}
                      placeholder="Seeds"
                    />
                    <button
                      class="md3-button filled"
                      style="font-size:12px;"
                      ?disabled=${this._sowSubmitting || !this._sowGrowspaceId}
                      @click=${async () => {
              if (!this._sowGrowspaceId) return;
              this._sowSubmitting = true;
              try {
                await this.onSowSeeds?.({
                  growspace_id: this._sowGrowspaceId,
                  strain: b.strain_name,
                  amount: this._sowQuantity,
                  seed_batch_id: b.batch_id,
                  generation: b.generation,
                });
                this._sowBatchId = null;
                this.onSeedDataChanged?.();
              } finally {
                this._sowSubmitting = false;
              }
            }}
                    >${this._sowSubmitting ? 'Planting…' : 'Plant'}</button>
                    <button class="md3-button text" style="font-size:12px;" @click=${() => { this._sowBatchId = null; }}>Cancel</button>
                  </div>
                ` : nothing}
              </div>
            `)
      }

          <div class="seeds-header">
            <h3>Pollination log</h3>
            <button class="md3-button tonal" @click=${() => { this._seedSubView = 'log-pollination'; }}>
              Log pollination
            </button>
          </div>
          ${this.pollinationEvents.length === 0
        ? html`<p class="empty-state">No pollination events yet.</p>`
        : this.pollinationEvents.map(e => html`
              <div class="pollination-card">
                <div class="pollination-card-header">
                  <div class="pollination-date">${e.date}</div>
                  <div class="pollination-card-actions">
                    <button class="icon-btn" title="Edit" @click=${() => {
            this._editingEventId = e.event_id;
            this._pollinationForm = {
              date: e.date,
              donor_plant_id: e.donor_plant_id,
              receiver_plant_id: e.receiver_plant_id,
              notes: e.notes ?? '',
            };
            this._seedSubView = 'log-pollination';
          }}>
                      <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiPencil}"></path></svg>
                    </button>
                    ${this._confirmDeleteEventId === e.event_id
            ? html`
                          <span class="delete-confirm-text">Delete?</span>
                          <button class="icon-btn danger" title="Confirm delete" @click=${async () => {
                await this.onDeletePollination?.(e.event_id);
                this._confirmDeleteEventId = null;
                this.onSeedDataChanged?.();
              }}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiCheck}"></path></svg>
                          </button>
                          <button class="icon-btn" title="Cancel" @click=${() => { this._confirmDeleteEventId = null; }}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiClose}"></path></svg>
                          </button>
                        `
            : html`
                          <button class="icon-btn danger" title="Delete" @click=${() => { this._confirmDeleteEventId = e.event_id; }}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${mdiDelete}"></path></svg>
                          </button>
                        `
          }
                  </div>
                </div>
                <div class="pollination-plants">♂ ${this._getPlantLabel(e.donor_plant_id)} × ♀ ${this._getPlantLabel(e.receiver_plant_id)}</div>
                ${e.notes ? html`<div class="pollination-notes">${e.notes}</div>` : nothing}
                ${e.result_seed_batch_id
            ? html`<span class="badge success">Seeds harvested</span>`
            : html`
                      <button class="md3-button tonal" @click=${() => {
                this._selectedEventId = e.event_id;
                this._seedSubView = 'harvest';
              }}>Harvest seeds</button>
                    `
          }
              </div>
            `)
      }
        </div>
      </div>
    `;
  }

  private _renderAddBatchForm(): TemplateResult {
    const isEditing = this._editingBatchId !== null;
    const uniqueBreeders = [...new Set(this.strains.map((s) => s.breeder).filter(Boolean))].sort() as string[];

    const strainOptions = this.strains
      .slice()
      .sort((a, b) => `${a.strain} ${a.phenotype}`.localeCompare(`${b.strain} ${b.phenotype}`))
      .map((s) => ({
        key: `${s.strain}||${s.phenotype}`,
        label: s.phenotype ? `${s.strain} (${s.phenotype})` : s.strain,
      }));

    return html`
      <datalist id="batch-breeder-suggestions">
        ${uniqueBreeders.map((name) => html`<option value="${name}"></option>`)}
      </datalist>
      <div class="form-view">
        <div class="form-header">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._editingBatchId = null; }}>← Back</button>
          <h3>${isEditing ? 'Edit seed batch' : 'Add seed batch'}</h3>
        </div>
        <label>Strain name
          <input type="text" .value=${this._batchForm.strain_name}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, strain_name: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Breeder
          <input type="text" list="batch-breeder-suggestions" .value=${this._batchForm.breeder}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, breeder: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Quantity
          <input type="number" min="1" .value=${String(this._batchForm.quantity)}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, quantity: parseInt((e.target as HTMLInputElement).value) || 1 }; }} />
        </label>
        <label>Acquisition date
          <input type="date" .value=${this._batchForm.acquisition_date}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, acquisition_date: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Generation
          <input type="text" placeholder="F1, S1, BX1…" .value=${this._batchForm.generation}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, generation: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Parent 1
          <select @change=${(e: Event) => { this._batchForm = { ...this._batchForm, parent_1_key: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— none —</option>
            ${strainOptions.map((o) => html`<option value="${o.key}" ?selected=${this._batchForm.parent_1_key === o.key}>${o.label}</option>`)}
          </select>
        </label>
        <label>Parent 2
          <select @change=${(e: Event) => { this._batchForm = { ...this._batchForm, parent_2_key: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— none —</option>
            ${strainOptions.map((o) => html`<option value="${o.key}" ?selected=${this._batchForm.parent_2_key === o.key}>${o.label}</option>`)}
          </select>
        </label>
        <label>Notes
          <input type="text" .value=${this._batchForm.notes}
            @input=${(e: Event) => { this._batchForm = { ...this._batchForm, notes: (e.target as HTMLInputElement).value }; }} />
        </label>
        ${this._submitError ? html`<p class="form-error">${this._submitError}</p>` : nothing}
        <div class="form-actions">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._editingBatchId = null; this._submitError = null; }}>Cancel</button>
          <button class="md3-button filled" @click=${this._submitAddBatch}>Save</button>
        </div>
      </div>
    `;
  }

  private _renderLogPollinationForm(): TemplateResult {
    const eligiblePlants = this._flowerVegPlants;

    return html`
      <div class="form-view">
        <div class="form-header">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._editingEventId = null; this._pollinationForm = { date: '', donor_plant_id: '', receiver_plant_id: '', notes: '' }; }}>← Back</button>
          <h3>${this._editingEventId ? 'Edit pollination' : 'Log pollination'}</h3>
        </div>
        <label>Date
          <input type="date" .value=${this._pollinationForm.date}
            @input=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, date: (e.target as HTMLInputElement).value }; }} />
        </label>
        <label>Donor plant (male / pollen donor)
          <select @change=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, donor_plant_id: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— select plant —</option>
            ${eligiblePlants.map((p) => html`
              <option value="${p.plant_id}" ?selected=${this._pollinationForm.donor_plant_id === p.plant_id}>
                ${p.label}
              </option>
            `)}
          </select>
        </label>
        <label>Receiver plant (female / seed bearer)
          <select @change=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, receiver_plant_id: (e.target as HTMLSelectElement).value }; }}>
            <option value="">— select plant —</option>
            ${eligiblePlants.map((p) => html`
              <option value="${p.plant_id}" ?selected=${this._pollinationForm.receiver_plant_id === p.plant_id}>
                ${p.label}
              </option>
            `)}
          </select>
        </label>
        <label>Notes
          <input type="text" .value=${this._pollinationForm.notes}
            @input=${(e: Event) => { this._pollinationForm = { ...this._pollinationForm, notes: (e.target as HTMLInputElement).value }; }} />
        </label>
        ${this._submitError ? html`<p class="form-error">${this._submitError}</p>` : nothing}
        <div class="form-actions">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._submitError = null; }}>Cancel</button>
          <button class="md3-button filled" @click=${this._submitLogPollination}>Save</button>
        </div>
      </div>
    `;
  }

  private _renderHarvestForm(): TemplateResult {
    return html`
      <div class="form-view">
        <div class="form-header">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._selectedEventId = null; }}>← Back</button>
          <h3>Harvest seeds</h3>
        </div>
        <label>Quantity
          <input type="number" min="1" .value=${String(this._harvestForm.quantity)}
            @input=${(e: Event) => { this._harvestForm = { ...this._harvestForm, quantity: parseInt((e.target as HTMLInputElement).value) || 1 }; }} />
        </label>
        <label>Notes
          <input type="text" .value=${this._harvestForm.notes}
            @input=${(e: Event) => { this._harvestForm = { ...this._harvestForm, notes: (e.target as HTMLInputElement).value }; }} />
        </label>
        ${this._submitError ? html`<p class="form-error">${this._submitError}</p>` : nothing}
        <div class="form-actions">
          <button class="md3-button tonal" @click=${() => { this._seedSubView = 'list'; this._selectedEventId = null; this._submitError = null; }}>Cancel</button>
          <button class="md3-button filled" @click=${this._submitHarvestSeeds}>Save</button>
        </div>
      </div>
    `;
  }

  private async _submitAddBatch(): Promise<void> {
    const f = this._batchForm;
    if (!f.strain_name || !f.breeder || !f.acquisition_date || !f.generation) {
      this._submitError = 'Please fill in all required fields.';
      return;
    }
    this._submitError = null;

    const resolveKey = (key: string): { strain: string | null; phenotype: string | null } => {
      if (!key) return { strain: null, phenotype: null };
      const [strain, phenotype] = key.split('||', 2);
      return { strain: strain || null, phenotype: phenotype || null };
    };
    const p1 = resolveKey(f.parent_1_key);
    const p2 = resolveKey(f.parent_2_key);

    try {
      if (this._editingBatchId) {
        await this.onUpdateSeedBatch?.({
          batch_id: this._editingBatchId,
          strain_name: f.strain_name,
          breeder: f.breeder,
          quantity: f.quantity,
          acquisition_date: f.acquisition_date,
          generation: f.generation,
          parent_1_strain: p1.strain,
          parent_1_phenotype: p1.phenotype,
          parent_2_strain: p2.strain,
          parent_2_phenotype: p2.phenotype,
          notes: f.notes,
        });
      } else {
        await this.onAddSeedBatch?.({
          strain_name: f.strain_name,
          breeder: f.breeder,
          quantity: f.quantity,
          acquisition_date: f.acquisition_date,
          generation: f.generation,
          parent_1_strain: p1.strain,
          parent_1_phenotype: p1.phenotype,
          parent_2_strain: p2.strain,
          parent_2_phenotype: p2.phenotype,
          notes: f.notes,
        });
      }
      this._seedSubView = 'list';
      this._editingBatchId = null;
      this._batchForm = { strain_name: '', breeder: '', quantity: 1, acquisition_date: '', generation: 'F1', parent_1_key: '', parent_2_key: '', notes: '' };
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to save seed batch', e);
      this._submitError = 'Failed to save. Please check your connection and try again.';
    }
  }

  private async _submitLogPollination(): Promise<void> {
    const f = this._pollinationForm;
    if (!f.donor_plant_id || !f.receiver_plant_id || !f.date) {
      this._submitError = 'Please fill in all required fields.';
      return;
    }
    this._submitError = null;
    try {
      if (this._editingEventId) {
        await this.onUpdatePollination?.({
          event_id: this._editingEventId,
          date: f.date,
          donor_plant_id: f.donor_plant_id,
          receiver_plant_id: f.receiver_plant_id,
          notes: f.notes,
        });
        this._editingEventId = null;
      } else {
        await this.onLogPollination?.({
          date: f.date,
          donor_plant_id: f.donor_plant_id,
          receiver_plant_id: f.receiver_plant_id,
          notes: f.notes,
        });
      }
      this._seedSubView = 'list';
      this._pollinationForm = { date: '', donor_plant_id: '', receiver_plant_id: '', notes: '' };
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to log pollination', e);
      this._submitError = 'Failed to save. Please check your connection and try again.';
    }
  }

  private async _submitHarvestSeeds(): Promise<void> {
    const f = this._harvestForm;
    if (!this._selectedEventId || !f.quantity) {
      this._submitError = 'Please fill in all required fields.';
      return;
    }
    this._submitError = null;
    try {
      await this.onHarvestSeeds?.({
        event_id: this._selectedEventId,
        quantity: f.quantity,
        notes: f.notes,
      });
      this._seedSubView = 'list';
      this._selectedEventId = null;
      this._harvestForm = { quantity: 1, notes: '' };
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to harvest seeds', e);
      this._submitError = 'Failed to save. Please check your connection and try again.';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'seeds-genetics-tab': SeedsGeneticsTab;
  }
}
