/** Typed error codes returned by the backend WebSocket handlers (ADR 0005). */
export type ErrorCode =
  | 'coordinator_not_ready'
  | 'entity_not_found'
  | 'validation_failed'
  | 'internal_error'
  | 'rate_limited';

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
