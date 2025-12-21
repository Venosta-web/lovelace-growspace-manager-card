
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceLogbook } from '../../../../src/components/ui/growspace-logbook';
import { GrowspaceEvent } from '../../../../src/types';

// Hoist the mock instance so it can be used in the factory and tests
const { mockControllerInstance } = vi.hoisted(() => {
    return {
        mockControllerInstance: {
            fetchEventLog: vi.fn().mockResolvedValue([])
        }
    };
});

// Mock Controller
vi.mock('../../../../src/controllers/growspace-logbook-controller', () => {
    return {
        GrowspaceLogbookController: class {
            constructor() {
                // Return the singular hoisted instance or copy methods?
                // If we want to spy on calls, returning the instance is easiest if the code just calls methods.
                // But the class instantiates new one.
                return mockControllerInstance;
            }
        }
    };
});

// Import AFTER mock
import { GrowspaceLogbookController } from '../../../../src/controllers/growspace-logbook-controller';

describe('GrowspaceLogbook', () => {
    let element: GrowspaceLogbook;

    // Updated mock data
    const mockEvents: GrowspaceEvent[] = [
        {
            growspace_id: 'gs1',
            sensor_type: 'temperature',
            category: 'alert',
            severity: 0.9,
            reasons: ['Too hot'],
            start_time: new Date(Date.now() - 1000 * 60).toISOString(),
            end_time: new Date().toISOString(),
            duration_sec: 60
        },
        {
            growspace_id: 'gs1',
            sensor_type: 'irrigation',
            category: 'irrigation',
            severity: 0,
            reasons: [],
            start_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            end_time: new Date().toISOString(),
            duration_sec: 300
        },
        {
            growspace_id: 'gs1',
            sensor_type: 'humidity',
            category: 'environment',
            severity: 0.5,
            reasons: [],
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            end_time: new Date().toISOString(),
            duration_sec: 0
        }
    ];

    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset default impl
        mockControllerInstance.fetchEventLog.mockResolvedValue([]);

        element = new GrowspaceLogbook();
        element.hass = {} as any;
        element.growspaceId = 'gs1';

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    it('should instantiate controller on init', async () => {
        // Since we return the same instance, we can't easily check 'toHaveBeenCalled' on the class
        // unless we mock the class symbol itself which acts as constructor?
        // But we can check if fetchEventLog was called.
        expect(mockControllerInstance.fetchEventLog).toHaveBeenCalled();
        expect(element.shadowRoot?.querySelector('.log-container')).toBeTruthy();
    });

    it('should fetch events when growspaceId changes', async () => {
        const fetchSpy = mockControllerInstance.fetchEventLog;
        fetchSpy.mockResolvedValue(mockEvents);

        element.growspaceId = 'gs2';
        await element.updateComplete;
        // Wait for async fetch
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        expect(fetchSpy).toHaveBeenCalledWith('gs2');

        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(3);
    });

    it('should filter events', async () => {
        (element as any)._events = [...mockEvents];
        (element as any)._isLoading = false;
        await element.updateComplete;

        let cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(3);

        const chips = element.shadowRoot?.querySelectorAll('.filter-chip');
        const alertChip = Array.from(chips || []).find(c => c.textContent?.includes('Alerts'));
        (alertChip as HTMLElement)?.click();
        await element.updateComplete;

        cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1);
        expect(cards?.[0].querySelector('.event-type')?.textContent).toContain('temperature');

        const irrChip = Array.from(chips || []).find(c => c.textContent?.includes('Irrigation'));
        (irrChip as HTMLElement)?.click();
        await element.updateComplete;

        cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1);
        expect(cards?.[0].querySelector('.event-type')?.textContent).toContain('irrigation');
    });

    it('should display empty state if no events match filter', async () => {
        (element as any)._events = [mockEvents[1]]; // Only irrigation
        (element as any)._activeFilter = 'alerts'; // Filter for alerts
        (element as any)._isLoading = false;
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.textContent).toContain('No events found');
    });

    it('should show loading state', async () => {
        (element as any)._isLoading = true;
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState?.textContent).toContain('Loading events');
    });

    describe('Private Helpers Coverage', () => {
        it('should format probability correctly', () => {
            expect((element as any)._formatProb(undefined)).toBe('--%');
            expect((element as any)._formatProb(null)).toBe('--%');
            expect((element as any)._formatProb(NaN)).toBe('--%');
            expect((element as any)._formatProb(0.56)).toBe('56%');
        });

        it('should format time safely', () => {
            const valid = new Date().toISOString();
            expect((element as any)._formatTime(valid)).not.toBe(valid); // Should look formatted

            const invalid = 'not-a-date';
            expect((element as any)._formatTime(invalid)).toBe(invalid);
        });

        it('should _getSeverityColor for optimal sensors', () => {
            // Optimal: High is Good (Green), Low is Bad (Red)
            // Logic in code: if >= 0.9 -> Green, >= 0.75 -> Warning, else -> Error
            expect((element as any)._getSeverityColor(0.95, 'optimal')).toBe('var(--success-color, #4CAF50)');
            expect((element as any)._getSeverityColor(0.80, 'optimal')).toBe('var(--warning-color)');
            expect((element as any)._getSeverityColor(0.50, 'optimal')).toBe('var(--error-color)');
        });

        it('should _getSeverityColor for default (alert) sensors', () => {
            // Default: High is Bad (Red)
            expect((element as any)._getSeverityColor(0.95, 'temp')).toBe('var(--error-color)');
            expect((element as any)._getSeverityColor(0.80, 'temp')).toBe('var(--warning-color)');
            expect((element as any)._getSeverityColor(0.50, 'temp')).toBe('var(--primary-text-color)');
        });
    });

    it('should filter environment events correctly', async () => {
        const envEvents: GrowspaceEvent[] = [
            { ...mockEvents[0], sensor_type: 'vpd', category: 'environment' },
            { ...mockEvents[0], sensor_type: 'co2', category: 'environment' },
            { ...mockEvents[0], sensor_type: 'unknown', category: 'environment' } // Should be filtered out by strict sensor_type check?
        ];
        (element as any)._events = envEvents;
        (element as any)._activeFilter = 'environment';
        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        // valid types: 'temperature', 'humidity', 'vpd', 'co2'
        // We have vpd and co2. 'unknown' is not in list.
        expect(cards?.length).toBe(2);
    });

    it('should re-init controller if hass changes and controller missing', async () => {
        (element as any)._controller = undefined;
        // Trigger willUpdate via property change
        element.hass = { ...element.hass, state: 'new' } as any;
        await element.updateComplete;

        expect(mockControllerInstance.fetchEventLog).toHaveBeenCalled();
    });
});
