import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { HeaderDragController } from '../../../src/controllers/header-drag-controller';
import { ReactiveControllerHost } from 'lit';

// Mock DragEvent for jsdom if needed
beforeAll(() => {
  if (!(globalThis as any).DragEvent) {
    (globalThis as any).DragEvent = class extends Event {
      dataTransfer: DataTransfer | null = null;
      constructor(type: string, init?: any) {
        super(type, init);
        if (init?.dataTransfer) {
          this.dataTransfer = init.dataTransfer;
        }
      }
    } as any;
  }

  if (!(globalThis as any).DataTransfer) {
    (globalThis as any).DataTransfer = class {
      data: Record<string, string> = {};
      effectAllowed = 'none';
      setData(type: string, value: string) {
        this.data[type] = value;
      }
      getData(type: string) {
        return this.data[type] || '';
      }
    } as any;
  }
});

describe('HeaderDragController', () => {
  let mockHost: ReactiveControllerHost;
  let controller: HeaderDragController;

  beforeEach(() => {
    mockHost = {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    } as any;

    controller = new HeaderDragController(mockHost);
  });

  describe('Initialization', () => {
    it('should add itself to the host on construction', () => {
      expect(mockHost.addController).toHaveBeenCalledWith(controller);
    });
  });

  describe('handleDragStart', () => {
    it('should set draggedMetric and update host', () => {
      const dt = new DataTransfer();
      const e = new DragEvent('dragstart', { dataTransfer: dt });

      controller.handleDragStart(e, 'temp');

      expect(controller.draggedMetric).toBe('temp');
      expect(e.dataTransfer).not.toBeNull();
      expect(e.dataTransfer!.getData('text/plain')).toBe('temp');
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });

    it('should handle missing dataTransfer gracefully', () => {
      const e = new DragEvent('dragstart');
      Object.defineProperty(e, 'dataTransfer', { value: null });

      controller.handleDragStart(e, 'humidity');

      expect(controller.draggedMetric).toBe('humidity');
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });

    it('should handle null event gracefully', () => {
      controller.handleDragStart(null as any, 'vpd');

      expect(controller.draggedMetric).toBe('vpd');
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });
  });

  describe('handleDragOver', () => {
    it('should prevent default to allow dropping', () => {
      const e = new DragEvent('dragover');
      const preventSpy = vi.spyOn(e, 'preventDefault');

      controller.handleDragOver(e);

      expect(preventSpy).toHaveBeenCalled();
    });
  });

  describe('handleDrop', () => {
    it('should link metrics and reset draggedMetric on success', () => {
      const onLink = vi.fn();
      const e = new DragEvent('drop');
      const preventSpy = vi.spyOn(e, 'preventDefault');

      // Start drag first
      controller.handleDragStart(null as any, 'temp');
      vi.clearAllMocks();

      controller.handleDrop(e, 'humidity', onLink);

      expect(preventSpy).toHaveBeenCalled();
      expect(onLink).toHaveBeenCalledWith('temp', 'humidity');
      expect(controller.draggedMetric).toBeNull();
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });

    it('should return early and reset if target is same as source', () => {
      const onLink = vi.fn();
      const e = new DragEvent('drop');

      controller.handleDragStart(null as any, 'temp');
      vi.clearAllMocks();

      controller.handleDrop(e, 'temp', onLink);

      expect(onLink).not.toHaveBeenCalled();
      expect(controller.draggedMetric).toBeNull();
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });

    it('should handle drop without preceding drag start', () => {
      const onLink = vi.fn();
      const e = new DragEvent('drop');

      controller.handleDrop(e, 'humidity', onLink);

      expect(onLink).not.toHaveBeenCalled();
      expect(controller.draggedMetric).toBeNull();
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });

    it('should handle null event in handleDrop', () => {
      const onLink = vi.fn();
      
      controller.handleDragStart(null as any, 'temp');
      vi.clearAllMocks();

      controller.handleDrop(null as any, 'humidity', onLink);

      expect(onLink).toHaveBeenCalledWith('temp', 'humidity');
      expect(controller.draggedMetric).toBeNull();
      expect(mockHost.requestUpdate).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should have hostConnected and hostDisconnected placeholders', () => {
      // These are empty but should exist for interface compliance
      expect(() => controller.hostConnected()).not.toThrow();
      expect(() => controller.hostDisconnected()).not.toThrow();
    });
  });
});
