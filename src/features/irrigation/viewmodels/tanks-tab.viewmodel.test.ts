/**
 * Tanks Tab ViewModel — the hold notes and the staleness window (GSM#790).
 *
 * The row formatting and the merge helper's older behaviour live in
 * `tests/unit/features/irrigation/viewmodels/tanks-tab.viewmodel.spec.ts`.
 */
import { describe, expect, it } from 'vitest';
import { atom, type ReadableAtom } from 'nanostores';
import type { HomeAssistant } from 'custom-card-helpers';
import { createGrowspaceDevice } from '../../../services/types';
import type { GrowspaceDevice, IrrigationTank } from '../../../services/types';
import { createInitialSM, type DialogSM } from '../../../dialogs/irrigation-dialog-sm';
import { deriveSafetyView } from '../../../slices/safety';
import {
  createTanksTabViewModel,
  deriveTankHolds,
  mergeTankDraft,
  type TankHoldVM,
} from './tanks-tab.viewmodel';

const NOW = Date.parse('2026-09-24T10:12:00Z');

/** A growspace `flower` whose controller is in `state` for `reasons`. */
function hassWithController(
  state: string,
  reasons: { code: string; detail: string; since: string }[]
): HomeAssistant {
  return {
    states: {
      'sensor.flower_irrigation_controller': {
        state,
        attributes: {
          reasons,
          fault_id: null,
          requires_ack: false,
          since: reasons[0]?.since ?? null,
        },
      },
    },
    entities: {
      'sensor.flower_irrigation_controller': {
        platform: 'growspace_manager',
        device_id: 'dev-flower',
        translation_key: 'irrigation_controller',
      },
    },
    devices: { 'dev-flower': { identifiers: [['growspace_manager', 'flower']] } },
  } as unknown as HomeAssistant;
}

const UNKNOWN = {
  code: 'tank_unknown',
  detail: 'Irrigation skipped: Reservoir has had no usable level for 14 minutes',
  since: '2026-09-24T10:00:00Z',
};

function tank(overrides: Partial<IrrigationTank> = {}): IrrigationTank {
  return {
    sensorEntity: 'sensor.reservoir',
    name: 'Reservoir',
    warningLevel: 20,
    fillLevel: 40,
    isWarning: false,
    ...overrides,
  };
}

describe('deriveTankHolds', () => {
  it('says why irrigation is held on a tank, and since when', () => {
    const view = deriveSafetyView('flower', hassWithController('inhibited', [UNKNOWN]));
    expect(deriveTankHolds(view, NOW)).toEqual<TankHoldVM[]>([
      {
        code: 'tank_unknown',
        heading: 'Irrigation held · Tank level unknown',
        detail: UNKNOWN.detail,
        since: 'since 12 minutes ago',
      },
    ]);
  });

  it('leaves out the reasons a tank setting cannot fix', () => {
    const view = deriveSafetyView(
      'flower',
      hassWithController('inhibited', [
        { code: 'sensor_stale:sensor.moisture', detail: 'Moisture silent', since: UNKNOWN.since },
        { code: 'dark', detail: 'Lights off', since: UNKNOWN.since },
        { code: 'tank_low', detail: 'Reservoir at 8 %', since: UNKNOWN.since },
      ])
    );
    expect(deriveTankHolds(view, NOW).map((h) => h.code)).toEqual(['tank_low']);
  });

  it('drops the time rather than print one it cannot parse', () => {
    const view = deriveSafetyView(
      'flower',
      hassWithController('inhibited', [{ ...UNKNOWN, since: 'not a time' }])
    );
    expect(deriveTankHolds(view, NOW)[0].since).toBeNull();
  });

  it('is empty unless the controller is held', () => {
    expect(deriveTankHolds(null, NOW)).toEqual([]);
    const running = deriveSafetyView('flower', hassWithController('running', [UNKNOWN]));
    expect(deriveTankHolds(running, NOW)).toEqual([]);
  });
});

describe('createTanksTabViewModel holds', () => {
  function vmWith($holds?: ReadableAtom<TankHoldVM[]>) {
    return createTanksTabViewModel(
      atom<DialogSM>(createInitialSM()),
      atom(new Map([['gs1', [tank({ fillLevel: null })]]])),
      atom<string[]>([]),
      atom<GrowspaceDevice | undefined>(createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent' })),
      $holds
    );
  }

  it('passes the hold notes through, and re-derives when they change', () => {
    const $holds = atom<TankHoldVM[]>([]);
    const $vm = vmWith($holds);
    expect($vm.get().holds).toEqual([]);
    const hold: TankHoldVM = {
      code: 'tank_unknown',
      heading: 'Irrigation held · Tank level unknown',
      detail: 'Reservoir silent',
      since: null,
    };
    $holds.set([hold]);
    expect($vm.get().holds).toEqual([hold]);
  });

  it('has no holds when the shell supplies none', () => {
    expect(vmWith().get().holds).toEqual([]);
  });
});

describe('mergeTankDraft and the staleness window', () => {
  it('writes the edited window onto the tank being saved', () => {
    const merged = mergeTankDraft([tank({ staleAfterMinutes: 120 })], 0, {
      sensorEntity: 'sensor.reservoir',
      name: 'Reservoir',
      volumeLiters: null,
      warningLevel: 20,
      staleAfterMinutes: 0,
    });
    expect(merged[0].staleAfterMinutes).toBe(0);
  });
});
