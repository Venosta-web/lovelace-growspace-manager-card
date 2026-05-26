
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VPDHeatmap } from '../../../../src/features/environment/components/vpd-heatmap';
import { html } from 'lit';

describe('VPDHeatmap', () => {
    let element: VPDHeatmap;
    let mockContext: any;
    let mockCanvas: any;

    beforeEach(async () => {
        // Switch to manual creation like other tests to ensure shadowRoot handling is consistent
        element = new VPDHeatmap();
        document.body.appendChild(element);
        await element.updateComplete;

        // Mock Canvas API
        mockContext = {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
        };

        mockCanvas = {
            getContext: vi.fn(() => mockContext),
            width: 0,
            height: 0,
            style: {},
        };

        if (element.shadowRoot) {
            // Inject mock canvas into shadow root
            const originalGetElementById = element.shadowRoot.getElementById.bind(element.shadowRoot);
            element.shadowRoot.getElementById = vi.fn((id) => {
                if (id === 'vpdCanvas') return mockCanvas;
                return originalGetElementById(id);
            });
        }
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('should calculate VPD correctly', () => {
        // Test Case: 25C, 60% RH
        // SVP = 0.61078 * exp(17.27*25 / (25+237.3)) 
        //     = 0.61078 * exp(431.75 / 262.3) 
        //     = 0.61078 * exp(1.646) 
        //     = 0.61078 * 5.186 
        //     ≈ 3.167 kPa
        // VPD = 3.167 * (1 - 0.60) = 3.167 * 0.4 ≈ 1.267 kPa

        const vpd = (element as any)._getVPD(25, 60);
        expect(vpd).toBeCloseTo(1.26, 1);
    });

    describe('_getZoneColor logic', () => {
        it('should return correct colors for vegetative stage', () => {
            const stage = 'vegetative';
            // OptMin 0.8, OptMax 1.1, Min 0.4, Max 1.4

            expect((element as any)._getZoneColor(0.9, stage)).toBe('#4caf50'); // Optimal
            expect((element as any)._getZoneColor(0.2, stage)).toBe('#2196f3'); // Too Low
            expect((element as any)._getZoneColor(1.5, stage)).toBe('#f44336'); // Too High
            expect((element as any)._getZoneColor(0.6, stage)).toBe('#ff9800'); // Low Warning
            expect((element as any)._getZoneColor(1.2, stage)).toBe('#ff9800'); // High Warning
            // Fallback?
            const defaultColor = (element as any)._getZoneColor(1.45, stage); // Out of warning, technically Max=1.4
            // Wait, logic says if vpd > max return red.
        });

        it('should return correct colors for seedling stage', () => {
            const stage = 'seedling';
            // OptMin 0.4, OptMax 0.8
            expect((element as any)._getZoneColor(0.6, stage)).toBe('#4caf50');
        });

        it('should return correct colors for flower stage', () => {
            const stage = 'flower';
            // OptMin 1.0, OptMax 1.35
            expect((element as any)._getZoneColor(1.2, stage)).toBe('#4caf50');
        });

        it('should return correct colors for late_flower stage', () => {
            const stage = 'late_flower';
            // OptMin 1.2, OptMax 1.55
            expect((element as any)._getZoneColor(1.4, stage)).toBe('#4caf50');
        });

        it('should use default for unknown stage', () => {
            // Default: Opt 0.8-1.2
            expect((element as any)._getZoneColor(1.0, 'unknown')).toBe('#4caf50');
        });

        it('should return correct colors for dry stage', () => {
            const stage = 'dry';
            // OptMin 0.8, OptMax 1.1
            expect((element as any)._getZoneColor(0.9, stage)).toBe('#4caf50');
        });

        it('should return correct colors for cure stage', () => {
            const stage = 'cure';
            // OptMin 0.6, OptMax 0.9
            expect((element as any)._getZoneColor(0.7, stage)).toBe('#4caf50');
        });

        it('should return fallback color for NaN', () => {
            expect((element as any)._getZoneColor(NaN, 'flower')).toBe('#ff9800');
        });
    });

    it('should draw heatmap on firstUpdated', () => {
        // Trigger manually or rely on fixture
        (element as any).firstUpdated();
        expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
        expect(mockContext.clearRect).toHaveBeenCalled();
        expect(mockContext.fillRect).toHaveBeenCalled(); // Should draw many pixels
    });
    it('should redraw when stage changes', async () => {
        mockContext.fillRect.mockClear();
        element.stage = 'flower';
        await element.updateComplete;
        expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should redraw when temperature changes', async () => {
        mockContext.fillRect.mockClear();
        element.temperature = 30;
        await element.updateComplete;
        expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should redraw when humidity changes', async () => {
        mockContext.fillRect.mockClear();
        element.humidity = 50;
        await element.updateComplete;
        expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should draw current point when temperature and humidity are set', async () => {
        element.temperature = 25;
        element.humidity = 60;
        await element.updateComplete;
        (element as any)._drawHeatmap(); // Force redraw call if updated didn't catch it for some reason or just test method

        expect(mockContext.arc).toHaveBeenCalled();
        expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('should NOT draw current point if data missing', async () => {
        element.temperature = undefined as any;
        element.humidity = 60;
        await element.updateComplete;
        mockContext.arc.mockClear();

        (element as any)._drawHeatmap();
        expect(mockContext.arc).not.toHaveBeenCalled();
    });

    it('should handle missing canvas gracefully', () => {
        element.shadowRoot!.getElementById = vi.fn(() => null);
        // specific testing of return
        expect(() => (element as any)._drawHeatmap()).not.toThrow();
    });

    it('should handle missing context gracefully', () => {
        mockCanvas.getContext.mockReturnValue(null);
        expect(() => (element as any)._drawHeatmap()).not.toThrow();
    });

    it('should NOT draw current point if out of bounds', async () => {
        element.temperature = 10; // Min is 15
        element.humidity = 60;
        await element.updateComplete;
        mockContext.arc.mockClear();

        (element as any)._drawHeatmap();
        expect(mockContext.arc).not.toHaveBeenCalled();
    });

    it('should render DOM point and tooltip when within bounds', async () => {
        element.temperature = 25;
        element.humidity = 60;
        await element.updateComplete;

        const point = element.shadowRoot?.querySelector('.current-point');
        const tooltip = element.shadowRoot?.querySelector('.current-tooltip');

        expect(point).toBeTruthy();
        expect(tooltip).toBeTruthy();
        expect(tooltip?.textContent).toContain('1.27 kPa'); // 25C, 60RH is ~1.27
    });

    it('should use provided vpd property if available', async () => {
        element.temperature = 25;
        element.humidity = 60;
        element.vpd = 1.5;
        await element.updateComplete;

        const tooltip = element.shadowRoot?.querySelector('.current-tooltip');
        expect(tooltip?.textContent).toContain('1.5 kPa');
    });

    it('should NOT render DOM point and tooltip when out of bounds', async () => {
        element.temperature = 10;
        element.humidity = 60;
        await element.updateComplete;

        const point = element.shadowRoot?.querySelector('.current-point');
        const tooltip = element.shadowRoot?.querySelector('.current-tooltip');

        expect(point).toBeFalsy();
        expect(tooltip).toBeFalsy();
    });
});
