import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GrowspaceDevice, PlantEntity, PlantStage, StrainEntry } from '../types';
import { StatusLevel, STATUS_COLORS } from '../constants';
import { PlantUtils } from '../utils/plant-utils';
import { strainLibraryContext, storeContext } from '../context';
import type { GrowspaceStore } from '../store/core/growspace-store';

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
    @property({ type: Boolean }) keyboardRotateEnabled = false;
    @property({ type: Number }) keyboardRotateSpeed = 1.0;

    @consume({ context: strainLibraryContext, subscribe: true })
    strainLibrary: StrainEntry[] = [];

    @consume({ context: storeContext, subscribe: true })
    private store?: GrowspaceStore;

    private playbackTimer?: any;

    @query('#container') private container!: HTMLElement;

    private renderer?: THREE.WebGLRenderer;
    private labelRenderer?: CSS2DRenderer;
    private scene?: THREE.Scene;
    private camera?: THREE.PerspectiveCamera;
    private controls?: OrbitControls;
    private dragControls?: DragControls;
    private animationId?: number;
    private resizeObserver?: ResizeObserver;
    private volatileGroup?: THREE.Group;
    private windParticles?: THREE.Points;
    private lastProcessedData?: string;
    private sensorMeshes: Map<string, THREE.Object3D> = new Map();
    private ledMaterial?: THREE.MeshStandardMaterial;
    private aluminumMaterial?: THREE.MeshStandardMaterial;
    private isDragging = false;
    private _mouse = new THREE.Vector2();
    private _raycaster = new THREE.Raycaster();
    private _lastRaycastTime = 0;
    private _animatingMaterials: THREE.ShaderMaterial[] = [];
    private _fanHeads: THREE.Object3D[] = [];
    private _exhaustFans: THREE.Object3D[] = [];
    private _plantHitBoxes: THREE.Object3D[] = [];
    private _keysPressed: Set<string> = new Set();

    static styles = css`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }
    #container {
      width: 100%;
      height: 600px;
      background: #0a0a0a;
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      position: relative;
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
        background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
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

    /* CSS2D Label Styles */
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
    .axis-label {
        font-size: 11px;
        color: rgba(255,255,255,0.4);
        font-weight: 500;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(0,0,0,1);
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
        width: 25px;
        text-align: right;
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
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
    }

    protected firstUpdated() {
        this.initThree();
        if (this.container) {
            this.resizeObserver?.observe(this.container);
        }
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
    }

    protected updated(changedProps: PropertyValues) {
        if (!this.device) return;

        const sensors = Object.keys(this.device.environmentAttributes?.sensorCoordinates || {});
        const env = this.device.environmentAttributes;
        const fanEntities = env?.circulationFanEntities || (env?.circulationFanEntity ? [env.circulationFanEntity] : []);
        const exhaustEntities = env?.exhaustFanEntities || (env?.exhaustEntity ? [env.exhaustEntity] : []);
        const allTracked = Array.from(new Set([...sensors, ...fanEntities, ...exhaustEntities]));

        let dataHash = `${this.selectedMetric}_${this.timelineIndex}_${this.device.deviceId}`;

        // Add sensor values to hash to detect state changes
        allTracked.forEach(id => {
            const stateObj = this.hass?.states[id];
            const state = stateObj?.state;
            // Also track percentage for fans
            const percentage = stateObj?.attributes?.percentage;
            dataHash += `_${id}:${state}:${percentage}`;
        });

        const shouldUpdate = changedProps.has('device') ||
            changedProps.has('selectedMetric') ||
            changedProps.has('timelineIndex') ||
            changedProps.has('showPlants') ||
            changedProps.has('showLights') ||
            changedProps.has('showFans') ||
            changedProps.has('showHeatmap') ||
            (changedProps.has('hass') && dataHash !== this.lastProcessedData);

        if (shouldUpdate) {
            this.lastProcessedData = dataHash;
            this.updateScene();
        }

        if (changedProps.has('device')) {
            this.fetchHistory();
        }

        // Handle edit mode changes
        if (changedProps.has('editMode3DCords')) {
            this.updateDragControls();
            this.updateSensorVisuals();
        }
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

    private async fetchHistory() {
        if (!this.hass || !this.device) return;
        const sensorCoords = this.device.environmentAttributes?.sensorCoordinates || {};
        const entityIds = Object.keys(sensorCoords);
        if (entityIds.length === 0) return;

        const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        try {
            const results = await this.hass.callWS({
                type: 'growspace_manager/get_history_stats',
                entity_ids: entityIds,
                start_time: start,
                interval_minutes: 15
            });
            this.historyData = results as Record<string, any[]>;
        } catch (err) {
            console.error('Heatmap3D: Failed to fetch history', err);
        }
    }

    private isLight(entityId: string): boolean {
        if (!this.hass || !entityId) return false;
        const state = this.hass.states[entityId];
        if (!state) return false;

        const deviceClass = state.attributes.device_class;
        const unit = state.attributes.unit_of_measurement;
        const lowerId = entityId.toLowerCase();

        // Check for illuminance/light characteristics
        const isIlluminance = deviceClass === 'illuminance' || (unit && (unit.includes('lx') || unit.includes('fc') || unit.toLowerCase().includes('lux')));
        const isLightId = lowerId.includes('light_sensor') || lowerId.includes('illuminance') || (lowerId.includes('light') && !lowerId.includes('humidifier_light') && !lowerId.includes('vpd'));

        return isIlluminance || isLightId;
    }

    private isSensorOfMetric(entityId: string): boolean {
        if (!this.hass || !entityId) return false;

        // Light is never a primary metric for heatmap calculation
        if (this.isLight(entityId)) return false;

        const state = this.hass.states[entityId];
        if (!state) return false;

        const deviceClass = state.attributes.device_class;
        const unit = state.attributes.unit_of_measurement;
        const lowerId = entityId.toLowerCase();

        // Robust check for sensor type excluding ambiguous names if they are light sensors
        const isTemp = deviceClass === 'temperature' || (unit && unit.includes('°')) || lowerId.includes('temp');
        const isHumi = (deviceClass === 'humidity' || (unit && unit.includes('%')) || lowerId.includes('humi') || lowerId.includes('humid')) && !this.isLight(entityId);
        // Looser VPD check to catch calculated sensors
        const isVpd = deviceClass === 'pressure' || (unit && (unit.includes('Pa') || unit.includes('vpd'))) || lowerId.includes('vpd') || lowerId.includes('calculated_vpd') || lowerId.includes('deficit');

        if (this.selectedMetric === 'temperature') return isTemp;
        if (this.selectedMetric === 'humidity') return isHumi;
        if (this.selectedMetric === 'vpd') return isVpd;

        return false;
    }

    private isFan(entityId: string): boolean {
        if (!this.device) return false;
        const env = this.device.environmentAttributes;
        const fanEntities = env?.circulationFanEntities || (env?.circulationFanEntity ? [env.circulationFanEntity] : []);
        return fanEntities.includes(entityId);
    }

    private isExhaust(entityId: string): boolean {
        if (!this.device) return false;
        const env = this.device.environmentAttributes;
        const exhaustEntities = env?.exhaustFanEntities || (env?.exhaustEntity ? [env.exhaustEntity] : []);
        return exhaustEntities.includes(entityId);
    }

    private getStatusColorForValue(val: number, thresholds: { dLow: number, wLow: number, wHigh: number, dHigh: number }): string {
        if (val < thresholds.dLow) return '#0d47a1'; // Danger Low: Dark Blue
        if (val > thresholds.dHigh) return '#f44336'; // Danger High: Red
        if (val < thresholds.wLow) return '#2196f3'; // Warning Low: Blue
        if (val > thresholds.wHigh) return '#ff9800'; // Warning High: Orange
        return '#4caf50'; // Optimal: Green
    }

    private getMetricValue(entityId: string): number {
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

    private initThree() {
        if (!this.container || this.renderer) return; // Ensure idempotency

        const width = this.container.clientWidth || 400;
        const height = this.container.clientHeight || 400;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0a0a0a, 1);
        this.renderer.domElement.style.display = 'block';
        this.container.appendChild(this.renderer.domElement);

        // Label Renderer
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.left = '0px';
        this.labelRenderer.domElement.style.width = '100%';
        this.labelRenderer.domElement.style.height = '100%';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.zIndex = '10';
        this.container.appendChild(this.labelRenderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        this.camera.position.set(300, 300, 300);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 500, 200);
        this.scene.add(directionalLight);

        // Initial update and loop
        this.updateScene();
        this._animateLoop();

        // Mouse Move for Tooltips
        this.container.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.container.addEventListener('mouseleave', () => {
            if (this.container) this.container.style.cursor = 'default';
            this._hoveredPlant = null;
        });

        // Click handler for plants
        this.container.addEventListener('click', (e) => this._handleMouseClick(e));

        // One-time forced resize
        setTimeout(() => this.handleResize(), 200);
    }

    private updateScene() {
        if (!this.scene || !this.device) return;

        // Ensure we have a persistent group for volatile objects
        if (!this.volatileGroup) {
            this.volatileGroup = new THREE.Group();
            this.scene.add(this.volatileGroup);
        }

        // Nuclear clear of the volatile group
        while (this.volatileGroup.children.length > 0) {
            const child = this.volatileGroup.children[0];
            this.volatileGroup.remove(child);
            child.traverse(obj => {
                if ((obj as any).isCSS2DObject && (obj as any).element) {
                    (obj as any).element.remove();
                }
                if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
                const material = (obj as THREE.Mesh).material;
                if (material) {
                    if (Array.isArray(material)) material.forEach(m => m.dispose());
                    else material.dispose();
                }
            });
        }

        // Reset tracking arrays
        this._animatingMaterials = [];
        this._fanHeads = [];
        this._exhaustFans = [];
        this._plantHitBoxes = [];

        // Also clear any stray axis labels that might have been added to scene directly
        const strays = this.scene.children.filter(c => !(c as any).isLight && c !== this.volatileGroup);
        strays.forEach(s => this.scene?.remove(s));

        // Get Dimensions with robust defaults - fallback to depth if length is missing
        const width = this.device.dimensions?.width ?? 120;
        const height = this.device.dimensions?.height ?? 200;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        // 1. Draw Growspace Frame (Aluminum Poles)
        this.renderFrame(width, height, depth);

        // 2. Helper Grid on floor (Subtle)
        const gridHelper = new THREE.GridHelper(Math.max(width, depth) * 1.5, 10, 0x222222, 0x111111);
        this.volatileGroup.add(gridHelper);

        // 3. Prepare Sensor Data for Shader
        const sensorCoords = this.device.environmentAttributes?.sensorCoordinates || {};
        const heatmapPositions: THREE.Vector3[] = [];
        const heatmapValues: number[] = [];
        const displayEntities: string[] = [];

        // Define Metric Ranges for Normalization
        const ranges = {
            temperature: { min: 18, max: 32 },
            humidity: { min: 30, max: 85 },
            vpd: { min: 0.4, max: 2.0 }
        };
        const range = ranges[this.selectedMetric];

        for (const [entityId, coords] of Object.entries(sensorCoords)) {
            if (!coords) continue;

            const isMetric = this.isSensorOfMetric(entityId);
            const isLight = this.isLight(entityId);

            // Always display if it matches selected metric OR if it's a light sensor
            if (isMetric || isLight) {
                displayEntities.push(entityId);
            }

            if (isMetric) {
                const val = this.getMetricValue(entityId);
                const normalizedVal = Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));

                // Store position relative to center (for box geometry matching)
                heatmapPositions.push(new THREE.Vector3(
                    coords.x - width / 2,
                    coords.z - height / 2,
                    coords.y - depth / 2
                ));
                heatmapValues.push(normalizedVal);
            }
        }

        // 4. Implement Volumetric Cloud (Raymarching Shader)
        const vpdMetrics = this.device.biologicalMetrics;
        const thresholds = this.selectedMetric === 'vpd' ? {
            dLow: vpdMetrics.vpdDangerMin,
            wLow: vpdMetrics.vpdTargetMin,
            wHigh: vpdMetrics.vpdTargetMax,
            dHigh: vpdMetrics.vpdDangerMax
        } : (this.selectedMetric === 'temperature' ? {
            dLow: 15, wLow: 20, wHigh: 28, dHigh: 35
        } : {
            dLow: 30, wLow: 45, wHigh: 65, dHigh: 85
        });

        if (this.showHeatmap && heatmapPositions.length > 0) {
            const volGeometry = new THREE.BoxGeometry(width, height, depth);
            const volMaterial = new THREE.ShaderMaterial({
                transparent: true,
                side: THREE.BackSide,
                uniforms: {
                    u_sensorPositions: { value: heatmapPositions.concat(Array(16 - heatmapPositions.length).fill(new THREE.Vector3())) },
                    u_sensorValues: { value: heatmapValues.concat(Array(16 - heatmapValues.length).fill(0)) },
                    u_sensorCount: { value: heatmapPositions.length },
                    u_boxSize: { value: new THREE.Vector3(width, height, depth) },
                    u_opacity: { value: 0.7 },
                    u_thresholds: {
                        value: new THREE.Vector4(
                            (thresholds.dLow - range.min) / (range.max - range.min),
                            (thresholds.wLow - range.min) / (range.max - range.min),
                            (thresholds.wHigh - range.min) / (range.max - range.min),
                            (thresholds.dHigh - range.min) / (range.max - range.min)
                        )
                    },
                    u_time: { value: 0 }
                },
                vertexShader: `
                    varying vec3 vLocalPos;
                    varying vec3 vWorldPos;
                    void main() {
                        vLocalPos = position;
                        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    precision highp int;

                    varying vec3 vLocalPos;
                    varying vec3 vWorldPos;
                    uniform vec3 u_sensorPositions[16];
                    uniform float u_sensorValues[16];
                    uniform int u_sensorCount;
                    uniform vec3 u_boxSize;
                    uniform float u_opacity;
                    uniform vec4 u_thresholds; // x: dLow, y: wLow, z: wHigh, w: dHigh

                    vec3 getHealthColor(float val) {
                        vec3 dangerLow = vec3(0.051, 0.278, 0.631); // #0d47a1
                        vec3 warnLow = vec3(0.129, 0.588, 0.953);   // #2196f3
                        vec3 optColor = vec3(0.298, 0.686, 0.314);  // #4caf50
                        vec3 warnHigh = vec3(1.0, 0.596, 0.0);      // #ff9800
                        vec3 dangerHigh = vec3(0.957, 0.263, 0.212); // #f44336
                        
                        if (val <= u_thresholds.x) return dangerLow;
                        if (val >= u_thresholds.w) return dangerHigh;
                        
                        if (val <= u_thresholds.y) {
                            float t = (val - u_thresholds.x) / (u_thresholds.y - u_thresholds.x);
                            return mix(dangerLow, warnLow, t);
                        }
                        
                        if (val >= u_thresholds.z) {
                            float t = (val - u_thresholds.z) / (u_thresholds.w - u_thresholds.z);
                            return mix(warnHigh, dangerHigh, t);
                        }
                        
                        // Internal Optimal range
                        float center = (u_thresholds.y + u_thresholds.z) * 0.5;
                        if (val < center) {
                            float t = (val - u_thresholds.y) / (center - u_thresholds.y);
                            return mix(warnLow, optColor, t);
                        } else {
                            float t = (val - center) / (u_thresholds.z - center);
                            return mix(optColor, warnHigh, t);
                        }
                    }

                    void main() {
                        vec3 rayOrigin = cameraPosition;
                        vec3 rayDir = normalize(vWorldPos - rayOrigin);
                        
                        float accumVal = 0.0;
                        float accumAlpha = 0.0;
                        float boxLength = length(u_boxSize);
                        float stepSize = boxLength / 16.0;
                        
                        for(int i = 0; i < 16; i++) {
                            vec3 p = vLocalPos - rayDir * (float(i) * stepSize * 0.5);
                            
                            if(abs(p.x) > u_boxSize.x * 0.501 || 
                               abs(p.y) > u_boxSize.y * 0.501 || 
                               abs(p.z) > u_boxSize.z * 0.501) {
                                continue;
                            }

                            float pointVal = 0.0;
                            float totalWeight = 0.0;
                            for(int j = 0; j < 16; j++) {
                                if(j < u_sensorCount) {
                                    float d = distance(p, u_sensorPositions[j]);
                                    float w = 1.0 / (pow(d / (boxLength * 0.25), 2.0) + 0.001);
                                    pointVal += u_sensorValues[j] * w;
                                    totalWeight += w;
                                }
                            }
                            
                            float val = pointVal / (totalWeight + 0.0001);
                            
                            float spread = 0.5;
                            float edgeX = 1.0 - smoothstep(u_boxSize.x * (spread - 0.1), u_boxSize.x * spread, abs(p.x));
                            float edgeY = 1.0 - smoothstep(u_boxSize.y * (spread - 0.1), u_boxSize.y * spread, abs(p.y));
                            float edgeZ = 1.0 - smoothstep(u_boxSize.z * (spread - 0.1), u_boxSize.z * spread, abs(p.z));
                            val *= (edgeX * edgeY * edgeZ);

                            accumVal += val;
                            accumAlpha += (0.15 * val);
                            
                            if(accumAlpha >= 1.0) break;
                        }

                        float finalVal = clamp(accumVal / 10.0, 0.0, 1.0);
                        vec3 color = getHealthColor(finalVal);
                        gl_FragColor = vec4(color, clamp(accumAlpha * u_opacity, 0.0, 1.0));
                    }
                `
            });
            const volMesh = new THREE.Mesh(volGeometry, volMaterial);
            volMesh.position.y = height / 2;
            this.volatileGroup.add(volMesh);
        }

        // 5. Draw Sensor Indicators (Small refined spheres) + Labels
        this.sensorMeshes.clear(); // Clear previous meshes
        displayEntities.forEach((entityId) => {
            const coords = sensorCoords[entityId];
            if (!coords) return;

            const isMetric = this.isSensorOfMetric(entityId);
            const isLight = this.isLight(entityId);
            const realVal = this.getMetricValue(entityId);

            let healthColor: string;
            let unit: string;
            let icon: string;

            if (isMetric) {
                healthColor = this.getStatusColorForValue(realVal, thresholds);
                unit = this.selectedMetric === 'temperature' ? '°C' : (this.selectedMetric === 'humidity' ? '%' : ' kPa');
                icon = this.selectedMetric === 'temperature' ? 'mdi:thermometer' : (this.selectedMetric === 'humidity' ? 'mdi:water-percent' : 'mdi:gauge');
            } else {
                // It's a light sensor being displayed alongside another metric
                healthColor = '#ffeb3b'; // Yellow/Gold for light
                unit = ' %';
                const state = this.hass?.states[entityId];
                if (state && state.attributes.unit_of_measurement?.includes('fc')) unit = ' fc';
                icon = 'mdi:white-balance-sunny';
            }

            let sensorModel: THREE.Object3D;

            if (isMetric) {
                sensorModel = this.createSensorProbeModel(healthColor);
            } else {
                // Light sensor or other non-metric indicator
                const sensorGeometry = new THREE.SphereGeometry(width * 0.02, 16, 16);
                const mat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(healthColor),
                    transparent: true,
                    opacity: 0.9
                });
                sensorModel = new THREE.Mesh(sensorGeometry, mat);
            }

            sensorModel.position.set(
                coords.x - width / 2,
                coords.z,
                coords.y - depth / 2
            );

            // Store mesh for drag controls
            this.sensorMeshes.set(entityId, sensorModel);
            this.volatileGroup!.add(sensorModel);

            // Add visual indicator for edit mode
            if (this.editMode3DCords) {
                const outlineGeometry = new THREE.SphereGeometry(width * 0.024, 16, 16);
                const outlineMat = new THREE.MeshBasicMaterial({
                    color: 0x448aff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.BackSide
                });
                const outline = new THREE.Mesh(outlineGeometry, outlineMat);
                sensorModel.add(outline);
            }

            // Add CSS2D Label
            const labelDiv = document.createElement('div');
            labelDiv.className = 'sensor-label';
            const hexColor = healthColor;

            labelDiv.innerHTML = `
                <div class="sensor-icon" style="background: ${hexColor}33; border-color: ${hexColor}">
                    <ha-icon icon="${icon}" style="color: ${hexColor}; --mdc-icon-size: 10px"></ha-icon>
                </div>
                <span style="color: ${hexColor}">${isMetric ? 'S' + (displayEntities.indexOf(entityId) + 1) : 'L'}: ${realVal.toFixed(1)}${unit}</span>
            `;

            const label = new CSS2DObject(labelDiv);
            label.position.set(0, 0, 0);
            sensorModel.add(label);
        });

        // 6. Add Axis Labels
        this.addAxisLabels(width, height, depth);

        // Update controls target to center the view on the growspace box
        if (this.controls) {
            this.controls.target.set(0, height / 2, 0);
            this.controls.update();
        }


        // Update drag controls if in edit mode
        if (this.editMode3DCords) {
            this.updateDragControls();
            this.requestUpdate(); // Force UI update for the side panel which depends on sensorMeshes
        }

        // 7. Draw Plants and Pots
        if (this.showPlants) {
            this.renderPlants(width, height, depth);
        }

        // 8. Draw Growlight Lightbars
        if (this.showLights) {
            this.renderLightbars(width, height, depth);
        }

        // 9. Draw Circulation Fans
        if (this.showFans) {
            this.renderFans(width, height, depth);
        }

        // 10. Draw Breeze Animation
        if (this.showFans) {
            this.renderBreeze(width, height, depth);
        }
    }

    private renderFrame(width: number, height: number, depth: number) {
        if (!this.volatileGroup) return;

        if (!this.aluminumMaterial) {
            this.aluminumMaterial = new THREE.MeshStandardMaterial({
                color: 0xf0f0f0, // Off-white aluminum
                metalness: 0.6,
                roughness: 0.4,
            });
        }

        const poleRadius = 1.0;
        const connectorSize = 2.4;
        const group = new THREE.Group();

        // 1. Vertical Poles (4)
        const verticalPoleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, height, 12);
        const positions = [
            { x: -width / 2, z: -depth / 2 },
            { x: width / 2, z: -depth / 2 },
            { x: -width / 2, z: depth / 2 },
            { x: width / 2, z: depth / 2 },
        ];

        positions.forEach(pos => {
            const pole = new THREE.Mesh(verticalPoleGeo, this.aluminumMaterial);
            pole.position.set(pos.x, height / 2, pos.z);
            group.add(pole);
        });

        // 2. Horizontal Poles - Width (4: Top/Bottom Front/Back)
        const widthPoleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, width, 12);
        widthPoleGeo.rotateZ(Math.PI / 2);

        const widthPositions = [
            { y: 0, z: -depth / 2 },
            { y: height, z: -depth / 2 },
            { y: 0, z: depth / 2 },
            { y: height, z: depth / 2 },
        ];

        widthPositions.forEach(pos => {
            const pole = new THREE.Mesh(widthPoleGeo, this.aluminumMaterial);
            pole.position.set(0, pos.y, pos.z);
            group.add(pole);
        });

        // 3. Horizontal Poles - Depth (4: Top/Bottom Left/Right)
        const depthPoleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, depth, 12);
        depthPoleGeo.rotateX(Math.PI / 2);

        const depthPositions = [
            { y: 0, x: -width / 2 },
            { y: height, x: -width / 2 },
            { y: 0, x: width / 2 },
            { y: height, x: width / 2 },
        ];

        depthPositions.forEach(pos => {
            const pole = new THREE.Mesh(depthPoleGeo, this.aluminumMaterial);
            pole.position.set(pos.x, pos.y, 0);
            group.add(pole);
        });

        // 4. Corner Connectors (8)
        const connectorGeo = new THREE.BoxGeometry(connectorSize, connectorSize, connectorSize);
        const connectorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.2 }); // Dark plastic connectors

        const corners = [
            { x: -width / 2, y: 0, z: -depth / 2 },
            { x: width / 2, y: 0, z: -depth / 2 },
            { x: -width / 2, y: height, z: -depth / 2 },
            { x: width / 2, y: height, z: -depth / 2 },
            { x: -width / 2, y: 0, z: depth / 2 },
            { x: width / 2, y: 0, z: depth / 2 },
            { x: -width / 2, y: height, z: depth / 2 },
            { x: width / 2, y: height, z: depth / 2 },
        ];

        corners.forEach(pos => {
            const connector = new THREE.Mesh(connectorGeo, connectorMat);
            connector.position.set(pos.x, pos.y, pos.z);
            group.add(connector);
        });

        this.volatileGroup.add(group);
    }

    private renderLightbars(width: number, height: number, depth: number) {
        if (!this.volatileGroup || !this.device) return;

        const env = this.device.environmentAttributes;
        const lightSensors = env?.lightSensors || (env?.lightSensor ? [env.lightSensor] : []);

        if (lightSensors.length === 0) return;

        const sensorCoords = env?.sensorCoordinates || {};
        const count = lightSensors.length;

        // Calculate grid for scaling
        let cols: number;
        let rows: number;

        if (count === 2) {
            // User requested: 2 lights = halfed y (depth) but keep x (width) full
            cols = 1;
            rows = 2;
        } else {
            cols = Math.ceil(Math.sqrt(count));
            rows = Math.ceil(count / cols);
        }

        const scaleX = 1 / cols;
        const scaleZ = 1 / rows;

        lightSensors.forEach((entityId) => {
            const coords = sensorCoords[entityId];
            if (!coords) return;

            // Use sensor coordinates for placement, but respect the height (Z) specifically
            this.addLightbarModel(
                coords.x - width / 2,
                coords.z, // This is the sensor Z, mapped to Three.js Y
                coords.y - depth / 2,
                width * scaleX,
                depth * scaleZ
            );
        });
    }

    private addLightbarModel(x: number, y: number, z: number, modelWidth: number, modelDepth: number) {
        if (!this.volatileGroup) return;

        const frameWidth = modelWidth * 0.95;
        const frameDepth = modelDepth * 0.95;
        const frameHeight = 2.5;

        const group = new THREE.Group();
        group.position.set(x, y, z);

        // 1. Main Frame
        const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, 3);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.2 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        group.add(frame);

        // 2. Light Bars
        const lightBarCount = 6;
        const lightBarWidth = Math.max(1, 4 * (modelWidth / 120)); // Scale bar width slightly
        const spacing = frameWidth / (lightBarCount - 1);

        if (!this.ledMaterial) {
            this.ledMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0,
                metalness: 0.5,
                roughness: 0.1
            });
        }

        for (let i = 0; i < lightBarCount; i++) {
            const barGroup = new THREE.Group();
            const posX = (i * spacing) - (frameWidth / 2);
            barGroup.position.x = posX;

            const barGeo = new THREE.BoxGeometry(lightBarWidth, frameHeight * 0.8, frameDepth);
            const bar = new THREE.Mesh(barGeo, frameMat);
            barGroup.add(bar);

            const ledStripGeo = new THREE.PlaneGeometry(lightBarWidth * 0.8, frameDepth * 0.95);
            const ledStrip = new THREE.Mesh(ledStripGeo, this.ledMaterial);
            ledStrip.rotation.x = Math.PI / 2;
            ledStrip.position.y = -(frameHeight * 0.4) - 0.1;
            barGroup.add(ledStrip);

            const ledCount = 8;
            const ledSpacing = frameDepth / (ledCount + 1);
            for (let j = 1; j <= ledCount; j++) {
                const dotGeo = new THREE.CircleGeometry(0.3, 8);
                const dot = new THREE.Mesh(dotGeo, this.ledMaterial);
                dot.rotation.x = Math.PI / 2;
                dot.position.y = -(frameHeight * 0.4) - 0.12;
                dot.position.z = (j * ledSpacing) - (frameDepth / 2);
                barGroup.add(dot);
            }
            group.add(barGroup);
        }

        const boxGeo = new THREE.BoxGeometry(Math.min(15, frameWidth * 0.2), 5, Math.min(12, frameDepth * 0.2));
        const box = new THREE.Mesh(boxGeo, frameMat);
        box.position.y = frameHeight;
        group.add(box);

        this.volatileGroup.add(group);
    }

    private renderFans(width: number, height: number, depth: number) {
        if (!this.volatileGroup || !this.device) return;

        const env = this.device.environmentAttributes;
        const fanEntities = env?.circulationFanEntities || (env?.circulationFanEntity ? [env.circulationFanEntity] : []);
        if (fanEntities.length === 0) return;

        const sensorCoords = env?.sensorCoordinates || {};

        fanEntities.forEach((entityId) => {
            let coords = sensorCoords[entityId];

            // Provide default coordinates if missing (default to top-back-left corner)
            if (!coords) {
                coords = { x: 0, y: 0, z: height * 0.8, rotation: 0 };
            }

            const stateObj = this.hass?.states[entityId];
            let fanSpeed = 0;

            if (stateObj) {
                const val = parseFloat(stateObj.state);
                if (!isNaN(val)) {
                    if (val > 10) fanSpeed = val / 10;
                    else fanSpeed = val;
                } else if (stateObj.state === 'on') {
                    if (stateObj.attributes.percentage !== undefined && stateObj.attributes.percentage !== null) {
                        fanSpeed = stateObj.attributes.percentage / 10;
                    } else {
                        fanSpeed = 5;
                    }
                }
            }

            fanSpeed = Math.max(0, Math.min(10, fanSpeed));

            // Snap circulation fans to vertical frame poles (x/y 0 or maxDimension)
            const snappedX = coords.x < width / 2 ? 0 : width;
            const snappedY = coords.y < depth / 2 ? 0 : depth;

            const fanGroup = this.createFanModel(fanSpeed, coords.rotation || 0, entityId);

            // Set position relative to snapped pole position
            fanGroup.position.set(
                snappedX - width / 2,
                coords.z,
                snappedY - depth / 2
            );

            // Auto-rotate fan to point inward if it's strictly at a corner and no rotation is specified
            if (coords.rotation === 0 || coords.rotation === undefined) {
                const angleX = snappedX === 0 ? 45 : -45;
                const angleY = snappedY === 0 ? 45 : -45;
                fanGroup.rotation.y = (angleX + angleY) * Math.PI / 180;
            }

            // Track fan head for animation
            const head = fanGroup.getObjectByName("fanHead");
            if (head) this._fanHeads.push(head);

            this.volatileGroup!.add(fanGroup);
            this.sensorMeshes.set(entityId, fanGroup);
        });

        // 6. Render Exhaust Fans
        const exhaustEntities = env?.exhaustFanEntities || (env?.exhaustEntity ? [env.exhaustEntity] : []);
        exhaustEntities.forEach((entityId) => {
            const coords = sensorCoords[entityId];
            if (!coords) return;

            let exhaustSpeed = 0;
            const stateObj = this.hass?.states[entityId];
            if (stateObj) {
                const val = parseFloat(stateObj.state);
                if (!isNaN(val)) {
                    if (val > 10) exhaustSpeed = val / 10;
                    else exhaustSpeed = val;
                } else if (stateObj.attributes?.percentage !== undefined) {
                    exhaustSpeed = stateObj.attributes.percentage / 10;
                } else if (stateObj.state === 'on') {
                    exhaustSpeed = 5;
                }
            }
            exhaustSpeed = Math.max(0, Math.min(10, exhaustSpeed));

            const exhaustGroup = this.createExhaustModel(exhaustSpeed, coords.rotation || 0, entityId);
            exhaustGroup.position.set(
                coords.x - width / 2,
                coords.z,
                coords.y - depth / 2
            );

            this._exhaustFans.push(exhaustGroup);
            this.volatileGroup!.add(exhaustGroup);
            this.sensorMeshes.set(entityId, exhaustGroup);
        });
    }

    private createExhaustModel(exhaustSpeed: number, baseRotation: number, entityId: string): THREE.Group {
        const group = new THREE.Group();
        group.userData = { exhaustSpeed, baseRotation, entityId, isExhaust: true };
        group.rotation.y = (baseRotation * Math.PI) / 180;

        // Main Body (Cylinder)
        const bodyGeo = new THREE.CylinderGeometry(15, 15, 30, 24);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Tapered Ports (Intake/Exhaust)
        const portGeo = new THREE.CylinderGeometry(11, 15, 12, 24);
        portGeo.rotateX(Math.PI / 2);

        const intakePort = new THREE.Mesh(portGeo, bodyMat);
        intakePort.position.z = -21;
        intakePort.name = "intake";
        group.add(intakePort);

        const exhaustPort = new THREE.Mesh(portGeo, bodyMat);
        exhaustPort.position.z = 21;
        exhaustPort.name = "exhaust";
        exhaustPort.rotation.x = Math.PI;
        group.add(exhaustPort);

        // Decorative Ribs (similar to image)
        const ribGeo = new THREE.TorusGeometry(15.5, 0.5, 8, 32);
        ribGeo.rotateX(Math.PI / 2);
        const ribMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });

        const rib1 = new THREE.Mesh(ribGeo, ribMat);
        rib1.position.z = -10;
        group.add(rib1);

        const rib2 = new THREE.Mesh(ribGeo, ribMat);
        rib2.position.z = 10;
        group.add(rib2);

        // Control Box
        const boxGeo = new THREE.BoxGeometry(6, 16, 14);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(13, 0, 0);
        group.add(box);

        // Label/Logo panel on box
        const logoGeo = new THREE.PlaneGeometry(12, 14);
        const logoMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2 });
        const logo = new THREE.Mesh(logoGeo, logoMat);
        logo.position.set(16.1, 0, 0);
        logo.rotation.y = Math.PI / 2;
        group.add(logo);

        // Stand/Bracket
        const bracketGroup = new THREE.Group();
        const baseGeo = new THREE.BoxGeometry(20, 1, 16);
        const baseMesh = new THREE.Mesh(baseGeo, bodyMat);
        baseMesh.position.y = -18;
        bracketGroup.add(baseMesh);

        const legGeo = new THREE.BoxGeometry(2, 6, 16);
        const leg1 = new THREE.Mesh(legGeo, bodyMat);
        leg1.position.set(-9, -15, 0);
        bracketGroup.add(leg1);
        const leg2 = new THREE.Mesh(legGeo, bodyMat);
        leg2.position.set(9, -15, 0);
        bracketGroup.add(leg2);

        group.add(bracketGroup);

        // Internal Blades
        const bladesGroup = new THREE.Group();
        bladesGroup.name = "exhaustBlades";
        const bladeGeo = new THREE.BoxGeometry(28, 0.5, 6);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 });
        for (let i = 0; i < 4; i++) {
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.rotation.z = (i * Math.PI) / 2;
            blade.rotation.y = 0.2; // Angle
            bladesGroup.add(blade);
        }
        group.add(bladesGroup);

        return group;
    }

    private createSensorProbeModel(color: string): THREE.Group {
        const group = new THREE.Group();

        // 1. Cable (Black, dangling down slightly)
        const cablePath = new THREE.CurvePath<THREE.Vector3>();
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 40, 0),    // Top spawn point
            new THREE.Vector3(0, 20, 0),    // Control point
            new THREE.Vector3(0, 10, 5),    // Control point
            new THREE.Vector3(0, 5, 0)      // Connect to gland
        );
        cablePath.add(curve);
        const cableGeo = new THREE.TubeGeometry(curve, 10, 0.4, 8, false);
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
        const cable = new THREE.Mesh(cableGeo, cableMat);
        group.add(cable);

        // 2. Cable Gland (Grey/Metallic)
        const glandGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 12);
        const glandMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });
        const gland = new THREE.Mesh(glandGeo, glandMat);
        gland.position.y = 3.5;
        group.add(gland);

        // 3. Probe Body (White)
        const bodyGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = -4;
        group.add(body);

        // 4. Protective Cage/Filter (Metallic Grey)
        const cageGroup = new THREE.Group();
        cageGroup.position.y = -12;

        // Perforated look using wires/tubes or a mesh with texture (simplest is another cylinder)
        const filterGeo = new THREE.CylinderGeometry(2.4, 2.4, 6, 16);
        const filterMat = new THREE.MeshStandardMaterial({
            color: 0xbbbbbb,
            metalness: 0.6,
            roughness: 0.3,
            wireframe: false
        });
        const filter = new THREE.Mesh(filterGeo, filterMat);
        cageGroup.add(filter);

        // Add rings for detail
        for (let i = -1; i <= 1; i++) {
            const ringGeo = new THREE.TorusGeometry(2.5, 0.1, 8, 24);
            const ring = new THREE.Mesh(ringGeo, glandMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = i * 2.5;
            cageGroup.add(ring);
        }

        group.add(cageGroup);

        // 5. Active Indicator (The Glowing Diode/Value color)
        // We'll place a small glowing ring between body and filter
        const diodeGeo = new THREE.TorusGeometry(2.51, 0.2, 8, 24);
        const diodeMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9
        });
        const diode = new THREE.Mesh(diodeGeo, diodeMat);
        diode.rotation.x = Math.PI / 2;
        diode.position.y = -10;
        group.add(diode);

        // Scale the whole thing to fit the scene
        group.scale.set(0.3, 0.3, 0.3);

        return group;
    }

    private createFanModel(fanSpeed: number, baseRotation: number, entityId: string): THREE.Group {
        const group = new THREE.Group();
        group.rotation.y = (baseRotation * Math.PI) / 180;
        group.userData = { fanSpeed, baseRotation, entityId };

        const plasticMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.2 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.5 });

        // 1. Clip Assembly (clamps to the vertical pole)
        const clipGroup = new THREE.Group();

        // Clamp body
        const clampGeo = new THREE.BoxGeometry(3, 5, 4);
        const clamp = new THREE.Mesh(clampGeo, plasticMat);
        clamp.position.set(0, 0, 1.5); // Offset from center of pole
        clipGroup.add(clamp);

        // Clamp jaws wrapping around the pole
        const jawGeo = new THREE.TorusGeometry(1.2, 0.4, 8, 12, Math.PI * 1.2);
        const topJaw = new THREE.Mesh(jawGeo, plasticMat);
        topJaw.rotation.x = Math.PI / 2;
        topJaw.position.set(0, 2, 0);
        clipGroup.add(topJaw);

        const bottomJaw = new THREE.Mesh(jawGeo, plasticMat);
        bottomJaw.rotation.x = Math.PI / 2;
        bottomJaw.position.set(0, -2, 0);
        clipGroup.add(bottomJaw);

        group.add(clipGroup);

        // 2. Connecting Arm and Swivel Joint
        const armGroup = new THREE.Group();
        armGroup.position.set(0, 0, 3);

        const armGeo = new THREE.CylinderGeometry(0.8, 0.8, 4, 12);
        armGeo.rotateX(Math.PI / 2);
        const arm = new THREE.Mesh(armGeo, plasticMat);
        arm.position.z = 2;
        armGroup.add(arm);

        const jointGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const joint = new THREE.Mesh(jointGeo, accentMat);
        joint.position.z = 4;
        armGroup.add(joint);

        group.add(armGroup);

        // 3. Fan Head (Motor + Cage + Blades) - Pointing towards +Z
        const oscillatingGroup = new THREE.Group();
        oscillatingGroup.name = "fanHead";
        oscillatingGroup.position.set(0, 0, 8.5);
        group.add(oscillatingGroup);

        // Motor housing
        const motorGeo = new THREE.CylinderGeometry(3, 3.5, 5, 16);
        motorGeo.rotateX(Math.PI / 2);
        const motor = new THREE.Mesh(motorGeo, plasticMat);
        motor.position.z = -2.5;
        oscillatingGroup.add(motor);

        // Control button/dial on motor back
        const knobGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
        knobGeo.rotateX(Math.PI / 2);
        const knob = new THREE.Mesh(knobGeo, accentMat);
        knob.position.z = -5;
        oscillatingGroup.add(knob);

        // Fan Cage - Sleek circular design
        const cageRadius = 15;
        const cageDepth = 5;

        // Back grill plate
        const backPlateGeo = new THREE.CircleGeometry(cageRadius, 32);
        const backPlateMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const backPlate = new THREE.Mesh(backPlateGeo, backPlateMat);
        backPlate.position.z = -0.5;
        oscillatingGroup.add(backPlate);

        // Outer Cage Rim
        const rimGeo = new THREE.TorusGeometry(cageRadius, 0.6, 8, 64);
        const rim = new THREE.Mesh(rimGeo, accentMat);
        rim.position.z = cageDepth / 2;
        oscillatingGroup.add(rim);

        const backRim = new THREE.Mesh(rimGeo, accentMat);
        backRim.position.z = -cageDepth / 2;
        oscillatingGroup.add(backRim);

        // Radial Grill Bars (Spiral effect like image)
        const grillCount = 24;
        const grillMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        for (let i = 0; i < grillCount; i++) {
            const angle = (i / grillCount) * Math.PI * 2;
            const barGeo = new THREE.CylinderGeometry(0.15, 0.15, cageRadius, 8);
            const bar = new THREE.Mesh(barGeo, grillMat);

            // Positioning bars to create a spiral-like front grill
            bar.position.set(Math.cos(angle) * cageRadius / 2, Math.sin(angle) * cageRadius / 2, cageDepth / 2);
            bar.rotation.z = angle + Math.PI / 4; // Slanted for spiral look
            oscillatingGroup.add(bar);
        }

        // Center Logo Hub
        const logoGeo = new THREE.CylinderGeometry(3, 3, 0.5, 16);
        logoGeo.rotateX(Math.PI / 2);
        const logo = new THREE.Mesh(logoGeo, plasticMat);
        logo.position.z = cageDepth / 2 + 0.2;
        oscillatingGroup.add(logo);

        const iconGeo = new THREE.PlaneGeometry(2, 2);
        const iconMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.z = cageDepth / 2 + 0.4;
        oscillatingGroup.add(icon);

        // 4. Blades
        const bladesGroup = new THREE.Group();
        bladesGroup.name = "fanBlades";
        bladesGroup.position.z = 1;
        oscillatingGroup.add(bladesGroup);

        const bladeLength = 13;
        const bladeWidth = 5;
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.bezierCurveTo(bladeWidth, bladeLength * 0.4, bladeWidth, bladeLength * 0.8, 0, bladeLength);
        bladeShape.bezierCurveTo(-bladeWidth, bladeLength * 0.8, -bladeWidth, bladeLength * 0.4, 0, 0);

        const bladeGeo = new THREE.ShapeGeometry(bladeShape);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            side: THREE.DoubleSide,
            roughness: 0.1,
            metalness: 0.3
        });

        // Hub for blades
        const hubGeo = new THREE.CylinderGeometry(2, 2, 2, 16);
        hubGeo.rotateX(Math.PI / 2);
        bladesGroup.add(new THREE.Mesh(hubGeo, plasticMat));

        for (let i = 0; i < 3; i++) {
            const bladePivot = new THREE.Group();
            bladePivot.rotation.z = (i * Math.PI * 2) / 3;

            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.rotation.x = -0.3; // Attack angle
            bladePivot.add(blade);
            bladesGroup.add(bladePivot);
        }

        return group;
    }

    private renderBreeze(width: number, height: number, depth: number) {
        if (!this.volatileGroup) return;

        // Create a pool of wind particles
        const particleCount = 400; // More particles for better effect
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount); // 0-1 lifecycle

        // Inherit fan positions for initial spawn (will be reset in animate loop)
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000; // Hide initially
            positions[i * 3 + 2] = 0;
            lifetimes[i] = Math.random(); // Random start phase
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

        const material = new THREE.PointsMaterial({
            color: 0xaec4c7, // Light breezy blue-grey
            size: 0.8,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.windParticles = new THREE.Points(geometry, material);
        this.windParticles.name = "windSystem";
        this.volatileGroup.add(this.windParticles);
    }

    private renderPlants(width: number, height: number, depth: number) {
        if (!this.volatileGroup || !this.device) return;

        const plants = this.device.plants || [];
        const plantsPerRow = this.device.plantsPerRow || 3;
        const effectiveRows = PlantUtils.calculateEffectiveRows(this.device);

        const cellWidth = width / plantsPerRow;
        const cellDepth = depth / effectiveRows;

        // Create a grid map for quick lookup
        const gridMap = new Map<string, PlantEntity>();
        plants.forEach(p => {
            const r = (p.attributes?.row ?? 1);
            const c = (p.attributes?.col ?? 1);
            gridMap.set(`${r},${c}`, p);
        });

        for (let rowIdx = 0; rowIdx < effectiveRows; rowIdx++) {
            for (let colIdx = 0; colIdx < plantsPerRow; colIdx++) {
                const row = rowIdx + 1;
                const col = colIdx + 1;
                const plant = gridMap.get(`${row},${col}`);

                const plantGroup = new THREE.Group();

                // Calculate position
                const posX = (colIdx + 0.5) * cellWidth - width / 2;
                const posZ = (rowIdx + 0.5) * cellDepth - depth / 2;
                plantGroup.position.set(posX, 0, posZ);

                // 1. Create Pot
                const potHeight = Math.min(25, cellWidth * 0.4);
                const potRadius = Math.min(12, cellWidth * 0.35);
                const pot = this.createPotModel(potRadius, potHeight);
                plantGroup.add(pot);

                if (plant) {
                    // 2. Create Plant
                    const stage = PlantUtils.getPlantStage(plant);
                    const plantModel = this.createPlantModel(stage, potHeight);
                    plantGroup.add(plantModel);
                }

                // 3. Create HitBox for Raycasting
                const hitBoxHeight = plant ? potHeight + 50 : potHeight;
                const hitBoxGeo = new THREE.CylinderGeometry(potRadius * 1.5, potRadius * 1.5, hitBoxHeight, 8);
                const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
                const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
                hitBox.position.y = hitBoxHeight / 2;

                if (plant) {
                    hitBox.userData = { plant };
                } else {
                    hitBox.userData = { emptySlot: { row: rowIdx, col: colIdx } };
                }

                plantGroup.add(hitBox);
                this._plantHitBoxes.push(hitBox);

                this.volatileGroup?.add(plantGroup);
            }
        }
    }

    private _getInteractionFromPoint(clientX: number, clientY: number): { plant?: PlantEntity, emptySlot?: { row: number, col: number } } | null {
        if (!this.container || !this.camera || this._plantHitBoxes.length === 0) return null;

        const rect = this.container.getBoundingClientRect();
        this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(this._mouse, this.camera);
        // Intersect ONLY against simple hitboxes, NON-RECURSIVE
        const intersects = this._raycaster.intersectObjects(this._plantHitBoxes, false);

        if (intersects.length > 0) {
            return intersects[0].object.userData || null;
        }
        return null;
    }

    private _handleMouseMove(e: MouseEvent) {
        if (this.isDragging) return;

        // Throttle raycasting to ~30fps to save CPU
        const now = performance.now();
        if (now - this._lastRaycastTime < 32) return;
        this._lastRaycastTime = now;

        const interaction = this._getInteractionFromPoint(e.clientX, e.clientY);

        if (interaction) {
            this._hoveredPlant = interaction.plant || null;
            const rect = this.container!.getBoundingClientRect();
            this._tooltipPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            this.container!.style.cursor = 'pointer';
        } else {
            this._hoveredPlant = null;
            if (this.container) this.container.style.cursor = 'default';
        }
    }

    private _handleMouseClick(e: MouseEvent) {
        if (this.isDragging) return;

        const interaction = this._getInteractionFromPoint(e.clientX, e.clientY);
        if (interaction && this.store) {
            if (interaction.plant) {
                this.store.handlePlantClick(interaction.plant);
            } else if (interaction.emptySlot) {
                this.store.openAddPlantDialog(interaction.emptySlot.row, interaction.emptySlot.col);
            }
        }
    }

    private _handleKeyDown = (e: KeyboardEvent) => {
        if (!this.keyboardRotateEnabled) return;
        this._keysPressed.add(e.code);

        // Prevent scroll if keys are for rotation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
            // Only prevent if mouse is over or card is focusable
            e.preventDefault();
        }
    }

    private _handleKeyUp = (e: KeyboardEvent) => {
        this._keysPressed.delete(e.code);
    }

    private createPotModel(radius: number, height: number): THREE.Group {
        const group = new THREE.Group();

        // Rounded Ceramic Pot
        const points = [];
        for (let i = 0; i < 10; i++) {
            const t = i / 9;
            const r = radius * (0.8 + 0.2 * Math.sin(t * Math.PI));
            const y = t * height;
            points.push(new THREE.Vector2(r, y));
        }
        const potGeo = new THREE.LatheGeometry(points, 32);
        const potMat = new THREE.MeshStandardMaterial({
            color: 0x212121,
            roughness: 0.6,
            metalness: 0.2
        });
        const pot = new THREE.Mesh(potGeo, potMat);
        group.add(pot);

        // Soil Layer
        const soilGeo = new THREE.CircleGeometry(radius * 0.95, 32);
        const soilMat = new THREE.MeshStandardMaterial({
            color: 0x3d2b1f, // Rich dark brown
            roughness: 0.9
        });
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = height * 0.95;
        group.add(soil);

        // Perlite Specs
        for (let i = 0; i < 20; i++) {
            const specGeo = new THREE.SphereGeometry(radius * 0.02, 4, 4);
            const specMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const spec = new THREE.Mesh(specGeo, specMat);

            const r = Math.random() * radius * 0.8;
            const theta = Math.random() * Math.PI * 2;
            spec.position.set(
                Math.cos(theta) * r,
                height * 0.95 + 0.1,
                Math.sin(theta) * r
            );
            group.add(spec);
        }

        return group;
    }

    private createLeaf(scale: number, color: number): THREE.Group {
        const leafGroup = new THREE.Group();
        const leafletCount = 7;

        for (let i = 0; i < leafletCount; i++) {
            const leaflet = new THREE.Group();
            const angle = ((i - (leafletCount - 1) / 2) * 0.3);
            const leafLength = scale * (1 - Math.abs(i - (leafletCount - 1) / 2) * 0.15);

            const geo = new THREE.SphereGeometry(1, 8, 8);
            geo.scale(leafLength * 0.2, 0.05, leafLength);

            const mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.8,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.z = leafLength / 2;

            leaflet.add(mesh);
            leaflet.rotation.y = angle;
            leafGroup.add(leaflet);
        }

        return leafGroup;
    }

    private createPlantModel(stage: PlantStage, potHeight: number): THREE.Group {
        const group = new THREE.Group();

        let scale = 1;
        let density = 1;
        let color = 0x4caf50; // Veg Green

        switch (stage) {
            case PlantStage.SEEDLING:
                scale = 0.2;
                density = 0.3;
                break;
            case PlantStage.CLONE:
                scale = 0.3;
                density = 0.4;
                break;
            case PlantStage.VEG:
                scale = 0.7;
                density = 0.8;
                break;
            case PlantStage.FLOWER:
                scale = 1.0;
                density = 1.0;
                color = 0x2e7d32;
                break;
            case PlantStage.MOTHER:
                scale = 1.3;
                density = 1.2;
                break;
            default:
                scale = 0.8;
                color = 0x8d6e63;
        }

        const stemHeight = 50 * scale;
        const stemRadius = 1.5 * scale;

        // Stem
        const stemGeo = new THREE.CylinderGeometry(stemRadius * 0.5, stemRadius, stemHeight, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.9 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = potHeight + stemHeight / 2;
        group.add(stem);

        // Foliage
        const nodeCount = Math.floor(8 * density);
        for (let i = 0; i < nodeCount; i++) {
            const hFactor = (i / nodeCount);
            const nodeHeight = potHeight + (stemHeight * 0.2) + (hFactor * stemHeight * 0.8);
            const leavesAtNode = Math.floor(4 * (1 - hFactor * 0.5));

            for (let j = 0; j < leavesAtNode; j++) {
                const leafScale = 15 * scale * (1.2 - hFactor);
                const leaf = this.createLeaf(leafScale, color);
                leaf.position.y = nodeHeight;
                leaf.rotation.y = (j / leavesAtNode) * Math.PI * 2 + (i * 0.5);
                leaf.rotation.x = Math.PI * 0.15 + (Math.random() * 0.2);
                group.add(leaf);
            }
        }

        // Colas for Flower stage
        if (stage === PlantStage.FLOWER) {
            const budMat = new THREE.MeshStandardMaterial({
                color: 0x81c784,
                roughness: 0.5,
                emissive: 0x1b5e20,
                emissiveIntensity: 0.2
            });

            // Main Top Cola
            const colaGeo = new THREE.DodecahedronGeometry(6 * scale, 1);
            colaGeo.scale(0.8, 1.5, 0.8);
            const mainCola = new THREE.Mesh(colaGeo, budMat);
            mainCola.position.y = potHeight + stemHeight;
            group.add(mainCola);

            // Side Buds
            for (let i = 0; i < 4; i++) {
                const sideBud = new THREE.Mesh(new THREE.DodecahedronGeometry(4 * scale, 0), budMat);
                const angle = (i / 4) * Math.PI * 2;
                sideBud.position.set(
                    Math.cos(angle) * 8 * scale,
                    potHeight + stemHeight * 0.7,
                    Math.sin(angle) * 8 * scale
                );
                group.add(sideBud);
            }
        }

        return group;
    }

    private addAxisLabels(width: number, height: number, depth: number) {
        const createAxisLabel = (text: string, x: number, y: number, z: number) => {
            const div = document.createElement('div');
            div.className = 'axis-label';
            div.textContent = text;
            const label = new CSS2DObject(div);
            label.position.set(x, y, z);
            this.volatileGroup?.add(label);
        };

        createAxisLabel(`X: ${width}cm`, 0, -10, depth / 2 + 10);
        createAxisLabel(`Y: ${depth}cm`, width / 2 + 10, -10, 0);
        createAxisLabel(`Z: ${height}cm`, -width / 2 - 10, height / 2, -depth / 2);
    }

    private handleResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer?.setSize(width, height);
    }

    private _animateLoop() {
        this.animationId = requestAnimationFrame(() => this._animateLoop());

        // Keyboard Rotation logic
        if (this.keyboardRotateEnabled && this.controls && this._keysPressed.size > 0 && this.camera) {
            const rotSpeed = 0.05 * this.keyboardRotateSpeed;
            if (this._keysPressed.has('ArrowLeft') || this._keysPressed.has('KeyA')) {
                (this.controls as any)._rotateLeft(rotSpeed);
            }
            if (this._keysPressed.has('ArrowRight') || this._keysPressed.has('KeyD')) {
                (this.controls as any)._rotateLeft(-rotSpeed);
            }
            if (this._keysPressed.has('ArrowUp') || this._keysPressed.has('KeyW')) {
                (this.controls as any)._rotateUp(rotSpeed);
            }
            if (this._keysPressed.has('ArrowDown') || this._keysPressed.has('KeyS')) {
                (this.controls as any)._rotateUp(-rotSpeed);
            }
        }

        if (this.controls) this.controls.update();

        // Update shaders
        this._animatingMaterials.forEach(mat => {
            if (mat.uniforms.u_time) {
                mat.uniforms.u_time.value = performance.now() / 1000;
            }
        });

        // Update Lightbar animation
        if (this.ledMaterial && this.device) {
            const isDay = this.device.biologicalMetrics?.isDay;
            if (isDay) {
                const breath = 0.8 + Math.sin(performance.now() / 1000 * 2) * 0.2;
                this.ledMaterial.emissiveIntensity = breath;
            } else {
                this.ledMaterial.emissiveIntensity = 0;
            }
        }

        // Update Fan Animations
        if (this._fanHeads.length > 0) {
            const time = performance.now() / 1000;
            this._fanHeads.forEach(head => {
                const parent = head.parent; // Fan Group
                if (parent && parent.userData.fanSpeed > 0) {
                    // Oscillation
                    head.rotation.y = Math.sin(time * 2) * (Math.PI / 4);

                    // Blades
                    const blades = head.getObjectByName("fanBlades");
                    if (blades) {
                        blades.rotation.z += (parent.userData.fanSpeed * 0.1);
                    }
                }
            });
        }

        // Update Exhaust Fan Animations (Blades)
        if (this._exhaustFans.length > 0) {
            this._exhaustFans.forEach(group => {
                const speed = group.userData.exhaustSpeed;
                if (speed > 0) {
                    const blades = group.getObjectByName("exhaustBlades");
                    if (blades) {
                        blades.rotation.z += (speed * 0.2);
                    }
                }
            });
        }

        // Update wind particles
        if (this.windParticles && this.volatileGroup) {
            const positions = this.windParticles.geometry.attributes.position.array as Float32Array;
            const velocities = this.windParticles.geometry.attributes.velocity.array as Float32Array;
            const lifetimes = this.windParticles.geometry.attributes.lifetime.array as Float32Array;

            const activeFans = this._fanHeads.filter(head => head.parent && head.parent.userData.fanSpeed > 0);
            const activeExhausts = this._exhaustFans.filter(group => group.userData.exhaustSpeed > 0);

            if (activeFans.length === 0 && activeExhausts.length === 0) {
                for (let i = 0; i < positions.length / 3; i++) {
                    positions[i * 3 + 1] = -1000;
                }
            } else {
                for (let i = 0; i < positions.length / 3; i++) {
                    lifetimes[i] -= 0.02;

                    if (lifetimes[i] <= 0) {
                        const totalActive = activeFans.length + activeExhausts.length;
                        const randSource = Math.floor(Math.random() * totalActive);

                        if (randSource < activeFans.length) {
                            // Standard Fan logic
                            const fanHead = activeFans[randSource];
                            const worldPos = new THREE.Vector3();
                            fanHead.getWorldPosition(worldPos);

                            const forward = new THREE.Vector3();
                            fanHead.getWorldDirection(forward);

                            const fanSpeed = fanHead.parent?.userData.fanSpeed || 5;
                            const speed = (2.5 + Math.random()) * (fanSpeed / 5);

                            // Origin in front of blades (~10 units forward)
                            positions[i * 3] = worldPos.x + forward.x * 10 + (Math.random() - 0.5) * 5;
                            positions[i * 3 + 1] = worldPos.y + forward.y * 10 + (Math.random() - 0.5) * 5;
                            positions[i * 3 + 2] = worldPos.z + forward.z * 10 + (Math.random() - 0.5) * 5;

                            velocities[i * 3] = forward.x * speed;
                            velocities[i * 3 + 1] = forward.y * speed + (Math.random() - 0.5) * 0.5;
                            velocities[i * 3 + 2] = forward.z * speed;
                            lifetimes[i] = 1.0;
                        } else {
                            // Exhaust Fan logic (Suck in and Blow out)
                            const exhaustGroup = activeExhausts[randSource - activeFans.length];
                            const worldPos = new THREE.Vector3();
                            exhaustGroup.getWorldPosition(worldPos);

                            const angle = exhaustGroup.rotation.y;
                            const exhaustSpeed = exhaustGroup.userData.exhaustSpeed;
                            const speed = (2.0 + Math.random()) * (exhaustSpeed / 5);

                            const isSuction = Math.random() > 0.5;
                            const dir = isSuction ? 1 : 1; // Both move forward relative to their local start

                            if (isSuction) {
                                // Moves TOWARDS intake
                                const startOffset = -40;
                                positions[i * 3] = worldPos.x + Math.sin(angle) * startOffset + (Math.random() - 0.5) * 10;
                                positions[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 10;
                                positions[i * 3 + 2] = worldPos.z + Math.cos(angle) * startOffset + (Math.random() - 0.5) * 10;

                                velocities[i * 3] = Math.sin(angle) * speed;
                                velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
                                velocities[i * 3 + 2] = Math.cos(angle) * speed;
                                lifetimes[i] = 0.5; // Short life for intake particles
                            } else {
                                // Moves AWAY from exhaust
                                const startOffset = 21;
                                positions[i * 3] = worldPos.x + Math.sin(angle) * startOffset + (Math.random() - 0.5) * 6;
                                positions[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 6;
                                positions[i * 3 + 2] = worldPos.z + Math.cos(angle) * startOffset + (Math.random() - 0.5) * 6;

                                velocities[i * 3] = Math.sin(angle) * speed * 1.5;
                                velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
                                velocities[i * 3 + 2] = Math.cos(angle) * speed * 1.5;
                                lifetimes[i] = 1.0;
                            }
                        }
                    } else {
                        positions[i * 3] += velocities[i * 3];
                        positions[i * 3 + 1] += velocities[i * 3 + 1];
                        positions[i * 3 + 2] += velocities[i * 3 + 2];
                    }
                }
            }
            this.windParticles.geometry.attributes.position.needsUpdate = true;
            this.windParticles.geometry.attributes.lifetime.needsUpdate = true;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            if (this.labelRenderer) {
                this.labelRenderer.render(this.scene, this.camera);
            }
        }
    }

    private cleanup() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.dragControls) {
            this.dragControls.dispose();
            this.dragControls = undefined;
        }
        if (this.renderer) {
            this.renderer.dispose();
            // Check if the renderer's DOM element is still a child before removing
            if (this.renderer.domElement.parentNode === this.container) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer = undefined;
        }
        if (this.labelRenderer) {
            // No dispose method for CSS2DRenderer, but remove its DOM element
            if (this.labelRenderer.domElement.parentNode === this.container) {
                this.container.removeChild(this.labelRenderer.domElement);
            }
            this.labelRenderer = undefined;
        }
        this.scene = undefined;
        this.camera = undefined;
        this.controls = undefined;
        this.sensorMeshes.clear();
    }

    private updateDragControls() {
        if (!this.camera || !this.renderer || !this.scene) return;

        // Remove existing drag controls
        if (this.dragControls) {
            this.dragControls.dispose();
            this.dragControls = undefined;
        }

        if (this.editMode3DCords && this.sensorMeshes.size > 0) {
            const draggableObjects = Array.from(this.sensorMeshes.values());
            this.dragControls = new DragControls(draggableObjects, this.camera, this.renderer.domElement);

            // Disable orbit controls during dragging
            this.dragControls.addEventListener('dragstart', () => {
                if (this.controls) this.controls.enabled = false;
                this.isDragging = true;
            });

            this.dragControls.addEventListener('drag', (event) => {
                const mesh = event.object as THREE.Mesh;
                for (const [entityId, storedMesh] of this.sensorMeshes.entries()) {
                    if (storedMesh === mesh) {
                        this.updateShaderPositions();
                        // Force UI update to reflect new slider values if panel is open
                        this.requestUpdate();
                        break;
                    }
                }
            });

            this.dragControls.addEventListener('dragend', (event: any) => {
                if (this.controls) this.controls.enabled = true;
                this.isDragging = false;

                const mesh = event.object as THREE.Mesh;
                const width = this.device?.dimensions?.width ?? 120;
                const height = this.device?.dimensions?.height ?? 200;
                const depth = this.device?.dimensions?.length ?? (this.device?.dimensions as any)?.depth ?? 120;

                for (const [entityId, storedMesh] of this.sensorMeshes.entries()) {
                    if (storedMesh === mesh) {
                        // FIX: Reverted coordinate mapping logic to match updateScene and updateSensorPosition
                        // Three.js (mesh): x=x-w/2, y=z+h/2, z=y-d/2
                        // x_raw = mesh.x + w/2
                        // y_raw = mesh.z + d/2
                        // z_raw = mesh.y - h/2 (wait, updateScene says y is height, so mesh.y is height)
                        // In updateScene: mesh.position.y = pos.y + height/2; where pos.y = coords.z - height/2
                        // So mesh.y = coords.z.

                        const x = mesh.position.x + width / 2;
                        const y = mesh.position.z + depth / 2;
                        const z = mesh.position.y;

                        this.updateSensorPosition(entityId, x, y, z);
                        break;
                    }
                }
            });
        }
    }

    private updateSensorVisuals() {
        if (!this.sensorMeshes.size) return;

        const width = this.device?.dimensions?.width || 100;

        this.sensorMeshes.forEach((mesh) => {
            // 1. Handle Visual Outline
            const existingOutline = mesh.children.find(c => c.type === 'Mesh' && (c as THREE.Mesh).material instanceof THREE.MeshBasicMaterial && ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHex() === 0x448aff);
            if (existingOutline) {
                mesh.remove(existingOutline);
                (existingOutline as THREE.Mesh).geometry.dispose();
                ((existingOutline as THREE.Mesh).material as THREE.Material).dispose();
            }

            // 2. Handle Hit Area (Invisible Sphere for Dragging)
            const existingHitArea = mesh.children.find(c => c.name === 'hitArea');
            if (existingHitArea) {
                mesh.remove(existingHitArea);
                (existingHitArea as THREE.Mesh).geometry.dispose();
                ((existingHitArea as THREE.Mesh).material as THREE.Material).dispose();
            }

            // 3. Handle Label Styling
            const labelObj = mesh.children.find(c => c instanceof CSS2DObject) as CSS2DObject | undefined;
            if (labelObj) {
                if (this.editMode3DCords) {
                    labelObj.element.classList.add('editing');
                } else {
                    labelObj.element.classList.remove('editing');
                }
            }

            // Add new visual aids if in edit mode
            if (this.editMode3DCords) {
                // Visual Outline
                const outlineGeometry = new THREE.SphereGeometry(width * 0.024, 16, 16);
                const outlineMat = new THREE.MeshBasicMaterial({
                    color: 0x448aff,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.BackSide
                });
                const outline = new THREE.Mesh(outlineGeometry, outlineMat);
                mesh.add(outline);

                // Larger Hit Area (Invisible but raycastable)
                // Size: 0.05 (2.5x sensor size) for easier grabbing
                const hitGeometry = new THREE.SphereGeometry(width * 0.05, 16, 16);
                const hitMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0, // Invisible
                    visible: true // Raycaster needs visible=true usually, or checks regardless? Three.js raycaster checks visible objects.
                });
                const hitArea = new THREE.Mesh(hitGeometry, hitMat);
                hitArea.name = 'hitArea';
                mesh.add(hitArea);
            }
        });
    }

    private async updateSensorPosition(entityId: string, x: number, y: number, z: number, rotation?: number) {
        if (!this.hass || !this.device) return;

        try {
            await this.hass.callWS({
                type: 'growspace_manager/update_sensor_coordinates',
                growspace_id: this.device.deviceId,
                entity_id: entityId,
                x: Math.round(x),
                y: Math.round(y),
                z: Math.round(z),
                rotation: rotation !== undefined ? Math.round(rotation) : undefined,
            });

            // Emit event for parent components
            this.dispatchEvent(
                new CustomEvent('sensor-position-changed', {
                    detail: { entityId, x, y, z, rotation },
                    bubbles: true,
                    composed: true,
                })
            );
        } catch (err) {
            console.error('Failed to update sensor position:', err);
        }
    }

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

    private setMetric(m: 'temperature' | 'humidity' | 'vpd') {
        this.selectedMetric = m;
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

    private updateShaderPositions() {
        if (!this.volatileGroup || !this.device) return;

        const width = this.device.dimensions?.width ?? 120;
        const height = this.device.dimensions?.height ?? 200;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        const heatmapPositions: THREE.Vector3[] = [];
        const heatmapValues: number[] = [];
        const entityIds = Array.from(this.sensorMeshes.keys());

        // Define Metric Ranges for Normalization
        const ranges = {
            temperature: { min: 18, max: 32 },
            humidity: { min: 30, max: 85 },
            vpd: { min: 0.4, max: 2.0 }
        };
        const range = ranges[this.selectedMetric];

        entityIds.forEach(id => {
            if (!this.isSensorOfMetric(id)) return; // Exclude light from heatmap calculation

            const mesh = this.sensorMeshes.get(id);
            if (mesh) {
                const val = this.getMetricValue(id);
                const normalizedVal = Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));

                // Relative to center for shader
                heatmapPositions.push(new THREE.Vector3(
                    mesh.position.x,
                    mesh.position.y - height / 2,
                    mesh.position.z
                ));
                heatmapValues.push(normalizedVal);
            }
        });

        const volMesh = this.volatileGroup.children.find(c => (c as any).material?.uniforms?.u_sensorPositions);
        if (volMesh) {
            const uniforms = (volMesh as THREE.Mesh).material as THREE.ShaderMaterial;
            uniforms.uniforms.u_sensorPositions.value = heatmapPositions.concat(Array(16 - heatmapPositions.length).fill(new THREE.Vector3()));
            uniforms.uniforms.u_sensorValues.value = heatmapValues.concat(Array(16 - heatmapValues.length).fill(0));
            uniforms.uniforms.u_sensorCount.value = heatmapPositions.length;
        }
    }

    private handleSliderInput(entityId: string, axis: 'x' | 'y' | 'z' | 'rotation', value: number) {
        const mesh = this.sensorMeshes.get(entityId);
        if (!mesh || !this.device) return;

        const width = this.device.dimensions?.width ?? 120;
        const height = this.device.dimensions?.height ?? 200;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        if (axis === 'x') mesh.position.x = value - width / 2;
        if (axis === 'y') mesh.position.z = value - depth / 2;
        if (axis === 'z') mesh.position.y = value;
        if (axis === 'rotation') {
            // Find the fan group and update its rotation
            this.volatileGroup?.traverse(obj => {
                if (obj.userData?.entityId === entityId) {
                    obj.rotation.y = (value * Math.PI) / 180;
                    obj.userData.baseRotation = value;
                }
            });
        }

        this.updateShaderPositions();
        this.requestUpdate();
    }

    private handleSliderChange(entityId: string) {
        const mesh = this.sensorMeshes.get(entityId);
        if (!mesh || !this.device) return;

        const width = this.device.dimensions?.width ?? 120;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        const x = mesh.position.x + width / 2;
        const y = mesh.position.z + depth / 2;
        const z = mesh.position.y;

        let rotation: number | undefined;
        this.volatileGroup?.traverse(obj => {
            if (obj.userData?.entityId === entityId) {
                rotation = obj.userData.baseRotation;
            }
        });

        this.updateSensorPosition(entityId, x, y, z, rotation);
    }

    private renderTooltip() {
        if (!this._hoveredPlant) return nothing;

        const plant = this._hoveredPlant;
        const strainName = plant.attributes.strain || 'Unknown';
        const pheno = plant.attributes.phenotype;
        const stage = PlantUtils.getPlantStage(plant);
        const stageColor = PlantUtils.getPlantStageColor(stage);
        const daysInStage = PlantUtils.calculatePlantAge(plant);

        // Find breeder in strain library
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
                <div class="toggles-container">
                    <div class="toggle-item" @click=${() => this.showPlants = !this.showPlants}>
                        <ha-checkbox
                            .checked=${this.showPlants}
                            @change=${(e: any) => { e.stopPropagation(); this.showPlants = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Plants</span>
                    </div>
                    <div class="toggle-item" @click=${() => this.showLights = !this.showLights}>
                        <ha-checkbox
                            .checked=${this.showLights}
                            @change=${(e: any) => { e.stopPropagation(); this.showLights = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Lights</span>
                    </div>
                    <div class="toggle-item" @click=${() => this.showFans = !this.showFans}>
                        <ha-checkbox
                            .checked=${this.showFans}
                            @change=${(e: any) => { e.stopPropagation(); this.showFans = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Fans</span>
                    </div>
                    <div class="toggle-item" @click=${() => this.showHeatmap = !this.showHeatmap}>
                        <ha-checkbox
                            .checked=${this.showHeatmap}
                            @change=${(e: any) => { e.stopPropagation(); this.showHeatmap = e.target.checked; }}
                        ></ha-checkbox>
                        <span>Heatmap</span>
                    </div>
                </div>
            </div>
        </div>
        ${this.editMode3DCords ? html`
            <div class="side-panel">
                <h3>Sensor Positions</h3>
                ${Array.from(this.sensorMeshes.keys()).map((id, i) => {
            const mesh = this.sensorMeshes.get(id)!;
            const width = this.device?.dimensions?.width ?? 120;
            const height = this.device?.dimensions?.height ?? 200;
            const depth = this.device?.dimensions?.length ?? (this.device?.dimensions as any)?.depth ?? 120;
            const x = Math.round(mesh.position.x + width / 2);
            const y = Math.round(mesh.position.z + depth / 2);
            const z = Math.round(mesh.position.y);
            const rotation = Math.round(this.device?.environmentAttributes?.sensorCoordinates?.[id]?.rotation || 0);

            return html`
                        <div class="sensor-item">
                            <div class="sensor-header">
                                <span>${this.isFan(id) ? 'Fan' : (this.isExhaust(id) ? 'Exhaust' : `Sensor ${i + 1}`)}</span>
                                <span style="font-size: 9px; opacity: 0.5">${id.split('.').pop()}</span>
                            </div>
                            <div class="slider-group">
                                <div class="slider-row">
                                    <label>X</label>
                                    <input type="range" class="edit-slider" min="0" max=${width} .value=${x} 
                                        @input=${(e: any) => this.handleSliderInput(id, 'x', parseFloat(e.target.value))}
                                        @change=${() => this.handleSliderChange(id)}>
                                    <span class="slider-val">${x}</span>
                                </div>
                                <div class="slider-row">
                                    <label>Y</label>
                                    <input type="range" class="edit-slider" min="0" max=${depth} .value=${y} 
                                        @input=${(e: any) => this.handleSliderInput(id, 'y', parseFloat(e.target.value))}
                                        @change=${() => this.handleSliderChange(id)}>
                                    <span class="slider-val">${y}</span>
                                </div>
                                <div class="slider-row">
                                    <label>Z</label>
                                    <input type="range" class="edit-slider" min="0" max=${height} .value=${z} 
                                        @input=${(e: any) => this.handleSliderInput(id, 'z', parseFloat(e.target.value))}
                                        @change=${() => this.handleSliderChange(id)}>
                                    <span class="slider-val">${z}</span>
                                </div>
                                ${(this.isFan(id) || this.isExhaust(id)) ? html`
                                    <div class="slider-row">
                                        <label>R</label>
                                        <input type="range" class="edit-slider" min="0" max="360" .value=${rotation} 
                                            @input=${(e: any) => this.handleSliderInput(id, 'rotation', parseFloat(e.target.value))}
                                            @change=${() => this.handleSliderChange(id)}>
                                        <span class="slider-val">${rotation}°</span>
                                    </div>
                                ` : nothing}
                            </div>
                        </div>
                    `;
        })}
                
                <h3>View Controls</h3>
                <div class="sensor-item">
                    <div class="toggle-item" @click=${() => {
                    this.keyboardRotateEnabled = !this.keyboardRotateEnabled;
                    this._dispatchViewOptionChange('keyboard_rotate_enabled', this.keyboardRotateEnabled);
                }}>
                        <ha-checkbox
                            .checked=${this.keyboardRotateEnabled}
                            @change=${(e: any) => {
                    e.stopPropagation();
                    this.keyboardRotateEnabled = e.target.checked;
                    this._dispatchViewOptionChange('keyboard_rotate_enabled', this.keyboardRotateEnabled);
                }}
                        ></ha-checkbox>
                        <span>Keyboard Rotation</span>
                    </div>
                    <div class="slider-group">
                        <div class="slider-row">
                            <label style="width: 40px">Speed</label>
                            <input type="range" class="edit-slider" min="0.1" max="5.0" step="0.1" 
                                .value=${this.keyboardRotateSpeed} 
                                @input=${(e: any) => {
                    this.keyboardRotateSpeed = parseFloat(e.target.value);
                }}
                                @change=${(e: any) => {
                    this._dispatchViewOptionChange('keyboard_rotate_speed', parseFloat(e.target.value));
                }}>
                            <span class="slider-val">${this.keyboardRotateSpeed.toFixed(1)}x</span>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}

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
}
