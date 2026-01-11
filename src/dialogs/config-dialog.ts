import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiClose, mdiCog, mdiViewDashboard, mdiThermometer, mdiPencil, mdiDelete, mdiWaterPercent, mdiWhiteBalanceSunny, mdiWeatherNight, mdiInformation, mdiGauge, mdiFan, mdiAlert } from '@mdi/js';
import { dialogStyles } from '../styles/dialog.styles';
import { HomeAssistant } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';
import '../components/ui/md3-text-input';
import '../components/ui/md3-number-input';
import '../components/ui/md3-select';
import { GrowspaceDevice, DehumidifierStage } from '../types';
import { ConfigTab } from '../constants';

@customElement('config-dialog')
export class ConfigDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) accessor open = false;

  @property({ attribute: false })
  public accessor hass!: HomeAssistant;

  @property({ type: Object })
  accessor growspaceOptions: Record<string, string> = {};

  @property({ attribute: false })
  public accessor devices: GrowspaceDevice[] = [];

  @property({ type: String }) accessor initialTab: ConfigTab =
    ConfigTab.ENVIRONMENT;
  @property({ type: String })
  public accessor currentTab: ConfigTab = ConfigTab.ENVIRONMENT;

  @property({ attribute: false })
  public accessor environmentData: any;

  private _initialStateApplied = false;

  // Add Growspace Data
  @state() private accessor add_name = '';
  @state() private accessor add_rows = 4;
  @state() private accessor add_plants_per_row = 4;
  @state() private accessor add_notification_service = 'mobile_app_notify';

  // Edit Growspace Data
  @state() private accessor edit_selectedId = '';
  @state() private accessor edit_name = '';
  @state() private accessor edit_rows = 0;
  @state() private accessor edit_plants_per_row = 0;
  @state() private accessor edit_notification_service = '';

  // Environment Data
  @state() private accessor env_selectedGrowspaceId = '';
  @state() private accessor env_temp_sensor = '';
  @state() private accessor env_humidity_sensor = '';
  @state() private accessor env_vpd_sensor = '';
  @state() private accessor env_co2_sensor = '';
  @state() private accessor env_circulation_fan = '';
  @state() private accessor env_stress_threshold = 0.8;
  @state() private accessor env_mold_threshold = 0.8;
  @state() private accessor env_light_sensor = '';
  @state() private accessor env_exhaust_entity = '';
  @state() private accessor env_humidifier_entity = '';
  @state() private accessor env_dehumidifier_entity = '';
  @state() private accessor env_soil_moisture_sensor = '';
  @state() private accessor env_control_dehumidifier = false;
  @state() private accessor env_dehumidifier_thresholds: Record<string, Record<string, { on: number; off: number }>> = {};
  @state() private accessor _activeDehumidifierStage: DehumidifierStage = DehumidifierStage.SEEDLING;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }

      /* Config Tabs Specific */
      .glass-dialog-container {
        min-width: 0;
        max-width: 95vw;
        height: 700px;
        max-height: 90vh;
      }
      .config-tabs {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: transparent;
      }
      .config-tab {
        flex: 1 1 0px;
        width: 0;
        min-width: 0;
        padding: 16px 8px;
        text-align: center;
        cursor: pointer;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 0.8rem;
        font-weight: 500;
        background: transparent;
        flex-shrink: 0;
      }
      .config-tab svg {
        width: 24px;
        height: 24px;
        margin-bottom: 4px;
        fill: currentColor;
      }
      .config-tab:hover {
        color: var(--primary-text-color, #fff);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px 8px 0 0;
      }
      .config-tab.active {
        color: var(--primary-color, #4caf50);
        border-bottom-color: var(--primary-color, #4caf50);
      }
      .config-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 0;
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
    `,
  ];

  protected willUpdate(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('environmentData') && this.environmentData) {
      this.setInitialState(this.currentTab, this.environmentData);
    }
  }

  protected updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // Apply initial tab state only once when dialog opens
    if (changedProperties.has('open')) {
      if (this.open) {
        if (!this._initialStateApplied) {
          this._initialStateApplied = true;
        }
      } else if (!this.open) {
        // Reset flag when dialog closes so next open respects initialTab again
        this._initialStateApplied = false;
      }
    }
  }

  // Provide initial state setting from parent
  public setInitialState(
    currentTab: ConfigTab = ConfigTab.ENVIRONMENT,
    environmentData?: {
      selectedGrowspaceId: string;
      temp_sensor: string;
      humidity_sensor: string;
      vpd_sensor: string;
      co2_sensor: string;
      circulation_fan: string;
      stress_threshold: number;
      mold_threshold: number;
      light_sensor: string;
      exhaust_entity: string;
      humidifier_entity: string;
      dehumidifier_entity: string;
      soil_moisture_sensor: string;
      control_dehumidifier: boolean;
      dehumidifier_thresholds: Record<string, Record<string, { on: number; off: number }>>;
    }
  ) {
    this.currentTab = currentTab as any;
    if (environmentData) {
      this.env_selectedGrowspaceId = environmentData.selectedGrowspaceId;
      this.env_temp_sensor = environmentData.temp_sensor;
      this.env_humidity_sensor = environmentData.humidity_sensor;
      this.env_vpd_sensor = environmentData.vpd_sensor;
      this.env_co2_sensor = environmentData.co2_sensor;
      this.env_circulation_fan = environmentData.circulation_fan;
      this.env_stress_threshold = environmentData.stress_threshold;
      this.env_mold_threshold = environmentData.mold_threshold;
      this.env_light_sensor = environmentData.light_sensor;
      this.env_exhaust_entity = environmentData.exhaust_entity;
      this.env_humidifier_entity = environmentData.humidifier_entity;
      this.env_dehumidifier_entity = environmentData.dehumidifier_entity;
      this.env_soil_moisture_sensor = environmentData.soil_moisture_sensor;
      this.env_control_dehumidifier = environmentData.control_dehumidifier;
      this.env_dehumidifier_thresholds = environmentData.dehumidifier_thresholds || {};

      // Also pre-select for Edit/Delete actions
      if (environmentData.selectedGrowspaceId) {
        console.log('DEBUG: Pre-selecting growspace for edit:', environmentData.selectedGrowspaceId);
        this._populateEditFields(environmentData.selectedGrowspaceId);
      }
    }
  }

  private _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private _switchTab(tab: ConfigTab) {
    this.currentTab = tab;
  }

  // --- Submission Handlers ---

  private _submitAddGrowspace() {
    this.dispatchEvent(
      new CustomEvent('add-growspace-submit', {
        detail: {
          name: this.add_name,
          rows: this.add_rows,
          plants_per_row: this.add_plants_per_row,
          notification_service: this.add_notification_service,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitEnvironment() {
    this.dispatchEvent(
      new CustomEvent('configure-environment-submit', {
        detail: {
          selectedGrowspaceId: this.env_selectedGrowspaceId,
          temp_sensor: this.env_temp_sensor,
          humidity_sensor: this.env_humidity_sensor,
          vpd_sensor: this.env_vpd_sensor,
          co2_sensor: this.env_co2_sensor,
          circulation_fan: this.env_circulation_fan,
          stress_threshold: this.env_stress_threshold,
          mold_threshold: this.env_mold_threshold,
          light_sensor: this.env_light_sensor,
          exhaust_entity: this.env_exhaust_entity,
          humidifier_entity: this.env_humidifier_entity,
          dehumidifier_entity: this.env_dehumidifier_entity,
          dehumidifier_thresholds: this.env_dehumidifier_thresholds,
          soil_moisture_sensor: this.env_soil_moisture_sensor,
          control_dehumidifier: this.env_control_dehumidifier,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  @state() private accessor _showDeleteConfirm = false;

  private _submitEditGrowspace() {
    if (!this.edit_selectedId) return;
    this.dispatchEvent(
      new CustomEvent('edit-growspace-submit', {
        detail: {
          growspace_id: this.edit_selectedId,
          name: this.edit_name,
          rows: this.edit_rows,
          plants_per_row: this.edit_plants_per_row,
          notification_service: this.edit_notification_service,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _submitDeleteGrowspace() {
    if (!this.edit_selectedId) return;
    this._showDeleteConfirm = true;
  }

  private _confirmDeleteGrowspace() {
    this.dispatchEvent(
      new CustomEvent('delete-growspace-submit', {
        detail: {
          growspace_id: this.edit_selectedId,
        },
        bubbles: true,
        composed: true,
      })
    );

    // Reset selection after delete
    this.edit_selectedId = '';
    this.edit_name = '';
    this.edit_rows = 0;
    this.edit_plants_per_row = 0;
    this.edit_notification_service = '';
    this._showDeleteConfirm = false;
  }

  private _cancelDeleteGrowspace() {
    this._showDeleteConfirm = false;
  }

  private _populateEditFields(growspaceId: string) {
    this.edit_selectedId = growspaceId;

    if (growspaceId && this.devices) {
      const device = this.devices.find((d) => d.device_id === growspaceId);
      if (device) {
        this.edit_name = device.name;
        this.edit_rows = device.rows || 4;
        this.edit_plants_per_row = device.plants_per_row || 4;
        this.edit_notification_service = device.notification_target || '';
      }
    }
  }

  private _handleEditSelection(e: Event) {
    const growspaceId = (e.target as HTMLSelectElement).value;
    this._populateEditFields(growspaceId);
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
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiCog}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <h2 class="dialog-title">Configuration</h2>
              <div class="dialog-subtitle">Manage growspaces & settings</div>
            </div>
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width: auto; padding: 8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="config-tabs">
            <div
              class="config-tab ${this.currentTab === ConfigTab.ADD_GROWSPACE ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.ADD_GROWSPACE)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiViewDashboard}"></path></svg>
              Add Growspace
            </div>
            <div
              class="config-tab ${this.currentTab === ConfigTab.EDIT_GROWSPACE ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.EDIT_GROWSPACE)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
              Edit Growspace
            </div>
            <div
              class="config-tab ${this.currentTab === ConfigTab.ENVIRONMENT ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.ENVIRONMENT)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
              Environment
            </div>
            <div
              class="config-tab ${this.currentTab === ConfigTab.DEHUMIDIFIER ? 'active' : ''}"
              @click=${() => this._switchTab(ConfigTab.DEHUMIDIFIER)}
            >
              <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>
              Dehumidifier
            </div>
          </div>

          <!-- Content -->
          <div class="config-content">
            ${this.currentTab === ConfigTab.ADD_GROWSPACE ? this.renderAddGrowspaceTab() : nothing}
            ${this.currentTab === ConfigTab.EDIT_GROWSPACE ? this.renderEditGrowspaceTab() : nothing}
            ${this.currentTab === ConfigTab.ENVIRONMENT ? this.renderEnvironmentTab() : nothing}
            ${this.currentTab === ConfigTab.DEHUMIDIFIER ? this.renderDehumidifierTab() : nothing}
          </div>

          <!-- Actions -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>
            ${this.currentTab === ConfigTab.ADD_GROWSPACE
        ? html`
                  <button class="md3-button primary" @click=${this._submitAddGrowspace}>
                    Add Growspace
                  </button>
                `
        : nothing}
            ${[ConfigTab.ENVIRONMENT, ConfigTab.DEHUMIDIFIER].includes(this.currentTab)
        ? html`
                  <button class="md3-button primary" @click=${this._submitEnvironment}>
                    Save Configuration
                  </button>
                `
        : nothing}
            ${this.currentTab === ConfigTab.EDIT_GROWSPACE && !this._showDeleteConfirm
        ? html`
                  <button
                    class="md3-button tonal error"
                    @click=${this._submitDeleteGrowspace}
                    ?disabled=${!this.edit_selectedId}
                  >
                    <svg
                      style="width:18px;height:18px;fill:currentColor;margin-right:8px"
                      viewBox="0 0 24 24"
                    >
                      <path d="${mdiDelete}"></path>
                    </svg>
                    Delete
                  </button>
                  <button
                    class="md3-button primary"
                    @click=${this._submitEditGrowspace}
                    ?disabled=${!this.edit_selectedId}
                  >
                    Save Changes
                  </button>
                `
        : nothing}
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
            @change=${(e: CustomEvent) => (this.add_name = e.detail)}
          ></md3-text-input>
          <div class="row-col-grid">
            <md3-number-input
              label="Rows"
              .value=${this.add_rows}
              @change=${(e: CustomEvent) => (this.add_rows = parseInt(e.detail))}
            ></md3-number-input>
            <md3-number-input
              label="Plants per Row"
              .value=${this.add_plants_per_row}
              @change=${(e: CustomEvent) => (this.add_plants_per_row = parseInt(e.detail))}
            ></md3-number-input>
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Notification Service (Mobile App)</label>
            <select
              class="md3-input"
              .value=${this.add_notification_service}
              @change=${(e: Event) =>
        (this.add_notification_service = (e.target as HTMLSelectElement).value)}
            >
              <option value="">None</option>
              ${this._getMobileAppNotifyServices().map(
          (service) =>
            html`<option
                    value="${service.value}"
                    ?selected=${this.add_notification_service === service.value}
                  >
                    ${service.label}
                  </option>`
        )}
            </select>
          </div>
          <md3-text-input
            label="Notification Service (Optional)"
            .value=${this.add_notification_service}
             @change=${(e: CustomEvent) => (this.add_notification_service = e.detail)}
             style="display:none;" 
          ></md3-text-input>
        </div>
      </div>
    `;
  }

  // Add helper to filter entities
  private _getEntities(domains: string[], deviceClass: string | null) {
    if (!this.hass) return [];
    return Object.values(this.hass.states)
      .filter((stateObj) => {
        const domain = stateObj.entity_id.split('.')[0];
        if (!domains.includes(domain)) return false;

        // If deviceClass is provided, match strictly. If null, match any (or no) device class.
        if (deviceClass !== null) {
          return stateObj.attributes.device_class === deviceClass;
        }
        return true;
      })
      .sort((a, b) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(
          b.attributes.friendly_name || b.entity_id
        )
      );
  }

  private _getMobileAppNotifyServices() {
    if (!this.hass || !this.hass.services || !this.hass.services.notify) return [];
    return Object.keys(this.hass.services.notify)
      .filter((service) => service.startsWith('mobile_app_'))
      .map((service) => ({
        label: service.replace('mobile_app_', ''),
        value: service, // Service name within notify domain
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // Add helper to render selects
  private _renderEntitySelect(
    label: string,
    value: string,
    domains: string[],
    deviceClass: string | null,
    changeHandler: (e: Event) => void
  ) {
    const entities = this._getEntities(domains, deviceClass);
    return html`
      <div class="md3-input-group">
        <label class="md3-label">${label}</label>
        <select class="md3-input" .value=${value} @change=${changeHandler}>
          <option value="">Select Entity...</option>
          ${entities.map(
      (e) =>
        html`<option value="${e.entity_id}" ?selected=${e.entity_id === value}>
                ${e.attributes.friendly_name || e.entity_id} (${e.entity_id})
              </option>`
    )}
        </select>
      </div>
    `;
  }

  private renderEditGrowspaceTab() {
    if (this._showDeleteConfirm) {
      return html`
        <div class="detail-card" style="text-align: center; padding: 40px 20px;">
          <h3 style="color: var(--error-color, #ff5252);">Delete Growspace?</h3>
          <p style="margin-bottom: 30px; color: var(--secondary-text-color);">
            Are you sure you want to delete "<strong>${this.edit_name}</strong>"?<br />
            This will remove all associated plants and history.<br />
            This action cannot be undone.
          </p>
          <div class="button-group" style="justify-content: center; gap: 16px;">
            <button class="md3-button tonal" @click=${this._cancelDeleteGrowspace}>Cancel</button>
            <button class="md3-button primary error" @click=${this._confirmDeleteGrowspace}>
              Confirm Delete
            </button>
          </div>
        </div>
      `;
    }

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
          <h3>Select Growspace to Edit</h3>
          <div class="md3-input-group">
            <label class="md3-label">Growspace</label>
            <select
              class="md3-input"
              .value=${this.edit_selectedId}
              @change=${this._handleEditSelection}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
      ([id, name]) => html`<option value="${id}" ?selected=${id === this.edit_selectedId}>${name}</option>`
    )}
            </select>
          </div>
        </div>

        ${this.edit_selectedId
        ? html`
              <div class="detail-card">
                <h3>Edit Details</h3>
                <md3-text-input
                  label="Growspace Name"
                  .value=${this.edit_name}
                  @change=${(e: CustomEvent) => (this.edit_name = e.detail)}
                ></md3-text-input>
                <div class="row-col-grid">
                  <md3-number-input
                    label="Rows"
                    .value=${this.edit_rows}
                    @change=${(e: CustomEvent) => (this.edit_rows = parseInt(e.detail))}
                  ></md3-number-input>
                  <md3-number-input
                    label="Plants per Row"
                    .value=${this.edit_plants_per_row}
                    @change=${(e: CustomEvent) => (this.edit_plants_per_row = parseInt(e.detail))}
                  ></md3-number-input>
                </div>
                <div class="md3-input-group">
                  <label class="md3-label">Notification Service (Mobile App)</label>
                  <select
                    class="md3-input"
                    .value=${this.edit_notification_service}
                    @change=${(e: Event) =>
            (this.edit_notification_service = (e.target as HTMLSelectElement).value)}
                  >
                    <option value="">None</option>
                    ${this._getMobileAppNotifyServices().map(
              (service) =>
                html`<option
                          value="${service.value}"
                          ?selected=${this.edit_notification_service === service.value}
                        >
                          ${service.label}
                        </option>`
            )}
                  </select>
                </div>
              </div>
            `
        : html`
              <div style="text-align:center; padding: 20px; color: var(--secondary-text-color);">
                Please select a growspace to edit.
              </div>
            `}
      </div>
    `;
  }

  private renderEnvironmentTab() {
    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <!-- Target Selection -->
        <div class="detail-card">
          <h3>Select Target</h3>
          <div class="md3-input-group">
            <label class="md3-label">Growspace</label>
            <select
              class="md3-input"
              .value=${this.env_selectedGrowspaceId}
              @change=${this._handleEnvGrowspaceChange}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
      ([id, name]) => html`<option value="${id}" ?selected=${id === this.env_selectedGrowspaceId}>${name}</option>`
    )}
            </select>
          </div>
        </div>

        <!-- Monitoring Section -->
        <div class="detail-card">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;">
            <svg style="width:20px;height:20px;fill:var(--primary-color, #4caf50);" viewBox="0 0 24 24"><path d="${mdiGauge}"></path></svg>
            <h3 style="margin:0; border:none; padding:0;">Monitoring</h3>
          </div>
          
          <div class="row-col-grid">
            ${this._renderEntitySelect(
      'Temperature Sensor',
      this.env_temp_sensor,
      ['sensor', 'input_number'],
      'temperature',
      (e: Event) => (this.env_temp_sensor = (e.target as HTMLSelectElement).value)
    )}
            ${this._renderEntitySelect(
      'Humidity Sensor',
      this.env_humidity_sensor,
      ['sensor', 'input_number'],
      'humidity',
      (e: Event) => (this.env_humidity_sensor = (e.target as HTMLSelectElement).value)
    )}
          </div>
          <div class="row-col-grid" style="margin-top:16px;">
            ${this._renderEntitySelect(
      'VPD Sensor (Optional)',
      this.env_vpd_sensor,
      ['sensor', 'input_number'],
      'pressure',
      (e: Event) => (this.env_vpd_sensor = (e.target as HTMLSelectElement).value)
    )}
            ${this._renderEntitySelect(
      'Soil Moisture Sensor',
      this.env_soil_moisture_sensor,
      ['sensor', 'input_number'],
      'moisture',
      (e: Event) => (this.env_soil_moisture_sensor = (e.target as HTMLSelectElement).value)
    )}
          </div>

          <div class="row-col-grid" style="margin-top:16px;">
            ${this._renderEntitySelect(
      'CO2 Sensor',
      this.env_co2_sensor,
      ['sensor', 'input_number'],
      'carbon_dioxide',
      (e: Event) => (this.env_co2_sensor = (e.target as HTMLSelectElement).value)
    )}
            ${this._renderEntitySelect(
      'Light Source / Sensor',
      this.env_light_sensor,
      ['switch', 'light', 'input_boolean', 'sensor'],
      null,
      (e: Event) => (this.env_light_sensor = (e.target as HTMLSelectElement).value)
    )}
          </div>
        </div>

        <!-- Climate Control Section -->
        <div class="detail-card">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;">
            <svg style="width:20px;height:20px;fill:var(--primary-color, #4caf50);" viewBox="0 0 24 24"><path d="${mdiFan}"></path></svg>
            <h3 style="margin:0; border:none; padding:0;">Climate Control</h3>
          </div>

          <div class="row-col-grid">
            ${this._renderEntitySelect(
      'Exhaust Fan / Switch',
      this.env_exhaust_entity,
      ['fan', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
      null,
      (e: Event) => (this.env_exhaust_entity = (e.target as HTMLSelectElement).value)
    )}
            ${this._renderEntitySelect(
      'Circulation Fan / Switch',
      this.env_circulation_fan,
      ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'],
      null,
      (e: Event) => (this.env_circulation_fan = (e.target as HTMLSelectElement).value)
    )}
          </div>

          <div class="row-col-grid" style="margin-top:16px;">
            ${this._renderEntitySelect(
      'Humidifier',
      this.env_humidifier_entity,
      ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'],
      null,
      (e: Event) => (this.env_humidifier_entity = (e.target as HTMLSelectElement).value)
    )}
            ${this._renderEntitySelect(
      'Dehumidifier',
      this.env_dehumidifier_entity,
      ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'],
      null,
      (e: Event) => (this.env_dehumidifier_entity = (e.target as HTMLSelectElement).value)
    )}
          </div>
          
          <div class="md3-input-group" style=" display:flex; justify-content:flex-end; align-items:center; margin-top:16px;">
             <label class="md3-label" style="margin:0">Control Dehumidifier</label>
             <input type="checkbox" 
                .checked=${this.env_control_dehumidifier}
                @change=${(e: Event) => (this.env_control_dehumidifier = (e.target as HTMLInputElement).checked)}
                style="width:20px; height:20px;"
             />
          </div>
        </div>

        <!-- Thresholds Section -->
        <div class="detail-card">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1)); padding-bottom: 8px;">
            <svg style="width:20px;height:20px;fill:#ff9800;" viewBox="0 0 24 24"><path d="${mdiAlert}"></path></svg>
            <h3 style="margin:0; border:none; padding:0;">Thresholds</h3>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${this.env_stress_threshold}
              @change=${(e: CustomEvent) => (this.env_stress_threshold = parseFloat(e.detail))}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${this.env_mold_threshold}
              @change=${(e: CustomEvent) => (this.env_mold_threshold = parseFloat(e.detail))}
              step="0.01"
            ></md3-number-input>
          </div>
        </div>

      </div>
    `;
  }
  private _handleEnvGrowspaceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const growspaceId = target.value;
    this.env_selectedGrowspaceId = growspaceId;

    // Find the device in the passed devices array (from store state upstream)
    const device = this.devices.find((d) => d.device_id === growspaceId);
    if (device && device.environment_attributes) {
      const attrs = device.environment_attributes;
      this.env_temp_sensor = attrs.temperature_sensor || '';
      this.env_humidity_sensor = attrs.humidity_sensor || '';
      this.env_vpd_sensor = attrs.vpd_sensor || '';
      this.env_co2_sensor = attrs.co2_sensor || '';
      this.env_circulation_fan = attrs.circulation_fan_entity || '';
      this.env_light_sensor = attrs.light_sensor || '';
      this.env_exhaust_entity = attrs.exhaust_entity || '';
      this.env_humidifier_entity = attrs.humidifier_entity || '';
      this.env_dehumidifier_entity = attrs.dehumidifier_entity || '';
      this.env_soil_moisture_sensor = attrs.soil_moisture_sensor || '';
      this.env_control_dehumidifier = attrs.dehumidifier_control_enabled || false;
      this.env_dehumidifier_thresholds = attrs.dehumidifier_thresholds || {};

      // Default or fetch if available (currently not in env attrs commonly exposed, or defaults are fine)
      this.env_stress_threshold = 0.8;
      this.env_mold_threshold = 0.8;
    } else {
      // Reset if no device or no attributes
      this.env_temp_sensor = '';
      this.env_humidity_sensor = '';
      this.env_vpd_sensor = '';
      this.env_co2_sensor = '';
      this.env_circulation_fan = '';
      this.env_light_sensor = '';
      this.env_exhaust_entity = '';
      this.env_humidifier_entity = '';
      this.env_dehumidifier_entity = '';
      this.env_soil_moisture_sensor = '';
      this.env_control_dehumidifier = false;
      this.env_dehumidifier_thresholds = {};
    }
  }

  private renderDehumidifierTab() {
    // Define structure for rendering
    const stages = [
      { id: DehumidifierStage.SEEDLING, label: 'Seedling' },
      { id: DehumidifierStage.VEG, label: 'Vegetative' },
      { id: DehumidifierStage.EARLY_FLOWER, label: 'Early Flower' },
      { id: DehumidifierStage.MID_FLOWER, label: 'Mid Flower' },
      { id: DehumidifierStage.LATE_FLOWER, label: 'Late Flower' },
      { id: DehumidifierStage.DRYING, label: 'Drying' },
      { id: DehumidifierStage.CURING, label: 'Curing' }
    ];

    const activeStage = stages.find(s => s.id === this._activeDehumidifierStage) || stages[0];

    return html`
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div class="detail-card">
          <h3>Select Target</h3>
          <div class="md3-input-group">
            <label class="md3-label">Growspace</label>
            <select
              class="md3-input"
              .value=${this.env_selectedGrowspaceId}
              @change=${this._handleEnvGrowspaceChange}
            >
              <option value="">Select...</option>
              ${Object.entries(this.growspaceOptions).map(
      ([id, name]) => html`<option value="${id}" ?selected=${id === this.env_selectedGrowspaceId}>${name}</option>`
    )}
            </select>
          </div>
        </div>

        <div class="detail-card">
          <h3>Dehumidifier Thresholds (VPD/kPa)</h3>
          
          <!-- Sub-navigation for Stages -->
          <div class="config-tabs sub-tabs" style="margin: 0 -16px; padding: 0 16px; overflow-x: auto; justify-content: flex-start;">
            ${stages.map(stage => html`
              <div
                class="config-tab ${this._activeDehumidifierStage === stage.id ? 'active' : ''}"
                @click=${() => this._activeDehumidifierStage = stage.id}
                style="padding: 12px 16px; font-size: 0.9rem;"
              >
                ${stage.label}
              </div>
            `)}
          </div>

          <div style="padding-top: 24px;">
             <!-- Info Box -->
             <div style="display: flex; gap: 12px; padding: 12px; background: var(--secondary-background-color, rgba(255,255,255,0.05)); border-radius: 8px; margin-bottom: 24px; font-size: 0.85rem; line-height: 1.4; align-items: flex-start;">
                <svg style="width:20px; height:20px; flex-shrink: 0; fill: var(--primary-color, #4caf50);" viewBox="0 0 24 24">
                  <path d="${mdiInformation}"></path>
                </svg>
                <div style="opacity: 0.8;">
                  Configuring <strong>${activeStage.label}</strong> stage.<br>
                  Ensure <b>On</b> threshold is lower than <b>Off</b> threshold for proper hysteresis.
                </div>
             </div>

             <div class="row-col-grid">
               <!-- Day Cycle -->
               <div style="display:flex; flex-direction:column; gap:12px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 12px;">
                 <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color: var(--primary-text-color);">
                    <svg style="width:20px;height:20px;fill:#ff9800;" viewBox="0 0 24 24"><path d="${mdiWhiteBalanceSunny}"></path></svg>
                    <h5 style="margin:0; font-size:1rem;">Day Cycle</h5>
                 </div>
                 
                 <md3-number-input
                    label="On"
                    .value=${this._getThresholdValue(activeStage.id, 'day', 'on')}
                    @change=${(e: CustomEvent) => this._updateThreshold(activeStage.id, 'day', 'on', parseFloat(e.detail))}
                    step="0.01"
                    .unit=${"kPa"}
                 ></md3-number-input>
                 <md3-number-input
                    label="Off"
                    .value=${this._getThresholdValue(activeStage.id, 'day', 'off')}
                    @change=${(e: CustomEvent) => this._updateThreshold(activeStage.id, 'day', 'off', parseFloat(e.detail))}
                    step="0.01"
                    .unit=${"kPa"}
                 ></md3-number-input>
               </div>

               <!-- Night Cycle -->
               <div style="display:flex; flex-direction:column; gap:12px; background: rgba(0,0,0,0.1); padding: 16px; border-radius: 12px;">
                 <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; color: var(--primary-text-color);">
                    <svg style="width:20px;height:20px;fill:#7986cb;" viewBox="0 0 24 24"><path d="${mdiWeatherNight}"></path></svg>
                    <h5 style="margin:0; font-size:1rem;">Night Cycle</h5>
                 </div>

                 <md3-number-input
                    label="On"
                    .value=${this._getThresholdValue(activeStage.id, 'night', 'on')}
                    @change=${(e: CustomEvent) => this._updateThreshold(activeStage.id, 'night', 'on', parseFloat(e.detail))}
                    step="0.01"
                    .unit=${"kPa"}
                 ></md3-number-input>
                 <md3-number-input
                    label="Off"
                    .value=${this._getThresholdValue(activeStage.id, 'night', 'off')}
                    @change=${(e: CustomEvent) => this._updateThreshold(activeStage.id, 'night', 'off', parseFloat(e.detail))}
                    step="0.01"
                    .unit=${"kPa"}
                 ></md3-number-input>
               </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _getThresholdValue(stage: string, cycle: string, point: 'on' | 'off'): number {
    return this.env_dehumidifier_thresholds?.[stage]?.[cycle]?.[point] ?? 0;
  }

  private _updateThreshold(stage: string, cycle: string, point: 'on' | 'off', value: number) {
    if (isNaN(value)) return;

    // Deep clone to trigger reactivity if needed, or just mutable update but assign new ref 
    const newThresholds = JSON.parse(JSON.stringify(this.env_dehumidifier_thresholds || {}));

    if (!newThresholds[stage]) newThresholds[stage] = {};
    if (!newThresholds[stage][cycle]) newThresholds[stage][cycle] = { on: 0, off: 0 };

    newThresholds[stage][cycle][point] = value;

    this.env_dehumidifier_thresholds = newThresholds;
  }
}
