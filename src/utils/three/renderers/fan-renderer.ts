
import * as THREE from 'three';
import { BaseRenderer } from './base-renderer';
import { SensorTypeUtils } from '../../sensor-type-utils';

export class FanRenderer extends BaseRenderer {
    private fanHeads: THREE.Object3D[] = [];
    private fanSpeeds: number[] = []; // Speed multiplier for each fan

    public render() {
        this.fanHeads = [];
        this.fanSpeeds = [];

        const visibility = this.context.visibility || { fans: true };
        if (!visibility.fans) {
            this.dispose();
            return;
        }

        const { device, volatileGroup, hass } = this.context;
        const width = device.dimensions?.width ?? 120;
        const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;
        const height = device.dimensions?.height ?? 200;

        const env = device.environmentAttributes;
        const fanEntities = env?.circulationFanEntities || (env?.circulationFanEntity ? [env.circulationFanEntity] : []);
        const sensorCoords = env?.sensorCoordinates || {};

        const currentFanIds = new Set<string>();

        fanEntities.forEach(entityId => {
            currentFanIds.add(entityId);
            let coords = sensorCoords[entityId];
            if (!coords) {
                coords = { x: 0, y: 0, z: height * 0.8, rotation: 0 };
            }

            // Determine Fan Speed
            const stateObj = hass?.states[entityId];
            let fanSpeed = 0;
            if (stateObj) {
                const val = parseFloat(stateObj.state);
                if (!isNaN(val)) fanSpeed = val > 10 ? val / 10 : val;
                else if (stateObj.state === 'on') fanSpeed = stateObj.attributes.percentage ? stateObj.attributes.percentage / 10 : 5;
            }
            fanSpeed = Math.max(0, Math.min(10, fanSpeed));

            let fanGroup = this.cache.get(entityId) as THREE.Group;
            if (!fanGroup) {
                fanGroup = this.createFanModel();
                fanGroup.scale.set(2.5, 2.5, 2.5);
                this.cache.set(entityId, fanGroup);
                volatileGroup.add(fanGroup);
            }

            // Update Position and Rotation
            const snappedX = coords.x < width / 2 ? 0 : width;
            const snappedY = coords.y < depth / 2 ? 0 : depth;
            fanGroup.position.set(snappedX - width / 2, coords.z, snappedY - depth / 2);

            if (coords.rotation === 0 || coords.rotation === undefined) {
                fanGroup.lookAt(new THREE.Vector3(0, height / 2, 0));
            } else {
                fanGroup.rotation.y = THREE.MathUtils.degToRad(coords.rotation);
            }

            fanGroup.userData = { entityId, types: ['fan'], speed: fanSpeed };
            this.context.sensorMeshes.set(entityId, fanGroup);

            // Store for animation (head is child 1)
            const head = fanGroup.children[1];
            if (head) {
                this.fanHeads.push(head);
                this.fanSpeeds.push(fanSpeed);
            }
        });

        // Cleanup stale fans
        this.cache.forEach((obj, key) => {
            if (!currentFanIds.has(key)) {
                volatileGroup.remove(obj);
                this.disposeObject(obj);
                this.cache.delete(key);
            }
        });

        this.initWindParticles();
    }

    public animate(deltaTime: number) {
        // Rotate fans
        this.fanHeads.forEach((head, index) => {
            const speed = this.fanSpeeds[index];
            if (speed > 0) {
                // Blades are the second child of head (rim=0, blades=1, motor=2)
                const blades = head.children[1];
                if (blades) {
                    blades.rotation.z -= 0.2 * speed * (deltaTime * 60);
                }
            }
        });

        this.animateParticles(deltaTime);
    }

    private _windParticles?: THREE.Points;

