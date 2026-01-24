
import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';

import { GrowspaceDevice, PlantEntity, StrainEntry } from '../types';
import { PlantUtils } from '../utils/plant-utils';
import { strainLibraryContext, storeContext } from '../context';
import type { GrowspaceStore } from '../store/core/growspace-store';
import { SceneManager } from '../utils/three/scene-manager';
import { InteractionManager } from '../utils/three/interaction-manager';
import { DataService } from '../utils/data-service';
import { SensorTypeUtils } from '../utils/sensor-type-utils';

@customElement('heatmap-3d')
export class Heatmap3D extends LitElement {
    @property({ attribute: false }) device?: GrowspaceDevice;
    @property({ attribute: false }) hass?: any;
    @property({ type: Boolean }) editMode3DCords = false;
    @state() private selectedMetric: 'temperature' | 'humidity' | 'vpd' = 'temperature';
    @state() private historyData: Record<string, any[]> = {};
    @state() private timelineIndex: number = -1; // -1 = Live
    @state() private isPlaying: boolean = false;
    @state() private _hoveredPlant: PlantEntity | null = null;
    @state() private _tooltipPos = { x: 0, y: 0 };
    @state() private showPlants: boolean = true;
    @state() private showLights: boolean = true;
    @state() private showFans: boolean = true;
    @state() private showHeatmap: boolean = true;
    @state() private showTooltips: boolean = true;
    @property({ type: Boolean }) keyboardRotateEnabled = false;
    @property({ type: Number }) keyboardRotateSpeed = 1.0;
    @state() private _activeSensorTab: 'temperature' | 'humidity' | 'vpd' | 'lights' | 'ventilation' | 'environment' | 'irrigation' = 'temperature';
    @state() private _linkMode: boolean = false;

    @consume({ context: strainLibraryContext, subscribe: true })
    strainLibrary: StrainEntry[] = [];

    @consume({ context: storeContext, subscribe: true })
    private store?: GrowspaceStore;

    private playbackTimer?: any;

    @query('#container') private container!: HTMLElement;

    // Managers
    private sceneManager?: SceneManager;
    private interactionManager?: InteractionManager;
    private dataService?: DataService;

    private resizeObserver?: ResizeObserver;

