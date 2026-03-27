
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from '../../../../src/utils/three/scene-manager';

// --- Mocks ---
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any;
    const createAddFn = () => vi.fn(function (this: any, ...args: any[]) {
        if (!this.children) this.children = [];
        this.children.push(...args);
        return this;
    });

    const createRemoveFn = () => vi.fn(function (this: any, ...args: any[]) {
        if (!this.children) return this;
        args.forEach(arg => {
            const index = this.children.indexOf(arg);
            if (index > -1) this.children.splice(index, 1);
        });
        return this;
    });

    return {
        ...actual,
        WebGLRenderer: vi.fn().mockImplementation(function (this: any) {
            return {
                setSize: vi.fn(),
                setPixelRatio: vi.fn(),
                setClearColor: vi.fn(),
                render: vi.fn(),
                domElement: document.createElement('canvas'),
                dispose: vi.fn()
            };
        }),
        Scene: vi.fn().mockImplementation(function (this: any) {
            return {
                add: createAddFn(),
                remove: createRemoveFn(),
                children: [],
                clear: vi.fn(),
                traverse: vi.fn(),
                userData: {}
            };
        }),
        PerspectiveCamera: vi.fn().mockImplementation(function (this: any) {
            return {
                position: { set: vi.fn() },
                updateProjectionMatrix: vi.fn(),
                aspect: 1,
                traverse: vi.fn(),
                userData: {}
            };
        }),
        Group: vi.fn().mockImplementation(function (this: any) {
            return {
                add: createAddFn(),
                remove: createRemoveFn(),
                children: [],
                clear: vi.fn(),
                traverse: vi.fn(),
                userData: {}
            };
        }),
        Raycaster: vi.fn().mockImplementation(function (this: any) {
            return {
                setFromCamera: vi.fn(),
                intersectObjects: vi.fn().mockReturnValue([])
            };
        }),
        Vector2: actual.Vector2,
    };
});

vi.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
    CSS2DRenderer: vi.fn().mockImplementation(function (this: any) {
        return {
            setSize: vi.fn(),
            render: vi.fn(),
            domElement: document.createElement('div')
        };
    }),
    CSS2DObject: vi.fn().mockImplementation(function (this: any) {
        return {
            element: document.createElement('div')
        };
    })
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
    OrbitControls: vi.fn().mockImplementation(function (this: any) {
        return {
            enableDamping: true,
            update: vi.fn(),
            dispose: vi.fn()
        };
    })
}));


