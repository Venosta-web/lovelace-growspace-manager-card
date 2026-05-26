
import { HomeAssistant } from 'custom-card-helpers';
import { describe, it, expect, vi } from 'vitest';
import { BaseAPI, WSError } from '../../../src/services/base-api';

class TestAPI extends BaseAPI {
    constructor(hass?: HomeAssistant) {
        super(hass);
    }

    public async testCallService(
        domain: string,
        service: string,
        serviceData: Record<string, unknown>
    ): Promise<void> {
        await this.callService(domain, service, serviceData);
    }

    public async testSendWebSocket<T>(
        type: string,
        data?: Record<string, unknown>
    ): Promise<T> {
        return this.sendWebSocket<T>(type, data);
    }

    public async testSendWebSocketSafe<T>(
        type: string,
        data?: Record<string, unknown>
    ): Promise<T | null> {
        return this.sendWebSocketSafe<T>(type, data);
    }
}

describe('BaseAPI', () => {
    const hass = {
        callService: vi.fn(),
        callWS: vi.fn(),
    } as unknown as HomeAssistant;

    it('should construct with hass', () => {
        const api = new TestAPI(hass);
        expect(api['hass']).toBe(hass);
    });

    it('should construct without hass', () => {
        const api = new TestAPI();
        expect(api['hass']).toBeUndefined();
    });

    it('should update hass', () => {
        const api = new TestAPI();
        api.updateHass(hass);
        expect(api['hass']).toBe(hass);
    });

    it('should call a service', async () => {
        const api = new TestAPI(hass);
        await api.testCallService('domain', 'service', { key: 'value' });
        expect(hass.callService).toHaveBeenCalledWith('domain', 'service', { key: 'value' });
    });

    it('should send a websocket message and return data', async () => {
        const api = new TestAPI(hass);
        (hass.callWS as ReturnType<typeof vi.fn>).mockResolvedValue({ result: 'success' });
        const result = await api.testSendWebSocket('test_type', { key: 'value' });
        expect(hass.callWS).toHaveBeenCalledWith({ type: 'test_type', key: 'value' });
        expect(result).toEqual({ result: 'success' });
    });

    it('should throw WSError when websocket call fails with a plain Error', async () => {
        const api = new TestAPI(hass);
        (hass.callWS as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('WS Error'));
        await expect(api.testSendWebSocket('test_type', { key: 'value' })).rejects.toBeInstanceOf(WSError);
    });

    it('should throw WSError with typed code when backend returns a structured error', async () => {
        const api = new TestAPI(hass);
        (hass.callWS as ReturnType<typeof vi.fn>).mockRejectedValue({
            code: 'coordinator_not_ready',
            message: 'Integration not loaded',
        });
        await expect(api.testSendWebSocket('test_type')).rejects.toMatchObject({
            code: 'coordinator_not_ready',
            message: 'Integration not loaded',
        });
    });

    it('should return null via sendWebSocketSafe when websocket call fails', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const api = new TestAPI(hass);
        (hass.callWS as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('WS Error'));
        const result = await api.testSendWebSocketSafe('test_type', { key: 'value' });
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'WebSocket call test_type failed [internal_error]:',
            'WS Error'
        );
        consoleErrorSpy.mockRestore();
    });

    it('should return data via sendWebSocketSafe on success', async () => {
        const api = new TestAPI(hass);
        (hass.callWS as ReturnType<typeof vi.fn>).mockResolvedValue({ result: 'ok' });
        const result = await api.testSendWebSocketSafe('test_type', { key: 'value' });
        expect(result).toEqual({ result: 'ok' });
    });

    it('should log plain error and return null when sendWebSocket throws a non-WSError', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const api = new TestAPI(hass);
        const rawError = { weird: 'structure' };
        // Bypass sendWebSocket wrapping by spying on the protected method directly
        vi.spyOn(api as any, 'sendWebSocket').mockRejectedValue(rawError);

        const result = await api.testSendWebSocketSafe('test_type');

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith('WebSocket call test_type failed:', rawError);
        consoleErrorSpy.mockRestore();
    });
});
