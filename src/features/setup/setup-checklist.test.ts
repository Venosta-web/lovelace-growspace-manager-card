import { describe, expect, it } from 'vitest';
import {
  createGrowspaceDevice,
  type EnvironmentAttributes,
  type GrowspaceDevice,
} from '../../services/types';
import type { SetupModule } from '../../slices/growspace';
import type { PlantEntity } from '../../features/plants/types';
import { deriveSetupChecklist, isModuleDone, type SetupStepId } from './setup-checklist';

const ctx = { aiEnabled: null, tcPresent: false };
const plant = { entity_id: 'sensor.p1' } as unknown as PlantEntity;

// The modules GSM stamps per preset (GSM ADR-0064), mirrored here only to prove
// the checklist follows whatever arrives; the card owns no copy of the table.
const STAMPS: Record<string, Record<string, boolean>> = {
  simple_soil_tent: { lights: true, air: true, climate: true, irrigation: false, substrate: true },
  coco_crop_steering: { lights: true, air: true, climate: true, irrigation: true, substrate: true },
  hydroponic_room: { lights: true, air: true, climate: true, irrigation: true, substrate: false },
  mother_clone_room: {
    lights: true,
    air: true,
    climate: true,
    irrigation: false,
    substrate: false,
  },
  drying_room: { lights: false, air: true, climate: true, irrigation: false, substrate: false },
  curing_room: { lights: false, air: false, climate: true, irrigation: false, substrate: false },
};

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent', ...overrides });
}

const LIT = { lightSensors: ['sensor.light'] };
const AIRED = { exhaustFanEntities: ['fan.exhaust'] };

function offeredIds(d: GrowspaceDevice): SetupStepId[] {
  return deriveSetupChecklist(d, ctx)
    .steps.filter((s) => s.offered)
    .map((s) => s.id);
}

