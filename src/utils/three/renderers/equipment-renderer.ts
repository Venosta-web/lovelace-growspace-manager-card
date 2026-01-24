import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { BaseRenderer } from './base-renderer';

export class EquipmentRenderer extends BaseRenderer {
    private _humidifierParticles?: THREE.Points;
    private _dryAirParticles?: THREE.Points;
    private _pumpWaterParticles?: THREE.Points;
    private _windParticles?: THREE.Points;

    private _humidifiers: THREE.Group[] = [];
    private _pumps: THREE.Group[] = [];
    private _exhaustFans: THREE.Group[] = [];

    // Config constants
    private readonly SENSOR_TYPES = {
        IRRIGATION_PUMP: 'irrigation_pump',
        DRAIN_PUMP: 'drain_pump'
    };


    public render() {
        const { device, volatileGroup, hass } = this.context;
        const width = device.dimensions?.width ?? 120;
        const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;
        const height = device.dimensions?.height ?? 200;
        const env = device.environmentAttributes;
        const sensorCoords = env?.sensorCoordinates || {};

        const currentEntityIds = new Set<string>();

        // Initialize particles if needed
        if (!this._humidifierParticles) this.initHumidifierParticles();
        if (!this._dryAirParticles) this.initDryAirParticles();
        if (!this._pumpWaterParticles) this.initPumpWaterParticles();
        if (!this._windParticles) this.initWindParticles();

        // 1. Humidifiers / Dehumidifiers
        const hums = env?.humidifierEntities || (env?.humidifierEntity ? [env.humidifierEntity] : []);
        const dehums = env?.dehumidifierEntities || (env?.dehumidifierEntity ? [env.dehumidifierEntity] : []);
        [...hums, ...dehums].forEach(entityId => {
            const coords = sensorCoords[entityId];
            if (!coords) return;
            currentEntityIds.add(entityId);

            const isOutside = (coords.x < 0 || coords.x > width || coords.y < 0 || coords.y > depth);
            const isDehum = dehums.includes(entityId) || env?.dehumidifierEntity === entityId;

            let intensity = 0;
            const state = hass?.states[entityId];
            if (state && (state.state === 'on' || !isNaN(parseFloat(state.state)))) {
                const val = parseFloat(state.state);
                intensity = isNaN(val) ? (state.state === 'on' ? 5 : 0) : (val > 10 ? val / 10 : val);
            }

            let group = this.cache.get(entityId) as THREE.Group;
            if (group) {
                // UPDATE
                this.updateHumidifierModel(group, intensity, isOutside, coords, width, depth, height, coords.z);
            } else {
                // CREATE
                group = isDehum
                    ? this.createDehumidifierModel(intensity, isOutside, coords, width, depth, height, coords.z)
                    : this.createHumidifierModel(intensity, isOutside, coords, width, depth, height, coords.z);
                this.cache.set(entityId, group);
                volatileGroup.add(group);
            }

            group.position.set(coords.x - width / 2, 0, coords.y - depth / 2);
            if (coords.rotation) group.rotation.y = THREE.MathUtils.degToRad(coords.rotation);

            group.userData = { ...group.userData, entityId, intensity, isOutside, isDehumidifier: isDehum, types: isDehum ? ['dehumidifier'] : ['humidifier'] };
            this.context.sensorMeshes.set(entityId, group);
        });

        // 2. Pumps
        const irrigationConfig = device.irrigationConfig;
        const pumps = new Set([irrigationConfig?.irrigationPumpEntity, irrigationConfig?.drainPumpEntity].filter(Boolean));
        Object.keys(env?.sensorTypes || {}).forEach(k => {
            if (env?.sensorTypes?.[k] === this.SENSOR_TYPES.IRRIGATION_PUMP || env?.sensorTypes?.[k] === this.SENSOR_TYPES.DRAIN_PUMP) {
                pumps.add(k);
            }
        });

        pumps.forEach(entityId => {
            if (!entityId) return;
            let coords = sensorCoords[entityId];
            if (!coords) coords = { x: 0, y: 0, z: 0, rotation: 0 };
            currentEntityIds.add(entityId);

            const isOutside = (coords.x < 0 || coords.x > width || coords.y < 0 || coords.y > depth);
            const isDrain = entityId === irrigationConfig?.drainPumpEntity || env?.sensorTypes?.[entityId] === this.SENSOR_TYPES.DRAIN_PUMP;

            let isActive = false;
            const state = hass?.states[entityId];
            if (state) isActive = state.state === 'on' || (state.state !== 'off' && parseFloat(state.state) > 0);

            const evtType = isDrain ? 'drain' : 'irrigation';
            if (env?.activeEvents?.[evtType]) {
                const evt = env.activeEvents[evtType];
                const now = Date.now();
                const start = new Date(evt.start).getTime();
                if (now >= start && now < start + (evt.duration * 1000)) isActive = true;
            }

            // Link Logic
            const tankId = env?.pump_tank_links?.[entityId];
            const tankMesh = tankId ? this.context.sensorMeshes.get(tankId) : null;

            let group = this.cache.get(entityId) as THREE.Group;
            if (group) {
                // UPDATE
                this.updatePumpModel(group, isDrain, isOutside, coords, width, depth, height, coords.z, isActive, tankMesh);
            } else {
                // CREATE
                group = this.createPumpModel(isDrain, isOutside, coords, width, depth, height, coords.z, isActive, tankMesh);
                this.cache.set(entityId, group);
                volatileGroup.add(group);

                // Add Unlink Icon
                const unlinkDiv = document.createElement('div');
                unlinkDiv.className = 'sensor-label link-icon';
                unlinkDiv.style.cursor = 'pointer';
                const unlinkIcon = new CSS2DObject(unlinkDiv);
                unlinkIcon.name = 'unlinkIcon';
                unlinkIcon.position.set(0, 20, 0); // Above pump
                group.add(unlinkIcon);
            }

            if (tankMesh && tankMesh.userData.entityId === tankId) {
                // Positioned relative to tank in world (simplified by setting world position to match tank bottom)
                const tankPos = tankMesh.position.clone();
                group.position.set(tankPos.x, 2, tankPos.z); // Slightly above bottom
                if (tankMesh.rotation.y) group.rotation.y = tankMesh.rotation.y;
            } else {
                group.position.set(coords.x - width / 2, 0, coords.y - depth / 2);
                if (coords.rotation) group.rotation.y = THREE.MathUtils.degToRad(coords.rotation);
            }

            const unlinkIcon = group.getObjectByName('unlinkIcon') as CSS2DObject;
            if (unlinkIcon) {
                unlinkIcon.visible = !!tankId;
                if (unlinkIcon.visible) {
                    unlinkIcon.element.innerHTML = `<ha-icon icon="mdi:link-variant-off" style="color: #f44336; --mdc-icon-size: 14px"></ha-icon>`;
                    unlinkIcon.element.onclick = (e: MouseEvent) => {
                        e.stopPropagation();
                        if (this.context.requestUpdate) {
                            // Heatmap3D handles unlink event
                            this.context.scene.userData.element?.dispatchEvent(new CustomEvent('unlink', { detail: { entityId } }));
                        }
                    };
                }
            }

            group.userData = { ...group.userData, entityId, isActive, isOutside, isDrain, types: isDrain ? ['drain_pump'] : ['irrigation_pump'], tankId };
            this.context.sensorMeshes.set(entityId, group);
        });

        // 3. Exhaust Fans
        const exhaustEntities = env?.exhaustFanEntities || (env?.exhaustEntity ? [env.exhaustEntity] : []);
        exhaustEntities.forEach(entityId => {
            let coords = sensorCoords[entityId];
            if (!coords) coords = { x: width / 2, y: depth / 2, z: height, rotation: 0 };
            currentEntityIds.add(entityId);

            let speed = 0;
            const state = hass?.states[entityId];
            if (state) {
                const v = parseFloat(state.state);
                speed = !isNaN(v) ? (v > 10 ? v / 10 : v) : (state.state === 'on' ? 5 : 0);
            }

            let group = this.cache.get(entityId) as THREE.Group;
            if (group) {
                // UPDATE
                this.updateExhaustModel(group, speed, coords.rotation || 0, entityId);
            } else {
                // CREATE
                group = this.createExhaustModel(speed, coords.rotation || 0, entityId);
                this.cache.set(entityId, group);
                volatileGroup.add(group);
            }

            group.position.set(coords.x - width / 2, coords.z, coords.y - depth / 2);
            group.userData = { ...group.userData, types: ['exhaust'] };
            this.context.sensorMeshes.set(entityId, group);
        });

        // Cleanup stale objects from cache
        this.cache.forEach((obj, eid) => {
            if (!currentEntityIds.has(eid)) {
                volatileGroup.remove(obj);
                this.disposeObject(obj);
                this.cache.delete(eid);
            }
        });

        // Sync local arrays for animation
        this._humidifiers = Array.from(this.cache.values()).filter(g => g.userData.types?.includes('humidifier') || g.userData.types?.includes('dehumidifier')) as THREE.Group[];
        this._pumps = Array.from(this.cache.values()).filter(g => g.userData.types?.includes('irrigation_pump') || g.userData.types?.includes('drain_pump')) as THREE.Group[];
        this._exhaustFans = Array.from(this.cache.values()).filter(g => g.userData.types?.includes('exhaust') || g.userData.entityId?.includes('exhaust')) as THREE.Group[];

    }

