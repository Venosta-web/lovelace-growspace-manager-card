
import { HomeAssistant } from 'custom-card-helpers';
import { describe, it, expect, vi } from 'vitest';
import { BaseAPI } from '../../../src/services/base-api';

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
    ): Promise<T | null> {
        return await this.sendWebSocket<T>(type, data);
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
        (hass.callWS as vi.Mock).mockResolvedValue({ result: 'success' });
        const result = await api.testSendWebSocket('test_type', { key: 'value' });
        expect(hass.callWS).toHaveBeenCalledWith({ type: 'test_type', key: 'value' });
        expect(result).toEqual({ result: 'success' });
    });

    it('should return null when websocket call fails', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const api = new TestAPI(hass);
        (hass.callWS as vi.Mock).mockRejectedValue(new Error('WS Error'));
        const result = await api.testSendWebSocket('test_type', { key: 'value' });
        expect(hass.callWS).toHaveBeenCalledWith({ type: 'test_type', key: 'value' });
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith('WebSocket call test_type failed:', new Error('WS Error'));
        consoleErrorSpy.mockRestore();
    });
});
