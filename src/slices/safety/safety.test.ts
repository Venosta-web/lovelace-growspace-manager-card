import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';

import { callService } from '../../services/hass-call';
import {
  CONTROLLER_STATES,
  KNOWN_REASON_KINDS,
  acknowledgeFault,
  deriveSafetyView,
  emergencyStop,
  formatSince,
  reasonLabel,
  refusalMessage,
  resetSafety,
  resolveSafetyEntities,
  setIrrigationArmed,
  stateLabel,
  tankHoldReasons,
} from './index';
import { IrrigationControllerSchema } from './schema';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
}));

/** GSM's own contract fixture, `tests/fixtures/contract/irrigation_controller_v1.json`. */
const CONTRACT_FIXTURE = {
  state: 'fault',
  attributes: {
    reasons: [
      {
        code: 'fault_off_unconfirmed:switch.pump',
        detail: 'Pump remained on',
        since: '2026-09-23T10:00:00Z',
      },
    ],
    fault_id: 'fault-1',
    requires_ack: true,
    since: '2026-09-23T10:00:00Z',
  },
};

interface Controller {
  state: string;
  attributes: Record<string, unknown>;
}

function idle(): Controller {
  return {
    state: 'idle',
    attributes: { reasons: [], fault_id: null, requires_ack: false, since: null },
  };
}

function makeHass(
  controller: Controller | null = idle(),
  states: Record<string, string> = {},
  growspaceId = 'flower'
): HomeAssistant {
  const hassStates: Record<string, unknown> = {
    'switch.flower_irrigation_armed': { state: 'on', attributes: {} },
    'switch.flower_automation': { state: 'on', attributes: {} },
  };
  if (controller) {
    hassStates['sensor.flower_irrigation_controller'] = {
      ...controller,
      attributes: { friendly_name: 'Flower Irrigation Controller', ...controller.attributes },
    };
  }
  for (const [id, state] of Object.entries(states)) hassStates[id] = { state, attributes: {} };
  const entity = (translation_key: string, device_id = 'dev-flower') => ({
    platform: 'growspace_manager',
    device_id,
    translation_key,
  });
  return {
    states: hassStates,
    entities: {
      'sensor.flower_irrigation_controller': entity('irrigation_controller'),
      'switch.flower_irrigation_armed': entity('irrigation_armed'),
      'switch.flower_automation': entity('automation'),
      'button.flower_emergency_stop': entity('emergency_stop'),
      // Another growspace's controller, and a lookalike from another integration.
      'sensor.veg_irrigation_controller': entity('irrigation_controller', 'dev-veg'),
      'sensor.other_irrigation_controller': {
        platform: 'other',
        device_id: 'dev-flower',
        translation_key: 'irrigation_controller',
      },
    },
    devices: {
      'dev-flower': { identifiers: [['growspace_manager', growspaceId]] },
      'dev-veg': { identifiers: [['growspace_manager', 'veg']] },
    },
  } as unknown as HomeAssistant;
}

function controller(
  state: string,
  reasons: { code: string; detail?: string; since?: string }[] = []
): Controller {
  return {
    state,
    attributes: {
      reasons: reasons.map((r) => ({
        code: r.code,
        detail: r.detail ?? `${r.code} detail`,
        since: r.since ?? '2026-09-24T10:00:00Z',
      })),
      fault_id: state === 'fault' ? 'f-1' : null,
      requires_ack: state === 'fault' || state === 'emergency_stop',
      since: reasons[0]?.since ?? (reasons.length ? '2026-09-24T10:00:00Z' : null),
    },
  };
}

describe('the irrigation controller contract', () => {
  it('parses the backend contract fixture', () => {
    expect(IrrigationControllerSchema.parse(CONTRACT_FIXTURE)).toEqual(CONTRACT_FIXTURE);
  });

  it('strips the attributes Home Assistant adds rather than refusing them', () => {
    const parsed = IrrigationControllerSchema.parse({
      ...CONTRACT_FIXTURE,
      attributes: { ...CONTRACT_FIXTURE.attributes, friendly_name: 'x', options: [] },
    });
    expect(Object.keys(parsed.attributes).sort()).toEqual([
      'fault_id',
      'reasons',
      'requires_ack',
      'since',
    ]);
  });
});

