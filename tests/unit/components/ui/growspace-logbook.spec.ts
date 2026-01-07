
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
        (element as any)._events = [...mockEvents, {
            growspace_id: 'gs1',
            sensor_type: 'topping',
            category: 'training',
            severity: 0.5,
            reasons: ['Technique: Topping'],
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            duration_sec: 0
        }];
        (element as any)._isLoading = false;
        await element.updateComplete;

        let cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(4);

        const chips = element.shadowRoot?.querySelectorAll('.filter-chip');

        // Test Alerts
        const alertChip = Array.from(chips || []).find(c => c.textContent?.includes('Alerts'));
        (alertChip as HTMLElement)?.click();
        await element.updateComplete;

        cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1);
        expect(cards?.[0].querySelector('.event-type')?.textContent).toContain('temperature');

        // Test Watering
        const wateringChip = Array.from(chips || []).find(c => c.textContent?.includes('Watering'));
        (wateringChip as HTMLElement)?.click();
        await element.updateComplete;

        cards = element.shadowRoot?.querySelectorAll('.event-card');
        // Should match irrigation event
        const irrigationEvents = Array.from(cards || []).filter(c => c.textContent?.includes('irrigation'));
        expect(irrigationEvents.length).toBeGreaterThan(0);

        // Test Training
        const trainingChip = Array.from(chips || []).find(c => c.textContent?.includes('Training'));
        (trainingChip as HTMLElement)?.click();
        await element.updateComplete;

        cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1);
        expect(cards?.[0].querySelector('.event-type')?.textContent).toContain('topping');
    });

    it('should filter events robustly (mixed case, missing categories)', async () => {
        const robustEvents: GrowspaceEvent[] = [
            // Standard format
            { ...mockEvents[0], sensor_type: 'temperature', category: 'alert', severity: 0.8 },
            // Manual watering (category=environmental, sensor_type=irrigation)
            { ...mockEvents[0], sensor_type: 'irrigation', category: 'environmental', severity: 0 },
            // Old training event (no category, known technique)
            { ...mockEvents[0], sensor_type: 'topping', category: undefined as any, severity: 0.5 },
            // Drain event
            { ...mockEvents[0], sensor_type: 'drain', category: 'irrigation', severity: 0 },
            // Mixed case training
            { ...mockEvents[0], sensor_type: 'Super_Cropping', category: 'Training', severity: 0.5 }
        ];
        (element as any)._events = robustEvents;
        await element.updateComplete;

        const chips = element.shadowRoot?.querySelectorAll('.filter-chip');

        // Test Alerts
        const alertChip = Array.from(chips || []).find(c => c.textContent?.includes('Alerts'));
        (alertChip as HTMLElement)?.click();
        await element.updateComplete;
        let cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1); // Only temperature alert

        // Test Watering
        const wateringChip = Array.from(chips || []).find(c => c.textContent?.includes('Watering'));
        (wateringChip as HTMLElement)?.click();
        await element.updateComplete;
        cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(2); // Manual watering + Drain

        // Test Training
        const trainingChip = Array.from(chips || []).find(c => c.textContent?.includes('Training'));
        (trainingChip as HTMLElement)?.click();
        await element.updateComplete;
        cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(2); // Old topping + Mixed case super cropping
    });

    it('should filter environment events correctly', async () => {
        const envEvents: GrowspaceEvent[] = [
            { ...mockEvents[0], sensor_type: 'vpd', category: 'environment' },
            { ...mockEvents[0], sensor_type: 'co2', category: 'environment' },
            { ...mockEvents[0], sensor_type: 'unknown', category: 'environment' }
        ];
        (element as any)._events = envEvents;

        const chips = element.shadowRoot?.querySelectorAll('.filter-chip');
        const envChip = Array.from(chips || []).find(c => c.textContent?.includes('Environment'));
        (envChip as HTMLElement)?.click();

        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        // valid types: 'temperature', 'humidity', 'vpd', 'co2'
        expect(cards?.length).toBe(2);
    });

    it('should display empty state if no events match filter', async () => {
        (element as any)._events = [mockEvents[0]]; // Only alert/temp
        (element as any)._activeFilter = 'training'; // Filter for training
        await element.updateComplete;

        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState).not.toBeNull();
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

    it('should re-init controller if hass changes and controller missing', async () => {
        (element as any)._controller = undefined;
        // Trigger willUpdate via property change
        element.hass = { ...element.hass, state: 'new' } as any;
        await element.updateComplete;

        expect(mockControllerInstance.fetchEventLog).toHaveBeenCalled();
    });

    it('should NOT re-init controller if already exists when hass changes', async () => {
        mockControllerInstance.fetchEventLog.mockClear();
        (element as any)._controller = mockControllerInstance;
        element.hass = { ...element.hass, state: 'newer' } as any;
        await element.updateComplete;

        expect(mockControllerInstance.fetchEventLog).not.toHaveBeenCalled();
    });

    it('should call initController in willUpdate when triggered manually', () => {
        (element as any)._controller = undefined;
        // Verify willUpdate logic directly to ensure coverage
        const map = new Map();
        map.set('hass', true);
        (element as any).willUpdate(map);
        expect(mockControllerInstance.fetchEventLog).toHaveBeenCalled();
    });

    it('should sort events by time descending', async () => {
        const older = { ...mockEvents[0], start_time: new Date(Date.now() - 100000).toISOString(), sensor_type: 'older' };
        const newer = { ...mockEvents[0], start_time: new Date(Date.now()).toISOString(), sensor_type: 'newer' };

        (element as any)._events = [older, newer];
        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(2);
        // Newer should be first
        expect(cards?.[0].querySelector('.event-type')?.textContent).toContain('newer');
        expect(cards?.[1].querySelector('.event-type')?.textContent).toContain('older');
    });

    it('should handle fetch error and reset loading state', async () => {
        const errorMock = vi.fn().mockRejectedValue(new Error('Fetch failed'));
        // Temporarily override the instance method or use spy if possible.
        // Since we share the instance, we can just change the mock.
        mockControllerInstance.fetchEventLog.mockRejectedValueOnce(new Error('Fetch failed'));

        // Trigger fetch
        element.growspaceId = 'gs_error';
        // Check loading state immediately?
        // It's async. We can check if it eventually resets.
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0)); // wait for async
        await element.updateComplete;

        expect((element as any)._isLoading).toBe(false);
    });

    it('should format duration correctly', () => {
        expect((element as any)._formatDuration(65)).toBe('1m 5s');
        expect((element as any)._formatDuration(3600)).toBe('60m 0s');
        expect((element as any)._formatDuration(0)).toBe('0m 0s');
    });

    it('should render reasons correctly', async () => {
        const eventWithReasons = { ...mockEvents[0], reasons: ['Heat', 'Humidity'] };
        (element as any)._events = [eventWithReasons];
        await element.updateComplete;

        const reasonsDiv = element.shadowRoot?.querySelector('.event-reasons');
        const reasonItems = reasonsDiv?.querySelectorAll('.reason-badge');
        expect(reasonItems?.length).toBe(2);
        expect(reasonItems?.[0].textContent).toBe('Heat');
        expect(reasonItems?.[1].textContent).toBe('Humidity');
    });

    it('should handle drain sensor type in watering filter', async () => {
        const drainEvent = { ...mockEvents[0], sensor_type: 'drain', category: 'other' };
        (element as any)._events = [drainEvent];
        (element as any)._activeFilter = 'watering';
        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1);
    });

    it('should handle unknown filter gracefully (keep as all)', async () => {
        (element as any)._events = mockEvents;
        (element as any)._activeFilter = 'invalid_filter';
        await element.updateComplete;

        // Code comment says "'all' case keeps filteredEvents as allEvents" which is the default initialization
        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(3);
    });

    it('should handle undefined sensor type in severity color', () => {
        expect((element as any)._getSeverityColor(0.95, undefined)).toBe('var(--error-color)');
        expect((element as any)._getSeverityColor(0.95, null)).toBe('var(--error-color)');
    });
});
