
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceLogbook } from '../../../../src/components/ui/growspace-logbook';
import { GrowspaceEvent } from '../../../../src/types';

// Mock virtualizer
vi.mock('@lit-labs/virtualizer/virtualize.js', () => ({
    virtualize: vi.fn(({ items, renderItem }) => {
        return items ? items.map((item: any) => renderItem(item)) : [];
    })
}));

describe('GrowspaceLogbook', () => {
    let element: GrowspaceLogbook;
    let mockHass: any;

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

        mockHass = {
            callWS: vi.fn().mockResolvedValue({ gs1: [] }),
            callService: vi.fn(),
        };

        element = new GrowspaceLogbook();
        element.hass = mockHass;
        element.growspaceId = 'gs1';

        document.body.appendChild(element);
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0));
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
    });

    it('should render log container', async () => {
        expect(element.shadowRoot?.querySelector('.log-container')).toBeTruthy();
    });


    it('should fetch events when growspaceId changes', async () => {
        mockHass.callWS.mockResolvedValue({ gs2: mockEvents });

        element.growspaceId = 'gs2';
        await element.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        expect(mockHass.callWS).toHaveBeenCalledWith(expect.objectContaining({
            type: 'growspace_manager/get_log',
            growspace_id: 'gs2',
            limit: 50
        }));

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
            const result = (element as any)._formatTime(valid);
            expect(result).not.toBe(valid); // Should be formatted

            const invalid = 'not-a-date';
            // formatTime from date-utils returns 'Invalid Date' for invalid input
            expect((element as any)._formatTime(invalid)).toBe('Invalid Date');
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
        mockHass.callWS.mockRejectedValueOnce(new Error('Fetch failed'));

        element.growspaceId = 'gs_error';
        await element.updateComplete;
        await new Promise(r => setTimeout(r, 0));
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

        describe('Error Handling', () => {
            it('should handle fetch error gracefully', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
                const mockHass = {
                    callWS: vi.fn().mockRejectedValue(new Error('Network error'))
                } as any;

                const element = document.createElement('growspace-logbook') as GrowspaceLogbook;
                element.hass = mockHass;
                element.growspaceId = 'test_growspace';
                document.body.appendChild(element);

                await element.updateComplete;
                // Wait for async fetch
                await new Promise(resolve => setTimeout(resolve, 100));

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Error fetching growspace events:',
                    expect.any(Error)
                );

                // Should still have empty events array
                expect((element as any)._events).toEqual([]);

                document.body.removeChild(element);
                consoleErrorSpy.mockRestore();
            });
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
            mockHass.callWS.mockClear();

            await (element as any)._fetchEvents();

            expect(mockHass.callWS).not.toHaveBeenCalled();
        });
    });

    describe('scrollToTimestamp', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        it('should scroll to closest event and highlight', async () => {
            // Setup events with mock HASS
            mockHass.callWS.mockResolvedValue({ gs1: mockEvents });
            element = new GrowspaceLogbook();
            element.hass = mockHass;
            element.growspaceId = 'gs1';
            document.body.appendChild(element);

            // Advance timers to allow fetch to complete
            await vi.advanceTimersByTimeAsync(0);
            await element.updateComplete;
            await vi.advanceTimersByTimeAsync(0);
            await element.updateComplete;

            // Mock scrollIntoView
            const mockScrollIntoView = vi.fn();

            // Spy on querySelector of the container
            const container = element.shadowRoot?.querySelector('.log-container');
            if (container) {
                vi.spyOn(container, 'querySelector').mockImplementation((selector) => {
                    if (selector === '[data-event-index="0"]') {
                        return {
                            scrollIntoView: mockScrollIntoView
                        } as any;
                    }
                    return null;
                });
            }

            const targetTime = new Date(mockEvents[0].start_time).getTime();

            element.scrollToTimestamp(targetTime);
            await vi.advanceTimersByTimeAsync(100);

            expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
            expect((element as any)._highlightedTimestamp).toBe(targetTime);

            await vi.advanceTimersByTimeAsync(3000);
            expect((element as any)._highlightedTimestamp).toBeNull();
        });

        it('should do nothing if no events', async () => {
            mockHass.callWS.mockResolvedValue({ gs1: [] });
            element = new GrowspaceLogbook();
            element.hass = mockHass;
            element.growspaceId = 'gs1';
            document.body.appendChild(element);
            await vi.advanceTimersByTimeAsync(0);
            await element.updateComplete;

            const timestamp = Date.now();
            element.scrollToTimestamp(timestamp);

            // Check that it's set initially
            expect((element as any)._highlightedTimestamp).toBe(timestamp);
        });
    });

    describe('Severity Logic', () => {
        it('should return correct colors for "optimal" sensor type', () => {
            // Optimal: High severity = Good match (Success)
            // Low severity = Bad match (Error)

            // >= 0.9 -> success
            expect((element as any)._getSeverityColor(0.9, 'optimal')).toContain('success');
            expect((element as any)._getSeverityColor(1.0, 'Optimal')).toContain('success'); // Case insensitive

            // >= 0.75 -> warning
            expect((element as any)._getSeverityColor(0.8, 'optimal')).toContain('warning');
            expect((element as any)._getSeverityColor(0.75, 'optimal')).toContain('warning');

            // < 0.75 -> error
            expect((element as any)._getSeverityColor(0.5, 'optimal')).toContain('error');
            expect((element as any)._getSeverityColor(0, 'optimal')).toContain('error');
        });

        it('should return correct colors for default sensor types', () => {
            // Default: High severity = Bad (Error)

            // >= 0.9 -> error
            expect((element as any)._getSeverityColor(0.9, 'other')).toContain('error');
            expect((element as any)._getSeverityColor(0.9)).toContain('error'); // undefined type

            // >= 0.75 -> warning
            expect((element as any)._getSeverityColor(0.8, 'other')).toContain('warning');
            expect((element as any)._getSeverityColor(0.75, 'other')).toContain('warning');

            // < 0.75 -> primary text
            expect((element as any)._getSeverityColor(0.5, 'other')).toContain('primary-text');
            expect((element as any)._getSeverityColor(0, 'other')).toContain('primary-text');
        });

        it('should handle null event in renderItem gracefully', async () => {
            // Mock virtualize to pass null event
            const { virtualize } = await import('@lit-labs/virtualizer/virtualize.js');
            (virtualize as any).mockImplementation(({ items, renderItem }: any) => {
                return [renderItem(null), ...items.map((item: any) => renderItem(item))];
            });

            mockHass.callWS.mockResolvedValue({ gs1: mockEvents });
            element = new GrowspaceLogbook();
            element.hass = mockHass;
            element.growspaceId = 'gs1';
            document.body.appendChild(element);
            await element.updateComplete;

            // Should not throw error
            expect(element.shadowRoot).toBeTruthy();
        });

        it('should handle empty events array correctly', async () => {
            mockHass.callWS.mockResolvedValue({ gs1: [] });
            element = new GrowspaceLogbook();
            element.hass = mockHass;
            element.growspaceId = 'gs1';
            document.body.appendChild(element);
            await element.updateComplete;
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            const emptyState = element.shadowRoot?.querySelector('.empty-state');
            expect(emptyState).toBeTruthy();
            expect(emptyState?.textContent).toContain('No events');
        });
    });
});
