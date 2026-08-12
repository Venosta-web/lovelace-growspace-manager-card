import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { createGrowspaceDevice } from '../../../src/services/types';

function device(deviceId: string) {
  return createGrowspaceDevice({ deviceId, name: deviceId, rows: 4, plantsPerRow: 4 });
}

describe('config dialog unsaved-changes gestures', () => {
  let element: ConfigDialog;

  beforeEach(async () => {
    element = new ConfigDialog();
    element.hass = { states: {}, services: {} } as any;
    element.devices = [device('gs1'), device('gs2')];
    element.growspaceOptions = { gs1: 'Growspace 1', gs2: 'Growspace 2' };
    element.growspaceId = 'gs1';
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it('switches tabs immediately when the environment draft is clean', () => {
    (element as any)._switchTab(ConfigTab.CLIMATE);

    expect(element.currentTab).toBe(ConfigTab.CLIMATE);
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('prompts before switching tabs when dirty and performs the pending switch on discard', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];

    (element as any)._switchTab(ConfigTab.CLIMATE);
    await element.updateComplete;

    expect(element.currentTab).toBe(ConfigTab.SENSORS);
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();

    (element as any)._confirmDiscard();

    expect(element.currentTab).toBe(ConfigTab.CLIMATE);
    expect((element as any).envTemperatureSensors).toEqual([]);
  });

  it('closes immediately when Escape is pressed with a clean draft', () => {
    const close = vi.fn();
    element.addEventListener('close', close);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(close).toHaveBeenCalledOnce();
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('prompts instead of closing on Escape when dirty and closes after discard', async () => {
    const close = vi.fn();
    element.addEventListener('close', close);
    (element as any).envTemperatureSensors = ['sensor.changed'];

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await element.updateComplete;

    expect(close).not.toHaveBeenCalled();
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();

    (element as any)._confirmDiscard();

    expect(close).toHaveBeenCalledOnce();
  });

  it('changes growspace immediately when the environment draft is clean', () => {
    (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs2' } });

    expect((element as any).envSelectedId).toBe('gs2');
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('prompts before changing growspace when dirty and cancellation preserves the draft', () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];

    (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs2' } });

    expect((element as any).envSelectedId).toBe('gs1');
    expect((element as any).envTemperatureSensors).toEqual(['sensor.changed']);

    (element as any)._cancelDiscard();

    expect((element as any).envSelectedId).toBe('gs1');
    expect((element as any).envTemperatureSensors).toEqual(['sensor.changed']);
  });

  it('applies the pending growspace change after discard', () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];
    (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs2' } });

    (element as any)._confirmDiscard();

    expect((element as any).envSelectedId).toBe('gs2');
    expect((element as any).envTemperatureSensors).toEqual([]);
    expect((element as any)._sm.status.kind).toBe('idle');
  });
});
