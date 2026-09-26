import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistant } from 'custom-card-helpers';

import { callService } from '../../src/services/hass-call';
import { deriveSafetyView, type SafetyView } from '../../src/slices/safety';
import type { GrowspaceSafetyChip } from '../../src/features/safety/components/growspace-safety-chip';
import type { GrowspaceHeaderUI } from '../../src/features/ui/components/growspace-header-ui';
import type { GrowspaceDevice } from '../../src/types';
import '../../src/features/safety/components/growspace-safety-chip';
import '../../src/features/ui/components/growspace-header-ui';

vi.mock('../../src/services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn(),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

function hassWith(
  state: string,
  reasons: { code: string; detail: string }[] = [],
  states: Record<string, string> = {}
): HomeAssistant {
  const entity = (translation_key: string) => ({
    platform: 'growspace_manager',
    device_id: 'dev-flower',
    translation_key,
  });
  return {
    language: 'en',
    user: { is_admin: true },
    states: {
      'sensor.flower_irrigation_controller': {
        state,
        attributes: {
          reasons: reasons.map((r) => ({ ...r, since: '2026-09-24T10:00:00Z' })),
          fault_id: state === 'fault' ? 'f-1' : null,
          requires_ack: state === 'fault' || state === 'emergency_stop',
          since: reasons.length ? '2026-09-24T10:00:00Z' : null,
        },
      },
      'switch.flower_irrigation_armed': { state: states.armed ?? 'on', attributes: {} },
      'switch.flower_automation': { state: 'on', attributes: {} },
      ...Object.fromEntries(
        Object.entries(states)
          .filter(([id]) => id.includes('.'))
          .map(([id, s]) => [id, { state: s, attributes: {} }])
      ),
    },
    entities: {
      'sensor.flower_irrigation_controller': entity('irrigation_controller'),
      'switch.flower_irrigation_armed': entity('irrigation_armed'),
      'switch.flower_automation': entity('automation'),
      'button.flower_emergency_stop': entity('emergency_stop'),
    },
    devices: { 'dev-flower': { identifiers: [['growspace_manager', 'flower']] } },
  } as unknown as HomeAssistant;
}

function viewOf(...args: Parameters<typeof hassWith>): SafetyView {
  return deriveSafetyView('flower', hassWith(...args))!;
}

async function renderChip(view: SafetyView, isAdmin = true): Promise<GrowspaceSafetyChip> {
  return fixture<GrowspaceSafetyChip>(html`
    <growspace-safety-chip .view=${view} .isAdmin=${isAdmin}></growspace-safety-chip>
  `);
}

function $(chip: GrowspaceSafetyChip, selector: string): HTMLElement | null {
  return chip.shadowRoot!.querySelector<HTMLElement>(selector);
}

/** The clock the chip reads; each tap lands after the controls have settled. */
let clock = 0;

async function tap(
  chip: GrowspaceSafetyChip,
  selector: string,
  { settled = true } = {}
): Promise<void> {
  if (settled) clock += 1000;
  const target = $(chip, selector);
  expect(target, selector).not.toBeNull();
  target!.click();
  await chip.updateComplete;
  // Let an awaited service call settle and the component re-render.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await chip.updateComplete;
}

describe('growspace-safety-chip', () => {
  beforeEach(() => {
    clock = Date.parse('2026-09-24T12:00:00Z');
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    vi.mocked(callService).mockReset();
    vi.mocked(callService).mockResolvedValue(undefined);
  });

  it('shows the state and its deciding reason, coloured by severity', async () => {
    const chip = await renderChip(
      viewOf('inhibited', [
        { code: 'tank_unknown', detail: "tank 'Main' level is unknown (unavailable)" },
      ])
    );
    const button = $(chip, 'button.chip')!;
    expect(button.textContent).toContain('Irrigation held · Tank level unknown');
    expect(button.classList).toContain('severity-warning');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-label')).toBe(
      'Irrigation safety: Irrigation held · Tank level unknown. Open details.'
    );
  });

  it('opens the structured reasons on tap', async () => {
    const chip = await renderChip(
      viewOf('fault', [{ code: 'fault_off_unconfirmed:switch.pump', detail: 'Pump remained on' }], {
        'switch.pump': 'off',
      })
    );
    expect($(chip, 'ha-dialog')).toBeNull();
    await tap(chip, 'button.chip');

    const reason = $(chip, 'li[data-code="fault_off_unconfirmed:switch.pump"]')!;
    expect(reason.textContent).toContain('Pump did not turn off');
    expect(reason.textContent).toContain('Pump remained on');
    expect(reason.textContent).toContain('switch.pump');
    // "Since" is said once, on the status line, when the reason began with the state.
    expect(reason.textContent).not.toContain('since');
    expect($(chip, '.status')!.textContent).toMatch(/since 2 hours ago/);
  });

  it('reaches the emergency stop in two taps, and asks once before acting', async () => {
    const chip = await renderChip(viewOf('ready'));
    await tap(chip, 'button.chip');
    await tap(chip, '[data-action="emergency_stop"]');

    expect(callService).not.toHaveBeenCalled();
    expect($(chip, '[role="group"]')!.textContent).toContain(
      'Stop every output in this growspace now?'
    );

    await tap(chip, '[data-action="confirm_emergency_stop"]');
    expect(callService).toHaveBeenCalledWith('growspace_manager', 'emergency_stop', {
      growspace_id: 'flower',
    });
  });

  it('ignores a confirmation tapped before it has settled under the pointer', async () => {
    const chip = await renderChip(viewOf('ready'));
    await tap(chip, 'button.chip');
    await tap(chip, '[data-action="emergency_stop"]');
    await tap(chip, '[data-action="confirm_emergency_stop"]', { settled: false });
    expect(callService).not.toHaveBeenCalled();

    await tap(chip, '[data-action="confirm_emergency_stop"]');
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('does not let the tap that stopped the growspace also reset it', async () => {
    const chip = await renderChip(
      viewOf('emergency_stop', [{ code: 'emergency_stop', detail: 'Operator emergency stop' }])
    );
    await tap(chip, 'button.chip');
    // The backend has just latched: the state changed under the open detail.
    chip.view = viewOf('emergency_stop', [
      { code: 'emergency_stop', detail: 'Operator emergency stop' },
    ]);
    chip.view = { ...chip.view, state: 'ready' };
    await chip.updateComplete;
    chip.view = viewOf('emergency_stop', [
      { code: 'emergency_stop', detail: 'Operator emergency stop' },
    ]);
    await chip.updateComplete;
    await tap(chip, '[data-action="reset"]', { settled: false });
    expect(callService).not.toHaveBeenCalled();
  });

  it('offers no arming control while an emergency stop overrides it', async () => {
    const chip = await renderChip(
      viewOf('emergency_stop', [{ code: 'emergency_stop', detail: 'Operator emergency stop' }])
    );
    await tap(chip, 'button.chip');
    expect($(chip, '[data-action="disarm"]')).toBeNull();
    expect($(chip, '.controls')!.textContent).not.toContain('armed');
  });

  it('can back out of the emergency stop', async () => {
    const chip = await renderChip(viewOf('ready'));
    await tap(chip, 'button.chip');
    await tap(chip, '[data-action="emergency_stop"]');
    await tap(chip, '[data-action="cancel_emergency_stop"]');
    expect(callService).not.toHaveBeenCalled();
    expect($(chip, '[data-action="emergency_stop"]')).not.toBeNull();
  });

  it('keeps acknowledge disabled while an affected output reads ON, and says why', async () => {
    const chip = await renderChip(
      viewOf('fault', [{ code: 'fault_off_unconfirmed:switch.pump', detail: 'Pump remained on' }], {
        'switch.pump': 'on',
      })
    );
    await tap(chip, 'button.chip');
    const acknowledge = $(chip, '[data-action="acknowledge"]') as HTMLButtonElement;
    expect(acknowledge.disabled).toBe(true);
    const why = $(chip, '#acknowledge-why')!;
    expect(why.textContent).toContain('Turn off switch.pump first');
    expect(acknowledge.getAttribute('aria-describedby')).toBe('acknowledge-why');
  });

  it('acknowledges once every affected output reads OFF', async () => {
    const chip = await renderChip(
      viewOf('fault', [{ code: 'fault_off_unconfirmed:switch.pump', detail: 'Pump remained on' }], {
        'switch.pump': 'off',
      })
    );
    await tap(chip, 'button.chip');
    await tap(chip, '[data-action="acknowledge"]');
    expect(callService).toHaveBeenCalledWith('growspace_manager', 'acknowledge_fault', {
      growspace_id: 'flower',
    });
  });

  it('shows the backend refusal in words', async () => {
    vi.mocked(callService).mockRejectedValueOnce({
      code: 'service_validation_error',
      message: 'Cannot reset safety; outputs not confirmed safe: fan.exhaust',
    });
    const chip = await renderChip(
      viewOf('emergency_stop', [{ code: 'emergency_stop', detail: 'Operator emergency stop' }])
    );
    await tap(chip, 'button.chip');
    expect($(chip, '[data-action="emergency_stop"]')).toBeNull();
    await tap(chip, '[data-action="reset"]');

    expect($(chip, '[role="alert"]')!.textContent).toBe(
      'Refused: Cannot reset safety; outputs not confirmed safe: fan.exhaust'
    );
  });

  it('disables the admin-only controls for everyone else, and says why', async () => {
    const chip = await renderChip(
      viewOf('emergency_stop', [{ code: 'emergency_stop', detail: 'Operator emergency stop' }]),
      false
    );
    await tap(chip, 'button.chip');
    const reset = $(chip, '[data-action="reset"]') as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    expect($(chip, '#reset-why')!.textContent).toContain('administrator');
  });

  it('arms and disarms irrigation', async () => {
    const chip = await renderChip(viewOf('ready', [], { armed: 'on' }));
    await tap(chip, 'button.chip');
    expect($(chip, '.controls')!.textContent).toContain('Automatic irrigation is armed.');
    await tap(chip, '[data-action="disarm"]');
    expect(callService).toHaveBeenCalledWith('switch', 'turn_off', {
      entity_id: 'switch.flower_irrigation_armed',
    });

    const disarmed = await renderChip(
      viewOf('inhibited', [{ code: 'irrigation_disarmed', detail: 'x' }], { armed: 'off' })
    );
    await tap(disarmed, 'button.chip');
    await tap(disarmed, '[data-action="arm"]');
    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', {
      entity_id: 'switch.flower_irrigation_armed',
    });
  });

  it('renders nothing on a backend that publishes no controller', async () => {
    const chip = await fixture<GrowspaceSafetyChip>(
      html`<growspace-safety-chip .view=${null}></growspace-safety-chip>`
    );
    expect($(chip, 'button')).toBeNull();
  });
});

describe('the main-card header', () => {
  it('carries the safety chip beside the growspace name', async () => {
    const device = {
      deviceId: 'flower',
      name: 'Flower room',
      plants: [],
    } as unknown as GrowspaceDevice;
    const hass = hassWith('fault', [
      { code: 'fault_on_command_failed:switch.pump', detail: '3 consecutive cycles' },
    ]);
    const header = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .hass=${hass}
        .device=${device}
        .deviceId=${'flower'}
        .safety=${deriveSafetyView('flower', hass)}
      ></growspace-header-ui>
    `);
    const chip = header.shadowRoot!.querySelector<GrowspaceSafetyChip>(
      '.header-title-row growspace-safety-chip'
    )!;
    await chip.updateComplete;
    expect(chip.isAdmin).toBe(true);
    expect(chip.shadowRoot!.querySelector('button.chip')!.textContent).toContain(
      'Irrigation fault · Pump would not start'
    );
  });
});
