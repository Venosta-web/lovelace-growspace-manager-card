import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import { mdiDna, mdiThermometer, mdiWaterPercent, mdiWeatherCloudy, mdiCloudOutline, mdiWeatherSunny, mdiWeatherNight, mdiCog, mdiBrain, mdiDotsVertical, mdiRadioboxMarked, mdiRadioboxBlank, mdiWater, mdiPencil, mdiCheckboxMarked, mdiCheckboxBlankOutline, mdiAirHumidifier, mdiLink, mdiFan } from '@mdi/js';
import { GrowspaceDevice, GrowspaceManagerCardConfig } from '../types';
import { PlantUtils } from '../utils';

@customElement('growspace-header')
export class GrowspaceHeader extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @property({ attribute: false }) public config!: GrowspaceManagerCardConfig;
    @property({ attribute: false }) public device!: GrowspaceDevice;
    @property({ attribute: false }) public devices: GrowspaceDevice[] = [];
    @property({ attribute: false }) public activeEnvGraphs: Set<string> = new Set();
    @property({ attribute: false }) public historyData: any[] | null = null;
    @property({ type: Boolean }) public isCompactView = false;
    @property({ type: String }) public selectedDevice: string | null = null;
    @property({ type: Boolean }) public menuOpen = false;

    static styles = css`
    :host {
      display: block;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
    }

    .selector-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .growspace-select {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .view-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-button {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .gs-stats-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .gs-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .gs-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }

    .gs-title {
      font-family: 'Roboto', sans-serif;
      font-size: 2.25rem;
      font-weight: 400;
      margin: 0;
      letter-spacing: 0;
      line-height: 2.75rem;
      text-transform: capitalize;
      background: linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .gs-stage-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.1);
      padding: 6px 16px;
      border-radius: 24px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #fff;
      width: fit-content;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
    }

    .gs-stats-chips {
       display: flex;
       flex-wrap: nowrap;
       gap: 8px;
       justify-content: flex-end;
       align-items: center;
       overflow-x: auto;
       overflow-y: hidden;
       flex: 1;
       min-width: 0;
       scrollbar-width: none;
       -ms-overflow-style: none;
       mask-image: linear-gradient(to right, black 85%, transparent 100%);
       -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
       padding: 4px 2px;
    }
    .gs-stats-chips::-webkit-scrollbar {
      display: none;
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      user-select: none;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .stat-chip:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .stat-chip.active {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.4);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      color: #fff;
    }

    .stat-chip svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      opacity: 0.8;
    }

    .light-status-chip {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .light-status-chip.on {
      color: var(--primary-light-color);
    }

    .light-status-chip.off {
       color: rgba(255, 255, 255, 0.7);
    }

    .menu-container {
      position: relative;
      display: inline-block;
    }

    .menu-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      color: #fff;
    }

    .menu-button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .menu-button svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .menu-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: rgba(30, 30, 35, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      overflow: hidden;
      animation: menuFadeIn 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes menuFadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      color: #fff;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .menu-item:last-child {
      border-bottom: none;
    }

    .menu-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .menu-item svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
      opacity: 0.9;
    }

    .menu-item-label {
      flex: 1;
      font-size: 0.9rem;
      font-weight: 500;
    }
  `;

    private _handleDeviceChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        this.dispatchEvent(new CustomEvent('device-changed', {
            detail: { deviceId: target.value },
            bubbles: true,
            composed: true
        }));
    }

    private _toggleCompactView(e: Event) {
        const checked = (e.target as HTMLInputElement).checked;
        this.dispatchEvent(new CustomEvent('toggle-compact-view', {
            detail: { compact: checked },
            bubbles: true,
            composed: true
        }));
    }

    private _openStrainLibraryDialog() {
        this.dispatchEvent(new CustomEvent('open-strain-library', {
            bubbles: true,
            composed: true
        }));
    }

    private _toggleEnvGraph(sensorType: string) {
        this.dispatchEvent(new CustomEvent('toggle-env-graph', {
            detail: { sensorType },
            bubbles: true,
            composed: true
        }));
    }

    private _toggleMenu() {
        this.dispatchEvent(new CustomEvent('toggle-menu', {
            bubbles: true,
            composed: true
        }));
    }

    private _handleMenuItemClick(action: string) {
        this.dispatchEvent(new CustomEvent('menu-action', {
            detail: { action },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (this.isCompactView) {
            return this.renderCompactHeader();
        }
        return this.renderRichHeader();
    }

    private renderCompactHeader(): TemplateResult {
        if (!this.config?.title && this.isCompactView) {
            return html``;
        }

        return html`
      <div class="header">
        ${this.config?.title ? html`<h2 class="header-title">${this.config.title}</h2>` : ''}
        
        <div class="selector-container">
          ${!this.config?.default_growspace ? html`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice || ''} 
              @change=${this._handleDeviceChange}
            >
              ${this.devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
            </select>
          ` : html`
            <label for="device-select">Growspace:</label>
            <select
              id="device-select"
              class="growspace-select"
              .value=${this.selectedDevice || ''}
              @change=${this._handleDeviceChange}
            >
              ${this.devices.map(d => html`<option value="${d.device_id}">${d.name}</option>`)}
            </select>
          `}
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="view-toggle">
            <input 
              type="checkbox" 
              id="compact-view" 
              .checked=${this.isCompactView}
              @change=${this._toggleCompactView}
            >
            <label for="compact-view">Compact</label>
          </div>
          
          <button class="action-button" @click=${this._openStrainLibraryDialog}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDna}"></path>
            </svg>
            Strains
          </button>
        </div>
      </div>
    `;
    }

    private renderRichHeader(): TemplateResult {
        const dominantObj = PlantUtils.getDominantStage(this.device.plants);
        const dominantStage = dominantObj ? dominantObj.stage : 'Unknown';

        // Fetch Environmental Data
        let slug = this.device.name.toLowerCase().replace(/\s+/g, '_');
        if (this.device.overview_entity_id) {
            slug = this.device.overview_entity_id.replace('sensor.', '');
        }

        let envEntityId = `binary_sensor.${slug}_optimal_conditions`;
        const isCure = slug === 'cure';
        const isDry = slug === 'dry';

        if (isCure) {
            envEntityId = `binary_sensor.cure_optimal_curing`;
        } else if (isDry) {
            envEntityId = `binary_sensor.dry_optimal_drying`;
        }

        const envEntity = this.hass.states[envEntityId];

        const getValue = (ent: any, key: string) => {
            if (!ent || !ent.attributes) return undefined;
            if (ent.attributes[key] !== undefined) return ent.attributes[key];
            if (ent.attributes.observations && typeof ent.attributes.observations === 'object') {
                return ent.attributes.observations[key];
            }
            return undefined;
        };

        const temp = getValue(envEntity, 'temperature');
        const hum = getValue(envEntity, 'humidity');
        const vpd = getValue(envEntity, 'vpd');

        const isSpecialGrowspace = isCure || isDry;
        const co2Value = getValue(envEntity, 'co2');
        const co2 = (isSpecialGrowspace || co2Value === undefined || co2Value === null) ? undefined : co2Value;

        const isLightsOnValue = getValue(envEntity, 'is_lights_on');
        const isLightsOn = isLightsOnValue === true;

        return html`
      <div class="gs-stats-container">
        <div class="gs-header-top">
          <div class="gs-title-group">
            <h1 class="gs-title">${this.device.name}</h1>
            ${dominantObj ? html`
            <div class="gs-stage-chip">
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${PlantUtils.getPlantStageIcon(dominantStage)}"></path>
              </svg>
              ${dominantStage} Stage
            </div>
            ` : ''}
          </div>

          <div class="gs-stats-chips">
            ${temp !== undefined ? html`
              <div class="stat-chip ${this.activeEnvGraphs.has('temp') ? 'active' : ''}" 
                   @click=${() => this._toggleEnvGraph('temp')}>
                <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>
                ${temp}°C
              </div>
            ` : ''}
            
            ${hum !== undefined ? html`
              <div class="stat-chip ${this.activeEnvGraphs.has('humidity') ? 'active' : ''}"
                   @click=${() => this._toggleEnvGraph('humidity')}>
                <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>
                ${hum}%
              </div>
            ` : ''}

            ${vpd !== undefined ? html`
              <div class="stat-chip ${this.activeEnvGraphs.has('vpd') ? 'active' : ''}"
                   @click=${() => this._toggleEnvGraph('vpd')}>
                <svg viewBox="0 0 24 24"><path d="${mdiCloudOutline}"></path></svg>
                ${vpd} kPa
              </div>
            ` : ''}

            ${co2 !== undefined ? html`
              <div class="stat-chip ${this.activeEnvGraphs.has('co2') ? 'active' : ''}"
                   @click=${() => this._toggleEnvGraph('co2')}>
                <svg viewBox="0 0 24 24"><path d="${mdiWeatherCloudy}"></path></svg>
                ${co2} ppm
              </div>
            ` : ''}

            ${!isSpecialGrowspace ? html`
              <div class="light-status-chip ${isLightsOn ? 'on' : 'off'}">
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${isLightsOn ? mdiWeatherSunny : mdiWeatherNight}"></path>
                </svg>
                ${isLightsOn ? 'Lights On' : 'Lights Off'}
              </div>
            ` : ''}

            <div class="menu-container">
              <button class="menu-button" @click=${this._toggleMenu}>
                <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
              </button>
              
              ${this.menuOpen ? html`
                <div class="menu-dropdown">
                  <div class="menu-item" @click=${() => this._handleMenuItemClick('config')}>
                    <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                    <span class="menu-item-label">Configuration</span>
                  </div>
                  <div class="menu-item" @click=${() => this._handleMenuItemClick('strain_library')}>
                    <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
                    <span class="menu-item-label">Strain Library</span>
                  </div>
                  <div class="menu-item" @click=${() => this._handleMenuItemClick('grow_master')}>
                    <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
                    <span class="menu-item-label">Grow Master AI</span>
                  </div>
                  <div class="menu-item" @click=${() => this._handleMenuItemClick('toggle_compact')}>
                     <svg viewBox="0 0 24 24"><path d="${this.isCompactView ? mdiRadioboxMarked : mdiRadioboxBlank}"></path></svg>
                     <span class="menu-item-label">Compact View</span>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    }
}
