import { html, TemplateResult, nothing } from 'lit';
import {
   mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer,
   mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck,
   mdiContentCopy, mdiArrowRight, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant,
   mdiLeaf, mdiUpload, mdiArrowLeft, mdiFilterVariant, mdiCloudUpload, mdiPencil,
   mdiCog, mdiThermometer, mdiEarth, mdiViewDashboard, mdiFan, mdiWeatherPartlyCloudy, mdiBrain, mdiLoading, mdiDownload
} from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, ConfigDialogState, GrowMasterDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry, CropMeta, StrainRecommendationDialogState } from './types';
import { PlantUtils } from "./utils";

import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

export class DialogRenderer {
   private static getCropStyle(image: string, meta?: CropMeta) {
      if (!meta) return `background-image: url('${image}')`;

      // Math:
      // meta.scale is the zoom level (>=1)
      // meta.x, meta.y are offsets in % relative to the image dimensions
      // To display:
      // background-size: {scale * 100}%
      // background-position: {x}% {y}%

      // Wait, standard background-position percentage works differently:
      // 0% 0% aligns left edge with left edge.
      // 100% 100% aligns right edge with right edge.
      // If we store the center point or top-left, we need to map it.

      // Let's assume we store:
      // x: offset X in percentage (0-100)
      // y: offset Y in percentage (0-100)
      // scale: zoom factor (1 = fit cover)

      return `
      background-image: url('${image}');
      background-size: ${meta.scale * 100}%;
      background-position: ${meta.x}% ${meta.y}%;
    `;
   }

   static renderAddPlantDialog(
      dialog: AddPlantDialogState | null,
      strainLibrary: StrainEntry[],
      growspaceName: string,
      callbacks: {
         onClose: () => void;
         onConfirm: () => void;
         onStrainChange: (value: string) => void;
         onPhenotypeChange: (value: string) => void;
         onVegStartChange: (value: string) => void;
         onFlowerStartChange: (value: string) => void;
         onSeedlingStartChange: (value: string) => void;
         onMotherStartChange: (value: string) => void;
         onCloneStartChange: (value: string) => void;
         onDryStartChange: (value: string) => void;
         onCureStartChange: (value: string) => void;
         onRowChange: (value: string) => void;
         onColChange: (value: string) => void;
      }
   ): TemplateResult {
      if (!dialog?.open) return html``;

      // Extract unique strain names from the library
      const uniqueStrains = [...new Set(strainLibrary.map(s => s.strain))].sort();
      const timelineContent = DialogRenderer.getTimelineContent(dialog, growspaceName, callbacks);


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
            <md-icon-button @click=${callbacks.onClose}>
               <md-icon><svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg></md-icon>
            </md-icon-button>
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
                ${timelineContent}
             </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <md-filled-tonal-button @click=${callbacks.onClose}>
              Cancel
            </md-filled-tonal-button>
            <md-filled-button @click=${callbacks.onConfirm}>
              <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiSprout}"></path></svg></md-icon>
              Add Plant
            </md-filled-button>
          </div>

