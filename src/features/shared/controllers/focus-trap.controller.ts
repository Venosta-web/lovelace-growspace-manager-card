/**
 * Focus Trap Controller - Manages focus for dialogs and modals
 *
 * Automatically focuses an element on connect and restores focus on disconnect
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface FocusTrapOptions {
  /**
   * CSS selector for element to focus
   */
  selector: string;

  /**
   * Whether to restore focus to previous element on disconnect (default: true)
   */
  restoreFocus?: boolean;

  /**
   * Delay before focusing in ms (default: 0)
   */
  delay?: number;
}

/**
 * Reactive controller for focus management
 */
export class FocusTrapController implements ReactiveController {
  private previousFocus?: HTMLElement;

  constructor(
    private host: ReactiveControllerHost & HTMLElement,
    private options: FocusTrapOptions
  ) {
    this.host.addController(this);
  }

  hostConnected(): void {
    // Store current focus
    if (this.options.restoreFocus !== false) {
      this.previousFocus = document.activeElement as HTMLElement;
    }

    // Focus target element after a brief delay (allows DOM to settle)
    const delay = this.options.delay ?? 0;

    setTimeout(() => {
      this.focusTarget();
    }, delay);
  }

  hostDisconnected(): void {
    // Restore focus to previous element
    if (this.options.restoreFocus !== false && this.previousFocus) {
      requestAnimationFrame(() => {
        this.previousFocus?.focus();
      });
    }
  }

  /**
   * Focus the target element
   */
  focusTarget(): void {
    const element = this.host.shadowRoot?.querySelector(this.options.selector) as HTMLElement;

    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }

  /**
   * Manually restore focus to previous element
   */
  restoreFocus(): void {
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }
}
