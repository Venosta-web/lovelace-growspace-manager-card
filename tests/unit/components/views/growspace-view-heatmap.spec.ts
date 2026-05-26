import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/features/shared/layouts/growspace-view-heatmap';
import { GrowspaceViewHeatmap } from '../../../../src/features/shared/layouts/growspace-view-heatmap';

// Mock child components
vi.mock('../../../../src/features/ui/containers/growspace-header.container', () => ({
    GrowspaceHeader: class extends HTMLElement { }
}));

vi.mock('../../../../src/features/environment/components/heatmap-3d', () => ({
    Heatmap3D: class extends HTMLElement { }
}));

describe('GrowspaceViewHeatmap', () => {
    let element: GrowspaceViewHeatmap;
    const mockDevice = {
        deviceId: 'gs1',
        name: 'Growspace 1',
    } as any;

    beforeEach(async () => {
        element = await fixture(html`
            <growspace-view-heatmap .device=${mockDevice}></growspace-view-heatmap>
        `);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be instantiated', () => {
        expect(element).toBeInstanceOf(GrowspaceViewHeatmap);
    });

    it('should NOT render content if device is missing', async () => {
        element.device = undefined;
        await elementUpdated(element);
        // Lit renders marker comments even for empty templates. 
        // We check that no actual elements are rendered.
        expect(element.shadowRoot?.querySelector('growspace-header')).toBeNull();
        expect(element.shadowRoot?.querySelector('heatmap-3d')).toBeNull();
    });

    it('should render header and 3d heatmap when device is present', async () => {
        const header = element.shadowRoot?.querySelector('growspace-header');
        const heatmap = element.shadowRoot?.querySelector('heatmap-3d');

        expect(header).toBeTruthy();
        expect(heatmap).toBeTruthy();
        expect((header as any).device).toEqual(mockDevice);
        expect((heatmap as any).device).toEqual(mockDevice);
    });

    it('should propagate properties to heatmap-3d', async () => {
        const mockHass = { states: {} };
        const growspaceOptions = {
            keyboard_rotate_enabled: true,
            keyboard_rotate_speed: 2.5
        };

        element.hass = mockHass;
        element.growspaceOptions = growspaceOptions as any;
        element.editMode3DCords = true;
        await elementUpdated(element);

        const heatmap = element.shadowRoot?.querySelector('heatmap-3d') as any;
        expect(heatmap.hass).toBe(mockHass);
        expect(heatmap.editMode3DCords).toBe(true);
        expect(heatmap.keyboardRotateEnabled).toBe(true);
        expect(heatmap.keyboardRotateSpeed).toBe(2.5);
    });

    it('should use default rotation settings if growspaceOptions is empty', async () => {
        element.growspaceOptions = {};
        await elementUpdated(element);

        const heatmap = element.shadowRoot?.querySelector('heatmap-3d') as any;
        expect(heatmap.keyboardRotateEnabled).toBe(false);
        expect(heatmap.keyboardRotateSpeed).toBe(1.0);
    });

    it('should update editMode3DCords when edit-mode-changed event is received', async () => {
        const heatmap = element.shadowRoot?.querySelector('heatmap-3d');

        heatmap?.dispatchEvent(new CustomEvent('edit-mode-changed', {
            detail: { enabled: true },
            bubbles: true,
            composed: true
        }));

        await elementUpdated(element);
        expect(element.editMode3DCords).toBe(true);
    });

    it('should bubble sensor-position-changed event', async () => {
        const heatmap = element.shadowRoot?.querySelector('heatmap-3d');
        const listener = vi.fn();
        element.addEventListener('sensor-position-changed', listener);

        const eventDetail = { entityId: 'sensor.temp', x: 1, y: 2, z: 3 };
        heatmap?.dispatchEvent(new CustomEvent('sensor-position-changed', {
            detail: eventDetail,
            bubbles: true,
            composed: true
        }));

        expect(listener).toHaveBeenCalled();
        expect(listener.mock.calls[0][0].detail).toEqual(eventDetail);
    });

    it('should redispatch events from header', async () => {
        const header = element.shadowRoot?.querySelector('growspace-header');
        const spy = vi.fn();
        element.addEventListener('growspace-changed', spy);

        const detail = 'gs2';
        header?.dispatchEvent(new CustomEvent('growspace-changed', {
            detail,
            bubbles: true,
            composed: true
        }));

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toBe(detail);
    });
});