describe('resolveSafetyEntities', () => {
  it('finds the growspace entities by translation key and device identifier', () => {
    expect(resolveSafetyEntities('flower', makeHass())).toEqual({
      controller: 'sensor.flower_irrigation_controller',
      automation: 'switch.flower_automation',
      irrigationArmed: 'switch.flower_irrigation_armed',
      emergencyStop: 'button.flower_emergency_stop',
    });
  });

  it('keeps growspaces apart', () => {
    expect(resolveSafetyEntities('veg', makeHass())).toEqual({
      controller: 'sensor.veg_irrigation_controller',
      automation: null,
      irrigationArmed: null,
      emergencyStop: null,
    });
  });

  it('is null for a growspace with no controller, as on a backend before GSM#783', () => {
    expect(resolveSafetyEntities('cure', makeHass())).toBeNull();
    expect(resolveSafetyEntities('flower', undefined)).toBeNull();
    expect(resolveSafetyEntities('flower', { states: {} } as unknown as HomeAssistant)).toBeNull();
  });
});

describe('deriveSafetyView', () => {
  it.each([
    ['idle', 'quiet'],
    ['ready', 'ok'],
    ['running', 'active'],
    ['inhibited', 'warning'],
    ['fault', 'danger'],
    ['emergency_stop', 'danger'],
  ])('renders %s with severity %s', (state, severity) => {
    const view = deriveSafetyView('flower', makeHass(controller(state)))!;
    expect(view.state).toBe(state);
    expect(view.severity).toBe(severity);
    expect(view.label).toBe(stateLabel(state as never));
  });

  it('names the state and the reason that decides it', () => {
    const view = deriveSafetyView(
      'flower',
      makeHass(controller('inhibited', [{ code: 'tank_unknown' }, { code: 'dark' }]))
    )!;
    expect(view.summary).toBe('Irrigation held · Tank level unknown');
    expect(view.reasons.map((r) => r.label)).toEqual(['Tank level unknown', 'Lights off']);
  });

  it('does not repeat the state as its own reason for an emergency stop', () => {
    const view = deriveSafetyView(
      'flower',
      makeHass(controller('emergency_stop', [{ code: 'emergency_stop' }]))
    )!;
    expect(view.summary).toBe('Emergency stop');
    expect(view.requiresAck).toBe(true);
  });

  it('splits an entity-scoped code into its kind and subject', () => {
    const view = deriveSafetyView('flower', makeHass(CONTRACT_FIXTURE, { 'switch.pump': 'off' }))!;
    expect(view.reasons[0]).toMatchObject({
      code: 'fault_off_unconfirmed:switch.pump',
      kind: 'fault_off_unconfirmed',
      subject: 'switch.pump',
      label: 'Pump did not turn off',
    });
    expect(view.summary).toBe('Irrigation fault · Pump did not turn off');
  });

  it('lists the fault outputs that do not read OFF, a missing entity included', () => {
    const on = deriveSafetyView('flower', makeHass(CONTRACT_FIXTURE, { 'switch.pump': 'on' }))!;
    expect(on.faultOutputs).toEqual(['switch.pump']);
    expect(on.faultOutputsNotOff).toEqual(['switch.pump']);

    const missing = deriveSafetyView('flower', makeHass(CONTRACT_FIXTURE))!;
    expect(missing.faultOutputsNotOff).toEqual(['switch.pump']);

    const off = deriveSafetyView('flower', makeHass(CONTRACT_FIXTURE, { 'switch.pump': 'off' }))!;
    expect(off.faultOutputsNotOff).toEqual([]);
  });

  it('checks every configured pump when the safety record itself is unreadable', () => {
    const view = deriveSafetyView(
      'flower',
      makeHass(controller('fault', [{ code: 'fault_record_unreadable' }]), {
        'switch.feed': 'off',
        'switch.drain': 'on',
      }),
      ['switch.feed', 'switch.drain', null]
    )!;
    expect(view.faultOutputs).toEqual(['switch.feed', 'switch.drain']);
    expect(view.faultOutputsNotOff).toEqual(['switch.drain']);
  });

  it('shows a controller it cannot read as unavailable, never as idle', () => {
    const unavailable = { state: 'unavailable', attributes: {} };
    const view = deriveSafetyView('flower', makeHass(unavailable))!;
    expect(view.state).toBe('unavailable');
    expect(view.label).toBe('Safety state unavailable');
    expect(view.reasons).toEqual([]);
  });

  it('reads the arming and automation switches', () => {
    const hass = makeHass(idle(), { 'switch.flower_irrigation_armed': 'off' });
    const view = deriveSafetyView('flower', hass)!;
    expect(view.irrigationArmed).toBe(false);
    expect(view.automationEnabled).toBe(true);
  });

  it('is null when the backend publishes no controller', () => {
    expect(deriveSafetyView('flower', makeHass(null, {}, 'other'))).toBeNull();
  });
});

