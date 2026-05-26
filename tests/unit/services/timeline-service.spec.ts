import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimelineService, getTimelineService, type NotePayload } from '../../../src/services/timeline-service';


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
                { event_id: '2', timestamp: '2026-01-15T11:00:00Z', category: 'watering' },
                { event_id: '1', timestamp: '2026-01-15T10:00:00Z', category: 'note' },
            ];

            mockHass.callWS.mockImplementation(async (msg: any) => {
                if (msg.type === 'growspace_manager/get_log') {
                    return { test_growspace: mockEvents };
                }
                return { test_growspace: [] };
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



        it('should rethrow errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockHass.callWS.mockRejectedValue(new Error('WS connection failed'));

            await expect(service.fetchGrowspaceEvents('gs1')).rejects.toThrow('WS connection failed');

            expect(consoleErrorSpy).toHaveBeenCalled();
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

    describe('fetchPlantEvents', () => {
        it('should fetch plant events successfully', async () => {
            const mockLogs = [
                { event_id: '1', timestamp: '2026-01-15T10:00:00Z', category: 'note' },
            ];
            const mockAlerts = [
                { event_id: '2', timestamp: '2026-01-15T11:00:00Z', category: 'alert' },
            ];

            mockHass.callWS.mockImplementation(async (msg: any) => {
                if (msg.type === 'growspace_manager/get_log') {
                    return { plant_123: mockLogs };
                }
                return { plant_123: mockAlerts };
            });

            const result = await service.fetchPlantEvents('plant_123', 'gs_abc');

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_log',
                plant_id: 'plant_123',
                growspace_id: 'gs_abc',
                limit: 50,
            });
            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_alerts',
                plant_id: 'plant_123',
                growspace_id: 'gs_abc',
                limit: 300,
            });
            // Should be sorted newest first: alert (11:00) before log (10:00)
            expect(result[0].event_id).toBe('2');
            expect(result[1].event_id).toBe('1');
        });

        it('should use custom limit when provided', async () => {
            mockHass.callWS.mockResolvedValue({ plant_123: [] });

            await service.fetchPlantEvents('plant_123', 'gs_abc', 100);

            expect(mockHass.callWS).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 100 }),
            );
        });

        it('should return empty array when response is null', async () => {
            mockHass.callWS.mockResolvedValue(null);

            const result = await service.fetchPlantEvents('plant_123', 'gs_abc');

            expect(result).toEqual([]);
        });

        it('should return empty array when plant_id not in response', async () => {
            mockHass.callWS.mockResolvedValue({ other_plant: [] });

            const result = await service.fetchPlantEvents('plant_123', 'gs_abc');

            expect(result).toEqual([]);
        });

        it('should sort combined events by timestamp descending', async () => {
            const logs = [
                { event_id: 'a', timestamp: '2026-01-15T08:00:00Z', category: 'note' },
                { event_id: 'c', timestamp: '2026-01-15T12:00:00Z', category: 'note' },
            ];
            const alerts = [
                { event_id: 'b', timestamp: '2026-01-15T10:00:00Z', category: 'alert' },
            ];

            mockHass.callWS.mockImplementation(async (msg: any) => {
                if (msg.type === 'growspace_manager/get_log') return { p1: logs };
                return { p1: alerts };
            });

            const result = await service.fetchPlantEvents('p1', 'gs1');

            expect(result.map((e: any) => e.event_id)).toEqual(['c', 'b', 'a']);
        });

        it('should sort using start_time when timestamp is absent', async () => {
            const logs = [{ event_id: 'x', start_time: '2026-01-15T09:00:00Z', category: 'note' }];
            const alerts = [{ event_id: 'y', start_time: '2026-01-15T11:00:00Z', category: 'alert' }];

            mockHass.callWS.mockImplementation(async (msg: any) => {
                if (msg.type === 'growspace_manager/get_log') return { p2: logs };
                return { p2: alerts };
            });

            const result = await service.fetchPlantEvents('p2', 'gs1');

            expect(result[0].event_id).toBe('y');
            expect(result[1].event_id).toBe('x');
        });

        it('should rethrow errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockHass.callWS.mockRejectedValue(new Error('WS plant error'));

            await expect(service.fetchPlantEvents('plant_123', 'gs_abc')).rejects.toThrow('WS plant error');

            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('addGrowspaceNote', () => {
        it('should add growspace note with all fields', async () => {
            mockHass.callWS.mockResolvedValue(undefined);
            const payload: NotePayload = {
                notes: 'Tent A looking healthy',
                images: ['snap.jpg'],
            };

            await service.addGrowspaceNote('gs_tent_a', payload);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/add_growspace_note',
                growspace_id: 'gs_tent_a',
                notes: 'Tent A looking healthy',
                images: ['snap.jpg'],
            });
        });

        it('should use empty array when images not provided', async () => {
            mockHass.callWS.mockResolvedValue(undefined);
            const payload: NotePayload = { notes: 'No images attached' };

            await service.addGrowspaceNote('gs_tent_b', payload);

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/add_growspace_note',
                growspace_id: 'gs_tent_b',
                notes: 'No images attached',
                images: [],
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
            const instance2 = getTimelineService(newMockHass as any);

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
