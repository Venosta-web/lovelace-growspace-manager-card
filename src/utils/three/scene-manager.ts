
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

import { RendererContext } from './renderers/base-renderer';
import { FrameRenderer } from './renderers/frame-renderer';
import { SensorRenderer } from './renderers/sensor-renderer';
import { FanRenderer } from './renderers/fan-renderer';
import { LightRenderer } from './renderers/light-renderer';
import { PlantRenderer } from './renderers/plant-renderer';
import { EquipmentRenderer } from './renderers/equipment-renderer';
import { TankRenderer } from './renderers/tank-renderer';
import { VpdCloudRenderer } from './renderers/vpd-cloud-renderer';

export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public labelRenderer: CSS2DRenderer;
    public controls: OrbitControls;
    public volatileGroup: THREE.Group;
    public sensorMeshes: Map<string, THREE.Group> = new Map();

    public renderers: any[] = [];
    private animationId?: number;
    private container: HTMLElement;

    // Context needs to be mutable or updated?
    // We pass the same context object reference to all renderers.
    private context: RendererContext;

    constructor(container: HTMLElement, device: any, hass: any, config: any = {}) {
        this.container = container;

        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        // 1. Setup Three.js
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
        container.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.left = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.labelRenderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        this.camera.position.set(300, 300, 300);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 500, 200);
        this.scene.add(directionalLight);

        this.volatileGroup = new THREE.Group();
        this.scene.add(this.volatileGroup);

        // 2. Initialize Context
        this.context = {
            device,
            hass,
            scene: this.scene,
            volatileGroup: this.volatileGroup,
            sensorMeshes: this.sensorMeshes,
            selectedMetric: 'temperature', // Default
            historyData: {},
            timelineIndex: -1,
            strainLibrary: config.strainLibrary || [],
            visibility: {
                plants: true,
                lights: true,
                fans: true,
                heatmap: true,
                tooltips: true
            },
            camera: this.camera
        };

        // 3. Initialize Renderers
        this.initRenderers();

        // 4. Start Loop
        this.animate = this.animate.bind(this);
        this.animate();

        // Resize Handler
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        // Initial resize
        setTimeout(() => this.handleResize(), 100);
    }

    private initRenderers() {
        this.renderers = [
            new FrameRenderer(this.context),
            new LightRenderer(this.context),
            new FanRenderer(this.context),
            new PlantRenderer(this.context),
            new EquipmentRenderer(this.context),
            new TankRenderer(this.context),
            new SensorRenderer(this.context),
            new VpdCloudRenderer(this.context)
        ];
    }

    // Called when props change (lit updated)
    public update(device: any, hass: any, selectedMetric: string, historyData: any, timelineIndex: number, strainLibrary: any[], visibility: any) {
        this.context.device = device;
        this.context.hass = hass;
        this.context.selectedMetric = selectedMetric;
        this.context.historyData = historyData;
        this.context.timelineIndex = timelineIndex;
        if (strainLibrary) this.context.strainLibrary = strainLibrary;
        if (visibility) this.context.visibility = visibility;

        this.renderScene();
    }

    public setCallbacks(callbacks: { requestUpdate?: () => void, getSensorValue?: (id: string, metric: string) => number | null }) {
        if (callbacks.requestUpdate) this.context.requestUpdate = callbacks.requestUpdate;
        if (callbacks.getSensorValue) this.context.getSensorValue = callbacks.getSensorValue;
    }

    private renderScene() {
        // We no longer clear the entire volatileGroup.
        // Renderers are now responsible for updating or disposing their own objects in the cache.
        this.sensorMeshes.clear();

        // Render all
        this.renderers.forEach(r => r.render());
    }

    private disposeObject(obj: THREE.Object3D) {
        // Helper stays for non-renderer objects if any,
        // but renderers manage their own now.
        obj.traverse((child: any) => {
            if (child.isCSS2DObject && child.element) {
                child.element.remove();
            }
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                else child.material.dispose();
            }
        });
    }

    public animate() {
        this.animationId = requestAnimationFrame(this.animate);
        this.controls.update();

        const deltaTime = 0.016; // Approx 60fps
        this.renderers.forEach(r => r.animate(deltaTime));

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    public handleResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    public dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);

        // Dispose all renderers (this cleans their caches)
        this.renderers.forEach(r => r.dispose());

        this.disposeObject(this.scene);
        this.renderer.dispose();

        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        if (this.labelRenderer.domElement && this.labelRenderer.domElement.parentNode) {
            this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
        }
    }

    // Interaction Helpers
    public raycast(pointer: THREE.Vector2, recursive: boolean = true) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, this.camera);
        // Raycast against volatileGroup
        return raycaster.intersectObjects(this.volatileGroup.children, recursive);
    }
}