    static styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }
    #container {
      width: 100%;
      height: 600px;
      background: var(--ha-card-background, var(--card-background-color, var(--primary-background-color, #0a0a0a)));
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      position: relative;
      cursor: default;
    }
    canvas {
      display: block;
    }
    .header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 20;
        background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
        pointer-events: none;
    }
    .header h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: white;
        letter-spacing: 0.5px;
    }
    .header-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
    }
    .toggles-container {
        display: flex;
        gap: 12px;
        pointer-events: auto;
    }
    .toggle-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        font-weight: 500;
        cursor: pointer;
    }
    .toggle-item:hover {
        color: white;
    }
    .toggle-item span {
        position: relative;
        top: 1px;
    }
    .toggle-item ha-checkbox {
        --mdc-checkbox-unchecked-color: rgba(255, 255, 255, 0.5);
        --mdc-checkbox-disabled-color: rgba(255, 255, 255, 0.3);
        --mdc-checkbox-ink-color: #448aff;
    }
    .header-actions {
        display: flex;
        gap: 4px;
        pointer-events: auto;
    }
    .header ha-icon-button {
        color: #607d8b;
        transition: all 0.2s ease;
        --mdc-icon-button-size: 32px;
        --mdc-icon-size: 18px;
    }
    .header ha-icon-button.active {
        color: #448aff;
        background: rgba(68, 138, 255, 0.15);
        border-radius: 50%;
    }
    .header ha-icon-button:hover {
        color: #64b5f6;
    }
    .overlay {
        position: absolute;
        top: 65px;
        right: 16px;
        width: 220px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 20;
    }
    .metric-selector {
        background: rgba(30, 30, 30, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 4px;
        display: flex;
        gap: 4px;
        backdrop-filter: blur(8px);
    }
    .metric-selector button {
        flex: 1;
        background: transparent;
        border: none;
        color: #9e9e9e;
        padding: 6px 2px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.2s ease;
    }
    .metric-selector button.active {
        background: #2c2c2e;
        color: #448aff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .legend-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .legend {
        width: 100%;
        height: 8px;
        background: linear-gradient(
            to right,
            #0d47a1,
            #2196f3,
            #4caf50,
            #ff9800,
            #f44336
        );
        border-radius: 4px;
        position: relative;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
    }
    .legend-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #9e9e9e;
    }

    /* Timeline Styles */
    .timeline-controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 20px 24px;
        background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 12px;
        z-index: 20;
    }
    .timeline-info {
        grid-column: 1 / span 3;
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #757575;
        margin-top: -8px;
        margin-bottom: 4px;
    }
    .play-btn {
        background: transparent;
        border: none;
        color: #448aff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .timeline-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: #333;
        border-radius: 2px;
        outline: none;
    }
    .timeline-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        background: #448aff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(68, 138, 255, 0.5);
    }
    .time-display {
        font-size: 11px;
        color: white;
        min-width: 50px;
        text-align: right;
    }

    /* CSS2D Label Styles (Still used by CSS2DRenderer in SceneManager) */
    .sensor-label {
        background: rgba(10, 10, 10, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 4px 10px;
        border-radius: 20px;
        color: white;
        font-size: 11px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .sensor-icon {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
    }
    /* Side Panel Styles */
    .side-panel {
        position: absolute;
        top: 65px;
        left: 16px;
        width: 240px;
        max-height: calc(100% - 200px);
        background: rgba(30, 30, 30, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        z-index: 30;
        backdrop-filter: blur(12px);
        overflow-y: auto;
        color: white;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .side-panel::-webkit-scrollbar {
        width: 4px;
    }
    .side-panel::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
    }
    .side-panel h3 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: #448aff;
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }
    .sensor-item {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .sensor-header {
        font-size: 0.8rem;
        font-weight: 500;
        color: #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .slider-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .slider-row label {
        font-size: 10px;
        color: #757575;
        width: 10px;
        font-weight: bold;
    }
    .edit-slider {
        flex: 1;
        -webkit-appearance: none;
        height: 2px;
        background: #333;
        outline: none;
    }
    .edit-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 10px;
        height: 10px;
        background: #448aff;
        border-radius: 50%;
        cursor: pointer;
    }
    .slider-val {
        font-size: 10px;
        color: #9e9e9e;
        text-align: right;
        width: 25px;
    }

    /* Sensor Tab Styles */
    .sensor-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 2px;
        margin-bottom: 8px;
    }
    .sensor-tab {
        flex: 1;
        background: transparent;
        border: none;
        color: #757575;
        padding: 6px 2px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        transition: all 0.2s ease;
        text-align: center;
    }
    .sensor-tab.active {
        background: #2c2c2e;
        color: #448aff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .sensor-tab:hover:not(.active) {
        color: #e0e0e0;
        background: rgba(255,255,255,0.05);
    }

    /* Tooltip Styles */
    .plant-tooltip {
        position: absolute;
        background: rgba(15, 15, 15, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 12px;
        color: white;
        pointer-events: none;
        z-index: 1000;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        min-width: 180px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .tooltip-header {
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 6px;
        margin-bottom: 2px;
    }
    .tooltip-strain {
        font-weight: 700;
        font-size: 13px;
        color: #448aff;
        display: block;
    }
    .tooltip-pheno {
        font-size: 11px;
        color: #9e9e9e;
        font-style: italic;
    }
    .tooltip-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        gap: 12px;
    }
    .tooltip-label {
        color: #757575;
        font-weight: 500;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: 0.5px;
    }
    .tooltip-value {
        color: #e0e0e0;
        font-weight: 500;
    }
    .tooltip-stage-pill {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
    }
  `;

    connectedCallback() {
        super.connectedCallback();
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup();
        this.resizeObserver?.disconnect();
    }

    private cleanup() {
        if (this.sceneManager) {
            this.sceneManager.dispose();
            this.sceneManager = undefined;
        }
    }

    protected firstUpdated() {
        if (!this.container || !this.hass) return;

        this.dataService = new DataService(this.hass);

        // Initialize Scene Manager
        this.sceneManager = new SceneManager(this.container, this.device, this.hass, { strainLibrary: this.strainLibrary });

        // Expose element for renderers to dispatch events back
        this.sceneManager.scene.userData.element = this.container;

        this.container.addEventListener('unlink', (e: any) => {
            if (e.detail?.entityId) this._handleUnlink(e.detail.entityId);
        });
        this.sceneManager.setCallbacks({
            requestUpdate: () => this.requestUpdate(),
            getSensorValue: (id, metric) => this.getSensorValue(id, metric)
        });

        // Initialize Interaction Manager
        this.interactionManager = new InteractionManager(this.sceneManager, this.container);
        this.interactionManager.setEditMode(this.editMode3DCords);
        this.interactionManager.setCallback((event, data) => this.handleInteraction(event, data));

        this.resizeObserver?.observe(this.container);

        // Initial History Fetch
        this.fetchHistory();

        // Initial Scene Update & Render Trigger
        this.updateScene();
        this.requestUpdate(); // Trigger second render to populate panels with now-ready meshes
    }

    private updateScene() {
        if (!this.device || !this.sceneManager) return;
        this.sceneManager.update(
            this.device,
            this.hass,
            this.selectedMetric,
            this.historyData,
            this.timelineIndex,
            this.strainLibrary,
            {
                plants: this.showPlants,
                lights: this.showLights,
                fans: this.showFans,
                heatmap: this.showHeatmap,
                tooltips: this.showTooltips
            }
        );
    }

    protected willUpdate(changedProps: PropertyValues) {
        if (this.sceneManager) {
            this.updateScene();
        }
    }

    protected updated(changedProps: PropertyValues) {
        if (!this.device) return;

        // sceneManager update moved to willUpdate for render consistency

        if (changedProps.has('device')) {
            this.fetchHistory();
        }

        if (changedProps.has('editMode3DCords') && this.interactionManager) {
            this.interactionManager.setEditMode(this.editMode3DCords);
        }

        if (changedProps.has('keyboardRotateEnabled') || changedProps.has('keyboardRotateSpeed')) {
            // Pass these to SceneManager? Or handle keyboard locally?
            // SceneManager handles OrbitControls.
            // Feature: Keyboard rotation is a bit custom.
            // For now, let's skip keyboard rotation or implement it via SceneManager public methods if needed.
            // Or just leave it out for this refactor to keep it simple, as it wasn't a core requirement.
        }
    }

    private handleResize() {
        if (this.sceneManager) {
            this.sceneManager.handleResize();
        }
    }

    private handleInteraction(event: string, data: any) {
        if (event === 'hover') {
            if (data && data.plant) {
                this._hoveredPlant = data.plant;
                this._tooltipPos = data.pos;
            } else {
                this._hoveredPlant = null;
            }
        }
        if (event === 'drag' && data.object) {
            // Optimistic Update
            this.updateLocalCoordinates(data.object);
            this.requestUpdate();
        }

        if (event === 'dragend' && data.object) {
            // Final sync and Backend Update
            this.updateLocalCoordinates(data.object);
            this.updateBackendCoordinates(data.object);
            this.requestUpdate();
        }

        if (event === 'link' && data.from && data.to) {
            this._handleLink(data.from, data.to);
        }

        if (event === 'unlink' && data.entityId) {
            this._handleUnlink(data.entityId);
        }

        if (event === 'click' && data.plant) {
            if (data.plant.entity_id) {
                // Existing plant
                this.store?.openPlantOverviewDialog(data.plant);
            } else if (data.plant.row !== undefined && data.plant.col !== undefined) {
                // Empty slot
                this.store?.openAddPlantDialog(data.plant.row, data.plant.col);
            }
        }
    }

    private _handleLink(fromId: string, toId: string) {
        if (!this.device || !this.sceneManager) return;

        const fromMesh = this.sceneManager.sensorMeshes.get(fromId);
        const toMesh = this.sceneManager.sensorMeshes.get(toId);

        if (!fromMesh || !toMesh) return;

        const fromTypes = (fromMesh.userData.types || []) as string[];
        const toTypes = (toMesh.userData.types || []) as string[];

        const isPump = fromTypes.includes('irrigation_pump') || fromTypes.includes('drain_pump');
        const isTank = toTypes.includes('irrigation_tank');

        // Allow reverse selection too
        let pumpId = isPump ? fromId : (toTypes.includes('irrigation_pump') || toTypes.includes('drain_pump') ? toId : null);
        let tankId = isTank ? toId : (fromTypes.includes('irrigation_tank') ? fromId : null);

        if (pumpId && tankId) {
            if (!this.device.environmentAttributes) this.device.environmentAttributes = {};
            if (!this.device.environmentAttributes.pump_tank_links) this.device.environmentAttributes.pump_tank_links = {};

            this.device.environmentAttributes.pump_tank_links[pumpId] = tankId;

            // Sync to backend
            this._updatePumpTankLinks();
            this.requestUpdate();
        }
    }

    private _handleUnlink(pumpId: string) {
        if (!this.device || !this.device.environmentAttributes?.pump_tank_links) return;

        delete this.device.environmentAttributes.pump_tank_links[pumpId];
        this._updatePumpTankLinks();
        this.requestUpdate();
    }

    private _updatePumpTankLinks() {
        if (!this.device) return;
        this.dataService?.callService('growspace_manager', 'update_environment_attributes', {
            growspace_id: this.device.deviceId,
            pump_tank_links: this.device.environmentAttributes.pump_tank_links
        });
    }

    private toggleLinkMode() {
        this._linkMode = !this._linkMode;
        if (this.interactionManager) {
            this.interactionManager.setLinkMode(this._linkMode);
        }
    }


    private updateLocalCoordinates(mesh: any) {
        if (!this.sceneManager || !this.device) return;

        const width = this.device.dimensions?.width ?? 120;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        for (const [id, m] of this.sceneManager.sensorMeshes.entries()) {
            if (m === mesh) {
                const x = mesh.position.x + width / 2;
                const y = mesh.position.z + depth / 2;
                const z = mesh.position.y;

                if (!this.device.environmentAttributes) this.device.environmentAttributes = {};
                if (!this.device.environmentAttributes.sensorCoordinates) this.device.environmentAttributes.sensorCoordinates = {};

                const currentCoords = this.device.environmentAttributes.sensorCoordinates[id] || {};
                this.device.environmentAttributes.sensorCoordinates[id] = {
                    ...currentCoords,
                    x, y, z
                };
                break;
            }
        }
    }

    private updateBackendCoordinates(mesh: any) {
        // Determine entityId from mesh
        // We can find it by iterating sensorMeshes in sceneManager
        if (!this.sceneManager || !this.device) return;

        const width = this.device.dimensions?.width ?? 120;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        for (const [id, m] of this.sceneManager.sensorMeshes.entries()) {
            if (m === mesh) {
                const x = mesh.position.x + width / 2;
                const y = mesh.position.z + depth / 2;
                const z = mesh.position.y;

                let rotation: number | undefined;
                // Rotation usually stored in userData or traverse
                if (this.sceneManager.volatileGroup) {
                    const obj = this.sceneManager.volatileGroup.children.find((c: any) => c.userData?.entityId === id);
                    if (obj && (obj as any).userData) rotation = (obj as any).userData.baseRotation;
                }

                this.dataService?.updateSensorCoordinates(this.device.deviceId, id, x, y, z, rotation);
                break;
            }
        }
    }

    private async fetchHistory() {
        if (!this.dataService || !this.device) return;
        const sensorCoords = this.device.environmentAttributes?.sensorCoordinates || {};
        const entityIds = Object.keys(sensorCoords);
        if (entityIds.length === 0) return;

        const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
        this.historyData = await this.dataService.fetchHistory(entityIds, start);
    }

    // UI Helpers

    private getSensorValue(entityId: string, metric: string): number | null {
        // Used by renderers
        if (this.timelineIndex >= 0) {
            const history = this.historyData[entityId];
            if (history && history[this.timelineIndex]) {
                const val = parseFloat(history[this.timelineIndex].s);
                return isNaN(val) ? 0 : val;
            }
        }
        if (!this.hass || !entityId) return 0;
        const state = this.hass.states[entityId];
        if (!state || isNaN(parseFloat(state.state))) return 0;
        return parseFloat(state.state);
    }

    private getMetricValue(entityId: string): number {
        return this.getSensorValue(entityId, this.selectedMetric) || 0;
    }

    private toggleEditMode() {
        this.editMode3DCords = !this.editMode3DCords;
        this.dispatchEvent(
            new CustomEvent('edit-mode-changed', {
                detail: { enabled: this.editMode3DCords },
                bubbles: true,
                composed: true,
            })
        );
    }

    private setMetric(m: 'temperature' | 'humidity' | 'vpd') {
        this.selectedMetric = m;
    }

    // Playback Logic
    private togglePlayback() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.startPlayback();
        } else {
            this.stopPlayback();
        }
    }

    private startPlayback() {
        const maxIndex = this.getMaxHistoryLength() - 1;
        if (this.timelineIndex >= maxIndex) this.timelineIndex = 0;

        this.playbackTimer = setInterval(() => {
            if (this.timelineIndex < maxIndex) {
                this.timelineIndex++;
            } else {
                this.isPlaying = false;
                this.stopPlayback();
            }
        }, 300);
    }

    private stopPlayback() {
        if (this.playbackTimer) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = undefined;
        }
    }

    private getMaxHistoryLength(): number {
        const lengths = Object.values(this.historyData).map(h => h.length);
        return lengths.length > 0 ? Math.max(...lengths) : 0;
    }

    private handleTimelineChange(e: any) {
        this.timelineIndex = parseInt(e.target.value);
        if (this.timelineIndex === this.getMaxHistoryLength()) {
            this.timelineIndex = -1; // Live
        }
    }

    private getFormattedTime(): string {
        if (this.timelineIndex === -1) return 'LIVE';
        const firstEntry = Object.values(this.historyData)[0]?.[this.timelineIndex];
        if (!firstEntry) return '...';
        const date = new Date(firstEntry.lu);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Panel Logic
    private handleSliderInput(entityId: string, axis: 'x' | 'y' | 'z' | 'rotation', value: number) {
        if (!this.sceneManager || !this.device) return;
        const mesh = this.sceneManager.sensorMeshes.get(entityId);
        if (!mesh) return;

        const width = this.device.dimensions?.width ?? 120;
        const height = this.device.dimensions?.height ?? 200;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        // Note: SceneManager meshes are positioned:
        // x = coords.x - width/2
        // y = coords.z (height in scene is y, but z in standard coords?) 
        // Wait, FrameRenderer.ts said: x, y=coords.z, z=coords.y - depth/2.
        // Let's check updateSensorPosition in original logic. 
        // 3D Scene: Y is vertical (height).
        // 3D Scene: Z is depth.
        // Home Assistant Coords:
        // X = width
        // Y = depth
        // Z = height
        // Mapping:
        // Scene.X = HA.X - Width/2
        // Scene.Y = HA.Z
        // Scene.Z = HA.Y - Depth/2

        if (axis === 'x') mesh.position.x = value - width / 2;
        if (axis === 'y') mesh.position.z = value - depth / 2; // HA Y maps to Scene Z
        if (axis === 'z') mesh.position.y = value; // HA Z maps to Scene Y

        // Optimistic update to device object so renderers don't overwrite on next frame
        if (this.device.environmentAttributes?.sensorCoordinates) {
            const coords = this.device.environmentAttributes.sensorCoordinates[entityId] || { x: 0, y: 0, z: 0, rotation: 0 };
            if (axis === 'x') coords.x = value;
            if (axis === 'y') coords.y = value;
            if (axis === 'z') coords.z = value;
            this.device.environmentAttributes.sensorCoordinates[entityId] = { ...coords };
        }

        if (axis === 'rotation') {
            // We need to access the fan model group or similar.
            // InteractionManager or SceneManager might help.
            // For now, let's assume we can set userData or find it.
            // Simplification: We update the backend on change, renderer updates on next frame.
        }

        this.requestUpdate();
    }

    private handleSliderChange(entityId: string) {
        if (!this.sceneManager || !this.device) return;
        const mesh = this.sceneManager.sensorMeshes.get(entityId);
        if (!mesh) return;

        // Trigger Backend Update
        this.updateBackendCoordinates(mesh);
    }

    private _dispatchViewOptionChange(key: string, value: any) {
        this.dispatchEvent(
            new CustomEvent('sensor-position-changed', {
                detail: { [key]: value },
                bubbles: true,
                composed: true,
            })
        );
    }

    render() {
        const maxLen = this.getMaxHistoryLength();
        const ranges = {
            temperature: { min: 18, max: 32, unit: '°C' },
            humidity: { min: 30, max: 85, unit: '%' },
            vpd: { min: 0.4, max: 2.0, unit: ' kPa' }
        };
        const range = ranges[this.selectedMetric];

        return html`
      <div id="container" tabIndex="0">
        <!-- Three.js Canvas and LabelRenderer will be appended here once -->
        
        ${this.renderTooltip()}

        <div class="header">
            <div class="header-title">
                <div class="title-row">
                    <h2>${this.device?.name || 'Growspace'} 3D View</h2>
                    <ha-icon-button
                        class="${this.editMode3DCords ? 'active' : ''}"
                        .path=${'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z'}
                        @click=${this.toggleEditMode}
                        title="Edit sensor positions"
                    ></ha-icon-button>
                </div>
                <!-- Toggles -->
                <div class="toggles-container">
                    <div class="toggle-item" @click=${() => { this.showPlants = !this.showPlants; }}>
                        <ha-checkbox
                            .checked=${this.showPlants}
                            @change=${(e: any) => { e.stopPropagation(); this.showPlants = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Plants</span>
                    </div>
                    <div class="toggle-item" @click=${() => { this.showLights = !this.showLights; }}>
                        <ha-checkbox
                            .checked=${this.showLights}
                            @change=${(e: any) => { e.stopPropagation(); this.showLights = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Lights</span>
                    </div>
                    <div class="toggle-item" @click=${() => { this.showFans = !this.showFans; }}>
                        <ha-checkbox
                            .checked=${this.showFans}
                            @change=${(e: any) => { e.stopPropagation(); this.showFans = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Fans</span>
                    </div>
                    <div class="toggle-item" @click=${() => { this.showHeatmap = !this.showHeatmap; }}>
                        <ha-checkbox
                            .checked=${this.showHeatmap}
                            @change=${(e: any) => { e.stopPropagation(); this.showHeatmap = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Heatmap</span>
                    </div>
                    <div class="toggle-item" @click=${() => { this.showTooltips = !this.showTooltips; }}>
                        <ha-checkbox
                            .checked=${this.showTooltips}
                            @change=${(e: any) => { e.stopPropagation(); this.showTooltips = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Tooltips</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${this.editMode3DCords ? this.renderSensorPanel() : ''}

        <div class="overlay">
            <div class="metric-selector">
                <button 
                    class="${this.selectedMetric === 'temperature' ? 'active' : ''}" 
                    @click=${() => this.setMetric('temperature')}>Temperature</button>
                <button 
                    class="${this.selectedMetric === 'humidity' ? 'active' : ''}" 
                    @click=${() => this.setMetric('humidity')}>Humidity</button>
                <button 
                    class="${this.selectedMetric === 'vpd' ? 'active' : ''}" 
                    @click=${() => this.setMetric('vpd')}>VPD</button>
            </div>
            ${this.showHeatmap ? html`
                <div class="legend-container">
                    <div class="legend"></div>
                    <div class="legend-labels">
                        <span>Low (${range.min}${range.unit})</span>
                        <span>High (${range.max}${range.unit})</span>
                    </div>
                </div>
            ` : nothing}
        </div>

        ${maxLen > 0 ? html`
            <div class="timeline-controls">
                <div class="timeline-info">
                    <span>Start (00:00)</span>
                    <span>Now</span>
                </div>
                <button class="play-btn" @click=${this.togglePlayback}>
                    <ha-icon icon="${this.isPlaying ? 'mdi:pause' : 'mdi:play'}"></ha-icon>
                </button>
                <input 
                    type="range" 
                    class="timeline-slider"
                    min="0" 
                    max=${maxLen} 
                    .value=${this.timelineIndex === -1 ? maxLen : this.timelineIndex}
                    @input=${this.handleTimelineChange}
                >
                <span class="time-display">${this.getFormattedTime()}</span>
            </div>
        ` : ''}
      </div>
    `;
    }

    private renderTooltip() {
        if (!this._hoveredPlant) return nothing;

        const plant = this._hoveredPlant;
        const strainName = plant.attributes.strain || 'Unknown';
        const pheno = plant.attributes.phenotype;
        const stage = PlantUtils.getPlantStage(plant);
        const stageColor = PlantUtils.getPlantStageColor(stage);
        const daysInStage = PlantUtils.calculatePlantAge(plant);

        const strainInfo = this.strainLibrary.find(s =>
            s.strain === strainName &&
            (pheno ? s.phenotype === pheno : (!s.phenotype || s.phenotype === 'default'))
        );
        const breeder = strainInfo?.breeder || 'Unknown';

        const style = styleMap({
            left: `${this._tooltipPos.x + 15}px`,
            top: `${this._tooltipPos.y + 15}px`,
            opacity: '1',
            transform: 'translateY(0)'
        });

        return html`
    <div class="plant-tooltip" style=${style}>
                <div class="tooltip-header">
                    <span class="tooltip-strain">${strainName}</span>
                    ${pheno ? html`<span class="tooltip-pheno">${pheno}</span>` : nothing}
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Breeder</span>
                    <span class="tooltip-value">${breeder}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Stage</span>
                    <span class="tooltip-stage-pill" style="background: ${stageColor}22; color: ${stageColor}; border: 1px solid ${stageColor}44">
                        ${stage}
                    </span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Days in Stage</span>
                    <span class="tooltip-value">${daysInStage} days</span>
                </div>
            </div>
        `;
    }

    // Extracted renderSensorPanel logic
    private renderSensorPanel() {
        if (!this.sceneManager) return nothing;

        return html`
            <div class="side-panel">
                <h3>Sensor Positions</h3>
                
                <div class="sensor-tabs">
                    <button class="sensor-tab ${this._activeSensorTab === 'temperature' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'temperature'; }}>Temp</button>
                    <button class="sensor-tab ${this._activeSensorTab === 'humidity' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'humidity'; }}>Humi</button>
                    <button class="sensor-tab ${this._activeSensorTab === 'vpd' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'vpd'; }}>VPD</button>
                    <button class="sensor-tab ${this._activeSensorTab === 'lights' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'lights'; }}>Lights</button>
                    <button class="sensor-tab ${this._activeSensorTab === 'ventilation' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'ventilation'; }}>Fan</button>
                    <button class="sensor-tab ${this._activeSensorTab === 'environment' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'environment'; }}>Env</button>
                    <button class="sensor-tab ${this._activeSensorTab === 'irrigation' ? 'active' : ''}" 
                        @click=${() => { this._activeSensorTab = 'irrigation'; }}>Irrig</button>
                </div>

                ${this._activeSensorTab === 'irrigation' ? html`
                    <div style="padding: 0 10px 10px 10px">
                        <button 
                            class="sensor-tab ${this._linkMode ? 'active' : ''}" 
                            style="width: 100%;"
                            @click=${this.toggleLinkMode}
                        >
                            <ha-icon icon="${this._linkMode ? 'mdi:link-variant-off' : 'mdi:link-variant'}" style="--mdc-icon-size: 14px; margin-right: 4px;"></ha-icon>
                            ${this._linkMode ? 'Exit Link Mode' : 'Pump-Tank Link Mode'}
                        </button>
                    </div>
                ` : ''}

                ${Array.from(this.sceneManager.sensorMeshes.keys())
                .filter(id => {
                    const mesh = this.sceneManager!.sensorMeshes.get(id);
                    if (!mesh || !mesh.userData.types) return false;
                    const types = mesh.userData.types as string[];

                    if (this._activeSensorTab === 'temperature') return types.includes('temperature');
                    if (this._activeSensorTab === 'humidity') return types.includes('humidity');
                    if (this._activeSensorTab === 'vpd') return types.includes('vpd');
                    if (this._activeSensorTab === 'lights') return types.includes('light');
                    if (this._activeSensorTab === 'ventilation') return types.includes('fan') || types.includes('exhaust');
                    if (this._activeSensorTab === 'environment') return types.includes('co2') || types.includes('humidifier') || types.includes('dehumidifier');
                    if (this._activeSensorTab === 'irrigation') return types.includes('irrigation_pump') || types.includes('drain_pump') || types.includes('soil_moisture') || types.includes('irrigation_tank');

                    return false;
                })
                .map((id) => {
                    const mesh = this.sceneManager!.sensorMeshes.get(id)!;
                    const types = (mesh.userData.types || []) as string[];
                    const isAllowedOutside = types.some(t => ['humidifier', 'dehumidifier', 'irrigation_tank', 'irrigation_pump', 'drain_pump'].includes(t));

                    const width = this.device?.dimensions?.width ?? 120;
                    const height = this.device?.dimensions?.height ?? 200;
                    const depth = this.device?.dimensions?.length ?? (this.device?.dimensions as any)?.depth ?? 120;

                    const xMin = isAllowedOutside ? -100 : 0;
                    const xMax = isAllowedOutside ? width + 100 : width;
                    const yMin = isAllowedOutside ? -100 : 0;
                    const yMax = isAllowedOutside ? depth + 100 : depth;
                    const zMin = isAllowedOutside ? -50 : 0;
                    const zMax = isAllowedOutside ? height + 50 : height;

                    const x = Math.round(mesh.position.x + width / 2);
                    const y = Math.round(mesh.position.z + depth / 2);
                    const z = Math.round(mesh.position.y);
                    // Rotation?
                    let rotation = 0;

                    const friendlyName = this.hass?.states[id]?.attributes?.friendly_name;
                    const name = friendlyName || `Sensor ${id.split('.').pop()}`;
                    const icon = SensorTypeUtils.getSensorIcon(this.device, this.hass, id);

                    return html`
                        <div class="sensor-item">
                            <div class="sensor-header">
                                <span>${name}</span>
                                <ha-icon style="font-size: 14px; opacity: 0.5" icon="${icon}"></ha-icon>
                            </div>
                            <div class="slider-group">
                                <div class="slider-row">
                                    <label>X</label>
                                    <input type="range" class="edit-slider" 
                                        min="${xMin}" max="${xMax}" 
                                        .value=${x} 
                                        @input=${(e: any) => this.handleSliderInput(id, 'x', parseFloat(e.target.value))}
                                        @change=${() => this.handleSliderChange(id)}>
                                    <span class="slider-val">${x}</span>
                                </div>
                                <div class="slider-row">
                                    <label>Y</label>
                                    <input type="range" class="edit-slider" 
                                        min="${yMin}" max="${yMax}" 
                                        .value=${y} 
                                        @input=${(e: any) => this.handleSliderInput(id, 'y', parseFloat(e.target.value))}
                                        @change=${() => this.handleSliderChange(id)}>
                                    <span class="slider-val">${y}</span>
                                </div>
                                <div class="slider-row">
                                    <label>Z</label>
                                    <input type="range" class="edit-slider" 
                                        min="${zMin}" max="${zMax}" 
                                        .value=${z} 
                                        @input=${(e: any) => this.handleSliderInput(id, 'z', parseFloat(e.target.value))}
                                        @change=${() => this.handleSliderChange(id)}>
                                    <span class="slider-val">${z}</span>
                                </div>
                            </div>
                        </div>
                    `;
                })}
            </div>
        `;
    }
}
