
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { FrameRenderer } from '../../../../../src/utils/three/renderers/frame-renderer';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    const mockVector3 = function (this: any, x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
        this.set = vi.fn(function (this: any, nx, ny, nz) {
            if (typeof nx === 'number') { this.x = nx; this.y = ny; this.z = nz; }
            return this;
        });
        this.clone = vi.fn(() => new (mockVector3 as any)(this.x, this.y, this.z));
    };

    const createObject3DNode = function (this: any) {
        const children: any[] = [];
        this.add = vi.fn((obj) => { children.push(obj); });
        this.remove = vi.fn((obj) => { const idx = children.indexOf(obj); if (idx > -1) children.splice(idx, 1); });
        this.children = children;
        this.position = new (mockVector3 as any)();
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = new (mockVector3 as any)(1, 1, 1);
        this.userData = {};
        this.name = '';
        this.visible = true;
        this.traverse = vi.fn((cb) => { cb(this); children.forEach(c => c.traverse?.(cb)); });
    };

    return {
        ...actual,
        Group: vi.fn().mockImplementation(function (this: any) {
            createObject3DNode.call(this);
        }),
        Mesh: vi.fn().mockImplementation(function (this: any, geo, mat) {
            createObject3DNode.call(this);
            this.geometry = geo;
            this.material = mat;
        }),
        LineSegments: vi.fn().mockImplementation(function (this: any, geo, mat) {
            createObject3DNode.call(this);
            this.geometry = geo;
            this.material = mat;
        }),
        Vector3: mockVector3,
        BoxGeometry: vi.fn(),
        CylinderGeometry: vi.fn().mockImplementation(function () { return { rotateX: vi.fn(), rotateZ: vi.fn() } }),
        GridHelper: vi.fn().mockImplementation(function () { return { geometry: {} } }),
        MeshStandardMaterial: vi.fn(),
        LineBasicMaterial: vi.fn()
    };
});

describe('FrameRenderer', () => {
    let context: any;
    let renderer: FrameRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 150, height: 200 }
            },
            volatileGroup: new (THREE.Group as any)(),
            scene: { userData: {} }
        };
        renderer = new FrameRenderer(context);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create frame mesh and grid helper', () => {
        renderer.render();
        // Expect 2 items in volatileGroup: frame and grid
        expect(context.volatileGroup.children.length).toBe(2);
        const frame = context.volatileGroup.children.find((c: any) => c.userData.dimensions);
        expect(frame).toBeDefined();
        // Frame should have poles and corners (4 + 4 + 4 + 8 = 20 children)
        expect(frame.children.length).toBe(20);
    });

    it('should reuse cached frame', () => {
        renderer.render();
        const frame1 = context.volatileGroup.children.find((c: any) => c.userData.dimensions);

        renderer.render();
        const frame2 = context.volatileGroup.children.find((c: any) => c.userData.dimensions);
        expect(frame1).toBe(frame2);
    });

    it('should recreate frame on dimension change', () => {
        renderer.render();
        const frame1 = context.volatileGroup.children.find((c: any) => c.userData.dimensions);

        context.device.dimensions.width = 150;
        renderer.render();
        const frame2 = context.volatileGroup.children.find((c: any) => c.userData.dimensions);
        expect(frame1).not.toBe(frame2);
    });

    it('should use default dimensions', () => {
        context.device.dimensions = {};
        renderer.render();
        const frame = context.volatileGroup.children.find((c: any) => c.userData.dimensions);
        expect(frame.userData.dimensions).toBe('120_200_120');
    });
});
