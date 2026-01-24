
import * as THREE from 'three';
import { BaseRenderer } from './base-renderer';

export class LightRenderer extends BaseRenderer {
    private ledMaterial?: THREE.MeshStandardMaterial;

    public render() {
        const { device, volatileGroup, visibility } = this.context;
        const width = device.dimensions?.width ?? 120;
        const depth = device.dimensions?.length ?? (device.dimensions as any)?.depth ?? 120;

        if (!visibility.lights) {
            this.dispose();
            return;
        }

        const env = device.environmentAttributes;
        const lightSensors = env?.lightSensors || (env?.lightSensor ? [env.lightSensor] : []);
        if (lightSensors.length === 0) return;

        const sensorCoords = env?.sensorCoordinates || {};
        const count = lightSensors.length;

        let cols: number;
        let rows: number;
        if (count === 2) { cols = 1; rows = 2; }
        else { cols = Math.ceil(Math.sqrt(count)); rows = Math.ceil(count / cols); }

        const scaleX = 1 / cols;
        const scaleZ = 1 / rows;
        const currentLightIds = new Set<string>();

        lightSensors.forEach(entityId => {
            currentLightIds.add(entityId);
            const coords = sensorCoords[entityId];
            if (!coords) return;

            let lightGroup = this.cache.get(entityId) as THREE.Group;
            const modelWidth = width * scaleX;
            const modelDepth = depth * scaleZ;
            const configKey = `${modelWidth.toFixed(1)}_${modelDepth.toFixed(1)}`;

            if (lightGroup) {
                if (lightGroup.userData.configKey !== configKey) {
                    volatileGroup.remove(lightGroup);
                    this.disposeObject(lightGroup);
                    lightGroup = this.createLightbarModel(modelWidth, modelDepth);
                    this.cache.set(entityId, lightGroup);
                    volatileGroup.add(lightGroup);
                }
            } else {
                lightGroup = this.createLightbarModel(modelWidth, modelDepth);
                this.cache.set(entityId, lightGroup);
                volatileGroup.add(lightGroup);
            }

            lightGroup.position.set(coords.x - width / 2, coords.z, coords.y - depth / 2);
            lightGroup.userData = { entityId, types: ['light'], configKey };
            this.context.sensorMeshes.set(entityId, lightGroup);
        });

        // Cleanup
        this.cache.forEach((obj, key) => {
            if (!currentLightIds.has(key)) {
                volatileGroup.remove(obj);
                this.disposeObject(obj);
                this.cache.delete(key);
            }
        });
    }

    private createLightbarModel(modelWidth: number, modelDepth: number): THREE.Group {
        const frameWidth = modelWidth * 0.95;
        const frameDepth = modelDepth * 0.95;
        const frameHeight = 2.5;

        const lightGroup = new THREE.Group();

        const frameMat = this.getSharedMaterial('lightFrameMat', () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.2 }));
        const frameGeo = this.getSharedGeometry('lightFrameBase', () => new THREE.BoxGeometry(1, 1, 1));

        const mainFrame = new THREE.Mesh(frameGeo, frameMat);
        mainFrame.scale.set(frameWidth, frameHeight, 3);
        lightGroup.add(mainFrame);

        const ledMat = this.getSharedMaterial('ledMat', () => new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0,
            metalness: 0.5,
            roughness: 0.1
        }));
        this.ledMaterial = ledMat as THREE.MeshStandardMaterial;

        const lightBarCount = 6;
        const lightBarWidth = Math.max(1, 4 * (modelWidth / 120));
        const spacing = frameWidth / (lightBarCount - 1);

        const barGeo = this.getSharedGeometry('lightBarGeo', () => new THREE.BoxGeometry(1, 1, 1));
        const ledStripGeo = this.getSharedGeometry('ledStripGeo', () => new THREE.PlaneGeometry(1, 1));

        for (let i = 0; i < lightBarCount; i++) {
            const barGroup = new THREE.Group();
            const posX = (i * spacing) - (frameWidth / 2);
            barGroup.position.x = posX;

            const bar = new THREE.Mesh(barGeo, frameMat);
            bar.scale.set(lightBarWidth, frameHeight * 0.8, frameDepth);
            barGroup.add(bar);

            const ledStrip = new THREE.Mesh(ledStripGeo, ledMat);
            ledStrip.scale.set(lightBarWidth * 0.8, frameDepth * 0.95, 1);
            ledStrip.rotation.x = Math.PI / 2;
            ledStrip.position.y = -(frameHeight * 0.4) - 0.1;
            barGroup.add(ledStrip);

            lightGroup.add(barGroup);
        }

        return lightGroup;
    }

    public animate(_deltaTime: number) {
        if (this.ledMaterial && this.context.device) {
            const isDay = this.context.device.biologicalMetrics?.isDay;
            if (isDay) {
                const breath = 0.8 + Math.sin(performance.now() / 1000 * 2) * 0.2;
                this.ledMaterial.emissiveIntensity = breath;
            } else {
                this.ledMaterial.emissiveIntensity = 0;
            }
        }
    }
}
