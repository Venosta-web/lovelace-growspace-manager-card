import { html, TemplateResult, nothing } from 'lit';
import '@material/web/dialog/dialog.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/radio/radio.js';
import '@material/web/icon/icon.js';
import {
   mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer,
   mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck,
   mdiContentCopy, mdiArrowRight, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant,
   mdiLeaf, mdiUpload, mdiArrowLeft, mdiFilterVariant, mdiCloudUpload, mdiPencil,
   mdiCog, mdiThermometer, mdiEarth, mdiViewDashboard, mdiFan, mdiWeatherPartlyCloudy, mdiBrain, mdiLoading, mdiDownload
} from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, ConfigDialogState, GrowMasterDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry, CropMeta, StrainRecommendationDialogState } from './types';
import { PlantUtils } from "./utils";

export class DialogRenderer {
   private static getCropStyle(image: string, meta?: CropMeta) {
      if (!meta) return `background-image: url('${image}')`;
      return `
      background-image: url('${image}');
      background-size: ${meta.scale * 100}%;
      background-position: ${meta.x}% ${meta.y}%;
    `;
   }
   private static formatResponse(response: any): string {
      if (typeof response === 'object' && response !== null) {
         return JSON.stringify(response, null, 2);
      }
      return String(response);
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

      const uniqueStrains = [...new Set(strainLibrary.map(s => s.strain))].sort();
      const timelineContent = DialogRenderer.getTimelineContent(dialog, growspaceName, callbacks);

      return html`
      <md-dialog
        open
        @closed=${callbacks.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="glass-dialog-container" style="--stage-color: var(--plant-border-color-default)">
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Add New Plant</h2>
               <div class="dialog-subtitle">Enter plant details below</div>
            </div>
            <md-icon-button @click=${callbacks.onClose}>
               <md-icon><path d="${mdiClose}"></path></md-icon>
            </md-icon-button>
          </div>

          <div class="overview-grid">
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${DialogRenderer.renderMD3SelectInput('Strain *', dialog.strain || '', uniqueStrains, callbacks.onStrainChange)}
               ${DialogRenderer.renderMD3TextInput('Phenotype', dialog.phenotype || '', callbacks.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${DialogRenderer.renderMD3NumberInput('Row', dialog.row + 1, (v) => callbacks.onRowChange(v))}
                 ${DialogRenderer.renderMD3NumberInput('Col', dialog.col + 1, (v) => callbacks.onColChange(v))}
               </div>
             </div>
             <div class="detail-card">
                ${timelineContent}
             </div>
          </div>

          <div class="button-group">
            <md-outlined-button @click=${callbacks.onClose}>
              Cancel
            </md-outlined-button>
            <md-filled-button @click=${callbacks.onConfirm}>
              <md-icon slot="icon"><path d="${mdiSprout}"></path></md-icon>
              Add Plant
            </md-filled-button>
          </div>
        </div>
      </md-dialog>
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
      <md-dialog
        open
        @closed=${callbacks.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="glass-dialog-container" style="--stage-color: ${stageColor}">
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
               <md-icon><path d="${mdiClose}"></path></md-icon>
            </md-icon-button>
          </div>

          <div class="overview-grid">
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${DialogRenderer.renderMD3TextInput('Strain Name', editedAttributes.strain || '', (v) => callbacks.onAttributeChange('strain', v))}
               ${DialogRenderer.renderMD3TextInput('Phenotype', editedAttributes.phenotype || '', (v) => callbacks.onAttributeChange('phenotype', v))}
               <div style="display:flex; gap:16px;">
                 ${DialogRenderer.renderMD3NumberInput('Row', editedAttributes.row || 1, (v) => callbacks.onAttributeChange('row', parseInt(v)))}
                 ${DialogRenderer.renderMD3NumberInput('Col', editedAttributes.col || 1, (v) => callbacks.onAttributeChange('col', parseInt(v)))}
               </div>
             </div>

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

             ${DialogRenderer.renderPlantStatsMD3(plant)}
          </div>

          <div class="button-group">
             <md-outlined-button @click=${() => callbacks.onDelete(plantId)} style="--md-outlined-button-label-text-color: var(--error-color); --md-outlined-button-outline-color: var(--error-color);">
               <md-icon slot="icon"><path d="${mdiDelete}"></path></md-icon>
               Delete
             </md-outlined-button>

             <md-filled-button @click=${callbacks.onUpdate}>
               <md-icon slot="icon"><path d="${mdiCheck}"></path></md-icon>
               Save Changes
             </md-filled-button>

             ${plant.state.toLowerCase() === 'mother' ? html`
                <div class="take-clone-container" style="display:flex; align-items:center; gap:8px;" data-plant-id="${plant.entity_id}">
                   <md-filled-text-field
                    type="number"
                    min="1"
                    max="10"
                    value="1"
                    class="num-clones-input"
                    style="width: 80px;"
                    label="Clones"
                  ></md-filled-text-field>
                  <md-filled-button
                    @click=${(e: MouseEvent) => {
               const btn = e.currentTarget as HTMLElement;
               const input = btn.previousElementSibling as HTMLInputElement;
               const numClones = input ? parseInt(input.value, 10) : 1;
               callbacks.onTakeClone(plant, numClones);
            }}
                  >
                    <md-icon slot="icon"><path d="${mdiContentCopy}"></path></md-icon>
                    Take Clone
                  </md-filled-button>
                </div>
             ` : nothing}

             ${plant.state.toLowerCase() === 'flower' ? html`
               <md-filled-button @click=${() => callbacks.onHarvest(plant)}>
                 <md-icon slot="icon"><path d="${mdiFlower}"></path></md-icon>
                 Harvest
               </md-filled-button>
             ` : nothing}

             ${plant.state.toLowerCase() === 'dry' ? html`
               <md-filled-button @click=${() => callbacks.onFinishDrying(plant)}>
                 <md-icon slot="icon"><path d="${mdiCannabis}"></path></md-icon>
                 Finish Drying
               </md-filled-button>
             ` : nothing}

             ${plant.state.toLowerCase() === 'clone' ? html`
               <div style="display:flex; align-items:center; gap:8px;">
                  <md-filled-select style="min-width: 150px;" id="clone-target-select" label="Move to...">
                    <md-select-option value=""></md-select-option>
                    ${Object.entries(growspaceOptions).map(([id, name]) => html`<md-select-option value="${id}"><div slot="headline">${name}</div></md-select-option>`)}
                  </md-filled-select>
                  <md-filled-button
                    @click=${(e: MouseEvent) => {
               const btn = e.currentTarget as HTMLElement;
               const select = btn.previousElementSibling as any;
               if (!select.value) { alert('Select a growspace'); return; }
               callbacks.onMoveClone(plant, select.value);
            }}
                  >
                    <md-icon slot="icon"><path d="${mdiArrowRight}"></path></md-icon>
                    Move
                  </md-filled-button>
               </div>
             ` : nothing}
          </div>
        </div>
      </md-dialog>
    `;
   }

