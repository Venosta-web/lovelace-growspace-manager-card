import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GrowspaceSharedStore } from './growspace-shared-store';
import { GrowspaceStore } from './growspace-store';
import { strainLibrary$, setStrainLibrary } from '../../slices/strain';
import { devices$, setDevices } from '../../slices/grid';

describe('GrowspaceStore.$dialogHostState', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    store = new GrowspaceStore(new GrowspaceSharedStore());
  });

  afterEach(() => {
    setStrainLibrary([]);
    setDevices([]);
  });

  it('exposes $dialogHostState as a computed atom', () => {
    expect(store.$dialogHostState).toBeDefined();
    expect(typeof store.$dialogHostState.get).toBe('function');
  });

  it('includes activeDialog, devices, selectedDevice, and strainLibrary', () => {
    const state = store.$dialogHostState.get();
    expect(state).toHaveProperty('activeDialog');
    expect(state).toHaveProperty('devices');
    expect(state).toHaveProperty('selectedDevice');
    expect(state).toHaveProperty('strainLibrary');
  });

  it('reflects default values', () => {
    const state = store.$dialogHostState.get();
    expect(state.activeDialog).toEqual({ type: 'NONE' });
    expect(state.devices).toEqual([]);
    expect(state.selectedDevice).toBeNull();
    expect(state.strainLibrary).toEqual([]);
  });

  it('updates when activeDialog changes', () => {
    store.ui.$activeDialog.set({ type: 'ADD_PLANT', payload: { row: 0, col: 0 } });
    expect(store.$dialogHostState.get().activeDialog.type).toBe('ADD_PLANT');
  });

  it('updates when devices change', () => {
    const device = { deviceId: 'gs1', name: 'GrowSpace 1', plants: [] } as any;
    setDevices([device]);
    expect(store.$dialogHostState.get().devices).toHaveLength(1);
  });

  it('updates when selectedDevice changes', () => {
    store.grid.$selectedDevice.set('gs1');
    expect(store.$dialogHostState.get().selectedDevice).toBe('gs1');
  });

  it('updates when strainLibrary changes', () => {
    const strain = { id: 'strain1', name: 'Test Strain' } as any;
    strainLibrary$.set([strain]);
    expect(store.$dialogHostState.get().strainLibrary).toHaveLength(1);
  });
});
