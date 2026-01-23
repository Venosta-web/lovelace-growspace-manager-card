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
import { strainLibraryContext } from '../context';

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

    @consume({ context: strainLibraryContext, subscribe: true })
    strainLibrary: StrainEntry[] = [];

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
    private isDragging = false;
    private _mouse = new THREE.Vector2();
    private _raycaster = new THREE.Raycaster();

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
    .header-actions {
        display: flex;
        gap: 4px;
        pointer-events: auto;
    }
    .header-actions ha-icon-button {
        color: #607d8b;
        transition: all 0.2s ease;
    }
    .header-actions ha-icon-button.active {
        color: #448aff;
        background: rgba(68, 138, 255, 0.15);
        border-radius: 50%;
    }
    .header-actions ha-icon-button:hover {
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
    }

    protected firstUpdated() {
        this.initThree();
        if (this.container) {
            this.resizeObserver?.observe(this.container);
        }
    }

    protected updated(changedProps: PropertyValues) {
        if (!this.device) return;

        const sensors = Object.keys(this.device.environmentAttributes?.sensorCoordinates || {});
        const env = this.device.environmentAttributes;
        const fanEntities = env?.circulationFanEntities || (env?.circulationFanEntity ? [env.circulationFanEntity] : []);
        const allTracked = Array.from(new Set([...sensors, ...fanEntities]));

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
            this._hoveredPlant = null;
        });

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

        // Also clear any stray axis labels that might have been added to scene directly
        const strays = this.scene.children.filter(c => !(c as any).isLight && c !== this.volatileGroup);
        strays.forEach(s => this.scene?.remove(s));

        // Get Dimensions with robust defaults - fallback to depth if length is missing
        const width = this.device.dimensions?.width ?? 120;
        const height = this.device.dimensions?.height ?? 200;
        const depth = this.device.dimensions?.length ?? (this.device.dimensions as any)?.depth ?? 120;

        // 1. Draw Growspace Box (Glowing)
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);

        // Inner thin line
        const edges = new THREE.EdgesGeometry(boxGeometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x448aff, transparent: true, opacity: 0.8 })
        );
        line.position.y = height / 2;
        this.volatileGroup.add(line);

        // Outer glow lines (simulated with slightly larger geometry)
        for (let i = 1; i <= 3; i++) {
            const glowGeo = new THREE.BoxGeometry(width + i * 0.5, height + i * 0.5, depth + i * 0.5);
            const glowEdges = new THREE.EdgesGeometry(glowGeo);
            const glowLine = new THREE.LineSegments(
                glowEdges,
                new THREE.LineBasicMaterial({
                    color: 0x448aff,
                    transparent: true,
                    opacity: 0.15 / i,
                    blending: THREE.AdditiveBlending
                })
            );
            glowLine.position.y = height / 2;
            this.volatileGroup.add(glowLine);
        }

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

        if (heatmapPositions.length > 0) {
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
        const sensorGeometry = new THREE.SphereGeometry(width * 0.02, 16, 16);

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

            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(healthColor),
                transparent: true,
                opacity: 0.9
            });
            const mesh = new THREE.Mesh(sensorGeometry, mat);

            // Set position relative to center
            mesh.position.set(
                coords.x - width / 2,
                coords.z,
                coords.y - depth / 2
            );

            // Store mesh for drag controls
            this.sensorMeshes.set(entityId, mesh);
            this.volatileGroup!.add(mesh);

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
                mesh.add(outline);
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
            mesh.add(label);
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
        this.renderPlants(width, height, depth);

        // 8. Draw Growlight Lightbars
        this.renderLightbars(width, height, depth);

        // 9. Draw Circulation Fans
        this.renderFans(width, height, depth);

        // 10. Draw Breeze Animation
        this.renderBreeze(width, height, depth);
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

            // Provide default coordinates if missing so they show up and can be moved
            if (!coords) {
                coords = { x: width / 2, y: depth / 2, z: height * 0.8, rotation: 0 };
            }

            const stateObj = this.hass?.states[entityId];
            let fanSpeed = 0;

            if (stateObj) {
                const val = parseFloat(stateObj.state);
                // Check if the state is mapped 0-10 or 0-100 directly
                if (!isNaN(val)) {
                    // Try to deduce scale. If > 10, likely percentage.
                    if (val > 10) fanSpeed = val / 10;
                    else fanSpeed = val;
                } else if (stateObj.state === 'on') {
                    // Check percentage attribute
                    if (stateObj.attributes.percentage !== undefined && stateObj.attributes.percentage !== null) {
                        fanSpeed = stateObj.attributes.percentage / 10;
                    } else {
                        // Default to medium speed (5) if just ON without attributes
                        fanSpeed = 5;
                    }
                }
            }

            // Ensure speed is within 0-10 range
            fanSpeed = Math.max(0, Math.min(10, fanSpeed));

            const fanGroup = this.createFanModel(fanSpeed, coords.rotation || 0, entityId);

            // Set position relative to center
            fanGroup.position.set(
                coords.x - width / 2,
                coords.z,
                coords.y - depth / 2
            );

            this.volatileGroup!.add(fanGroup);
            this.sensorMeshes.set(entityId, fanGroup);
        });
    }

    private createFanModel(fanSpeed: number, baseRotation: number, entityId: string): THREE.Group {
        const group = new THREE.Group();
        group.rotation.y = (baseRotation * Math.PI) / 180;
        group.userData = { fanSpeed, baseRotation, entityId };

        // Scale Factor for 15.24cm blades (approx 6 inches)
        // Previous blade was 5 units. new is 15.24. Scale approx 3x.

        // 1. Base/Stand - adjustable height/telescopic look
        const standRadius = 1.5;
        const standHeight = 30; // Taller stand for larger fan
        const standGeo = new THREE.CylinderGeometry(standRadius, standRadius, standHeight, 16);
        const standMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.y = -standHeight / 2;
        group.add(stand);

        // Base plate
        const plateGeo = new THREE.CylinderGeometry(8, 8, 1, 32);
        const plate = new THREE.Mesh(plateGeo, standMat);
        plate.position.y = -standHeight;
        group.add(plate);

        // 2. Motor Housing (Oscillating part)
        const oscillatingGroup = new THREE.Group();
        oscillatingGroup.name = "fanHead";
        group.add(oscillatingGroup);

        const motorGeo = new THREE.CylinderGeometry(4, 4, 10, 16);
        motorGeo.rotateX(Math.PI / 2);
        const motor = new THREE.Mesh(motorGeo, standMat);
        oscillatingGroup.add(motor);

        // 3. Fan Cage - Scaled to ~17-18cm radius to fit 15.24cm blades
        const cageRadius = 17.5;
        const cageGeo = new THREE.SphereGeometry(cageRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5); // Hemisphere-ish or flattened sphere
        cageGeo.scale(1, 1, 0.3); // Flatten

        // Back Cage
        const cageMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const backCage = new THREE.Mesh(cageGeo, cageMat);
        backCage.rotation.x = Math.PI; // Face back
        backCage.position.z = 2; // Behind blades
        oscillatingGroup.add(backCage);

        // Front Cage
        const frontCage = new THREE.Mesh(cageGeo, cageMat);
        frontCage.position.z = 2;
        oscillatingGroup.add(frontCage);

        // Cage Rim
        const rimGeo = new THREE.TorusGeometry(cageRadius, 0.5, 8, 64);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.z = 2;
        oscillatingGroup.add(rim);


        // 4. Blades
        const bladesGroup = new THREE.Group();
        bladesGroup.name = "fanBlades";
        bladesGroup.position.z = 2.5; // Inside cage
        oscillatingGroup.add(bladesGroup);

        // 15.24cm Blade Length
        const bladeLength = 15.24;
        const bladeWidth = 4.5;

        // Blade Geometry (Leaf shape approx)
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(bladeWidth, bladeLength * 0.3, bladeWidth, bladeLength * 0.7, 0, bladeLength);
        shape.bezierCurveTo(-bladeWidth, bladeLength * 0.7, -bladeWidth, bladeLength * 0.3, 0, 0);

        const bladeGeo = new THREE.ShapeGeometry(shape);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            side: THREE.DoubleSide,
            roughness: 0.2,
            metalness: 0.1
        });

        // Hub
        const hubGeo = new THREE.CylinderGeometry(2, 2, 1, 16);
        hubGeo.rotateX(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        bladesGroup.add(hub);

        // Create 3 Blades
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            // Rotate around Z axis for placement
            blade.rotation.z = (i * Math.PI * 2) / 3;
            // Twist blade for aerodynamics look
            blade.rotateY(0.3);
            bladesGroup.add(blade);
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

        plants.forEach((plant) => {
            const row = (plant.attributes?.row ?? 1) - 1;
            const col = (plant.attributes?.col ?? 1) - 1;

            if (row < 0 || row >= effectiveRows || col < 0 || col >= plantsPerRow) return;

            const plantGroup = new THREE.Group();

            // Calculate position
            const posX = (col + 0.5) * cellWidth - width / 2;
            const posZ = (row + 0.5) * cellDepth - depth / 2;
            plantGroup.position.set(posX, 0, posZ);

            // 1. Create Pot
            const potHeight = Math.min(25, cellWidth * 0.4);
            const potRadius = Math.min(12, cellWidth * 0.35);
            const pot = this.createPotModel(potRadius, potHeight);
            plantGroup.add(pot);

            // 2. Create Plant
            const stage = PlantUtils.getPlantStage(plant);
            const plantModel = this.createPlantModel(stage, potHeight);
            plantGroup.add(plantModel);

            // Add plant data for hover detection
            plantGroup.userData = { plant };

            this.volatileGroup?.add(plantGroup);
        });
    }

    private _handleMouseMove(e: MouseEvent) {
        if (!this.container || !this.camera || !this.volatileGroup) return;

        const rect = this.container.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(this._mouse, this.camera);
        const intersects = this._raycaster.intersectObjects(this.volatileGroup.children, true);

        let foundPlant: PlantEntity | null = null;
        if (intersects.length > 0) {
            for (const intersect of intersects) {
                let obj: THREE.Object3D | null = intersect.object;
                while (obj && obj !== this.volatileGroup) {
                    if (obj.userData?.plant) {
                        foundPlant = obj.userData.plant;
                        break;
                    }
                    obj = obj.parent;
                }
                if (foundPlant) break;
            }
        }

        if (foundPlant) {
            this._hoveredPlant = foundPlant;
            this._tooltipPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        } else {
            this._hoveredPlant = null;
        }
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
        if (this.controls) this.controls.update();

        this.scene?.traverse(obj => {
            if ((obj as any).material?.uniforms?.u_time) {
                (obj as any).material.uniforms.u_time.value = performance.now() / 1000;
            }
        });

        // Update Lightbar animation
        if (this.ledMaterial && this.device) {
            const isDay = this.device.biologicalMetrics?.isDay;
            if (isDay) {
                // Subtle breathing animation when on
                const breath = 0.8 + Math.sin(performance.now() / 1000 * 2) * 0.2;
                this.ledMaterial.emissiveIntensity = breath;
            } else {
                this.ledMaterial.emissiveIntensity = 0;
            }
        }

        // Update Fan Animations
        if (this.volatileGroup) {
            const time = performance.now() / 1000;
            this.volatileGroup.traverse((obj) => {
                if (obj.name === "fanHead") {
                    const fanRoot = obj.parent;
                    if (fanRoot && (fanRoot.userData?.fanSpeed > 0)) {
                        // Oscillation: ±45 degrees (PI/4)
                        obj.rotation.y = Math.sin(time * 2) * (Math.PI / 4);
                    }
                }
                if (obj.name === "fanBlades") {
                    const fanRoot = obj.parent?.parent;
                    if (fanRoot && (fanRoot.userData?.fanSpeed > 0)) {
                        const speed = fanRoot.userData.fanSpeed;
                        // Blade rotation: Scale speed 1-10 to reasonable rotation speed
                        // Level 1 = 0.1 rad/frame, Level 10 = 1.0 rad/frame
                        obj.rotation.z += (speed * 0.1);
                    }
                }
            });

            // Update wind particles
            if (this.windParticles && this.volatileGroup) {
                const positions = this.windParticles.geometry.attributes.position.array as Float32Array;
                const velocities = this.windParticles.geometry.attributes.velocity.array as Float32Array;
                const lifetimes = this.windParticles.geometry.attributes.lifetime.array as Float32Array;

                // Find all active fans (speed > 0)
                const activeFans: THREE.Group[] = [];
                this.volatileGroup.traverse((obj) => {
                    if (obj.name === "fanHead" && (obj.parent?.userData?.fanSpeed > 0)) {
                        activeFans.push(obj as THREE.Group); // Push the HEAD, which rotates
                    }
                });

                if (activeFans.length === 0) {
                    // Hide particles
                    for (let i = 0; i < positions.length / 3; i++) {
                        positions[i * 3 + 1] = -1000;
                    }
                } else {
                    for (let i = 0; i < positions.length / 3; i++) {
                        lifetimes[i] -= 0.02; // Decay

                        if (lifetimes[i] <= 0) {
                            // Respawn at a random active fan
                            const fanHead = activeFans[Math.floor(Math.random() * activeFans.length)];

                            // Get world position/rotation of the fan head (where air comes from)
                            const worldPos = new THREE.Vector3();
                            fanHead.getWorldPosition(worldPos);

                            // Direction: The fan head faces -Z (or +Z) depending on model. 
                            // My model: blades are at Z=2.5. Cage faces Z.
                            // I want to shoot particles in the direction of the rotation.
                            const direction = new THREE.Vector3(0, 0, 1);
                            direction.applyQuaternion(fanHead.parent!.quaternion); // Base rotation
                            // Add head oscillation? Usually oscillation is local Y.
                            // Actually, simplified: Use the parent (Base) rotation for main direction, 
                            // and maybe minor add for head.
                            // But wait, fanHead rotates. I should use fanHead world rotation?

                            // Let's use simple forward vector from the fan Group (base) + oscillation
                            const fanGroup = fanHead.parent!;
                            const angle = fanGroup.rotation.y + fanHead.rotation.y;

                            // Assuming 0 rotation points to +Z? 
                            // In createFanModel: group.rotation.y = baseRotation.
                            // Need to verify default "Forward".
                            // Usually identity rotation means facing +Z or -Z.

                            const speed = 2.5 + Math.random();
                            velocities[i * 3] = Math.sin(angle) * speed;
                            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5; // Slight vertical spread
                            velocities[i * 3 + 2] = Math.cos(angle) * speed;

                            positions[i * 3] = worldPos.x + (Math.random() - 0.5) * 5;
                            positions[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 5;
                            positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 5;

                            lifetimes[i] = 1.0;
                        } else {
                            // Move
                            positions[i * 3] += velocities[i * 3];
                            positions[i * 3 + 1] += velocities[i * 3 + 1];
                            positions[i * 3 + 2] += velocities[i * 3 + 2];
                        }
                    }
                }
                this.windParticles.geometry.attributes.position.needsUpdate = true;
                this.windParticles.geometry.attributes.lifetime.needsUpdate = true;
            }
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

    render() {
        const maxLen = this.getMaxHistoryLength();
        const ranges = {
            temperature: { min: 18, max: 32, unit: '°C' },
            humidity: { min: 30, max: 85, unit: '%' },
            vpd: { min: 0.4, max: 2.0, unit: ' kPa' }
        };
        const range = ranges[this.selectedMetric];

        return html`
      <div id="container">
        <!-- Three.js Canvas and LabelRenderer will be appended here once -->
        
        ${this.renderTooltip()}

        <div class="header">
            <h2>Grow Space 3D Heatmap</h2>
            <div class="header-actions">
                <ha-icon-button
                    class="${this.editMode3DCords ? 'active' : ''}"
                    .path=${'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z'}
                    @click=${this.toggleEditMode}
                    title="Edit sensor positions"
                ></ha-icon-button>
                <ha-icon-button
                    .path=${'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.35 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.47,5.32 14.87,5.07L14.49,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.51,2.42L9.13,5.07C8.53,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.35 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.95C7.96,18.34 8.53,18.68 9.13,18.93L9.51,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.49,21.58L14.87,18.93C15.47,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z'}
                ></ha-icon-button>
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
                                <span>${this.isFan(id) ? 'Fan' : `Sensor ${i + 1}`}</span>
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
                                ${this.isFan(id) ? html`
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
            <div class="legend-container">
                <div class="legend"></div>
                <div class="legend-labels">
                    <span>Low (${range.min}${range.unit})</span>
                    <span>High (${range.max}${range.unit})</span>
                </div>
            </div>
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