   static renderStrainLibraryDialog(
      dialog: StrainLibraryDialogState | null,
      callbacks: {
         onClose: () => void;
         onAddStrain: () => void;
         onRemoveStrain: (strain: string) => void;
         onClearAll: () => void;
         onEditorChange: (field: string, value: string) => void;
         onSwitchView: (view: 'browse' | 'editor', strainToEdit?: StrainEntry) => void;
         onSearch: (query: string) => void;
         onToggleCropMode: (active: boolean) => void;
         onToggleImageSelector: (isOpen: boolean) => void;
         onSelectLibraryImage: (imageUrl: string) => void;
         onExportStrains: () => void;
         onOpenImportDialog: () => void;
         onImportDialogChange: (changes: { open?: boolean, replace?: boolean }) => void;
         onConfirmImport: () => void;
         onGetRecommendation: () => void;
      }
   ): TemplateResult {
      if (!dialog?.open) return html``;

      return html`
      <md-dialog
        open
        @closed=${callbacks.onClose}
        class="strain-dialog"
        style="--md-dialog-container-color: var(--growspace-card-bg);"
      >
        <div slot="content" style="padding:0; display:flex; flex-direction:column; height:100%;">
           ${dialog.view === 'browse'
            ? this.renderStrainBrowseView(dialog, callbacks)
            : this.renderStrainEditorView(dialog, callbacks)
         }
        </div>

        ${dialog.isCropping ? this.renderCropOverlay(dialog, callbacks) : nothing}
        ${dialog.isImageSelectorOpen ? this.renderImageSelector(dialog, callbacks) : nothing}
        ${dialog.importDialog?.open ? this.renderImportDialog(dialog, callbacks) : nothing}

      </md-dialog>
    `;
   }

