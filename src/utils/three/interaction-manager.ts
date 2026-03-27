
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { SceneManager } from './scene-manager';
import { BaseRenderer } from './renderers/base-renderer';
import { PlantUtils } from '../plant-utils';

export class InteractionManager {
    private sceneManager: SceneManager;
    private container: HTMLElement;
    public dragControls?: DragControls;
    private hoveredPlant: any = null;
    private tooltipPos = { x: 0, y: 0 };
    private editMode: boolean = false;
    public isDragging: boolean = false;
    private linkMode: boolean = false;

    private selectedForLink: string | null = null;
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
        if (!enabled) this.setLinkMode(false);
        this.updateDragControls();
        this.updateVisuals();
    }

    public setLinkMode(enabled: boolean) {
        this.linkMode = enabled;
        this.selectedForLink = null;
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

        if (this.editMode && !this.linkMode) {
            // Drag checks are handled by DragControls
            return;
        }

        // Raycast for Plants & Sensors
        this._raycaster.setFromCamera(this._pointer, this.sceneManager.camera);
        const intersects = this._raycaster.intersectObjects(this.sceneManager.volatileGroup.children, true);

        let foundPlant = null;
        let foundSensor = null;

        for (const hit of intersects) {
            const mesh = hit.object;
            // Check for plant hitbox
            if (!foundPlant && mesh.userData && (mesh.userData.plant || mesh.userData.emptySlot)) {
                foundPlant = mesh.userData.plant || mesh.userData.emptySlot;
                this.tooltipPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            }
            // Check for sensor/equipment
            if (!foundSensor && mesh.userData && mesh.userData.entityId) {
                foundSensor = mesh.userData.entityId;
            }
            if (foundPlant || foundSensor) break;
        }

        if (this.linkMode) {
            this.container.style.cursor = foundSensor ? 'pointer' : 'default';
            return;
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
        if (this.linkMode) {
            const rect = this.container.getBoundingClientRect();
            this._pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this._pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this._raycaster.setFromCamera(this._pointer, this.sceneManager.camera!);
            const intersects = this._raycaster.intersectObjects(this.sceneManager.volatileGroup.children, true);

            let entityId: string | null = null;
            for (const hit of intersects) {
                if (hit.object.userData && hit.object.userData.entityId) {
                    entityId = hit.object.userData.entityId;
                    break;
                }
            }

            if (entityId) {
                if (!this.selectedForLink) {
                    this.selectedForLink = entityId;
                    this.updateVisuals();
                } else if (this.selectedForLink === entityId) {
                    this.selectedForLink = null;
                    this.updateVisuals();
                } else {
                    // Emit link event
                    if (this.mouseCallback) {
                        this.mouseCallback('link', { from: this.selectedForLink, to: entityId });
                    }
                    this.selectedForLink = null;
                    this.updateVisuals();
                }
            }
            return;
        }

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

        if (this.editMode && !this.linkMode && this.sceneManager.sensorMeshes.size > 0 && this.sceneManager.camera && this.sceneManager.renderer) {
            const draggableObjects = Array.from(this.sceneManager.sensorMeshes.values());
            this.dragControls = new DragControls(draggableObjects, this.sceneManager.camera, this.sceneManager.renderer.domElement);

            this.dragControls.addEventListener('dragstart', () => {
                this.isDragging = true;
                this.sceneManager.controls.enabled = false;
            });


            this.dragControls.addEventListener('drag', (event: any) => {
                if (this.mouseCallback) this.mouseCallback('drag', { object: event.object });
            });

            this.dragControls.addEventListener('dragend', (event: any) => {
                this.isDragging = false;
                this.sceneManager.controls.enabled = true;
                if (this.mouseCallback) this.mouseCallback('dragend', { object: event.object });
            });

        }
    }

    // Updates visual aids for edit mode (outlines, hit areas)
    // This logic was in heatmap-3d.ts:updateSensorVisuals
    private updateVisuals() {
        const meshes = this.sceneManager.sensorMeshes;

        meshes.forEach((mesh, id) => {
            // Cleanup old
            const oldOutline = mesh.children.find(c => c.name === 'editOutline');
            if (oldOutline) { mesh.remove(oldOutline); (oldOutline as THREE.Mesh).geometry.dispose(); }

            const oldHit = mesh.children.find(c => c.name === 'hitArea');
            if (oldHit) { mesh.remove(oldHit); (oldHit as THREE.Mesh).geometry.dispose(); }

            // Update CSS Label
            mesh.traverse(c => {
                if (c.constructor.name === 'CSS2DObject') {
                    const el = (c as any).element;
                    if (this.editMode) el.classList.add('editing');
                    else el.classList.remove('editing');
                }
            });

            if (this.editMode) {
                const isSelected = this.selectedForLink === id;
                // Add Outline
                const g = new THREE.SphereGeometry(isSelected ? 6 : 2.5, 16, 16);
                const m = new THREE.MeshBasicMaterial({
                    color: isSelected ? 0x00ff00 : 0x448aff,
                    transparent: true,
                    opacity: isSelected ? 0.5 : 0.3,
                    side: THREE.BackSide
                });
                const outline = new THREE.Mesh(g, m);
                outline.name = 'editOutline';
                mesh.add(outline);

                // Hit Area
                const hg = new THREE.SphereGeometry(isSelected ? 7 : 5, 16, 16);
                const hm = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
                const hit = new THREE.Mesh(hg, hm);
                hit.name = 'hitArea';
                hit.visible = true;
                mesh.add(hit);
            }
        });
    }
}
