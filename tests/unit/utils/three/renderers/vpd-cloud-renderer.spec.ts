
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { VpdCloudRenderer } from '../../../../../src/utils/three/renderers/vpd-cloud-renderer';
import { SensorTypeUtils } from '../../../../../src/utils/sensor-type-utils';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    const mockVector3 = function (this: any, x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = vi.fn((nx, ny, nz) => {
            if (typeof nx === 'number') { this.x = nx; this.y = ny; this.z = nz; }
            return this;
        });
        this.copy = vi.fn((v) => { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.clone = vi.fn(() => new (mockVector3 as any)(this.x, this.y, this.z));
        this.add = vi.fn((v) => { this.x += v.x; this.y += v.y; this.z += v.z; return this; });
        this.sub = vi.fn((v) => { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; });
        this.applyMatrix4 = vi.fn(() => this);
    };

    const mockMatrix4 = function (this: any) {
        this.copy = vi.fn(() => this);
        this.invert = vi.fn(() => this);
    };

    return {
        ...actual,
        Group: vi.fn().mockImplementation(function () {
            const children: any[] = [];
            return {
                add: vi.fn((obj) => { children.push(obj); }),
                remove: vi.fn((obj) => { const idx = children.indexOf(obj); if (idx > -1) children.splice(idx, 1); }),
                children,
                position: new (mockVector3 as any)(),
                userData: {},
                traverse: vi.fn(function (cb) { cb(this); children.forEach(c => c.traverse?.(cb)); })
            };
        }),
        Mesh: vi.fn().mockImplementation(function (geo, mat) {
            const children: any[] = [];
            return {
                geometry: geo,
                material: mat,
                add: vi.fn((obj) => { children.push(obj); }),
                remove: vi.fn((obj) => { const idx = children.indexOf(obj); if (idx > -1) children.splice(idx, 1); }),
                children,
                position: new (mockVector3 as any)(),
                scale: new (mockVector3 as any)(1, 1, 1),
                userData: {},
                matrixWorld: new (mockMatrix4 as any)(),
                traverse: vi.fn(function (cb) { cb(this); children.forEach(c => c.traverse?.(cb)); })
            };
        }),
        ShaderMaterial: vi.fn().mockImplementation(function (params) {
            this.uniforms = params.uniforms || {};
            this.transparent = params.transparent;
            this.side = params.side;
        }),
        Vector3: mockVector3,
        Vector4: function (this: any, x = 0, y = 0, z = 0, w = 0) {
            this.x = x; this.y = y; this.z = z; this.w = w;
            this.set = vi.fn((nx, ny, nz, nw) => { this.x = nx; this.y = ny; this.z = nz; this.w = nw; return this; });
        },
        Matrix4: mockMatrix4,
        BoxGeometry: vi.fn(),
        BackSide: 1
    };
});

vi.mock('../../../../../src/utils/sensor-type-utils', () => ({
    SensorTypeUtils: {
        isTemperature: vi.fn(),
        isHumidity: vi.fn(),
        isVPD: vi.fn(),
        isLight: vi.fn(),
        isFan: vi.fn()
    }
}));

