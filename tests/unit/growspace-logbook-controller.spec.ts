
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrowspaceLogbookController } from '../../src/controllers/growspace-logbook-controller';

describe('GrowspaceLogbookController', () => {
    let mockHass: any;
    let controller: GrowspaceLogbookController;

    beforeEach(() => {
        mockHass = {
            callWS: vi.fn()
        };
        controller = new GrowspaceLogbookController(mockHass);
    });

    it('should initialize with hass', () => {
        expect((controller as any).hass).toBe(mockHass);
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
            const ctrl = new GrowspaceLogbookController(undefined as any);
            const res = await ctrl.fetchEventLog('d1');
            expect(res).toEqual([]);
        });

        it('should call websocket and return events', async () => {
            const events = [{ message: 'Event 1' }];
            mockHass.callWS.mockResolvedValue({ 'd1': events });

            const res = await controller.fetchEventLog('d1');

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/get_log',
                growspace_id: 'd1'
            });
            expect(res).toEqual(events);
        });

        it('should handle errors gracefully', async () => {
            mockHass.callWS.mockRejectedValue(new Error('WS Error'));

            // Should catch and return empty array
            const res = await controller.fetchEventLog('d1');

            expect(res).toEqual([]);
        });
    });
});