    private initWindParticles() {
        if (this._windParticles) return;
        const count = 200;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(-1000), 3));
        geom.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        geom.setAttribute('lifetime', new THREE.BufferAttribute(new Float32Array(count).fill(Math.random()), 1));

        const mat = new THREE.PointsMaterial({ color: 0xaec4c7, size: 2, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        this._windParticles = new THREE.Points(geom, mat);
        this._windParticles.frustumCulled = false;
        this.context.volatileGroup.add(this._windParticles);
    }

    private animateParticles(deltaTime: number) {
        if (this._windParticles) {
            const pos = this._windParticles.geometry.attributes.position.array as Float32Array;
            const vel = this._windParticles.geometry.attributes.velocity.array as Float32Array;
            const life = this._windParticles.geometry.attributes.lifetime.array as Float32Array;

            // Use the same fanHeads filtering as legacy
            const activeFans: { head: THREE.Object3D, speed: number }[] = [];
            this.fanHeads.forEach((head, index) => {
                const speed = this.fanSpeeds[index];
                if (speed > 0) activeFans.push({ head, speed });
            });

            if (activeFans.length === 0) {
                for (let i = 0; i < pos.length / 3; i++) {
                    pos[i * 3 + 1] = -1000;
                }
            } else {
                for (let i = 0; i < life.length; i++) {
                    life[i] -= 0.02; // Fixed decay from legacy

                    if (life[i] <= 0) {
                        // Spawn logic
                        const source = activeFans[Math.floor(Math.random() * activeFans.length)];
                        const fanHead = source.head;
                        const forward = new THREE.Vector3();
                        fanHead.getWorldDirection(forward);
                        // Three.js world direction is typically Z+ or Z-.
                        // Based on legacy: const speed = (2.5 + Math.random()) * (fanSpeed / 5);
                        // velocities[i * 3] = forward.x * speed;

                        // Calculate spawn position on disk
                        // const angle = Math.random() * Math.PI * 2;
                        // const r = Math.sqrt(Math.random()) * 14;
                        // const localPos = new THREE.Vector3(Math.cos(angle)*r, Math.sin(angle)*r, 5);
                        const angle = Math.random() * Math.PI * 2;
                        const r = Math.sqrt(Math.random()) * 14;
                        // Legacy used 5 units in front (z=5) assuming local space
                        const localPos = new THREE.Vector3(
                            Math.cos(angle) * r,
                            Math.sin(angle) * r,
                            5
                        );

                        // localToWorld modifies vector in place
                        const spawnPos = fanHead.localToWorld(localPos);

                        pos[i * 3] = spawnPos.x;
                        pos[i * 3 + 1] = spawnPos.y;
                        pos[i * 3 + 2] = spawnPos.z;

                        const speed = (2.5 + Math.random()) * (source.speed / 5);

                        vel[i * 3] = forward.x * speed;
                        vel[i * 3 + 1] = forward.y * speed + (Math.random() - 0.5) * 0.5;
                        vel[i * 3 + 2] = forward.z * speed;
                        life[i] = 1.0;
                    } else {
                        pos[i * 3] += vel[i * 3];
                        pos[i * 3 + 1] += vel[i * 3 + 1];
                        pos[i * 3 + 2] += vel[i * 3 + 2];
                    }
                }
            }
            this._windParticles.geometry.attributes.position.needsUpdate = true;
            this._windParticles.geometry.attributes.lifetime.needsUpdate = true;
        }
    }

    private createFanModel(): THREE.Group {
        const group = new THREE.Group();
        const material = this.getSharedMaterial('fanBodyMat', () => new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 }));
        const bladeMaterial = this.getSharedMaterial('fanBladeMat', () => new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.2 }));

        // 1. Stand/Clamp
        const clampGeo = this.getSharedGeometry('fanClampGeo', () => new THREE.BoxGeometry(4, 4, 4));
        const clamp = new THREE.Mesh(clampGeo, material);
        group.add(clamp);

        // 2. Head Group (Pivots)
        const headGroup = new THREE.Group();
        headGroup.position.z = 4;

        // Cage/Rim
        const rimGeo = this.getSharedGeometry('fanRimGeo', () => new THREE.TorusGeometry(6, 0.5, 8, 24));
        const rim = new THREE.Mesh(rimGeo, material);
        headGroup.add(rim);

        // Blades
        const bladesGroup = new THREE.Group();
        const bladeGeo = this.getSharedGeometry('fanBladeGeo', () => new THREE.BoxGeometry(1, 1, 1));

        for (let i = 0; i < 3; i++) {
            const bladePivot = new THREE.Group();
            bladePivot.rotation.z = (Math.PI * 2 / 3) * i;

            const b = new THREE.Mesh(bladeGeo, bladeMaterial);
            b.scale.set(2, 5, 0.2);
            b.position.y = 2.5;
            bladePivot.add(b);

            bladesGroup.add(bladePivot);
        }
        headGroup.add(bladesGroup);

        // Motor housing
        const motorGeo = this.getSharedGeometry('fanMotorGeo', () => {
            const g = new THREE.CylinderGeometry(1.5, 1.5, 3, 16);
            g.rotateX(Math.PI / 2);
            return g;
        });
        const motor = new THREE.Mesh(motorGeo, material);
        headGroup.add(motor);

        group.add(headGroup);
        return group;
    }
}
