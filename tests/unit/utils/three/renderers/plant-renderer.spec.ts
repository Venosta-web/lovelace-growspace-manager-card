import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { PlantRenderer } from '../../../../../src/utils/three/renderers/plant-renderer';
import { PlantUtils } from '../../../../../src/utils/plant-utils';
import { PlantStage, PlantDisplayData } from '../../../../../src/types';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;

    const Vector3 = vi.fn().mockImplementation(function (x = 0, y = 0, z = 0) {
        return {
            x, y, z,
            set: function (nx: any, ny: any, nz: any) { this.x = nx; this.y = ny; this.z = nz; return this; },
            clone: function () { return new (Vector3 as any)(this.x, this.y, this.z); },
            multiplyScalar: function (s: number) { this.x *= s; this.y *= s; this.z *= s; return this; },
            copy: function (v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
        };
    });

    const Color = vi.fn().mockImplementation(function (hex: any) {
        return {
            set: vi.fn(),
            getHexString: vi.fn(() => 'ffffff'),
            clone: vi.fn(() => new (Color as any)(hex)),
            multiplyScalar: vi.fn(),
            toString: vi.fn(() => '16777215')
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
                    // Simple mock to return a hitbox if requested, simulating it was added
                    if (name === 'hitbox') return { name: 'hitbox', scale: { set: vi.fn() }, position: { y: 0 } };
                    return null;
                }),
                position: { set: vi.fn(), clone: vi.fn(() => ({ x: 0, y: 0, z: 0 })), x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                userData: {},
                traverse: vi.fn(),
                localToWorld: vi.fn(v => v),
                getWorldPosition: vi.fn(() => ({ x: 0, y: 0, z: 0 }))
            };
        }),
        Mesh: vi.fn().mockImplementation(function (geo, mat) {
            return {
                geometry: geo,
                material: mat,
                add: vi.fn(),
                remove: vi.fn(),
                children: [],
                position: { set: vi.fn(), clone: vi.fn(() => ({ x: 0, y: 0, z: 0 })), y: 0, z: 0 },
                rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
                scale: { set: vi.fn() },
                userData: {},
                name: ''
            };
        }),
        Vector3,
        Color,
        Vector2: vi.fn(),
        LatheGeometry: vi.fn(),
        SphereGeometry: vi.fn(),
        CylinderGeometry: vi.fn(),
        CircleGeometry: vi.fn(),
        DodecahedronGeometry: vi.fn(),
        MeshStandardMaterial: vi.fn(),
        MeshBasicMaterial: vi.fn(),
        DoubleSide: 2
    };
});

// Mock PlantUtils
vi.mock('../../../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        calculateEffectiveRows: vi.fn(),
        getPlantStage: vi.fn(),
        calculatePlantAge: vi.fn(),
        getPlantDisplayData: vi.fn()
    }
}));

