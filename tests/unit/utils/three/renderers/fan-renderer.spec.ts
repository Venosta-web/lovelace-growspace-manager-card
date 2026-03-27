
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { FanRenderer } from '../../../../../src/utils/three/renderers/fan-renderer';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    const mockVector3 = function (this: any, x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = vi.fn((nx, ny, nz) => { this.x = nx; this.y = ny; this.z = nz; return this; });
        this.clone = vi.fn(() => new (mockVector3 as any)(this.x, this.y, this.z));
        this.add = vi.fn((v) => { this.x += v.x; this.y += v.y; this.z += v.z; return this; });
        this.sub = vi.fn((v) => { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; });
        this.localToWorld = vi.fn(v => v);
        this.getWorldDirection = vi.fn((v) => v.set(0, 0, 1));
    };

    return {
        ...actual,
        Group: vi.fn().mockImplementation(function () {
            const children: any[] = [];
            return {
                add: vi.fn((obj) => { children.push(obj); }),
                remove: vi.fn((obj) => { const idx = children.indexOf(obj); if (idx > -1) children.splice(idx, 1); }),
                children,
                getObjectByName: vi.fn((name) => children.find(c => c.name === name)),
                position: new (mockVector3 as any)(),
                rotation: { x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                userData: {},
                lookAt: vi.fn(),
                localToWorld: vi.fn(v => v),
                getWorldDirection: vi.fn((v) => v.set(0, 0, 1)),
                traverse: vi.fn(function (this: any, cb) { cb(this); children.forEach(c => c.traverse?.(cb)); })
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
                rotation: { x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                userData: {},
                name: '',
                rotateX: vi.fn(),
                rotateZ: vi.fn(),
                localToWorld: vi.fn(v => v),
                getWorldDirection: vi.fn((v) => v.set(0, 0, 1)),
                traverse: vi.fn(function (this: any, cb) { cb(this); children.forEach(c => c.traverse?.(cb)); })
            };
        }),
        Points: vi.fn().mockImplementation(function () {
            return {
                geometry: {
                    attributes: {
                        position: { array: new Float32Array(600), needsUpdate: false },
                        velocity: { array: new Float32Array(600) },
                        lifetime: { array: new Float32Array(200), needsUpdate: false }
                    }
                },
                material: { dispose: vi.fn() },
                frustumCulled: true
            };
        }),
        Vector3: mockVector3,
        BoxGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        TorusGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        CylinderGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        MeshStandardMaterial: vi.fn(),
        PointsMaterial: vi.fn(),
        MathUtils: { ...actual.MathUtils, degToRad: vi.fn(d => d * Math.PI / 180) }
    };
});

