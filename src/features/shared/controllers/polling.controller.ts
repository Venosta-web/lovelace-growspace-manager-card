/**
 * Polling Controller - Manages periodic execution with automatic cleanup
 *
 * Implements Lit's ReactiveController interface for automatic lifecycle management
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface PollingOptions {
  /**
   * Polling interval in milliseconds
   */
  interval: number;

  /**
   * Whether to call callback immediately on start (default: false)
   */
  immediate?: boolean;

  /**
   * Whether to start polling automatically on connect (default: true)
   */
  autoStart?: boolean;
}

/**
 * Reactive controller for polling operations
 */
export class PollingController implements ReactiveController {
  private intervalId?: number;
  private isRunning = false;

  constructor(
    private host: ReactiveControllerHost,
    private callback: () => void | Promise<void>,
    private options: PollingOptions
  ) {
    this.host.addController(this);
  }

  hostConnected(): void {
    if (this.options.autoStart !== false) {
      this.start();
    }
  }

  hostDisconnected(): void {
    this.stop();
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Call immediately if requested
    if (this.options.immediate) {
      this.callback();
    }

    // Start interval
    this.intervalId = window.setInterval(() => {
      this.callback();
    }, this.options.interval);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Restart polling with current options
   */
  restart(): void {
    this.stop();
    this.start();
  }

  /**
   * Check if currently polling
   */
  get running(): boolean {
    return this.isRunning;
  }
}
