import { LitElement, css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiLeaf, mdiClose, mdiPencil, mdiCheck, mdiDelete } from '@mdi/js';
import type { StrainEntry, SeedBatch, PollinationEvent, GrowspaceDevice } from '../types';
import { dialogStyles } from '../styles/dialog.styles';
import {
  createInitialSM,
  transition,
  validateBatchDraft,
  validatePollinationDraft,
  validateHarvestDraft,
  type SeedsSM,
  type BatchDraft,
  type PollinationDraft,
} from './seeds-genetics-tab-sm';

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

  /** When set, the tab opens directly on this sub-view instead of the list. */
  @property({ type: String }) initialSubView?: 'list' | 'log-pollination';
  /** Pre-fills the receiver plant field in the log-pollination form. */
  @property({ type: String }) prefilledReceiverId?: string;

  @state() private _sm: SeedsSM = createInitialSM();

  connectedCallback(): void {
    super.connectedCallback();
    if (this.initialSubView === 'log-pollination') {
      this._sm = createInitialSM({
        initialView: 'log-pollination',
        prefilledReceiverId: this.prefilledReceiverId,
      });
    }
  }

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
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
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
        transition:
          background 0.15s,
          color 0.15s;
      }
      .seed-batch-edit-btn:hover {
        background: var(--divider-color, rgba(255, 255, 255, 0.1));
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
        background: var(--divider-color, rgba(255, 255, 255, 0.08));
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
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
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
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
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
        background: var(--divider-color, rgba(255, 255, 255, 0.08));
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
      .form-view input,
      .form-view select {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        padding: 10px 14px;
        color: var(--primary-text-color, #fff);
        font-size: 0.95rem;
        outline: none;
        font-family: inherit;
      }
      .form-view input:focus,
      .form-view select:focus {
        border-color: var(--accent-green, #4caf50);
      }
      .checkbox-label {
        flex-direction: row !important;
        align-items: center;
        gap: 8px !important;
        font-weight: 400 !important;
        color: var(--primary-text-color) !important;
        cursor: pointer;
        margin-top: -4px;
      }
      .checkbox-label input[type='checkbox'] {
        width: 16px;
        height: 16px;
        border-radius: 4px !important;
        padding: 0 !important;
        accent-color: var(--accent-green, #4caf50);
        cursor: pointer;
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
          const stageDays = p.attributes[`${stage}_days` as keyof typeof p.attributes] as
            | number
            | null
            | undefined;
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
          return phenotype ? `${strain} (${phenotype})` : strain || plant_id;
        }
      }
    }
    // Fall back to strain library for library-keyed donor IDs ("strain||phenotype")
    if (plant_id && plant_id.includes('||')) {
      const [strain, phenotype] = plant_id.split('||', 2);
      return phenotype ? `${strain} (${phenotype})` : strain || plant_id;
    }
    return plant_id;
  }

  render(): TemplateResult {
    const { activeView } = this._sm;
    if (activeView === 'add-batch') return this._renderAddBatchForm();
    if (activeView === 'log-pollination') return this._renderLogPollinationForm();
    if (activeView === 'harvest') return this._renderHarvestForm();
    return this._renderSeedList();
  }

  private _renderSeedList(): TemplateResult {
    const listSub = this._sm.views.list.sub;
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
            @click=${() =>
              this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }))}
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
            <button
              class="md3-button filled"
              @click=${() => {
                this._sm = transition(this._sm, { type: 'BEGIN_ADD_BATCH' });
              }}
            >
              Add batch
            </button>
          </div>
          ${this.seedBatches.length === 0
            ? html`<p class="empty-state">No seed batches yet.</p>`
            : this.seedBatches.map((b) => this._renderSeedBatchCard(b, listSub))}

          <div class="seeds-header">
            <h3>Pollination log</h3>
            <button
              class="md3-button tonal"
              @click=${() => {
                this._sm = transition(this._sm, { type: 'BEGIN_LOG_POLLINATION' });
              }}
            >
              Log pollination
            </button>
          </div>
          ${this.pollinationEvents.length === 0
            ? html`<p class="empty-state">No pollination events yet.</p>`
            : this.pollinationEvents.map((e) => this._renderPollinationCard(e, listSub))}
        </div>
      </div>
    `;
  }

  private _renderSeedBatchCard(
    b: SeedBatch,
    listSub: SeedsSM['views']['list']['sub']
  ): TemplateResult {
    const isSowOpen = listSub.kind === 'sow' && listSub.batchId === b.batch_id;
    const isDeleteConfirm =
      listSub.kind === 'confirm-delete-batch' && listSub.batchId === b.batch_id;

    return html`
      <div class="seed-batch-card">
        <div class="seed-batch-card-header">
          <div class="seed-batch-name">${b.strain_name}</div>
          <button
            class="seed-batch-edit-btn"
            title="Edit batch"
            @click=${() => {
              const draft: BatchDraft = {
                strainName: b.strain_name,
                breeder: b.breeder,
                quantity: b.quantity,
                acquisitionDate: b.acquisition_date,
                generation: b.generation,
                parent1Key: b.parent_1_strain
                  ? `${b.parent_1_strain}||${b.parent_1_phenotype ?? ''}`
                  : '',
                parent2Key: b.parent_2_strain
                  ? `${b.parent_2_strain}||${b.parent_2_phenotype ?? ''}`
                  : '',
                notes: b.notes ?? '',
              };
              this._sm = transition(this._sm, {
                type: 'BEGIN_EDIT_BATCH',
                batchId: b.batch_id,
                draft,
              });
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
        </div>
        <div class="seed-batch-meta">
          ${b.breeder} · ${b.generation} · ${b.quantity} seeds · ${b.acquisition_date}
        </div>
        ${b.parent_1_strain || b.parent_2_strain
          ? html`
              <div class="seed-batch-parents">
                ${b.parent_1_strain
                  ? html`<span class="seed-batch-parent-chip"
                      >♀
                      ${b.parent_1_strain}${b.parent_1_phenotype
                        ? ` (${b.parent_1_phenotype})`
                        : ''}</span
                    >`
                  : nothing}
                ${b.parent_1_strain && b.parent_2_strain
                  ? html`<span class="seed-batch-parent-sep">×</span>`
                  : nothing}
                ${b.parent_2_strain
                  ? html`<span class="seed-batch-parent-chip"
                      >♂
                      ${b.parent_2_strain}${b.parent_2_phenotype
                        ? ` (${b.parent_2_phenotype})`
                        : ''}</span
                    >`
                  : nothing}
              </div>
            `
          : nothing}
        ${b.lineage ? html`<div class="seed-batch-lineage">${b.lineage}</div>` : nothing}
        ${b.notes ? html`<div class="seed-batch-notes">${b.notes}</div>` : nothing}
        <div class="seed-batch-actions">
          <button
            class="md3-button tonal"
            style="font-size:12px;"
            @click=${() => {
              if (isSowOpen) {
                this._sm = transition(this._sm, { type: 'SOW_CANCELLED' });
              } else {
                this._sm = transition(this._sm, {
                  type: 'SOW_OPENED',
                  batchId: b.batch_id,
                  defaultGrowspaceId: this.plants[0]?.deviceId ?? '',
                });
              }
            }}
          >
            🌱 Sow seeds
          </button>
          ${isDeleteConfirm
            ? html`
                <span style="font-size:12px; color:var(--secondary-text-color);">Delete?</span>
                <button
                  class="icon-btn danger"
                  title="Confirm delete"
                  @click=${async () => {
                    await this.onDeleteSeedBatch?.(b.batch_id);
                    this._sm = transition(this._sm, { type: 'DELETE_CONFIRMED' });
                    this.onSeedDataChanged?.();
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="${mdiCheck}"></path>
                  </svg>
                </button>
                <button
                  class="icon-btn"
                  title="Cancel"
                  @click=${() => {
                    this._sm = transition(this._sm, { type: 'DELETE_CANCELLED' });
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="${mdiClose}"></path>
                  </svg>
                </button>
              `
            : html`
                <button
                  class="icon-btn danger"
                  title="Delete batch"
                  @click=${() => {
                    this._sm = transition(this._sm, {
                      type: 'DELETE_BATCH_REQUESTED',
                      batchId: b.batch_id,
                    });
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path d="${mdiDelete}"></path>
                  </svg>
                </button>
              `}
        </div>
        ${isSowOpen && listSub.kind === 'sow'
          ? html`
              <div class="sow-form">
                <select
                  class="sow-select"
                  .value=${listSub.growspaceId}
                  @change=${(e: Event) => {
                    this._sm = transition(this._sm, {
                      type: 'SOW_FIELD_CHANGED',
                      partial: { growspaceId: (e.target as HTMLSelectElement).value },
                    });
                  }}
                >
                  ${this.plants.map(
                    (g) => html`
                      <option value=${g.deviceId} ?selected=${g.deviceId === listSub.growspaceId}>
                        ${g.name}
                      </option>
                    `
                  )}
                </select>
                <input
                  type="number"
                  class="sow-qty"
                  min="1"
                  max=${b.quantity}
                  .value=${String(listSub.quantity)}
                  @input=${(e: Event) => {
                    this._sm = transition(this._sm, {
                      type: 'SOW_FIELD_CHANGED',
                      partial: { quantity: Number((e.target as HTMLInputElement).value) },
                    });
                  }}
                  placeholder="Seeds"
                />
                <button
                  class="md3-button filled"
                  style="font-size:12px;"
                  ?disabled=${listSub.sub.kind === 'applying' || !listSub.growspaceId}
                  @click=${async () => {
                    if (!listSub.growspaceId || listSub.kind !== 'sow') return;
                    this._sm = transition(this._sm, { type: 'SOW_APPLY_REQUESTED' });
                    try {
                      await this.onSowSeeds?.({
                        growspace_id: listSub.growspaceId,
                        strain: b.strain_name,
                        amount: listSub.quantity,
                        seed_batch_id: b.batch_id,
                        generation: b.generation,
                      });
                      this._sm = transition(this._sm, { type: 'SOW_CANCELLED' });
                      this.onSeedDataChanged?.();
                    } catch {
                      this._sm = transition(this._sm, { type: 'SOW_APPLY_FAILED' });
                    }
                  }}
                >
                  ${listSub.sub.kind === 'applying' ? 'Planting…' : 'Plant'}
                </button>
                <button
                  class="md3-button text"
                  style="font-size:12px;"
                  @click=${() => {
                    this._sm = transition(this._sm, { type: 'SOW_CANCELLED' });
                  }}
                >
                  Cancel
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderPollinationCard(
    e: PollinationEvent,
    listSub: SeedsSM['views']['list']['sub']
  ): TemplateResult {
    const isDeleteConfirm =
      listSub.kind === 'confirm-delete-pollination' && listSub.eventId === e.event_id;

    return html`
      <div class="pollination-card">
        <div class="pollination-card-header">
          <div class="pollination-date">${e.date}</div>
          <div class="pollination-card-actions">
            <button
              class="icon-btn"
              title="Edit"
              @click=${() => {
                const draft: PollinationDraft = {
                  date: e.date,
                  donorPlantId: e.donor_plant_id,
                  receiverPlantId: e.receiver_plant_id,
                  notes: e.notes ?? '',
                  donorActivePlantsOnly: !e.donor_plant_id.includes('||'),
                };
                this._sm = transition(this._sm, {
                  type: 'BEGIN_EDIT_POLLINATION',
                  eventId: e.event_id,
                  draft,
                });
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="${mdiPencil}"></path>
              </svg>
            </button>
            ${isDeleteConfirm
              ? html`
                  <span class="delete-confirm-text">Delete?</span>
                  <button
                    class="icon-btn danger"
                    title="Confirm delete"
                    @click=${async () => {
                      await this.onDeletePollination?.(e.event_id);
                      this._sm = transition(this._sm, { type: 'DELETE_CONFIRMED' });
                      this.onSeedDataChanged?.();
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="${mdiCheck}"></path>
                    </svg>
                  </button>
                  <button
                    class="icon-btn"
                    title="Cancel"
                    @click=${() => {
                      this._sm = transition(this._sm, { type: 'DELETE_CANCELLED' });
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="${mdiClose}"></path>
                    </svg>
                  </button>
                `
              : html`
                  <button
                    class="icon-btn danger"
                    title="Delete"
                    @click=${() => {
                      this._sm = transition(this._sm, {
                        type: 'DELETE_POLLINATION_REQUESTED',
                        eventId: e.event_id,
                      });
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="${mdiDelete}"></path>
                    </svg>
                  </button>
                `}
          </div>
        </div>
        <div class="pollination-plants">
          ♂ ${this._getPlantLabel(e.donor_plant_id)} × ♀
          ${this._getPlantLabel(e.receiver_plant_id)}
        </div>
        ${e.notes ? html`<div class="pollination-notes">${e.notes}</div>` : nothing}
        ${e.result_seed_batch_id
          ? html`<span class="badge success">Seeds harvested</span>`
          : html`
              <button
                class="md3-button tonal"
                @click=${() => {
                  this._sm = transition(this._sm, {
                    type: 'BEGIN_HARVEST',
                    eventId: e.event_id,
                  });
                }}
              >
                Harvest seeds
              </button>
            `}
      </div>
    `;
  }

  private _renderAddBatchForm(): TemplateResult {
    const view = this._sm.views['add-batch'];
    const { draft, sub, editingBatchId } = view;
    const isEditing = editingBatchId !== null;
    const uniqueBreeders = [
      ...new Set(this.strains.map((s) => s.breeder).filter(Boolean)),
    ].sort() as string[];

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
          <button
            class="md3-button tonal"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'NAVIGATE_BACK' });
            }}
          >
            ← Back
          </button>
          <h3>${isEditing ? 'Edit seed batch' : 'Add seed batch'}</h3>
        </div>
        <label
          >Strain name
          <input
            type="text"
            .value=${draft.strainName}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { strainName: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        <label
          >Breeder
          <input
            type="text"
            list="batch-breeder-suggestions"
            .value=${draft.breeder}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { breeder: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        <label
          >Quantity
          <input
            type="number"
            min="1"
            .value=${String(draft.quantity)}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { quantity: parseInt((e.target as HTMLInputElement).value) || 1 },
              });
            }}
          />
        </label>
        <label
          >Acquisition date
          <input
            type="date"
            .value=${draft.acquisitionDate}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { acquisitionDate: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        <label
          >Generation
          <input
            type="text"
            placeholder="F1, S1, BX1…"
            .value=${draft.generation}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { generation: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        <label
          >Parent 1
          <select
            @change=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { parent1Key: (e.target as HTMLSelectElement).value },
              });
            }}
          >
            <option value="">— none —</option>
            ${strainOptions.map(
              (o) =>
                html`<option value="${o.key}" ?selected=${draft.parent1Key === o.key}>
                  ${o.label}
                </option>`
            )}
          </select>
        </label>
        <label
          >Parent 2
          <select
            @change=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { parent2Key: (e.target as HTMLSelectElement).value },
              });
            }}
          >
            <option value="">— none —</option>
            ${strainOptions.map(
              (o) =>
                html`<option value="${o.key}" ?selected=${draft.parent2Key === o.key}>
                  ${o.label}
                </option>`
            )}
          </select>
        </label>
        <label
          >Notes
          <input
            type="text"
            .value=${draft.notes}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_BATCH_DRAFT',
                partial: { notes: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        ${sub.kind === 'error' ? html`<p class="form-error">${sub.message}</p>` : nothing}
        <div class="form-actions">
          <button
            class="md3-button tonal"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'NAVIGATE_BACK' });
            }}
          >
            Cancel
          </button>
          <button
            class="md3-button filled"
            ?disabled=${sub.kind === 'applying'}
            @click=${this._submitAddBatch}
          >
            Save
          </button>
        </div>
      </div>
    `;
  }

  private _renderLogPollinationForm(): TemplateResult {
    const view = this._sm.views['log-pollination'];
    const { draft, sub, editingEventId } = view;
    const eligiblePlants = this._flowerVegPlants;
    const libraryDonorOptions = this.strains
      .slice()
      .sort((a, b) => `${a.strain} ${a.phenotype}`.localeCompare(`${b.strain} ${b.phenotype}`))
      .map((s) => ({
        key: `${s.strain}||${s.phenotype}`,
        label: s.phenotype ? `${s.strain} (${s.phenotype})` : s.strain,
      }));
    const donorOptions = draft.donorActivePlantsOnly
      ? eligiblePlants.map((p) => ({ key: p.plant_id, label: p.label }))
      : libraryDonorOptions;

    return html`
      <div class="form-view">
        <div class="form-header">
          <button
            class="md3-button tonal"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'NAVIGATE_BACK' });
            }}
          >
            ← Back
          </button>
          <h3>${editingEventId ? 'Edit pollination' : 'Log pollination'}</h3>
        </div>
        <label
          >Date
          <input
            type="date"
            .value=${draft.date}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: { date: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        <label
          >Donor plant (male / pollen donor)
          <select
            @change=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: { donorPlantId: (e.target as HTMLSelectElement).value },
              });
            }}
          >
            <option value="">— select plant —</option>
            ${donorOptions.map(
              (o) => html`
                <option value="${o.key}" ?selected=${draft.donorPlantId === o.key}>
                  ${o.label}
                </option>
              `
            )}
          </select>
        </label>
        <label class="checkbox-label">
          <input
            type="checkbox"
            .checked=${draft.donorActivePlantsOnly}
            @change=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: {
                  donorActivePlantsOnly: (e.target as HTMLInputElement).checked,
                  donorPlantId: '',
                },
              });
            }}
          />
          Active plants only
        </label>
        <label
          >Receiver plant (female / seed bearer)
          <select
            @change=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: { receiverPlantId: (e.target as HTMLSelectElement).value },
              });
            }}
          >
            <option value="">— select plant —</option>
            ${eligiblePlants.map(
              (p) => html`
                <option value="${p.plant_id}" ?selected=${draft.receiverPlantId === p.plant_id}>
                  ${p.label}
                </option>
              `
            )}
          </select>
        </label>
        <label
          >Notes
          <input
            type="text"
            .value=${draft.notes}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_POLLINATION_DRAFT',
                partial: { notes: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        ${sub.kind === 'error' ? html`<p class="form-error">${sub.message}</p>` : nothing}
        <div class="form-actions">
          <button
            class="md3-button tonal"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'NAVIGATE_BACK' });
            }}
          >
            Cancel
          </button>
          <button
            class="md3-button filled"
            ?disabled=${sub.kind === 'applying'}
            @click=${this._submitLogPollination}
          >
            Save
          </button>
        </div>
      </div>
    `;
  }

  private _renderHarvestForm(): TemplateResult {
    const view = this._sm.views.harvest;
    const { draft, sub } = view;

    return html`
      <div class="form-view">
        <div class="form-header">
          <button
            class="md3-button tonal"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'NAVIGATE_BACK' });
            }}
          >
            ← Back
          </button>
          <h3>Harvest seeds</h3>
        </div>
        <label
          >Quantity
          <input
            type="number"
            min="1"
            .value=${String(draft.quantity)}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_HARVEST_DRAFT',
                partial: { quantity: parseInt((e.target as HTMLInputElement).value) || 1 },
              });
            }}
          />
        </label>
        <label
          >Notes
          <input
            type="text"
            .value=${draft.notes}
            @input=${(e: Event) => {
              this._sm = transition(this._sm, {
                type: 'UPDATE_HARVEST_DRAFT',
                partial: { notes: (e.target as HTMLInputElement).value },
              });
            }}
          />
        </label>
        ${sub.kind === 'error' ? html`<p class="form-error">${sub.message}</p>` : nothing}
        <div class="form-actions">
          <button
            class="md3-button tonal"
            @click=${() => {
              this._sm = transition(this._sm, { type: 'NAVIGATE_BACK' });
            }}
          >
            Cancel
          </button>
          <button
            class="md3-button filled"
            ?disabled=${sub.kind === 'applying'}
            @click=${this._submitHarvestSeeds}
          >
            Save
          </button>
        </div>
      </div>
    `;
  }

  private _submitAddBatch = async (): Promise<void> => {
    const view = this._sm.views['add-batch'];
    const { draft, editingBatchId } = view;
    const error = validateBatchDraft(draft);
    if (error) {
      this._sm = transition(this._sm, { type: 'SAVE_FAILED', message: error });
      return;
    }
    this._sm = transition(this._sm, { type: 'SAVE_REQUESTED' });

    const resolveKey = (key: string): { strain: string | null; phenotype: string | null } => {
      if (!key) return { strain: null, phenotype: null };
      const [strain, phenotype] = key.split('||', 2);
      return { strain: strain || null, phenotype: phenotype || null };
    };
    const p1 = resolveKey(draft.parent1Key);
    const p2 = resolveKey(draft.parent2Key);

    try {
      if (editingBatchId) {
        await this.onUpdateSeedBatch?.({
          batch_id: editingBatchId,
          strain_name: draft.strainName,
          breeder: draft.breeder,
          quantity: draft.quantity,
          acquisition_date: draft.acquisitionDate,
          generation: draft.generation,
          parent_1_strain: p1.strain,
          parent_1_phenotype: p1.phenotype,
          parent_2_strain: p2.strain,
          parent_2_phenotype: p2.phenotype,
          notes: draft.notes,
        });
      } else {
        await this.onAddSeedBatch?.({
          strain_name: draft.strainName,
          breeder: draft.breeder,
          quantity: draft.quantity,
          acquisition_date: draft.acquisitionDate,
          generation: draft.generation,
          parent_1_strain: p1.strain,
          parent_1_phenotype: p1.phenotype,
          parent_2_strain: p2.strain,
          parent_2_phenotype: p2.phenotype,
          notes: draft.notes,
        });
      }
      this._sm = transition(this._sm, { type: 'SAVE_RESOLVED' });
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to save seed batch', e);
      this._sm = transition(this._sm, {
        type: 'SAVE_FAILED',
        message: 'Failed to save. Please check your connection and try again.',
      });
    }
  };

  private _submitLogPollination = async (): Promise<void> => {
    const view = this._sm.views['log-pollination'];
    const { draft, editingEventId } = view;
    const error = validatePollinationDraft(draft);
    if (error) {
      this._sm = transition(this._sm, { type: 'SAVE_FAILED', message: error });
      return;
    }
    this._sm = transition(this._sm, { type: 'SAVE_REQUESTED' });
    try {
      if (editingEventId) {
        await this.onUpdatePollination?.({
          event_id: editingEventId,
          date: draft.date,
          donor_plant_id: draft.donorPlantId,
          receiver_plant_id: draft.receiverPlantId,
          notes: draft.notes,
        });
      } else {
        await this.onLogPollination?.({
          date: draft.date,
          donor_plant_id: draft.donorPlantId,
          receiver_plant_id: draft.receiverPlantId,
          notes: draft.notes,
        });
      }
      this._sm = transition(this._sm, { type: 'SAVE_RESOLVED' });
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to log pollination', e);
      this._sm = transition(this._sm, {
        type: 'SAVE_FAILED',
        message: 'Failed to save. Please check your connection and try again.',
      });
    }
  };

  private _submitHarvestSeeds = async (): Promise<void> => {
    const view = this._sm.views.harvest;
    const { draft, eventId } = view;
    const error = validateHarvestDraft(draft, eventId);
    if (error) {
      this._sm = transition(this._sm, { type: 'SAVE_FAILED', message: error });
      return;
    }
    this._sm = transition(this._sm, { type: 'SAVE_REQUESTED' });
    try {
      await this.onHarvestSeeds?.({ event_id: eventId, quantity: draft.quantity, notes: draft.notes });
      this._sm = transition(this._sm, { type: 'SAVE_RESOLVED' });
      this.onSeedDataChanged?.();
    } catch (e) {
      console.error('Failed to harvest seeds', e);
      this._sm = transition(this._sm, {
        type: 'SAVE_FAILED',
        message: 'Failed to save. Please check your connection and try again.',
      });
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'seeds-genetics-tab': SeedsGeneticsTab;
  }
}
