
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { LightRenderer } from '../../../../../src/utils/three/renderers/light-renderer';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    const Vector3 = vi.fn().mockImplementation(function () {
        return {
            x: 0, y: 0, z: 0,
            set: vi.fn(),
            clone: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
            multiplyScalar: vi.fn(),
            copy: vi.fn()
        };
    });

    return {
        ...actual,
        Group: vi.fn().mockImplementation(function () {
            return {
                add: vi.fn(),
                remove: vi.fn(),
                children: [],
                position: { set: vi.fn(), clone: vi.fn(() => ({ x: 0, y: 0, z: 0 })), x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                userData: {},
                traverse: vi.fn()
            };
        }),
        Mesh: vi.fn().mockImplementation(function (geo, mat) {
            return {
                geometry: geo,
                material: mat,
                add: vi.fn(),
                remove: vi.fn(),
                children: [],
                position: { set: vi.fn(), clone: vi.fn(() => ({ x: 0, y: 0, z: 0 })), x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                userData: {},
                name: ''
            };
        }),
        MeshStandardMaterial: vi.fn().mockImplementation(function (params) {
            return {
                color: params?.color,
                emissiveIntensity: params?.emissiveIntensity || 0,
                dispose: vi.fn()
            }
        }),
        BoxGeometry: vi.fn(),
        PlaneGeometry: vi.fn(),
        Vector3
    };
});

describe('LightRenderer', () => {
    let context: any;
    let renderer: LightRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 100 },
                environmentAttributes: {
                    lightSensors: [],
                    sensorCoordinates: {}
                },
                biologicalMetrics: { isDay: true }
            },
            hass: { states: {} },
            volatileGroup: new THREE.Group(),
            sensorMeshes: new Map(),
            scene: { userData: {} },
            visibility: { lights: true }
        };
        renderer = new LightRenderer(context);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should dispose if visibility.lights is false', () => {
        context.visibility.lights = false;
        const disposeSpy = vi.spyOn(renderer, 'dispose');
        renderer.render();
        expect(disposeSpy).toHaveBeenCalled();
    });

    it('should render nothing if no light sensors', () => {
        renderer.render();
        expect(context.volatileGroup.add).not.toHaveBeenCalled();
    });

    it('should render light bars for configured sensors', () => {
        context.device.environmentAttributes.lightSensors = ['light.1', 'light.2'];
        context.device.environmentAttributes.sensorCoordinates = {
            'light.1': { x: 25, z: 50, y: 25 }, // Coordinates in DB seem to map slightly differently in renderer locic (x, z, y -> pos x,0,z? No x, z -> y?)
            // Code: lightGroup.position.set(coords.x - width / 2, coords.z, coords.y - depth / 2);
            'light.2': { x: 75, z: 50, y: 75 }
        };

        renderer.render();

        expect(context.volatileGroup.add).toHaveBeenCalledTimes(2);
        expect((renderer as any).cache.size).toBe(2);
        expect(context.sensorMeshes.get('light.1')).toBeDefined();
    });

    it('should calculate grid/scale correctly for 2 lights', () => {
        // Special case logic in code: if (count === 2) { cols = 1; rows = 2; }
        context.device.environmentAttributes.lightSensors = ['l1', 'l2'];
        context.device.environmentAttributes.sensorCoordinates = { 'l1': { x: 0, y: 0, z: 0 }, 'l2': { x: 0, y: 0, z: 0 } };

        const spy = vi.spyOn(renderer as any, 'createLightbarModel');
        renderer.render();

        // width 100, cols 1 => scaleX 1 => modelWidth 100
        // depth 100, rows 2 => scaleZ 0.5 => modelDepth 50
        expect(spy).toHaveBeenCalledWith(100, 50);
    });

    it('should calculate grid/scale correctly for 4 lights', () => {
        // count 4 => cols 2, rows 2
        context.device.environmentAttributes.lightSensors = ['l1', 'l2', 'l3', 'l4'];
        const coords = { x: 0, y: 0, z: 0 };
        context.device.environmentAttributes.sensorCoordinates = { 'l1': coords, 'l2': coords, 'l3': coords, 'l4': coords };

        const spy = vi.spyOn(renderer as any, 'createLightbarModel');
        renderer.render();

        // width 100, cols 2 => 50
        // depth 100, rows 2 => 50
        expect(spy).toHaveBeenCalledWith(50, 50);
    });

    it('should cache and removing stale lights', () => {
        context.device.environmentAttributes.lightSensors = ['l1'];
        context.device.environmentAttributes.sensorCoordinates = { 'l1': { x: 0, y: 0, z: 0 } };

        renderer.render();
        expect((renderer as any).cache.size).toBe(1);

        // Remove l1, add l2
        context.device.environmentAttributes.lightSensors = ['l2'];
        context.device.environmentAttributes.sensorCoordinates = { 'l2': { x: 0, y: 0, z: 0 } };

        renderer.render();
        expect((renderer as any).cache.size).toBe(1);
        expect((renderer as any).cache.has('l1')).toBe(false);
        expect((renderer as any).cache.has('l2')).toBe(true);
        expect(context.volatileGroup.remove).toHaveBeenCalled();
    });

    it('should recreate light if config dimensions change', () => {
        context.device.environmentAttributes.lightSensors = ['l1'];
        context.device.environmentAttributes.sensorCoordinates = { 'l1': { x: 0, y: 0, z: 0 } };

        renderer.render();
        const obj1 = (renderer as any).cache.get('l1');

        // Change dimension indirectly by adding another light? 
        // Or changing device dims.
        // If we add another light, cols/rows calc changes, so modelWidth/Depth changes.

        context.device.environmentAttributes.lightSensors = ['l1', 'l2'];
        context.device.environmentAttributes.sensorCoordinates['l2'] = { x: 0, y: 0, z: 0 };

        renderer.render();
        const obj2 = (renderer as any).cache.get('l1');

        expect(obj2).not.toBe(obj1);
    });

    it('should animate emissive intensity during day', () => {
        // Render first to setup material
        context.device.environmentAttributes.lightSensors = ['l1'];
        context.device.environmentAttributes.sensorCoordinates = { 'l1': { x: 0, y: 0, z: 0 } };
        renderer.render();

        const mat = (renderer as any).ledMaterial;
        expect(mat).toBeDefined();

        context.device.biologicalMetrics.isDay = true;
        renderer.animate(0.016);
        expect(mat.emissiveIntensity).toBeGreaterThan(0);

        context.device.biologicalMetrics.isDay = false;
        renderer.animate(0.016);
        expect(mat.emissiveIntensity).toBe(0);
    });
});
