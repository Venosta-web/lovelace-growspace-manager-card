import { html, TemplateResult, nothing } from 'lit';
import { mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna,mdiHairDryer,mdiCannabis } from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, PlantStage, stageInputs, PlantAttributeValue,PlantOverviewEditedAttributes } from './types';

export class DialogRenderer {
  static renderAddPlantDialog(
    dialog: AddPlantDialogState | null,
    strainLibrary: string[],
    callbacks: {
      onClose: () => void;
      onConfirm: () => void;
      onStrainChange: (value: string) => void;
      onPhenotypeChange: (value: string) => void;
      onVegStartChange: (value: string) => void;
      onFlowerStartChange: (value: string) => void;
      onDryStartChange: (value: string) => void;
      onCureStartChange: (value: string) => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

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
              ${strainLibrary.map(s => html`
                <option value="${s}" ?selected=${dialog.strain === s}>${s}</option>
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
            ${this.renderDateTimeInput('Vegetative Start', mdiCalendarClock, dialog.veg_start || '', callbacks.onVegStartChange)}
            ${this.renderDateTimeInput('Flower Start', mdiFlower, dialog.flower_start || '', callbacks.onFlowerStartChange)}
            ${this.renderDateTimeInput('Dry Start', mdiFlower, dialog.dry_start || '', callbacks.onDryStartChange)}
            ${this.renderDateTimeInput('Cure Start', mdiFlower, dialog.cure_start || '', callbacks.onCureStartChange)}
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
    callbacks: {
      onClose: () => void;
      onUpdate: () => void;
      onDelete: (plantId: string) => void;
      onHarvest: (plantEntity: PlantEntity) => void;
      onFinishDrying: (plantEntity: PlantEntity) => void;
      _harvestPlant: (plantEntity: PlantEntity) => void;
      _finishDryingPlant: (plantEntity: PlantEntity) => void;
      onAttributeChange: (key: string, value: any) => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    const { plant, editedAttributes} = dialog;
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
            ${this.renderTextInput('Strain', editedAttributes.strain || '', (v) => callbacks.onAttributeChange('strain', v))}
            ${this.renderTextInput('Phenotype', editedAttributes.phenotype || '', (v) => callbacks.onAttributeChange('phenotype', v))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${this.renderNumberInput('Row', editedAttributes.row || 1, (v) => callbacks.onAttributeChange('row', parseInt(v)))}
            ${this.renderNumberInput('Column', editedAttributes.col || 1, (v) => callbacks.onAttributeChange('col', parseInt(v)))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${editedAttributes.stage === 'veg' || editedAttributes.stage === 'flower'
              ? this.renderDateTimeInput('Vegetative Start', mdiSprout, editedAttributes.veg_start ?? '', (v) => onAttributeChange('veg_start', v))
              : nothing}

            ${this.renderDateTimeInput('Flower Start', mdiFlower, editedAttributes.flower_start ?? '', (v) => onAttributeChange('flower_start', v))}

            ${editedAttributes.stage === 'dry' || editedAttributes.stage === 'cure'
              ? this.renderDateTimeInput('Dry Start', mdiHairDryer, editedAttributes.dry_start ?? '', (v) => onAttributeChange('dry_start', v))
              : nothing}

            ${editedAttributes.stage === 'cure'
              ? this.renderDateTimeInput('Cure Start', mdiCannabis, editedAttributes.cure_start ?? '', (v) => onAttributeChange('cure_start', v))
              : nothing}
          </div>


          ${this.renderPlantStats(plant)}
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
      onEnterKey: (e: KeyboardEvent) => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    return html`
      <ha-dialog 
        open 
        heading="Strain Library Management" 
        @closed=${callbacks.onClose}
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
        .className=${'strain-dialog'}
      >
        <div class="dialog-content">
          <div class="strain-library-header">
            <div class="strain-input-group">
              <input 
                type="text" 
                class="form-input"
                placeholder="Enter new strain name..."
                .value=${dialog.newStrain}
                @input=${(e: Event) => callbacks.onNewStrainChange((e.target as HTMLInputElement).value)}
                @keydown=${callbacks.onEnterKey}
              />
              <button class="action-button primary" @click=${callbacks.onAddStrain}>
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${mdiPlus}"></path>
                </svg>
                Add
              </button>
            </div>
          </div>

          ${dialog.strains.length > 0 ? html`
            <div class="strain-list">
              ${dialog.strains.map(strain => html`
                <div class="strain-item">
                  <span class="strain-name">${strain}</span>
                  <button 
                    class="remove-button"
                    title="Remove ${strain}"
                    @click=${() => callbacks.onRemoveStrain(strain)}
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
          value=${value} 
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
          <span style="margin-right: 5px"><strong>Current Stage:</strong> ${plant.state} </span>
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