   private static renderImportDialog(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult {
      const isReplace = dialog.importDialog?.replace || false;

      return html`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 400px; max-width: 90vw; border-radius: 16px; padding: 24px; border: 1px solid var(--border-color); color: #fff; display: flex; flex-direction: column; gap: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.25rem;">Import Strains</h2>
                 <md-icon-button @click=${() => callbacks.onImportDialogChange({ open: false })}>
                    <md-icon><path d="${mdiClose}"></path></md-icon>
                 </md-icon-button>
              </div>
              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                 Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                    <md-radio name="import_mode" .checked=${!isReplace} @change=${() => callbacks.onImportDialogChange({ replace: false })}></md-radio>
                    <div>
                       <div style="font-weight: 600;">Merge</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Add new strains, keep existing ones.</div>
                    </div>
                 </label>
                 <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                     <md-radio name="import_mode" .checked=${isReplace} @change=${() => callbacks.onImportDialogChange({ replace: true })}></md-radio>
                     <div>
                       <div style="font-weight: 600;">Replace</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Overwrite entire library with import.</div>
                    </div>
                 </label>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                 <md-outlined-button @click=${() => callbacks.onImportDialogChange({ open: false })}>
                    Cancel
                 </md-outlined-button>
                 <md-filled-button @click=${callbacks.onConfirmImport}>
                    <md-icon slot="icon"><path d="${mdiCloudUpload}"></path></md-icon>
                    Select File
                 </md-filled-button>
              </div>
           </div>
        </div>
     `;
   }

   private static renderImageSelector(dialog: StrainLibraryDialogState, callbacks: any): TemplateResult {
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
                 <md-icon-button @click=${() => callbacks.onToggleImageSelector(false)}>
                    <md-icon><path d="${mdiClose}"></path></md-icon>
                 </md-icon-button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...imageMap.entries()].map(([img, infoList]) => html`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${() => callbacks.onSelectLibraryImage(img)}>
                          <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${infoList.map((info, index) => html`
                                <div style="${index < infoList.length - 1 ? 'margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);' : ''}">
                                   <div style="font-weight: 700;">Strain: ${info.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${info.phenotype || 'N/A'}</div>
                                </div>
                             `)}
                          </div>
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
                <md-filled-button style="flex:1" @click=${() => callbacks.onToggleCropMode(false)}>Done</md-filled-button>
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
      const query = (dialog.searchQuery || '').toLowerCase();
      const filteredStrains = dialog.strains.filter(s =>
         s.strain.toLowerCase().includes(query) ||
         (s.breeder && s.breeder.toLowerCase().includes(query)) ||
         (s.phenotype && s.phenotype.toLowerCase().includes(query))
      );

      return html`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <md-icon-button @click=${callbacks.onClose}>
            <md-icon><path d="${mdiClose}"></path></md-icon>
         </md-icon-button>
      </div>

      <div class="sd-content">
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <md-filled-text-field
                  placeholder="Search Strains by Name, Breeder..."
                  .value=${dialog.searchQuery || ''}
                  @input=${(e: Event) => callbacks.onSearch((e.target as HTMLInputElement).value)}
                  style="width: 100%;"
               >
                 <md-icon slot="leading-icon"><path d="${mdiMagnify}"></path></md-icon>
               </md-filled-text-field>
            </div>
         </div>

         <div class="sd-grid">
            ${filteredStrains.map(strain => this.renderStrainCard(strain, callbacks))}
         </div>

         ${filteredStrains.length === 0 ? html`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <md-icon style="width:48px;height:48px;opacity:0.5;"><path d="${mdiMagnify}"></path></md-icon>
               <p>No strains found matching "${query}"</p>
            </div>
         ` : nothing}
      </div>

      <div class="sd-footer">
         <md-outlined-button @click=${callbacks.onGetRecommendation}>
            <md-icon slot="icon"><path d="${mdiBrain}"></path></md-icon>
            Get Recommendation
         </md-outlined-button>
         <md-outlined-button @click=${callbacks.onOpenImportDialog}>
            <md-icon slot="icon"><path d="${mdiCloudUpload}"></path></md-icon>
            Import Strains
         </md-outlined-button>
         <md-outlined-button @click=${callbacks.onExportStrains}>
            <md-icon slot="icon"><path d="${mdiDownload}"></path></md-icon>
            Export Strains
         </md-outlined-button>
         <md-filled-button @click=${() => callbacks.onSwitchView('editor')}>
            <md-icon slot="icon"><path d="${mdiPlus}"></path></md-icon>
            New Strain
         </md-filled-button>
      </div>
    `;
   }

   private static renderStrainCard(strain: StrainEntry, callbacks: any): TemplateResult {
      let typeIcon = mdiLeaf;
      let typeLabel = strain.type || 'Unknown';
      const lowerType = (strain.type || '').toLowerCase();
      if (lowerType.includes('indica')) typeIcon = mdiWeatherNight;
      else if (lowerType.includes('sativa')) typeIcon = mdiWeatherSunny;
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
            : html`<md-icon style="width:48px;height:48px;opacity:0.2;"><path d="${mdiCannabis}"></path></md-icon>`
         }
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${(e: Event) => { e.stopPropagation(); callbacks.onRemoveStrain(strain.key); }}>
                   <md-icon style="width:16px;height:16px;"><path d="${mdiDelete}"></path></md-icon>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${strain.strain} ${strain.phenotype ? `(${strain.phenotype})` : ''}</h3>
             <div class="sc-type-row" style="flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap:6px; width: 100%;">
                   <md-icon style="width:16px;height:16px;"><path d="${typeIcon}"></path></md-icon>
                   <span>${typeLabel}</span>
                </div>
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
      const isEdit = !!s.strain && dialog.strains.some(ex => ex.strain === s.strain && ex.phenotype === s.phenotype);
      const update = (field: string, value: any) => callbacks.onEditorChange(field, value);
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
            <md-outlined-button @click=${() => callbacks.onSwitchView('browse')}>
               <md-icon slot="icon"><path d="${mdiArrowLeft}"></path></md-icon>
               Back
            </md-outlined-button>
            <h2 class="sd-title">${isEdit ? 'Edit Strain' : 'Add New Strain'}</h2>
         </div>
         <md-icon-button @click=${callbacks.onClose}>
            <md-icon><path d="${mdiClose}"></path></md-icon>
         </md-icon-button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <div class="editor-col">
               <div class="photo-upload-area"
                    @click=${(e: Event) => {
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
                      <md-icon style="width:14px;height:14px;"><path d="${mdiViewDashboard}"></path></md-icon>
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
                            <md-icon style="width:18px;height:18px;"><path d="${mdiContentCopy}"></path></md-icon>
                         </button>
                     </div>
                  ` : html`
                     <md-icon style="width:48px;height:48px;margin-bottom:16px;"><path d="${mdiUpload}"></path></md-icon>
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
                  <md-filled-text-field label="Strain Name *" .value=${s.strain} @input=${(e: any) => update('strain', e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
               <div class="sd-form-group">
                  <md-filled-text-field label="Phenotype" placeholder="e.g. #1 (Optional)" .value=${s.phenotype} @input=${(e: any) => update('phenotype', e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
               <div class="sd-form-group">
                  <md-filled-text-field label="Breeder/Seedbank" .value=${s.breeder} @input=${(e: any) => update('breeder', e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
            </div>

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
                              <md-icon><path d="${icon}"></path></md-icon>
                              <span class="type-label">${t}</span>
                           </div>
                        `;
         })}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Flowering Time (Days)</label>
                  <div style="display:flex; gap:16px;">
                     <md-filled-text-field type="number" label="Min" .value=${s.flowering_min} @input=${(e: any) => update('flowering_min', e.target.value)} style="flex:1;"></md-filled-text-field>
                     <md-filled-text-field type="number" label="Max" .value=${s.flowering_max} @input=${(e: any) => update('flowering_max', e.target.value)} style="flex:1;"></md-filled-text-field>
                  </div>
               </div>