describe('deriveSetupChecklist', () => {
  it.each(Object.entries(STAMPS))('%s offers exactly its stamped modules', (preset, modules) => {
    const d = device({ setupPreset: preset, setupModules: modules });
    const expected = [
      ...Object.entries(modules)
        .filter(([, on]) => on)
        .map(([m]) => m),
      'plants',
    ];
    expect(offeredIds(d).sort()).toEqual(expected.sort());
  });

  it('offers every module when nothing was ever stamped', () => {
    expect(offeredIds(device())).toEqual([
      'lights',
      'air',
      'climate',
      'irrigation',
      'substrate',
      'plants',
    ]);
  });

  it('keeps a stamped growspace open until every offered core step is done', () => {
    const base = { setupPreset: 'simple_soil_tent', setupModules: STAMPS.simple_soil_tent };
    expect(deriveSetupChecklist(device(base), ctx).visible).toBe(true);

    const litAndAired = device({ ...base, environmentAttributes: { ...LIT, ...AIRED } });
    expect(deriveSetupChecklist(litAndAired, ctx).visible).toBe(true);

    const done = device({
      ...base,
      environmentAttributes: { ...LIT, ...AIRED },
      plants: [plant],
    });
    const checklist = deriveSetupChecklist(done, ctx);
    expect(checklist.ready).toBe(true);
    expect(checklist.visible).toBe(false);
  });

  it('never lets an optional module block Dashboard ready', () => {
    const d = device({
      setupPreset: 'coco_crop_steering',
      setupModules: STAMPS.coco_crop_steering,
      environmentAttributes: { ...LIT, ...AIRED },
      plants: [plant],
    });
    const checklist = deriveSetupChecklist(d, ctx);

    expect(checklist.steps.filter((s) => s.role === 'optional' && !s.done)).toHaveLength(3);
    expect(checklist.ready).toBe(true);
  });

  it('drops a core step the grower stopped offering', () => {
    const d = device({
      setupPreset: 'simple_soil_tent',
      setupModules: { ...STAMPS.simple_soil_tent, lights: false },
      environmentAttributes: AIRED,
      plants: [plant],
    });
    expect(deriveSetupChecklist(d, ctx).ready).toBe(true);
  });

  it('only needs plants in a curing room', () => {
    const d = device({ setupPreset: 'curing_room', setupModules: STAMPS.curing_room });
    expect(deriveSetupChecklist(d, ctx).visible).toBe(true);
    expect(deriveSetupChecklist({ ...d, plants: [plant] }, ctx).visible).toBe(false);
  });

  describe('a growspace that was never stamped', () => {
    it('shows the checklist while it is fresh', () => {
      expect(deriveSetupChecklist(device(), ctx).visible).toBe(true);
    });

    it('does not show it over plants that are already growing', () => {
      expect(deriveSetupChecklist(device({ plants: [plant] }), ctx).visible).toBe(false);
    });

    it('does not show it once anything is mapped', () => {
      expect(deriveSetupChecklist(device({ environmentAttributes: AIRED }), ctx).visible).toBe(
        false
      );
    });

    it('follows the room a canonical growspace reports', () => {
      const dry = device({ deviceId: 'dry', setupModules: STAMPS.drying_room });
      expect(offeredIds(dry)).toEqual(['air', 'climate', 'plants']);
      expect(deriveSetupChecklist(dry, ctx).visible).toBe(true);
    });
  });

  it('replaces the grid with no plants and sits above it once there are some', () => {
    const base = { setupPreset: 'drying_room', setupModules: STAMPS.drying_room };
    expect(deriveSetupChecklist(device(base), ctx).placement).toBe('replace-grid');
    expect(deriveSetupChecklist(device({ ...base, plants: [plant] }), ctx).placement).toBe('panel');
  });

  it('lists the extras separately, and TC only where it is installed', () => {
    const d = device({
      environmentAttributes: {
        visionCheckupConfig: {
          enabled: true,
          early_check_offset_minutes: 30,
          mid_check_hours: 6,
          late_check_offset_minutes: 30,
        },
      },
    });
    expect(deriveSetupChecklist(d, { aiEnabled: true, tcPresent: false }).extras).toEqual([
      { id: 'ai', ready: true },
      { id: 'vision', ready: true },
      { id: 'labels', ready: null },
    ]);
    expect(
      deriveSetupChecklist(d, { aiEnabled: false, tcPresent: true }).extras.map((e) => e.id)
    ).toEqual(['ai', 'vision', 'labels', 'tc']);
  });
});

describe('isModuleDone', () => {
  it.each([
    ['lights', { growlightEntities: ['light.led'] }],
    ['lights', { lightSensor: 'sensor.lux' }],
    ['air', { circulationFanEntities: ['fan.clip'] }],
    ['air', { exhaustEntity: 'fan.exhaust' }],
    ['climate', { dehumidifierEntities: ['humidifier.dehu'] }],
    ['climate', { humidifierEntity: 'humidifier.hum' }],
    ['substrate', { poreEcSensors: ['sensor.pore_ec'] }],
    ['substrate', { soilMoistureSensors: ['sensor.vwc'] }],
  ] as Array<[SetupModule, EnvironmentAttributes]>)('%s is done by %j', (module, env) => {
    expect(isModuleDone(device({ environmentAttributes: env }), module)).toBe(true);
    expect(isModuleDone(device(), module)).toBe(false);
  });

  it('counts irrigation done once a pump is wired', () => {
    const wired = device({
      irrigationConfig: {
        irrigationTimes: [],
        drainTimes: [],
        irrigationPumpEntity: 'switch.pump',
      },
    });
    expect(isModuleDone(wired, 'irrigation')).toBe(true);
    expect(isModuleDone(device(), 'irrigation')).toBe(false);
  });

  it('ignores empty lists', () => {
    expect(
      isModuleDone(device({ environmentAttributes: { growlightEntities: [] } }), 'lights')
    ).toBe(false);
  });
});
