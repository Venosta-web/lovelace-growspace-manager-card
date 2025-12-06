
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
    .glass-dialog-container {
      background: rgba(20, 20, 20, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      color: #fff;
      font-family: 'Roboto', sans-serif;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      width: 500px;
      max-width: 90vw;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }
    .dialog-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      color: var(--primary-color, #4CAF50);
    }
    .dialog-title-group {
      flex: 1;
    }
    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
    }
    .dialog-subtitle {
      font-size: 0.85rem;
      opacity: 0.7;
      margin-top: 2px;
    }
    
    /* Config Tabs Specific */
    .config-tabs {
      display: flex;
      padding: 0 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      background: transparent;
    }
    .config-tab {
      flex: 1;
      padding: 16px 8px;
      text-align: center;
      cursor: pointer;
      color: rgba(255,255,255,0.5);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      background: transparent;
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
      border-radius: 8px 8px 0 0;
    }
    .config-tab.active {
      color: var(--primary-color, #4CAF50);
      border-bottom-color: var(--primary-color, #4CAF50);
    }
    .config-content {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      overflow: hidden;
      max-width: 100%;
      box-sizing: border-box;
    }
    .detail-card h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 1rem;
      font-weight: 500;
      opacity: 0.9;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }
    .button-group {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    @media (max-width: 450px) {
      .glass-dialog-container {
        width: 100vw;
        max-width: 100%;
        height: 100vh;
        border-radius: 0;
      }
      .config-content {
        padding: 16px;
      }
      .dialog-header {
         padding: 12px 16px;
      }
      .button-group {
        justify-content: center;
      }
      .md3-button {
        flex: 1 1 auto;
        min-width: 100px;
      }
    }

    .md3-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      height: 40px;
      border-radius: 20px;
      border: none;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .md3-button.text {
      background: transparent;
      color: rgba(255, 255, 255, 0.7);
      padding: 0 12px;
    }
    .md3-button.text:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .md3-button.tonal {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .md3-button.tonal:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .md3-button.primary {
      background: var(--primary-color, #4CAF50);
      color: #fff;
    }
    .md3-button.primary:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }
    
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
    
    .row-col-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .row-col-grid > * {
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
        <div class="glass-dialog-container">
           <!-- Header -->
           <div class="dialog-header">
              <div class="dialog-icon">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
              </div>
              <div class="dialog-title-group">
                 <h2 class="dialog-title">Configuration</h2>
                 <div class="dialog-subtitle">Manage growspaces & settings</div>
              </div>
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
           <div class="button-group">
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
            <div class="row-col-grid">
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
