
import * as THREE from 'three';
import { BaseRenderer } from './base-renderer';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class TankRenderer extends BaseRenderer {
    private _tankWaves: THREE.Mesh[] = [];

    public render() {
        this._tankWaves = [];
        const { device, volatileGroup, hass } = this.context;
        const width = device.dimensions?.width ?? 120;
        const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;
        const env = device.environmentAttributes;
        const tanks = env?.irrigationTanks || [];
        const sensorCoords = env?.sensorCoordinates || {};

        const currentTankIds = new Set<string>();

        const cMat = this.getSharedMaterial('tankContainerMat', () => new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, side: THREE.BackSide }));
        const fMat = this.getSharedMaterial('tankFrameMat', () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
        const eMat = this.getSharedMaterial('tankEdgeMat', () => new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 }));

        const cGeo = this.getSharedGeometry('tankContainerGeo', () => new THREE.BoxGeometry(30, 45, 30));
        const baseGeo = this.getSharedGeometry('tankBaseGeo', () => new THREE.BoxGeometry(32, 2, 32));
        const lidGeo = this.getSharedGeometry('tankLidGeo', () => new THREE.BoxGeometry(32, 4, 32));
        const capGeo = this.getSharedGeometry('tankCapGeo', () => new THREE.CylinderGeometry(5, 5, 4, 16));
        const liquidGeo = this.getSharedGeometry('tankLiquidGeo', () => new THREE.BoxGeometry(1, 1, 1));
        const waveGeo = this.getSharedGeometry('tankWaveGeo', () => new THREE.PlaneGeometry(30 * 0.94, 30 * 0.94, 20, 20));

        tanks.forEach((tank: any) => {
            const entityId = tank.sensorEntity;
            currentTankIds.add(entityId);
            let coords = sensorCoords[entityId] || { x: -width * 0.5, y: depth / 2, z: 0 };

            const isWarning = tank.isWarning;
            const fill = tank.fillLevel || 0;
            const liquidColor = isWarning ? 0xff4422 : 0x00aaff;
            const hex = isWarning ? '#f44336' : '#2196f3';

            let tankGroup = this.cache.get(entityId) as THREE.Group;
            if (!tankGroup) {
                tankGroup = new THREE.Group();

                const container = new THREE.Mesh(cGeo, cMat);
                container.position.y = 45 / 2;
                tankGroup.add(container);

                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cGeo), eMat);
                edges.position.y = 45 / 2;
                tankGroup.add(edges);

                const base = new THREE.Mesh(baseGeo, fMat);
                base.position.y = 1;
                tankGroup.add(base);

                const lid = new THREE.Mesh(lidGeo, fMat);
                lid.position.y = 45 + 1;
                tankGroup.add(lid);

                const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: liquidColor }));
                cap.name = 'cap';
                cap.position.set(0, 45 + 4.5, 0);
                tankGroup.add(cap);

                const lMat = new THREE.MeshStandardMaterial({
                    color: liquidColor, transparent: true, opacity: 0.75, emissive: liquidColor, emissiveIntensity: 0.2
                });
                const liquid = new THREE.Mesh(liquidGeo, lMat);
                liquid.name = 'liquid';
                tankGroup.add(liquid);

                const wMat = new THREE.MeshStandardMaterial({
                    color: liquidColor, transparent: true, opacity: 0.9, emissive: liquidColor, emissiveIntensity: 0.3, side: THREE.DoubleSide
                });
                const wave = new THREE.Mesh(waveGeo, wMat);
                wave.name = 'wave';
                wave.rotation.x = -Math.PI / 2;
                tankGroup.add(wave);

                const div = document.createElement('div');
                div.className = 'sensor-label tank-label';
                const label = new CSS2DObject(div);
                label.name = 'label';
                label.position.set(0, 45 * 0.5, 30 / 2 + 2);
                tankGroup.add(label);

                this.cache.set(entityId, tankGroup);
                volatileGroup.add(tankGroup);
            }

            // Update Dynamic Parts
            const fillPercent = Math.max(0.02, Math.min(1.0, fill / 100));
            const lHeight = (45 - 4) * fillPercent;

            const liquid = tankGroup.getObjectByName('liquid') as THREE.Mesh;
            if (liquid) {
                liquid.scale.set(30 * 0.94, lHeight, 30 * 0.94);
                liquid.position.y = lHeight / 2 + 2.1;
                (liquid.material as THREE.MeshStandardMaterial).color.set(liquidColor);
            }

            const wave = tankGroup.getObjectByName('wave') as THREE.Mesh;
            if (wave) {
                wave.position.y = lHeight + 2.15;
                (wave.material as THREE.MeshStandardMaterial).color.set(liquidColor);
                this._tankWaves.push(wave);
            }

            const cap = tankGroup.getObjectByName('cap') as THREE.Mesh;
            if (cap) (cap.material as THREE.MeshStandardMaterial).color.set(liquidColor);

            const label = tankGroup.getObjectByName('label') as CSS2DObject;
            if (label) {
                const newHTML = `
                    <div class="sensor-icon" style="background: ${hex}33; border-color: ${hex}">
                        <ha-icon icon="mdi:barrel" style="color: ${hex}; --mdc-icon-size: 10px"></ha-icon>
                    </div>
                    <span style="color: white; font-weight: 800; font-size: 13px;">${Math.round(fill)}%</span>
                `;
                if (label.element.innerHTML !== newHTML) label.element.innerHTML = newHTML;
            }

            tankGroup.position.set(coords.x - width / 2, 0, coords.y - depth / 2);
            if (coords.rotation) tankGroup.rotation.y = THREE.MathUtils.degToRad(coords.rotation);
            tankGroup.userData = { entityId, types: ['irrigation_tank'] };
            this.context.sensorMeshes.set(entityId, tankGroup);
        });

        // Cleanup
        this.cache.forEach((obj, key) => {
            if (!currentTankIds.has(key)) {
                volatileGroup.remove(obj);
                this.disposeObject(obj);
                this.cache.delete(key);
            }
        });
    }

    public animate(deltaTime: number) {
        if (this._tankWaves.length > 0) {
            const time = Date.now() * 0.003;
            this._tankWaves.forEach(wave => {
                const pos = wave.geometry.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const px = pos.getX(i);
                    const py = pos.getY(i);
                    const pz = Math.sin(px * 0.15 + time) * 0.8 + Math.cos(py * 0.15 + time) * 0.8;
                    pos.setZ(i, pz);
                }
                pos.needsUpdate = true;
            });
        }
    }
}
