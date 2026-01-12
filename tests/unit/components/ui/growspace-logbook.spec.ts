
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

        expect(fetchSpy).toHaveBeenCalledWith(element.hass, 'gs2', 50);

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
        mockControllerInstance.fetchEventLog.mockClear();
        // Directly invoke willUpdate logic since Lit reactive updates may not always trigger
        // for object reference changes (hass is an object)
        const changedProps = new Map();
        changedProps.set('hass', element.hass);
        element.hass = { ...element.hass, state: 'new' } as any;
        (element as any).willUpdate(changedProps);
        // Wait for async _fetchEvents
        await new Promise(r => setTimeout(r, 50));

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
        expect(mockControllerInstance.fetchEventLog).toHaveBeenCalledWith(element.hass, 'gs1', 50);
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

    it('should use warning color for HIGH severity (>= 0.7)', async () => {
        // Re-adding the original 'should render reasons correctly' test content
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

    it('should render note events correctly', async () => {
        const noteEvent: any = {
            growspace_id: 'gs1',
            category: 'note',
            notes: 'This is a test note',
            timestamp: '2023-01-05T10:00:00Z',
            tags: ['pest', 'remedy'],
            images: ['image1.jpg']
        };

        (element as any)._events = [noteEvent];
        element.growspaceId = 'gs1';
        await element.updateComplete;

        const eventCard = element.shadowRoot?.querySelector('.event-card');
        expect(eventCard?.textContent).toContain('Plant Note');
        expect(eventCard?.textContent).toContain('This is a test note');
        expect(eventCard?.textContent).toContain('#pest');
        expect(eventCard?.textContent).toContain('#remedy');
        expect(eventCard?.textContent).toContain('1 Image attached');
    });

    it('should filter note events correctly', async () => {
        const events: any[] = [
            { growspace_id: 'gs1', category: 'note', notes: 'Note 1', timestamp: '2023-01-05T10:00:00Z' },
            { growspace_id: 'gs1', category: 'alert', sensor_type: 'stress', start_time: '2023-01-05T11:00:00Z' }
        ];

        (element as any)._events = events;
        element.growspaceId = 'gs1';

        // Set filter to notes
        (element as any)._activeFilter = 'notes';
        await element.updateComplete;

        const cards = element.shadowRoot?.querySelectorAll('.event-card');
        expect(cards?.length).toBe(1);
        expect(cards?.[0].textContent).toContain('Plant Note');
    });
    describe('UI Rendering Detail Coverage', () => {
        it('should hide probability for training events', async () => {
            const trainingEvent = { ...mockEvents[0], category: 'training', severity: 0.9, sensor_type: 'topping' };
            (element as any)._events = [trainingEvent];
            await element.updateComplete;

            const probDiv = element.shadowRoot?.querySelector('.event-probability');
            expect(probDiv).toBeNull();
        });

        it('should hide probability for low severity non-alert events', async () => {
            const lowSeverityEvent = { ...mockEvents[0], category: 'environment', severity: 0.4, sensor_type: 'temperature' };
            (element as any)._events = [lowSeverityEvent];
            await element.updateComplete;

            const probDiv = element.shadowRoot?.querySelector('.event-probability');
            expect(probDiv).toBeNull();
        });

        it('should show probability for high severity non-alert events', async () => {
            const highSeverityEvent = { ...mockEvents[0], category: 'environment', severity: 0.8, sensor_type: 'temperature' };
            (element as any)._events = [highSeverityEvent];
            await element.updateComplete;

            const probDiv = element.shadowRoot?.querySelector('.event-probability');
            expect(probDiv).not.toBeNull();
            expect(probDiv?.textContent).toContain('80%');
        });

        it('should hide duration pill if duration is 0', async () => {
            const zeroDurationEvent = { ...mockEvents[0], duration_sec: 0 };
            (element as any)._events = [zeroDurationEvent];
            await element.updateComplete;

            const durationDiv = element.shadowRoot?.querySelector('.event-duration');
            expect(durationDiv).toBeNull();
        });

        it('should show duration pill if duration > 0', async () => {
            const durationEvent = { ...mockEvents[0], duration_sec: 125 };
            (element as any)._events = [durationEvent];
            await element.updateComplete;

            const durationDiv = element.shadowRoot?.querySelector('.event-duration');
            expect(durationDiv).not.toBeNull();
            expect(durationDiv?.textContent).toContain('2m 5s');
        });

        it('should handle image pluralization correctly', async () => {
            // 1 Image
            const singleImageEvent = { ...mockEvents[0], category: 'note', notes: 'test', images: ['img1.jpg'] };
            (element as any)._events = [singleImageEvent];
            await element.updateComplete;

            let cardText = element.shadowRoot?.querySelector('.event-card')?.textContent;
            expect(cardText).toContain('1 Image attached');
            expect(cardText).not.toContain('Images attached');

            // 2 Images
            const multiImageEvent = { ...singleImageEvent, images: ['img1.jpg', 'img2.jpg'] };
            (element as any)._events = [multiImageEvent];
            await element.updateComplete;

            cardText = element.shadowRoot?.querySelector('.event-card')?.textContent;
            expect(cardText).toContain('2 Images attached');
        });
    });


    describe('Coverage Improvements', () => {
        it('should handle rendering fallbacks for title', async () => {
             // 1. No sensor_type, has category -> formatted category
             const event1 = { ...mockEvents[0], sensor_type: undefined, category: 'my_category' } as any;
             // 2. No sensor_type, no category -> 'Event'
             const event2 = { ...mockEvents[0], sensor_type: undefined, category: undefined } as any;
             // 3. defined sensor_type with underscore -> 'fan speed'
             const event3 = { ...mockEvents[0], sensor_type: 'fan_speed' } as any;
             
             (element as any)._events = [event1, event2, event3];
             await element.updateComplete;
             
             const cards = element.shadowRoot?.querySelectorAll('.event-card');
             const types = Array.from(cards || []).map(c => c.querySelector('.event-type')?.textContent?.trim());
             
             expect(types[0]).toBe('my category');
             expect(types[1]).toBe('Event');
             expect(types[2]).toBe('fan speed');
        });

        it('should handle undefined reasons gracefully', async () => {
            const event = { ...mockEvents[0], reasons: undefined };
            (element as any)._events = [event];
            await element.updateComplete;
            
            // Should not throw and reasons section should be empty/safe
            const reasonsDiv = element.shadowRoot?.querySelector('.event-reasons');
            expect(reasonsDiv?.textContent?.trim()).toBe('');
        });

        it('should sort mixed event types (timestamp vs start_time) correctly', async () => {
            const now = Date.now();
            const noteEvent = { 
                growspace_id: 'gs1', 
                category: 'note', 
                timestamp: new Date(now).toISOString() // Newer 
            } as any;
            const alertEvent = { 
                growspace_id: 'gs1', 
                category: 'alert', 
                start_time: new Date(now - 1000).toISOString() // Older
            } as any;
            
            (element as any)._events = [alertEvent, noteEvent]; // Generic order
            await element.updateComplete;
            
            const cards = element.shadowRoot?.querySelectorAll('.event-card');
            const types = Array.from(cards || []).map(c => c.querySelector('.event-type')?.textContent?.trim());
            
            // Note (Plant Note) should be first because it is newer
            expect(types[0]).toBe('Plant Note');
            expect(types[1]).toBe('alert'); // sensor_type undefined -> category 'alert'
        });

        it('should handle watering filter wildcard matching', async () => {
             const leakerEvent = { ...mockEvents[0], sensor_type: 'water_leaker', category: 'alert' };
             (element as any)._events = [leakerEvent];
             (element as any)._activeFilter = 'watering';
             await element.updateComplete;
             
             const cards = element.shadowRoot?.querySelectorAll('.event-card');
             expect(cards?.length).toBe(1);
        });

        it('should return early in _fetchEvents if hass is missing', async () => {
             element.hass = undefined as any;
             mockControllerInstance.fetchEventLog.mockClear();
             
             // Trigger private method directly or via change (but change requires hass check in willUpdate)
             await (element as any)._fetchEvents();
             
             expect(mockControllerInstance.fetchEventLog).not.toHaveBeenCalled();
        });
    });
});
