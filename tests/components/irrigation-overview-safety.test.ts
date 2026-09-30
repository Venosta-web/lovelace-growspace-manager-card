import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { makeOverviewVm } from '../unit/features/irrigation/components/overview-vm-fixtures';
import { createGrowspaceDevice } from '../../src/services/types';
import type { IrrigationDialog } from '../../src/dialogs/irrigation-dialog';
import '../../src/dialogs/irrigation-dialog';
import type { HomeAssistant } from 'custom-card-helpers';
import { deriveSafetyView } from '../../src/slices/safety';
import type { IrrigationOverviewTab } from '../../src/features/irrigation/components/irrigation-overview-tab';
import '../../src/features/irrigation/components/irrigation-overview-tab';

function controllerHass(state: string, code: string, zone_name?: string): HomeAssistant {
  return {
    language: 'en',
    states: {
      'sensor.controller': {
        state,
        attributes: {
          reasons: [{ code, detail: 'Backend context', since: '2026-09-30T10:00:00Z', zone_name }],
          fault_id: state === 'fault' ? 'f-1' : null,
          requires_ack: state === 'fault',
          since: '2026-09-30T10:00:00Z',
        },
      },
    },
    entities: {
      'sensor.controller': {
        platform: 'growspace_manager',
        device_id: 'd',
        translation_key: 'irrigation_controller',
      },
    },
    devices: { d: { identifiers: [['growspace_manager', 'flower']] } },
  } as unknown as HomeAssistant;
}

function safety(state: string, code: string, zone_name?: string) {
  return deriveSafetyView(
    'flower',
    controllerHass(state, code, zone_name),
    [],
    'en',
    'Flower Tent'
  );
}

describe('Overview safety banners', () => {
  it.each([
    [
      'inhibited',
      'probe_unresponsive',
      'Probe not responding',
      'Check the probe is in the pot and the emitter is dripping.',
    ],
    ['fault', 'zone_migration_invalid', 'Invalid irrigation zones', 'Pre-Migration Copy'],
  ])('renders %s / %s even without steering metrics', async (state, code, label, advice) => {
    const el = await fixture<IrrigationOverviewTab>(
      html`<irrigation-overview-tab .safetyView=${safety(state, code)}></irrigation-overview-tab>`
    );
    const banner = el.shadowRoot!.querySelector('.safety-banner')!;
    expect(banner.textContent).toContain(label);
    expect(banner.textContent).toContain(advice);
    expect(banner.textContent).toContain('Backend context');
    expect(banner.classList.contains('danger')).toBe(state === 'fault');
    if (code === 'zone_migration_invalid') {
      expect(banner.textContent).toContain('Flower Tent');
      expect(banner.textContent).toContain('Repairs');
    }
    expect(el.shadowRoot!.textContent).toContain('Crop steering data is currently unavailable');
  });

  it('keeps the banner above available steering diagnostics', async () => {
    const el = await fixture<IrrigationOverviewTab>(
      html`<irrigation-overview-tab
        .vm=${makeOverviewVm()}
        .safetyView=${safety('inhibited', 'probe_unresponsive')}
      ></irrigation-overview-tab>`
    );
    expect(el.shadowRoot!.querySelector('.safety-banner')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.cs-metric-grid')).not.toBeNull();
  });

  it('receives live controller updates and the growspace name from the dialog shell', async () => {
    const el = await fixture<IrrigationDialog>(
      html`<irrigation-dialog
        .open=${true}
        .device=${createGrowspaceDevice({
          deviceId: 'flower',
          name: 'Flower Tent',
          environmentAttributes: { soilMoistureSensor: 'sensor.soil' },
          irrigationConfig: {
            irrigationPumpEntity: 'switch.pump',
            irrigationTimes: [],
            drainTimes: [],
          },
        })}
        .hass=${controllerHass('fault', 'zone_migration_invalid')}
        .initialTab=${'overview'}
      ></irrigation-dialog>`
    );
    await el.updateComplete;
    const overview =
      el.shadowRoot!.querySelector<IrrigationOverviewTab>('irrigation-overview-tab')!;
    await overview.updateComplete;
    expect(overview.shadowRoot!.querySelector('.safety-banner')!.textContent).toContain(
      'Irrigation is held for Flower Tent'
    );
    el.hass = controllerHass('ready', 'zone_migration_invalid');
    el.requestUpdate();
    await el.updateComplete;
    await overview.updateComplete;
    expect(overview.shadowRoot!.querySelector('.safety-banner')).toBeNull();
  });

  it('names a zone and removes the banner when the controller recovers', async () => {
    const el = await fixture<IrrigationOverviewTab>(
      html`<irrigation-overview-tab
        .safetyView=${safety('inhibited', 'probe_unresponsive', 'West bench')}
      ></irrigation-overview-tab>`
    );
    expect(el.shadowRoot!.querySelector('.safety-banner')!.textContent).toContain(
      'West bench · Probe not responding'
    );
    el.safetyView = safety('ready', 'probe_unresponsive');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.safety-banner')).toBeNull();
  });

  it('omits the banner on older backends without a controller', async () => {
    const el = await fixture<IrrigationOverviewTab>(
      html`<irrigation-overview-tab></irrigation-overview-tab>`
    );
    expect(el.shadowRoot!.querySelector('.safety-banner')).toBeNull();
  });
});
