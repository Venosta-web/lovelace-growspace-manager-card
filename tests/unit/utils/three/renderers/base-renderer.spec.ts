
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BaseRenderer } from '../../../../../src/utils/three/renderers/base-renderer';

// Create a concrete implementation for testing
class TestRenderer extends BaseRenderer {
    public render() {
        this.getSharedGeometry('testGeo', () => new THREE.BufferGeometry());
        this.getSharedMaterial('testMat', () => new THREE.MeshStandardMaterial());
    }
}

describe('BaseRenderer', () => {
    let context: any;
    let renderer: TestRenderer;

    beforeEach(() => {
        context = {
            volatileGroup: new THREE.Group(),
            scene: new THREE.Scene()
        };
        renderer = new TestRenderer(context);
    });

    it('should update context', () => {
        renderer.updateContext({ selectedMetric: 'temp' });
        expect((renderer as any).context.selectedMetric).toBe('temp');
    });

    it('should handle dispose and cleanup cache', () => {
        const obj = new THREE.Object3D();
        (renderer as any).cache.set('item1', obj);
        vi.spyOn(context.volatileGroup, 'remove');

        renderer.dispose();

        expect(context.volatileGroup.remove).toHaveBeenCalledWith(obj);
        expect((renderer as any).cache.size).toBe(0);
    });

    it('should reuse shared assets across instances', () => {
        const factory = vi.fn(() => new THREE.BufferGeometry());

        const res1 = (renderer as any).getSharedGeometry('sharedKey', factory);
        const res2 = (renderer as any).getSharedGeometry('sharedKey', factory);

        expect(res1).toBe(res2);
        expect(factory).toHaveBeenCalledTimes(1);
    });
});
