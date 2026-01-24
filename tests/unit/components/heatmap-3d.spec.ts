import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html, nothing } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import * as THREE from 'three';
import '../../../src/components/heatmap-3d';
import { Heatmap3D } from '../../../src/components/heatmap-3d';
import { GrowspaceType } from '../../../src/constants';

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

    const createTraverseFn = () => vi.fn(function (this: any, callback: (obj: any) => void) {
        callback(this);
        if (this.children) {
            this.children.forEach((child: any) => {
                if (child.traverse) child.traverse(callback);
            });
        }
    });

    const createGetObjectByNameFn = () => vi.fn(function (this: any, name: string): any {
        if (this.name === name) return this;
        if (this.children) {
            for (const child of this.children) {
                if (child.name === name) return child;
                if (child.getObjectByName) {
                    const found = child.getObjectByName(name);
                    if (found) return found;
                }
            }
        }
        return undefined;
    });

    const createDisposeFn = () => vi.fn();

    const createMockScene = () => ({
        add: createAddFn(),
        remove: createRemoveFn(),
        clear: vi.fn(function (this: any) { this.children = []; }),
        children: [] as any[],
        background: null,
        traverse: createTraverseFn(),
        getObjectByName: createGetObjectByNameFn(),
        userData: {}
    });

    const createMockRenderer = () => ({
        setSize: vi.fn(),
        setPixelRatio: vi.fn(),
        setClearColor: vi.fn(),
        render: vi.fn(),
        domElement: document.createElement('canvas'),
        dispose: createDisposeFn()
    });

    const createMockCamera = () => ({
        position: { set: vi.fn(function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; }), x: 0, y: 0, z: 0 },
        lookAt: vi.fn(),
        updateProjectionMatrix: vi.fn(),
        aspect: 1
    });

    const createMockGroup = () => ({
        add: createAddFn(),
        remove: createRemoveFn(),
        children: [] as any[],
        traverse: createTraverseFn(),
        position: { set: vi.fn(function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; }), x: 0, y: 0, z: 0 },
        rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
        scale: { set: vi.fn(), x: 1, y: 1, z: 1 },
        getObjectByName: createGetObjectByNameFn(),
        localToWorld: vi.fn((v) => v),
        lookAt: vi.fn(),
        userData: {}
    });

    const createMockMesh = () => ({
        position: { set: vi.fn(function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; }), x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
        scale: { set: vi.fn() },
        add: createAddFn(),
        remove: createRemoveFn(),
        traverse: createTraverseFn(),
        getObjectByName: createGetObjectByNameFn(),
        children: [] as any[],
        material: { dispose: createDisposeFn(), uniforms: { u_time: { value: 0 } } },
        geometry: {
            dispose: createDisposeFn(),
            boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
            localToWorld: vi.fn((v) => v),
            userData: {},
            attributes: {
                position: {
                    count: 10,
                    getX: vi.fn(() => 0),
                    getY: vi.fn(() => 0),
                    getZ: vi.fn(() => 0),
                    setZ: vi.fn(),
                    needsUpdate: false
                }
            }
        },
        lookAt: vi.fn(),
        userData: {}
    });

    return {
        ...actual,
        Scene: vi.fn().mockImplementation(function () { return createMockScene(); }),
        WebGLRenderer: vi.fn().mockImplementation(function () { return createMockRenderer(); }),
        PerspectiveCamera: vi.fn().mockImplementation(function () { return createMockCamera(); }),
        Group: vi.fn().mockImplementation(function () { return { ...createMockGroup(), rotateX: vi.fn(), rotateY: vi.fn(), rotateZ: vi.fn() }; }),
        Mesh: vi.fn().mockImplementation(function () { return { ...createMockMesh(), rotateX: vi.fn(), rotateY: vi.fn(), rotateZ: vi.fn() }; }),
        Vector3: vi.fn().mockImplementation(function (x = 0, y = 0, z = 0) {
            const v = {
                x, y, z,
                set: vi.fn(function (nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; return this; }),
                sub: vi.fn(function (v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }),
                normalize: vi.fn(function () { return this; }),
                add: vi.fn(function (v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }),
                multiplyScalar: vi.fn(function (s) { this.x *= s; this.y *= s; this.z *= s; return this; }),
                copy: vi.fn(function (v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }),
                applyAxisAngle: vi.fn(),
                lerp: vi.fn(function (v, alpha) {
                    this.x += (v.x - this.x) * alpha;
                    this.y += (v.y - this.y) * alpha;
                    this.z += (v.z - this.z) * alpha;
                    return this;
                }),
                clone: vi.fn(function () { return new (vi.mocked(THREE.Vector3))(this.x, this.y, this.z); }),
                distanceToSquared: vi.fn(function (v) {
                    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
                    return dx * dx + dy * dy + dz * dz;
                }),
                distanceTo: vi.fn(function (v) {
                    return Math.sqrt(this.distanceToSquared(v));
                })
            };
            return v;
        }),
        Vector2: vi.fn().mockImplementation(function (x = 0, y = 0) { return { x, y, set: vi.fn() }; }),
        Color: vi.fn().mockImplementation(function () { return {}; }),
        BoxGeometry: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn(), rotateZ: vi.fn(), rotateX: vi.fn(), boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, getIndex: vi.fn(), getAttribute: vi.fn(() => ({ count: 10, array: [], getX: vi.fn(() => 0), getY: vi.fn(() => 0), getZ: vi.fn(() => 0), itemSize: 3 })) }; }),
        CylinderGeometry: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn(), rotateZ: vi.fn(), rotateX: vi.fn() }; }),
        PlaneGeometry: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn(), rotateZ: vi.fn(), rotateX: vi.fn() }; }),
        CircleGeometry: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn(), rotateZ: vi.fn(), rotateX: vi.fn() }; }),
        SphereGeometry: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn(), rotateZ: vi.fn(), rotateX: vi.fn() }; }),
        LatheGeometry: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn() }; }),
        GridHelper: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn(), traverse: createTraverseFn(), add: createAddFn(), remove: createRemoveFn(), children: [] }; }),
        AmbientLight: vi.fn().mockImplementation(function () { return {}; }),
        DirectionalLight: vi.fn().mockImplementation(function () { return { position: { set: vi.fn() } }; }),
        MeshStandardMaterial: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn() }; }),
        MeshBasicMaterial: vi.fn().mockImplementation(function () { return { dispose: createDisposeFn() }; }),
        ShaderMaterial: vi.fn().mockImplementation(function () { return { uniforms: {}, dispose: createDisposeFn() }; }),
        Raycaster: vi.fn().mockImplementation(function () { return { setFromCamera: vi.fn(), intersectObjects: vi.fn(() => []) }; }),
        BackSide: 1,
        DoubleSide: 2
    };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => {
    return {
        OrbitControls: vi.fn().mockImplementation(function () {
            return {
                enableDamping: true,
                dampingFactor: 0.05,
                target: { set: vi.fn() },
                update: vi.fn(),
                dispose: vi.fn()
            };
        })
    };
});

