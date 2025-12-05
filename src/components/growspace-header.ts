import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import {
  mdiDna,
  mdiThermometer,
  mdiWaterPercent,
  mdiWeatherCloudy,
  mdiCloudOutline,
  mdiCog,
  mdiBrain,
  mdiDotsVertical,
  mdiRadioboxMarked,
  mdiRadioboxBlank,
  mdiWater,
  mdiPencil,
  mdiAirHumidifier,
  mdiLink,
  mdiFan,
  mdiLightbulbOn,
  mdiLightbulbOff,
  mdiMagnify,
  mdiAirHumidifierOff,
  mdiIdCard,

} from '@mdi/js';
import { GrowspaceDevice, GrowspaceManagerCardConfig } from '../types';
import { PlantUtils } from '../utils';

@customElement('growspace-header')
export class GrowspaceHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public device!: GrowspaceDevice;
  @property({ attribute: false }) public config!: GrowspaceManagerCardConfig;
  @property({ attribute: false }) public devices: GrowspaceDevice[] = [];
  @property({ type: Boolean }) public compact = false;
  @property({ type: Boolean }) public isEditMode = false;
  @property({ attribute: false }) public activeEnvGraphs = new Set<string>();
  @property({ attribute: false }) public growspaceOptions: Record<string, string> = {};
  @property({ attribute: false }) public historyData: any[] | null = null;

  @state() private _menuOpen = false;

  @property({ attribute: false }) public linkedGraphGroups: string[][] = [];
  @state() private _draggedMetric: string | null = null;

  static styles = css`
    :host {
      display: block;
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

    .header-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1; /* Ensure it takes available space */
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

    .growspace-select-header {
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
      border: none;
      cursor: pointer;
      padding: 0;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    .growspace-select-header option {
      background: var(--card-background-color, #1c1c1c);
      color: var(--primary-text-color, #fff);
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

       touch-action: manipulation;
       max-width: 100%;
       -webkit-overflow-scrolling: touch;
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
      user-select: none;
      flex-shrink: 0;
       white-space: nowrap;
       touch-action: pan-x;
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
      pointer-events: none; /* Ensure key events pass through to chip/container */
    }

    .gs-device-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
      touch-action: pan-x;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
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
      z-index: 1000;
      min-width: 200px;
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      color: rgba(255, 255, 255, 0.9);
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
      flex-shrink: 0;
    }

    .menu-item-label {
      flex: 1;
      font-size: 0.9rem;
    }

    .menu-toggle-switch {
      width: 40px;
      height: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      position: relative;
      transition: background 0.2s;
    }

    .menu-toggle-switch::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      top: 2px;
      left: 2px;
      transition: transform 0.2s;
    }

    .menu-toggle-switch.active {
      background: var(--primary-color, #03a9f4);
    }

    .menu-toggle-switch.active::after {
      transform: translateX(20px);
    }

    .link-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      margin-left: -8px;
      margin-right: -8px;
    }

    @media (max-width: 768px) {
      .gs-title-group {
        gap: 8px;
        min-width: 0; /* Enable flex shrinking */
      }
      .gs-stats-chips {
        justify-content: flex-start;
        mask-image: linear-gradient(to right, black 90%, transparent 100%);
        -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
        padding-right: 16px;
        /* Force layout properties for scrolling */
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        width: 100%;
        min-width: 0;
        touch-action: pan-x;
        -webkit-overflow-scrolling: touch;
      }

      .gs-header-top {
        flex-direction: column;
        align-items: stretch;
        position: relative;
        padding-right: 48px;
        min-width: 0; /* Prevent overflow blowout */
      }

      .header-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        overflow: visible;
        min-width: 0;
      }

      .menu-container {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 10;
        margin: 0;
      }

      .gs-device-chips {
        justify-content: flex-start;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        mask-image: linear-gradient(to right, black 90%, transparent 100%);
        -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
        padding: 4px 2px;
        padding-right: 16px;
        width: 100%;
        touch-action: pan-x; /* Explicit pan-x for scrolling */
        min-width: 0;
        display: flex;
      }
      .gs-device-chips::-webkit-scrollbar {
        display: none;
      }
      
      /* Mobile Link Button */
      .mobile-link-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
        align-self: flex-end;
        margin-bottom: 8px; /* Gap logic */
        flex-shrink: 0;
      }
      
      .mobile-link-btn.active {
        background: var(--primary-color, #03a9f4);
        border-color: var(--primary-color, #03a9f4);
        box-shadow: 0 0 12px rgba(3, 169, 244, 0.4);
      }
      
      .mobile-link-btn svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }
        
      /* Link Mode Active State - WRAPPING ENABLED, SCROLL DISABLED */
      .gs-stats-chips.mobile-link-active,
      .gs-device-chips.mobile-link-active {
        overflow-x: visible;
        flex-wrap: wrap;
        mask-image: none;
        -webkit-mask-image: none;
        justify-content: flex-end;
      }
    }
  `;

  private _handleDeviceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.dispatchEvent(new CustomEvent('growspace-changed', {
      detail: { deviceId: target.value },
      bubbles: true,
      composed: true
    }));
  }

  private _toggleEnvGraph(metric: string) {
    this.dispatchEvent(new CustomEvent('toggle-env-graph', {
      detail: { metric },
      bubbles: true,
      composed: true
    }));
  }

  private _handleChipDragStart(e: DragEvent, metric: string) {
    this._draggedMetric = metric;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', metric);
    }
  }

  private _handleChipDrop(e: DragEvent, targetMetric: string) {
    e.preventDefault();
    if (!this._draggedMetric || this._draggedMetric === targetMetric) {
      this._draggedMetric = null;
      return;
    }

    this.dispatchEvent(new CustomEvent('link-graphs', {
      detail: { metric1: this._draggedMetric, metric2: targetMetric },
      bubbles: true,
      composed: true
    }));

    this._draggedMetric = null;
  }

  private _handleDragOver(e: DragEvent) {
    if (this._draggedMetric) {
      e.preventDefault();
    }
  }

  private _isMetricLinked(metric: string): { linked: boolean, groupIndex: number, group: string[] } {
    const index = this.linkedGraphGroups.findIndex(g => g.includes(metric));
    return {
      linked: index !== -1,
      groupIndex: index,
      group: index !== -1 ? this.linkedGraphGroups[index] : []
    };
  }

  private _unlinkGraphs(groupIndex: number) {
    this.dispatchEvent(new CustomEvent('unlink-graphs', {
      detail: { groupIndex },
      bubbles: true,
      composed: true
    }));
  }

  @state() private _mobileLink = false;
  @state() private _isCompact = false;
  @state() private _isMobileCheck = false;
  @state() private _hasTouch = false;

  connectedCallback() {
    super.connectedCallback();
    this._checkMobile();
    window.addEventListener('resize', this._checkMobileBound);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._checkMobileBound);
  }

  private _checkMobileBound = () => this._checkMobile();

  private _checkMobile() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const hasTouch = window.matchMedia('(pointer: coarse)').matches;

    if (this._isMobileCheck !== isMobile) {
      this._isMobileCheck = isMobile;
    }

    if (this._hasTouch !== hasTouch) {
      this._hasTouch = hasTouch;
    }
  }

  private get _chipDraggable(): string {
    // If user is on mobile (narrow width) OR has touch, drag is ONLY allowed if explicitly in link mode.
    // This ensures consistency: if you see mobile UI, you get mobile behavior.
    if (this._isMobileCheck || this._hasTouch) {
      return this._mobileLink.toString();
    }
    return 'true';
  }


  private _triggerAction(action: string) {
    this.dispatchEvent(new CustomEvent('trigger-action', {
      detail: { action },
      bubbles: true,
      composed: true
    }));
    this._menuOpen = false;
  }

  render() {
    if (!this.device || !this.hass) return html``;

    const dominant = PlantUtils.getDominantStage(this.device.plants);

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
    const overviewEntity = this.device.overview_entity_id ? this.hass.states[this.device.overview_entity_id] : undefined;

    // Helper to get attribute from either top-level or nested 'observations'
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
    const hasLightSensor = !isSpecialGrowspace && (isLightsOnValue !== undefined && isLightsOnValue !== null);
    const isLightsOn = isLightsOnValue === true;

    const getNextEvent = (times: any[]) => {
      if (!times || times.length === 0) return null;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const sorted = [...times].sort((a, b) => {
        const [h1, m1] = a.time.split(':').map(Number);
        const [h2, m2] = b.time.split(':').map(Number);
        return (h1 * 60 + m1) - (h2 * 60 + m2);
      });
      const nextToday = sorted.find(t => {
        const [h, m] = t.time.split(':').map(Number);
        return (h * 60 + m) > currentMinutes;
      });
      if (nextToday) return nextToday.time.slice(0, 5);
      return sorted[0].time.slice(0, 5);
    };

    const nextIrrigation = getNextEvent(overviewEntity?.attributes?.irrigation_times);
    const nextDrain = getNextEvent(overviewEntity?.attributes?.drain_times);

    // Fetch live states for equipment directly from their entities
    const exhaustId = overviewEntity?.attributes?.exhaust_entity;
    const exhaustState = exhaustId && this.hass.states[exhaustId] ? this.hass.states[exhaustId].state : undefined;

    const humidifierId = overviewEntity?.attributes?.humidifier_entity;
    const humidifierState = humidifierId && this.hass.states[humidifierId] ? this.hass.states[humidifierId].state : undefined;

    const dehumidifierId = overviewEntity?.attributes?.dehumidifier_entity;
    const dehumidifierState = dehumidifierId && this.hass.states[dehumidifierId] ? this.hass.states[dehumidifierId].state : undefined;

    return html`
      <div class="gs-stats-container">
        <div class="gs-header-top">
          <div class="gs-title-group">
            ${!this.config?.default_growspace ? html`
        <select class="growspace-select-header" value=${this.device.device_id} @change=${this._handleDeviceChange}>
          ${Object.entries(this.growspaceOptions).map(([id, name]) => html`<option value="${id}">${name}</option>`)}
        </select>
          ` : html`
          <h3 class="gs-title"> ${this.device.name} </h3>
            `}

            ${dominant ? html`
              <div style="display: flex; gap: 8px;">
                <div class="gs-stage-chip">
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${PlantUtils.getPlantStageIcon(dominant.stage)}"></path></svg>
                  ${dominant.stage.charAt(0).toUpperCase() + dominant.stage.slice(1)} • Day ${dominant.days}
                </div>
                <div class="gs-stage-chip">
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${PlantUtils.getPlantStageIcon(dominant.stage)}"></path></svg>
                  ${dominant.stage.charAt(0).toUpperCase() + dominant.stage.slice(1)} • Week ${Math.ceil(dominant.days / 7)}
                </div>
              </div>
            ` : ''}
          </div>

          <div style="display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 4px;">
            <div class="header-controls">
              
              <div class="mobile-link-btn ${this._mobileLink ? 'active' : ''}"
                   @click=${() => this._mobileLink = !this._mobileLink}>
                 <svg viewBox="0 0 24 24"><path d="${mdiLink}"></path></svg>
              </div>

              <div class="gs-stats-chips ${this._mobileLink ? 'mobile-link-active' : ''}">

                ${temp !== undefined ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('temperature') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'temperature')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'temperature')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('temperature');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiThermometer}"></path></svg>${temp}°C
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('temperature');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${hum !== undefined ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('humidity') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'humidity')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'humidity')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('humidity');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>${hum}%
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('humidity');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${vpd !== undefined ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('vpd') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'vpd')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'vpd')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('vpd');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiCloudOutline}"></path></svg>${vpd} kPa
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('vpd');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${co2 !== undefined ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('co2') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'co2')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'co2')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('co2');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiWeatherCloudy}"></path></svg>${co2} ppm
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('co2');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${hasLightSensor ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('light') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'light')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'light')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('light');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${isLightsOn ? mdiLightbulbOn : mdiLightbulbOff}"></path></svg>
                    ${isLightsOn ? 'On' : 'Off'}
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('light');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}
                
                ${getValue(overviewEntity, 'soil_moisture_value') !== undefined ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('soil_moisture') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'soil_moisture')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'soil_moisture')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('soil_moisture');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiWaterPercent}"></path></svg>Moisture: ${getValue(overviewEntity, 'soil_moisture_value')}%
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('soil_moisture');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${nextIrrigation ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('irrigation') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'irrigation')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'irrigation')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('irrigation');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
                    Next: ${nextIrrigation}
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('irrigation');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${nextDrain ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('drain') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'drain')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'drain')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('drain');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
                    Next: ${nextDrain}
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('drain');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}

                ${envEntity ? html`
                  <div class="stat-chip ${this.activeEnvGraphs.has('optimal') ? 'active' : ''}"
                       draggable="${this._chipDraggable}"
                       @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'optimal')}
                       @drop=${(e: DragEvent) => this._handleChipDrop(e, 'optimal')}
                       @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                       @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('optimal');
        }}>
                    <svg viewBox="0 0 24 24"><path d="${envEntity.state === 'on' ? mdiRadioboxMarked : mdiRadioboxBlank}"></path></svg>
                    ${envEntity.state === 'on' ? 'Optimal Conditions' : (envEntity.attributes.reasons || 'Not Optimal')}
                    ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('optimal');
          if (linked) {
            return html`
                          <div class="link-icon" style="opacity: 0.8; cursor: pointer;" 
                               @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                               title="Unlink Graph">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                          </div>
                        `;
          }
          return '';
        })()}
                  </div>` : ''}
              </div>

              <div class="menu-container">
                <div class="menu-button" @click=${() => this._menuOpen = !this._menuOpen}>
                  <svg viewBox="0 0 24 24"><path d="${mdiDotsVertical}"></path></svg>
                </div>
                ${this._menuOpen ? html`
                  <div class="menu-dropdown" @click=${(e: Event) => e.stopPropagation()}>
                    <div class="menu-item" @click=${() => this._triggerAction('config')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiCog}"></path></svg>
                      <span class="menu-item-label">Config</span>
                    </div>
                    <div class="menu-item" @click=${() => this._triggerAction('edit')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiPencil}"></path></svg>
                      <span class="menu-item-label">Edit</span>
                      <div class="menu-toggle-switch ${this.isEditMode ? 'active' : ''}"></div>
                    </div>
                    <div class="menu-item" @click=${() => this._triggerAction('compact')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiMagnify}"></path></svg>
                      <span class="menu-item-label">Compact View</span>
                      <div class="menu-toggle-switch ${this.compact ? 'active' : ''}"></div>
                    </div>
                    <div class="menu-item" @click=${() => this._triggerAction('control_dehumidifier')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifierOff}"></path></svg>
                      <span class="menu-item-label">Control Dehumidifier</span>
                      <div class="menu-toggle-switch ${overviewEntity?.attributes?.dehumidifier_control_enabled ? 'active' : ''}"></div>
                    </div>
                    <div class="menu-item" @click=${() => this._triggerAction('strains')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiDna}"></path></svg>
                      <span class="menu-item-label">Strains</span>
                    </div>
                    <div class="menu-item" @click=${() => this._triggerAction('irrigation')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiWater}"></path></svg>
                      <span class="menu-item-label">Irrigation</span>
                    </div>
                    <div class="menu-item" @click=${() => this._triggerAction('ai')}>
                      <svg viewBox="0 0 24 24"><path d="${mdiBrain}"></path></svg>
                      <span class="menu-item-label">Ask AI</span>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="gs-device-chips ${this._mobileLink ? 'mobile-link-active' : ''}">
              ${overviewEntity?.attributes?.exhaust_entity ? html`
                <div class="stat-chip ${this.activeEnvGraphs.has('exhaust') ? 'active' : ''}"
                     draggable="${this._chipDraggable}"
                     @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'exhaust')}
                     @drop=${(e: DragEvent) => this._handleChipDrop(e, 'exhaust')}
                     @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                     @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('exhaust');
        }}>
                  <svg viewBox="0 0 24 24"><path d="${mdiFan}"></path></svg> Exhaust: ${exhaustState ?? '-'}
                  ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('exhaust');
          if (linked) {
            return html`
                        <div class="link-icon" style="margin-left: 4px; opacity: 0.8; cursor: pointer;" 
                             @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                             title="Unlink Graph">
                          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                        </div>
                      `;
          }
          return '';
        })()}
                </div>` : ''
      }

              ${overviewEntity?.attributes?.humidifier_entity ? html`
                <div class="stat-chip ${this.activeEnvGraphs.has('humidifier') ? 'active' : ''}"
                     draggable="${this._chipDraggable}"
                     @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'humidifier')}
                     @drop=${(e: DragEvent) => this._handleChipDrop(e, 'humidifier')}
                     @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                     @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('humidifier');
        }}>
                  <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifier}"></path></svg> Humidifier: ${humidifierState ?? '-'}
                  ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('humidifier');
          if (linked) {
            return html`
                        <div class="link-icon" style="margin-left: 4px; opacity: 0.8; cursor: pointer;" 
                             @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                             title="Unlink Graph">
                          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                        </div>
                      `;
          }
          return '';
        })()}
                </div>` : ''}

              ${overviewEntity?.attributes?.dehumidifier_entity ? html`
                <div class="stat-chip ${this.activeEnvGraphs.has('dehumidifier') ? 'active' : ''}"
                     draggable="${this._chipDraggable}"
                     @dragstart=${(e: DragEvent) => this._handleChipDragStart(e, 'dehumidifier')}
                     @drop=${(e: DragEvent) => this._handleChipDrop(e, 'dehumidifier')}
                     @dragover=${(e: DragEvent) => this._handleDragOver(e)}
                     @click=${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('.link-icon')) return;
          this._toggleEnvGraph('dehumidifier');
        }}>
                  <svg viewBox="0 0 24 24"><path d="${mdiAirHumidifierOff}"></path></svg> Dehumidifier: ${dehumidifierState ?? '-'}
                  ${(() => {
          const { linked, groupIndex } = this._isMetricLinked('dehumidifier');
          if (linked) {
            return html`
                        <div class="link-icon" style="margin-left: 4px; opacity: 0.8; cursor: pointer;" 
                             @click=${(e: Event) => { e.stopPropagation(); this._unlinkGraphs(groupIndex); }}
                             title="Unlink Graph">
                          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: var(--primary-color);"><path d="${mdiLink}"></path></svg>
                        </div>
                      `;
          }
          return '';
        })()}
                </div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}