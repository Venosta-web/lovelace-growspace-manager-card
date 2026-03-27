import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraAPI } from '../../../../src/services/api/camera-api';
import { WS_TYPE_CAPTURE_SNAPSHOT, WS_TYPE_GET_SNAPSHOTS } from '../../../../src/constants';

describe('CameraAPI', () => {
    let api: CameraAPI;
    let sendMessagePromise: ReturnType<typeof vi.fn>;
    let mockHass: any;

    beforeEach(() => {
        api = new CameraAPI();
        sendMessagePromise = vi.fn();
        mockHass = {
            connection: { sendMessagePromise },
        };
    });

    // ── captureSnapshot ───────────────────────────────────────────────────────

    describe('captureSnapshot', () => {
        it('returns null when hass is not set', async () => {
            const result = await api.captureSnapshot('gs1');
            expect(result).toBeNull();
            expect(sendMessagePromise).not.toHaveBeenCalled();
        });

        it('sends correct websocket message and returns response', async () => {
            const mockResponse = { growspace_id: 'gs1', timestamp: '2024-01-01', snapshots: ['/path/snap.jpg'] };
            sendMessagePromise.mockResolvedValue(mockResponse);
            api.updateHass(mockHass);

            const result = await api.captureSnapshot('gs1');

            expect(sendMessagePromise).toHaveBeenCalledWith({
                type: WS_TYPE_CAPTURE_SNAPSHOT,
                growspace_id: 'gs1',
            });
            expect(result).toEqual(mockResponse);
        });

        it('rethrows errors from the websocket call', async () => {
            const error = new Error('Camera offline');
            sendMessagePromise.mockRejectedValue(error);
            api.updateHass(mockHass);

            await expect(api.captureSnapshot('gs1')).rejects.toThrow('Camera offline');
        });
    });

    // ── getSnapshots ──────────────────────────────────────────────────────────

    describe('getSnapshots', () => {
        it('returns null when hass is not set', async () => {
            const result = await api.getSnapshots('gs1');
            expect(result).toBeNull();
            expect(sendMessagePromise).not.toHaveBeenCalled();
        });

        it('sends correct message with default limit and offset', async () => {
            const mockResponse = { growspace_id: 'gs1', snapshots: [], total: 0 };
            sendMessagePromise.mockResolvedValue(mockResponse);
            api.updateHass(mockHass);

            const result = await api.getSnapshots('gs1');

            expect(sendMessagePromise).toHaveBeenCalledWith({
                type: WS_TYPE_GET_SNAPSHOTS,
                growspace_id: 'gs1',
                limit: 50,
                offset: 0,
            });
            expect(result).toEqual(mockResponse);
        });

        it('sends correct message with custom limit and offset', async () => {
            const mockResponse = {
                growspace_id: 'gs2',
                snapshots: [{ path: '/p', filename: 'f.jpg', timestamp: '2024-01-01' }],
                total: 1,
            };
            sendMessagePromise.mockResolvedValue(mockResponse);
            api.updateHass(mockHass);

            const result = await api.getSnapshots('gs2', 10, 20);

            expect(sendMessagePromise).toHaveBeenCalledWith({
                type: WS_TYPE_GET_SNAPSHOTS,
                growspace_id: 'gs2',
                limit: 10,
                offset: 20,
            });
            expect(result).toEqual(mockResponse);
        });

        it('rethrows errors from the websocket call', async () => {
            const error = new Error('WS Fail');
            sendMessagePromise.mockRejectedValue(error);
            api.updateHass(mockHass);

            await expect(api.getSnapshots('gs1')).rejects.toThrow('WS Fail');
        });
    });
});