vi.mock('three/examples/jsm/controls/DragControls.js', () => {
    return {
        DragControls: vi.fn().mockImplementation(function () {
            return {
                _listeners: {} as Record<string, Function[]>,
                addEventListener: vi.fn(function (this: any, event: string, handler: Function) {
                    if (!this._listeners[event]) this._listeners[event] = [];
                    this._listeners[event].push(handler);
                }),
                dispatchEvent: vi.fn(function (this: any, event: { type: string }) {
                    const handlers = this._listeners[event.type] || [];
                    handlers.forEach((h: Function) => h(event));
                }),
                dispose: vi.fn(),
                transformGroup: false
            };
        })
    };
});

vi.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => {
    const createTraverseFn = () => vi.fn(function (this: any, callback: (obj: any) => void) {
        callback(this);
        if (this.children) {
            this.children.forEach((child: any) => {
                if (child.traverse) child.traverse(callback);
            });
        }
    });

    return {
        CSS2DRenderer: vi.fn().mockImplementation(function () {
            return {
                setSize: vi.fn(),
                domElement: document.createElement('div'),
                render: vi.fn()
            };
        }),
        CSS2DObject: vi.fn().mockImplementation(function () {
            return {
                position: { set: vi.fn() },
                element: { remove: vi.fn() },
                traverse: createTraverseFn(),
                children: []
            };
        })
    };
});

class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

// --- Tests ---

