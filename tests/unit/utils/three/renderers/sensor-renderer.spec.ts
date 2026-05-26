import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { SensorRenderer } from '../../../../../src/utils/three/renderers/sensor-renderer';
import { SensorTypeUtils } from '../../../../../src/utils/sensor-type-utils';

// --- Mocks ---

const { mockVector3, createObject3DNode, mockSensorTypeUtils } = vi.hoisted(() => {
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
        this.getObjectByName = vi.fn((name) => {
            if (this.name === name) return this;
            for (const child of children) {
                if (child.name === name) return child;
                const found: any = child.getObjectByName?.(name);
                if (found) return found;
            }
            return undefined;
        });
        this.position = new (mockVector3 as any)();
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = {
            set: vi.fn(function (this: any, x, y, z) {
                if (typeof x === 'number') { this.x = x; this.y = y; this.z = z; }
                return this;
            }),
            x: 1, y: 1, z: 1
        };
        this.userData = {};
        this.name = '';
        this.visible = true;
        this.traverse = vi.fn((cb) => { cb(this); children.forEach(c => c.traverse?.(cb)); });
    };

    const mockSensorTypeUtils = {
        isTemperature: vi.fn(),
        isHumidity: vi.fn(),
        isVPD: vi.fn(),
        isLight: vi.fn(),
        isCO2: vi.fn(),
        isSoilMoisture: vi.fn(),
        isFan: vi.fn(),
        isExhaust: vi.fn(),
        isIrrigationPump: vi.fn(),
        isDrainPump: vi.fn(),
        isIrrigationTank: vi.fn(),
        isHumidifier: vi.fn(),
        isDehumidifier: vi.fn(),
        getSensorIcon: vi.fn().mockReturnValue('mdi:sensor')
    };

    return { mockVector3, createObject3DNode, mockSensorTypeUtils };
});

vi.mock('three', async () => ({
    ...(await vi.importActual('three')),
    Group: vi.fn().mockImplementation(function (this: any) { createObject3DNode.call(this); }),
    Mesh: vi.fn().mockImplementation(function (this: any, geo, mat) {
        createObject3DNode.call(this);
        this.geometry = geo;
        this.material = mat;
    }),
    Vector3: vi.fn().mockImplementation(function (this: any, x, y, z) { mockVector3.call(this, x, y, z); }),
    Color: vi.fn().mockImplementation(function (this: any) {
        this.set = vi.fn().mockReturnThis();
        this.r = 0; this.g = 0; this.b = 0;
    }),
    CubicBezierCurve3: vi.fn().mockImplementation(function (this: any) { this.getPoints = vi.fn(() => []); }),
    CylinderGeometry: vi.fn().mockImplementation(function (this: any) { this.rotateX = vi.fn(); }),
    TorusGeometry: vi.fn().mockImplementation(function (this: any) { this.rotateX = vi.fn(); }),
    SphereGeometry: vi.fn().mockImplementation(function () { }),
    TubeGeometry: vi.fn().mockImplementation(function () { }),
    MeshStandardMaterial: vi.fn().mockImplementation(function () { }),
    MeshBasicMaterial: vi.fn().mockImplementation(function () { }),
}));

vi.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
    CSS2DObject: vi.fn().mockImplementation(function (this: any, el) {
        this.element = el;
        this.name = '';
        this.position = { set: vi.fn() };
        this.isCSS2DObject = true;
        this.visible = true;
        this.traverse = vi.fn((cb) => cb(this));
        this.getObjectByName = vi.fn((name) => (this.name === name ? this : undefined));
    })
}));

vi.mock('../../../../../src/utils/sensor-type-utils', () => ({
    SensorTypeUtils: mockSensorTypeUtils
}));

