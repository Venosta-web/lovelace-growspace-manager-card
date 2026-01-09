
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspaceLogbookController } from '../../src/controllers/growspace-logbook-controller';

describe('GrowspaceLogbookController', () => {
    let mockHass: any;
    let controller: GrowspaceLogbookController;

    beforeEach(() => {
        mockHass = {
            callWS: vi.fn()
        };
        controller = new GrowspaceLogbookController();
    });

    it('should initialize without hass (hass is passed to methods)', () => {
        // Controller no longer stores hass - it's passed to fetchEventLog
        expect(controller).toBeDefined();
    });

    describe('fetchEventLog', () => {
        beforeEach(() => {
            vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.spyOn(console, 'warn').mockImplementation(() => { });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should return empty array if hass is missing', async () => {
            const res = await controller.fetchEventLog(undefined as any, 'd1');
            expect(res).toEqual([]);
        });

        it('should call websocket and return events', async () => {
            const events = [{ message: 'Event 1' }];
            mockHass.callWS.mockResolvedValue({ 'd1': events });

            const res = await controller.fetchEventLog(mockHass, 'd1');

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_log',
                growspace_id: 'd1'
            });
            expect(res).toEqual(events);
        });

        it('should return empty array when response lacks requested growspaceId', async () => {
            mockHass.callWS.mockResolvedValue({ 'other_id': [{ message: 'Event' }] });

            const res = await controller.fetchEventLog(mockHass, 'd1');

            expect(res).toEqual([]);
        });

        it('should handle errors gracefully', async () => {
            mockHass.callWS.mockRejectedValue(new Error('WS Error'));

            // Should catch and return empty array
            const res = await controller.fetchEventLog(mockHass, 'd1');

            expect(res).toEqual([]);
        });
    });
});