    public animate(deltaTime: number) {
        // 1. Exhaust Animation
        this._exhaustFans.forEach(g => {
            if (g.userData.speed > 0) {
                const blades = g.getObjectByName("exhaustBlades");
                if (blades) blades.rotation.z += g.userData.speed * 0.2;
            }
        });

        // 2. Particles
        this.animateParticles(deltaTime);
    }

    private updateHumidifierModel(group: THREE.Group, intensity: number, isOutside: boolean, coords: any, w: number, d: number, h: number, targetH: number) {
        // 1. Update Intensity (Digit Panel)
        const oldIntensity = group.userData.intensity;
        if (oldIntensity !== intensity) {
            let digits = group.children.find(c => c.name === 'digits');
            if (intensity > 0) {
                if (!digits) {
                    const digitsGeo = new THREE.PlaneGeometry(6, 4);
                    const digitsMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    digits = new THREE.Mesh(digitsGeo, digitsMat);
                    digits.name = 'digits';
                    digits.position.set(0, 7.5, 12.2);
                    group.add(digits);
                }
            } else if (digits) {
                group.remove(digits);
                this.disposeObject(digits);
            }
        }

        // 2. Update Hose if outside
        if (isOutside && (group.userData.isOutside !== isOutside || group.userData.targetH !== targetH)) {
            const oldHose = group.children.find(c => c.name === 'hose');
            if (oldHose) {
                group.remove(oldHose);
                this.disposeObject(oldHose);
            }

            const outputPoint = new THREE.Vector3(0, 52.5, 0);
            const hPos = new THREE.Vector3(coords.x - w / 2, 0, coords.y - d / 2);
            const target = new THREE.Vector3(
                Math.max(-w / 2, Math.min(w / 2, hPos.x)),
                Math.max(0, Math.min(h, targetH)),
                Math.max(-d / 2, Math.min(d / 2, hPos.z))
            );
            const localTarget = target.clone().sub(hPos);
            if (coords.rotation) {
                const rotRad = (coords.rotation * Math.PI) / 180;
                localTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotRad);
            }

            const path = new THREE.CatmullRomCurve3([
                outputPoint.clone(),
                outputPoint.clone().add(new THREE.Vector3(0, 15, 0)),
                localTarget.clone().lerp(outputPoint, 0.15),
                localTarget
            ]);
            const hose = new THREE.Mesh(new THREE.TubeGeometry(path, 20, 1.5, 8, false), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
            hose.name = 'hose';
            group.add(hose);
            group.userData.hoseEnd = localTarget;
        }

        group.userData = { ...group.userData, intensity, isOutside, targetH };
    }