               <div class="sd-form-group">
                  <md-filled-text-field label="Lineage" .value=${s.lineage} @input=${(e: any) => update('lineage', e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${['Feminized', 'Regular'].map(sex => html`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <md-radio name="sex_radio" .checked=${s.sex === sex} @change=${() => update('sex', sex)}></md-radio>
                           ${sex}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <md-filled-text-field type="textarea" label="Description" .value=${s.description} @input=${(e: any) => update('description', e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
            </div>
         </div>
      </div>

      <div class="sd-footer">
         <md-outlined-button @click=${() => callbacks.onSwitchView('browse')}>
            Cancel
         </md-outlined-button>
         <md-filled-button @click=${callbacks.onAddStrain}>
            <md-icon slot="icon"><path d="${mdiCheck}"></path></md-icon>
            Save Strain
         </md-filled-button>
      </div>
    `;
   }

   private static renderMD3TextInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
      return html`
      <div class="md3-input-group">
        <md-filled-text-field
          label="${label}"
          .value=${value}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
          style="width: 100%;"
        ></md-filled-text-field>
      </div>
    `;
   }

   private static renderMD3SelectInput(label: string, value: string, options: string[], onChange: (value: string) => void): TemplateResult {
      return html`
      <div class="md3-input-group">
        <md-filled-select
          label="${label}"
          .value=${value}
          @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}
          style="width: 100%;"
        >
          <md-select-option value=""></md-select-option>
          ${options.map(opt => html`<md-select-option value="${opt}" ?selected=${opt === value}><div slot="headline">${opt}</div></md-select-option>`)}
        </md-filled-select>
      </div>
    `;
   }

   private static renderMD3NumberInput(label: string, value: number, onChange: (value: string) => void): TemplateResult {
      return html`
      <div class="md3-input-group">
        <md-filled-text-field
          label="${label}"
          type="number"
          min="1"
          .value=${value.toString()}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
          style="width: 100%;"
        ></md-filled-text-field>
      </div>
    `;
   }

   private static renderMD3DateInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
      const formattedValue = PlantUtils.toDateTimeLocal(value);
      return html`
      <div class="md3-input-group">
        <md-filled-text-field
          label="${label}"
          type="datetime-local"
          .value=${formattedValue}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
          style="width: 100%;"
        ></md-filled-text-field>
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

   static renderConfigDialog(
      dialog: ConfigDialogState | null,
      growspaceOptions: Record<string, string>,
      callbacks: {
         onClose: () => void;
         onSwitchTab: (tab: 'add_growspace' | 'environment' | 'global') => void;
         onAddGrowspaceChange: (field: string, value: any) => void;
         onAddGrowspaceSubmit: () => void;
         onEnvChange: (field: string, value: any) => void;
         onEnvSubmit: () => void;
         onGlobalChange: (field: string, value: any) => void;
         onGlobalSubmit: () => void;
      }
   ): TemplateResult {
      if (!dialog?.open) return html``;

      const activeTab = dialog.currentTab;

      return html`
      <md-dialog
        open
        @closed=${callbacks.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="config-container">
           <div class="config-header">
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 12px;">
                 <md-icon><path d="${mdiCog}"></path></md-icon>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <md-icon-button @click=${callbacks.onClose}>
                 <md-icon><path d="${mdiClose}"></path></md-icon>
              </md-icon-button>
           </div>

           <div class="config-tabs">
              <div class="config-tab ${activeTab === 'add_growspace' ? 'active' : ''}"
                   @click=${() => callbacks.onSwitchTab('add_growspace')}>
                 <md-icon><path d="${mdiViewDashboard}"></path></md-icon>
                 Add Growspace
              </div>
              <div class="config-tab ${activeTab === 'environment' ? 'active' : ''}"
                   @click=${() => callbacks.onSwitchTab('environment')}>
                 <md-icon><path d="${mdiThermometer}"></path></md-icon>
                 Environment
              </div>
              <div class="config-tab ${activeTab === 'global' ? 'active' : ''}"
                   @click=${() => callbacks.onSwitchTab('global')}>
                 <md-icon><path d="${mdiEarth}"></path></md-icon>
                 Global
              </div>
           </div>

           <div class="config-content">
              ${activeTab === 'add_growspace' ? this.renderAddGrowspaceTab(dialog, callbacks) : nothing}
              ${activeTab === 'environment' ? this.renderEnvironmentTab(dialog, growspaceOptions, callbacks) : nothing}
              ${activeTab === 'global' ? this.renderGlobalTab(dialog, callbacks) : nothing}
           </div>

           <div class="config-actions">
              <md-outlined-button @click=${callbacks.onClose}>Cancel</md-outlined-button>
              ${activeTab === 'add_growspace' ? html`
                 <md-filled-button @click=${callbacks.onAddGrowspaceSubmit}>Add Growspace</md-filled-button>
              ` : nothing}
              ${activeTab === 'environment' ? html`
                 <md-filled-button @click=${callbacks.onEnvSubmit}>Save Sensors</md-filled-button>
              ` : nothing}
              ${activeTab === 'global' ? html`
                 <md-filled-button @click=${callbacks.onGlobalSubmit}>Save Global</md-filled-button>
              ` : nothing}
           </div>
        </div>
      </md-dialog>
    `;
   }

   private static renderAddGrowspaceTab(dialog: ConfigDialogState, callbacks: any): TemplateResult {
      const d = dialog.addGrowspaceData;
      return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>New Growspace Details</h3>
            ${this.renderMD3TextInput('Growspace Name', d.name, (v) => callbacks.onAddGrowspaceChange('name', v))}
            <div style="display:flex; gap:16px;">
               ${this.renderMD3NumberInput('Rows', d.rows, (v) => callbacks.onAddGrowspaceChange('rows', parseInt(v)))}
               ${this.renderMD3NumberInput('Plants per Row', d.plants_per_row, (v) => callbacks.onAddGrowspaceChange('plants_per_row', parseInt(v)))}
            </div>
            ${this.renderMD3TextInput('Notification Service (Optional)', d.notification_service, (v) => callbacks.onAddGrowspaceChange('notification_service', v))}
         </div>
      </div>
    `;
   }

   private static renderEnvironmentTab(dialog: ConfigDialogState, growspaces: Record<string, string>, callbacks: any): TemplateResult {
      const d = dialog.environmentData;
      const options = Object.entries(growspaces).map(([id, name]) => ({ id, name }));

      return html`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <md-filled-select label="Growspace" .value=${d.selectedGrowspaceId} @change=${(e: any) => callbacks.onEnvChange('selectedGrowspaceId', e.target.value)} style="width: 100%;">
                   <md-select-option value=""></md-select-option>
                   ${options.map(o => html`<md-select-option value="${o.id}"><div slot="headline">${o.name}</div></md-select-option>`)}
                </md-filled-select>
             </div>
          </div>

          <div class="detail-card">
             <h3>Sensors</h3>
             ${this.renderMD3TextInput('Temperature Sensor ID', d.temp_sensor, (v) => callbacks.onEnvChange('temp_sensor', v))}
             ${this.renderMD3TextInput('Humidity Sensor ID', d.humidity_sensor, (v) => callbacks.onEnvChange('humidity_sensor', v))}
             ${this.renderMD3TextInput('VPD Sensor ID', d.vpd_sensor, (v) => callbacks.onEnvChange('vpd_sensor', v))}
          </div>

          <div class="detail-card">
             <h3>Optional</h3>
             ${this.renderMD3TextInput('CO2 Sensor ID', d.co2_sensor, (v) => callbacks.onEnvChange('co2_sensor', v))}
             ${this.renderMD3TextInput('Light Sensor/State ID', d.light_sensor, (v) => callbacks.onEnvChange('light_sensor', v))}
             ${this.renderMD3TextInput('Fan Switch ID', d.fan_switch, (v) => callbacks.onEnvChange('fan_switch', v))}
          </div>
       </div>
    `;
   }

   private static renderGlobalTab(dialog: ConfigDialogState, callbacks: any): TemplateResult {
      const d = dialog.globalData;
      return html`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Global Environment</h3>
             ${this.renderMD3TextInput('Weather Entity ID', d.weather_entity, (v) => callbacks.onGlobalChange('weather_entity', v))}
          </div>
          <div class="detail-card">
             <h3>Lung Room</h3>
             ${this.renderMD3TextInput('Lung Room Temp Sensor', d.lung_room_temp, (v) => callbacks.onGlobalChange('lung_room_temp', v))}
             ${this.renderMD3TextInput('Lung Room Humidity Sensor', d.lung_room_humidity, (v) => callbacks.onGlobalChange('lung_room_humidity', v))}
          </div>
       </div>
    `;
   }

   static renderGrowMasterDialog(
      dialog: GrowMasterDialogState | null,
      isStressed: boolean,
      personality: string | undefined,
      callbacks: {
         onClose: () => void;
         onQueryChange: (query: string) => void;
         onAnalyze: () => void;
         onAnalyzeAll: () => void;
      }
   ): TemplateResult {
      if (!dialog?.open) return html``;

      const borderColor = isStressed ? '#FF9800' : '#4CAF50';
      const title = personality ? `Ask the ${personality}` : 'Ask the Grow Master';

      return html`
      <md-dialog
        open
        @closed=${callbacks.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: ${borderColor}">
                 <md-icon><path d="${mdiBrain}"></path></md-icon>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">${title}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${isStressed ? 'Warning: Plant Stress Detected' : 'All systems normal'}
                 </div>
              </div>
              <md-icon-button @click=${callbacks.onClose}>
                 <md-icon><path d="${mdiClose}"></path></md-icon>
              </md-icon-button>
           </div>

           <div class="gm-content">
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Question</label>
                 <md-filled-text-field
                    type="textarea"
                    placeholder="Ask about this growspace..."
                    .value=${dialog.userQuery}
                    @input=${(e: any) => callbacks.onQueryChange(e.target.value)}
                    style="width: 100%;"
                 ></md-filled-text-field>
              </div>

              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <md-outlined-button
                    @click=${callbacks.onAnalyzeAll}
                    ?disabled=${dialog.isLoading}
                    style="opacity: ${dialog.isLoading ? 0.7 : 1}"
                 >
                    Analyze All
                 </md-outlined-button>
                 <md-filled-button
                    @click=${callbacks.onAnalyze}
                    ?disabled=${dialog.isLoading}
                    style="opacity: ${dialog.isLoading ? 0.7 : 1}"
                 >
                    ${dialog.isLoading ? 'Analyzing...' : 'Analyze Environment'}
                 </md-filled-button>
              </div>

              ${dialog.isLoading ? html`
                 <div class="gm-loading">
                    <md-icon class="spinner"><path d="${mdiLoading}"></path></md-icon>
                    <span>Consulting the archives...</span>
                 </div>
              ` : nothing}

              ${!dialog.isLoading && dialog.response ? html`
                 <div class="gm-response-box">
                    ${DialogRenderer.formatResponse(dialog.response)}
                 </div>
              ` : nothing}
           </div>
        </div>
      </md-dialog>
    `;
   }

   static renderStrainRecommendationDialog(
      dialog: StrainRecommendationDialogState | null,
      callbacks: {
         onClose: () => void;
         onQueryChange: (query: string) => void;
         onGetRecommendation: () => void;
      }
   ): TemplateResult {
      if (!dialog?.open) return html``;

      return html`
      <md-dialog
        open
        @closed=${callbacks.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: #4CAF50">
                 <md-icon><path d="${mdiBrain}"></path></md-icon>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">Get Strain Recommendation</h2>
              </div>
              <md-icon-button @click=${callbacks.onClose}>
                 <md-icon><path d="${mdiClose}"></path></md-icon>
              </md-icon-button>
           </div>

           <div class="gm-content">
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Preferences</label>
                 <md-filled-text-field
                    type="textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${dialog.userQuery}
                    @input=${(e: any) => callbacks.onQueryChange(e.target.value)}
                    style="width: 100%;"
                 ></md-filled-text-field>
              </div>

              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <md-outlined-button @click=${callbacks.onClose}>OK</md-outlined-button>
                 <md-filled-button
                    @click=${callbacks.onGetRecommendation}
                    ?disabled=${dialog.isLoading}
                    style="opacity: ${dialog.isLoading ? 0.7 : 1}"
                 >
                    ${dialog.isLoading ? 'Getting Recommendation...' : 'Get Recommendation'}
                 </md-filled-button>
              </div>

              ${dialog.isLoading ? html`
                 <div class="gm-loading">
                    <md-icon class="spinner"><path d="${mdiLoading}"></path></md-icon>
                    <span>Consulting the archives...</span>
                 </div>
              ` : nothing}

              ${!dialog.isLoading && dialog.response ? html`
                 <div class="gm-response-box">
                    ${DialogRenderer.formatResponse(dialog.response)}
                 </div>
              ` : nothing}
           </div>
        </div>
      </md-dialog>
    `;
   }
}
