import { html, TemplateResult, nothing } from 'lit';
import {
  mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer,
  mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck,
  mdiContentCopy, mdiArrowRight, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant,
  mdiLeaf, mdiUpload, mdiArrowLeft, mdiFilterVariant, mdiCloudUpload, mdiPencil
} from '@mdi/js';
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

  static renderStrainLibraryDialog(
    dialog: StrainLibraryDialogState | null,
    callbacks: {
      onClose: () => void;
      onAddStrain: () => void; // Now saves the editor state
      onRemoveStrain: (strain: string) => void;
      onClearAll: () => void;
      // Editor Field Changes
      onEditorChange: (field: string, value: string) => void;
      // Navigation
      onSwitchView: (view: 'browse' | 'editor', strainToEdit?: StrainEntry) => void;
      onSearch: (query: string) => void;
    }
  ): TemplateResult {
    if (!dialog?.open) return html``;

    return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <style>
          /* STRICT DARK MODE & SHARED STYLES */
          .strain-dialog-container {
             background-color: #1a1a1a; /* Deep Charcoal */
             color: #fff;
             display: flex;
             flex-direction: column;
             height: 85vh;
             width: 90vw;
             max-width: 1200px;
             border-radius: 16px;
             overflow: hidden;
             font-family: 'Roboto', sans-serif;
             --accent-green: #22c55e;
             --card-bg: #2d2d2d;
             --input-bg: #2d2d2d;
             --text-secondary: #9ca3af;
             --border-color: #374151;
          }

          /* SCROLLBAR */
          .strain-dialog-container ::-webkit-scrollbar { width: 8px; }
          .strain-dialog-container ::-webkit-scrollbar-track { background: transparent; }
          .strain-dialog-container ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
          .strain-dialog-container ::-webkit-scrollbar-thumb:hover { background: #6b7280; }

          /* HEADER */
          .sd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
            background: #1a1a1a;
            z-index: 10;
          }
          .sd-title {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #fff;
            margin: 0;
          }
          .sd-close-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.2s;
          }
          .sd-close-btn:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
          }

          /* CONTENT AREA */
          .sd-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            background: #1a1a1a;
          }

          /* FOOTER */
          .sd-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--border-color);
            background: #1a1a1a;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          /* BUTTONS */
          .sd-btn {
             display: inline-flex;
             align-items: center;
             justify-content: center;
             gap: 8px;
             padding: 10px 20px;
             border-radius: 8px;
             font-weight: 600;
             font-size: 0.9rem;
             cursor: pointer;
             transition: all 0.2s;
             border: none;
          }
          .sd-btn.primary {
            background: var(--accent-green);
            color: #fff;
          }
          .sd-btn.primary:hover {
            background: #16a34a;
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
          }
          .sd-btn.secondary {
            background: var(--card-bg);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
          }
          .sd-btn.secondary:hover {
            background: #374151;
            color: #fff;
          }
          .sd-btn.danger {
             background: rgba(220, 38, 38, 0.1);
             color: #ef4444;
             border: 1px solid rgba(220, 38, 38, 0.2);
          }
          .sd-btn.danger:hover {
             background: rgba(220, 38, 38, 0.2);
          }

          /* FORMS */
          .sd-form-group {
            margin-bottom: 20px;
          }
          .sd-label {
            display: block;
            color: var(--text-secondary);
            font-size: 0.85rem;
            margin-bottom: 8px;
            font-weight: 500;
          }
          .sd-input, .sd-textarea, .sd-select {
            width: 100%;
            background: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px 16px;
            color: #fff;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box; /* Ensure padding doesn't overflow */
          }
          .sd-input:focus, .sd-textarea:focus, .sd-select:focus {
            border-color: var(--accent-green);
          }
          .sd-textarea {
            resize: vertical;
            min-height: 100px;
          }

          /* GRID & CARDS */
          .sd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
          }
          .strain-card {
             background: var(--card-bg);
             border-radius: 12px;
             overflow: hidden;
             border: 1px solid var(--border-color);
             transition: all 0.3s ease;
             position: relative;
             display: flex;
             flex-direction: column;
          }
          .strain-card:hover {
             border-color: var(--accent-green);
             transform: translateY(-4px);
             box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          }
          .sc-thumb {
             height: 180px;
             background: #222;
             display: flex;
             align-items: center;
             justify-content: center;
             color: #444;
             position: relative;
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
             color: #fff;
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
             color: var(--text-secondary);
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
          .sc-action-btn {
             background: rgba(0,0,0,0.6);
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
          .search-input-wrapper svg {
             position: absolute;
             left: 16px;
             top: 50%;
             transform: translateY(-50%);
             width: 20px;
             height: 20px;
             fill: var(--text-secondary);
          }
          .search-bar-input {
             width: 100%;
             background: var(--card-bg);
             border: 1px solid var(--border-color);
             border-radius: 12px;
             padding: 14px 14px 14px 48px;
             color: #fff;
             font-size: 1rem;
             outline: none;
             box-sizing: border-box;
          }
          .search-bar-input:focus {
             border-color: var(--accent-green);
          }
          .filter-chips {
             display: flex;
             gap: 8px;
             flex-wrap: wrap;
             align-items: center;
          }
          .filter-chip {
             background: #374151;
             padding: 6px 12px;
             border-radius: 20px;
             font-size: 0.8rem;
             color: #fff;
             display: flex;
             align-items: center;
             gap: 6px;
          }
          .clear-link {
             color: var(--accent-green);
             font-size: 0.85rem;
             text-decoration: underline;
             cursor: pointer;
             margin-left: 8px;
          }

          /* EDITOR LAYOUT */
          .editor-layout {
             display: grid;
             grid-template-columns: 1fr 1.5fr;
             gap: 32px;
          }
          @media (max-width: 800px) {
             .editor-layout { grid-template-columns: 1fr; }
          }

          /* TYPE SELECTOR */
          .type-selector-grid {
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 12px;
          }
          .type-option {
             background: var(--input-bg);
             border: 1px solid var(--border-color);
             border-radius: 8px;
             padding: 16px;
             cursor: pointer;
             display: flex;
             flex-direction: column;
             align-items: center;
             gap: 8px;
             transition: all 0.2s;
             text-align: center;
          }
          .type-option:hover {
             border-color: #666;
          }
          .type-option.active {
             background: rgba(34, 197, 94, 0.1);
             border-color: var(--accent-green);
             color: #fff;
          }
          .type-option svg {
             width: 28px;
             height: 28px;
             fill: var(--text-secondary);
          }
          .type-option.active svg {
             fill: var(--accent-green);
          }
          .type-label {
             font-size: 0.85rem;
             font-weight: 500;
          }

          /* PHOTO UPLOAD */
          .photo-upload-area {
             border: 2px dashed var(--border-color);
             border-radius: 12px;
             background: rgba(255,255,255,0.02);
             height: 240px;
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: center;
             color: var(--text-secondary);
             cursor: pointer;
             transition: all 0.2s;
             margin-bottom: 20px;
          }
          .photo-upload-area:hover {
             border-color: var(--accent-green);
             background: rgba(34, 197, 94, 0.05);
          }

        </style>

        <div class="strain-dialog-container">
           ${dialog.view === 'browse'
              ? this.renderStrainBrowseView(dialog, callbacks)
              : this.renderStrainEditorView(dialog, callbacks)
           }
        </div>

      </ha-dialog>
    `;
  }

  private static renderStrainBrowseView(
      dialog: StrainLibraryDialogState,
      callbacks: any
  ): TemplateResult {
    // Filter Logic
    const query = (dialog.searchQuery || '').toLowerCase();
    const filteredStrains = dialog.strains.filter(s =>
       s.strain.toLowerCase().includes(query) ||
       (s.breeder && s.breeder.toLowerCase().includes(query)) ||
       (s.phenotype && s.phenotype.toLowerCase().includes(query))
    );

    return html`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <button class="sd-close-btn" @click=${callbacks.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <!-- SEARCH & FILTER -->
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <svg viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
               <input
                  type="text"
                  class="search-bar-input"
                  placeholder="Search Strains by Name, Breeder..."
                  .value=${dialog.searchQuery || ''}
                  @input=${(e: Event) => callbacks.onSearch((e.target as HTMLInputElement).value)}
               />
            </div>
            <div class="filter-chips">
               <!-- Placeholder Chips -->
               <div class="filter-chip">
                  <span>Sativa Dom</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
               </div>
               <div class="filter-chip">
                  <span>Under 60 Days</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
               </div>
               <a class="clear-link">Clear All</a>
            </div>
         </div>

         <!-- GRID -->
         <div class="sd-grid">
            ${filteredStrains.map(strain => this.renderStrainCard(strain, callbacks))}
         </div>

         ${filteredStrains.length === 0 ? html`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <svg style="width:48px;height:48px;fill:currentColor; opacity:0.5;" viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
               <p>No strains found matching "${query}"</p>
            </div>
         ` : nothing}
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary">
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
            Import CSV
         </button>
         <button class="sd-btn primary" @click=${() => callbacks.onSwitchView('editor')}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
            New Strain
         </button>
      </div>
    `;
  }

  private static renderStrainCard(strain: StrainEntry, callbacks: any): TemplateResult {
     let typeIcon = mdiLeaf;
     let typeLabel = strain.type || 'Unknown';

     // Icon Mapping
     const lowerType = (strain.type || '').toLowerCase();
     if (lowerType.includes('indica')) typeIcon = mdiWeatherNight; // Moon/Fat Leaf approx
     else if (lowerType.includes('sativa')) typeIcon = mdiWeatherSunny; // Sun/Tall Leaf approx
     else if (lowerType.includes('hybrid')) typeIcon = mdiTuneVariant;
     else if (lowerType.includes('ruderalis') || lowerType.includes('auto')) typeIcon = mdiLeaf;

     return html`
       <div class="strain-card" @click=${() => callbacks.onSwitchView('editor', strain)}>
          <div class="sc-thumb">
             ${strain.image
                ? html`<img src="${strain.image}" alt="${strain.strain}" />`
                : html`<svg style="width:48px;height:48px;opacity:0.2;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCannabis}"></path></svg>`
             }
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); callbacks.onRemoveStrain(strain.key); }}>
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${strain.strain} ${strain.phenotype ? `(${strain.phenotype})` : ''}</h3>
             <div class="sc-type-row">
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${typeIcon}"></path></svg>
                <span>${typeLabel}</span>
             </div>
             <div class="sc-meta">
                ${strain.flowering_days_min ? html`<span>Flowering: ${strain.flowering_days_min}-${strain.flowering_days_max || '?'} Days</span>` : nothing}
                ${strain.breeder ? html`<span>Breeder: ${strain.breeder}</span>` : nothing}
             </div>
          </div>
       </div>
     `;
  }

  private static renderStrainEditorView(
      dialog: StrainLibraryDialogState,
      callbacks: any
  ): TemplateResult {
    const s = dialog.editorState || {} as any;
    const isEdit = !!s.strain && dialog.strains.some(ex => ex.strain === s.strain && ex.phenotype === s.phenotype); // Check if exists

    const update = (field: string, value: any) => callbacks.onEditorChange(field, value);

    return html`
      <div class="sd-header">
         <div style="display:flex; align-items:center; gap:16px;">
            <button class="sd-btn secondary" style="padding: 8px 12px;" @click=${() => callbacks.onSwitchView('browse')}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiArrowLeft}"></path></svg>
               Back
            </button>
            <h2 class="sd-title">${isEdit ? 'Edit Strain' : 'Add New Strain'}</h2>
         </div>
         <button class="sd-close-btn" @click=${callbacks.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <!-- LEFT COL: IDENTITY -->
            <div class="editor-col">
               <div class="photo-upload-area">
                  <svg style="width:48px;height:48px;fill:currentColor;margin-bottom:16px;" viewBox="0 0 24 24"><path d="${mdiUpload}"></path></svg>
                  <span style="font-weight:600;">PHOTO UPLOAD AREA</span>
                  <span style="font-size:0.8rem; margin-top:4px;">(Drag & Drop or Click)</span>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Strain Name *</label>
                  <input type="text" class="sd-input" .value=${s.strain} @input=${(e:any) => update('strain', e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Phenotype</label>
                  <input type="text" class="sd-input" placeholder="e.g. #1 (Optional)" .value=${s.phenotype} @input=${(e:any) => update('phenotype', e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Breeder/Seedbank</label>
                  <input type="text" class="sd-input" .value=${s.breeder} @input=${(e:any) => update('breeder', e.target.value)} />
               </div>
            </div>

            <!-- RIGHT COL: GENETICS -->
            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${['Indica', 'Sativa', 'Hybrid', 'Ruderalis'].map(t => {
                        let icon = mdiLeaf;
                        if(t === 'Indica') icon = mdiWeatherNight;
                        if(t === 'Sativa') icon = mdiWeatherSunny;
                        if(t === 'Hybrid') icon = mdiTuneVariant;

                        const isActive = (s.type || '').toLowerCase() === t.toLowerCase();
                        return html`
                           <div class="type-option ${isActive ? 'active' : ''}"
                                @click=${() => update('type', t)}>
                              <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
                              <span class="type-label">${t}</span>
                           </div>
                        `;
                     })}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Flowering Time (Days)</label>
                  <div style="display:flex; gap:16px;">
                     <input type="number" class="sd-input" placeholder="Min" .value=${s.flowering_min} @input=${(e:any) => update('flowering_min', e.target.value)} />
                     <input type="number" class="sd-input" placeholder="Max" .value=${s.flowering_max} @input=${(e:any) => update('flowering_max', e.target.value)} />
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Lineage</label>
                  <input type="text" class="sd-input" .value=${s.lineage} @input=${(e:any) => update('lineage', e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${['Feminized', 'Regular'].map(sex => html`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <input type="radio" name="sex_radio"
                                  .checked=${s.sex === sex}
                                  @change=${() => update('sex', sex)}
                                  style="accent-color: var(--accent-green); transform: scale(1.2);" />
                           ${sex}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Description</label>
                  <textarea class="sd-textarea" .value=${s.description} @input=${(e:any) => update('description', e.target.value)}></textarea>
               </div>
            </div>
         </div>
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${() => callbacks.onSwitchView('browse')}>
            Cancel
         </button>
         <button class="sd-btn primary" @click=${callbacks.onAddStrain}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg>
            Save Strain
         </button>
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