    private updatePumpModel(group: THREE.Group, isDrain: boolean, isOutside: boolean, coords: any, w: number, d: number, h: number, targetH: number, isActive: boolean, tankMesh?: THREE.Object3D | null) {
        // Update Hose if state or target height changed
        if ((isOutside || tankMesh) && (group.userData.isActive !== isActive || group.userData.isOutside !== isOutside || group.userData.targetH !== targetH || group.userData.tankId !== (tankMesh as any)?.userData?.entityId)) {
            const oldHose = group.getObjectByName('pumpHose');
            if (oldHose) {
                group.remove(oldHose);
                this.disposeObject(oldHose);
            }

            const hPos = new THREE.Vector3(coords.x - w / 2, 0, coords.y - d / 2);
            const targetPos = new THREE.Vector3(
                Math.max(-w / 2, Math.min(w / 2, hPos.x)),
                Math.max(0, Math.min(h, targetH)),
                Math.max(-d / 2, Math.min(d / 2, hPos.z))
            );
            const localTarget = targetPos.clone().sub(hPos);
            if (coords.rotation) {
                const rotRad = (coords.rotation * Math.PI) / 180;
                localTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotRad);
            }

            const bodyRadius = 8;
            const bodyLength = 15;
            const portLength = 5;
            const outputPoint = new THREE.Vector3(-bodyLength / 2 - 5 - portLength, bodyRadius + 4, 0);

            let path;
            if (tankMesh) {
                // Route through tank lid (lid is at y=45+4=49 approx in tank space)
                // Pump is at y=2 in world. Tank is at y=0.
                // relative to pump, lid is at y=47? 
                // Let's use world coordinates for path if easier, but renderers use local.
                // In local pump space:
                const lidHeight = 47;
                path = new THREE.CatmullRomCurve3([
                    outputPoint.clone(),
                    new THREE.Vector3(0, lidHeight, 0),
                    new THREE.Vector3(localTarget.x, lidHeight + 10, localTarget.z),
                    localTarget
                ]);
            } else {
                path = new THREE.CatmullRomCurve3([
                    outputPoint.clone(),
                    outputPoint.clone().add(new THREE.Vector3(-10, 5, 0)),
                    localTarget.clone().lerp(outputPoint, 0.2),
                    localTarget
                ]);
            }

            const hoseGeo = new THREE.TubeGeometry(path, 32, 0.75, 8, false);
            const hoseMat = new THREE.MeshPhysicalMaterial({
                color: isActive ? 0x003399 : 0x88ccff,
                transmission: 0.9,
                opacity: 0.4,
                transparent: true,
                roughness: 0.1
            });
            const hose = new THREE.Mesh(hoseGeo, hoseMat);
            hose.name = 'pumpHose';
            group.add(hose);

            group.userData.hoseEnd = localTarget;
            group.userData.hosePath = path;
        }

