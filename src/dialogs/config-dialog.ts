
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiClose, mdiCog, mdiViewDashboard, mdiThermometer } from '@mdi/js';
import { DialogRenderer } from '../dialog-renderer';

@customElement('config-dialog')
export class ConfigDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  // Growspace options for the environment tab select
  @property({ type: Object }) growspaceOptions: Record<string, string> = {};

  @state() private currentTab: 'add_growspace' | 'environment' = 'environment';

  // Add Growspace Data
  @state() private add_name = '';
  @state() private add_rows = 4;
  @state() private add_plants_per_row = 4;
  @state() private add_notification_service = 'mobile_app_notify';

  // Environment Data
  @state() private env_selectedGrowspaceId = '';
  @state() private env_temp_sensor = '';
  @state() private env_humidity_sensor = '';
  @state() private env_vpd_sensor = '';
  @state() private env_co2_sensor = '';
  @state() private env_circulation_fan = '';
  @state() private env_stress_threshold = 0.8;
  @state() private env_mold_threshold = 0.8;

  static styles = css`
    :host {
      display: block;
    }
    
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
    @media (max-width: 600px) {
      .config-container {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        max-width: none; /* override max-width */
      }
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
      fill: currentColor;
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
      flex-wrap: wrap;
    }

    @media (max-width: 450px) {
      .config-actions {
        justify-content: center;
      }
      .md3-button {
        flex: 1 1 auto;
        min-width: 100px;
      }
    }
    
    .detail-card {
      background: rgba(30,30,30,0.5);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.05);
      overflow: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }
    .detail-card h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #6b7280;
      margin: 0 0 16px 0;
      font-weight: 600;
    }
    
    .md3-button {
      background: none;
      border: none;
      padding: 0 24px;
      height: 40px;
      border-radius: 20px;
      font-family: 'Roboto', sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .md3-button.text { color: #e0e0e0; }
    .md3-button.text:hover { background: rgba(255,255,255,0.05); }
    .md3-button.tonal { background: rgba(255,255,255,0.1); color: #e0e0e0; }
    .md3-button.tonal:hover { background: rgba(255,255,255,0.15); }
    .md3-button.primary { background: #4CAF50; color: #003300; }
    .md3-button.primary:hover { filter: brightness(1.1); }

    .md3-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .md3-label {
      font-size: 12px;
      font-weight: 500;
      color: #9ca3af;
      margin-left: 12px;
    }
    .md3-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px 16px;
      color: #e5e7eb;
      font-family: inherit;
      font-size: 14px;
      transition: all 0.2s;
    }
    .md3-input:focus {
      outline: none;
      border-color: #4CAF50;
      background: rgba(255, 255, 255, 0.08);
    }
    
    .flex-row-wrap {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .flex-row-wrap > * {
      flex: 1;
      min-width: 0;
    }
  `;

  // Provide initial state setting from parent
  public setInitialState(
    currentTab: 'add_growspace' | 'environment' = 'environment',
    environmentData?: {
      selectedGrowspaceId: string;
      temp_sensor: string;
      humidity_sensor: string;
      vpd_sensor: string;
      co2_sensor: string;
      circulation_fan: string;
      stress_threshold: number;
      mold_threshold: number;
    }
  ) {
    this.currentTab = currentTab;
    if (environmentData) {
      this.env_selectedGrowspaceId = environmentData.selectedGrowspaceId;
      this.env_temp_sensor = environmentData.temp_sensor;
      this.env_humidity_sensor = environmentData.humidity_sensor;
      this.env_vpd_sensor = environmentData.vpd_sensor;
      this.env_co2_sensor = environmentData.co2_sensor;
      this.env_circulation_fan = environmentData.circulation_fan;
      this.env_stress_threshold = environmentData.stress_threshold;
      this.env_mold_threshold = environmentData.mold_threshold;
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _switchTab(tab: 'add_growspace' | 'environment') {
    this.currentTab = tab;
  }

  // --- Submission Handlers ---

  private _submitAddGrowspace() {
    this.dispatchEvent(new CustomEvent('add-growspace-submit', {
      detail: {
        name: this.add_name,
        rows: this.add_rows,
        plants_per_row: this.add_plants_per_row,
        notification_service: this.add_notification_service
      },
      bubbles: true,
      composed: true
    }));
  }

  private _submitEnvironment() {
    this.dispatchEvent(new CustomEvent('configure-environment-submit', {
      detail: {
        selectedGrowspaceId: this.env_selectedGrowspaceId,
        temp_sensor: this.env_temp_sensor,
        humidity_sensor: this.env_humidity_sensor,
        vpd_sensor: this.env_vpd_sensor,
        co2_sensor: this.env_co2_sensor,
        circulation_fan: this.env_circulation_fan,
        stress_threshold: this.env_stress_threshold,
        mold_threshold: this.env_mold_threshold
      },
      bubbles: true,
      composed: true
    }));
  }


  render() {
    if (!this.open) return html``;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .scrimClickAction=${''}
        .escapeKeyAction=${''}
      >
        <div class="config-container">
           <!-- Header -->
           <div class="config-header">
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 12px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <button class="md3-button text" @click=${this._close} style="min-width: auto; padding: 8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiClose}"></path></svg>
              </button>
           </div>

           <!-- Tabs -->
           <div class="config-tabs">
              <div class="config-tab ${this.currentTab === 'add_growspace' ? 'active' : ''}"
                   @click=${() => this._switchTab('add_growspace')}>
                 <svg viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
                 Add Growspace
              </div>
               <div class="config-tab ${this.currentTab === 'environment' ? 'active' : ''}"
                    @click=${() => this._switchTab('environment')}>
                  <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
                  Environment
               </div>
            </div>

           <!-- Content -->
            <div class="config-content">
               ${this.currentTab === 'add_growspace' ? this.renderAddGrowspaceTab() : nothing}
               ${this.currentTab === 'environment' ? this.renderEnvironmentTab() : nothing}
            </div>

           <!-- Actions -->
           <div class="config-actions">
              <button class="md3-button tonal" @click=${this._close}>Cancel</button>
              ${this.currentTab === 'add_growspace' ? html`
                 <button class="md3-button primary" @click=${this._submitAddGrowspace}>Add Growspace</button>
              ` : nothing}
               ${this.currentTab === 'environment' ? html`
                  <button class="md3-button primary" @click=${this._submitEnvironment}>Save Sensors</button>
               ` : nothing}
            </div>
        </div>
      </ha-dialog>
    `;
  }

  private renderAddGrowspaceTab() {
    return html`
     <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
           <h3>New Growspace Details</h3>
           ${DialogRenderer.renderMD3TextInput('Growspace Name', this.add_name, (v) => this.add_name = v)}
           <div class="flex-row-wrap">
              ${DialogRenderer.renderMD3NumberInput('Rows', this.add_rows, (v) => this.add_rows = parseInt(v))}
              ${DialogRenderer.renderMD3NumberInput('Plants per Row', this.add_plants_per_row, (v) => this.add_plants_per_row = parseInt(v))}
           </div>
           ${DialogRenderer.renderMD3TextInput('Notification Service (Optional)', this.add_notification_service, (v) => this.add_notification_service = v)}
        </div>
     </div>
   `;
  }

  private renderEnvironmentTab() {
    const options = Object.entries(this.growspaceOptions).map(([id, name]) => ({ id, name }));

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>Select Target</h3>
            <div class="md3-input-group">
               <label class="md3-label">Growspace</label>
               <select class="md3-input" .value=${this.env_selectedGrowspaceId} @change=${(e: any) => this.env_selectedGrowspaceId = e.target.value}>
                  <option value="">Select...</option>
                  ${options.map(o => html`<option value="${o.id}">${o.name}</option>`)}
               </select>
            </div>
         </div>

         <div class="detail-card">
            <h3>Sensors</h3>
            ${DialogRenderer.renderMD3TextInput('Temperature Sensor ID', this.env_temp_sensor, (v) => this.env_temp_sensor = v)}
            ${DialogRenderer.renderMD3TextInput('Humidity Sensor ID', this.env_humidity_sensor, (v) => this.env_humidity_sensor = v)}
            ${DialogRenderer.renderMD3TextInput('VPD Sensor ID', this.env_vpd_sensor, (v) => this.env_vpd_sensor = v)}
         </div>

         <div class="detail-card">
            <h3>Optional</h3>
            ${DialogRenderer.renderMD3TextInput('CO2 Sensor ID', this.env_co2_sensor, (v) => this.env_co2_sensor = v)}
            ${DialogRenderer.renderMD3TextInput('Circulation Fan ID', this.env_circulation_fan, (v) => this.env_circulation_fan = v)}
         </div>

         <div class="detail-card">
            <h3>Thresholds</h3>
            ${DialogRenderer.renderMD3NumberInput('Stress Threshold (0.0-1.0)', this.env_stress_threshold, (v) => this.env_stress_threshold = parseFloat(v))}
            ${DialogRenderer.renderMD3NumberInput('Mold Threshold (0.0-1.0)', this.env_mold_threshold, (v) => this.env_mold_threshold = parseFloat(v))}
         </div>
      </div>
   `;
  }
}