describe('PlantRenderer', () => {
    let context: any;
    let renderer: PlantRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 120, length: 120 },
                plants: [],
                plantsPerRow: 3,
                environmentAttributes: {},
                irrigationConfig: {}
            },
            hass: { states: {} },
            volatileGroup: new THREE.Group(),
            sensorMeshes: new Map(),
            scene: { userData: {} },
            visibility: { plants: true },
            requestUpdate: vi.fn(),
            strainLibrary: []
        };
        renderer = new PlantRenderer(context);

        // Mock extractStrainColors to avoid canvas usage
        vi.spyOn(renderer as any, 'extractStrainColors').mockResolvedValue(['#00ff00', '#ffa500', '#0000ff']);

        // Default safe return for PlantUtils methods
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue({
            stageColor: '#00ff00',
            strainName: 'Test',
            pheno: '',
            stages: []
        } as PlantDisplayData);
        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(0);
        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.SEEDLING);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should dispose and return if visibility.plants is false', () => {
        context.visibility.plants = false;
        const disposeSpy = vi.spyOn(renderer, 'dispose');
        renderer.render();
        expect(disposeSpy).toHaveBeenCalled();
        expect(context.volatileGroup.add).not.toHaveBeenCalled();
    });

    it('should calculate grid and render plants for occupied slots', () => {
        context.device.plants = [
            { id: 'p1', attributes: { row: 1, col: 1 }, entity_id: 'plant.p1' }
        ];

        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(2);
        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.VEG);

        renderer.render();

        expect(context.volatileGroup.add).toHaveBeenCalledTimes(6);
        expect((renderer as any).cache.size).toBe(6);
        expect(renderer.plantHitBoxes.length).toBeGreaterThan(0);
    });

    it('should cache plant groups and not recreate if stage/plantId match', () => {
        context.device.plants = [
            { id: 'p1', attributes: { row: 1, col: 1 }, entity_id: 'plant.p1' }
        ];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1); // 3 slots
        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.VEG);

        renderer.render();
        const cacheSize1 = (renderer as any).cache.size;
        const group1 = (renderer as any).cache.get('1,1');

        expect(cacheSize1).toBe(3);
        expect(group1).toBeDefined();

        (context.volatileGroup.add as any).mockClear();
        renderer.render();

        const group2 = (renderer as any).cache.get('1,1');
        expect(group2).toBe(group1);
        expect(context.volatileGroup.add).not.toHaveBeenCalled();
    });

    it('should recreate plant group if stage changes', () => {
        context.device.plants = [
            { id: 'p1', attributes: { row: 1, col: 1 }, entity_id: 'plant.p1' }
        ];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.VEG);

        renderer.render();
        const group1 = (renderer as any).cache.get('1,1');

        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.FLOWER);

        renderer.render();
        const group2 = (renderer as any).cache.get('1,1');

        expect(group2).not.toBe(group1);
        expect(group2.userData.stage).toBe('flower');
    });

    it('should render correct model for different stages', () => {
        const createPlantModelSpy = vi.spyOn(renderer as any, 'createPlantModel');
        context.device.plants = [{ id: 'p1', attributes: { row: 1, col: 1 }, entity_id: 'plant.p1' }];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);

        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.SEEDLING);
        renderer.render();
        expect(createPlantModelSpy).toHaveBeenLastCalledWith(PlantStage.SEEDLING, expect.any(Number), expect.any(Object), expect.any(Function));

        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.FLOWER);
        renderer.render();
        expect(createPlantModelSpy).toHaveBeenLastCalledWith(PlantStage.FLOWER, expect.any(Number), expect.any(Object), expect.any(Function));
    });

    it('should add specific flower details (buds/pistils) when in flower stage', async () => {
        const addFlowerDetailsSpy = vi.spyOn(renderer as any, 'addFlowerDetails');
        context.device.plants = [{ id: 'p1', attributes: { row: 1, col: 1 }, entity_id: 'plant.p1' }];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(PlantStage.FLOWER);

        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(45);
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue({
            imageUrl: 'test.jpg',
            stageColor: '#ff00ff',
            strainName: 'Test',
            pheno: '',
            stages: []
        } as PlantDisplayData);

        renderer.render();
        expect(addFlowerDetailsSpy).toHaveBeenCalled();
    });

    it('should handle extractStrainColors via cache or extraction', async () => {
        const plant = { imageUrl: 'test-strain.jpg', stageColor: '#00ff00', strainName: 'Test', pheno: '', stages: [] } as PlantDisplayData;
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue(plant);

        const group = new THREE.Group();
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, {}, context.requestUpdate);
        expect((renderer as any).extractStrainColors).toHaveBeenCalled();

        (renderer as any)._strainColorCache.set('test-strain.jpg', ['#abc']);
        (renderer as any).extractStrainColors.mockClear();

        await (renderer as any).addFlowerDetails(group, 1, 10, 10, {}, context.requestUpdate);
        expect((renderer as any).extractStrainColors).not.toHaveBeenCalled();
    });

    it('should cleanup stale slots', () => {
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        context.device.plantsPerRow = 1;

        renderer.render();
        expect((renderer as any).cache.size).toBe(1);

        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(0);
        renderer.render();
        expect((renderer as any).cache.size).toBe(0);
        expect(context.volatileGroup.remove).toHaveBeenCalled();
    });

    it('should handle missing device dimensions, plants, and plantsPerRow', () => {
        context.device.dimensions = undefined;
        context.device.plants = undefined;
        context.device.plantsPerRow = undefined;

        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        renderer.render();
        expect(context.volatileGroup.add).toHaveBeenCalledTimes(3);
    });

    it('should use default row/col 1 if plant attributes are missing', () => {
        context.device.plants = [{ entity_id: 'plant.p1' }];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        context.device.plantsPerRow = 1;

        renderer.render();
        const cached = (renderer as any).cache.get('1,1');
        expect(cached.userData.plantId).toBe('plant.p1');
    });

    it('should dispose and recreate if plantId changes in same slot', () => {
        context.device.plants = [{ attributes: { row: 1, col: 1 }, entity_id: 'plant.old' }];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        context.device.plantsPerRow = 1;

        renderer.render();
        const group1 = (renderer as any).cache.get('1,1');

        context.device.plants = [{ attributes: { row: 1, col: 1 }, entity_id: 'plant.new' }];
        renderer.render();
        const group2 = (renderer as any).cache.get('1,1');

        expect(group2).not.toBe(group1);
        expect(group2.userData.plantId).toBe('plant.new');
    });

    it('should handle missing hitbox in plantGroup', () => {
        context.device.plants = [{ attributes: { row: 1, col: 1 }, entity_id: 'plant.p1' }];
        vi.spyOn(PlantUtils, 'calculateEffectiveRows').mockReturnValue(1);
        context.device.plantsPerRow = 1;

        renderer.render();
        const group = (renderer as any).cache.get('1,1');
        vi.spyOn(group, 'getObjectByName').mockReturnValue(null);

        (renderer as any)._plantHitBoxes = [];
        renderer.render();
        expect(renderer.plantHitBoxes.length).toBe(0);
    });

    it('should test all plant stage models including default/empty', () => {
        const createPlantModelSpy = vi.spyOn(renderer as any, 'createPlantModel');
        const stages = [PlantStage.SEEDLING, PlantStage.CLONE, PlantStage.VEG, PlantStage.FLOWER, PlantStage.MOTHER, 'unknown'];

        stages.forEach(stage => {
            vi.spyOn(PlantUtils, 'getPlantStage').mockReturnValue(stage as any);
            (renderer as any).createPlantContainer(1, 1, 100, 100, { entity_id: 'p' }, stage);
        });

        expect(createPlantModelSpy).toHaveBeenCalledTimes(stages.length);
    });

    it('should handle flower details branches: age thresholds and progress', async () => {
        const group = new THREE.Group();
        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(20);
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' });

        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(50);
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' });

        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(70);
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' });
    });

    it('should skip flower detail extraction if URL contains "stages/"', async () => {
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue({ imageUrl: 'some/path/stages/veg.png' } as any);
        const group = new THREE.Group();
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' });
        expect((renderer as any).extractStrainColors).not.toHaveBeenCalled();
    });

    it('should call requestUpdate after color extraction', async () => {
        const reqUpdate = vi.fn();
        (renderer as any).extractStrainColors = vi.fn().mockResolvedValue(['#111', '#222']);
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue({ imageUrl: 'real.jpg' } as any);
        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(30);

        const group = new THREE.Group();
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' }, reqUpdate);

        await Promise.resolve();
        expect(reqUpdate).toHaveBeenCalled();
    });

    it('should handle extractStrainColors failure', async () => {
        (renderer as any).extractStrainColors.mockRestore();
        const originalImage = window.Image;
        (window as any).Image = vi.fn().mockImplementation(() => {
            const img = {
                set src(val: string) {
                    setTimeout(() => { if ((img as any).onerror) (img as any).onerror(new Error('fail')); }, 0);
                },
                onload: null,
                onerror: null
            };
            return img;
        }) as any;

        const colors = await (renderer as any).extractStrainColors('fail.jpg');
        expect(colors).toEqual([]);
        window.Image = originalImage;
    });

    it('should handle extractStrainColors cache hit', async () => {
        (renderer as any).extractStrainColors.mockRestore();
        (renderer as any)._strainColorCache.set('cached.jpg', ['#123']);
        const colors = await (renderer as any).extractStrainColors('cached.jpg');
        expect(colors).toEqual(['#123']);
    });

    it('should handle extractStrainColors success with canvas', async () => {
        (renderer as any).extractStrainColors.mockRestore();
        const originalImage = window.Image;
        (window as any).Image = class {
            onload: any; onerror: any; _src: string = ''; crossOrigin: string = '';
            get src() { return this._src; }
            set src(v: string) { this._src = v; setTimeout(() => { if (this.onload) this.onload(); }, 10); }
        } as any;

        const colors = await (renderer as any).extractStrainColors('success.jpg');
        expect(colors).toEqual([]);
        window.Image = originalImage;
    });

    it('should handle extractStrainColors when context is missing', async () => {
        (renderer as any).extractStrainColors.mockRestore();
        const originalImage = window.Image;
        (window as any).Image = class {
            onload: any; onerror: any; _src: string = ''; crossOrigin: string = '';
            get src() { return this._src; }
            set src(v: string) { this._src = v; setTimeout(() => { if (this.onload) this.onload(); }, 10); }
        } as any;

        const mockCanvas = { getContext: vi.fn(() => null), width: 0, height: 0 };
        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'canvas') return mockCanvas as any;
            return document.constructor.prototype.createElement.call(document, tag);
        });

        const colors = await (renderer as any).extractStrainColors('no-ctx.jpg');
        expect(colors).toEqual([]);
        window.Image = originalImage;
        createElementSpy.mockRestore();
    });

    it('should handle null plant or strainLibrary in addFlowerDetails', async () => {
        const group = new THREE.Group();
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, null);
        context.strainLibrary = null;
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' });
    });

    it('should hit all ternary branches for strainColors', async () => {
        const group = new THREE.Group();
        vi.spyOn(PlantUtils, 'calculatePlantAge').mockReturnValue(50);
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue({ imageUrl: 'test.jpg' } as any);

        const scenarios = [[], ['#111'], ['#111', '#222'], ['#111', '#222', '#333']];
        for (const colors of scenarios) {
            (renderer as any).extractStrainColors.mockResolvedValue(colors);
            await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' });
        }
    });

    it('should hit requestUpdate truthy/falsy branches', async () => {
        const group = new THREE.Group();
        vi.spyOn(PlantUtils, 'getPlantDisplayData').mockReturnValue({ imageUrl: 'test.jpg' } as any);
        (renderer as any).extractStrainColors.mockResolvedValue(['#111']);

        const reqUpdate = vi.fn();
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' }, reqUpdate);
        await Promise.resolve(); await Promise.resolve();
        expect(reqUpdate).toHaveBeenCalled();

        reqUpdate.mockClear();
        await (renderer as any).addFlowerDetails(group, 1, 10, 10, { entity_id: 'p' }, undefined);
        await Promise.resolve(); await Promise.resolve();
        expect(reqUpdate).not.toHaveBeenCalled();
    });
});