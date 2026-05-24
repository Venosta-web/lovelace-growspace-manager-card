import { HomeAssistant } from 'custom-card-helpers';

/** Typed error codes returned by the backend WebSocket handlers (ADR 0005). */
export type ErrorCode =
  | 'coordinator_not_ready'
  | 'entity_not_found'
  | 'validation_failed'
  | 'internal_error';

/** Thrown when the backend sends a structured error response over WebSocket. */
export class WSError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'WSError';
  }
}

function isHassWSError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

const KNOWN_ERROR_CODES = new Set<ErrorCode>([
  'coordinator_not_ready',
  'entity_not_found',
  'validation_failed',
  'internal_error',
]);

function toErrorCode(raw: string): ErrorCode {
  return KNOWN_ERROR_CODES.has(raw as ErrorCode) ? (raw as ErrorCode) : 'internal_error';
}

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
  ): Promise<any> {
    return await this.hass.callService(domain, service, serviceData);
  }

  /**
   * Send a WebSocket message and throw a typed WSError on backend errors.
   *
   * Use this for mutations where callers need to react to specific error codes.
   * The thrown WSError carries a typed `code` field (one of the ErrorCode values)
   * so `withAction` and other error boundaries can surface meaningful messages.
   *
   * @param type - WebSocket message type
   * @param data - Additional data to include in the message
   * @throws WSError with a typed code when the backend returns an error response
   */
  protected async sendWebSocket<T>(
    type: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await this.hass.callWS<T>({ type, ...data });
    } catch (error: unknown) {
      if (isHassWSError(error)) {
        throw new WSError(toErrorCode(error.code), error.message);
      }
      throw new WSError('internal_error', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Send a WebSocket message and return null on any error (query pattern).
   *
   * Use this for data-fetching calls where null is a safe sentinel and the caller
   * already handles absent data gracefully. Errors are logged with their typed code
   * but not re-thrown — use `sendWebSocket` when you need the error to propagate.
   *
   * @param type - WebSocket message type
   * @param data - Additional data to include in the message
   * @returns Response data, or null if the request failed
   */
  protected async sendWebSocketSafe<T>(
    type: string,
    data?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      return await this.sendWebSocket<T>(type, data);
    } catch (error: unknown) {
      if (error instanceof WSError) {
        console.error(`WebSocket call ${type} failed [${error.code}]:`, error.message);
      } else {
        console.error(`WebSocket call ${type} failed:`, error);
      }
      return null;
    }
  }
}
