import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { hassCall } from '../services/hass-call';
import type { AddPlantDialog } from './add-plant-dialog';
import { transition } from './add-plant-dialog-sm';
import './add-plant-dialog';

vi.mock('../services/hass-call', () => ({
  hassCall: vi.fn().mockResolvedValue({ strains: [] }),
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({}),
  callApi: vi.fn().mockResolvedValue({}),
  callFetch: vi.fn().mockResolvedValue(new Response()),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const mockHassCall = vi.mocked(hassCall);

afterEach(() => {
  mockHassCall.mockReset();
  mockHassCall.mockResolvedValue({ strains: [] });
});

describe('AddPlantDialog – row/col seeding on open', () => {
  it('seeds the add-tab draft from the row/col properties set at open', async () => {
    const el = await fixture<AddPlantDialog>(
      html`<add-plant-dialog .open=${true} .row=${2} .col=${3}></add-plant-dialog>`
    );
    await el.updateComplete;

    expect((el as any)._sm.tabs.add.draft.row).toBe(2);
    expect((el as any)._sm.tabs.add.draft.col).toBe(3);
  });

  it('does not re-seed the draft on unrelated re-renders while open', async () => {
    const el = await fixture<AddPlantDialog>(
      html`<add-plant-dialog .open=${true} .row=${2} .col=${3}></add-plant-dialog>`
    );
    await el.updateComplete;

    (el as any)._sm = transition((el as any)._sm, {
      type: 'DraftFieldChanged',
      tab: 'add',
      field: 'row',
      value: 8,
    });

    el.strainLibrary = [{ strain: 'Blue Dream', phenotype: 'default', key: 'blue-dream:default' }];
    await el.updateComplete;

    expect((el as any)._sm.tabs.add.draft.row).toBe(8);
  });

  it('re-seeds from the new row/col after the dialog is closed and reopened', async () => {
    const el = await fixture<AddPlantDialog>(
      html`<add-plant-dialog .open=${true} .row=${2} .col=${3}></add-plant-dialog>`
    );
    await el.updateComplete;

    el.open = false;
    await el.updateComplete;

    el.row = 5;
    el.col = 6;
    el.open = true;
    await el.updateComplete;

    expect((el as any)._sm.tabs.add.draft.row).toBe(5);
    expect((el as any)._sm.tabs.add.draft.col).toBe(6);
  });
});
