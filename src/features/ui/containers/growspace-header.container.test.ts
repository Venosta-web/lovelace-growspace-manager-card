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
import type { GrowspaceDevice } from '../../../types';

function makeElement(device?: GrowspaceDevice): GrowspaceHeaderContainer {
  const el = document.createElement('growspace-header') as GrowspaceHeaderContainer;
  // The action handler only needs a truthy store and the bound device.
  (el as any).store = { ui: { $selectedPlants: { get: () => new Set() } } };
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

  it('expands HEADER view to STANDARD when a chip activates its env graph', () => {
    const setViewMode = vi.fn();
    const el = makeElement();
    (el as any).store = {
      history: { toggleEnvGraph: () => true },
      ui: { $viewMode: { get: () => 'header' }, setViewMode },
    };

    (el as any)._handleToggleGraph(new CustomEvent('toggle-graph', { detail: { metric: 'temp' } }));

    expect(setViewMode).toHaveBeenCalledWith('standard');
  });
});