describe('FanRenderer', () => {
    let context: any;
    let renderer: FanRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 100, height: 200 },
                environmentAttributes: {},
                irrigationConfig: {}
            },
            hass: { states: {} },
            volatileGroup: new THREE.Group(),
            sensorMeshes: new Map(),
            scene: { userData: {} },
            visibility: { fans: true }
        };
        renderer = new FanRenderer(context);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should dispose and return if visibility.fans is false', () => {
        context.visibility.fans = false;
        const disposeSpy = vi.spyOn(renderer, 'dispose');
        renderer.render();
        expect(disposeSpy).toHaveBeenCalled();
        expect(context.volatileGroup.add).not.toHaveBeenCalled();
    });

    it('should use default visibility if context.visibility is undefined', () => {
        delete context.visibility;
        renderer.render();
        // Should not crash and should show fans by default
        expect((renderer as any).fanHeads).toBeDefined();
    });

    it('should create fan models for each entity', () => {
        context.device.environmentAttributes.circulationFanEntities = ['fan1', 'fan2'];
        context.hass.states['fan1'] = { state: '5' };
        context.hass.states['fan2'] = { state: 'on', attributes: { percentage: 80 } };

        renderer.render();

        expect(context.sensorMeshes.has('fan1')).toBeTruthy();
        expect(context.sensorMeshes.has('fan2')).toBeTruthy();
        expect(context.sensorMeshes.get('fan1').userData.speed).toBe(5);
        expect(context.sensorMeshes.get('fan2').userData.speed).toBe(8);
    });

    it('should snap fans to corners and use fallbacks', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        // At 10, 10 it should snap to bottom-left (relative to center)
        context.device.environmentAttributes.sensorCoordinates = { 'f1': { x: 10, y: 10, z: 150 } };

        renderer.render();
        const fan = context.sensorMeshes.get('f1');
        expect(fan.position.x).toBe(-50);
        expect(fan.position.z).toBe(-50);
        expect(fan.position.y).toBe(150);

        // Test undefined rotation fallback
        expect(fan.lookAt).toHaveBeenCalled();
    });

    it('should use dimension fallbacks', () => {
        delete context.device.dimensions;
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        renderer.render();
        const fan = context.sensorMeshes.get('f1');
        // Fallbacks: width=120, depth=120, height=200. snapX=0-60=-60, snapY=0-60=-60
        expect(fan.position.x).toBe(-60);
        expect(fan.position.z).toBe(-60);
    });

    it('should use dimension fallbacks (depth variation)', () => {
        context.device.dimensions = { width: 100, height: 200, depth: 80 } as any;
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        renderer.render();
        const fan = context.sensorMeshes.get('f1');
        // snapY = 0 since coords undefined (0 < 80/2). snapY - depth/2 = 0 - 40 = -40
        expect(fan.position.z).toBe(-40);
    });

    it('should support legacy circulationFanEntity', () => {
        context.device.environmentAttributes.circulationFanEntity = 'legacy_fan';
        delete context.device.environmentAttributes.circulationFanEntities;
        renderer.render();
        expect(context.sensorMeshes.has('legacy_fan')).toBeTruthy();
    });

    it('should handle various fan speed states', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1', 'f2', 'f3', 'f4', 'f5'];
        context.hass.states = {
            'f1': { state: '50' }, // Value > 10
            'f2': { state: 'on', attributes: { percentage: 40 } },
            'f3': { state: 'on', attributes: {} }, // Default speed
            'f4': { state: 'off' },
            'f5': { state: 'invalid' }
        };

        renderer.render();
        expect(context.sensorMeshes.get('f1').userData.speed).toBe(5);
        expect(context.sensorMeshes.get('f2').userData.speed).toBe(4);
        expect(context.sensorMeshes.get('f3').userData.speed).toBe(5);
        expect(context.sensorMeshes.get('f4').userData.speed).toBe(0);
        expect(context.sensorMeshes.get('f5').userData.speed).toBe(0);
    });

    it('should handle explicit rotation', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        context.device.environmentAttributes.sensorCoordinates = { 'f1': { x: 50, y: 50, z: 100, rotation: 45 } };
        renderer.render();
        const fan = context.sensorMeshes.get('f1');
        expect(fan.rotation.y).toBe(45 * Math.PI / 180);
    });

    it('should handle missing model children safely', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        renderer.render();
        const fan = context.sensorMeshes.get('f1');

        // Remove children to test branch
        fan.children = [];
        renderer.render(); // This might crash if not careful, but let's see

        // animate should not crash
        renderer.animate(0.016);
    });

    it('should handle animate with no active fans', () => {
        renderer.render(); // No fans
        const particles = (renderer as any)._windParticles;
        const pos = particles.geometry.attributes.position;
        renderer.animate(0.016);
        // Should move particles out of view
        expect(pos.array[1]).toBe(-1000);
    });

    it('should handle particle lifecycle and spawning', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        context.hass.states['f1'] = { state: '10' };

        renderer.render();
        const particles = (renderer as any)._windParticles;
        // Force lifetime to 0 for spawn logic
        particles.geometry.attributes.lifetime.array[0] = 0;

        renderer.animate(0.016);
        expect(particles.geometry.attributes.lifetime.array[0]).toBe(1.0);
        expect(particles.geometry.attributes.position.array[0]).not.toBe(-1000);
    });

    it('should rotate fan blades in animate', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        context.hass.states['f1'] = { state: '10' };

        renderer.render();
        const fan = context.sensorMeshes.get('f1');
        // head is children[1]
        const head = new THREE.Group();
        const blades = new THREE.Mesh({} as any, {} as any);
        head.add(new THREE.Mesh({} as any, {} as any)); // rim at 0
        head.add(blades); // blades at 1

        fan.children[1] = head;
        // update fanHeads via re-render
        renderer.render();

        renderer.animate(0.016);
        expect(blades.rotation.z).toBeLessThan(0);
    });

    it('should skip blade rotation if speed is 0 or blades missing', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1', 'f2'];
        context.hass.states['f1'] = { state: '0' };
        context.hass.states['f2'] = { state: '10' };
        renderer.render();

        const fan1 = context.sensorMeshes.get('f1');
        const fan2 = context.sensorMeshes.get('f2');

        // fan1 has speed 0
        // fan2 has speed 10 but we'll remove blades
        const head2 = new THREE.Group();
        head2.add(new THREE.Mesh({} as any, {} as any)); // rim only, no blades
        fan2.children[1] = head2;

        renderer.render();
        renderer.animate(0.016);
        // Success if no crash
    });

    it('should initialize and animate wind particles', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        context.hass.states['f1'] = { state: '10' };

        renderer.render();
        const particles = (renderer as any)._windParticles;
        expect(particles).toBeDefined();

        const pos = particles.geometry.attributes.position;
        renderer.animate(0.5); // Large step
        expect(pos.needsUpdate).toBeTruthy();
    });

    it('should cleanup stale fans', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        renderer.render();
        expect((renderer as any).cache.size).toBe(1);

        context.device.environmentAttributes.circulationFanEntities = [];
        renderer.render();
        expect((renderer as any).cache.size).toBe(0);
        expect(context.volatileGroup.remove).toHaveBeenCalled();
    });

    it('should handle particle movement when life > 0', () => {
        context.device.environmentAttributes.circulationFanEntities = ['f1'];
        context.hass.states['f1'] = { state: '10' };

        renderer.render();
        const particles = (renderer as any)._windParticles;
        // Set life and velocity
        particles.geometry.attributes.lifetime.array[0] = 0.5;
        particles.geometry.attributes.velocity.array[0] = 10; // vx
        particles.geometry.attributes.position.array[0] = 0;  // x

        renderer.animate(0.016);
        // life should be 0.48
        // pos.x should be 0 + 10 = 10
        expect(particles.geometry.attributes.lifetime.array[0]).toBeCloseTo(0.48);
        expect(particles.geometry.attributes.position.array[0]).toBe(10);
    });
});
