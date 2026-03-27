
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { InteractionManager } from '../../../../src/utils/three/interaction-manager';
import { SceneManager } from '../../../../src/utils/three/scene-manager';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;
    return {
        ...actual,
        Raycaster: vi.fn().mockImplementation(function (this: any) {
            return {
                setFromCamera: vi.fn(),
                intersectObjects: vi.fn(() => [])
            };
        }),
        Vector2: vi.fn().mockImplementation(function (this: any, x = 0, y = 0) { return { x, y }; }),
        // Other needed mocks
    };
});

vi.mock('three/examples/jsm/controls/DragControls.js', () => ({
    DragControls: vi.fn().mockImplementation(function (this: any) {
        return {
            addEventListener: vi.fn(),
            dispose: vi.fn()
        };
    })
}));

describe('InteractionManager', () => {
    let container: HTMLElement;
    let sceneManager: any;
    let manager: InteractionManager;

    beforeEach(() => {
        container = document.createElement('div');
        // Mock container rect
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
            left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600
        } as DOMRect);

        sceneManager = {
            camera: new THREE.PerspectiveCamera(),
            volatileGroup: { children: [] },
            sensorMeshes: new Map(),
            controls: { enabled: true },
            renderer: { domElement: container }
        };

        manager = new InteractionManager(sceneManager, container);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle mouse move and detect hover', () => {
        const callback = vi.fn();
        manager.setCallback(callback);

        // Mock Raycaster intersection
        const mockPlant = { userData: { plant: { id: 'p1' } } };
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: mockPlant }]);

        const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
        container.dispatchEvent(event);

        expect(callback).toHaveBeenCalledWith('hover', expect.objectContaining({ plant: { id: 'p1' } }));
        expect(container.style.cursor).toBe('pointer');

        // Test moving within same plant
        container.dispatchEvent(event);
        expect(callback).toHaveBeenCalledTimes(2);

        // Test hover off
        (manager as any)._raycaster.intersectObjects.mockReturnValue([]);
        container.dispatchEvent(event);
        expect(callback).toHaveBeenLastCalledWith('hover', { plant: null, pos: expect.any(Object) });
        expect(container.style.cursor).toBe('default');
    });

    it('should handle mouseleave', () => {
        const callback = vi.fn();
        manager.setCallback(callback);

        container.dispatchEvent(new MouseEvent('mouseleave'));
        expect(container.style.cursor).toBe('default');
        expect(callback).toHaveBeenCalledWith('hover', null);
    });

    it('should handle click on plant', () => {
        const callback = vi.fn();
        manager.setCallback(callback);

        // Mock Raycaster intersection for mouse move (to set hoveredPlant)
        const mockPlant = { userData: { plant: { id: 'p1' } } };
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: mockPlant }]);

        // Trigger move to set hovered
        const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
        container.dispatchEvent(moveEvent);

        // Trigger click
        const clickEvent = new MouseEvent('click', { clientX: 100, clientY: 100 });
        container.dispatchEvent(clickEvent);

        expect(callback).toHaveBeenCalledWith('click', { plant: { id: 'p1' } });
    });

    it('should toggle edit mode and visuals', () => {
        const sensorMesh = new THREE.Mesh();
        const cssLabel = new THREE.Object3D();
        // Mock CSS2DObject behavior by setting constructor name
        Object.defineProperty(cssLabel, 'constructor', { value: { name: 'CSS2DObject' } });
        (cssLabel as any).element = document.createElement('div');
        sensorMesh.add(cssLabel);

        sceneManager.sensorMeshes.set('s1', sensorMesh);

        manager.setEditMode(true);
        expect((manager as any).editMode).toBe(true);
        expect(manager.dragControls).toBeDefined();
        expect((cssLabel as any).element.classList.contains('editing')).toBe(true);
        expect(sensorMesh.children.some(c => c.name === 'editOutline')).toBe(true);

        manager.setEditMode(false);
        expect((manager as any).editMode).toBe(false);
        expect(manager.dragControls).toBeUndefined();
        expect((cssLabel as any).element.classList.contains('editing')).toBe(false);
        expect(sensorMesh.children.some(c => c.name === 'editOutline')).toBe(false);
    });

    it('should handle link mode interactions', () => {
        const callback = vi.fn();
        manager.setCallback(callback);

        const sensor1 = new THREE.Mesh();
        sensor1.userData.entityId = 'sensor.1';
        const sensor2 = new THREE.Mesh();
        sensor2.userData.entityId = 'sensor.2';

        sceneManager.sensorMeshes.set('sensor.1', sensor1);
        sceneManager.sensorMeshes.set('sensor.2', sensor2);

        manager.setEditMode(true);
        manager.setLinkMode(true);

        // 1. Hover over sensor
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: sensor1 }]);
        container.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
        expect(container.style.cursor).toBe('pointer');

        // 2. Click first sensor to select
        container.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));
        expect((manager as any).selectedForLink).toBe('sensor.1');

        // 3. Click same sensor to deselect
        container.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));
        expect((manager as any).selectedForLink).toBeNull();

        // 4. Select again and link to second
        container.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: sensor2 }]);
        container.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 20 }));

        expect(callback).toHaveBeenCalledWith('link', { from: 'sensor.1', to: 'sensor.2' });
        expect((manager as any).selectedForLink).toBeNull();
    });

    it('should handle drag events', () => {
        const callback = vi.fn();
        manager.setCallback(callback);
        sceneManager.sensorMeshes.set('s1', new THREE.Mesh());

        manager.setEditMode(true);
        const dragControls = manager.dragControls!;

        // dragstart
        const dragStartHandler = (dragControls.addEventListener as any).mock.calls.find((c: any) => c[0] === 'dragstart')[1];
        dragStartHandler();
        expect(manager.isDragging).toBe(true);
        expect(sceneManager.controls.enabled).toBe(false);

        // drag
        const dragHandler = (dragControls.addEventListener as any).mock.calls.find((c: any) => c[0] === 'drag')[1];
        dragHandler({ object: 'mockObj' });
        expect(callback).toHaveBeenCalledWith('drag', { object: 'mockObj' });

        // dragend
        const dragEndHandler = (dragControls.addEventListener as any).mock.calls.find((c: any) => c[0] === 'dragend')[1];
        dragEndHandler({ object: 'mockObj' });
        expect(manager.isDragging).toBe(false);
        expect(sceneManager.controls.enabled).toBe(true);
        expect(callback).toHaveBeenCalledWith('dragend', { object: 'mockObj' });
    });

    it('should handle edge cases in handleMouseMove', () => {
        // 1. No camera
        sceneManager.camera = undefined;
        container.dispatchEvent(new MouseEvent('mousemove'));

        // 2. Edit mode move (line 66)
        sceneManager.camera = new THREE.PerspectiveCamera();
        manager.setEditMode(true);
        manager.setLinkMode(false);
        container.dispatchEvent(new MouseEvent('mousemove'));

        // 3. Detect sensor and emptySlot
        manager.setEditMode(false);
        const sensorMesh = { userData: { entityId: 's1' } };
        const slotMesh = { userData: { emptySlot: { id: 'slot1' } } };
        (manager as any)._raycaster.intersectObjects.mockReturnValue([
            { object: slotMesh },
            { object: sensorMesh }
        ]);

        const callback = vi.fn();
        manager.setCallback(callback);
        container.dispatchEvent(new MouseEvent('mousemove'));

        expect(callback).toHaveBeenCalledWith('hover', expect.objectContaining({ plant: { id: 'slot1' } }));
    });

    it('should exercise updateVisuals cleanup and css traverse', () => {
        manager.setEditMode(true);
        const mesh = new THREE.Mesh();
        const outline = new THREE.Mesh();
        outline.name = 'editOutline';
        const hit = new THREE.Mesh();
        hit.name = 'hitArea';
        mesh.add(outline, hit);

        sceneManager.sensorMeshes.set('s1', mesh);

        // Trigger updateVisuals via setEditMode again
        manager.setEditMode(true);

        expect(mesh.children.filter(c => c.name === 'editOutline').length).toBe(1);
        expect(mesh.children.filter(c => c.name === 'hitArea').length).toBe(1);
    });

    it('should handle updateDragControls guards', () => {
        manager.setEditMode(true);

        // Falsy sensorMeshes
        sceneManager.sensorMeshes.clear();
        (manager as any).updateDragControls();
        expect(manager.dragControls).toBeUndefined();

        // Falsy camera
        sceneManager.sensorMeshes.set('s1', new THREE.Mesh());
        sceneManager.camera = undefined;
        (manager as any).updateDragControls();
        expect(manager.dragControls).toBeUndefined();
    });

    it('should handle mouse events without callback', () => {
        manager.setCallback(undefined as any);

        // mouseleave
        container.dispatchEvent(new MouseEvent('mouseleave'));

        // hover (plant)
        const mockPlant = { userData: { plant: { id: 'p1' } } };
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: mockPlant }]);
        container.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));

        // hover (link)
        manager.setLinkMode(true);
        const sensor = { userData: { entityId: 's1' } };
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: sensor }]);
        container.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));

        // click link (linking two sensors)
        (manager as any).selectedForLink = 'other';
        container.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));

        // click plant
        manager.setLinkMode(false);
        (manager as any).hoveredPlant = { id: 'p1' };
        container.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10 }));

        // drag events
        sceneManager.sensorMeshes.set('s1', new THREE.Mesh());
        manager.setEditMode(true);
        const dragControls = manager.dragControls!;
        const dragHandler = (dragControls.addEventListener as any).mock.calls.find((c: any) => c[0] === 'drag')[1];
        dragHandler({ object: {} });
        const dragEndHandler = (dragControls.addEventListener as any).mock.calls.find((c: any) => c[0] === 'dragend')[1];
        dragEndHandler({ object: {} });

        // Just verify no errors occur
        expect(true).toBe(true);
    });

    it('should handle handleClick editMode guard', () => {
        manager.setEditMode(true);
        manager.setLinkMode(false);
        const callback = vi.fn();
        manager.setCallback(callback);

        (manager as any).hoveredPlant = { id: 'p1' };
        container.dispatchEvent(new MouseEvent('click'));

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle more link mode branches', () => {
        manager.setEditMode(true);
        manager.setLinkMode(true);

        // Match first object with NO entityId, second WITH entityId
        const meshNoId = new THREE.Mesh();
        const meshWithId = new THREE.Mesh();
        meshWithId.userData.entityId = 's1';

        (manager as any)._raycaster.intersectObjects.mockReturnValue([
            { object: meshNoId },
            { object: meshWithId }
        ]);

        container.dispatchEvent(new MouseEvent('click'));
        expect((manager as any).selectedForLink).toBe('s1');
    });

    it('should handle handleClick with no hovered plant or link mode', () => {
        manager.setEditMode(false);
        manager.setLinkMode(false);
        (manager as any).hoveredPlant = null;

        const callback = vi.fn();
        manager.setCallback(callback);
        container.dispatchEvent(new MouseEvent('click'));
        expect(callback).not.toHaveBeenCalled();
    });

    it('should cover remaining handleMouseMove branches', () => {
        // 1. linkMode with foundSensor=false (line 91)
        manager.setLinkMode(true);
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: new THREE.Mesh() }]); // No entityId
        container.dispatchEvent(new MouseEvent('mousemove'));
        expect(container.style.cursor).toBe('default');

        // 2. foundSensor break (line 87)
        manager.setLinkMode(false);
        const sensorMesh = { userData: { entityId: 's1' } };
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: sensorMesh }]);
        container.dispatchEvent(new MouseEvent('mousemove'));
        expect(container.style.cursor).toBe('default'); // Default since it's not a plant and not linkMode

        // 3. same plant branch (line 101-103)
        const plant = { id: 'p1' };
        (manager as any).hoveredPlant = plant;
        const callback = vi.fn();
        manager.setCallback(callback);
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: { userData: { plant } } }]);
        container.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
        expect(callback).toHaveBeenCalledWith('hover', expect.objectContaining({ plant }));

        // 4. same plant WITHOUT callback (line 103 false)
        manager.setCallback(undefined as any);
        container.dispatchEvent(new MouseEvent('mousemove', { clientX: 105, clientY: 105 }));
    });

    it('should cover linkMode handleClick entityId=false (line 125)', () => {
        manager.setLinkMode(true);
        (manager as any)._raycaster.intersectObjects.mockReturnValue([{ object: new THREE.Mesh() }]); // No entityId
        const callback = vi.fn();
        manager.setCallback(callback);
        container.dispatchEvent(new MouseEvent('click'));
        expect(callback).not.toHaveBeenCalled();
    });
});
