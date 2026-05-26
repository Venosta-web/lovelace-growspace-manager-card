
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { EquipmentRenderer } from '../../../../../src/utils/three/renderers/equipment-renderer';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    const mockVector3 = function (this: any, x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = vi.fn((nx, ny, nz) => {
            if (typeof nx === 'number') { this.x = nx; this.y = ny; this.z = nz; }
            return this;
        });
        this.clone = vi.fn(() => new (mockVector3 as any)(this.x, this.y, this.z));
        this.add = vi.fn(function (this: any, v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; });
        this.sub = vi.fn(function (this: any, v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; });
        this.multiplyScalar = vi.fn(function (this: any, s) { this.x *= s; this.y *= s; this.z *= s; return this; });
        this.lerp = vi.fn(function (this: any, v, alpha) {
            this.x += (v.x - this.x) * alpha;
            this.y += (v.y - this.y) * alpha;
            this.z += (v.z - this.z) * alpha;
            return this;
        });
        this.applyAxisAngle = vi.fn(function (this: any) { return this; });
        this.copy = vi.fn(function (this: any, v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; });
        this.lerpVectors = vi.fn();
    };

    const createObject3DNode = function (this: any) {
        const children: any[] = [];
        this.add = vi.fn((obj) => { children.push(obj); });
        this.remove = vi.fn((obj) => { const idx = children.indexOf(obj); if (idx > -1) children.splice(idx, 1); });
        this.children = children;
        this.getObjectByName = vi.fn((name) => children.find(c => c.name === name));
        this.position = new (mockVector3 as any)();
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = { set: vi.fn() };
        this.userData = {};
        this.name = '';
        this.visible = true;
        this.rotateX = vi.fn();
        this.rotateZ = vi.fn();
        this.localToWorld = vi.fn(v => v);
        this.getWorldPosition = vi.fn((v) => v.set(0, 0, 0));
        this.traverse = vi.fn((cb) => { cb(this); children.forEach(c => c.traverse?.(cb)); });
    };

    return {
        ...actual,
        Group: vi.fn().mockImplementation(createObject3DNode),
        Mesh: vi.fn().mockImplementation(function (this: any, geo, mat) {
            createObject3DNode.call(this);
            this.geometry = geo;
            this.material = mat;
        }),
        Points: vi.fn().mockImplementation(function (this: any) {
            createObject3DNode.call(this);
            this.geometry = {
                attributes: {
                    position: { array: new Float32Array(1500), needsUpdate: false },
                    velocity: { array: new Float32Array(1500), needsUpdate: false },
                    lifetime: { array: new Float32Array(500), needsUpdate: false },
                    progress: { array: new Float32Array(500), needsUpdate: false }
                }
            };
            this.material = { dispose: vi.fn() };
            this.frustumCulled = true;
        }),
        Vector3: mockVector3,
        CatmullRomCurve3: vi.fn().mockImplementation(function () {
            return {
                getPoint: vi.fn(() => new (mockVector3 as any)(0, 0, 0)),
                getPoints: vi.fn(() => [])
            };
        }),
        TubeGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        CylinderGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        BoxGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        PlaneGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        MeshStandardMaterial: vi.fn(),
        MeshPhysicalMaterial: vi.fn(),
        MeshBasicMaterial: vi.fn(),
        PointsMaterial: vi.fn(),
        MathUtils: { degToRad: vi.fn(d => d * Math.PI / 180) }
    };
});

vi.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
    CSS2DObject: vi.fn().mockImplementation(function (this: any, el) {
        this.element = el;
        this.name = '';
        this.position = { set: vi.fn() };
        this.isCSS2DObject = true;
        this.visible = true;
        this.traverse = vi.fn((cb) => cb(this));
    })
}));