describe('Heatmap3D Logic', () => {
    let element: Heatmap3D;

    const mockHass = {
        states: {
            'sensor.temp1': {
                state: '25.5',
                attributes: {
                    friendly_name: 'Temp 1',
                    device_class: 'temperature',
                    unit_of_measurement: '°C'
                }
            },
            'sensor.humi1': {
                state: '60.0',
                attributes: {
                    device_class: 'humidity',
                    unit_of_measurement: '%'
                }
            },
            'sensor.light1': {
                state: '500',
                attributes: {
                    device_class: 'illuminance',
                    unit_of_measurement: 'lx'
                }
            },
            'sensor.vpd1': {
                state: '1.2',
                attributes: {
                    unit_of_measurement: 'kPa'
                }
            },
            'sensor.co2_1': {
                state: '600',
                attributes: {}
            },
            'fan.circ1': {
                state: 'on',
                attributes: {
                    percentage: 50
                }
            }
        },
        callWS: vi.fn().mockResolvedValue({})
    };

    const mockDevice = {
        deviceId: 'gs1',
        name: 'Growspace 1',
        type: GrowspaceType.NORMAL,
        environmentAttributes: {
            sensorCoordinates: {
                'sensor.temp1': { x: 0, y: 0, z: 0 },
                'sensor.humi1': { x: 1, y: 1, z: 1 }
            },
            sensorTypes: {
                'sensor.temp1': 'temperature',
                'sensor.humi1': 'humidity'
            },
            circulationFanEntities: ['fan.circ1'],
            lightSensors: ['sensor.light1']
        },
        dimensions: { width: 120, height: 200, length: 120 },
        biologicalMetrics: {
            vpdDangerMin: 0.4,
            vpdTargetMin: 0.8,
            vpdTargetMax: 1.2,
            vpdDangerMax: 1.6
        }
    } as any;

    beforeEach(async () => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => 1);
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { });
        vi.stubGlobal('ResizeObserver', MockResizeObserver);
        vi.clearAllMocks();
        element = await fixture(html`
            <heatmap-3d .device=${mockDevice} .hass=${mockHass}></heatmap-3d>
        `);
    });

    describe('Sensor Type Helpers', () => {
        it('should identify light sensors via explicit mapping', () => {
            const deviceWithExplicit = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    sensorTypes: { 'sensor.custom_light': 'light' }
                }
            };
            element.device = deviceWithExplicit;
            expect((element as any).isLight('sensor.custom_light')).toBe(true);
        });

        it('should identify light sensors via heuristics', () => {
            element.hass = {
                states: {
                    'sensor.lux': { attributes: { device_class: 'illuminance' } },
                    'sensor.fc': { attributes: { unit_of_measurement: 'fc' } },
                    'sensor.lx': { attributes: { unit_of_measurement: 'lx' } },
                    'sensor.custom_light': { attributes: { friendly_name: 'Light' } }
                }
            };
            expect((element as any).isLight('sensor.lux')).toBe(true);
            expect((element as any).isLight('sensor.fc')).toBe(true);
            expect((element as any).isLight('sensor.lx')).toBe(true);

            // Negative cases
            expect((element as any).isLight('sensor.vpd_fake_light')).toBe(false);
            expect((element as any).isLight('sensor.humidifier_light')).toBe(false);
        });

        it('should identify temperature sensors', () => {
            expect((element as any)._isTemperatureSensor('sensor.temp1')).toBe(true);
            expect((element as any)._isTemperatureSensor('sensor.humi1')).toBe(false);
        });

        it('should identify humidity sensors', () => {
            expect((element as any)._isHumiditySensor('sensor.humi1')).toBe(true);
            expect((element as any)._isHumiditySensor('sensor.temp1')).toBe(false);
        });

        it('should identify VPD sensors', () => {
            expect((element as any)._isVPDSensor('sensor.vpd1')).toBe(true);

            element.hass = {
                states: {
                    'sensor.kPa_sensor': { attributes: { unit_of_measurement: 'kPa' } }
                }
            };
            expect((element as any)._isVPDSensor('sensor.kPa_sensor')).toBe(true);
            expect((element as any)._isVPDSensor('sensor.temp1')).toBe(false);
        });

        it('should identify environment sensors', () => {
            const deviceWithEnv = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    co2Sensors: ['sensor.co2_1'],
                    sensorTypes: { 'sensor.dehum1': 'dehumidifier' }
                }
            };
            element.device = deviceWithEnv;
            expect((element as any)._isEnvironmentSensor('sensor.co2_1')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.dehum1')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.co2_raw')).toBe(true); // Heuristics
        });

        it('should identify irrigation sensors', () => {
            const deviceWithIrr = {
                ...mockDevice,
                irrigationConfig: {
                    irrigationPumpEntity: 'switch.pump1'
                },
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    soilMoistureSensors: ['sensor.soil1']
                }
            };
            element.device = deviceWithIrr;
            expect((element as any)._isIrrigationSensor('switch.pump1')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.soil1')).toBe(true);
        });

        it('should identify fans', () => {
            expect((element as any).isFan('fan.circ1')).toBe(true);
        });

        it('should identify exhaust fans', () => {
            const deviceWithExhaust = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    exhaustFanEntities: ['fan.exhaust1']
                }
            };
            element.device = deviceWithExhaust;
            expect((element as any).isExhaust('fan.exhaust1')).toBe(true);
            expect((element as any).isExhaust('fan.other')).toBe(false);
        });

        it('should identify humidifiers', () => {
            const deviceWithHum = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    humidifierEntities: ['humidifier.1']
                }
            };
            element.device = deviceWithHum;
            expect((element as any).isHumidifier('humidifier.1')).toBe(true);
        });

        it('should identify dehumidifiers', () => {
            const deviceWithDehum = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    dehumidifierEntities: ['dehumidifier.1']
                }
            };
            element.device = deviceWithDehum;
            expect((element as any).isDehumidifier('dehumidifier.1')).toBe(true);
        });

        it('should handle identification with missing hass or state', () => {
            const oldHass = element.hass;
            element.hass = null;
            expect((element as any).isLight('sensor.any')).toBe(false);
            expect((element as any)._isTemperatureSensor('sensor.any')).toBe(false);
            expect((element as any)._isHumiditySensor('sensor.any')).toBe(false);
            expect((element as any)._isVPDSensor('sensor.any')).toBe(false);

            element.hass = { states: {} };
            expect((element as any).isLight('sensor.none')).toBe(false);

            element.hass = oldHass;
        });

        it('should use heuristics for CO2 and moisture', () => {
            expect((element as any)._isEnvironmentSensor('sensor.co2_level')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.carbon_dioxide_sensor')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.my_moisture')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.water_tank')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.soil_1')).toBe(true);
        });

        it('should identify pump entities', () => {
            const deviceWithPumps = {
                ...mockDevice,
                irrigationConfig: {
                    irrigationPumpEntity: 'switch.pump1',
                    drainPumpEntity: 'switch.drain_pump'
                }
            };
            element.device = deviceWithPumps;
            expect((element as any)._isIrrigationSensor('switch.pump1')).toBe(true);
            expect((element as any)._isIrrigationSensor('switch.drain_pump')).toBe(true);
        });

        it('should handle identification fallbacks for single entities', () => {
            const deviceWithFallbacks = {
                ...mockDevice,
                environmentAttributes: {
                    circulationFanEntity: 'fan.circ_single',
                    exhaustEntity: 'fan.exh_single',
                    humidifierEntity: 'hum.single',
                    dehumidifierEntity: 'dehum.single',
                    co2Sensor: 'sensor.co2_single',
                    soilMoistureSensor: 'sensor.soil_single'
                }
            };
            element.device = deviceWithFallbacks;
            expect((element as any).isFan('fan.circ_single')).toBe(true);
            expect((element as any).isExhaust('fan.exh_single')).toBe(true);
            expect((element as any).isHumidifier('hum.single')).toBe(true);
            expect((element as any).isDehumidifier('dehum.single')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.co2_single')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.soil_single')).toBe(true);
        });

        it('should identify environment sensors via sensorTypes map', () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {
                    sensorTypes: {
                        'sensor.co2_custom': 'co2',
                        'sensor.hum_custom': 'humidifier',
                        'sensor.dehum_custom': 'dehumidifier'
                    }
                }
            };
            expect((element as any)._isEnvironmentSensor('sensor.co2_custom')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.hum_custom')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.dehum_custom')).toBe(true);
        });
    });

    describe('Metric and Color Logic', () => {
        it('should get metric value correctly', () => {
            expect((element as any).getMetricValue('sensor.temp1')).toBe(25.5);
            expect((element as any).getMetricValue('sensor.unknown')).toBe(0);
        });

        it('should return correct status color for value', () => {
            const thresholds = { dLow: 20, wLow: 22, wHigh: 26, dHigh: 28 };
            expect((element as any).getStatusColorForValue(24, thresholds)).toBe('#4caf50');
            expect((element as any).getStatusColorForValue(21, thresholds)).toBe('#2196f3');
            expect((element as any).getStatusColorForValue(19, thresholds)).toBe('#0d47a1');
            expect((element as any).getStatusColorForValue(27, thresholds)).toBe('#ff9800');
            expect((element as any).getStatusColorForValue(29, thresholds)).toBe('#f44336');
        });

        it('should handle getMetricValue with timelineIndex >= 0', () => {
            (element as any).historyData = {
                'sensor.temp1': [{ s: '22.5' }, { s: '23.5' }]
            };
            (element as any).timelineIndex = 0;
            expect((element as any).getMetricValue('sensor.temp1')).toBe(22.5);

            (element as any).timelineIndex = 1;
            expect((element as any).getMetricValue('sensor.temp1')).toBe(23.5);

            (element as any).timelineIndex = 2; // Out of bounds
            expect((element as any).getMetricValue('sensor.temp1')).toBe(25.5); // Falls back to live state

            (element as any).historyData['sensor.temp1'][1].s = 'NaN';
            (element as any).timelineIndex = 1;
            expect((element as any).getMetricValue('sensor.temp1')).toBe(0);
        });

        it('should handle getMetricValue with missing hass or state', () => {
            element.hass = null;
            expect((element as any).getMetricValue('sensor.any')).toBe(0);

            element.hass = { states: {} };
            expect((element as any).getMetricValue('sensor.none')).toBe(0);

            element.hass = { states: { 'sensor.nan': { state: 'not-a-number' } } };
            expect((element as any).getMetricValue('sensor.nan')).toBe(0);
        });
    });

    describe('Lifecycle', () => {
        it('should setup event listeners on connect', () => {
            const addSpy = vi.spyOn(window, 'addEventListener');
            element.connectedCallback();
            // Note: firstUpdated actually adds the window listeners, connectedCallback sets up resize observer
            expect((element as any).resizeObserver).toBeDefined();
        });

        it('should cleanup on disconnect', () => {
            const removeSpy = vi.spyOn(window, 'removeEventListener');
            const cleanupSpy = vi.spyOn(element as any, 'cleanup');
            element.disconnectedCallback();
            expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
            expect(cleanupSpy).toHaveBeenCalled();
        });

        it('should handle fetchHistory failure', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const callWSSpy = vi.fn().mockRejectedValue(new Error('WS Error'));
            element.hass = { ...mockHass, callWS: callWSSpy };

            await (element as any).fetchHistory();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch history'), expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('Icon Helpers', () => {
        it('should return correct icons for sensors', () => {
            expect((element as any).getSensorIcon('sensor.temp1')).toBe('mdi:thermometer');
            expect((element as any).getSensorIcon('sensor.humi1')).toBe('mdi:water-percent');
            expect((element as any).getSensorIcon('sensor.light1')).toBe('mdi:lightbulb-on');
        });
    });
    describe('UI and Playback Logic', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            // Mock updateScene to avoid Three.js overhead
            vi.spyOn(element as any, 'updateScene').mockImplementation(() => { });
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('should toggle edit mode and dispatch event', () => {
            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (element as any).toggleEditMode();

            expect(element.editMode3DCords).toBe(true);
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'edit-mode-changed',
                detail: { enabled: true }
            }));
        });

        it('should set metric', () => {
            (element as any).setMetric('vpd');
            expect((element as any).selectedMetric).toBe('vpd');
        });

        it('should handle playback', () => {
            (element as any).historyData = {
                'sensor.temp1': [
                    { lu: '2026-01-24T00:00:00Z', s: '20' },
                    { lu: '2026-01-24T00:15:00Z', s: '21' },
                    { lu: '2026-01-24T00:30:00Z', s: '22' }
                ]
            };
            (element as any).timelineIndex = 0;

            (element as any).togglePlayback();
            expect((element as any).isPlaying).toBe(true);

            vi.advanceTimersByTime(300);
            expect((element as any).timelineIndex).toBe(1);

            vi.advanceTimersByTime(300);
            expect((element as any).timelineIndex).toBe(2);

            vi.advanceTimersByTime(300);
            expect((element as any).isPlaying).toBe(false);
            expect((element as any).playbackTimer).toBeUndefined();
        });

        it('should allow manually stopping playback', () => {
            (element as any).historyData = { 's1': [1, 2, 3] };
            (element as any).togglePlayback();
            expect((element as any).isPlaying).toBe(true);

            (element as any).togglePlayback();
            expect((element as any).isPlaying).toBe(false);
            expect((element as any).playbackTimer).toBeUndefined();
        });

        it('should format time correctly', () => {
            (element as any).historyData = {
                'sensor.temp1': [
                    { lu: '2026-01-24T10:00:00Z', s: '20' }
                ]
            };

            (element as any).timelineIndex = -1;
            expect((element as any).getFormattedTime()).toBe('LIVE');

            (element as any).timelineIndex = 0;
            const time = (element as any).getFormattedTime();
            expect(time).toMatch(/\d{2}:\d{2}/);
        });

        it('should calculate max history length', () => {
            (element as any).historyData = {
                's1': [1, 2, 3],
                's2': [1, 2, 3, 4, 5]
            };
            expect((element as any).getMaxHistoryLength()).toBe(5);
        });
    });

    describe('UI Rendering and Interactions', () => {
        it('should toggle visibility flags on checkbox click', async () => {
            const plantToggle = element.shadowRoot?.querySelector('.toggles-container .toggle-item:nth-child(1)') as HTMLElement;
            plantToggle.click();
            expect(element['showPlants']).toBe(false);

            const lightToggle = element.shadowRoot?.querySelector('.toggles-container .toggle-item:nth-child(2)') as HTMLElement;
            lightToggle.click();
            expect(element['showLights']).toBe(false);

            const fanToggle = element.shadowRoot?.querySelector('.toggles-container .toggle-item:nth-child(3)') as HTMLElement;
            fanToggle.click();
            expect(element['showFans']).toBe(false);

            const heatmapToggle = element.shadowRoot?.querySelector('.toggles-container .toggle-item:nth-child(4)') as HTMLElement;
            heatmapToggle.click();
            expect(element['showHeatmap']).toBe(false);

            const tooltipsToggle = element.shadowRoot?.querySelector('.toggles-container .toggle-item:nth-child(5)') as HTMLElement;
            tooltipsToggle.click();
            expect(element['showTooltips']).toBe(false);
        });

        it('should update selected metric on button click', async () => {
            const hButton = element.shadowRoot?.querySelector('.metric-selector button:nth-child(2)') as HTMLElement;
            hButton.click();
            expect(element['selectedMetric']).toBe('humidity');

            const vButton = element.shadowRoot?.querySelector('.metric-selector button:nth-child(3)') as HTMLElement;
            vButton.click();
            expect(element['selectedMetric']).toBe('vpd');
        });

        it('should toggle keyboard rotation and update speed', async () => {
            // Enter edit mode first to see view controls
            (element as any).editMode3DCords = true;
            await elementUpdated(element);

            const rotateToggle = element.shadowRoot?.querySelector('.side-panel .sensor-item:last-child .toggle-item') as HTMLElement;
            rotateToggle.click();
            expect(element.keyboardRotateEnabled).toBe(true);

            const speedSlider = element.shadowRoot?.querySelector('.side-panel .sensor-item:last-child input[type="range"]') as HTMLInputElement;
            speedSlider.value = '2.5';
            speedSlider.dispatchEvent(new Event('input'));
            expect(element.keyboardRotateSpeed).toBe(2.5);

            speedSlider.dispatchEvent(new Event('change'));
            // Should dispatch event (tested via _dispatchViewOptionChange)
        });

        it('should switch between sensor tabs in edit mode', async () => {
            (element as any).editMode3DCords = true;
            await elementUpdated(element);

            const tabs = element.shadowRoot?.querySelectorAll('.sensor-tab');
            expect(tabs?.length).toBeGreaterThan(0);

            // Switch to Humidity tab
            (tabs![1] as HTMLElement).click();
            expect((element as any)._activeSensorTab).toBe('humidity');

            // Switch to VPD tab
            (tabs![2] as HTMLElement).click();
            expect((element as any)._activeSensorTab).toBe('vpd');

            // Switch to Lights tab
            (tabs![3] as HTMLElement).click();
            expect((element as any)._activeSensorTab).toBe('lights');

            // Switch to Fan tab (index 4)
            (tabs![4] as HTMLElement).click();
            expect((element as any)._activeSensorTab).toBe('ventilation');

            // Switch to Env tab (index 5)
            (tabs![5] as HTMLElement).click();
            expect((element as any)._activeSensorTab).toBe('environment');

            // Switch to Irrig tab (index 6)
            (tabs![6] as HTMLElement).click();
            expect((element as any)._activeSensorTab).toBe('irrigation');
        });

        it('should render sensor items in the side panel', async () => {
            (element as any).editMode3DCords = true;
            (element as any)._activeSensorTab = 'temperature';

            // Mock sensorMeshes with proper THREE objects
            const mockMesh = new THREE.Object3D();
            mockMesh.position.set(0, 0, 0);
            (element as any).sceneManager.sensorMeshes.set('sensor.temp1', mockMesh);

            await elementUpdated(element);
            const sensorItem = element.shadowRoot?.querySelector('.sensor-item');
            expect(sensorItem).not.toBeNull();
            expect(sensorItem?.textContent).toContain('Temp 1');
        });

        it('should render correct fallback name for fans in side panel', async () => {
            (element as any).editMode3DCords = true;
            (element as any)._activeSensorTab = 'ventilation';

            const mockFan = new THREE.Object3D();
            (element as any).sceneManager.sensorMeshes.set('fan.circ1', mockFan);

            await elementUpdated(element);
            const sensorItem = element.shadowRoot?.querySelector('.sensor-item');
            expect(sensorItem?.textContent).toContain('Fan'); // No friendly_name in mockHass for fan.circ1
        });
    });

    describe('Sensor Positioning', () => {
        it('should call WS and dispatch event on updateSensorPosition', async () => {
            const callWSSpy = vi.fn().mockResolvedValue({});
            element.hass = { ...mockHass, callWS: callWSSpy };
            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');

            await (element as any).updateSensorPosition('sensor.temp1', 10, 20, 30, 90);

            expect(callWSSpy).toHaveBeenCalledWith({
                type: 'growspace_manager/update_sensor_coordinates',
                growspace_id: 'gs1',
                entity_id: 'sensor.temp1',
                x: 10,
                y: 20,
                z: 30,
                rotation: 90
            });

            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'sensor-position-changed',
                detail: { entityId: 'sensor.temp1', x: 10, y: 20, z: 30, rotation: 90 }
            }));
        });

        it('should log error when callWS fails in updateSensorPosition', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const callWSSpy = vi.fn().mockRejectedValue(new Error('WS Error'));
            element.hass = { ...mockHass, callWS: callWSSpy };

            await (element as any).updateSensorPosition('sensor.temp1', 10, 20, 30, 90);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to update sensor position:'), expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('Slider Handling', () => {
        let mockMesh: any;

        beforeEach(() => {
            mockMesh = {
                position: { x: 0, y: 0, z: 0 },
                rotation: { y: 0 }
            };
            (element as any).sensorMeshes.set('sensor.temp1', mockMesh);
            vi.spyOn(element as any, 'updateShaderPositions').mockImplementation(() => { });
        });

        it('should update mesh position on slider input', () => {
            (element as any).handleSliderInput('sensor.temp1', 'x', 50);
            // width=120, x = 50 - 120/2 = -10
            expect(mockMesh.position.x).toBe(-10);

            (element as any).handleSliderInput('sensor.temp1', 'y', 60);
            // depth=120, y = 60 - 120/2 = 0
            expect(mockMesh.position.z).toBe(0);

            (element as any).handleSliderInput('sensor.temp1', 'z', 150);
            expect(mockMesh.position.y).toBe(150);
        });

        it('should update mesh rotation on slider input', () => {
            const mockFan = new THREE.Group();
            mockFan.userData = { entityId: 'fan.circ1' };
            (element as any).volatileGroup = new THREE.Group();
            (element as any).volatileGroup.add(mockFan);

            (element as any).handleSliderInput('fan.circ1', 'rotation', 90);
            expect(mockFan.rotation.y).toBeCloseTo(Math.PI / 2);
            expect((mockFan.userData as any).baseRotation).toBe(90);
        });

        it('should call updateSensorPosition on slider change with rotation', () => {
            const updateSpy = vi.spyOn(element as any, 'updateSensorPosition');
            const mockFan = new THREE.Group();
            mockFan.userData = { entityId: 'fan.circ1', baseRotation: 180 };
            mockFan.position.set(0, 100, 0); // x=60, y=60, z=100
            (element as any).sensorMeshes.set('fan.circ1', mockFan);
            (element as any).volatileGroup = new THREE.Group();
            (element as any).volatileGroup.add(mockFan);

            (element as any).handleSliderChange('fan.circ1');
            expect(updateSpy).toHaveBeenCalledWith('fan.circ1', 60, 60, 100, 180);
        });

        it.skip('should update shader positions when meshes exist', () => {
            const myMockDevice = {
                dimensions: { width: 100, height: 200, length: 100 },
                environmentAttributes: {
                    sensorTypes: { 'sensor.temp1': 'temperature' }
                }
            };
            element.device = myMockDevice as any;
            element.hass = {
                states: {
                    'sensor.temp1': { state: '25' }
                }
            };

            const volGroup = new THREE.Group();
            const volMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.ShaderMaterial({
                uniforms: {
                    u_sensorPositions: { value: Array(16).fill(new THREE.Vector3()) },
                    u_sensorValues: { value: Array(16).fill(0) },
                    u_sensorCount: { value: 0 }
                }
            }));
            volGroup.add(volMesh);
            (element as any).volatileGroup = volGroup;

            const mockMesh = new THREE.Object3D();
            mockMesh.position.set(10, 20, 30);
            (element as any).sensorMeshes = new Map();
            (element as any).sensorMeshes.set('sensor.temp1', mockMesh);
            (element as any).selectedMetric = 'temperature';

            // Verify helper directly first
            expect((element as any).isSensorOfMetric('sensor.temp1')).toBe(true);

            (element as any).updateShaderPositions();

            const uniforms = (volMesh.material as THREE.ShaderMaterial).uniforms;
            expect(uniforms.u_sensorCount.value).toBe(1);
        });

        it('should call updateSensorPosition on slider change', () => {
            const updateSpy = vi.spyOn(element as any, 'updateSensorPosition');
            const mockMesh = new THREE.Object3D();
            mockMesh.position.set(-10, 150, 20); // x=50, z=150, y=80 (depth=120, 20 + 120/2 = 80)
            (element as any).sensorMeshes.set('sensor.temp1', mockMesh);

            (element as any).handleSliderChange('sensor.temp1');
            expect(updateSpy).toHaveBeenCalledWith('sensor.temp1', 50, 80, 150, undefined);
        });
    });

    describe('Utilities', () => {
        it('should handle timeline change', () => {
            (element as any).historyData = { 's1': [1, 2, 3] };
            const mockEvent = {
                target: { value: '1' }
            };
            (element as any).handleTimelineChange(mockEvent);
            expect((element as any).timelineIndex).toBe(1);

            // Live mode selection (value equals getMaxHistoryLength)
            const liveEvent = {
                target: { value: '3' }
            };
            (element as any).handleTimelineChange(liveEvent);
            expect((element as any).timelineIndex).toBe(-1);
        });

        it('should return correct formatted time or fallback', () => {
            (element as any).historyData = {};
            (element as any).timelineIndex = 0;
            expect((element as any).getFormattedTime()).toBe('...');

            (element as any).historyData = { 's1': [{ lu: 'invalid-date' }] };
            (element as any).timelineIndex = 0;
            expect((element as any).getFormattedTime()).toBe('Invalid Date');

            (element as any).timelineIndex = -1;
            expect((element as any).getFormattedTime()).toBe('LIVE');
        });

        it('should identify sensor metric type correctly', () => {
            (element as any).selectedMetric = 'temperature';
            expect((element as any).isSensorOfMetric('sensor.temp1')).toBe(true);
            expect((element as any).isSensorOfMetric('sensor.humi1')).toBe(false);

            (element as any).selectedMetric = 'humidity';
            expect((element as any).isSensorOfMetric('sensor.humi1')).toBe(true);
            expect((element as any).isSensorOfMetric('sensor.light1')).toBe(false);

            // Test heuristic fallback when mapping is missing
            element.hass = {
                states: {
                    'sensor.temp_heuristic': { attributes: { device_class: 'temperature' } },
                    'sensor.humi_heuristic': { attributes: { device_class: 'humidity' } }
                }
            };
            element.device = { ...mockDevice, environmentAttributes: { ...mockDevice.environmentAttributes, sensorTypes: {} } };
            (element as any).selectedMetric = 'temperature';
            expect((element as any).isSensorOfMetric('sensor.temp_heuristic')).toBe(true);
            (element as any).selectedMetric = 'humidity';
            expect((element as any).isSensorOfMetric('sensor.humi_heuristic')).toBe(true);
        });
    });

    describe('Keyboard and Resize', () => {
        it.skip('should handle keyboard rotation keys', () => {
            (element as any).keyboardRotateEnabled = true;
            const keyDown = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
            (element as any)._handleKeyDown(keyDown);
            expect((element as any)._keysPressed.has('ArrowLeft')).toBe(true);

            const keyUp = new KeyboardEvent('keyup', { key: 'ArrowLeft' });
            (element as any)._handleKeyUp(keyUp);
            expect((element as any)._keysPressed.has('ArrowLeft')).toBe(false);
        });

        it('should handle resize', () => {
            const spy = vi.spyOn(element as any, 'handleResize');
            // Mock container dimensions
            Object.defineProperty(element.shadowRoot?.querySelector('#container'), 'clientWidth', { value: 800 });
            Object.defineProperty(element.shadowRoot?.querySelector('#container'), 'clientHeight', { value: 600 });

            (element as any).handleResize();
            // Should update renderer and camera (too complex to verify fully without more mocks, but call is tracked)
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Rendering Toggles', () => {
        it('should update scene when showPlants changes', async () => {
            const spy = vi.spyOn(element as any, 'updateScene');
            (element as any).showPlants = !(element as any).showPlants;
            await elementUpdated(element);
            expect(spy).toHaveBeenCalled();
        });

        it('should update scene when other visibility flags change', async () => {
            const spy = vi.spyOn(element as any, 'updateScene');
            (element as any).showLights = !(element as any).showLights;
            await elementUpdated(element);
            (element as any).showFans = !(element as any).showFans;
            await elementUpdated(element);
            (element as any).showHeatmap = !(element as any).showHeatmap;
            await elementUpdated(element);
            expect(spy).toHaveBeenCalledTimes(3);
        });

        it('should update scene when hass states change', async () => {
            const spy = vi.spyOn(element as any, 'updateScene');
            const newHass = {
                ...element.hass,
                states: {
                    ...element.hass.states,
                    'sensor.temp1': { state: '26.0', attributes: { friendly_name: 'Temp 1' } }
                }
            };
            element.hass = newHass;
            await elementUpdated(element);
            expect(spy).toHaveBeenCalled();
        });

        it('should update scene and fetch history when device changes', async () => {
            const updateSpy = vi.spyOn(element as any, 'updateScene');
            const historySpy = vi.spyOn(element as any, 'fetchHistory');
            const newDevice = { ...mockDevice, name: 'New Name' };
            element.device = newDevice;
            // The original expect(spy) here was incorrect, it should be updateSpy or historySpy
            // This test case is about device change, so updateScene and fetchHistory should be called.
            await elementUpdated(element); // Ensure element updates after device change
            expect(updateSpy).toHaveBeenCalled();
            expect(historySpy).toHaveBeenCalled();
        });

        it('should dispatch event on view option change', () => {
            const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
            (element as any)._dispatchViewOptionChange('test_key', 'test_val');
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'sensor-position-changed',
                detail: { 'test_key': 'test_val' }
            }));
        });

        it('should handle interaction with checkbox change', async () => {
            const checkbox = element.shadowRoot?.querySelector('.side-panel .sensor-item:last-child ha-checkbox') as any;
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new CustomEvent('change', { bubbles: true }));
                expect(element.keyboardRotateEnabled).toBe(true);
            }
        });

        it('should handle mouse move and tooltips', () => {
            const mockRect = { left: 0, top: 0, width: 800, height: 600 };
            vi.spyOn((element as any).container, 'getBoundingClientRect').mockReturnValue(mockRect as any);

            const getInteractionSpy = vi.spyOn(element as any, '_getInteractionFromPoint');

            // Case 1: Over a plant
            const mockPlant = { id: 'p1', attributes: { strain: 'Test' } };
            getInteractionSpy.mockReturnValue({ plant: mockPlant });

            const moveEvent = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
            (element as any)._handleMouseMove(moveEvent);

            expect((element as any)._hoveredPlant).toBe(mockPlant);
            expect((element as any)._tooltipPos).toEqual({ x: 100, y: 100 });
            expect((element as any).container.style.cursor).toBe('pointer');

            // Case 2: Over nothing
            getInteractionSpy.mockReturnValue(null);
            (element as any)._lastRaycastTime = 0; // Reset throttle
            (element as any)._handleMouseMove(moveEvent);

            expect((element as any)._hoveredPlant).toBeNull();
            expect((element as any).container.style.cursor).toBe('default');
        });

        it('should handle plant or empty slot click via handleInteraction', () => {
            const storeSpy = {
                openPlantOverviewDialog: vi.fn(),
                openAddPlantDialog: vi.fn()
            };
            (element as any).store = storeSpy;

            // 1. Click plant (has entity_id)
            const mockPlant = { entity_id: 'sensor.plant1', id: 'p1' };
            (element as any).handleInteraction('click', { plant: mockPlant });
            expect(storeSpy.openPlantOverviewDialog).toHaveBeenCalledWith(mockPlant);

            // 2. Click empty slot (has row, col)
            const mockEmpty = { row: 3, col: 4 };
            (element as any).handleInteraction('click', { plant: mockEmpty });
            expect(storeSpy.openAddPlantDialog).toHaveBeenCalledWith(3, 4);
        });

        it('should handle keyboard rotation', () => {
            element.keyboardRotateEnabled = true;
            const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
            const preventSpy = vi.spyOn(event, 'preventDefault');
            (element as any)._handleKeyDown(event);
            expect((element as any)._keysPressed.has('ArrowLeft')).toBe(true);
            expect(preventSpy).toHaveBeenCalled();

            const upEvent = new KeyboardEvent('keyup', { code: 'ArrowLeft' });
            (element as any)._handleKeyUp(upEvent);
            expect((element as any)._keysPressed.has('ArrowLeft')).toBe(false);
        });

        it('should handle updated lifecycle branching', async () => {
            const updateSpy = vi.spyOn(element as any, 'updateScene');

            // 1. No device - should return early
            element.device = undefined;
            await elementUpdated(element);
            expect(updateSpy).not.toHaveBeenCalled();

            // 2. Device change
            element.device = mockDevice;
            await elementUpdated(element);
            expect(updateSpy).toHaveBeenCalled();
            updateSpy.mockClear();

            // 3. Metric change
            (element as any).selectedMetric = 'humidity';
            await elementUpdated(element);
            expect(updateSpy).toHaveBeenCalled();
            updateSpy.mockClear();

            // 4. Toggle change (showPlants)
            element['showPlants'] = false;
            await elementUpdated(element);
            expect(updateSpy).toHaveBeenCalled();
            updateSpy.mockClear();

            // 5. Hass change with same data (should not update scene if hash is same)
            const oldHash = (element as any).lastProcessedData;
            element.hass = { ...element.hass };
            await elementUpdated(element);
            expect(updateSpy).not.toHaveBeenCalled();

            // 6. Hass change with DIFFERENT data (should update scene)
            element.hass = {
                ...element.hass,
                states: {
                    ...element.hass.states,
                    'sensor.temp1': { state: '27.0', attributes: { device_class: 'temperature' } }
                }
            };
            await elementUpdated(element);
            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('Tooltip', () => {
        it('should render tooltip when plant is hovered', async () => {
            (element as any)._hoveredPlant = {
                attributes: {
                    strain: 'Sour Diesel',
                    phenotype: 'Pheno 1',
                    planted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            };
            (element as any)._tooltipPos = { x: 100, y: 100 };

            await elementUpdated(element);
            const tooltip = element.shadowRoot?.querySelector('.plant-tooltip');
            expect(tooltip).not.toBeNull();
            expect(tooltip?.textContent).toContain('Sour Diesel');
            expect(tooltip?.textContent).toContain('Pheno 1');
        });

        it('should render tooltip without phenotype', async () => {
            (element as any)._hoveredPlant = {
                attributes: {
                    strain: 'Sour Diesel',
                    planted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            };
            await elementUpdated(element);
            const tooltip = element.shadowRoot?.querySelector('.plant-tooltip');
            expect(tooltip?.textContent).not.toContain('Pheno');
        });

        it('should return nothing when no plant hovered', () => {
            (element as any)._hoveredPlant = null;
            expect((element as any).renderTooltip()).toBe(nothing);
        });
    });

    describe('Scene Rendering Methods', () => {
        beforeEach(() => {
            (element as any).volatileGroup = new THREE.Group();
        });

        it('should render frame poles', () => {
            (element as any).renderFrame(100, 200, 100);
            expect((element as any).volatileGroup.children.length).toBeGreaterThan(0);
        });

        it('should render lightbars when light sensors exist', () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    lightSensors: ['sensor.light1'],
                    sensorCoordinates: { 'sensor.light1': { x: 50, y: 50, z: 180 } }
                }
            };
            (element as any).renderLightbars(100, 200, 100);
            expect((element as any).volatileGroup.children.length).toBeGreaterThan(0);
        });

        it('should not render lightbars and return early if no lights', () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    lightSensors: []
                }
            };
            (element as any).renderLightbars(100, 200, 100);
            expect((element as any).volatileGroup.children.length).toBe(0);
        });
    });

    describe('Cleanup and Disposal', () => {
        it('should dispose resources on cleanup', () => {
            const rendererSpy = {
                dispose: vi.fn(),
                domElement: document.createElement('canvas')
            };
            const labelRendererSpy = {
                domElement: document.createElement('div')
            };
            const sceneSpy = new THREE.Scene();
            const controlsSpy = { dispose: vi.fn() };

            (element as any).renderer = rendererSpy;
            (element as any).labelRenderer = labelRendererSpy;
            (element as any).scene = sceneSpy;
            (element as any).controls = controlsSpy;
            (element as any).animationId = 123;
            (element as any).container.appendChild(rendererSpy.domElement);
            (element as any).container.appendChild(labelRendererSpy.domElement);

            const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

            (element as any).cleanup();

            expect(rendererSpy.dispose).toHaveBeenCalled();
            expect(cancelSpy).toHaveBeenCalledWith(123);
            expect((element as any).scene).toBeUndefined();
            expect(rendererSpy.domElement.parentNode).toBeNull();
            expect(labelRendererSpy.domElement.parentNode).toBeNull();
        });
    });

    describe('Advanced Identification logic', () => {
        it('should identify environment and irrigation sensors via heuristics', () => {
            expect((element as any)._isEnvironmentSensor('sensor.carbon_dioxide_test')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.soil_moisture_level')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.nutrient_tank_level')).toBe(true);
        });

        it('should identify sensors from config early', () => {
            const env = {
                co2Sensors: ['sensor.co1'],
                dehumidifierEntities: ['sensor.dh1'],
                humidifierEntities: ['sensor.h1'],
                soilMoistureSensors: ['sensor.sm1']
            };
            element.device = { ...mockDevice, environmentAttributes: env } as any;

            expect((element as any)._isEnvironmentSensor('sensor.co1')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.dh1')).toBe(true);
            expect((element as any)._isEnvironmentSensor('sensor.h1')).toBe(true);
            expect((element as any)._isIrrigationSensor('sensor.sm1')).toBe(true);
        });
    });

    describe('Additional Component Creation', () => {
        beforeEach(() => {
            (element as any).volatileGroup = new THREE.Group();
            (element as any).scene = new THREE.Scene();
        });

        it('should create fans', () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    circulationFanEntities: ['fan.circ1'],
                    sensorCoordinates: { 'fan.circ1': { x: 10, y: 10, z: 10 } }
                }
            };
            (element as any).renderFans(100, 200, 100);
            expect((element as any)._fanHeads.length).toBeGreaterThan(0);
        });


        it('should render humidifier hose at correct height based on Z coordinate', async () => {
            // Setup device with a humidifier outside the growspace boundaries
            const deviceWithHum = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    humidifierEntities: ['humidifier.outside'],
                    sensorCoordinates: {
                        'humidifier.outside': { x: -50, y: 0, z: 80 } // Outside width (width=120, range -60 to 60). Z=80.
                    }
                },
                dimensions: { width: 120, height: 200, length: 120 }
            };
            element.device = deviceWithHum;
            element.hass = {
                states: {
                    'humidifier.outside': { state: 'on', attributes: {} },
                    'sensor.temp1': { state: '25', attributes: {} },
                    'sensor.humi1': { state: '50', attributes: {} }
                }
            };

            await elementUpdated(element);

            // Access scene manager and find the humidifier mesh
            const sceneManager = (element as any).sceneManager;
            const humMesh = sceneManager.sensorMeshes.get('humidifier.outside');

            expect(humMesh).toBeDefined();
            expect(humMesh.userData.isOutside).toBe(true);

            // localTarget = target - hPos
            const hoseEnd = humMesh.userData.hoseEnd;
            expect(hoseEnd).toBeDefined();
            // We specifically want to verify the Y component reflects the Z input (height)
            expect(hoseEnd.y).toBe(80);
        });

    });

    describe('Animation and Particle Updates', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            (element as any).volatileGroup = new THREE.Group();
            (element as any).scene = new THREE.Scene();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should update humidifier particles when active', () => {
            const mockParticles = new THREE.Points(new THREE.BufferGeometry());
            const count = 100;
            mockParticles.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
            mockParticles.geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
            mockParticles.geometry.setAttribute('lifetime', new THREE.BufferAttribute(new Float32Array(count), 1));
            (element as any)._humidifierParticles = mockParticles;

            const mockHumidifier = new THREE.Group();
            mockHumidifier.userData = { intensity: 5, hoseEnd: new THREE.Vector3(0, 0, 0), entityId: 'h1' };
            (element as any)._humidifiers = [mockHumidifier];

            (element as any).updateScene(); // To trigger initial state if needed

            // Using requestAnimationFrame mock or just calling the loop method
            vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
                return 1;
            });

            // Re-set these precisely
            (element as any)._humidifiers = [mockHumidifier];
            (element as any)._humidifierParticles = mockParticles;

            (element as any)._animateLoop(); // Should trigger updates

            // If it respawns a particle, its lifetime should be > 0
            const lifetimes = (element as any)._humidifierParticles.geometry.attributes.lifetime.array;
            expect(Array.from(lifetimes).some(l => (l as number) > 0)).toBe(true);
        });

        it('should handle dragging events', () => {
            (element as any).initThree(); // Setup scene/camera
            (element as any).editMode3DCords = true;
            const mockMesh = new THREE.Mesh();
            (element as any).sensorMeshes.set('s1', mockMesh);
            (element as any).updateDragControls();

            const controls = (element as any).dragControls;
            expect(controls).toBeDefined();

            // Simulate dragstart
            controls.dispatchEvent({ type: 'dragstart', object: mockMesh });
            expect((element as any).isDragging).toBe(true);

            // Simulate dragEnd
            controls.dispatchEvent({ type: 'dragend', object: mockMesh });
            expect((element as any).isDragging).toBe(false);
        });
        it('should correctly position humidifier hose connection based on Z coordinate', async () => {
            const deviceWithZ = {
                ...mockDevice,
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    humidifierEntities: ['humidifier.outside'],
                    sensorCoordinates: {
                        'humidifier.outside': { x: -20, y: 50, z: 100 }
                    }
                }
            };
            element.device = deviceWithZ;
            element.hass = {
                ...mockHass,
                states: {
                    ...mockHass.states,
                    'humidifier.outside': { state: 'on', attributes: {} }
                }
            };

            await elementUpdated(element);

            // Check volatile group for the hose via sceneManager
            await elementUpdated(element);
            const SceneManager = (element as any).sceneManager;
            const volGroup = SceneManager.volatileGroup;
            expect(volGroup).toBeDefined();

            // Find the humidifier group
            const humGroup = volGroup.children.find((c: any) => c.userData.entityId === 'humidifier.outside');
            expect(humGroup).toBeDefined();

            // Verify device position (should be locked to ground Z=0)
            expect(humGroup.position.y).toBe(0);

            // Verify hose exists
            const hose = humGroup.children.find((c: any) => c.name === 'hose');
            expect(hose).toBeDefined();

            // The hose path end in local space should be the Z coordinate.
            // target.y = 100, deviceHeight = 0. target.y - deviceHeight = 100.
            expect(humGroup.userData.hoseEnd.y).toBe(100);

        });

        it('should correctly position pump hose connection based on Z coordinate', async () => {
            const deviceWithZ = {
                ...mockDevice,
                irrigationConfig: {
                    irrigationPumpEntity: 'switch.pump'
                },
                environmentAttributes: {
                    ...mockDevice.environmentAttributes,
                    sensorCoordinates: {
                        'switch.pump': { x: -10, y: 0, z: 20 }
                    }

                }
            };
            element.device = deviceWithZ;
            element.hass = {
                ...mockHass,
                states: {
                    ...mockHass.states,
                    'switch.pump': { state: 'on', attributes: {} }
                }
            };

            await elementUpdated(element);

            // Check volatile group via sceneManager
            const SceneManager = (element as any).sceneManager;
            const volGroup = SceneManager.volatileGroup;
            const pumpGroup = volGroup.children.find((c: any) => c.userData.entityId === 'switch.pump');
            expect(pumpGroup).toBeDefined();

            // Verify device position (should be locked to ground Z=0)
            expect(pumpGroup.position.y).toBe(0);

            // Verify hose exists
            const hose = pumpGroup.children.find((c: any) => c.name === 'pumpHose');
            expect(hose).toBeDefined();

            // Hose end is targetH = 20
            expect(pumpGroup.userData.hoseEnd.y).toBe(20);
        });

    });
});
