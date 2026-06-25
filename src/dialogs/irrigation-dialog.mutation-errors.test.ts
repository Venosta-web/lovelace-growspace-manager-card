/**
 * Mutation-error toast tests for IrrigationDialog.
 *
 * These tests use vi.mock for hass-call to simulate failures, kept in a separate
 * file to avoid polluting the existing test suite with a global module mock.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { irrigationConfigs$ } from '../slices/irrigation';
import { devices$ } from '../slices/grid';

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  callFetch: vi.fn().mockResolvedValue(new Response()),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

import * as hassCallModule from '../services/hass-call';
import { createGrowspaceDevice } from '../services/types';
import type { IrrigationDialog } from './irrigation-dialog';
import './irrigation-dialog';

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon', 'gs-dialog'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function withPump(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationConfig: {
      irrigationTimes: [],
      drainTimes: [],
      irrigationPumpEntity: 'switch.pump',
      ...overrides.irrigationConfig,
    },
    ...overrides,
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  irrigationConfigs$.set(new Map());
  devices$.set([]);
  vi.mocked(hassCallModule.callService).mockResolvedValue(undefined);
});

describe('IrrigationDialog – Run Now: service dispatch', () => {
  it('clicking Run Now calls callService with run_irrigation_cycle', async () => {
    const device = withPump();

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    vi.mocked(hassCallModule.callService).mockClear();

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find(
      (b) => b.textContent?.trim() === 'Run Now'
    ) as HTMLButtonElement | undefined;

    btn!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(vi.mocked(hassCallModule.callService)).toHaveBeenCalledWith(
      'growspace_manager',
      'run_irrigation_cycle',
      expect.objectContaining({ growspace_id: 'gs1' })
    );
  });
});

describe('IrrigationDialog – schedule mutations: error toast', () => {
  it('shows SM toast when _addDrainTime fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('network error'));

    const device = withPump();
    irrigationConfigs$.set(new Map([['gs1', { irrigationTimes: [], drainTimes: [] }]]));

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);
    await el.updateComplete;

    await (el as any)._addDrainTime('18:00', 30);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((el as any)._sm.toast).toBeTruthy();
  });
});
