import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FocusTrapController } from '../../../../../src/features/shared/controllers/focus-trap.controller';
import type { ReactiveControllerHost } from 'lit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTarget(focusFn = vi.fn()): HTMLElement {
  return { focus: focusFn } as unknown as HTMLElement;
}

function makeHost(shadowTarget: HTMLElement | null = null): ReactiveControllerHost & HTMLElement {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
    shadowRoot: {
      querySelector: vi.fn().mockReturnValue(shadowTarget),
    },
    focus: vi.fn(),
  } as unknown as ReactiveControllerHost & HTMLElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FocusTrapController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers itself with the host', () => {
    const host = makeHost();
    new FocusTrapController(host, { selector: '.focus-me' });
    expect(host.addController).toHaveBeenCalledOnce();
  });

  describe('hostConnected', () => {
    it('stores document.activeElement as previousFocus by default', () => {
      const prev = makeTarget();
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(prev as unknown as Element);
      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x' });

      ctrl.hostConnected();

      // Verify by manually restoring and checking the stored element gets focused
      ctrl.restoreFocus();
      expect(prev.focus).toHaveBeenCalled();
    });

    it('does not store previousFocus when restoreFocus is false', () => {
      const prev = makeTarget();
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(prev as unknown as Element);
      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x', restoreFocus: false });

      ctrl.hostConnected();
      ctrl.restoreFocus(); // should be a no-op

      expect(prev.focus).not.toHaveBeenCalled();
    });

    it('calls focusTarget immediately when delay is 0', () => {
      const target = makeTarget();
      const host = makeHost(target);
      const ctrl = new FocusTrapController(host, { selector: '.x', delay: 0 });

      ctrl.hostConnected();
      vi.advanceTimersByTime(0);

      expect(target.focus).toHaveBeenCalled();
    });

    it('calls focusTarget after the specified delay', () => {
      const target = makeTarget();
      const host = makeHost(target);
      const ctrl = new FocusTrapController(host, { selector: '.x', delay: 200 });

      ctrl.hostConnected();
      expect(target.focus).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(target.focus).toHaveBeenCalled();
    });

    it('does not call focusTarget before the delay elapses', () => {
      const target = makeTarget();
      const host = makeHost(target);
      const ctrl = new FocusTrapController(host, { selector: '.x', delay: 300 });

      ctrl.hostConnected();
      vi.advanceTimersByTime(299);

      expect(target.focus).not.toHaveBeenCalled();
    });
  });

  describe('focusTarget', () => {
    it('queries the shadow root with the given selector and focuses the element', () => {
      const target = makeTarget();
      const host = makeHost(target);
      const ctrl = new FocusTrapController(host, { selector: '.my-input' });

      ctrl.focusTarget();

      expect((host.shadowRoot as any).querySelector).toHaveBeenCalledWith('.my-input');
      expect(target.focus).toHaveBeenCalled();
    });

    it('does nothing when the selector matches no element', () => {
      const host = makeHost(null); // querySelector returns null
      const ctrl = new FocusTrapController(host, { selector: '.missing' });

      expect(() => ctrl.focusTarget()).not.toThrow();
    });

    it('does nothing when the matched element has no focus method', () => {
      const noFocus = {} as HTMLElement; // no .focus
      const host = makeHost(noFocus);
      const ctrl = new FocusTrapController(host, { selector: '.x' });

      expect(() => ctrl.focusTarget()).not.toThrow();
    });
  });

  describe('hostDisconnected', () => {
    it('restores focus to the previously active element via requestAnimationFrame', () => {
      const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 0;
      });

      const prev = makeTarget();
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(prev as unknown as Element);

      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x' });

      ctrl.hostConnected();
      ctrl.hostDisconnected();

      expect(raf).toHaveBeenCalled();
      expect(prev.focus).toHaveBeenCalled();
    });

    it('does not restore focus when restoreFocus is false', () => {
      const raf = vi.spyOn(window, 'requestAnimationFrame');
      const prev = makeTarget();
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(prev as unknown as Element);

      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x', restoreFocus: false });

      ctrl.hostConnected();
      ctrl.hostDisconnected();

      expect(raf).not.toHaveBeenCalled();
      expect(prev.focus).not.toHaveBeenCalled();
    });

    it('does not throw when previousFocus was never set', () => {
      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x', restoreFocus: false });

      expect(() => ctrl.hostDisconnected()).not.toThrow();
    });
  });

  describe('restoreFocus', () => {
    it('focuses the stored previousFocus element', () => {
      const prev = makeTarget();
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(prev as unknown as Element);

      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x' });

      ctrl.hostConnected();
      ctrl.restoreFocus();

      expect(prev.focus).toHaveBeenCalled();
    });

    it('is a no-op when previousFocus was never captured', () => {
      const host = makeHost();
      const ctrl = new FocusTrapController(host, { selector: '.x', restoreFocus: false });

      ctrl.hostConnected();
      expect(() => ctrl.restoreFocus()).not.toThrow();
    });
  });
});
