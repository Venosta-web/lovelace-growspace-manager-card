import { html, TemplateResult, nothing } from 'lit';
import { mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer, mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck, mdiContentCopy, mdiArrowRight, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant, mdiCloudUpload, mdiPencil, mdiGenderMaleFemale, mdiLeaf } from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry } from './types';
import { PlantUtils } from "./utils";

export class DialogRenderer {
  // ... (rest of class, keeping static methods)

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

  static renderStrainLibraryDialog(
    dialog: StrainLibraryDialogState | null,
    callbacks: {
      onClose: () => void;
      onOpenEditor: (strain?: StrainEntry) => void;
      onSave: () => void;
      onCancelEditor: () => void;
      onSearch: (query: string) => void;
      onEditorChange: (field: string, value: any) => void;
      onRemoveStrain: (strain: string, phenotype?: string) => void;
      onImportCSV: () => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        class="strain-dialog"
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="glass-dialog-container strain-library-container">
           ${dialog.view === 'editor'
             ? DialogRenderer.renderStrainEditor(dialog, callbacks)
             : DialogRenderer.renderLibraryView(dialog, callbacks)
           }
        </div>
      </ha-dialog>
    `;
  }

  private static renderLibraryView(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult {
      // Group by strain
      const uniqueStrains = new Map<string, StrainEntry>();
      const strainCounts = new Map<string, number>();

      const query = (dialog.searchQuery || '').toLowerCase();

      dialog.strains.forEach(entry => {
          // Count phenotypes
          const count = strainCounts.get(entry.strain) || 0;
          strainCounts.set(entry.strain, count + 1);

          // Use the first entry as the main card representative, unless we have one with metadata
          if (!uniqueStrains.has(entry.strain)) {
              uniqueStrains.set(entry.strain, entry);
          }
      });

      const filteredStrains = Array.from(uniqueStrains.values()).filter(s => {
          const matchName = s.strain.toLowerCase().includes(query);
          const matchBreeder = s.meta?.breeder?.toLowerCase().includes(query);
          return matchName || matchBreeder;
      }).sort((a,b) => a.strain.localeCompare(b.strain));


      return html`
        <!-- Header -->
        <div class="dialog-header">
           <div class="dialog-title-group">
               <h2 class="dialog-title">STRAIN LIBRARY</h2>
           </div>
           <button class="md3-button text" @click=${callbacks.onClose}>
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
           </button>
        </div>

        <!-- Search & Filter Bar -->
        <div class="library-toolbar">
            <div class="search-box">
                <svg class="search-icon" viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
                <input
                    type="text"
                    placeholder="Search Strains by Name, Breeder..."
                    .value=${dialog.searchQuery || ''}
                    @input=${(e: Event) => callbacks.onSearch((e.target as HTMLInputElement).value)}
                />
                <button class="filter-btn">
                    <svg viewBox="0 0 24 24"><path d="${mdiTuneVariant}"></path></svg>
                </button>
            </div>

            <!-- Active Filters (Mockup) -->
            <div class="filter-tags">
               <span class="filter-tag">Sativa Dom <span class="close">×</span></span>
               <span class="filter-tag">Under 60 Days <span class="close">×</span></span>
               <span class="clear-all">[Clear All]</span>
            </div>
        </div>

        <!-- Grid of Cards -->
        <div class="strain-grid">
           ${filteredStrains.map(strain => {
               const count = strainCounts.get(strain.strain) || 0;
               return this.renderStrainCard(strain, count, callbacks);
           })}
        </div>

        <!-- Footer Actions -->
        <div class="library-footer">
            <button class="md3-button tonal" @click=${callbacks.onImportCSV}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
                Import CSV
            </button>
            <button class="md3-button primary" @click=${() => callbacks.onOpenEditor()}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
                New Strain
            </button>
        </div>
      `;
  }

  private static renderStrainCard(strain: StrainEntry, phenoCount: number, callbacks: any): TemplateResult {
      const isIndica = strain.meta?.type === 'Indica';
      const isSativa = strain.meta?.type === 'Sativa';

      // Icon selection based on type
      let typeIcon = mdiLeaf;
      if (isIndica) typeIcon = mdiWeatherNight; // Moon
      if (isSativa) typeIcon = mdiCannabis; // Leaf/Sun

      return html`
          <div class="strain-card" @click=${() => callbacks.onOpenEditor(strain)}>
              <div class="card-image-area">
                  ${strain.meta?.image
                     ? html`<img src="${strain.meta.image}" alt="${strain.strain}" />`
                     : html`
                        <div class="placeholder-image">
                           <svg viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>
                        </div>
                     `}

                  ${strain.meta?.type ? html`
                    <div class="type-badge">
                        <svg viewBox="0 0 24 24"><path d="${typeIcon}"></path></svg>
                    </div>
                  ` : nothing}
              </div>
              <div class="card-content">
                  <div class="strain-name">${strain.strain}</div>
                  <div class="strain-sub">
                     ${strain.meta?.hybrid_ratio || strain.meta?.type || 'Unknown Type'}
                  </div>

                  <div class="strain-stats">
                     ${strain.meta?.flowering_days_min && strain.meta?.flowering_days_max
                        ? html`<span>${strain.meta.flowering_days_min}-${strain.meta.flowering_days_max} Days</span>`
                        : nothing}
                  </div>

                  <div class="strain-breeder">
                      Breeder: ${strain.meta?.breeder || 'Unknown'}
                  </div>

                  <div class="pheno-count-badge">
                     ${phenoCount > 0 ? `${phenoCount} Phenotype${phenoCount > 1 ? 's' : ''}` : 'No Phenotypes'}
                  </div>
              </div>
          </div>
      `;
  }

  private static renderStrainEditor(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult {
     // Fix TypeScript Error: Explicitly cast editorState
     const data: any = dialog.editorState || {};

     return html`
        <!-- Header -->
        <div class="dialog-header">
           <button class="md3-button text" @click=${callbacks.onCancelEditor} style="padding: 0; min-width: 40px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiChevronRight}" style="transform: rotate(180deg);"></path></svg>
           </button>
           <div class="dialog-title-group">
               <h2 class="dialog-title">${dialog.editingStrain ? 'EDIT STRAIN' : 'ADD NEW STRAIN'}</h2>
           </div>
           <button class="md3-button text" @click=${callbacks.onClose}>
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
           </button>
        </div>

        <div class="editor-content">
            <!-- Left Column -->
            <div class="editor-col left">
                <!-- Photo Upload Area -->
                <div class="photo-upload-area">
                    <div class="upload-placeholder">
                        <svg style="width:48px;height:48px;opacity:0.5;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
                        <div>PHOTO UPLOAD AREA</div>
                        <div style="font-size: 0.7rem; opacity: 0.5;">(Drag & Drop or Click)</div>
                    </div>
                </div>

                <div class="form-section">
                    ${DialogRenderer.renderMD3TextInput('Strain Name *', data.strain || '', (v) => callbacks.onEditorChange('strain', v))}
                    ${DialogRenderer.renderMD3TextInput('Breeder/Seedbank', data.breeder || '', (v) => callbacks.onEditorChange('breeder', v))}
                </div>
            </div>

            <!-- Right Column -->
            <div class="editor-col right">
                <div class="form-section">
                    <label class="section-label">Type *</label>
                    <div class="type-selector">
                        ${DialogRenderer.renderTypeOption('Indica', mdiWeatherNight, data.type === 'Indica', () => callbacks.onEditorChange('type', 'Indica'))}
                        ${DialogRenderer.renderTypeOption('Sativa', mdiCannabis, data.type === 'Sativa', () => callbacks.onEditorChange('type', 'Sativa'))}
                        ${DialogRenderer.renderTypeOption('Hybrid', mdiLeaf, data.type === 'Hybrid', () => callbacks.onEditorChange('type', 'Hybrid'))}
                        ${DialogRenderer.renderTypeOption('Ruderalis', mdiSprout, data.type === 'Ruderalis/Auto', () => callbacks.onEditorChange('type', 'Ruderalis/Auto'))}
                    </div>
                </div>

                ${data.type === 'Hybrid' ? html`
                <div class="form-section">
                    <label class="section-label">Hybrid Dominance</label>
                    <select class="md3-input" .value=${data.hybrid_ratio || ''} @change=${(e: Event) => callbacks.onEditorChange('hybrid_ratio', (e.target as HTMLSelectElement).value)}>
                        <option value="">Select Dominance...</option>
                        <option value="Sativa Dom">Sativa Dominant</option>
                        <option value="Indica Dom">Indica Dominant</option>
                        <option value="Balanced">Balanced (50/50)</option>
                    </select>
                </div>
                ` : nothing}

                <div class="form-section">
                    <label class="section-label">Flowering Time (Days) [Min] - [Max]</label>
                    <div style="display: flex; gap: 16px;">
                        <input type="number" class="md3-input" placeholder="Min" .value=${data.flowering_min || ''} @input=${(e: Event) => callbacks.onEditorChange('flowering_min', (e.target as HTMLInputElement).value)}>
                        <span style="align-self:center;">-</span>
                        <input type="number" class="md3-input" placeholder="Max" .value=${data.flowering_max || ''} @input=${(e: Event) => callbacks.onEditorChange('flowering_max', (e.target as HTMLInputElement).value)}>
                    </div>
                </div>

                <div class="form-section">
                   ${DialogRenderer.renderMD3TextInput('Lineage / Parents', data.lineage || '', (v) => callbacks.onEditorChange('lineage', v))}
                </div>

                <div class="form-section">
                    <label class="section-label">Sex Setup</label>
                    <div class="checkbox-group">
                        <label>
                           <input type="checkbox" ?checked=${data.sex === 'Feminized'} @change=${() => callbacks.onEditorChange('sex', 'Feminized')}> Feminized
                        </label>
                        <label>
                           <input type="checkbox" ?checked=${data.sex === 'Regular'} @change=${() => callbacks.onEditorChange('sex', 'Regular')}> Regular
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-label">Description / Grower Notes</label>
                    <textarea class="md3-input" rows="4" @input=${(e: Event) => callbacks.onEditorChange('description', (e.target as HTMLInputElement).value)} .value=${data.description || ''}></textarea>
                </div>
            </div>
        </div>

        <div class="dialog-footer">
            <button class="md3-button tonal" @click=${callbacks.onCancelEditor}>Cancel</button>
            <button class="md3-button primary" @click=${callbacks.onSave}>+ Save</button>
        </div>
     `;
  }

  private static renderTypeOption(label: string, icon: string, selected: boolean, onClick: () => void): TemplateResult {
      return html`
         <div class="type-option ${selected ? 'selected' : ''}" @click=${onClick}>
             <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${icon}"></path></svg>
             <span>${label}</span>
             ${selected ? html`<div class="selection-dot"></div>` : nothing}
         </div>
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
}