        group.userData = { ...group.userData, isActive, isOutside, targetH };
    }

    private updateExhaustModel(group: THREE.Group, speed: number, rotation: number, entityId: string) {
        group.rotation.y = THREE.MathUtils.degToRad(rotation);
        group.userData = { ...group.userData, speed, entityId, types: ['exhaust'] };
    }

    private createHumidifierModel(intensity: number, isOutside: boolean, coords: any, w: number, d: number, h: number, targetH: number) {
        const group = new THREE.Group();

        const baseGeo = this.getSharedGeometry('humBase', () => new THREE.CylinderGeometry(12, 12, 15, 32));
        const darkMat = this.getSharedMaterial('darkPlastic', () => new THREE.MeshStandardMaterial({ color: 0x111111 }));
        const base = new THREE.Mesh(baseGeo, darkMat);
        base.position.y = 7.5;
        group.add(base);

        const tankGeo = this.getSharedGeometry('humTank', () => new THREE.CylinderGeometry(12, 12, 35, 32));
        const tankMat = this.getSharedMaterial('humTankGlass', () => new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, transmission: 0.9, opacity: 1, transparent: true }));
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.y = 15 + 17.5;
        group.add(tank);

        const topGeo = this.getSharedGeometry('humTop', () => new THREE.CylinderGeometry(8, 12, 5, 32));
        const top = new THREE.Mesh(topGeo, darkMat);
        top.position.y = 15 + 35 + 2.5;
        group.add(top);

        const outputPoint = new THREE.Vector3(0, 52.5, 0);

        if (isOutside) {
            const hPos = new THREE.Vector3(coords.x - w / 2, 0, coords.y - d / 2);
            const target = new THREE.Vector3(
                Math.max(-w / 2, Math.min(w / 2, hPos.x)),
                Math.max(0, Math.min(h, targetH)),
                Math.max(-d / 2, Math.min(d / 2, hPos.z))
            );
            const localTarget = target.clone().sub(hPos);
            if (coords.rotation) {
                const rotRad = (coords.rotation * Math.PI) / 180;
                localTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotRad);
            }

            const path = new THREE.CatmullRomCurve3([
                outputPoint.clone(),
                outputPoint.clone().add(new THREE.Vector3(0, 15, 0)),
                localTarget.clone().lerp(outputPoint, 0.15),
                localTarget
            ]);
            const hose = new THREE.Mesh(new THREE.TubeGeometry(path, 20, 1.5, 8, false), this.getSharedMaterial('hoseMat', () => new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })));
            hose.name = 'hose';
            group.add(hose);
            group.userData.hoseEnd = localTarget;
        } else {
            group.userData.hoseEnd = outputPoint;
        }

        const panelGeo = this.getSharedGeometry('panel', () => new THREE.PlaneGeometry(8, 6));
        const panelMat = this.getSharedMaterial('panelMat', () => new THREE.MeshStandardMaterial({ color: 0x000000 }));
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 7.5, 12.1);
        group.add(panel);

        if (intensity > 0) {
            const digitsGeo = this.getSharedGeometry('digits', () => new THREE.PlaneGeometry(6, 4));
            const digitsMat = this.getSharedMaterial('digitsMat', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
            const digits = new THREE.Mesh(digitsGeo, digitsMat);
            digits.name = 'digits';
            digits.position.set(0, 7.5, 12.2);
            group.add(digits);
        }

        return group;
    }

    private createDehumidifierModel(intensity: number, isOutside: boolean, coords: any, w: number, d: number, h: number, targetH: number) {
        const group = new THREE.Group();
        const bodyGeo = this.getSharedGeometry('dehumBody', () => new THREE.BoxGeometry(30, 50, 20));
        const darkMat = this.getSharedMaterial('darkPlastic', () => new THREE.MeshStandardMaterial({ color: 0x111111 }));
        const body = new THREE.Mesh(bodyGeo, darkMat);
        body.position.y = 25;
        group.add(body);

        const outputPoint = new THREE.Vector3(0, 52, 0);

        if (isOutside) {
            const hPos = new THREE.Vector3(coords.x - w / 2, 0, coords.y - d / 2);
            const target = new THREE.Vector3(
                Math.max(-w / 2, Math.min(w / 2, hPos.x)),
                Math.max(0, Math.min(h, targetH)),
                Math.max(-d / 2, Math.min(d / 2, hPos.z))
            );
            const localTarget = target.clone().sub(hPos);
            if (coords.rotation) {
                const rotRad = (coords.rotation * Math.PI) / 180;
                localTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotRad);
            }

            const path = new THREE.CatmullRomCurve3([
                outputPoint.clone(),
                outputPoint.clone().add(new THREE.Vector3(0, 25, 0)),
                localTarget.clone().lerp(outputPoint, 0.15),
                localTarget
            ]);
            const hose = new THREE.Mesh(new THREE.TubeGeometry(path, 20, 4.5, 8, false), this.getSharedMaterial('dehumHoseMat', () => new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })));
            hose.name = 'hose';
            group.add(hose);
            group.userData.hoseEnd = localTarget;
        } else {
            group.userData.hoseEnd = outputPoint;
        }

        if (intensity > 0) {
            const digitsGeo = this.getSharedGeometry('digits', () => new THREE.PlaneGeometry(6, 4));
            const digitsMat = this.getSharedMaterial('digitsMat', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
            const digits = new THREE.Mesh(digitsGeo, digitsMat);
            digits.name = 'digits';
            digits.position.set(30 / 2 - 5, 50 - 3, 20 / 2 + 0.6);
            group.add(digits);
        }

        return group;
    }

    private createPumpModel(isDrain: boolean, isOutside: boolean, coords: any, frameWidth: number, frameDepth: number, frameHeight: number, hoseTargetHeight: number, isActive: boolean, tankMesh?: THREE.Object3D | null): THREE.Group {
        const group = new THREE.Group();

        const bodyRadius = 8;
        const bodyLength = 15;
        const baseHeight = 4;

        const darkMat = this.getSharedMaterial('darkPlastic', () => new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.4 }));
        const bracketMat = this.getSharedMaterial('bracketMat', () => new THREE.MeshPhysicalMaterial({
            color: 0xeeeeee,
            transmission: 0.5,
            opacity: 0.7,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true
        }));

        const bodyGeo = this.getSharedGeometry('pumpBody', () => {
            const g = new THREE.CylinderGeometry(8, 8, 15, 32);
            g.rotateZ(Math.PI / 2);
            return g;
        });
        const body = new THREE.Mesh(bodyGeo, darkMat);
        body.position.y = bodyRadius + baseHeight;
        group.add(body);

        const headRadius = bodyRadius * 1.1;
        const headLength = 5;
        const headGeo = this.getSharedGeometry('pumpHead', () => {
            const g = new THREE.CylinderGeometry(8.8, 8.8, 5, 32);
            g.rotateZ(Math.PI / 2);
            return g;
        });
        const head = new THREE.Mesh(headGeo, darkMat);
        head.position.set(-bodyLength / 2 - headLength / 2, bodyRadius + baseHeight, 0);
        group.add(head);

        const portRadius = 2.5;
        const portLength = 5;
        const portGeo = this.getSharedGeometry('pumpPort', () => new THREE.CylinderGeometry(2.5, 2.5, 5, 16));

        const port1 = new THREE.Mesh(portGeo, darkMat);
        port1.position.set(-bodyLength / 2 - headLength - portLength / 2, bodyRadius + baseHeight, 0);
        port1.rotateZ(Math.PI / 2);
        group.add(port1);

        const port2 = new THREE.Mesh(portGeo, darkMat);
        port2.position.set(-bodyLength / 2 - headLength / 2, bodyRadius * 2 + baseHeight, 0);
        group.add(port2);

        const bracketStrapGeo = this.getSharedGeometry('pumpStrap', () => {
            const g = new THREE.CylinderGeometry(8.5, 8.5, 2, 32, 1, true, 0, Math.PI);
            g.rotateZ(Math.PI / 2);
            g.rotateX(Math.PI);
            return g;
        });
        const footGeo = this.getSharedGeometry('pumpFoot', () => new THREE.BoxGeometry(2, 4, 10));

        for (let i = 0; i < 2; i++) {
            const bracketX = (i === 0 ? bodyLength / 4 : -bodyLength / 4);
            const strap = new THREE.Mesh(bracketStrapGeo, bracketMat);
            strap.position.set(bracketX, bodyRadius + baseHeight, 0);
            group.add(strap);

            const footL = new THREE.Mesh(footGeo, bracketMat);
            footL.position.set(bracketX, baseHeight / 2, 4);
            group.add(footL);

            const footR = new THREE.Mesh(footGeo, bracketMat);
            footR.position.set(bracketX, baseHeight / 2, -4);
            group.add(footR);
        }

        const outputPoint = new THREE.Vector3(-bodyLength / 2 - headLength - portLength, bodyRadius + baseHeight, 0);

        if (isOutside) {
            const hPos = new THREE.Vector3(coords.x - frameWidth / 2, 0, coords.y - frameDepth / 2);
            const targetPos = new THREE.Vector3(
                Math.max(-frameWidth / 2, Math.min(frameWidth / 2, hPos.x)),
                Math.max(0, Math.min(frameHeight, hoseTargetHeight)),
                Math.max(-frameDepth / 2, Math.min(frameDepth / 2, hPos.z))
            );
            const localTarget = targetPos.clone().sub(hPos);

            if (coords.rotation) {
                const rotRad = (coords.rotation * Math.PI) / 180;
                localTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotRad);
            }

            const path = new THREE.CatmullRomCurve3([
                outputPoint.clone(),
                outputPoint.clone().add(new THREE.Vector3(-10, 5, 0)),
                localTarget.clone().lerp(outputPoint, 0.2),
                localTarget
            ]);

            const hoseGeo = new THREE.TubeGeometry(path, 32, 0.75, 8, false);
            const hoseMat = new THREE.MeshPhysicalMaterial({
                color: isActive ? 0x003399 : 0x88ccff,
                transmission: 0.9,
                opacity: 0.4,
                transparent: true,
                roughness: 0.1
            });
            const hose = new THREE.Mesh(hoseGeo, hoseMat);
            hose.name = 'pumpHose';
            group.add(hose);

            group.userData.hoseEnd = localTarget;
            group.userData.hosePath = path;
        } else {
            group.userData.hoseEnd = outputPoint;
        }

        return group;
    }

    private createExhaustModel(speed: number, rotation: number, entityId: string) {
        const group = new THREE.Group();
        group.rotation.y = THREE.MathUtils.degToRad(rotation);
        group.userData = { speed, entityId, types: ['exhaust'] };

        const bodyGeo = this.getSharedGeometry('exhaustBody', () => {
            const g = new THREE.CylinderGeometry(15, 15, 30, 24);
            g.rotateX(Math.PI / 2);
            return g;
        });
        const bodyMat = this.getSharedMaterial('exhaustBodyMat', () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        const blades = new THREE.Group();
        blades.name = "exhaustBlades";
        const bGeo = this.getSharedGeometry('exhaustBlade', () => new THREE.BoxGeometry(28, 0.5, 6));
        const bMat = this.getSharedMaterial('exhaustBladeMat', () => new THREE.MeshStandardMaterial({ color: 0x050505 }));
        for (let i = 0; i < 4; i++) {
            const b = new THREE.Mesh(bGeo, bMat);
            b.rotation.z = (i * Math.PI) / 2;
            b.rotation.y = 0.2;
            blades.add(b);
        }
        group.add(blades);
        return group;
    }

    private initHumidifierParticles() {
        const count = 500;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(0), 3));
        geom.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        geom.setAttribute('lifetime', new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));

        const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 3, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, sizeAttenuation: true });
        this._humidifierParticles = new THREE.Points(geom, mat);
        this._humidifierParticles.frustumCulled = false;
        this.context.volatileGroup.add(this._humidifierParticles);
    }

    private initDryAirParticles() {
        const count = 300;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(0), 3));
        geom.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        geom.setAttribute('lifetime', new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));

        const mat = new THREE.PointsMaterial({ color: 0xfffff0, size: 2, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
        this._dryAirParticles = new THREE.Points(geom, mat);
        this._dryAirParticles.frustumCulled = false;
        this.context.volatileGroup.add(this._dryAirParticles);
    }

    private initPumpWaterParticles() {
        const count = 300;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(0), 3));
        geom.setAttribute('lifetime', new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));
        geom.setAttribute('progress', new THREE.BufferAttribute(new Float32Array(count).fill(0), 1));

        const mat = new THREE.PointsMaterial({ color: 0x448aff, size: 2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        this._pumpWaterParticles = new THREE.Points(geom, mat);
        this._pumpWaterParticles.frustumCulled = false;
        this.context.volatileGroup.add(this._pumpWaterParticles);
    }

    // Wind particles are shared, let's put them here for now
    private initWindParticles() {
        if (this._windParticles) return;
        const count = 400;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(-1000), 3));
        geom.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        geom.setAttribute('lifetime', new THREE.BufferAttribute(new Float32Array(count).fill(Math.random()), 1));

        const mat = new THREE.PointsMaterial({ color: 0xaec4c7, size: 0.8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        this._windParticles = new THREE.Points(geom, mat);
        this._windParticles.frustumCulled = false;
        this.context.volatileGroup.add(this._windParticles);
    }

    private animateParticles(deltaTime: number) {
        // Humidifiers
        if (this._humidifierParticles) {
            const pos = this._humidifierParticles.geometry.attributes.position.array as Float32Array;
            const vel = this._humidifierParticles.geometry.attributes.velocity.array as Float32Array;
            const life = this._humidifierParticles.geometry.attributes.lifetime.array as Float32Array;
            const active = this._humidifiers.filter(h => h.userData.intensity > 0 && !h.userData.isDehumidifier);

            for (let i = 0; i < life.length; i++) {
                life[i] -= deltaTime;
                if (life[i] <= 0 && active.length > 0) {
                    const src = active[Math.floor(Math.random() * active.length)];
                    const start = src.localToWorld((src.userData.hoseEnd as THREE.Vector3).clone());
                    pos[i * 3] = start.x + (Math.random() - 0.5) * 0.5;
                    pos[i * 3 + 1] = start.y + (Math.random() - 0.5) * 0.5;
                    pos[i * 3 + 2] = start.z + (Math.random() - 0.5) * 0.5;
                    vel[i * 3] = (Math.random() - 0.5) * 0.5;
                    vel[i * 3 + 1] = 0.5 + Math.random() * 0.5;
                    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
                    life[i] = 1.0 + Math.random();
                } else if (life[i] > 0) {
                    pos[i * 3] += vel[i * 3];
                    pos[i * 3 + 1] += vel[i * 3 + 1];
                    pos[i * 3 + 2] += vel[i * 3 + 2];
                    vel[i * 3 + 1] -= 0.01; // Gravity
                } else {
                    pos[i * 3 + 1] = -1000;
                }
            }
            this._humidifierParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Dry Air
        if (this._dryAirParticles) {
            const pos = this._dryAirParticles.geometry.attributes.position.array as Float32Array;
            const vel = this._dryAirParticles.geometry.attributes.velocity.array as Float32Array;
            const life = this._dryAirParticles.geometry.attributes.lifetime.array as Float32Array;
            const active = this._humidifiers.filter(h => h.userData.intensity > 0 && h.userData.isDehumidifier);

            for (let i = 0; i < life.length; i++) {
                life[i] -= deltaTime;
                if (life[i] <= 0 && active.length > 0) {
                    const src = active[Math.floor(Math.random() * active.length)];
                    const start = src.localToWorld((src.userData.hoseEnd as THREE.Vector3).clone());
                    pos[i * 3] = start.x + (Math.random() - 0.5) * 2;
                    pos[i * 3 + 1] = start.y + (Math.random() - 0.5) * 2;
                    pos[i * 3 + 2] = start.z + (Math.random() - 0.5) * 2;
                    vel[i * 3] = (Math.random() - 0.5) * 5;
                    vel[i * 3 + 1] = (Math.random() - 0.2) * 5;
                    vel[i * 3 + 2] = (Math.random() - 0.5) * 5;
                    life[i] = 0.5 + Math.random();
                } else if (life[i] > 0) {
                    pos[i * 3] += vel[i * 3];
                    pos[i * 3 + 1] += vel[i * 3 + 1];
                    pos[i * 3 + 2] += vel[i * 3 + 2];
                    vel[i * 3 + 1] -= 0.1;
                } else {
                    pos[i * 3 + 1] = -1000;
                }
            }
            this._dryAirParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Pumps
        if (this._pumpWaterParticles) {
            const pos = this._pumpWaterParticles.geometry.attributes.position.array as Float32Array;
            const prog = this._pumpWaterParticles.geometry.attributes.progress.array as Float32Array;
            const life = this._pumpWaterParticles.geometry.attributes.lifetime.array as Float32Array;
            const active = this._pumps.filter(p => p.userData.isActive && p.userData.isOutside && p.userData.hosePath);

            for (let i = 0; i < life.length; i++) {
                life[i] -= deltaTime;
                if (life[i] <= 0 && active.length > 0) {
                    const src = active[Math.floor(Math.random() * active.length)];
                    prog[i] = src.userData.isDrain ? 1.0 : 0.0;
                    life[i] = 1.0;
                } else if (life[i] > 0) {
                    const src = active[i % active.length]; // Approximation
                    if (src) {
                        const step = 0.02; // speed
                        if (src.userData.isDrain) {
                            prog[i] -= step;
                            if (prog[i] < 0) life[i] = 0;
                        } else {
                            prog[i] += step;
                            if (prog[i] > 1) life[i] = 0;
                        }
                        if (life[i] > 0) {
                            const path = src.userData.hosePath as THREE.CatmullRomCurve3;
                            const pt = path.getPoint(Math.max(0, Math.min(1, prog[i])));
                            const wp = src.localToWorld(pt.clone());
                            pos[i * 3] = wp.x; pos[i * 3 + 1] = wp.y; pos[i * 3 + 2] = wp.z;
                        }
                    } else {
                        life[i] = 0;
                    }
                } else {
                    pos[i * 3 + 1] = -1000;
                }
            }
            this._pumpWaterParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Wind logic is tricky without access to ALL fans (Circulation + Exhaust).
        // I need to scan volatileGroup for fans? or store them in context?
        // Let's defer wind logic or implement a simplified version.
        // For now, I'll update wind particles based on active exhaust fans only (self-contained)
        // To do it properly, I should need ALL fans.
        // I can traverse `volatileGroup` or use `SensorMeshes` looking for fans.
        // Let's implement full wind logic by finding fans in scene.
        if (this._windParticles) {
            const pos = this._windParticles.geometry.attributes.position.array as Float32Array;
            const vel = this._windParticles.geometry.attributes.velocity.array as Float32Array;
            const life = this._windParticles.geometry.attributes.lifetime.array as Float32Array;

            // Exhaust Wind Logic (Suction and Blow)
            const activeExhaust = this._exhaustFans.filter(e => e.userData.speed > 0);

            for (let i = 0; i < life.length; i++) {
                life[i] -= deltaTime;

                if (life[i] <= 0 && activeExhaust.length > 0) {
                    const src = activeExhaust[Math.floor(Math.random() * activeExhaust.length)];
                    const worldPos = new THREE.Vector3();
                    src.getWorldPosition(worldPos);

                    const angle = src.rotation.y;
                    const exhaustSpeed = src.userData.speed;
                    const speed = (2.0 + Math.random()) * (exhaustSpeed / 5);

                    const isSuction = Math.random() > 0.5;

                    if (isSuction) {
                        // Moves TOWARDS intake
                        const startOffset = -40;
                        pos[i * 3] = worldPos.x + Math.sin(angle) * startOffset + (Math.random() - 0.5) * 10;
                        pos[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 10;
                        pos[i * 3 + 2] = worldPos.z + Math.cos(angle) * startOffset + (Math.random() - 0.5) * 10;

                        vel[i * 3] = Math.sin(angle) * speed;
                        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
                        vel[i * 3 + 2] = Math.cos(angle) * speed;
                        life[i] = 0.5; // Short life for intake particles
                    } else {
                        // Moves AWAY from exhaust
                        const startOffset = 21;
                        pos[i * 3] = worldPos.x + Math.sin(angle) * startOffset + (Math.random() - 0.5) * 6;
                        pos[i * 3 + 1] = worldPos.y + (Math.random() - 0.5) * 6;
                        pos[i * 3 + 2] = worldPos.z + Math.cos(angle) * startOffset + (Math.random() - 0.5) * 6;

                        vel[i * 3] = Math.sin(angle) * speed * 1.5;
                        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
                        vel[i * 3 + 2] = Math.cos(angle) * speed * 1.5;
                        life[i] = 1.0;
                    }
                } else if (life[i] > 0) {
                    pos[i * 3] += vel[i * 3];
                    pos[i * 3 + 1] += vel[i * 3 + 1];
                    pos[i * 3 + 2] += vel[i * 3 + 2];
                } else {
                    pos[i * 3 + 1] = -1000;
                }
            }
            this._windParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
}
