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
import { setSelectedDeviceId } from '../../../slices/grid';
import { ConfigTab } from '../../../constants';
import type { GrowspaceDevice } from '../../../types';

function makeElement(device?: GrowspaceDevice): GrowspaceHeaderContainer {
  const el = document.createElement('growspace-header') as GrowspaceHeaderContainer;
  // The action handler only needs a truthy store and the bound device.
  (el as any).store = {
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
    setSelectedDeviceId(null);
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
      expect(dialog.payload.environmentData.selectedGrowspaceId).toBe('gs-1');
      // Deep-links to the lights-on input so #433 can scroll + pulse it.
      expect(dialog.payload.scrollToField).toBe('lightsOnTime');
    }
  });
});
