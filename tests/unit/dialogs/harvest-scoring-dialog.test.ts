/**
 * Render-once smoke test for HarvestScoringDialog.
 *
 * Confirms the component mounts, renders its shadow DOM without crashing, and
 * wires up the SM correctly. Behavioral coverage lives in the pure SM tests
 * at src/dialogs/harvest-scoring-dialog-sm.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HarvestScoringDialog } from '../../../src/dialogs/harvest-scoring-dialog';
import '../../../src/dialogs/harvest-scoring-dialog';
import { aPlant, aHass } from '../../fixtures';

if (!customElements.get('ha-dialog')) {
  class HaDialogMock extends HTMLElement {
    open = false;
    heading = '';
    hideActions = false;
    scrimClickAction = '';
    escapeKeyAction = '';
  }
  customElements.define('ha-dialog', HaDialogMock);
}

function makeMockStore() {
  return {
    actions: {
      plant: {
        scorePhenotype: vi.fn().mockResolvedValue({}),
        harvest: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

describe('HarvestScoringDialog', () => {
  let element: HarvestScoringDialog;
  let mockStore: ReturnType<typeof makeMockStore>;

  beforeEach(async () => {
    mockStore = makeMockStore();
    element = document.createElement('harvest-scoring-dialog') as HarvestScoringDialog;
    (element as any).store = mockStore;
    (element as any).hass = aHass();
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element?.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', async () => {
    element.open = false;
    await element.updateComplete;
    expect(element.shadowRoot?.innerHTML).toContain('<!--');
  });

  it('renders the dialog when open with a plant', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('ha-dialog')).not.toBeNull();
  });

  it('renders the tab bar with scoring and metrics tabs', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn');
    expect(tabs?.length).toBe(2);
  });

  it('renders score rows on the scoring tab', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;
    const rows = element.shadowRoot?.querySelectorAll('.score-row');
    expect(rows?.length).toBeGreaterThan(0);
  });

  it('switches to metrics tab on click', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;
    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('#wet-weight')).not.toBeNull();
  });

  it('shows confirmation bar when save is requested', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.confirm-bar')).not.toBeNull();
  });

  it('returns to action bar when harvest is cancelled', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;

    const cancelBtn = element.shadowRoot?.querySelector('.confirm-bar .md3-button.outlined') as HTMLButtonElement;
    cancelBtn.click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.confirm-bar')).toBeNull();
  });

  it('resets SM state when dialog reopens', async () => {
    element.dialogState = { plant: aPlant({ vigor: 5 } as any) };
    element.open = true;
    await element.updateComplete;

    element.open = false;
    await element.updateComplete;
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    // SM should be fresh on reopen
    const sm = (element as any)._sm;
    expect(sm.status.kind).toBe('idle');
    expect(sm.activeTab).toBe('scoring');
  });

  it('dispatches close event', async () => {
    const spy = vi.fn();
    element.addEventListener('close', spy);
    (element as any)._dispatchClose();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('calls store harvest on confirmed save flow', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    // Click save → confirming
    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;

    // Click confirm harvest
    const confirmBtn = element.shadowRoot?.querySelector('.confirm-bar .md3-button.filled') as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 20));

    expect(mockStore.actions.plant.harvest).toHaveBeenCalled();
  });

  it('calls store harvest on confirmed skip flow', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    // Click skip → confirming
    const skipBtn = element.shadowRoot?.querySelector('.md3-button.outlined') as HTMLButtonElement;
    skipBtn.click();
    await element.updateComplete;

    // Click confirm
    const confirmBtn = element.shadowRoot?.querySelector('.confirm-bar .md3-button.filled') as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 20));

    expect(mockStore.actions.plant.harvest).toHaveBeenCalled();
    expect(mockStore.actions.plant.scorePhenotype).not.toHaveBeenCalled();
  });

  it('shows error banner when harvest fails', async () => {
    mockStore.actions.plant.harvest.mockRejectedValueOnce(new Error('Network error'));
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;
    const confirmBtn = element.shadowRoot?.querySelector('.confirm-bar .md3-button.filled') as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.error-banner')).not.toBeNull();
  });
});