describe('EquipmentRenderer', () => {
    let context: any;
    let renderer: EquipmentRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 150, height: 200 },
                environmentAttributes: {
                    humidifierEntities: [],
                    dehumidifierEntities: [],
                    sensorCoordinates: {},
                    sensorTypes: {},
                    activeEvents: {}
                },
                irrigationConfig: {}
            },
            hass: { states: {} },
            volatileGroup: new (THREE.Group as any)(),
            sensorMeshes: new Map(),
            scene: { userData: { element: { dispatchEvent: vi.fn() } } },
            requestUpdate: vi.fn()
        };
        renderer = new EquipmentRenderer(context);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize and render humidifier with intensity', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 50, y: 75, z: 10 } };
        context.hass.states['h1'] = { state: '75' }; // intensity 7.5

        renderer.render();
        const hum = context.sensorMeshes.get('h1');
        expect(hum.userData.intensity).toBe(7.5);
        expect(hum.getObjectByName('digits')).toBeDefined();

        // Update to 0 intensity
        context.hass.states['h1'] = { state: '0' };
        renderer.render();
        expect(hum.userData.intensity).toBe(0);
        expect(hum.getObjectByName('digits')).toBeUndefined();
    });

    it('should handle humidifier outside with hose', () => {
        context.device.environmentAttributes.humidifierEntities = ['h_out'];
        context.device.environmentAttributes.sensorCoordinates = { 'h_out': { x: -20, y: 50, z: 0, rotation: 90 } };
        context.hass.states['h_out'] = { state: 'on' };

        renderer.render();
        const hum = context.sensorMeshes.get('h_out');
        expect(hum.userData.isOutside).toBe(true);
        expect(hum.getObjectByName('hose')).toBeDefined();
        expect(hum.rotation.y).toBeGreaterThan(0);
    });

    it('should handle irrigation pump active events', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.activeEvents = {
            'irrigation': { start: new Date().toISOString(), duration: 60 }
        };
        context.hass.states['p1'] = { state: 'off' };

        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        expect(pump.userData.isActive).toBe(true); // Active due to event
    });

    it('should link pump to tank and handle unlink', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.pump_tank_links = { 'p1': 't1' };

        const tankMesh = new (THREE.Group as any)();
        tankMesh.userData.entityId = 't1';
        tankMesh.position.set(20, 0, 30);
        context.sensorMeshes.set('t1', tankMesh);

        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        expect(pump.userData.tankId).toBe('t1');

        const unlinkIcon = pump.getObjectByName('unlinkIcon');
        expect(unlinkIcon.visible).toBe(true);

        // Sim click unlink
        unlinkIcon.element.onclick!(new MouseEvent('click'));
        expect(context.scene.userData.element.dispatchEvent).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'unlink' })
        );
    });

    it('should render and animate exhaust fans with speed', () => {
        context.device.environmentAttributes.exhaustFanEntities = ['ex1'];
        context.device.environmentAttributes.sensorCoordinates = { 'ex1': { x: 50, y: 75, z: 200 } };
        context.hass.states['ex1'] = { state: '100' }; // speed 10

        renderer.render();
        const fan = context.sensorMeshes.get('ex1');
        expect(fan.userData.speed).toBe(10);

        const blades = fan.getObjectByName('exhaustBlades');
        expect(blades).toBeDefined();
        blades.rotation = { z: 0 }; // Initialize for test

        renderer.animate(0.016);
        expect(blades.rotation.z).toBeGreaterThan(0);
    });

    it('should animate particles for humidifier, dehum and pumps', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.dehumidifierEntities = ['d1'];
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = {
            'h1': { x: 50, y: 50 }, 'd1': { x: 60, y: 60 }, 'p1': { x: -10, y: 10 }
        };
        context.hass.states['h1'] = { state: 'on' };
        context.hass.states['d1'] = { state: 'on' };
        context.hass.states['p1'] = { state: 'on' };

        renderer.render();
        renderer.animate(0.1);

        expect((renderer as any)._humidifierParticles.geometry.attributes.position.needsUpdate).toBeTruthy();
        expect((renderer as any)._dryAirParticles.geometry.attributes.position.needsUpdate).toBeTruthy();
        expect((renderer as any)._pumpWaterParticles.geometry.attributes.position.needsUpdate).toBeTruthy();
    });

    it('should handle numeric and string states for intensity and speed', () => {
        context.device.environmentAttributes.exhaustFanEntities = ['ex1'];
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'ex1': { x: 0, y: 0 }, 'h1': { x: 10, y: 10 } };

        // String 'on'
        context.hass.states['ex1'] = { state: 'on' };
        context.hass.states['h1'] = { state: 'on' };
        renderer.render();
        expect(context.sensorMeshes.get('ex1').userData.speed).toBe(5);
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(5);

        // Numeric
        context.hass.states['ex1'] = { state: '80' }; // 8
        context.hass.states['h1'] = { state: '80' }; // 8
        renderer.render();
        expect(context.sensorMeshes.get('ex1').userData.speed).toBe(8);
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(8);
    });

    it('should handle missing dimensions and use defaults', () => {
        context.device.dimensions = null; // Should fall back to 120, 120, 200
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 10, y: 10 } };
        renderer.render();
        const hum = context.sensorMeshes.get('h1');
        expect(hum.position.x).toBe(10 - 120 / 2); // default width 120
    });

    it('should handle depth from length or depth property', () => {
        context.device.dimensions = { width: 100, height: 200, depth: 80 } as any; // Length missing
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 10, y: 10 } };
        renderer.render();
        const hum = context.sensorMeshes.get('h1');
        expect(hum.position.z).toBe(10 - 80 / 2);
    });

    it('should handle singular entity IDs (humidifierEntity, dehumidifierEntity, exhaustEntity)', () => {
        context.device.environmentAttributes.humidifierEntities = undefined;
        context.device.environmentAttributes.dehumidifierEntities = undefined;
        context.device.environmentAttributes.exhaustFanEntities = undefined;
        context.device.environmentAttributes.humidifierEntity = 'h1';
        context.device.environmentAttributes.dehumidifierEntity = 'd1';
        context.device.environmentAttributes.exhaustEntity = 'ex1';
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 0, y: 0 }, 'd1': { x: 5, y: 5 }, 'ex1': { x: 10, y: 10 } };

        renderer.render();
        expect(context.sensorMeshes.has('h1')).toBe(true);
        expect(context.sensorMeshes.has('d1')).toBe(true);
        expect(context.sensorMeshes.has('ex1')).toBe(true);
    });

    it('should handle pump with missing coordinates and sensor types', () => {
        context.device.environmentAttributes.sensorTypes = { 'p1': 'irrigation_pump' };
        // No sensorCoordinates for 'p1', should use default {x:0, y:0, z:0, rotation:0}
        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        expect(pump).toBeDefined();
        expect(pump.position.x).toBe(0 - 100 / 2);
    });

    it('should cleanup stale objects from cache and scene', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 0, y: 0 } };
        renderer.render();
        expect(context.sensorMeshes.has('h1')).toBe(true);
        expect(renderer['cache'].has('h1')).toBe(true);

        context.device.environmentAttributes.humidifierEntities = [];
        renderer.render();
        expect(context.sensorMeshes.has('h1')).toBe(false);
        expect(renderer['cache'].has('h1')).toBe(false);
    });

    it('should distinguish between humidifier and dehumidifier models', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.dehumidifierEntities = ['d1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 0, y: 0 }, 'd1': { x: 10, y: 10 } };

        renderer.render();
        const hum = context.sensorMeshes.get('h1');
        const dehum = context.sensorMeshes.get('d1');

        expect(hum.userData.isDehumidifier).toBe(false);
        expect(dehum.userData.isDehumidifier).toBe(true);
    });

    it('should handle invalid states for intensity', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 0, y: 0 } };

        // Invalid state
        context.hass.states['h1'] = { state: 'unavailable' };
        renderer.render();
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(0);

        // state is 0
        context.hass.states['h1'] = { state: '0' };
        renderer.render();
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(0);
    });

    it('should handle pump link where tankMesh exists but ID mismatch', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.pump_tank_links = { 'p1': 't1' };

        const wrongTank = new (THREE.Group as any)();
        wrongTank.userData.entityId = 't2'; // ID mismatch
        context.sensorMeshes.set('t1', wrongTank);

        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        // Should use standard positioning if ID doesn't match
        expect(pump.position.y).toBe(0);
    });

    it('should replace old hose when humidifier update occurs outside', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: -20, y: 50, z: 0 } };
        context.hass.states['h1'] = { state: 'on' };

        renderer.render();
        const hum = context.sensorMeshes.get('h1');
        const firstHose = hum.getObjectByName('hose');
        expect(firstHose).toBeDefined();

        // Change target height to force hose update
        context.device.environmentAttributes.sensorCoordinates['h1'].z = 50;
        renderer.render();
        const secondHose = hum.getObjectByName('hose');
        expect(secondHose).toBeDefined();
        expect(secondHose).not.toBe(firstHose);
    });

    it('should replace old pump hose when update occurs', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: -10, y: 10 } };
        context.hass.states['p1'] = { state: 'on' };

        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        const firstHose = pump.getObjectByName('pumpHose');
        expect(firstHose).toBeDefined();

        // Update state to force hose update
        context.hass.states['p1'] = { state: 'off' };
        renderer.render();
        const secondHose = pump.getObjectByName('pumpHose');
        expect(secondHose).toBeDefined();
        expect(secondHose).not.toBe(firstHose);
    });

    it('should handle particle animation with no active equipment', () => {
        context.hass.states = {}; // No equipment 'on'
        renderer.render();

        // Should not throw and finish quickly
        renderer.animate(0.1);
        expect((renderer as any)._humidifierParticles.geometry.attributes.position.needsUpdate).toBeTruthy();
    });

    it('should handle drain pump vs irrigation pump in particle animation', () => {
        context.device.irrigationConfig = { drainPumpEntity: 'p_drain' };
        context.device.environmentAttributes.sensorCoordinates = { 'p_drain': { x: -10, y: 10 } };
        context.hass.states['p_drain'] = { state: 'on' };

        renderer.render();
        const pump = context.sensorMeshes.get('p_drain');
        expect(pump.userData.isDrain).toBe(true);

        // Animate multiple times to ensure progress logic branches are hit
        for (let i = 0; i < 60; i++) renderer.animate(0.1);
        expect((renderer as any)._pumpWaterParticles.geometry.attributes.position.needsUpdate).toBeTruthy();
    });

    it('should handle wind particles with exhaust fans (suction and blow)', () => {
        context.device.environmentAttributes.exhaustFanEntities = ['ex1'];
        context.device.environmentAttributes.sensorCoordinates = { 'ex1': { x: 50, y: 50, z: 100, rotation: 45 } };
        context.hass.states['ex1'] = { state: 'on' };

        renderer.render();
        // Trigger some animations to hit suction/blow branches (since they are random)
        const mathRandomSpy = vi.spyOn(Math, 'random');

        // Branch: isSuction = true
        mathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.6).mockReturnValueOnce(0.1);
        renderer.animate(0.1);

        // Branch: isSuction = false
        mathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.4).mockReturnValueOnce(0.1);
        renderer.animate(0.1);

        // Branch: life > 0 (for already active particles)
        renderer.animate(0.1);

        expect((renderer as any)._windParticles.geometry.attributes.position.needsUpdate).toBeTruthy();
        mathRandomSpy.mockRestore();
    });

    it('should handle various humidifier update branches', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 50, y: 50 } };
        context.hass.states['h1'] = { state: 'on' };
        renderer.render();
        const hum = context.sensorMeshes.get('h1');

        // Branch: oldIntensity === intensity
        renderer.render();

        // Branch: intensity 0 -> >0
        context.hass.states['h1'] = { state: 'off' };
        renderer.render();
        expect(hum.getObjectByName('digits')).toBeUndefined();
        context.hass.states['h1'] = { state: 'on' };
        renderer.render();
        expect(hum.getObjectByName('digits')).toBeDefined();

        // Branch: isOutside changed
        context.device.environmentAttributes.sensorCoordinates['h1'].x = -20;
        renderer.render();
        expect(hum.getObjectByName('hose')).toBeDefined();
    });

    it('should handle complex pump update and state branches', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1', drainPumpEntity: 'p2' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: 50, y: 50 }, 'p2': { x: 10, y: -10 } };
        context.hass.states['p1'] = { state: '0.5' };
        context.hass.states['p2'] = { state: 'off' };

        renderer.render();
        expect(context.sensorMeshes.get('p1').userData.isActive).toBe(true);
        expect(context.sensorMeshes.get('p1').userData.isDrain).toBe(false);
        expect(context.sensorMeshes.get('p2').userData.isDrain).toBe(true);

        // Event timing branches
        const now = Date.now();
        context.device.environmentAttributes.activeEvents = {
            'drain': { start: new Date(now + 10000).toISOString(), duration: 60 } // Not started
        };
        renderer.render();
        expect(context.sensorMeshes.get('p2').userData.isActive).toBe(false);

        context.device.environmentAttributes.activeEvents = {
            'drain': { start: new Date(now - 70000).toISOString(), duration: 60 } // Finished
        };
        renderer.render();
        expect(context.sensorMeshes.get('p2').userData.isActive).toBe(false);
    });

    it('should cover updatePumpModel short-circuit and complex if branches', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: -20, y: 50 } };
        context.hass.states['p1'] = { state: 'on' };
        renderer.render();
        const pump = context.sensorMeshes.get('p1');

        // Branch: First part of IF is false (not outside, no tankMesh)
        context.device.environmentAttributes.sensorCoordinates['p1'].x = 50;
        renderer.render();
        // Since it's no longer outside, it should handle the else branch for positioning

        // Branch: First part true, second part false (no change)
        context.device.environmentAttributes.sensorCoordinates['p1'].x = -20;
        renderer.render(); // Re-creates hose
        renderer.render(); // No change, should skip hose creation

        // Branch: Second part parts (change isActive, change isOutside, change targetH, change tankId)
        context.hass.states['p1'] = { state: 'off' };
        renderer.render(); // isActive changed

        context.device.environmentAttributes.sensorCoordinates['p1'].x = -30;
        renderer.render(); // isOutside changed (still true, but coordinate changed)

        context.device.environmentAttributes.sensorCoordinates['p1'].z = 100;
        renderer.render(); // targetH changed

        const tankMesh = new (THREE.Group as any)();
        tankMesh.userData.entityId = 't1';
        context.sensorMeshes.set('t1', tankMesh);
        context.device.environmentAttributes.pump_tank_links = { 'p1': 't1' };
        renderer.render(); // tankId changed
    });

    it('should cover intensity logic branches for humidifier/dehumidifier', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.dehumidifierEntities = ['d1'];
        context.device.environmentAttributes.dehumidifierEntity = 'd1'; // redundant but hits dehum logic branch
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 50, y: 50 }, 'd1': { x: 60, y: 60 } };

        // val > 10
        context.hass.states['h1'] = { state: '50' }; // intensity 5
        context.hass.states['d1'] = { state: '5' };  // intensity 5
        renderer.render();
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(5);
        expect(context.sensorMeshes.get('d1').userData.intensity).toBe(5);

        // state undefined
        delete context.hass.states['h1'];
        renderer.render();
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(0);
    });

    it('should cover existing particle movement branches', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.dehumidifierEntities = ['d1'];
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 50, y: 50 }, 'd1': { x: 10, y: 10 }, 'p1': { x: -10, y: 10 } };
        context.hass.states['h1'] = { state: 'on' };
        context.hass.states['d1'] = { state: 'on' };
        context.hass.states['p1'] = { state: 'on' };

        renderer.render();

        // Mock life to be > 0 for some particles to hit movement branches
        const humParticles = (renderer as any)._humidifierParticles.geometry.attributes.lifetime.array;
        humParticles[0] = 0.5;
        const dryParticles = (renderer as any)._dryAirParticles.geometry.attributes.lifetime.array;
        dryParticles[0] = 0.5;
        const windParticles = (renderer as any)._windParticles.geometry.attributes.lifetime.array;
        windParticles[0] = 0.5;

        renderer.animate(0.1);
        // Should hit life[i] > 0 branches
    });

    it('should cover all coordinate boundary branches (isOutside)', () => {
        context.device.dimensions = { width: 100, length: 150, height: 200 };
        context.device.environmentAttributes.humidifierEntities = ['h1', 'h2', 'h3', 'h4', 'h5'];
        context.device.environmentAttributes.sensorCoordinates = {
            'h1': { x: -1, y: 50 },  // x < 0
            'h2': { x: 101, y: 50 }, // x > width
            'h3': { x: 50, y: -1 },  // y < 0
            'h4': { x: 50, y: 151 }, // y > depth
            'h5': { x: 50, y: 50 }   // inside
        };
        renderer.render();
        expect(context.sensorMeshes.get('h1').userData.isOutside).toBe(true);
        expect(context.sensorMeshes.get('h2').userData.isOutside).toBe(true);
        expect(context.sensorMeshes.get('h3').userData.isOutside).toBe(true);
        expect(context.sensorMeshes.get('h4').userData.isOutside).toBe(true);
        expect(context.sensorMeshes.get('h5').userData.isOutside).toBe(false);
    });

    it('should cover remaining particle animation branches (boundary conditions)', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1', drainPumpEntity: 'p2' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: -10, y: 10 }, 'p2': { x: -10, y: 20 } };
        context.hass.states['p1'] = { state: 'on' };
        context.hass.states['p2'] = { state: 'on' };
        renderer.render();

        const prog = (renderer as any)._pumpWaterParticles.geometry.attributes.progress.array;
        const life = (renderer as any)._pumpWaterParticles.geometry.attributes.lifetime.array;

        // irrigation pump (p1)
        life[0] = 0.5;
        prog[0] = 0.99; // Will exceed 1 next frame

        // drain pump (p2)
        life[1] = 0.5;
        prog[1] = 0.01; // Will go below 0 next frame

        renderer.animate(0.1);
        expect(life[0]).toBe(0); // Finished
        expect(life[1]).toBe(0); // Finished
    });

    it('should cover updateHumidifierModel hose end rotation and logicZ', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: -20, y: 50, rotation: 90, z: 10 } };
        context.hass.states['h1'] = { state: 'on' };
        renderer.render();
        const hum = context.sensorMeshes.get('h1');
        expect(hum.userData.logicalZ).toBe(10);
    });

    it('should cover animate exhaust blades missing branch', () => {
        context.device.environmentAttributes.exhaustFanEntities = ['ex1'];
        context.device.environmentAttributes.sensorCoordinates = { 'ex1': { x: 50, y: 50, z: 100 } };
        context.hass.states['ex1'] = { state: 'on' };
        renderer.render();
        const fan = context.sensorMeshes.get('ex1');

        // Remove blades to hit 'if (blades)' missing branch
        const blades = fan.getObjectByName('exhaustBlades');
        if (blades) fan.remove(blades);

        renderer.animate(0.1); // Should not throw
    });

    it('should hit the unlink event element missing branch if dispatchEvent fails', () => {
        context.scene.userData.element = undefined;
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.pump_tank_links = { 'p1': 't1' };
        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        const unlinkIcon = pump.getObjectByName('unlinkIcon');

        unlinkIcon!.element.onclick!(new MouseEvent('click')); // Should not throw due to ?. 
    });

    it('should hit all intensity ternary branches', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1', 'h2', 'h3', 'h4'];
        context.device.environmentAttributes.sensorCoordinates = {
            'h1': { x: 0, y: 0 }, 'h2': { x: 10, y: 10 }, 'h3': { x: 20, y: 20 }, 'h4': { x: 30, y: 30 }
        };

        context.hass.states['h1'] = { state: 'on' };      // isNaN=true, on=true -> 5
        context.hass.states['h2'] = { state: 'off' };     // isNaN=true, on=false -> 0
        context.hass.states['h3'] = { state: '100' };    // isNaN=false, >10=true -> 10
        context.hass.states['h4'] = { state: '5' };      // isNaN=false, >10=false -> 5

        renderer.render();
        expect(context.sensorMeshes.get('h1').userData.intensity).toBe(5);
        expect(context.sensorMeshes.get('h2').userData.intensity).toBe(0);
        expect(context.sensorMeshes.get('h3').userData.intensity).toBe(10);
        expect(context.sensorMeshes.get('h4').userData.intensity).toBe(5);
    });

    it('should hit all pump state logic branches', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1', drainPumpEntity: 'p2' };
        context.device.environmentAttributes.sensorTypes = { 'p3': 'irrigation_pump', 'p4': 'irrigation_pump' };
        context.device.environmentAttributes.sensorCoordinates = {
            'p1': { x: 0, y: 0 }, 'p2': { x: 10, y: 10 }, 'p3': { x: 20, y: 20 }, 'p4': { x: 30, y: 30 }
        };

        context.hass.states['p1'] = { state: 'on' };    // part 1: true
        context.hass.states['p2'] = { state: 'off' };   // part 1: false, part 2: false
        context.hass.states['p3'] = { state: '5' };     // part 1: false, part 2: true (5 > 0)
        context.hass.states['p4'] = { state: '0' };     // part 1: false, part 2: true (0 > 0 is false)

        renderer.render();
        expect(context.sensorMeshes.get('p1').userData.isActive).toBe(true);
        expect(context.sensorMeshes.get('p2').userData.isActive).toBe(false);
        expect(context.sensorMeshes.get('p3').userData.isActive).toBe(true);
        expect(context.sensorMeshes.get('p4').userData.isActive).toBe(false);
    });

    it('should handle uninitialized particles branches', () => {
        const freshRenderer = new EquipmentRenderer(context);
        freshRenderer.animate(0.1);
    });

    it('should hit pump particle src null branch', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: -10, y: 10 } };
        context.hass.states['p1'] = { state: 'on' };
        renderer.render();

        const life = (renderer as any)._pumpWaterParticles.geometry.attributes.lifetime.array;
        life[10] = 0.5; // active particle

        context.hass.states['p1'] = { state: 'off' };
        renderer.render(); // active is now []

        renderer.animate(0.1); // life[10] > 0 but active.length is 0
        expect(life[10]).toBe(0); // Should be set to 0 in 'else' branch
    });

    it('should hit remaining create and update branches for dehum and pumps', () => {
        // Dehum outside with rotation
        context.device.environmentAttributes.dehumidifierEntities = ['d_out'];
        context.device.environmentAttributes.sensorCoordinates = { 'd_out': { x: -20, y: 50, rotation: 90 } };
        renderer.render();
        const dehum = context.sensorMeshes.get('d_out');
        expect(dehum.getObjectByName('hose')).toBeDefined();

        // Pump with rotation in create
        context.device.irrigationConfig = { irrigationPumpEntity: 'p_rot' };
        context.device.environmentAttributes.sensorCoordinates['p_rot'] = { x: -10, y: 10, rotation: 180 };
        renderer.render();
        const pump = context.sensorMeshes.get('p_rot');
        expect(pump.getObjectByName('pumpHose')).toBeDefined();

        // updateExhaustModel with missing rotation
        context.device.environmentAttributes.exhaustFanEntities = ['ex1'];
        context.device.environmentAttributes.sensorCoordinates['ex1'] = { x: 50, y: 50, z: 100 }; // no rotation
        renderer.render();
    });

    it('should hit pump tank link branches', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: 50, y: 50 } };

        // tankId missing
        renderer.render();
        expect(context.sensorMeshes.get('p1').userData.tankId).toBeUndefined();

        // tankId present but tankMesh null
        context.device.environmentAttributes.pump_tank_links = { 'p1': 'non_existent_tank' };
        renderer.render();
        expect(context.sensorMeshes.get('p1').userData.tankId).toBe('non_existent_tank');
    });

    it('should cover particle animation falling off branches', () => {
        // Set life to <= 0 and active.length to 0 to hit the final 'else' in particle loops
        context.hass.states = {};
        renderer.render();

        const life = (renderer as any)._humidifierParticles.geometry.attributes.lifetime.array;
        life.fill(-1);
        renderer.animate(0.1);
        // Should hit pos[i * 3 + 1] = -1000 branch
    });

    it('should hit double init and coordinate default branches', () => {
        // initWindParticles double call
        (renderer as any).initWindParticles();
        (renderer as any).initWindParticles(); // Hits return branch

        // createDehumidifierModel with coords.z undefined and isOutside false
        context.device.environmentAttributes.dehumidifierEntities = ['d1'];
        context.device.environmentAttributes.sensorCoordinates = { 'd1': { x: 50, y: 50 } }; // no z
        renderer.render();

        // createDehumidifierModel with rotation
        context.device.environmentAttributes.sensorCoordinates['d1'].rotation = 45;
        renderer.render();
    });

    it('should cover pump particle life else branch', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: -10, y: 10 } };
        context.hass.states['p1'] = { state: 'on' };
        renderer.render();

        const life = (renderer as any)._pumpWaterParticles.geometry.attributes.lifetime.array;
        life.fill(-1); // AllParticles life <= 0
        renderer.animate(0.1);
        // Hits the final else in pump particle loop
    });

    it('should hit all remaining creation branches for humidifier, dehumidifier, and pumps', () => {
        context.device.dimensions = { width: 100, length: 150, height: 200 };
        context.device.environmentAttributes.humidifierEntities = ['h_out', 'h_in'];
        context.device.environmentAttributes.dehumidifierEntities = ['d_out', 'd_in'];
        context.device.irrigationConfig = { irrigationPumpEntity: 'p_out', drainPumpEntity: 'p_in' };

        context.device.environmentAttributes.sensorCoordinates = {
            'h_out': { x: -20, y: 50, rotation: 90, z: 10 },
            'h_in': { x: 50, y: 50 }, // no z
            'd_out': { x: -20, y: 60, rotation: 90, z: 10 },
            'd_in': { x: 50, y: 60, z: 20 }, // has z
            'p_out': { x: -20, y: 70, rotation: 90, z: 10 },
            'p_in': { x: 50, y: 70 } // no z
        };

        renderer.render();
        // This should hit:
        // 407 (Humidifier isOutside=true)
        // 416 (Humidifier rotation in isOutside)
        // 467 (Dehumidifier z defined/undefined branches)
        // 477 (Dehumidifier rotation in isOutside)
        // 510 (Pump z defined/undefined branches)
        // 586 (Pump isOutside=true)
        // 596 (Pump rotation in isOutside)
    });

    it('should hit edge cases for rotation and defaults', () => {
        context.device.environmentAttributes.humidifierEntities = ['h_rot0'];
        context.device.environmentAttributes.sensorCoordinates = {
            'h_rot0': { x: 50, y: 50, rotation: 0 } // rotation 0 is falsy
        };
        renderer.render();
        expect(context.sensorMeshes.get('h_rot0').rotation.y).toBe(0);

        context.device.environmentAttributes.exhaustFanEntities = ['ex1'];
        context.device.environmentAttributes.sensorCoordinates['ex1'] = { x: 50, y: 50, z: 100, rotation: 0 };
        renderer.render();
    });

    it('should cover updatePumpModel more complex branches', () => {
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'p1': { x: -10, y: 10 } };
        renderer.render();
        const pump = context.sensorMeshes.get('p1');

        // tankMesh present, tankId changed
        const tank1 = new (THREE.Group as any)();
        tank1.userData.entityId = 't1';
        context.sensorMeshes.set('t1', tank1);

        context.device.environmentAttributes.pump_tank_links = { 'p1': 't1' };
        renderer.render(); // Set up tankMesh

        const tank2 = new (THREE.Group as any)();
        tank2.userData.entityId = 't2';
        context.sensorMeshes.set('t2', tank2);

        context.device.environmentAttributes.pump_tank_links['p1'] = 't2';
        renderer.render(); // tankId changed, should hit branch for hose update
    });

    it('should cover particle animation end-of-life branches', () => {
        // Set life to epsilon to hit life[i] > 0 then life[i] <= 0
        context.hass.states = {};
        renderer.render();

        const humLife = (renderer as any)._humidifierParticles.geometry.attributes.lifetime.array;
        humLife[0] = 0.001;

        renderer.animate(0.1); // life[0] will be <= 0
        expect(humLife[0]).toBeLessThanOrEqual(0);
    });

    it('should hit missing requestUpdate branch in unlink', () => {
        context.requestUpdate = undefined as any;
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.pump_tank_links = { 'p1': 't1' };
        context.sensorMeshes.set('t1', new THREE.Group());
        renderer.render();
        const pump = context.sensorMeshes.get('p1');
        const unlinkIcon = pump.getObjectByName('unlinkIcon');
        unlinkIcon!.element.onclick!(new MouseEvent('click')); // Should skip requestUpdate block
    });

    it('should hit dimensions missing partial properties', () => {
        context.device.dimensions = { length: 100 } as any;
        renderer.render();
    });

    it('should hit fallback exhaust fan branches', () => {
        context.device.environmentAttributes.exhaustFanEntities = ['ex_no_coords'];
        context.hass.states['ex_no_coords'] = { state: 'unavailable' };
        renderer.render();
    });

    it('should hit redundant entity ID and sensor type branches', () => {
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.environmentAttributes.humidifierEntity = 'h2';
        context.device.environmentAttributes.sensorTypes = { 's1': 'temperature' };
        renderer.render();
    });

    it('should hit final animation and hose update branches', () => {
        // Long animation loop to hit all progress/life branches
        context.device.environmentAttributes.humidifierEntities = ['h1'];
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorCoordinates = { 'h1': { x: 50, y: 50 }, 'p1': { x: -10, y: 10 } };
        context.hass.states['h1'] = { state: 'on' };
        context.hass.states['p1'] = { state: 'on' };
        renderer.render();

        for (let i = 0; i < 35; i++) renderer.animate(0.05);

        // oldHose branch in updateHumidifierModel
        context.device.environmentAttributes.sensorCoordinates['h1'].x = -20;
        renderer.render(); // Hose created
        context.device.environmentAttributes.sensorCoordinates['h1'].z = 150;
        renderer.render(); // oldHose should be removed
    });

    it('should hit final ternary branches for coordinate calculation', () => {
        // Dehumidifier isOutside=false, z=undefined
        context.device.environmentAttributes.dehumidifierEntities = ['d_no_z'];
        context.device.environmentAttributes.sensorCoordinates = { 'd_no_z': { x: 50, y: 50 } };
        renderer.render();

        // Pump isOutside=false, z=20
        context.device.irrigationConfig = { irrigationPumpEntity: 'p_z' };
        context.device.environmentAttributes.sensorCoordinates['p_z'] = { x: 50, y: 50, z: 20 };
        renderer.render();
    });

    it('should hit final redundant and fallback branches', () => {
        // Fallback dimensions depth
        context.device.dimensions = { width: 100, depth: 150 } as any;

        // Single humidifierEntity fallback
        context.device.environmentAttributes.humidifierEntities = undefined;
        context.device.environmentAttributes.humidifierEntity = 'h_single';
        context.device.environmentAttributes.sensorCoordinates = { 'h_single': { x: 50, y: 50 } };

        // Single dehumidifierEntity fallback
        context.device.environmentAttributes.dehumidifierEntities = undefined;
        context.device.environmentAttributes.dehumidifierEntity = 'd_single';
        context.device.environmentAttributes.sensorCoordinates['d_single'] = { x: 50, y: 60 };

        // pump isDrain via sensorTypes only
        context.device.irrigationConfig = { irrigationPumpEntity: 'p1' };
        context.device.environmentAttributes.sensorTypes = { 'p1': 'drain_pump' };

        renderer.render();
        expect(context.sensorMeshes.get('p1').userData.isDrain).toBe(true);
    });

    it('should hit final exhaust and irrigation fallbacks', () => {
        // Exhaust fallback
        context.device.environmentAttributes.exhaustFanEntities = undefined;
        context.device.environmentAttributes.exhaustEntity = 'ex_single';
        context.device.environmentAttributes.sensorCoordinates = { 'ex_single': { x: 50, y: 50, z: 100 } };

        // irrigationConfig null
        context.device.irrigationConfig = undefined;
        context.device.environmentAttributes.sensorTypes = { 'p1': 'drain_pump' };

        renderer.render();
        expect(context.sensorMeshes.has('ex_single')).toBe(true);
        expect(context.sensorMeshes.get('p1').userData.isDrain).toBe(true);
    });

    it('should hit exhaust fan filter or branches', () => {
        context.device.environmentAttributes.exhaustFanEntities = ['ex1', 'exhaust_fan_2'];
        context.device.environmentAttributes.sensorCoordinates = {
            'ex1': { x: 50, y: 50, z: 100 },
            'exhaust_fan_2': { x: 60, y: 60, z: 100 }
        };
        renderer.render();

        const g2 = (renderer as any).cache.get('exhaust_fan_2');
        g2.userData.types = []; // Remove type

        renderer.render();
        const fan2 = (renderer as any)._exhaustFans.find((f: any) => f.userData.entityId === 'exhaust_fan_2');
        expect(fan2).toBeDefined();
    });

    it('should hit absolute last gaps', () => {
        // Double inits
        (renderer as any).initHumidifierParticles();
        (renderer as any).initDryAirParticles();
        (renderer as any).initPumpWaterParticles();

        // isDrain first part true
        const irrigationConfig = { drainPumpEntity: 'p_drain' };
        context.device.irrigationConfig = irrigationConfig;
        context.device.environmentAttributes.sensorCoordinates = { 'p_drain': { x: 50, y: 50 } };
        renderer.render();
        expect(context.sensorMeshes.get('p_drain').userData.isDrain).toBe(true);

        // oldHose in updatePumpModel
        context.device.environmentAttributes.sensorCoordinates['p_drain'].x = -10;
        renderer.render(); // Hose created
        context.device.environmentAttributes.sensorCoordinates['p_drain'].z = 150;
        renderer.render(); // oldHose removed
    });
});
