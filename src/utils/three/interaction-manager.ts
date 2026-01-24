
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { SceneManager } from './scene-manager';
import { BaseRenderer } from './renderers/base-renderer';
import { PlantUtils } from '../plant-utils';

export class InteractionManager {
    private sceneManager: SceneManager;
    private container: HTMLElement;
    private dragControls?: DragControls;
    private hoveredPlant: any = null;
    private tooltipPos = { x: 0, y: 0 };
    private editMode: boolean = false;
    private mouseCallback?: (event: string, data?: any) => void;

    private _raycaster = new THREE.Raycaster();
    private _pointer = new THREE.Vector2();

    constructor(sceneManager: SceneManager, container: HTMLElement) {
        this.sceneManager = sceneManager;
        this.container = container;
        this.setupEventListeners();
    }

    public setEditMode(enabled: boolean) {
        this.editMode = enabled;
        this.updateDragControls();
        this.updateVisuals();
    }

    public setCallback(callback: (event: string, data?: any) => void) {
        this.mouseCallback = callback;
    }

    private setupEventListeners() {
        this.container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.container.addEventListener('mouseleave', () => {
            this.container.style.cursor = 'default';
            if (this.mouseCallback) this.mouseCallback('hover', null);
        });
        this.container.addEventListener('click', (e) => this.handleClick(e));
    }

    private handleMouseMove(event: MouseEvent) {
        if (!this.sceneManager.camera) return;

        const rect = this.container.getBoundingClientRect();
        this._pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this._pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.editMode) {
            // Drag checks are handled by DragControls
            return;
        }

        // Raycast for Plants
        this._raycaster.setFromCamera(this._pointer, this.sceneManager.camera);
        // We need to access plant hitboxes. PlantRenderer exposes them?
        // Actually, SceneManager -> volatiles -> find hitboxes
        // Or better: PlantRenderer should register hitboxes with SceneManager or InteractionManager?
        // Let's iterate volatiles and check userData.plant

        const intersects = this._raycaster.intersectObjects(this.sceneManager.volatileGroup.children, true);
        let foundPlant = null;

        for (const hit of intersects) {
            const mesh = hit.object;
            // Check for plant hitbox
            if (mesh.userData && (mesh.userData.plant || mesh.userData.emptySlot)) {
                foundPlant = mesh.userData.plant || mesh.userData.emptySlot;
                this.tooltipPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
                break;
            }
        }

        if (foundPlant !== this.hoveredPlant) {
            this.hoveredPlant = foundPlant;
            this.container.style.cursor = foundPlant ? 'pointer' : 'default';
            if (this.mouseCallback) {
                this.mouseCallback('hover', { plant: foundPlant, pos: this.tooltipPos });
            }
        } else if (foundPlant) {
            // Update pos if moving within same plant
            if (this.mouseCallback) {
                this.mouseCallback('hover', { plant: foundPlant, pos: { x: event.clientX - rect.left, y: event.clientY - rect.top } });
            }
        }
    }

    private handleClick(event: MouseEvent) {
        if (this.editMode) return;
        if (this.hoveredPlant) {
            // Dispatch plant click
            if (this.mouseCallback) this.mouseCallback('click', { plant: this.hoveredPlant });
        }
    }

    private updateDragControls() {
        if (this.dragControls) {
            this.dragControls.dispose();
            this.dragControls = undefined;
        }

        if (this.editMode && this.sceneManager.sensorMeshes.size > 0 && this.sceneManager.camera && this.sceneManager.renderer) {
            const draggableObjects = Array.from(this.sceneManager.sensorMeshes.values());
            this.dragControls = new DragControls(draggableObjects, this.sceneManager.camera, this.sceneManager.renderer.domElement);

            this.dragControls.addEventListener('dragstart', () => {
                this.sceneManager.controls.enabled = false;
            });

            this.dragControls.addEventListener('drag', (event: any) => {
                // Notify visual update (e.g. shader position)
                // We can tell SceneManager directly or via callback
                if (this.mouseCallback) this.mouseCallback('drag', { object: event.object });
            });

            this.dragControls.addEventListener('dragend', (event: any) => {
                this.sceneManager.controls.enabled = true;
                if (this.mouseCallback) this.mouseCallback('dragend', { object: event.object });
            });
        }
    }

    // Updates visual aids for edit mode (outlines, hit areas)
    // This logic was in heatmap-3d.ts:updateSensorVisuals
    private updateVisuals() {
        const meshes = this.sceneManager.sensorMeshes;
        // Access width from device? We need device context.
        // Assuming we look at mesh scale or generic size.
        // Or SceneManager passes context.
        // Let's use a fixed relative size or infer.
        // width = 120 default approx.

        meshes.forEach((mesh) => {
            // Cleanup old
            const oldOutline = mesh.children.find(c => c.name === 'editOutline');
            if (oldOutline) { mesh.remove(oldOutline); (oldOutline as THREE.Mesh).geometry.dispose(); }

            const oldHit = mesh.children.find(c => c.name === 'hitArea');
            if (oldHit) { mesh.remove(oldHit); (oldHit as THREE.Mesh).geometry.dispose(); }

            // Update CSS Label
            // We can't easily access CSS2DObject element classList here unless exposed.
            // But we can traverse.
            mesh.traverse(c => {
                if (c.constructor.name === 'CSS2DObject') {
                    const el = (c as any).element;
                    if (this.editMode) el.classList.add('editing');
                    else el.classList.remove('editing');
                }
            });

            if (this.editMode) {
                // Add Outline
                const g = new THREE.SphereGeometry(2.5, 16, 16); // Approx size
                const m = new THREE.MeshBasicMaterial({ color: 0x448aff, transparent: true, opacity: 0.3, side: THREE.BackSide });
                const outline = new THREE.Mesh(g, m);
                outline.name = 'editOutline';
                mesh.add(outline);

                // Hit Area
                const hg = new THREE.SphereGeometry(5, 16, 16);
                const hm = new THREE.MeshBasicMaterial({ visible: false }); // Raycaster hits invisible objects by default? No.
                // In DragControls, it uses Raycaster.
                // DragControls checks recursive children?

                const hit = new THREE.Mesh(hg, hm);
                hit.name = 'hitArea';
                hit.visible = false; // DragControls raycaster might skip invisible.
                // Actually Three.js raycaster DOES skip invisible by default.
                // But DragControls might pass a raycaster with unique params?
                // Usually people make it visible but opacity 0.
                hm.opacity = 0;
                hm.transparent = true;
                hit.visible = true;

                mesh.add(hit);
            }
        });
    }
}
