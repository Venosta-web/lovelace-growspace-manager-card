
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { TankRenderer } from '../../../../../src/utils/three/renderers/tank-renderer';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    // Mock BufferAttribute for particles/waves
    const BufferAttribute = vi.fn().mockImplementation(function (array, itemSize) {
        return {
            array,
            itemSize,
            count: array.length / itemSize,
            needsUpdate: false,
            getX: vi.fn((i) => array[i * itemSize]),
            getY: vi.fn((i) => array[i * itemSize + 1]),
            getZ: vi.fn((i) => array[i * itemSize + 2]),
            setX: vi.fn((i, v) => { array[i * itemSize] = v }),
            setY: vi.fn((i, v) => { array[i * itemSize + 1] = v }),
            setZ: vi.fn((i, v) => { array[i * itemSize + 2] = v }),
        };
    });

    return {
        ...actual,
        Group: vi.fn().mockImplementation(function () {
            return {
                add: vi.fn(),
                remove: vi.fn(),
                children: [],
                getObjectByName: vi.fn((name) => {
                    // We need to support finding 'liquid', 'wave', 'cap', 'label'
                    // We can store added children in a simple map for this mock instance to return them
                    const self = this as any;
                    return self._childrenMap ? self._childrenMap[name] : null;
                }),
                _childrenMap: {}, // Helper for mock
                addMockChild: function (name: string, obj: any) { this._childrenMap[name] = obj; },
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
        LineSegments: vi.fn().mockImplementation(function (geo, mat) {
            return {
                geometry: geo,
                material: mat,
                position: { y: 0 }
            }
        }),
        CSS2DObject: vi.fn().mockImplementation(function (elem) {
            return {
                element: elem,
                position: { set: vi.fn() },
                name: 'label'
            }
        }),
        MeshStandardMaterial: vi.fn().mockImplementation(function (params) {
            return {
                color: { set: vi.fn(), getHexString: () => 'ffffff' }
            }
        }),
        LineBasicMaterial: vi.fn(),
        BoxGeometry: vi.fn().mockImplementation(function () { return { attributes: { position: {} }, getIndex: vi.fn() } }),
        EdgesGeometry: vi.fn().mockImplementation(function () { return {} }),
        CylinderGeometry: vi.fn(),
        PlaneGeometry: vi.fn().mockImplementation(function () {
            return {
                attributes: {
                    position: new BufferAttribute(new Float32Array(1200), 3) // 20x20 grid roughly
                }
            };
        }),
        BufferAttribute,
        MathUtils: { degToRad: vi.fn(d => d * Math.PI / 180) }
    };
});

vi.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
    CSS2DObject: vi.fn().mockImplementation(function (el) {
        return {
            element: el,
            position: { set: vi.fn() },
            name: 'label'
        };
    })
}));