describe('labels', () => {
  it('has a localized label for every controller state', () => {
    for (const state of [...CONTROLLER_STATES, 'unavailable' as const]) {
      const label = stateLabel(state);
      expect(label, state).not.toBe(`safety.state_${state}`);
      expect(label.length, state).toBeGreaterThan(0);
    }
  });

  it('has a localized label for every reason code', () => {
    const labels = KNOWN_REASON_KINDS.map((kind) => reasonLabel(`${kind}:switch.x`));
    labels.forEach((label, i) => expect(label, KNOWN_REASON_KINDS[i]).not.toMatch(/^safety\./));
    expect(labels.filter((l) => l.startsWith('Unrecognised'))).toEqual([]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('names a code it does not know instead of hiding it', () => {
    expect(reasonLabel('runoff_ec_halt:sensor.runoff')).toBe(
      'Unrecognised reason (runoff_ec_halt)'
    );
  });
});

describe('tankHoldReasons', () => {
  it('returns the tank and sensor reasons of a held controller', () => {
    const view = deriveSafetyView(
      'flower',
      makeHass(
        controller('inhibited', [
          { code: 'tank_unknown' },
          { code: 'sensor_stale:sensor.tank' },
          { code: 'dark' },
        ])
      )
    );
    expect(tankHoldReasons(view).map((r) => r.kind)).toEqual(['tank_unknown', 'sensor_stale']);
  });

  it('is empty unless the controller is held', () => {
    expect(tankHoldReasons(null)).toEqual([]);
    expect(tankHoldReasons(deriveSafetyView('flower', makeHass(controller('ready'))))).toEqual([]);
  });
});

describe('formatSince', () => {
  const now = Date.parse('2026-09-24T12:00:00Z');

  it('reads as relative time', () => {
    expect(formatSince('2026-09-24T11:48:00Z', now)).toBe('12 minutes ago');
    expect(formatSince('2026-09-24T09:00:00Z', now)).toBe('3 hours ago');
    expect(formatSince('2026-09-21T12:00:00Z', now)).toBe('3 days ago');
  });

  it('says nothing about an instant it cannot read', () => {
    expect(formatSince(null, now)).toBeNull();
    expect(formatSince('not a date', now)).toBeNull();
  });
});

describe('operator controls', () => {
  beforeEach(() => vi.mocked(callService).mockClear());

  it('calls each safety service for one growspace', async () => {
    await emergencyStop('flower');
    await resetSafety('flower');
    await acknowledgeFault('flower');
    expect(vi.mocked(callService).mock.calls).toEqual([
      ['growspace_manager', 'emergency_stop', { growspace_id: 'flower' }],
      ['growspace_manager', 'reset_safety', { growspace_id: 'flower' }],
      ['growspace_manager', 'acknowledge_fault', { growspace_id: 'flower' }],
    ]);
  });

  it('never sends a growspace-less emergency stop, which would stop every growspace', () => {
    expect(() => emergencyStop('')).toThrow();
    expect(callService).not.toHaveBeenCalled();
  });

  it('arms and disarms through the switch', async () => {
    await setIrrigationArmed('switch.flower_irrigation_armed', true);
    await setIrrigationArmed('switch.flower_irrigation_armed', false);
    expect(vi.mocked(callService).mock.calls).toEqual([
      ['switch', 'turn_on', { entity_id: 'switch.flower_irrigation_armed' }],
      ['switch', 'turn_off', { entity_id: 'switch.flower_irrigation_armed' }],
    ]);
  });

  it('reads the refusal Home Assistant rejects with', () => {
    expect(
      refusalMessage({
        code: 'service_validation_error',
        message: 'Cannot acknowledge irrigation fault; outputs not confirmed OFF: switch.pump',
      })
    ).toBe('Cannot acknowledge irrigation fault; outputs not confirmed OFF: switch.pump');
    expect(refusalMessage(new Error('boom'))).toBe('boom');
    expect(refusalMessage('plain')).toBe('plain');
  });
});
