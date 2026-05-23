import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { createGrowspaceDevice } from '../services/types';
import { IrrigationDialog } from './irrigation-dialog';
import './irrigation-dialog';

// Stub any HA-specific custom elements that are not available in the test environment.
const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makeDevice(overrides: Partial<Parameters<typeof createGrowspaceDevice>[0]> = {}) {
  return createGrowspaceDevice({ deviceId: 'gs1', name: 'Tent 1', ...overrides });
}

function makeMockStore(runCycleFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    context: {
      dataService: { runIrrigationCycle: runCycleFn },
      ui: { showToast: vi.fn() },
      data: {},
      undoRedoManager: {},
      optimisticManager: {},
      grid: {},
      closeDialog: vi.fn(),
      refreshData: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// Footer meta – timestamps
// ---------------------------------------------------------------------------

describe('IrrigationDialog – footer meta timestamps', () => {
  it('shows a formatted last-cycle time when lastCycleTimestamp is set', async () => {
    const device = makeDevice({ lastCycleTimestamp: '2026-05-23T14:30:00.000Z' });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    const text = meta?.textContent ?? '';
    // Formatted timestamp includes HH:MM, so a colon should appear after "Last cycle"
    expect(text).toMatch(/Last cycle.+:/);
  });

  it('shows "—" for last-cycle when lastCycleTimestamp is null', async () => {
    const device = makeDevice({ lastCycleTimestamp: null });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    expect(meta?.textContent).toContain('Last cycle —');
  });

  it('shows a formatted next-cycle time when nextScheduledCycle is set', async () => {
    const device = makeDevice({ nextScheduledCycle: '2026-05-24T06:00:00.000Z' });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    const text = meta?.textContent ?? '';
    expect(text).toMatch(/Next.+:/);
  });

  it('shows "—" for next-cycle when nextScheduledCycle is null', async () => {
    const device = makeDevice({ nextScheduledCycle: null });
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device} growspaceName="Tent 1"></irrigation-dialog>
    `);
    await el.updateComplete;

    const meta = el.shadowRoot!.querySelector('.dlg-footer-meta');
    expect(meta?.textContent).toContain('Next —');
  });
});

// ---------------------------------------------------------------------------
// Footer Run Now button
// ---------------------------------------------------------------------------

describe('IrrigationDialog – Run Now button', () => {
  it('clicking Run Now dispatches runIrrigationCycle for the current growspace', async () => {
    const mockRunCycle = vi.fn().mockResolvedValue(undefined);
    const device = makeDevice();
    const store = makeMockStore(mockRunCycle);

    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog
        .open=${true}
        .device=${device}
        .store=${store as any}
      ></irrigation-dialog>
    `);
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find(
      (b) => b.textContent?.trim() === 'Run Now',
    ) as HTMLButtonElement | undefined;

    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(false);

    btn!.click();
    // Flush the microtask queue so the async handler runs.
    await new Promise((r) => setTimeout(r, 0));

    expect(mockRunCycle).toHaveBeenCalledWith({ growspaceId: 'gs1' });
  });

  it('shows "Starting…" and disables the button while the request is in flight', async () => {
    const device = makeDevice();
    const el = await fixture<IrrigationDialog>(html`
      <irrigation-dialog .open=${true} .device=${device}></irrigation-dialog>
    `);

    (el as any)._runNowSaving = true;
    await el.updateComplete;

    const btn = Array.from(el.shadowRoot!.querySelectorAll('button.md3-button')).find(
      (b) => b.textContent?.includes('Starting'),
    ) as HTMLButtonElement | undefined;

    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(true);
  });
});
