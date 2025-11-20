import { html, TemplateResult, nothing } from 'lit';
import { mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer, mdiCannabis } from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry } from './types';

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
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    // Extract unique strain names from the library
    const uniqueStrains = [...new Set(strainLibrary.map(s => s.strain))].sort();

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        heading="Add New Plant"
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="dialog-content">
          <div class="form-group">
            <label>
              <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                <path d="${mdiDna}"></path>
              </svg>
              Strain *
            </label>
            <select 
              class="form-input"
              .value=${dialog.strain || ''}
              @change=${(e: Event) => callbacks.onStrainChange((e.target as HTMLSelectElement).value)}
            >
              <option value="">Select a strain...</option>
              ${uniqueStrains.map(strainName => html`
                <option value="${strainName}" ?selected=${strainName === dialog.strain}>
                  ${strainName}
                </option>
              `)}
            </select>
          </div>

          <div class="form-group">
            <label>Phenotype</label>
            <input 
              type="text" 
              class="form-input"
              placeholder="e.g., Pheno #1, Purple variant..."
              .value=${dialog.phenotype || ''} 
              @input=${(e: Event) => callbacks.onPhenotypeChange((e.target as HTMLInputElement).value)}
            />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${DialogRenderer.renderDateTimeInput('Vegetative Start', mdiCalendarClock, dialog.veg_start || '', callbacks.onVegStartChange)}
            ${DialogRenderer.renderDateTimeInput('Flower Start', mdiFlower, dialog.flower_start || '', callbacks.onFlowerStartChange)}
          </div>

          <div style="background: rgba(var(--rgb-primary-color), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--primary-color);">
            <strong>Position:</strong> Row ${dialog.row + 1}, Column ${dialog.col + 1}
          </div>
        </div>

        <button class="action-button primary" slot="primaryAction" @click=${callbacks.onConfirm}>
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${mdiSprout}"></path>
          </svg>
          Add Plant
        </button>
        <button class="action-button" slot="secondaryAction" @click=${callbacks.onClose}>
          Cancel
        </button>
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

    const onAttributeChange = (key: string, value: PlantAttributeValue) => {
      editedAttributes[key] = typeof value === 'number' ? value.toString() : value;
      callbacks.onAttributeChange(key, editedAttributes[key]);
    };

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        heading="${editedAttributes.strain || 'Plant'} Details"
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="dialog-content">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${DialogRenderer.renderTextInput('Strain', editedAttributes.strain || '', (v) => callbacks.onAttributeChange('strain', v))}
            ${DialogRenderer.renderTextInput('Phenotype', editedAttributes.phenotype || '', (v) => callbacks.onAttributeChange('phenotype', v))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${DialogRenderer.renderNumberInput('Row', editedAttributes.row || 1, (v) => callbacks.onAttributeChange('row', parseInt(v)))}
            ${DialogRenderer.renderNumberInput('Column', editedAttributes.col || 1, (v) => callbacks.onAttributeChange('col', parseInt(v)))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${editedAttributes.stage === 'veg' || editedAttributes.stage === 'flower'
        ? DialogRenderer.renderDateTimeInput('Vegetative Start', mdiSprout, editedAttributes.veg_start ?? '', (v) => onAttributeChange('veg_start', v))
        : nothing}
            ${editedAttributes.stage === 'flower'
        ? DialogRenderer.renderDateTimeInput('Flower Start', mdiFlower, editedAttributes.flower_start ?? '', (v) => onAttributeChange('flower_start', v))
        : nothing}
            ${editedAttributes.stage === 'mother'
        ? DialogRenderer.renderDateTimeInput('Mother Start', mdiSprout, editedAttributes.mother_start ?? '', (v) => onAttributeChange('mother_start', v))
        : nothing}
            ${editedAttributes.stage === 'clone'
        ? DialogRenderer.renderDateTimeInput('Clone Start', mdiSprout, editedAttributes.clone_start ?? '', (v) => onAttributeChange('clone_start', v))
        : nothing}

            ${editedAttributes.stage === 'cure'
        ? DialogRenderer.renderDateTimeInput('Cure Start', mdiCannabis, editedAttributes.cure_start ?? '', (v) => onAttributeChange('cure_start', v))
        : nothing}  
            ${editedAttributes.stage === 'dry' || editedAttributes.stage === 'cure'
        ? DialogRenderer.renderDateTimeInput('Dry Start', mdiHairDryer, editedAttributes.dry_start ?? '', (v) => onAttributeChange('dry_start', v))
        : nothing}

            ${editedAttributes.stage === 'cure'
        ? DialogRenderer.renderDateTimeInput('Cure Start', mdiCannabis, editedAttributes.cure_start ?? '', (v) => onAttributeChange('cure_start', v))
        : nothing}
          </div>


          ${DialogRenderer.renderPlantStats(plant)}
        </div>

        <button class="action-button primary" slot="primaryAction" @click=${callbacks.onUpdate}>
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"></path>
          </svg>
          Update Plant
        </button>
        
        <button class="action-button" slot="secondaryAction" @click=${() => callbacks.onDelete(plantId)}>
          Remove Plant
        </button>
        
        <button class="action-button" slot="secondaryAction" @click=${callbacks.onClose}>
          Cancel
        </button>
        ${plant.state.toLowerCase() === 'mother' ? html`
          <div class="take-clone-container" data-plant-id="${plant.entity_id}">
            <input 
              type="number" 
              min="1" 
              max="10" 
              value="1"
              data-plant-id="${plant.entity_id}"
              class="num-clones-input"
            >
            <button class="action-button primary" 
              @click=${(e: MouseEvent) => {
          const container = (e.currentTarget as HTMLElement).closest('.take-clone-container');
          if (!container) return;
          const numClonesInput = container.querySelector<HTMLInputElement>('.num-clones-input');
          const numClones = numClonesInput ? parseInt(numClonesInput.value, 10) : 1;
          callbacks.onTakeClone(plant, numClones);
        }}
            >
              Take Clone
            </button>
          </div>
        ` : ''}
       ${plant.state.toLowerCase() === 'clone' ? html`
          <div class="move-clone-container" style="display: flex; gap: var(--spacing-md); align-items: center;">
            <!-- Growspace dropdown -->
            <select class="form-input">
              <option value="">Select Growspace</option>
              ${Object.entries(growspaceOptions).map(
          ([id, name]) => html`<option value="${id}">${name}</option>`
        )}
            </select>

            <!-- Checkbox to confirm sending clone -->
            <label style="display:flex; align-items:center; gap:4px;">
              <input type="checkbox">
              Confirm Move
            </label>

            <button class="action-button primary" 
              @click=${(e: MouseEvent) => {
          const container = (e.currentTarget as HTMLElement).closest('.move-clone-container');
          if (!container) return;

          const select = container.querySelector<HTMLSelectElement>('select');
          const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');

          const targetGrowspace = select?.value;
          const confirmed = checkbox?.checked;

          if (!targetGrowspace) {
            alert('Please select a growspace.');
            return;
          }
          if (!confirmed) {
            alert('Please confirm moving the clone by checking the box.');
            return;
          }

          callbacks.onMoveClone(plant, targetGrowspace);
        }}
            >
              Move Clone
            </button>
          </div>
        ` : ''}
  
        ${plant.state.toLowerCase() === 'flower' ? html`            
          <button class="action-button primary" @click=${() => callbacks.onHarvest(plant)}>
            Harvest
          </button>
        ` : ''}

        ${plant.state.toLowerCase() === 'dry' ? html`
          <button class="action-button primary" @click=${() => callbacks.onFinishDrying(plant)}>
            Finish Drying
          </button>
  ` : ''}
      </ha-dialog>
    `;
  }

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
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        heading="Strain Library"
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="dialog-content">
          <div class="add-strain-container">
            <div class="form-group">
              <label>New Strain Name</label>
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
            <button class="action-button primary" @click=${callbacks.onAddStrain} ?disabled=${!dialog.newStrain}>
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiPlus}"></path>
              </svg>
              Add
            </button>
          </div>

          <div class="strain-list-header">
            <strong>Library Strains (${dialog.strains.length})</strong>
          </div>

          ${dialog.strains.length > 0 ? html`
            <div class="strain-list">
              ${dialog.strains.map(entry => html`
                <div class="strain-item">
                  <span class="strain-name">
                    ${entry.strain}
                    ${entry.phenotype ? html`<span style="color: var(--secondary-text-color); font-size: 0.9em;"> (${entry.phenotype})</span>` : ''}
                  </span>
                  <button 
                    class="remove-button" 
                    title="Remove ${entry.strain}"
                    @click=${() => callbacks.onRemoveStrain(entry.key)}
                  >
                    <svg class="remove-icon" viewBox="0 0 24 24">
                      <path d="${mdiClose}"></path>
                    </svg>
                  </button>
                </div>
              `)}
            </div>
          ` : html`
            <div class="no-data">
              No strains in library. Add some strains to get started!
            </div>
          `}
        </div>

        <button class="action-button danger" slot="secondaryAction" @click=${callbacks.onClearAll}>
          Clear All
        </button>
        <button class="action-button" slot="primaryAction" @click=${callbacks.onClose}>
          Done
        </button>
      </ha-dialog>
    `;
  }

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

  private static renderPlantStats(plant: any): TemplateResult {
    const hasStats = plant.attributes?.veg_days || plant.attributes?.flower_days ||
      plant.attributes?.dry_days || plant.attributes?.cure_days;

    if (!hasStats) return html``;

    return html`
      <div style="background: rgba(var(--rgb-info-color, 33, 150, 243), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--info-color, #2196F3);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="margin-right: 5px"><strong>Current Stage:</strong> ${plant.state}</span>
          <div style="display: flex; gap: var(--spacing-md);">
            ${plant.attributes?.veg_days ? html`<span>${plant.attributes.veg_days} days veg</span>` : ''}
            ${plant.attributes?.flower_days ? html`<span>${plant.attributes.flower_days} days flower</span>` : ''}
            ${plant.attributes?.dry_days ? html`<span>${plant.attributes.dry_days} days drying</span>` : ''}
            ${plant.attributes?.cure_days ? html`<span>${plant.attributes.cure_days} days curing</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
}