        </div>
      </ha-dialog>
    `;
   }

   private static getTimelineContent(
      dialog: AddPlantDialogState,
      growspaceName: string,
      callbacks: {
         onSeedlingStartChange: (value: string) => void;
         onVegStartChange: (value: string) => void;
         onFlowerStartChange: (value: string) => void;
         onMotherStartChange: (value: string) => void;
         onCloneStartChange: (value: string) => void;
         onDryStartChange: (value: string) => void;
         onCureStartChange: (value: string) => void;
      }
   ): TemplateResult {
      const name = growspaceName.toLowerCase();
      let content: TemplateResult;

      if (name.includes('mother')) {
         content = html`${DialogRenderer.renderMD3DateInput('Mother Start', dialog.mother_start || '', callbacks.onMotherStartChange)}`;
      } else if (name.includes('clone')) {
         content = html`${DialogRenderer.renderMD3DateInput('Clone Start', dialog.clone_start || '', callbacks.onCloneStartChange)}`;
      } else if (name.includes('dry')) {
         content = html`${DialogRenderer.renderMD3DateInput('Dry Start', dialog.dry_start || '', callbacks.onDryStartChange)}`;
      } else if (name.includes('cure')) {
         content = html`${DialogRenderer.renderMD3DateInput('Cure Start', dialog.cure_start || '', callbacks.onCureStartChange)}`;
      } else {
         content = html`
        ${DialogRenderer.renderMD3DateInput('Seedling Start', dialog.seedling_start || '', callbacks.onSeedlingStartChange)}
        ${DialogRenderer.renderMD3DateInput('Vegetative Start', dialog.veg_start || '', callbacks.onVegStartChange)}
        ${DialogRenderer.renderMD3DateInput('Flower Start', dialog.flower_start || '', callbacks.onFlowerStartChange)}
      `;
      }

      return html`
      <h3>Timeline</h3>
      ${content}
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
            <md-icon-button @click=${callbacks.onClose}>
               <md-icon><svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg></md-icon>
            </md-icon-button>
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
             <md-filled-button class="danger" @click=${() => callbacks.onDelete(plantId)} style="--md-filled-button-container-color: var(--error-color, #b00020);">
               <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiDelete}"></path></svg></md-icon>
               Delete
             </md-filled-button>

             <md-filled-tonal-button @click=${callbacks.onUpdate}>
               <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg></md-icon>
               Save Changes
             </md-filled-tonal-button>

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
                  <md-filled-button
                    @click=${(e: MouseEvent) => {
               const btn = e.currentTarget as HTMLElement;
               // Find the input sibling (since we used display:contents, they are siblings in the flex container)
               const input = btn.previousElementSibling as HTMLInputElement;
               const numClones = input ? parseInt(input.value, 10) : 1;
               callbacks.onTakeClone(plant, numClones);
            }}
                  >
                    <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg></md-icon>
                    Take Clone
                    <option value="">Move to...</option>
                    ${Object.entries(growspaceOptions).map(([id, name]) => html`<option value="${id}">${name}</option>`)}
                  </select>
                  <md-filled-button
                    @click=${(e: MouseEvent) => {
               const btn = e.currentTarget as HTMLElement;
               const select = btn.previousElementSibling as HTMLSelectElement;
               if (!select.value) { alert('Select a growspace'); return; }
               callbacks.onMoveClone(plant, select.value);
            }}
                  >
                    <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiArrowRight}"></path></svg></md-icon>
                    Move
                  </md-filled-button>
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
         onToggleCropMode: (active: boolean) => void;
         // Image Selection
         onToggleImageSelector: (isOpen: boolean) => void;
         onSelectLibraryImage: (imageUrl: string) => void;
         onExportStrains: () => void;
         // Import
         onOpenImportDialog: () => void;
         onImportDialogChange: (changes: { open?: boolean, replace?: boolean }) => void;
         onConfirmImport: () => void;
         onGetRecommendation: () => void;
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
             position: relative;
             overflow: hidden;
          }
          .photo-upload-area:hover {
             border-color: var(--accent-green);
             background: rgba(34, 197, 94, 0.05);
          }
          .select-library-btn {
             position: absolute;
             top: 8px;
             left: 8px;
             background: rgba(0,0,0,0.6);
             border: 1px solid rgba(255,255,255,0.2);
             color: #fff;
             padding: 6px 12px;
             border-radius: 20px;
             font-size: 0.75rem;
             display: flex;
             align-items: center;
             gap: 6px;
             z-index: 10;
             cursor: pointer;
          }
          .select-library-btn:hover {
             background: var(--accent-green);
             border-color: var(--accent-green);
          }

          /* Crop Overlay */
          .crop-overlay {
             position: fixed;
             top: 0; left: 0; right: 0; bottom: 0;
             background: rgba(0,0,0,0.9);
             z-index: 1000;
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: center;
             padding: 20px;
          }
          .crop-viewport {
             width: 300px;
             height: 300px;
             border: 2px solid var(--accent-green);
             overflow: hidden;
             position: relative;
             cursor: move;
             box-shadow: 0 0 0 100vmax rgba(0,0,0,0.7);
          }
          .crop-controls {
             margin-top: 20px;
             width: 300px;
             display: flex;
             flex-direction: column;
             gap: 12px;
          }
          .crop-slider {
             width: 100%;
             accent-color: var(--accent-green);
          }

          /* SCALE GRAPH */
          .scale-graph-container {
             width: 100%;
             height: 8px;
             background: rgba(255,255,255,0.1);
             border-radius: 4px;
             margin-top: 6px;
             position: relative;
             overflow: hidden;
             display: flex;
          }
          .sg-bar-sativa {
             background: #EAB308; /* Yellow/Orange */
             height: 100%;
          }
          .sg-bar-indica {
             background: #8B5CF6; /* Purple */
             height: 100%;
             position: absolute;
             right: 0;
             top: 0;
          }

          /* NEW HYBRID GRAPH STYLES */
          .hg-container {
             display: flex;
             flex-direction: column;
             gap: 4px;
             width: 100%;
             margin-top: 8px;
             font-family: 'Roboto', sans-serif;
          }
          .hg-labels {
             display: flex;
             justify-content: space-between;
             font-size: 0.75rem;
             font-weight: 700;
             color: #fff;
             margin-bottom: 2px;
          }
          .hg-bar-track {
             height: 18px;
             width: 100%;
             background: #333;
             border-radius: 2px;
             position: relative;
             overflow: hidden;
             display: flex;
             border: 1px solid rgba(255,255,255,0.1);
             cursor: pointer;
          }
          .hg-bar-indica {
             background: #8B5CF6; /* Purple */
             height: 100%;
             transition: width 0.2s ease;
          }
          .hg-bar-sativa {
             background: #EAB308; /* Yellow */
             height: 100%;
             flex: 1;
             transition: width 0.2s ease;
          }
          .hg-tick {
             position: absolute;
             top: 0;
             bottom: 0;
             width: 1px;
             background: rgba(255,255,255,0.4);
             pointer-events: none;
          }
          .hg-legend-container {
             position: relative;
             height: 14px;
             width: 100%;
             margin-top: 2px;
          }
          .hg-legend-label {
             position: absolute;
             font-size: 0.65rem;
             color: var(--text-secondary);
             transform: translateX(-50%);
          }
          .hg-legend-label.start { left: 0; transform: none; }
          .hg-legend-label.end { right: 0; transform: none; }

          /* Interactive input styling override */
          .hg-input-label {
             display: flex;
             align-items: center;
             gap: 4px;
          }
          .hg-num-input {
             background: transparent;
             border: none;
             border-bottom: 1px solid var(--text-secondary);
             color: #fff;
             width: 36px;
             text-align: center;
             font-size: 0.75rem;
             font-weight: 700;
             padding: 0;
          }
          .hg-num-input:focus {
             outline: none;
             border-bottom-color: var(--accent-green);
          }

        </style>

        <div class="strain-dialog-container">
           ${dialog.view === 'browse'
            ? this.renderStrainBrowseView(dialog, callbacks)
            : this.renderStrainEditorView(dialog, callbacks)
         }
        </div>

        ${dialog.isCropping ? this.renderCropOverlay(dialog, callbacks) : nothing}
        ${dialog.isImageSelectorOpen ? this.renderImageSelector(dialog, callbacks) : nothing}
        ${dialog.importDialog?.open ? this.renderImportDialog(dialog, callbacks) : nothing}

      </ha-dialog>
    `;
   }

   private static renderImportDialog(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult {
      const isReplace = dialog.importDialog?.replace || false;

      return html`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 400px; max-width: 90vw; border-radius: 16px; padding: 24px; border: 1px solid var(--border-color); color: #fff; display: flex; flex-direction: column; gap: 20px;">

              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.25rem;">Import Strains</h2>
                 <button class="sd-close-btn" @click=${() => callbacks.onImportDialogChange({ open: false })}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
                 </button>
              </div>

              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                 Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
              </div>

              <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                    <input type="radio" name="import_mode"
                           .checked=${!isReplace}
                           @change=${() => callbacks.onImportDialogChange({ replace: false })}
                           style="accent-color: var(--accent-green); transform: scale(1.2);" />
                    <div>
                       <div style="font-weight: 600;">Merge</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Add new strains, keep existing ones.</div>
                    </div>
                 </label>

                 <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>

                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                     <input type="radio" name="import_mode"
                           .checked=${isReplace}
                           @change=${() => callbacks.onImportDialogChange({ replace: true })}
                           style="accent-color: var(--accent-green); transform: scale(1.2);" />
                     <div>
                       <div style="font-weight: 600;">Replace</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Overwrite entire library with import.</div>
                    </div>
                 </label>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                 <button class="sd-btn secondary" @click=${() => callbacks.onImportDialogChange({ open: false })}>
                    Cancel
                 </button>
                 <button class="sd-btn primary" @click=${callbacks.onConfirmImport}>
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
                    Select File
                 </button>
              </div>

           </div>
        </div>
     `;
   }

   private static renderImageSelector(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult {
      // Group strains by image
      const imageMap = new Map<string, { strain: string, phenotype: string }[]>();
      dialog.strains.forEach(s => {
         if (s.image) {
            if (!imageMap.has(s.image)) {
               imageMap.set(s.image, []);
            }
            imageMap.get(s.image)!.push({ strain: s.strain, phenotype: s.phenotype || '' });
         }
      });

      return html`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 80%; max-width: 800px; height: 80%; max-height: 600px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color);">
              <div class="sd-header">
                 <h2 class="sd-title">Select from Library</h2>
                 <button class="sd-close-btn" @click=${() => callbacks.onToggleImageSelector(false)}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
                 </button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...imageMap.entries()].map(([img, infoList]) => html`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${() => callbacks.onSelectLibraryImage(img)}>
                          <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />

                          <!-- Info Overlay -->
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${infoList.map((info, index) => html`
                                <div style="${index < infoList.length - 1 ? 'margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);' : ''}">
                                   <div style="font-weight: 700;">Strain: ${info.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${info.phenotype || 'N/A'}</div>
                                </div>
                             `)}
                          </div>

                          <div class="image-hover-overlay" style="position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(34, 197, 94, 0.2); opacity: 0; transition: opacity 0.2s; pointer-events: none;"></div>
                       </div>
                    `)}
                 </div>
                 ${imageMap.size === 0 ? html`<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">No images found in library.</p>` : nothing}
              </div>
           </div>
        </div>
     `;
   }

   private static renderCropOverlay(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult | typeof nothing {
      const s = dialog.editorState;
      if (!s.image) return nothing;

      // Local state handling for drag/zoom would ideally be in the component instance,
      // but since this is a static renderer, we rely on the dialog state.
      // We need the offsets and scale in the state.
      // For smooth dragging, we might need to use DOM events that update the state via callback.

      const meta = s.image_crop_meta || { x: 50, y: 50, scale: 1 };

      const handleWheel = (e: WheelEvent) => {
         e.preventDefault();
         const delta = e.deltaY * -0.001;
         const newScale = Math.min(Math.max(meta.scale + delta, 1), 5);
         callbacks.onEditorChange('image_crop_meta', { ...meta, scale: newScale });
      };

      const handleMouseDown = (e: MouseEvent) => {
         const startX = e.clientX;
         const startY = e.clientY;
         const startMetaX = meta.x;
         const startMetaY = meta.y;

         const onMouseMove = (ev: MouseEvent) => {
            // Sensitivity factor needs tuning
            const deltaX = (startX - ev.clientX) * (0.2 / meta.scale);
            const deltaY = (startY - ev.clientY) * (0.2 / meta.scale);

            let newX = Math.min(Math.max(startMetaX + deltaX, 0), 100);
            let newY = Math.min(Math.max(startMetaY + deltaY, 0), 100);

            callbacks.onEditorChange('image_crop_meta', { ...meta, x: newX, y: newY });
         };

         const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
         };

         window.addEventListener('mousemove', onMouseMove);
         window.addEventListener('mouseup', onMouseUp);
      };

      return html`
       <div class="crop-overlay">
          <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
          <div class="crop-viewport"
               @wheel=${handleWheel}
               @mousedown=${handleMouseDown}
               @dragstart=${(e: DragEvent) => e.preventDefault()}>
             <!--
                We are updating the CropMeta which maps to background-position %.
                background-position: 50% 50% is center. 0% 0% is left/top.
             -->
             <div style="width: 100%; height: 100%;
                 background-image: url('${s.image}');
                 background-size: ${meta.scale * 100}%;
                 background-position: ${meta.x}% ${meta.y}%;
                 background-repeat: no-repeat;
                 pointer-events: none;">
             </div>
          </div>

          <div class="crop-controls">
             <div style="display:flex; justify-content:space-between; color:#ccc; font-size:0.8rem;">
                <span>Zoom: ${(meta.scale * 100).toFixed(0)}%</span>
             </div>
             <input type="range" class="crop-slider" min="1" max="5" step="0.1"
                    .value=${meta.scale}
                    @input=${(e: Event) => callbacks.onEditorChange('image_crop_meta', { ...meta, scale: parseFloat((e.target as HTMLInputElement).value) })} />

             <div style="display:flex; gap:12px; margin-top:12px;">
                <button class="md3-button tonal" style="flex:1" @click=${() => callbacks.onToggleCropMode(false)}>Done</button>
             </div>
             <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
                Drag to pan • Scroll to zoom
             </div>
          </div>
       </div>
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
         <button class="sd-btn secondary" @click=${callbacks.onGetRecommendation}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
            Get Recommendation
         </button>
         <button class="sd-btn secondary" @click=${callbacks.onOpenImportDialog}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCloudUpload}"></path></svg>
            Import Strains
         </button>
         <button class="sd-btn secondary" @click=${callbacks.onExportStrains}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiDownload}"></path></svg>
            Export Strains
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

      const thumbStyle = strain.image ? DialogRenderer.getCropStyle(strain.image, strain.image_crop_meta) : '';

      return html`
       <div class="strain-card" @click=${() => callbacks.onSwitchView('editor', strain)}>
          <div class="sc-thumb" style="${strain.image ? thumbStyle + '; background-repeat: no-repeat; background-position: center; background-size: cover;' : ''}">
             ${strain.image
            ? (strain.image_crop_meta
               ? html`<div style="width:100%; height:100%; ${thumbStyle}; background-repeat: no-repeat;"></div>`
               : html`<img src="${strain.image}" alt="${strain.strain}" />`)
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
             <div class="sc-type-row" style="flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap:6px; width: 100%;">
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${typeIcon}"></path></svg>
                   <span>${typeLabel}</span>
                </div>
                ${lowerType.includes('hybrid') ? html`
                   <div class="hg-container" title="Indica: ${strain.indica_percentage || 0}% | Sativa: ${strain.sativa_percentage || 0}%">
                      <div class="hg-labels">
                         <span>Indica: ${strain.indica_percentage || 0}%</span>
                         <span>Sativa: ${strain.sativa_percentage || 0}%</span>
                      </div>
                      <div class="hg-bar-track" style="cursor: default;">
                         <div class="hg-bar-indica" style="width: ${strain.indica_percentage || 0}%"></div>
                         <div class="hg-bar-sativa"></div>

                         <div class="hg-tick" style="left: 25%"></div>
                         <div class="hg-tick" style="left: 50%"></div>
                         <div class="hg-tick" style="left: 75%"></div>
                      </div>
                      <div class="hg-legend-container">
                         <span class="hg-legend-label start">0%</span>
                         <span class="hg-legend-label" style="left: 25%">25%</span>
                         <span class="hg-legend-label" style="left: 50%">50%</span>
                         <span class="hg-legend-label" style="left: 75%">75%</span>
                         <span class="hg-legend-label end">100%</span>
                      </div>
                   </div>
                ` : nothing}
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

      // Filter unique lists for autocomplete
      const uniqueStrains = [...new Set(dialog.strains.map(st => st.strain).filter(Boolean))].sort();
      const uniqueBreeders = [...new Set(dialog.strains.map(st => st.breeder).filter(Boolean))].sort();

      return html`
      <datalist id="strain-suggestions">
         ${uniqueStrains.map(name => html`<option value="${name}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
         ${uniqueBreeders.map(name => html`<option value="${name}"></option>`)}
      </datalist>

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
               <div class="photo-upload-area"
                    @click=${(e: Event) => {
            // Only click input if not clicking the crop button or select lib button
            const target = e.target as HTMLElement;
            if (!target.closest('.crop-btn') && !target.closest('.select-library-btn')) {
               (e.currentTarget as HTMLElement).querySelector('input')?.click();
            }
         }}
                    @dragover=${(e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'copy'; }}
                    @drop=${(e: DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer?.files[0];
            if (file) {
               PlantUtils.compressImage(file)
                  .then(base64 => update('image', base64))
                  .catch(err => console.error("Error compressing image:", err));
            }
         }}>

                  <button class="select-library-btn" @click=${(e: Event) => {
            e.stopPropagation();
            callbacks.onToggleImageSelector(true);
         }}>
                      <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
                      Select from Library
                  </button>

                  ${s.image ? html`
                     ${s.image_crop_meta
               ? html`<div style="width:100%; height:100%; border-radius:10px; ${DialogRenderer.getCropStyle(s.image, s.image_crop_meta)}; background-repeat: no-repeat;"></div>`
               : html`<img src="${s.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`
            }

                     <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                         <button class="crop-btn"
                                 style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                                 @click=${(e: Event) => { e.stopPropagation(); callbacks.onToggleCropMode(true); }}
                                 title="Crop Image">
                            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiContentCopy}"></path></svg>
                         </button>
                         <div style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;">
                            <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                         </div>
                     </div>
                  ` : html`
                     <svg style="width:48px;height:48px;fill:currentColor;margin-bottom:16px;" viewBox="0 0 24 24"><path d="${mdiUpload}"></path></svg>
                     <span style="font-weight:600;">PHOTO UPLOAD AREA</span>
                     <span style="font-size:0.8rem; margin-top:4px;">(Drag & Drop or Click)</span>
                  `}
                  <input type="file" id="strain-image-upload" style="display:none" accept="image/*"
                         @change=${(e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
               PlantUtils.compressImage(file)
                  .then(base64 => update('image', base64))
                  .catch(err => console.error("Error compressing image:", err));
            }
         }} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Strain Name *</label>
                  <input type="text" class="sd-input" list="strain-suggestions" .value=${s.strain} @input=${(e: any) => update('strain', e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Phenotype</label>
                  <input type="text" class="sd-input" placeholder="e.g. #1 (Optional)" .value=${s.phenotype} @input=${(e: any) => update('phenotype', e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Breeder/Seedbank</label>
                  <input type="text" class="sd-input" list="breeder-suggestions" .value=${s.breeder} @input=${(e: any) => update('breeder', e.target.value)} />
               </div>
            </div>

            <!-- RIGHT COL: GENETICS -->
            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${['Indica', 'Sativa', 'Hybrid', 'Ruderalis'].map(t => {
            let icon = mdiLeaf;
            if (t === 'Indica') icon = mdiWeatherNight;
            if (t === 'Sativa') icon = mdiWeatherSunny;
            if (t === 'Hybrid') icon = mdiTuneVariant;

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

               ${(s.type || '').toLowerCase() === 'hybrid' ? html`
                  <div class="sd-form-group">
                     <label class="sd-label">Hybrid Composition (%)</label>
                     <div class="hg-container" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">

                        <!-- Header / Inputs -->
                        <div class="hg-labels">
                           <div class="hg-input-label">
                              <span>Indica:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${s.indica_percentage || 0}
                                 @input=${(e: any) => {
               let val = Math.floor(parseFloat(e.target.value)) || 0;
               if (val < 0) val = 0;
               if (val > 100) val = 100;

               // Update Indica, Auto-calc Sativa
               update('indica_percentage', val);
               update('sativa_percentage', 100 - val);
            }} />
                              <span>%</span>
                           </div>

                           <div class="hg-input-label">
                              <span>Sativa:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${s.sativa_percentage || 0}
                                 @input=${(e: any) => {
               let val = Math.floor(parseFloat(e.target.value)) || 0;
               if (val < 0) val = 0;
               if (val > 100) val = 100;

               // Update Sativa, Auto-calc Indica
               update('sativa_percentage', val);
               update('indica_percentage', 100 - val);
            }} />
                              <span>%</span>
                           </div>
                        </div>

                        <!-- Bar -->
                        <div class="hg-bar-track"
                             @click=${(e: MouseEvent) => {
               const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
               const x = e.clientX - rect.left;
               const width = rect.width;
               // 0 on Left means 0% Indica?
               // Left Bar is Indica. So Width = Indica %.
               // if x is at 40% of width, then Indica is 40%.
               let percent = Math.round((x / width) * 100);
               if (percent < 0) percent = 0;
               if (percent > 100) percent = 100;

               update('indica_percentage', percent);
               update('sativa_percentage', 100 - percent);
            }}>
                           <div class="hg-bar-indica" style="width: ${s.indica_percentage || 0}%"></div>
                           <div class="hg-bar-sativa"></div>

                           <div class="hg-tick" style="left: 25%"></div>
                           <div class="hg-tick" style="left: 50%"></div>
                           <div class="hg-tick" style="left: 75%"></div>
                        </div>

                        <!-- Legend -->
                        <div class="hg-legend-container">
                           <span class="hg-legend-label start">0%</span>
                           <span class="hg-legend-label" style="left: 25%">25%</span>
                           <span class="hg-legend-label" style="left: 50%">50%</span>
                           <span class="hg-legend-label" style="left: 75%">75%</span>
                           <span class="hg-legend-label end">100%</span>
                        </div>

                        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px; text-align:center;">
                           Click bar or edit values to adjust
                        </div>
                     </div>
                  </div>
               ` : nothing}

               <div class="sd-form-group">
                  <label class="sd-label">Flowering Time (Days)</label>
                  <div style="display:flex; gap:16px;">
                     <input type="number" class="sd-input" placeholder="Min" .value=${s.flowering_min} @input=${(e: any) => update('flowering_min', e.target.value)} />
                     <input type="number" class="sd-input" placeholder="Max" .value=${s.flowering_max} @input=${(e: any) => update('flowering_max', e.target.value)} />
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Lineage</label>
                  <input type="text" class="sd-input" .value=${s.lineage} @input=${(e: any) => update('lineage', e.target.value)} />
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
            </div> <!-- End Right Col -->
         </div> <!-- End Editor Layout -->
      </div> <!-- End Content -->

      <div class="sd-footer">
         <md-filled-button @click=${callbacks.onAddStrain}>
            <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg></md-icon>
            Save Strain
         </md-filled-button>
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

   static renderConfigDialog(
      dialog: ConfigDialogState | null,
      growspaceOptions: Record<string, string>,
      activeTab: string,
      callbacks: {
         onClose: () => void;
         onSwitchTab: (tab: string) => void;
         onAddGrowspaceChange: (field: string, value: any) => void;
         onAddGrowspaceSubmit: () => void;
         onEnvChange: (field: string, value: any) => void;
         onEnvSubmit: () => void;
         onGlobalChange: (field: string, value: any) => void;
         onGlobalSubmit: () => void;
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
        <div class="glass-dialog-container" style="--stage-color: var(--primary-color)">
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Configuration</h2>
               <div class="dialog-subtitle">Manage Growspaces & Settings</div>
            </div>
            <md-icon-button @click=${callbacks.onClose}>
               <md-icon><svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg></md-icon>
            </md-icon-button>
          </div>

          <div class="config-tabs">
             <button class="config-tab ${activeTab === 'growspaces' ? 'active' : ''}" @click=${() => callbacks.onSwitchTab('growspaces')}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
                Add Growspace
             </button>
             <button class="config-tab ${activeTab === 'environment' ? 'active' : ''}" @click=${() => callbacks.onSwitchTab('environment')}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
                Environment
             </button>
             <button class="config-tab ${activeTab === 'global' ? 'active' : ''}" @click=${() => callbacks.onSwitchTab('global')}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiEarth}"></path></svg>
                Global Settings
             </button>
          </div>

          <div class="config-content">
             ${activeTab === 'growspaces' ? this.renderAddGrowspaceTab(dialog, callbacks) : nothing}
             ${activeTab === 'environment' ? this.renderEnvironmentTab(dialog, callbacks) : nothing}
             ${activeTab === 'global' ? this.renderGlobalTab(dialog, callbacks) : nothing}
          </div>
        </div>
      </ha-dialog>
      `;
   }

   private static renderAddGrowspaceTab(dialog: ConfigDialogState, callbacks: any): TemplateResult {
      const s = dialog.addGrowspaceState || {};
      return html`
         <div class="detail-card">
            <h3>Add New Growspace</h3>
            ${DialogRenderer.renderMD3TextInput('Growspace Name', s.name || '', (v) => callbacks.onAddGrowspaceChange('name', v))}
            ${DialogRenderer.renderMD3SelectInput('Type', s.type || '', ['Tent', 'Room', 'Outdoor'], (v) => callbacks.onAddGrowspaceChange('type', v))}
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
               <md-filled-button @click=${callbacks.onAddGrowspaceSubmit}>
                  <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg></md-icon>
                  Create Growspace
               </md-filled-button>
            </div>
         </div>
      `;
   }

   private static renderEnvironmentTab(dialog: ConfigDialogState, callbacks: any): TemplateResult {
      const s = dialog.environmentState || {};
      return html`
         <div class="detail-card">
            <h3>Environment Defaults</h3>
            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">Set default target values for new growspaces.</p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
               ${DialogRenderer.renderMD3NumberInput('Temp Target (°C)', s.temp_target || 24, (v) => callbacks.onEnvChange('temp_target', parseFloat(v)))}
               ${DialogRenderer.renderMD3NumberInput('Humidity Target (%)', s.humidity_target || 55, (v) => callbacks.onEnvChange('humidity_target', parseFloat(v)))}
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
               <md-filled-button @click=${callbacks.onEnvSubmit}>
                  <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg></md-icon>
                  Save Defaults
               </md-filled-button>
            </div>
         </div>
      `;
   }

   private static renderGlobalTab(dialog: ConfigDialogState, callbacks: any): TemplateResult {
      const s = dialog.globalState || {};
      return html`
         <div class="detail-card">
            <h3>Global Settings</h3>
            ${DialogRenderer.renderMD3SelectInput('Temperature Unit', s.temp_unit || 'C', ['C', 'F'], (v) => callbacks.onGlobalChange('temp_unit', v))}
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
               <md-filled-button @click=${callbacks.onGlobalSubmit}>
                  <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiCheck}"></path></svg></md-icon>
                  Save Settings
               </md-filled-button>
            </div>
         </div>
      `;
   }

   static renderGrowMasterDialog(
      dialog: GrowMasterDialogState | null,
      callbacks: {
         onClose: () => void;
         onQueryChange: (query: string) => void;
         onSubmit: () => void;
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
        <div class="glass-dialog-container" style="--stage-color: #8B5CF6">
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Grow Master AI</h2>
               <div class="dialog-subtitle">Ask questions about your grow</div>
            </div>
            <md-icon-button @click=${callbacks.onClose}>
               <md-icon><svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg></md-icon>
            </md-icon-button>
          </div>

          <div class="overview-grid">
             <div class="detail-card" style="min-height: 300px; display: flex; flex-direction: column;">
                <div class="chat-history" style="flex: 1; overflow-y: auto; margin-bottom: 16px; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; background: rgba(0,0,0,0.2);">
                   ${dialog.history?.map(msg => html`
                      <div style="margin-bottom: 12px; text-align: ${msg.role === 'user' ? 'right' : 'left'};">
                         <div style="display: inline-block; padding: 8px 12px; border-radius: 12px; background: ${msg.role === 'user' ? 'var(--primary-color)' : '#374151'}; color: white; max-width: 80%;">
                            ${msg.content}
                         </div>
                      </div>
                   `)}
                   ${dialog.isLoading ? html`
                      <div style="text-align: left; margin-bottom: 12px;">
                         <div style="display: inline-block; padding: 8px 12px; border-radius: 12px; background: #374151; color: white;">
                            <md-icon class="spin"><svg viewBox="0 0 24 24"><path d="${mdiLoading}"></path></svg></md-icon> Thinking...
                         </div>
                      </div>
                   ` : nothing}
                </div>

                <div style="display: flex; gap: 8px;">
                   <md-outlined-text-field
                      type="textarea"
                      label="Ask Grow Master..."
                      .value=${dialog.query || ''}
                      @input=${(e: InputEvent) => callbacks.onQueryChange((e.target as HTMLInputElement).value)}
                      style="flex: 1;"
                   ></md-outlined-text-field>
                   <md-icon-button @click=${callbacks.onSubmit} ?disabled=${dialog.isLoading}>
                      <md-icon><svg viewBox="0 0 24 24"><path d="${mdiArrowRight}"></path></svg></md-icon>
                   </md-icon-button>
                </div>
             </div>
          </div>
        </div>
      </ha-dialog>
      `;
   }

   static renderStrainRecommendationDialog(
      dialog: StrainRecommendationDialogState | null,
      callbacks: {
         onClose: () => void;
         onPreferencesChange: (prefs: string) => void;
         onSubmit: () => void;
         onAccept: (strain: any) => void;
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
        <div class="glass-dialog-container" style="--stage-color: #10B981">
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Strain Recommender</h2>
               <div class="dialog-subtitle">Find the perfect strain for you</div>
            </div>
            <md-icon-button @click=${callbacks.onClose}>
               <md-icon><svg viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg></md-icon>
            </md-icon-button>
          </div>

          <div class="overview-grid">
             <div class="detail-card">
                <h3>Your Preferences</h3>
                <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">Describe what you are looking for (e.g., "High yield, fruity flavor, good for sleep").</p>
                
                <md-outlined-text-field
                   type="textarea"
                   label="Preferences"
                   .value=${dialog.preferences || ''}
                   @input=${(e: InputEvent) => callbacks.onPreferencesChange((e.target as HTMLInputElement).value)}
                   style="width: 100%; margin-bottom: 16px;"
                   rows="3"
                ></md-outlined-text-field>

                <div style="display:flex; justify-content:flex-end;">
                   <md-filled-button @click=${callbacks.onSubmit} ?disabled=${dialog.isLoading}>
                      ${dialog.isLoading ? html`<md-icon class="spin" slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiLoading}"></path></svg></md-icon>` : html`<md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg></md-icon>`}
                      Get Recommendations
                   </md-filled-button>
                </div>
             </div>

             ${dialog.recommendations?.length ? html`
                <div class="detail-card">
                   <h3>Recommendations</h3>
                   <div style="display: grid; gap: 16px;">
                      ${dialog.recommendations.map(rec => html`
                         <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                               <h4 style="margin: 0; font-size: 1.1rem; color: var(--accent-green);">${rec.strain}</h4>
                               <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px;">${rec.match_score}% Match</span>
                            </div>
                            <p style="font-size: 0.9rem; color: #ddd; margin: 0 0 12px 0;">${rec.reason}</p>
                            <md-filled-tonal-button @click=${() => callbacks.onAccept(rec)}>
                               <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg></md-icon>
                               Add to Library
                            </md-filled-tonal-button>
                         </div>
                      `)}
                   </div>
                </div>
             ` : nothing}
          </div>
        </div>
      </ha-dialog>
      `;
   }

   static renderMD3TextInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
      return html`
         <md-outlined-text-field
            label="${label}"
            .value="${value}"
            @input="${(e: InputEvent) => onChange((e.target as HTMLInputElement).value)}"
            style="width: 100%;"
         ></md-outlined-text-field>
      `;
   }

   static renderMD3NumberInput(label: string, value: number, onChange: (value: string) => void): TemplateResult {
      return html`
         <md-outlined-text-field
            label="${label}"
            type="number"
            .value="${value.toString()}"
            @input="${(e: InputEvent) => onChange((e.target as HTMLInputElement).value)}"
            style="width: 100%;"
         ></md-outlined-text-field>
      `;
   }

   static renderMD3SelectInput(label: string, value: string, options: string[], onChange: (value: string) => void): TemplateResult {
      return html`
         <md-outlined-select
            label="${label}"
            .value="${value}"
            @change="${(e: Event) => onChange((e.target as HTMLSelectElement).value)}"
            style="width: 100%;"
         >
            <md-select-option value=""></md-select-option>
            ${options.map(opt => html`
               <md-select-option value="${opt}">
                  <div slot="headline">${opt}</div>
               </md-select-option>
            `)}
         </md-outlined-select>
      `;
   }

   static renderMD3DateInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
      return html`
         <md-outlined-text-field
            label="${label}"
            type="datetime-local"
            .value="${value}"
            @input="${(e: InputEvent) => onChange((e.target as HTMLInputElement).value)}"
            style="width: 100%;"
         ></md-outlined-text-field>
      `;
   }
}