describe('SceneManager', () => {
    let container: HTMLElement;
    let device: any;
    let hass: any;
    let manager: SceneManager;

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        // Define clientWidth/Height properties for the container
        Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
        Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });

        device = {
            deviceId: 'test',
            dimensions: { width: 100, height: 100, length: 100 },
            environmentAttributes: {}
        };
        hass = { states: {} };

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => 1);
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });

        manager = new SceneManager(container, device, hass);
        // Trigger the initial resize timeout to cover the anonymous function
        vi.runAllTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should initialize correctly', () => {
        expect(manager.scene).toBeDefined();
        expect(manager.camera).toBeDefined();
        expect(manager.renderer).toBeDefined();
        expect(manager.renderers.length).toBeGreaterThan(0);
    });

    it('should use fallback size if container size is 0', () => {
        const smallContainer = document.createElement('div');
        Object.defineProperty(smallContainer, 'clientWidth', { value: 0 });
        Object.defineProperty(smallContainer, 'clientHeight', { value: 0 });
        const rendererSpy = vi.spyOn(THREE, 'WebGLRenderer');
        new SceneManager(smallContainer, device, hass);

        // Check if renderer setSize was called with 400x400
        // Our mock returns a function, so we need to check the result of the call
        const mockRenderer = (rendererSpy.mock.results[0].value as any);
        expect(mockRenderer.setSize).toHaveBeenCalledWith(400, 400);
    });

    it('should handle missing strainLibrary in config', () => {
        const mgr = new SceneManager(container, device, hass, {});
        // Accessing private context via any for testing
        expect((mgr as any).context.strainLibrary).toEqual([]);
    });

    it('should update context on update()', () => {
        const newDevice = { ...device, name: 'Updated' };
        // Trigger update
        manager.update(newDevice, hass, 'temp', {}, -1, [], {});

        const rendererSpy = vi.spyOn(manager.renderers[0], 'render');
        manager.update(newDevice, hass, 'temp', {}, -1, [], {});
        expect(rendererSpy).toHaveBeenCalled();
    });

    it('should handle null strainLibrary and visibility in update()', () => {
        const initialStrainLib = (manager as any).context.strainLibrary;
        const initialVisibility = (manager as any).context.visibility;

        manager.update(device, hass, 'temp', {}, -1, null as any, null as any);

        expect((manager as any).context.strainLibrary).toBe(initialStrainLib);
        expect((manager as any).context.visibility).toBe(initialVisibility);
    });

    it('should set callbacks in setCallbacks()', () => {
        const requestUpdate = vi.fn();
        const getSensorValue = vi.fn();

        manager.setCallbacks({ requestUpdate });
        expect((manager as any).context.requestUpdate).toBe(requestUpdate);
        expect((manager as any).context.getSensorValue).toBeUndefined();

        manager.setCallbacks({ getSensorValue });
        expect((manager as any).context.getSensorValue).toBe(getSensorValue);
    });

    it('should animate loop', () => {
        const spy = vi.spyOn(manager.renderer, 'render');
        spy.mockClear();
        manager.animate();
        expect(spy).toHaveBeenCalled();
    });

    it('should not render in animate if components are missing', () => {
        const spy = vi.spyOn(manager.renderer, 'render');
        spy.mockClear();
        const originalRenderer = manager.renderer;
        (manager as any).renderer = null;
        manager.animate();
        expect(spy).not.toHaveBeenCalled();
        (manager as any).renderer = originalRenderer;
    });

    it('should resize', () => {
        const spy = vi.spyOn(manager.renderer, 'setSize');
        manager.handleResize();
        expect(spy).toHaveBeenCalled();
    });

    it('should early return in handleResize if missing components', () => {
        const spy = vi.spyOn(manager.renderer, 'setSize');

        // Clear previous calls (e.g. from constructor's resize timeout)
        spy.mockClear();

        // Test missing container
        const originalContainer = (manager as any).container;
        (manager as any).container = null;
        manager.handleResize();
        expect(spy).not.toHaveBeenCalled();
        (manager as any).container = originalContainer;

        // Test missing renderer
        const originalRenderer = manager.renderer;
        (manager as any).renderer = null;
        manager.handleResize();
        expect(spy).not.toHaveBeenCalled();
        (manager as any).renderer = originalRenderer;
    });

    it('should dispose correctly', () => {
        const rendererDisposeSpy = vi.spyOn(manager.renderer, 'dispose');
        const rendererRemoveSpy = vi.fn();

        // Mock parentNode for domElement to cover that branch
        const parent = document.createElement('div');
        parent.appendChild(manager.renderer.domElement);
        parent.appendChild(manager.labelRenderer.domElement);

        // Mock renderers to be disposed
        const rDisposeSpies = manager.renderers.map(r => vi.spyOn(r, 'dispose'));

        manager.dispose();

        expect(rendererDisposeSpy).toHaveBeenCalled();
        rDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalled());
        expect(manager.renderer.domElement.parentNode).toBeNull();
        expect(manager.labelRenderer.domElement.parentNode).toBeNull();
    });

    it('should handle missing IDs and parents in dispose()', () => {
        (manager as any).animationId = null;
        (manager as any).resizeTimeoutId = null;

        // Already removed by previous test if we use the same manager, but beforeEach creates a new one
        if (manager.renderer.domElement.parentNode) {
            manager.renderer.domElement.parentNode.removeChild(manager.renderer.domElement);
        }
        if (manager.labelRenderer.domElement.parentNode) {
            manager.labelRenderer.domElement.parentNode.removeChild(manager.labelRenderer.domElement);
        }

        const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
        const clearSpy = vi.spyOn(window, 'clearTimeout');

        manager.dispose();

        expect(cancelSpy).not.toHaveBeenCalled();
        expect(clearSpy).not.toHaveBeenCalled();
    });

    it('should dispose objects in disposeObject via dispose', () => {
        const geom = { dispose: vi.fn() };
        const mat = { dispose: vi.fn() };
        const matArray = [{ dispose: vi.fn() }, { dispose: vi.fn() }];

        const cssObj = { isCSS2DObject: true, element: { remove: vi.fn() } };
        const geomObj = { geometry: geom, material: mat };
        const matArrayObj = { material: matArray };

        // mock scene.traverse to call the callback with our mock objects
        (manager.scene.traverse as any).mockImplementation((cb: any) => {
            cb(cssObj);
            cb(geomObj);
            cb(matArrayObj);
        });

        manager.dispose();

        expect(cssObj.element.remove).toHaveBeenCalled();
        expect(geom.dispose).toHaveBeenCalled();
        expect(mat.dispose).toHaveBeenCalled();
        matArray.forEach(m => expect(m.dispose).toHaveBeenCalled());
    });

    it('should raycast', () => {
        const pointer = new THREE.Vector2(0, 0);
        const results = manager.raycast(pointer);
        expect(Array.isArray(results)).toBe(true);
    });
});
