import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimelineService, getTimelineService, type NotePayload } from '../../../src/services/timeline-service';
import type { HomeAssistant } from 'custom-card-helpers';

describe('TimelineService', () => {
    let mockHass: any;
    let service: TimelineService;

    beforeEach(() => {
        mockHass = {
            callWS: vi.fn(),
        };
        service = new TimelineService(mockHass);
    });

    describe('fetchGrowspaceEvents', () => {
        it('should fetch events successfully', async () => {
            const mockEvents = [
                { event_id: '1', timestamp: '2026-01-15T10:00:00Z', category: 'note' },
                { event_id: '2', timestamp: '2026-01-15T11:00:00Z', category: 'watering' },
            ];

            mockHass.callWS.mockResolvedValue({
                test_growspace: mockEvents,
            });

            const result = await service.fetchGrowspaceEvents('test_growspace');

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_log',
                growspace_id: 'test_growspace',
                limit: 50,
            });
            expect(result).toEqual(mockEvents);
        });

        it('should use custom limit when provided', async () => {
            mockHass.callWS.mockResolvedValue({ test_growspace: [] });

            await service.fetchGrowspaceEvents('test_growspace', 100);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_log',
                growspace_id: 'test_growspace',
                limit: 100,
            });
        });

        it('should return empty array when response is null', async () => {
            mockHass.callWS.mockResolvedValue(null);

            const result = await service.fetchGrowspaceEvents('test_growspace');

            expect(result).toEqual([]);
        });

        it('should return empty array when growspace_id not in response', async () => {
            mockHass.callWS.mockResolvedValue({
                other_growspace: [],
            });

            const result = await service.fetchGrowspaceEvents('test_growspace');

            expect(result).toEqual([]);
        });

        it('should handle errors and return empty array', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockHass.callWS.mockRejectedValue(new Error('WS connection failed'));

            const result = await service.fetchGrowspaceEvents('test_growspace');

            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching growspace events:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('addPlantNote', () => {
        it('should add note with all fields provided', async () => {
            const payload: NotePayload = {
                notes: 'Test note',
                images: ['image1.jpg', 'image2.jpg'],
                tags: ['issue', 'deficiency'],
                transitionDate: '2026-01-15T10:00:00Z',
            };

            await service.addPlantNote('plant_123', payload);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/add_timeline_note',
                plant_id: 'plant_123',
                notes: 'Test note',
                images: ['image1.jpg', 'image2.jpg'],
                transition_date: '2026-01-15T10:00:00Z',
            });
        });

        it('should use empty array when images not provided', async () => {
            const payload: NotePayload = {
                notes: 'Test note without images',
            };

            await service.addPlantNote('plant_123', payload);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/add_timeline_note',
                plant_id: 'plant_123',
                notes: 'Test note without images',
                images: [],
                transition_date: expect.any(String), // Will be current timestamp
            });
        });

        it('should use current date when transitionDate not provided', async () => {
            const beforeDate = new Date().toISOString();

            const payload: NotePayload = {
                notes: 'Test note',
                images: [],
            };

            await service.addPlantNote('plant_123', payload);

            const call = mockHass.callWS.mock.calls[0][0];
            const afterDate = new Date().toISOString();

            expect(call.transition_date).toBeDefined();
            // Should be between before and after timestamps
            expect(call.transition_date >= beforeDate).toBe(true);
            expect(call.transition_date <= afterDate).toBe(true);
        });

        it('should handle note with only text', async () => {
            const payload: NotePayload = {
                notes: 'Simple note',
            };

            await service.addPlantNote('plant_456', payload);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/add_timeline_note',
                plant_id: 'plant_456',
                notes: 'Simple note',
                images: [],
                transition_date: expect.any(String),
            });
        });
    });

    describe('deleteEvent', () => {
        it('should delete event with string ID', async () => {
            await service.deleteEvent('event_123');

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/remove_timeline_event',
                event_id: 'event_123',
            });
        });

        it('should delete event with numeric ID', async () => {
            await service.deleteEvent(456);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/remove_timeline_event',
                event_id: 456,
            });
        });
    });

    describe('getTimelineService (singleton)', () => {
        it('should create new instance on first call', () => {
            const instance = getTimelineService(mockHass);
            expect(instance).toBeInstanceOf(TimelineService);
        });

        it('should return same instance for same HASS', () => {
            const instance1 = getTimelineService(mockHass);
            const instance2 = getTimelineService(mockHass);

            expect(instance1).toBe(instance2);
        });

        it('should create new instance when HASS changes', () => {
            const instance1 = getTimelineService(mockHass);

            const newMockHass = {
                callWS: vi.fn(),
            };
            const instance2 = getTimelineService(newMockHass);

            expect(instance1).not.toBe(instance2);
            expect((instance2 as any).hass).toBe(newMockHass);
        });

        it('should create new instance when no previous instance exists', () => {
            // Reset singleton
            (getTimelineService as any)._instance = null;

            const instance = getTimelineService(mockHass);
            expect(instance).toBeInstanceOf(TimelineService);
        });
    });
});
