import { html, TemplateResult, nothing } from 'lit';
import { mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer, mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck, mdiContentCopy, mdiArrowRight } from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry } from './types';
import { PlantUtils } from "./utils";

export class DialogRenderer {
  static renderAddPlantDialog(
    dialog: AddPlantDialogState | null,
    strainLibrary: StrainEntry[],
    callbacks: {
      onClose: () => void;
      onConfirm: () => void;
      onStrainChange: (value: string) => void;
      onPhenotypeChange: (value: string) => void;
      onVegStartChange: (value: string) => void;
      onFlowerStartChange: (value: string) => void;
      onRowChange: (value: string) => void;
      onColChange: (value: string) => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    // Extract unique strain names from the library
    const uniqueStrains = [...new Set(strainLibrary.map(s => s.strain))].sort();

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: var(--plant-border-color-default)">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Add New Plant</h2>
               <div class="dialog-subtitle">Enter plant details below</div>
            </div>
            <button class="md3-button text" @click=${callbacks.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${mdiClose}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${DialogRenderer.renderMD3SelectInput('Strain *', dialog.strain || '', uniqueStrains, callbacks.onStrainChange)}
               ${DialogRenderer.renderMD3TextInput('Phenotype', dialog.phenotype || '', callbacks.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${DialogRenderer.renderMD3NumberInput('Row', dialog.row + 1, (v) => callbacks.onRowChange(v))}
                 ${DialogRenderer.renderMD3NumberInput('Col', dialog.col + 1, (v) => callbacks.onColChange(v))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${DialogRenderer.renderMD3DateInput('Vegetative Start', dialog.veg_start || '', callbacks.onVegStartChange)}
               ${DialogRenderer.renderMD3DateInput('Flower Start', dialog.flower_start || '', callbacks.onFlowerStartChange)}
             </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${callbacks.onClose}>
              Cancel
            </button>
            <button class="md3-button primary" @click=${callbacks.onConfirm}>
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
              Add Plant
            </button>
          </div>

        </div>
      </ha-dialog>
    `;
  }

  static renderPlantOverviewDialog(
    dialog: PlantOverviewDialogState | null,
    growspaceOptions: Record<string, string>,
    callbacks: {
      onClose: () => void;
      onUpdate: () => void;
      onDelete: (plantId: string) => void;
      onHarvest: (plant: PlantEntity, targetGrowspace?: string) => void;
      onClone: (plantEntity: PlantEntity, numClones: number) => void;
      onTakeClone: (motherPlantEntity: PlantEntity, numClones: number) => void;
      onMoveClone: (plantId: PlantEntity, targetGrowspace: string) => void;
      onFinishDrying: (plantEntity: PlantEntity) => void;
      _harvestPlant: (plantEntity: PlantEntity) => void;
      _finishDryingPlant: (plantEntity: PlantEntity) => void;
      onAttributeChange: (key: string, value: any) => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    const { plant, editedAttributes } = dialog;
    const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
    const stageColor = PlantUtils.getPlantStageColor(plant.state);
    const stageIcon = PlantUtils.getPlantStageIcon(plant.state);

    const onAttributeChange = (key: string, value: PlantAttributeValue) => {
      editedAttributes[key] = typeof value === 'number' ? value.toString() : value;
      callbacks.onAttributeChange(key, editedAttributes[key]);
    };

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container" style="--stage-color: ${stageColor}">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${stageIcon}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${editedAttributes.strain || 'Unknown Strain'}</h2>
               <div class="dialog-subtitle">${plant.state} Stage • ${editedAttributes.phenotype || 'No Phenotype'}</div>
            </div>
            <button class="md3-button text" @click=${callbacks.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${mdiClose}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${DialogRenderer.renderMD3TextInput('Strain Name', editedAttributes.strain || '', (v) => callbacks.onAttributeChange('strain', v))}
               ${DialogRenderer.renderMD3TextInput('Phenotype', editedAttributes.phenotype || '', (v) => callbacks.onAttributeChange('phenotype', v))}
               <div style="display:flex; gap:16px;">
                 ${DialogRenderer.renderMD3NumberInput('Row', editedAttributes.row || 1, (v) => callbacks.onAttributeChange('row', parseInt(v)))}
                 ${DialogRenderer.renderMD3NumberInput('Col', editedAttributes.col || 1, (v) => callbacks.onAttributeChange('col', parseInt(v)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${editedAttributes.stage === 'mother'
                  ? DialogRenderer.renderMD3DateInput('Mother Start', editedAttributes.mother_start ?? '', (v) => onAttributeChange('mother_start', v))
                  : nothing}
               ${editedAttributes.stage === 'clone'
                  ? DialogRenderer.renderMD3DateInput('Clone Start', editedAttributes.clone_start ?? '', (v) => onAttributeChange('clone_start', v))
                  : nothing}
               ${editedAttributes.stage === 'veg' || editedAttributes.stage === 'flower'
                  ? DialogRenderer.renderMD3DateInput('Vegetative Start', editedAttributes.veg_start ?? '', (v) => onAttributeChange('veg_start', v))
                  : nothing}
               ${editedAttributes.stage === 'flower'
                  ? DialogRenderer.renderMD3DateInput('Flower Start', editedAttributes.flower_start ?? '', (v) => onAttributeChange('flower_start', v))
                  : nothing}
               ${editedAttributes.stage === 'dry' || editedAttributes.stage === 'cure'
                  ? DialogRenderer.renderMD3DateInput('Dry Start', editedAttributes.dry_start ?? '', (v) => onAttributeChange('dry_start', v))
                  : nothing}
               ${editedAttributes.stage === 'cure'
                  ? DialogRenderer.renderMD3DateInput('Cure Start', editedAttributes.cure_start ?? '', (v) => onAttributeChange('cure_start', v))
                  : nothing}
             </div>

             <!-- STATS CARD -->
             ${DialogRenderer.renderPlantStatsMD3(plant)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${() => callbacks.onDelete(plantId)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${callbacks.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
               Save Changes
             </button>

             <!-- DYNAMIC ACTIONS BASED ON STAGE -->
             ${plant.state.toLowerCase() === 'mother' ? html`
                <div class="take-clone-container" style="display:contents;" data-plant-id="${plant.entity_id}">
                  <!-- Ideally this input should be styled nicely too, but for now inline -->
                   <input
                    type="number"
                    min="1"
                    max="10"
                    value="1"
                    class="num-clones-input md3-input"
                    style="width: 60px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 8px; text-align:center; padding:0;"
                  >
                  <button class="md3-button primary"
                    @click=${(e: MouseEvent) => {
                      const btn = e.currentTarget as HTMLElement;
                      // Find the input sibling (since we used display:contents, they are siblings in the flex container)
                      const input = btn.previousElementSibling as HTMLInputElement;
                      const numClones = input ? parseInt(input.value, 10) : 1;
                      callbacks.onTakeClone(plant, numClones);
                    }}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
                    Take Clone
                  </button>
                </div>
             ` : nothing}

             ${plant.state.toLowerCase() === 'flower' ? html`
               <button class="md3-button primary" @click=${() => callbacks.onHarvest(plant)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiFlower}"></path></svg>
                 Harvest
               </button>
             ` : nothing}

             ${plant.state.toLowerCase() === 'dry' ? html`
               <button class="md3-button primary" @click=${() => callbacks.onFinishDrying(plant)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>
                 Finish Drying
               </button>
             ` : nothing}

             ${plant.state.toLowerCase() === 'clone' ? html`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(growspaceOptions).map(([id, name]) => html`<option value="${id}">${name}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${(e: MouseEvent) => {
                       const btn = e.currentTarget as HTMLElement;
                       const select = btn.previousElementSibling as HTMLSelectElement;
                       if (!select.value) { alert('Select a growspace'); return; }
                       callbacks.onMoveClone(plant, select.value);
                    }}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiArrowRight}"></path></svg>
                    Move
                  </button>
               </div>
             ` : nothing}
          </div>

        </div>
      </ha-dialog>
    `;
  }

  // ... (Keep renderStrainLibraryDialog as is, or refactor if needed.
  // The user specifically asked for "Plant Overview(detail view)", but strain library is separate.
  // I will leave Strain Library alone for now to avoid scope creep, unless requested.)
  static renderStrainLibraryDialog(
    dialog: StrainLibraryDialogState | null,
    callbacks: {
      onClose: () => void;
      onAddStrain: () => void;
      onRemoveStrain: (strain: string) => void;
      onClearAll: () => void;
      onNewStrainChange: (value: string) => void;
      onNewPhenotypeChange: (value: string) => void;
      onEnterKey: (e: KeyboardEvent) => void;
      onToggleExpand: (strain: string) => void;
      onSearch: (query: string) => void;
      onToggleAddForm: () => void;
      onPromptClear: () => void;
      onCancelClear: () => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    // Group strains by name
    const groupedStrains: Record<string, StrainEntry[]> = {};
    const query = (dialog.searchQuery || '').toLowerCase();

    dialog.strains.forEach(entry => {
      const strainName = entry.strain;
      const matchQuery = !query ||
                         strainName.toLowerCase().includes(query) ||
                         (entry.phenotype && entry.phenotype.toLowerCase().includes(query));

      if (matchQuery) {
          if (!groupedStrains[strainName]) {
            groupedStrains[strainName] = [];
          }
          groupedStrains[strainName].push(entry);
      }
    });

    const sortedStrainNames = Object.keys(groupedStrains).sort();

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        heading="Strain Library"
        class="strain-dialog"
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="dialog-content" style="position: relative; min-height: 400px;">

          <!-- Search Bar -->
          <div class="strain-search-container">
            <svg class="search-icon" viewBox="0 0 24 24">
                <path d="${mdiMagnify}"></path>
            </svg>
            <input
                type="text" 
                class="search-input"
                placeholder="Search strains & phenotypes..."
                .value=${dialog.searchQuery || ''}
                @input=${(e: Event) => callbacks.onSearch((e.target as HTMLInputElement).value)}
            />
          </div>

          <!-- Strain Table -->
          <div class="strain-table-container">
            ${sortedStrainNames.length > 0 ? html`
              <table class="strain-table">
                ${sortedStrainNames.map(strainName => {
                  const isExpanded = dialog.expandedStrains?.includes(strainName);
                  const entries = groupedStrains[strainName];
                  const phenotypeCount = entries.filter(e => e.phenotype).length;

                  return html`
                    <tr class="strain-row" @click=${() => callbacks.onToggleExpand(strainName)}>
                      <td class="strain-cell expand-icon">
                        <svg style="width:24px;height:24px;fill:currentColor;"
                             class="rotate-icon ${isExpanded ? 'expanded' : ''}"
                             viewBox="0 0 24 24">
                          <path d="${mdiChevronRight}"></path>
                        </svg>
                      </td>
                      <td class="strain-cell content">
                        ${strainName}
                        <span class="badge">${entries.length} Var.</span>
                      </td>
                    </tr>
                    ${isExpanded ? html`
                      <tr class="pheno-row">
                        <td colspan="3" class="pheno-list">
                           ${entries.map(entry => html`
                              <div class="pheno-item" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                  <span style="font-weight: 500;">${entry.phenotype || 'Default'}</span>

                                  ${entry.analytics ? html`
                                    <div class="strain-analytics" style="display: flex; gap: 12px; font-size: 0.8rem; opacity: 0.7;">
                                      ${entry.analytics.avg_veg_days > 0 ? html`
                                        <div title="Avg Veg Days" style="display: flex; align-items: center; gap: 4px;">
                                          <svg style="width:14px;height:14px;fill:var(--stage-veg);" viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg>
                                          ${Math.round(entry.analytics.avg_veg_days)}d
                                        </div>
                                      ` : nothing}

                                      ${entry.analytics.avg_flower_days > 0 ? html`
                                        <div title="Avg Flower Days" style="display: flex; align-items: center; gap: 4px;">
                                          <svg style="width:14px;height:14px;fill:var(--stage-flower);" viewBox="0 0 24 24"><path d="${mdiFlower}"></path></svg>
                                          ${Math.round(entry.analytics.avg_flower_days)}d
                                        </div>
                                      ` : nothing}

                                      ${entry.analytics.total_harvests > 0 ? html`
                                        <div title="Total Harvests" style="display: flex; align-items: center; gap: 4px;">
                                          <svg style="width:14px;height:14px;fill:var(--primary-text-color);" viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>
                                          ${entry.analytics.total_harvests}
                                        </div>
                                      ` : nothing}
                                    </div>
                                  ` : nothing}
                                </div>

                                <button
                                  class="remove-button"
                                  title="Remove ${entry.strain} ${entry.phenotype}"
                                  @click=${(e: Event) => {
                                    e.stopPropagation();
                                    callbacks.onRemoveStrain(entry.key);
                                  }}
                                >
                                  <svg class="remove-icon" viewBox="0 0 24 24">
                                    <path d="${mdiClose}"></path>
                                  </svg>
                                </button>
                              </div>
                           `)}
                        </td>
                      </tr>
                    ` : nothing}
                  `;
                })}
              </table>
            ` : html`
              <div class="no-data" style="background: transparent;">
                ${dialog.strains.length === 0
                  ? "Library is empty. Add your first strain!"
                  : "No matches found."}
              </div>
            `}
          </div>

          <!-- FAB for Adding Strains -->
          <button class="fab-button" @click=${callbacks.onToggleAddForm}>
             <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${dialog.isAddFormOpen ? mdiClose : mdiPlus}"></path>
             </svg>
          </button>

          <!-- Add Strain Form Overlay -->
          ${dialog.isAddFormOpen ? html`
            <div class="add-form-overlay">
                <h3 style="margin-top:0; margin-bottom: var(--spacing-md);">Add New Strain</h3>
                <div class="form-group">
                  <label>Strain Name</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Strain Name"
                    .value=${dialog.newStrain}
                    @input=${(e: Event) => callbacks.onNewStrainChange((e.target as HTMLInputElement).value)}
                    @keypress=${callbacks.onEnterKey}
                  />
                </div>
                <div class="form-group">
                  <label>Phenotype (Optional)</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Phenotype (e.g. #1)"
                    .value=${dialog.newPhenotype || ''}
                    @input=${(e: Event) => callbacks.onNewPhenotypeChange((e.target as HTMLInputElement).value)}
                    @keypress=${callbacks.onEnterKey}
                  />
                </div>
                <div style="display:flex; justify-content: flex-end; margin-top: var(--spacing-md);">
                    <button class="action-button primary" @click=${callbacks.onAddStrain} ?disabled=${!dialog.newStrain}>
                      Add
                    </button>
                </div>
            </div>
          ` : nothing}

          <!-- Clear All Confirmation Overlay -->
          ${dialog.confirmClearAll ? html`
             <div class="confirmation-overlay">
                 <span style="color: white;">Delete all strains?</span>
                 <button class="action-button danger" @click=${callbacks.onClearAll}>Yes</button>
                 <button class="action-button" @click=${callbacks.onCancelClear}>No</button>
             </div>
          ` : nothing}

        </div>

        <!-- Footer Actions -->
        <div slot="secondaryAction">
           ${!dialog.confirmClearAll ? html`
              <button class="action-button danger" @click=${callbacks.onPromptClear} ?disabled=${dialog.strains.length === 0}>
                Clear All
              </button>
           ` : nothing}
        </div>

        <button class="action-button" slot="primaryAction" @click=${callbacks.onClose}>
          Done
        </button>
      </ha-dialog>
    `;
  }

  private static renderMD3TextInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <input
          type="text"
          class="md3-input"
          .value=${value}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  private static renderMD3SelectInput(label: string, value: string, options: string[], onChange: (value: string) => void): TemplateResult {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <select
          class="md3-input"
          .value=${value}
          @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}
        >
          <option value="">Select...</option>
          ${options.map(opt => html`<option value="${opt}" ?selected=${opt === value}>${opt}</option>`)}
        </select>
      </div>
    `;
  }

  private static renderMD3NumberInput(label: string, value: number, onChange: (value: string) => void): TemplateResult {
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <input
          type="number"
          class="md3-input"
          min="1"
          .value=${value}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  private static renderMD3DateInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
    const formattedValue = PlantUtils.toDateTimeLocal(value);
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${formattedValue}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  // Legacy render methods for Add Dialog (kept simple for now as requested focused on Overview)
  private static renderTextInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
    return html`
      <div class="form-group">
        <label>${label}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${value}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  private static renderNumberInput(label: string, value: number, onChange: (value: string) => void): TemplateResult {
    return html`
      <div class="form-group">
        <label>${label}</label>
        <input 
          type="number" 
          class="form-input"
          min="1"
          .value=${value}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  private static renderDateTimeInput(label: string, icon: string, value: string, onChange: (value: string) => void): TemplateResult {
    return html`
      <div class="form-group">
        <label>
          <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
            <path d="${icon}"></path>
          </svg>
          ${label}
        </label>
        <input 
          type="datetime-local" 
          class="form-input"
          .value=${value}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  private static renderPlantStatsMD3(plant: any): TemplateResult {
    const hasStats = plant.attributes?.veg_days || plant.attributes?.flower_days ||
      plant.attributes?.dry_days || plant.attributes?.cure_days;

    if (!hasStats) return html``;

    return html`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${plant.attributes?.veg_days ? html`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${plant.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           ` : ''}
           ${plant.attributes?.flower_days ? html`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${plant.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           ` : ''}
           ${plant.attributes?.dry_days ? html`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${plant.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           ` : ''}
           ${plant.attributes?.cure_days ? html`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${plant.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           ` : ''}
        </div>
      </div>
    `;
  }

  private static renderPlantStats(plant: any): TemplateResult {
      // Keeping for legacy/Add dialog if needed, though Add dialog doesn't show stats usually
      return this.renderPlantStatsMD3(plant);
  }
}