describe('SensorRenderer', () => {
    let context: any;
    let renderer: SensorRenderer;

    beforeEach(() => {
        context = {
            device: {
                dimensions: { width: 100, length: 150, height: 200 },
                environmentAttributes: {
                    sensorCoordinates: {}
                }
            },
            hass: {
                states: {}
            },
            volatileGroup: new (THREE.Group as any)(),
            sensorMeshes: new Map(),
            cache: new Map(),
            selectedMetric: 'humidity',
            visibility: { sensors: true, tooltips: true },
            historyData: {},
            timelineIndex: -1
        };
        renderer = new SensorRenderer(context);

        // Reset all mocks to default safe values
        Object.values(mockSensorTypeUtils).forEach(v => {
            if (vi.isMockFunction(v)) v.mockReturnValue(false);
        });
        mockSensorTypeUtils.getSensorIcon.mockReturnValue('mdi:sensor');
        vi.clearAllMocks();
    });

    it('should create and update sensor probes for temperature/humidity', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'hum1': { x: 10, y: 10, z: 150 } };
        context.hass.states['hum1'] = { state: '75.5' };
        mockSensorTypeUtils.isHumidity.mockReturnValue(true);

        renderer.render();

        expect(context.sensorMeshes.has('hum1')).toBeTruthy();
        const mesh = context.sensorMeshes.get('hum1');
        expect(mesh.position.x).toBe(-40);
        expect(mesh.getObjectByName('label').element.innerHTML).toContain('75.5%');
    });

    it('should create light sensor using sphere geometry', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'light_test': { x: 50, y: 50, z: 100 } };
        context.hass.states['light_test'] = { state: '100' };
        mockSensorTypeUtils.isLight.mockReturnValue(true);

        renderer.render();
        const mesh = context.sensorMeshes.get('light_test');
        expect(mesh).toBeDefined();
        expect(mesh.userData.types).toContain('light');
    });

    it('should respect visibility and tooltip settings', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'vis1': { x: 0, y: 0 } };
        context.hass.states['vis1'] = { state: '50' };
        mockSensorTypeUtils.isHumidity.mockReturnValue(true);

        // Case 1: Tooltips disabled
        context.visibility.tooltips = false;
        renderer.render();
        let mesh = context.sensorMeshes.get('vis1');
        expect(mesh.getObjectByName('label').visible).toBeFalsy();

        // Case 2: Metric doesn't match
        context.selectedMetric = 'vpd';
        mockSensorTypeUtils.isHumidity.mockReturnValue(true); // Still hum sensor
        renderer.render();
        expect(mesh.visible).toBeFalsy();
    });

    it('should fetch values from history if timelineIndex is set', () => {
        context.timelineIndex = 0;
        context.historyData = { 'hist1': [{ s: '42.5' }] };
        expect((renderer as any).getValue('hist1')).toBe(42.5);
    });

    it('should handle missing history data or state', () => {
        context.timelineIndex = 0;
        context.historyData = {};
        expect((renderer as any).getValue('missing1')).toBe(0);

        context.timelineIndex = -1;
        context.hass.states = {};
        expect((renderer as any).getValue('missing2')).toBe(0);
    });

    it('should cleanup stale sensors', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'stale1': { x: 0, y: 0 } };
        context.hass.states['stale1'] = { state: '1' };
        mockSensorTypeUtils.isHumidity.mockReturnValue(true);

        renderer.render();
        expect(context.sensorMeshes.has('stale1')).toBeTruthy();

        context.device.environmentAttributes.sensorCoordinates = {};
        renderer.render();
        expect(context.sensorMeshes.has('stale1')).toBeFalsy();
    });

    it('should skip entities handled by specialized renderers', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'special1': { x: 0, y: 0 } };
        mockSensorTypeUtils.isFan.mockReturnValue(true);

        renderer.render();
        expect(context.sensorMeshes.has('special1')).toBeFalsy();
    });

    it('should skip update if label HTML is identical', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'id1': { x: 0, y: 0 } };
        context.hass.states['id1'] = { state: '10' };
        mockSensorTypeUtils.isHumidity.mockReturnValue(true);

        renderer.render();
        const label = context.sensorMeshes.get('id1').getObjectByName('label');
        const html = label.element.innerHTML;

        renderer.render();
        expect(label.element.innerHTML).toBe(html);
    });

    it('should hit all isMetric branches', () => {
        // sensorTypes branch
        context.device.environmentAttributes.sensorTypes = { 's1': 'temperature' };
        expect((renderer as any).isMetric('s1', 'temperature')).toBeTruthy();
        expect((renderer as any).isMetric('s1', 'humidity')).toBeFalsy();

        context.device.environmentAttributes.sensorTypes = undefined;

        // isLight short circuit
        mockSensorTypeUtils.isLight.mockReturnValue(true);
        expect((renderer as any).isMetric('s1', 'temperature')).toBeFalsy();
        mockSensorTypeUtils.isLight.mockReturnValue(false);

        // Individual metrics
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);
        expect((renderer as any).isMetric('s1', 'temperature')).toBeTruthy();
        mockSensorTypeUtils.isTemperature.mockReturnValue(false);

        mockSensorTypeUtils.isHumidity.mockReturnValue(true);
        expect((renderer as any).isMetric('s1', 'humidity')).toBeTruthy();
        mockSensorTypeUtils.isHumidity.mockReturnValue(false);

        mockSensorTypeUtils.isVPD.mockReturnValue(true);
        expect((renderer as any).isMetric('s1', 'vpd')).toBeTruthy();
        mockSensorTypeUtils.isVPD.mockReturnValue(false);

        mockSensorTypeUtils.isCO2.mockReturnValue(true);
        expect((renderer as any).isMetric('s1', 'co2')).toBeTruthy();
        mockSensorTypeUtils.isCO2.mockReturnValue(false);

        mockSensorTypeUtils.isSoilMoisture.mockReturnValue(true);
        expect((renderer as any).isMetric('s1', 'soil_moisture')).toBeTruthy();
        mockSensorTypeUtils.isSoilMoisture.mockReturnValue(false);

        // Fallthrough
        expect((renderer as any).isMetric('s1', 'unknown')).toBeFalsy();
    });

    it('should handle various units and prefixes', () => {
        // Temperature
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);
        expect((renderer as any).getUnit('p1', 'temperature', false)).toBe('°C');
        expect((renderer as any).getPrefix('p1', false)).toBe('T');

        // VPD
        expect((renderer as any).getUnit('p1', 'vpd', false)).toBe('kPa');

        // CO2
        expect((renderer as any).getUnit('p1', 'co2', false)).toBe('ppm');

        // Default humidity/%
        expect((renderer as any).getUnit('p1', 'humidity', false)).toBe('%');
        expect((renderer as any).getUnit('p1', 'unknown', false)).toBe('%');

        // Light
        expect((renderer as any).getUnit('p1', 'any', true)).toBe('%');
        expect((renderer as any).getPrefix('p1', true)).toBe('L');

        // Default S prefix
        mockSensorTypeUtils.isTemperature.mockReturnValue(false);
        expect((renderer as any).getPrefix('p1', false)).toBe('S');
    });

    it('should update existing models instead of recreating', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'ex1': { x: 0, y: 0 } };
        mockSensorTypeUtils.isHumidity.mockReturnValue(true);

        renderer.render();
        const first = context.sensorMeshes.get('ex1');

        context.device.environmentAttributes.sensorCoordinates['ex1'].x = 10;
        renderer.render();
        const second = context.sensorMeshes.get('ex1');

        expect(first).toBe(second);
        expect(second.position.x).toBe(-40);
    });

    it('should skip sensor and cleanup if value is NaN', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'nan1': { x: 0, y: 0 } };
        context.hass.states['nan1'] = { state: '10' };
        mockSensorTypeUtils.isHumidity.mockReturnValue(true);

        renderer.render();
        expect(context.sensorMeshes.has('nan1')).toBeTruthy();

        context.hass.states['nan1'] = { state: 'NaN' };
        renderer.render();
        expect(context.sensorMeshes.has('nan1')).toBeFalsy();
    });

    it('should handle missing context data gracefully', () => {
        context.device.environmentAttributes = undefined;
        context.device.dimensions = undefined;
        renderer.render();
        expect(context.sensorMeshes.size).toBe(0);
    });

    it('should render CO2 sensor and populate types', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'co2_1': { x: 0, y: 0 } };
        context.hass.states['co2_1'] = { state: '800' };
        mockSensorTypeUtils.isCO2.mockReturnValue(true);
        context.selectedMetric = 'co2';

        renderer.render();
        const mesh = context.sensorMeshes.get('co2_1');
        expect(mesh.userData.types).toContain('co2');
        expect(mesh.getObjectByName('label').element.innerHTML).toContain('800.0ppm');
    });

    it('should cover additional specialized renderer skips', () => {
        context.device.environmentAttributes.sensorCoordinates = {
            'ex1': { x: 0, y: 0 },
            'ip1': { x: 0, y: 0 },
            'dp1': { x: 0, y: 0 },
            'it1': { x: 0, y: 0 },
            'hu1': { x: 0, y: 0 },
            'dh1': { x: 0, y: 0 }
        };
        mockSensorTypeUtils.isExhaust.mockImplementation((_, id) => id === 'ex1');
        mockSensorTypeUtils.isIrrigationPump.mockImplementation((_, id) => id === 'ip1');
        mockSensorTypeUtils.isDrainPump.mockImplementation((_, id) => id === 'dp1');
        mockSensorTypeUtils.isIrrigationTank.mockImplementation((_, id) => id === 'it1');
        mockSensorTypeUtils.isHumidifier.mockImplementation((_, id) => id === 'hu1');
        mockSensorTypeUtils.isDehumidifier.mockImplementation((_, id) => id === 'dh1');

        renderer.render();
        expect(context.sensorMeshes.size).toBe(0);
    });

    it('should handle NaN value for a NEW sensor (not in cache)', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'new_nan': { x: 0, y: 0 } };
        context.hass.states['new_nan'] = { state: 'NaN' };
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);

        renderer.render();
        expect(context.cache.has('new_nan')).toBeFalsy();
    });

    it('should fall back to default visibility if context.visibility is undefined', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'v1': { x: 0, y: 0 } };
        context.hass.states['v1'] = { state: '42' };
        context.selectedMetric = 'temperature';
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);
        context.visibility = undefined;

        renderer.render();
        const mesh = context.sensorMeshes.get('v1');
        const label = mesh.getObjectByName('label');
        expect(label.visible).toBe(true);
    });

    it('should handle undefined point in historyData', () => {
        context.timelineIndex = 1;
        context.historyData = { 'h1': [{ s: '10' }] }; // index 1 is missing
        expect((renderer as any).getValue('h1')).toBe(0);
    });

    it('should populate various sensor types in userData.types', () => {
        context.device.environmentAttributes.sensorCoordinates = { 's1': { x: 0, y: 0 } };
        context.hass.states['s1'] = { state: '1' };
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);
        mockSensorTypeUtils.isVPD.mockReturnValue(true);
        mockSensorTypeUtils.isSoilMoisture.mockReturnValue(true);

        renderer.render();
        const mesh = context.sensorMeshes.get('s1');
        expect(mesh.userData.types).toContain('temperature');
        expect(mesh.userData.types).toContain('soil_moisture');
    });

    it('should skip sensor if coordinates are missing', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'missing_coords': undefined as any };
        context.hass.states['missing_coords'] = { state: '42' };
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);

        renderer.render();
        expect(context.sensorMeshes.has('missing_coords')).toBeFalsy();
    });

    it('should handle missing label on existing sensor model', () => {
        context.device.environmentAttributes.sensorCoordinates = { 'no_label': { x: 0, y: 0 } };
        context.hass.states['no_label'] = { state: '42' };
        context.selectedMetric = 'temperature';
        mockSensorTypeUtils.isTemperature.mockReturnValue(true);

        renderer.render();
        const mesh = context.sensorMeshes.get('no_label');
        const label = mesh.getObjectByName('label');
        mesh.remove(label);

        // Render again - line 90 check
        renderer.render();
        expect(mesh.getObjectByName('label')).toBeUndefined();
    });
});
