import { html, TemplateResult, nothing } from 'lit';
import {
   mdiPlus, mdiSprout, mdiFlower, mdiClose, mdiCalendarClock, mdiDna, mdiHairDryer,
   mdiCannabis, mdiMagnify, mdiChevronDown, mdiChevronRight, mdiDelete, mdiCheck,
   mdiContentCopy, mdiArrowRight, mdiWeatherNight, mdiWeatherSunny, mdiTuneVariant,
   mdiLeaf, mdiUpload, mdiArrowLeft, mdiFilterVariant, mdiCloudUpload, mdiPencil,
   mdiCog, mdiThermometer, mdiEarth, mdiViewDashboard, mdiFan, mdiWeatherPartlyCloudy, mdiBrain, mdiLoading, mdiDownload, mdiWater,
   mdiCamera, mdiImage
} from '@mdi/js';
import { AddPlantDialogState, PlantEntity, PlantOverviewDialogState, StrainLibraryDialogState, ConfigDialogState, GrowMasterDialogState, PlantStage, stageInputs, PlantAttributeValue, PlantOverviewEditedAttributes, StrainEntry, CropMeta, StrainRecommendationDialogState, IrrigationTime } from './types';
import { PlantUtils } from "./utils";

export class DialogRenderer {


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








   static getImgStyle(meta?: CropMeta): string {
      if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
      return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
   }


   public static renderMD3TextInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
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

   public static renderMD3SelectInput(label: string, value: string, options: string[], onChange: (value: string) => void): TemplateResult {
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

   public static renderMD3NumberInput(label: string, value: number, onChange: (value: string) => void): TemplateResult {
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

   public static renderMD3DateTimeInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
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

   public static renderMD3DateInput(label: string, value: string, onChange: (value: string) => void): TemplateResult {
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

   // Public helper for plant stats
   public static renderPlantStatsMD3(plant: any): TemplateResult {
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
      return this.renderPlantStatsMD3(plant);
   }





   static renderStrainRecommendationDialog(
      dialog: StrainRecommendationDialogState | null,
      callbacks: {
         onClose: () => void;
         onQueryChange: (query: string) => void;
         onGetRecommendation: () => void;
      }
   ): TemplateResult {
      if (!dialog) return html``;


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

}
