/**
 * Growspace Header Container Tests
 *
 * The header's cog menu dispatches `action-triggered` events that the container
 * turns into dialog-open calls. These tests lock the wiring for each action.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceHeaderContainer } from './growspace-header.container';
import './growspace-header.container';
import { activeDialog$, __resetUiSliceForTests } from '../../../slices/ui';
import { resetTcPresence, tcPresence$ } from '../../../slices/tc';
import { ConfigTab } from '../../../constants';
import type { GrowspaceDevice } from '../../../types';

function makeElement(device?: GrowspaceDevice): GrowspaceHeaderContainer {
  const el = document.createElement('growspace-header') as GrowspaceHeaderContainer;
  // The action handler only needs a truthy store, its instance id and the
  // bound device.
  (el as any).store = {
    instanceId: 'gs-store-7',
    ui: { $selectedPlants: { get: () => new Set() }, dismissFlowerFlip: vi.fn() },
  };
  if (device) el.device = device;
  return el;
}

function triggerAction(el: GrowspaceHeaderContainer, action: string) {
  (el as any)._handleActionTriggered(new CustomEvent('action-triggered', { detail: { action } }));
}

describe('GrowspaceHeaderContainer – cog menu actions', () => {
  beforeEach(() => {
    __resetUiSliceForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the LOGBOOK dialog for this card’s device even when no device is globally selected', () => {
    const el = makeElement({ deviceId: 'gs-1' } as GrowspaceDevice);

    triggerAction(el, 'logbook');

    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('LOGBOOK');
    if (dialog.type === 'LOGBOOK') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
    }
  });

  it('opens the TC dialog with the bound growspace and this card’s portal', () => {
    const el = makeElement({ deviceId: 'gs-1' } as GrowspaceDevice);

    triggerAction(el, 'tc');

    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('TC');
    if (dialog.type === 'TC') {
      expect(dialog.payload.growspaceId).toBe('gs-1');
      expect(dialog.payload.portalId).toBe('gs-store-7');
      // An ordinary open names no tab, so the dialog leads with the worklist.
      expect(dialog.payload.initialTab).toBeUndefined();
    }
  });

  it('flower-flip chip opens the CONFIG dialog on the Growlights tab (ADR-0026)', () => {
    const el = makeElement({ deviceId: 'gs-1' } as GrowspaceDevice);

    (el as any)._handleFlowerFlipClick(
      new CustomEvent('flower-flip-click', {
        detail: { growspaceId: 'gs-1', flowerStart: '2026-07-05' },
      })
    );

    const dialog = activeDialog$.get();
    expect(dialog.type).toBe('CONFIG');
    if (dialog.type === 'CONFIG') {
      expect(dialog.payload.currentTab).toBe(ConfigTab.GROWLIGHT);
      expect(dialog.payload.growspaceId).toBe('gs-1');
      // Deep-links to the lights-on input so #433 can scroll + pulse it.
      expect(dialog.payload.scrollToField).toBe('lightsOnTime');
    }
  });

  it('expands HEADER view to STANDARD when a chip activates its env graph', () => {
    const setViewMode = vi.fn();
    const el = makeElement();
    (el as any).store = {
      history: { toggleEnvGraph: () => true },
      ui: { $viewMode: { get: () => 'header' }, setViewMode },
      grid: { $selectedDevice: { get: () => null } },
    };

    (el as any)._handleToggleGraph(new CustomEvent('toggle-graph', { detail: { metric: 'temp' } }));

    expect(setViewMode).toHaveBeenCalledWith('standard');
  });
});

// ---------------------------------------------------------------------------
// The TC menu item appears when the probe resolves (workspace #152 / ADR 0057)
// ---------------------------------------------------------------------------

describe('GrowspaceHeaderContainer – TC presence reaches the menu', () => {
  beforeEach(() => {
    __resetUiSliceForTests();
    resetTcPresence();
  });

  afterEach(() => {
    resetTcPresence();
    vi.restoreAllMocks();
  });

  it('subscribes, so the probe resolving on an idle dashboard re-renders the header', async () => {
    const el = makeElement({ deviceId: 'gs-1' } as GrowspaceDevice);
    // Connected for real, because a `StoreController` only subscribes while its
    // host is: the two page-global atoms the container reads on connect are the
    // whole of what this needs from the store.
    const atom = (value: unknown) => ({ get: () => value, subscribe: () => () => {} });
    (el as any).store = {
      ...(el as any).store,
      $headerState: atom({ devices: [], nutrientInventory: null }),
      $headerActionsState: atom({
        viewMode: 'standard',
        isEditMode: false,
        selectedPlants: new Set(),
        taskState: { kind: 'idle' },
      }),
    };
    document.body.appendChild(el);
    try {
      expect((el as any)._tcPresenceController.value.status).toBe('unknown');

      const notified = vi.spyOn(el, 'requestUpdate');
      // Nothing else changes: no entity update, no hydration, no re-render
      // trigger of any other kind. A bare `.get()` in render never sees this.
      tcPresence$.set({
        status: 'present',
        manifest: {
          contract_version: 1,
          integration_version: '0.1.0',
          features: ['culture_lines'],
          collections: {},
        },
      });
      await Promise.resolve();

      expect(notified).toHaveBeenCalled();
      expect((el as any)._tcPresenceController.value.status).toBe('present');
    } finally {
      el.remove();
    }
  });
});
