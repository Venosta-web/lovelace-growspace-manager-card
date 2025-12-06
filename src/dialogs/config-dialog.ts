import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiClose, mdiCog, mdiViewDashboard, mdiThermometer } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';


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

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
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
      }
    `
  ];

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
            <md3-text-input
              label="Growspace Name"
              .value=${this.add_name}
              @change=${(e: CustomEvent) => this.add_name = e.detail}
            ></md3-text-input>
            <div class="row-col-grid">
               <md3-number-input
                 label="Rows"
                 .value=${this.add_rows}
                 @change=${(e: CustomEvent) => this.add_rows = parseInt(e.detail)}
               ></md3-number-input>
               <md3-number-input
                 label="Plants per Row"
                 .value=${this.add_plants_per_row}
                 @change=${(e: CustomEvent) => this.add_plants_per_row = parseInt(e.detail)}
               ></md3-number-input>
            </div>
            <md3-text-input
              label="Notification Service (Optional)"
              .value=${this.add_notification_service}
              @change=${(e: CustomEvent) => this.add_notification_service = e.detail}
            ></md3-text-input>
         </div>
      </div>
   `;
  }

  private renderEnvironmentTab() {
    const options = Object.entries(this.growspaceOptions).map(([id, name]) => id); // Md3Select expects plain strings for now, or I need to update it?
    // Wait, md3-select expects string[]. So I need to adapt or update md3-select to support objects/keys.
    // The current md3-select component (step 326) takes options: string[]. It uses <option value="opt">opt</option>. So label=value.
    // That's a limitation. I should have made it support {label, value}.
    // For now, I'll update Md3Select or workaround?
    // The previous implementation utilized IDs vs Names.
    // I should probably update Md3Select to support objects, or just pass IDs but that's ugly.
    // I'll stick to the plan: use the components I created. If they are insufficient, I should fix them.
    // Let's check md3-select again. It renders `value="${opt}"` and content `${opt}`.
    // This is definitely a regression if I use it as is.
    // I'll use the manual render for the select here for now (using the new classes), and use the components for the text inputs.
    // Or, I can define the select manually.

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>Select Target</h3>
            <div class="md3-input-group">
               <label class="md3-label">Growspace</label>
               <select
                 class="md3-input"
                 .value=${this.env_selectedGrowspaceId}
                 @change=${(e: Event) => this.env_selectedGrowspaceId = (e.target as HTMLSelectElement).value}
               >
                  <option value="">Select...</option>
                  ${Object.entries(this.growspaceOptions).map(([id, name]) => html`<option value="${id}">${name}</option>`)}
               </select>
            </div>
         </div>

         <div class="detail-card">
            <h3>Sensors</h3>
            <md3-text-input
              label="Temperature Sensor ID"
              .value=${this.env_temp_sensor}
              @change=${(e: CustomEvent) => this.env_temp_sensor = e.detail}
            ></md3-text-input>
            <md3-text-input
              label="Humidity Sensor ID"
              .value=${this.env_humidity_sensor}
              @change=${(e: CustomEvent) => this.env_humidity_sensor = e.detail}
            ></md3-text-input>
            <md3-text-input
              label="VPD Sensor ID"
              .value=${this.env_vpd_sensor}
              @change=${(e: CustomEvent) => this.env_vpd_sensor = e.detail}
            ></md3-text-input>
         </div>

         <div class="detail-card">
            <h3>Optional</h3>
            <md3-text-input
              label="CO2 Sensor ID"
              .value=${this.env_co2_sensor}
              @change=${(e: CustomEvent) => this.env_co2_sensor = e.detail}
            ></md3-text-input>
            <md3-text-input
              label="Circulation Fan ID"
              .value=${this.env_circulation_fan}
              @change=${(e: CustomEvent) => this.env_circulation_fan = e.detail}
            ></md3-text-input>
         </div>

         <div class="detail-card">
            <h3>Thresholds</h3>
            <md3-number-input
              label="Stress Threshold (0.0-1.0)"
              .value=${this.env_stress_threshold}
              @change=${(e: CustomEvent) => this.env_stress_threshold = parseFloat(e.detail)}
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold (0.0-1.0)"
              .value=${this.env_mold_threshold}
              @change=${(e: CustomEvent) => this.env_mold_threshold = parseFloat(e.detail)}
            ></md3-number-input>
         </div>
      </div>
   `;
  }
}