describe('VpdCloudRenderer', () => {
    let context: any;
    let renderer: VpdCloudRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 100, height: 200 },
                environmentAttributes: {},
                biologicalMetrics: { vpdDangerMin: 0.4, vpdTargetMin: 0.8, vpdTargetMax: 1.2, vpdDangerMax: 1.6 }
            },
            hass: { states: {} },
            volatileGroup: new THREE.Group(),
            sensorMeshes: new Map(),
            scene: { userData: {} },
            visibility: { heatmap: true },
            selectedMetric: 'vpd',
            camera: { position: new THREE.Vector3(0, 0, 100) },
            getSensorValue: vi.fn((id, metric) => 1.0)
        };
        renderer = new VpdCloudRenderer(context);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should dispose and return if selectedMetric is none or lights', () => {
        context.selectedMetric = null;
        const disposeSpy = vi.spyOn(renderer, 'dispose');
        renderer.render();
        expect(disposeSpy).toHaveBeenCalled();

        context.selectedMetric = 'lights';
        renderer.render();
        expect(disposeSpy).toHaveBeenCalledTimes(2);
    });

    it('should dispose and return if visibility.heatmap is false', () => {
        context.visibility.heatmap = false;
        const disposeSpy = vi.spyOn(renderer, 'dispose');
        renderer.render();
        expect(disposeSpy).toHaveBeenCalled();
    });

    it('should create cloud mesh and update uniforms', () => {
        renderer.render();
        expect(context.volatileGroup.add).toHaveBeenCalled();
        const mesh = context.volatileGroup.children[0];
        expect(mesh.userData.isVpdCloud).toBeTruthy();
        expect(mesh.material.uniforms.u_sensorCount.value).toBe(0); // No sensors yet
    });

    it('should recreate mesh if dimensions change', () => {
        renderer.render();
        const mesh1 = context.volatileGroup.children[0];

        // Change width
        context.device.dimensions.width = 150;
        renderer.render();
        const mesh2 = context.volatileGroup.children[1] || context.volatileGroup.children[0];
        // Note: remove might have cleared children if mocked correctly, but here we just check it was called.
        // In my Group mock, remove works on the internal children array.
        expect(context.volatileGroup.remove).toHaveBeenCalledWith(mesh1);
    });

    it('should update uniforms with sensor data', () => {
        const sensorId = 'sensor.test';
        const sensorMesh = { position: new THREE.Vector3(10, 10, 10) } as any;
        context.sensorMeshes.set(sensorId, sensorMesh);

        vi.spyOn(SensorTypeUtils, 'isVPD').mockReturnValue(true);
        context.selectedMetric = 'vpd';

        renderer.render();
        renderer.updateUniforms();

        const mesh = context.volatileGroup.children[0];
        const uniforms = (mesh as any).material.uniforms;
        expect(uniforms.u_sensorCount.value).toBe(1);
        expect(uniforms.u_sensorValues.value[0]).toBe(1.0);
        expect(uniforms.u_thresholds.value.x).toBe(0.4);
    });

    it('should animate cloud time', () => {
        renderer.render();
        const mesh = context.volatileGroup.children[0];
        const initialTime = mesh.material.uniforms.u_time.value;

        renderer.animate(0.5);
        expect(mesh.material.uniforms.u_time.value).toBe(initialTime + 0.5);
    });

    it('should handle missing range for metric', () => {
        context.selectedMetric = 'invalid';
        renderer.render();
        // Just verifying it doesn't crash
        renderer.updateUniforms();
    });

    describe('Branch Coverage Gaps', () => {
        it('should use default dimensions if missing', () => {
            context.device.dimensions = null;
            renderer.render();
            const mesh = context.volatileGroup.children[0];
            // width: 120, height: 200, depth: 120
            expect(mesh.scale.set).toHaveBeenCalledWith(120, 200, 120);
        });

        it('should fallback to depth if length is missing', () => {
            context.device.dimensions = { width: 100, height: 100, depth: 50 } as any;
            renderer.render();
            const mesh = context.volatileGroup.children[0];
            expect(mesh.scale.set).toHaveBeenCalledWith(100, 100, 50);
        });

        it('should use default depth if both length and depth are missing', () => {
            context.device.dimensions = { width: 100, height: 100 } as any;
            renderer.render();
            const mesh = context.volatileGroup.children[0];
            expect(mesh.scale.set).toHaveBeenCalledWith(100, 100, 120);
        });

        it('should handle temperature metric and thresholds', () => {
            context.selectedMetric = 'temperature';
            vi.spyOn(SensorTypeUtils, 'isTemperature').mockReturnValue(true);
            const sensorId = 'sensor.temp';
            context.sensorMeshes.set(sensorId, { position: new THREE.Vector3(0, 0, 0) });

            renderer.render();
            renderer.updateUniforms();

            const mesh = context.volatileGroup.children[0];
            const uniforms = mesh.material.uniforms;
            expect(uniforms.u_thresholds.value.x).toBe(15);
            expect(uniforms.u_thresholds.value.y).toBe(18);
            expect(uniforms.u_sensorCount.value).toBe(1);
        });

        it('should handle humidity metric and thresholds', () => {
            context.selectedMetric = 'humidity';
            vi.spyOn(SensorTypeUtils, 'isHumidity').mockReturnValue(true);
            const sensorId = 'sensor.hum';
            context.sensorMeshes.set(sensorId, { position: new THREE.Vector3(0, 0, 0) });

            renderer.render();
            renderer.updateUniforms();

            const mesh = context.volatileGroup.children[0];
            const uniforms = mesh.material.uniforms;
            expect(uniforms.u_thresholds.value.x).toBe(30);
            expect(uniforms.u_thresholds.value.y).toBe(40);
        });

        it('should fallback to default thresholds for vpd if biologicalMetrics is missing', () => {
            context.device.biologicalMetrics = null;
            context.selectedMetric = 'vpd';
            renderer.render();
            renderer.updateUniforms();
            const mesh = context.volatileGroup.children[0];
            expect(mesh.material.uniforms.u_thresholds.value.x).toBe(0.4);
            expect(mesh.material.uniforms.u_thresholds.value.y).toBe(0.8);
        });

        it('should exclude fans and lights from heatmap', () => {
            const tempSensor = 'sensor.temp';
            const lightSensor = 'sensor.light';
            const fanSensor = 'sensor.fan';

            context.sensorMeshes.set(tempSensor, { position: new THREE.Vector3(0, 0, 0) });
            context.sensorMeshes.set(lightSensor, { position: new THREE.Vector3(0, 0, 0) });
            context.sensorMeshes.set(fanSensor, { position: new THREE.Vector3(0, 0, 0) });

            vi.spyOn(SensorTypeUtils, 'isTemperature').mockReturnValue(true);
            vi.spyOn(SensorTypeUtils, 'isLight').mockImplementation((dev, hass, id) => id === lightSensor);
            vi.spyOn(SensorTypeUtils, 'isFan').mockImplementation((dev, id) => id === fanSensor);

            context.selectedMetric = 'temperature';
            renderer.render();
            renderer.updateUniforms();

            const mesh = context.volatileGroup.children[0];
            expect(mesh.material.uniforms.u_sensorCount.value).toBe(1); // Only temp sensor
        });

        it('should skip sensors with null values', () => {
            context.sensorMeshes.set('sensor.null', { position: new THREE.Vector3(0, 0, 0) });
            vi.spyOn(SensorTypeUtils, 'isVPD').mockReturnValue(true);
            context.getSensorValue.mockReturnValue(null);

            renderer.render();
            renderer.updateUniforms();
            const mesh = context.volatileGroup.children[0];
            expect(mesh.material.uniforms.u_sensorCount.value).toBe(0);
        });

        it('should handle missing getSensorValue in context', () => {
            context.sensorMeshes.set('sensor1', { position: new THREE.Vector3(0, 0, 0) });
            vi.spyOn(SensorTypeUtils, 'isVPD').mockReturnValue(true);
            delete context.getSensorValue;

            renderer.render();
            renderer.updateUniforms();
            const mesh = context.volatileGroup.children[0];
            expect(mesh.material.uniforms.u_sensorCount.value).toBe(0);
        });

        it('should return early if volMesh is missing in animate', () => {
            context.volatileGroup.children = [];
            // Should not crash
            renderer.animate(0.5);
        });

        it('should return early if volMesh is missing in updateUniforms', () => {
            context.volatileGroup.children = [];
            // Should not crash
            renderer.updateUniforms();
        });

        it('should handle missing uniforms gracefully', () => {
            renderer.render();
            const mesh = context.volatileGroup.children[0];
            // Clear uniforms
            mesh.material.uniforms = {};

            // Should not crash
            renderer.updateUniforms();
            renderer.animate(0.5);
        });

        it('should reuse mesh if dimensions are same', () => {
            renderer.render();
            const mesh1 = context.volatileGroup.children[0];

            // Render again with same dimensions
            renderer.render();
            const mesh2 = context.volatileGroup.children[0];

            expect(mesh1).toBe(mesh2);
            expect(context.volatileGroup.remove).not.toHaveBeenCalled();
        });

        it('should handle missing thresholds uniform', () => {
            renderer.render();
            const mesh = context.volatileGroup.children[0];
            delete mesh.material.uniforms.u_thresholds;

            // Should not crash
            renderer.updateUniforms();
        });

        it('should cover all sensor relevance permutations and threshold paths', () => {
            const sensors = {
                'temp': 'temperature',
                'hum': 'humidity',
                'vpd': 'vpd',
                'fan': 'fan',
                'light': 'light',
                'other': 'other'
            };

            Object.entries(sensors).forEach(([id, _]) => {
                context.sensorMeshes.set(id, { position: new THREE.Vector3() });
            });

            vi.spyOn(SensorTypeUtils, 'isTemperature').mockImplementation((_dev, _hass, id) => id === 'temp');
            vi.spyOn(SensorTypeUtils, 'isHumidity').mockImplementation((_dev, _hass, id) => id === 'hum');
            vi.spyOn(SensorTypeUtils, 'isVPD').mockImplementation((_dev, _hass, id) => id === 'vpd');
            vi.spyOn(SensorTypeUtils, 'isLight').mockImplementation((_dev, _hass, id) => id === 'light');
            vi.spyOn(SensorTypeUtils, 'isFan').mockImplementation((_dev, id) => id === 'fan');

            // Test each metric
            ['temperature', 'humidity', 'vpd'].forEach(metric => {
                context.selectedMetric = metric;
                renderer.render();
                renderer.updateUniforms();
                const mesh = context.volatileGroup.children.find((c: any) => c.userData.isVpdCloud);
                expect((mesh as any).material.uniforms.u_sensorCount.value).toBe(1);
            });
        });
    });
});
