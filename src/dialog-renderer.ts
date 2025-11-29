import { html, TemplateResult, nothing } from 'lit';
import {
   mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer,
   mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck,
   mdiContentCopy, mdiArrowRight, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant,
   mdiLeaf, mdiUpload, mdiArrowLeft, mdiFilterVariant, mdiCloudUpload, mdiPencil,
   mdiCog, mdiThermometer, mdiEarth, mdiViewDashboard, mdiFan, mdiWeatherPartlyCloudy, mdiBrain, mdiLoading, mdiDownload, mdiWater,
   mdiCamera, mdiImage
} from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, ConfigDialogState, GrowMasterDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry, CropMeta, StrainRecommendationDialogState, IrrigationDialogState, IrrigationTime } from './types';
import { PlantUtils } from "./utils";

export class DialogRenderer {

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
                ${timelineContent}
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
   private static parseScheduleString(scheduleString: string | IrrigationTime[]): IrrigationTime[] {
      if (typeof scheduleString !== 'string') {
         // If it's already an array (e.g., from a newly added event in the current session), return it.
         return scheduleString;
      }

      if (!scheduleString || scheduleString === '[]') {
         return [];
      }

      try {
         // FIX/DEFENSE: Replace single quotes with double quotes.
         const jsonString = scheduleString.replace(/'/g, '"');

         const parsed = JSON.parse(jsonString);

         if (Array.isArray(parsed)) {
            return parsed as IrrigationTime[];
         }
         return [];
      } catch (e) {
         // Log the error for debugging and return an empty array to prevent UI breakage.
         console.error("Failed to parse irrigation schedule string:", scheduleString, e);
         return [];
      }
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







   static getImgStyle(meta?: CropMeta): string {
      if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
      return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
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

   private static renderMD3DateTimeInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
      const formattedValue = PlantUtils.toDateTimeLocal(value);
      return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${formattedValue}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
          @click=${(e: Event) => (e.target as HTMLInputElement).showPicker()}
        />
      </div>
    `;
   }

   private static renderMD3DateInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
      // For date input, we need YYYY-MM-DD
      const formattedValue = value ? value.split('T')[0] : '';
      return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <input
          type="date"
          class="md3-input"
          .value=${formattedValue}
          @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
          @click=${(e: Event) => (e.target as HTMLInputElement).showPicker()}
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

   static renderConfigDialog(
      dialog: ConfigDialogState | null,
      growspaceOptions: Record<string, string>,
      callbacks: {
         onClose: () => void;
         onSwitchTab: (tab: 'add_growspace' | 'environment' | 'global') => void;
         // Add Growspace
         onAddGrowspaceChange: (field: string, value: any) => void;
         onAddGrowspaceSubmit: () => void;
         // Environment
         onEnvChange: (field: string, value: any) => void;
         onEnvSubmit: () => void;
         // Global
         onGlobalChange: (field: string, value: any) => void;
         onGlobalSubmit: () => void;
      }
   ): TemplateResult {
      if (!dialog?.open) return html``;

      const activeTab = dialog.currentTab;

      return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <style>
          /* CONFIG DIALOG SPECIFIC STYLES */
          .config-container {
             background-color: #1a1a1a;
             color: #fff;
             display: flex;
             flex-direction: column;
             height: 80vh;
             width: 500px;
             max-width: 90vw;
             border-radius: 24px;
             overflow: hidden;
             font-family: 'Roboto', sans-serif;
             --accent-color: #22c55e;
          }
          .config-header {
             padding: 20px 24px;
             background: #2d2d2d;
             display: flex;
             align-items: center;
             gap: 16px;
             border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .config-title {
             margin: 0;
             font-size: 1.25rem;
             font-weight: 600;
          }
          .config-tabs {
             display: flex;
             background: #2d2d2d;
             padding: 0 16px;
             border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .config-tab {
             flex: 1;
             padding: 16px 8px;
             text-align: center;
             cursor: pointer;
             color: var(--secondary-text-color);
             border-bottom: 3px solid transparent;
             transition: all 0.2s;
             display: flex;
             flex-direction: column;
             align-items: center;
             gap: 4px;
             font-size: 0.8rem;
             font-weight: 500;
          }
          .config-tab svg {
             width: 24px;
             height: 24px;
             margin-bottom: 4px;
          }
          .config-tab:hover {
             color: #fff;
             background: rgba(255,255,255,0.05);
          }
          .config-tab.active {
             color: var(--accent-color);
             border-bottom-color: var(--accent-color);
          }
          .config-content {
             flex: 1;
             padding: 24px;
             overflow-y: auto;
          }
          .config-actions {
             padding: 16px 24px;
             border-top: 1px solid rgba(255,255,255,0.1);
             display: flex;
             justify-content: flex-end;
             gap: 12px;
             background: #2d2d2d;
          }
        </style>

        <div class="config-container">
           <!-- Header -->
           <div class="config-header">
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 12px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <button class="md3-button text" @click=${callbacks.onClose} style="min-width: auto; padding: 8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <!-- Tabs -->
           <div class="config-tabs">
              <div class="config-tab ${activeTab === 'add_growspace' ? 'active' : ''}"
                   @click=${() => callbacks.onSwitchTab('add_growspace')}>
                 <svg viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
                 Add Growspace
              </div>
              <div class="config-tab ${activeTab === 'environment' ? 'active' : ''}"
                   @click=${() => callbacks.onSwitchTab('environment')}>
                 <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
                 Environment
              </div>
              <div class="config-tab ${activeTab === 'global' ? 'active' : ''}"
                   @click=${() => callbacks.onSwitchTab('global')}>
                 <svg viewBox="0 0 24 24"><path d="${mdiEarth}"></path></svg>
                 Global
              </div>
           </div>

           <!-- Content -->
           <div class="config-content">
              ${activeTab === 'add_growspace' ? this.renderAddGrowspaceTab(dialog, callbacks) : nothing}
              ${activeTab === 'environment' ? this.renderEnvironmentTab(dialog, growspaceOptions, callbacks) : nothing}
              ${activeTab === 'global' ? this.renderGlobalTab(dialog, callbacks) : nothing}
           </div>

           <!-- Actions -->
           <div class="config-actions">
              <button class="md3-button tonal" @click=${callbacks.onClose}>Cancel</button>
              ${activeTab === 'add_growspace' ? html`
                 <button class="md3-button primary" @click=${callbacks.onAddGrowspaceSubmit}>Add Growspace</button>
              ` : nothing}
              ${activeTab === 'environment' ? html`
                 <button class="md3-button primary" @click=${callbacks.onEnvSubmit}>Save Sensors</button>
              ` : nothing}
              ${activeTab === 'global' ? html`
                 <button class="md3-button primary" @click=${callbacks.onGlobalSubmit}>Save Global</button>
              ` : nothing}
           </div>
        </div>
      </ha-dialog>
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
      // Convert record to array for select
      const options = Object.entries(growspaces).map(([id, name]) => ({ id, name }));

      return html`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <label class="md3-label">Growspace</label>
                <select class="md3-input" .value=${d.selectedGrowspaceId} @change=${(e: any) => callbacks.onEnvChange('selectedGrowspaceId', e.target.value)}>
                   <option value="">Select...</option>
                   ${options.map(o => html`<option value="${o.id}">${o.name}</option>`)}
                </select>
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

      // Border color based on stress
      // Light Green: #4CAF50, Warning Orange: #FF9800
      const borderColor = isStressed ? '#FF9800' : '#4CAF50';
      const title = personality ? `Ask the ${personality}` : 'Ask the Grow Master';

      return html`
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <style>
           .gm-container {
              background: #1a1a1a;
              color: #fff;
              width: 500px;
              max-width: 90vw;
              border-radius: 24px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              font-family: 'Roboto', sans-serif;
              border: 1px solid rgba(255,255,255,0.1);
           }
           .gm-header {
              background: #2d2d2d;
              padding: 20px 24px;
              display: flex;
              align-items: center;
              gap: 16px;
              border-bottom: 1px solid rgba(255,255,255,0.1);
           }
           .gm-content {
              padding: 24px;
              display: flex;
              flex-direction: column;
              gap: 20px;
              overflow-y: auto;
              max-height: 70vh;
           }
           .gm-response-box {
              background: rgba(255,255,255,0.05);
              border: 2px solid ${borderColor};
              border-radius: 16px;
              padding: 20px;
              line-height: 1.6;
              font-size: 0.95rem;
              white-space: pre-wrap;
              position: relative;
           }
           .gm-loading {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 40px;
              color: var(--secondary-text-color);
              gap: 12px;
           }
           @keyframes spin { 100% { transform: rotate(360deg); } }
           .spinner {
              animation: spin 1s linear infinite;
              width: 24px;
              height: 24px;
           }
        </style>

        <div class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: ${borderColor}">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">${title}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${isStressed ? 'Warning: Plant Stress Detected' : 'All systems normal'}
                 </div>
              </div>
              <button class="md3-button text" @click=${callbacks.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Question</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="Ask about this growspace..."
                    .value=${dialog.userQuery}
                    @input=${(e: any) => callbacks.onQueryChange(e.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${callbacks.onAnalyzeAll}
                    ?disabled=${dialog.isLoading}
                    style="opacity: ${dialog.isLoading ? 0.7 : 1}"
                 >
                    Analyze All
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${callbacks.onAnalyze}
                    ?disabled=${dialog.isLoading}
                    style="opacity: ${dialog.isLoading ? 0.7 : 1}"
                 >
                    ${dialog.isLoading ? 'Analyzing...' : 'Analyze Environment'}
                 </button>
              </div>

              <!-- Response Area -->
              ${dialog.isLoading ? html`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${mdiLoading}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              ` : nothing}

              ${!dialog.isLoading && dialog.response ? html`
                 <div class="gm-response-box">
                    ${dialog.response}
                 </div>
              ` : nothing}
           </div>
        </div>
      </ha-dialog>
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
      <ha-dialog
        open
        @closed=${callbacks.onClose}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: #4CAF50">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">Get Strain Recommendation</h2>
              </div>
              <button class="md3-button text" @click=${callbacks.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Preferences</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${dialog.userQuery}
                    @input=${(e: any) => callbacks.onQueryChange(e.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${callbacks.onClose}
                 >
                    OK
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${callbacks.onGetRecommendation}
                    ?disabled=${dialog.isLoading}
                    style="opacity: ${dialog.isLoading ? 0.7 : 1}"
                 >
                    ${dialog.isLoading ? 'Getting Recommendation...' : 'Get Recommendation'}
                 </button>
              </div>

              ${dialog.isLoading ? html`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${mdiLoading}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              ` : nothing}

              ${!dialog.isLoading && dialog.response ? html`
                 <div class="gm-response-box">
                    ${dialog.response}
                 </div>
              ` : nothing}
           </div>
        </div>
      </ha-dialog>
    `;
   }

   private static renderScheduleSection(
      title: string,
      times: IrrigationTime[],
      defaultDuration: number,
      dialog: IrrigationDialogState,
      callbacks: any,
      type: 'irrigation' | 'drain',
      color: string
   ): TemplateResult {
      const addHandler = type === 'irrigation' ? callbacks.onAddIrrigationTime : callbacks.onAddDrainTime;
      const removeHandler = type === 'irrigation' ? callbacks.onRemoveIrrigationTime : callbacks.onRemoveDrainTime;
      const startAddingHandler = type === 'irrigation' ? callbacks.onStartAddingIrrigationTime : callbacks.onStartAddingDrainTime;
      const cancelHandler = type === 'irrigation' ? callbacks.onCancelAddingIrrigationTime : callbacks.onCancelAddingDrainTime;
      const confirmHandler = type === 'irrigation' ? callbacks.onConfirmAddIrrigationTime : callbacks.onConfirmAddDrainTime;
      const inputChangeHandler = type === 'irrigation' ? callbacks.onIrrigationTimeInputChange : callbacks.onDrainTimeInputChange;
      const addingTime = type === 'irrigation' ? dialog.adding_irrigation_time : dialog.adding_drain_time;

      return html`
         <div class="detail-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
               <h3 style="margin: 0;">${title}</h3>
               <button
                  @click=${addHandler}
                  class="md3-button primary"
                  style="background: ${color};"
               >
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiPlus}"></path></svg>
                  ADD TIME
               </button>
            </div>

            <div
               class="${type}-time-bar"
               @click=${(e: MouseEvent) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            startAddingHandler(x, rect.width);
         }}
               style="position: relative; height: 80px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: crosshair; border: 2px solid ${color}40;"
            >
               ${Array.from({ length: 25 }, (_, i) => i).map(hour => html`
                  <div style="position: absolute; left: ${(hour / 24) * 100}%; top: 0; bottom: 0; border-left: 1px solid ${hour % 6 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}; pointer-events: none;">
                     ${hour % 3 === 0 ? html`
                        <span style="position: absolute; bottom: -22px; left: -12px; font-size: 0.7rem; color: var(--secondary-text-color);">${hour.toString().padStart(2, '0')}:00</span>
                     ` : ''}
                  </div>
               `)}

               ${times.map((t: IrrigationTime) => {
            const [hours, minutes] = t.time.split(':').map(Number);
            const position = ((hours + minutes / 60) / 24) * 100;
            return html`
                     <div
                        @click=${(e: Event) => {
                  e.stopPropagation();
                  if (confirm(`Remove ${type} time ${t.time}?`)) {
                     removeHandler(t.time);
                  }
               }}
                        style="position: absolute; left: ${position}%; top: 10%; bottom: 10%; width: 4px; background: ${color}; cursor: pointer; box-shadow: 0 0 8px ${color}; border-radius: 2px;"
                        title="${t.time} | Duration: ${t.duration || defaultDuration}seconds"
                     >
                        <div style="position: absolute; left: 8px; top: -24px; background: ${color}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                           ${t.time} | ${t.duration || defaultDuration}seconds
                        </div>
                     </div>
                  `;
         })}
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--secondary-text-color);">
               <span>00:00</span>
               <span>06:00</span>
               <span>12:00</span>
               <span>18:00</span>
               <span>24:00</span>
            </div>

            ${addingTime ? html`
               <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;" @click=${cancelHandler}>
                  <div class="detail-card" style="max-width: 400px; margin: 0;" @click=${(e: Event) => e.stopPropagation()}>
                     <h3>Add ${title} Time</h3>

                     <div class="md3-input-group">
                        <label class="md3-label">Time</label>
                        <input
                           type="time"
                           class="md3-input"
                           .value=${addingTime.time}
                           @input=${(e: Event) => inputChangeHandler('time', (e.target as HTMLInputElement).value)}
                        />
                     </div>

                     <div class="md3-input-group">
                        <label class="md3-label">Duration (minutes)</label>
                        <input
                           type="number"
                           class="md3-input"
                           .value=${addingTime.duration.toString()}
                           @input=${(e: Event) => {
               const val = parseInt((e.target as HTMLInputElement).value);
               if (!isNaN(val)) inputChangeHandler('duration', val);
            }}
                           min="1"
                        />
                     </div>

                     <div class="button-group">
                        <button class="md3-button tonal" @click=${cancelHandler}>
                           Cancel
                        </button>
                        <button
                           class="md3-button primary"
                           @click=${() => confirmHandler(addingTime.time, addingTime.duration)}
                           style="background: ${color};"
                        >
                           Add Schedule
                        </button>
                     </div>
                  </div>
               </div>
            ` : ''}
         </div>
      `;
   }

   static renderIrrigationDialog(
      dialog: IrrigationDialogState | null,
      callbacks: {
         onClose: () => void;
         onIrrigationPumpChange: (value: string) => void;
         onIrrigationDurationChange: (value: number) => void;
         onDrainPumpChange: (value: string) => void;
         onDrainDurationChange: (value: number) => void;
         onSavePumpSettings: () => void;
         onAddIrrigationTime: (e: Event) => void;
         onStartAddingIrrigationTime: (x: number, width: number) => void;
         onRemoveIrrigationTime: (time: string) => void;
         onAddDrainTime: (e: Event) => void;
         onStartAddingDrainTime: (x: number, width: number) => void;
         onRemoveDrainTime: (time: string) => void;
         onCancelAddingIrrigationTime: () => void;
         onCancelAddingDrainTime: () => void;
         onConfirmAddIrrigationTime: (time: string, duration: number) => void;
         onConfirmAddDrainTime: (time: string, duration: number) => void;
         onIrrigationTimeInputChange: (field: 'time' | 'duration', value: string | number) => void;
         onDrainTimeInputChange: (field: 'time' | 'duration', value: string | number) => void;
      }
   ): TemplateResult | typeof nothing {
      if (!dialog?.open) return nothing;

      const dialogColor = '#2196F3'; // Irrigation Blue

      const parsedIrrigationTimes = DialogRenderer.parseScheduleString(dialog.irrigation_times);
      const parsedDrainTimes = DialogRenderer.parseScheduleString(dialog.drain_times);

      return html`
         <ha-dialog
            open
            @closed=${callbacks.onClose}
            hideActions
            .scrimClickAction=${''}
            .escapeKeyAction=${''}
         >
            <div class="glass-dialog-container" style="--stage-color: ${dialogColor}; max-width: 1000px; max-height: 90vh; overflow-y: auto;">

               <div class="dialog-header">
                  <div class="dialog-icon" style="background: ${dialogColor}30; color: ${dialogColor};">
                     <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${mdiWater}"></path>
                     </svg>
                  </div>
                  <div class="dialog-title-group">
                     <h2 class="dialog-title">Irrigation Management</h2>
                     <div class="dialog-subtitle">${dialog.growspace_name}</div>
                  </div>
                  <button class="md3-button text" @click=${callbacks.onClose} style="min-width: auto; padding: 8px;">
                     <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${mdiClose}"></path>
                     </svg>
                  </button>
               </div>

               <div class="dialog-body" style="padding: 0; background: transparent;">
                  ${this.renderScheduleSection(
         'Irrigation Schedule',
         parsedIrrigationTimes,
         dialog.irrigation_duration,
         dialog,
         callbacks,
         'irrigation',
         dialogColor
      )}

                           ${this.renderScheduleSection(
         'Drain Schedule',
         parsedDrainTimes,
         dialog.drain_duration,
         dialog,
         callbacks,
         'drain',
         '#FF9800'
      )}

               </div>

               <div class="button-group">
                  <button class="md3-button tonal" @click=${callbacks.onClose}>
                     Close
                  </button>
               </div>

            </div>
         </ha-dialog>
      `;
   }
}
