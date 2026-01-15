import { HomeAssistant } from 'custom-card-helpers';

/**
 * Base class for all API services.
 * Provides shared functionality for WebSocket communication and service calls.
 */
export abstract class BaseAPI {
    protected hass!: HomeAssistant;

    constructor(hass?: HomeAssistant) {
        if (hass) {
            this.hass = hass;
        }
    }

    /**
     * Update the Home Assistant instance.
     * Called when hass object changes.
     */
    updateHass(hass: HomeAssistant): void {
        this.hass = hass;
    }

    /**
     * Call a Home Assistant service.
     * @param domain - Service domain (e.g., 'growspace_manager')
     * @param service - Service name (e.g., 'add_plant')
     * @param serviceData - Service data payload
     */
    protected async callService(
        domain: string,
        service: string,
        serviceData: Record<string, unknown>
    ): Promise<void> {
        await this.hass.callService(domain, service, serviceData);
    }

    /**
     * Send a WebSocket message to Home Assistant.
     * @param type - WebSocket message type
     * @param data - Additional data to include in the message
     * @returns Response data or null on error
     */
    protected async sendWebSocket<T>(
        type: string,
        data?: Record<string, unknown>
    ): Promise<T | null> {
        try {
            return await this.hass.callWS<T>({ type, ...data });
        } catch (error) {
            console.error(`WebSocket call ${type} failed:`, error);
            return null;
        }
    }
}