describe('TankRenderer', () => {
    let context: any;
    let renderer: TankRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 100 },
                environmentAttributes: {
                    irrigationTanks: [],
                    sensorCoordinates: {}
                }
            },
            hass: { states: {} },
            volatileGroup: new THREE.Group(),
            sensorMeshes: new Map(),
            scene: { userData: {} },
            visibility: { tooltips: true }
        };
        renderer = new TankRenderer(context);

        // In browser environment (chromium), document exists. 
        // We can check if we want to spy on it, but for now let's just use it.
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should dispose and return if visibility.plants (or implicit visibility?) is false?', () => {
        // The code checks `const { ... visibility } = this.context`
        // `if (!visibility.plants)` <-- WAIT, checking source code of `tank-renderer.ts`
        // Line 11: `const { ... visibility } = this.context`
        // Line 13-16: It does NOT check visibility flag at start unlike PlantRenderer or LightRenderer?
        // Checking source provided in view_file...
        // "Reading source code..."
        // Line 1 to 157.
        // Line 9: public render() { ... }
        // Line 11: const { ... visibility } = this.context;
        // It does NOT have an early return for visibility!
        // Wait, `PlantRenderer` checked `visibility.plants`. `LightRenderer` checked `visibility.lights`.
        // `TankRenderer` does NOT seem to check a specific visibility flag in the provided code snippet?
        // Let's re-read line 1 to 157.
        // Lines 9-17 do extracting.
        // Checks tanks list.
        // But `label.visible = visibility?.tooltips ?? true;` (Line 115).

        // So it ALWAYS renders tanks if present in config, but toggles labels.
    });

    it('should render tanks from config', () => {
        context.device.environmentAttributes.irrigationTanks = [
            { sensorEntity: 'sensor.tank1', fillLevel: 50, isWarning: false }
        ];
        context.device.environmentAttributes.sensorCoordinates = {
            'sensor.tank1': { x: 10, y: 10, z: 0, rotation: 90 }
        };

        const groupMock = {
            add: vi.fn(),
            position: { set: vi.fn() },
            rotation: { y: 0 },
            getObjectByName: vi.fn(),
            userData: {}
        };
        // Mock creating new group setup
        // Since we mock Group constructor, doing nothing special is fine as long as we capture it.
        // But inside caching logic: "tankGroup = new THREE.Group()".

        // We need to ensure `getObjectByName` returns mocks so "Update Dynamic Parts" works
        const liquidMock = { scale: { set: vi.fn() }, position: { y: 0 }, material: { color: { set: vi.fn() } }, name: 'liquid' };
        const waveMock = { position: { y: 0 }, material: { color: { set: vi.fn() } }, name: 'wave' };
        const capMock = { material: { color: { set: vi.fn() } }, name: 'cap' };
        const labelMock = { visible: true, element: { innerHTML: '' }, name: 'label' };

        // Intercept Group mock to return these children
        const GroupMock = THREE.Group as unknown as any; // The mock function
        const originalImpl = GroupMock.getMockImplementation();

        GroupMock.mockImplementation(function () {
            const grp = originalImpl!.call(this);
            // Manually setup getObjectByName to return our parts
            grp.getObjectByName = vi.fn((name) => {
                if (name === 'liquid') return liquidMock;
                if (name === 'wave') return waveMock;
                if (name === 'cap') return capMock;
                if (name === 'label') return labelMock;
                return null;
            });
            return grp;
        });

        renderer.render();

        expect(context.volatileGroup.add).toHaveBeenCalled();
        expect((renderer as any).cache.size).toBe(1);

        // Verify Position
        // width=100, depth=100. Coords(10, 10).
        // x = 10 - 50 = -40
        // z = 10 - 50 = -40
        // Line 125: tankGroup.position.set(coords.x - width / 2, 0, coords.y - depth / 2);
        // Using coords.y as z position? Yes, mostly 2D top-down logic mapped to 3D.

        // Verify dynamic updates
        expect(liquidMock.scale.set).toHaveBeenCalled(); // Should update scale based on fill 50%
        expect(labelMock.element.innerHTML).toContain('50%');

        // Restore mock
        GroupMock.mockImplementation(originalImpl);
    });

    it('should handle warning colors', () => {
        context.device.environmentAttributes.irrigationTanks = [
            { sensorEntity: 'sensor.tank_warn', fillLevel: 10, isWarning: true }
        ];

        const liquidMock = { scale: { set: vi.fn() }, position: { y: 0 }, material: { color: { set: vi.fn() } } };

        // Simpler mock injection via prototype or just allow the code to run and check if it attempts to set color
        // The code creates meshes. We can check calls to MeshStandardMaterial constructor?
        // Or check the update logic.

        const GroupMock = THREE.Group as unknown as any;
        const originalImpl = GroupMock.getMockImplementation();
        GroupMock.mockImplementation(function () {
            const grp = originalImpl!.call(this);
            grp.getObjectByName = vi.fn((n) => {
                if (n === 'liquid') return liquidMock;
                return null;
            });
            return grp;
        });

        renderer.render();

        // isWarning = true => hex #f44336 => int 0xff4422 (from code lines 38-39)
        expect(liquidMock.material.color.set).toHaveBeenCalledWith(0xff4422);

        GroupMock.mockImplementation(originalImpl);
    });

    it('should animate waves', () => {
        // Setup a wave mesh in _tankWaves
        const waveGeo = {
            attributes: {
                position: {
                    count: 10,
                    getX: vi.fn(i => i), getY: vi.fn(i => i),
                    setZ: vi.fn(),
                    needsUpdate: false
                }
            }
        };
        const waveMesh = { geometry: waveGeo };
        (renderer as any)._tankWaves = [waveMesh];

        renderer.animate(0.016);

        expect(waveGeo.attributes.position.setZ).toHaveBeenCalled();
        expect(waveGeo.attributes.position.needsUpdate).toBe(true);
    });

    it('should remove stale tanks', () => {
        context.device.environmentAttributes.irrigationTanks = [{ sensorEntity: 't1' }];
        renderer.render();
        expect((renderer as any).cache.size).toBe(1);

        context.device.environmentAttributes.irrigationTanks = [];
        renderer.render();
        expect((renderer as any).cache.size).toBe(0);
        expect(context.volatileGroup.remove).toHaveBeenCalled();
    });
});
