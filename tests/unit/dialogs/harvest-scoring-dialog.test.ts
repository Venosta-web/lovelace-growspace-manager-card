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
import { setHass } from '../../../src/services/hass-call';
import { PlantStage } from '../../../src/features/plants/types';

// WS commands the slice mutators reach on confirm. The dialog calls scorePlant
// then advancePlantStage; both funnel through hass.callWS via the shared
// hass-call singleton (scorePlant → score_plant, advancePlantStage →
// harvestPlant → harvest_plant).
const WS_SCORE = 'growspace_manager/score_plant';
const WS_HARVEST = 'growspace_manager/harvest_plant';

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
  return { actions: {} };
}

// advancePlantStage only advances flower/dry/mother; a default veg plant throws.
function aHarvestablePlant() {
  return aPlant({ stage: PlantStage.FLOWER } as any);
}

describe('HarvestScoringDialog', () => {
  let element: HarvestScoringDialog;
  let mockStore: ReturnType<typeof makeMockStore>;
  let hass: ReturnType<typeof aHass>;

  // The slice mutators are driven through the real hass-call seam rather than a
  // module mock: setHass() points the shared singleton at a controllable fake
  // hass, so callWS is a spy we can assert on and reject. This avoids the
  // browser-mode ESM-mock unreliability that made the prior vi.mock('slices/plant')
  // flake on CI ("[AsyncFunction scorePlant] is not a spy").
  const wsCommands = (): string[] =>
    (hass.callWS as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { type: string })?.type
    );

  beforeEach(async () => {
    mockStore = makeMockStore();
    hass = aHass();
    setHass(hass as never);
    element = document.createElement('harvest-scoring-dialog') as HarvestScoringDialog;
    (element as any).store = mockStore;
    (element as any).hass = hass;
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

    const cancelBtn = element.shadowRoot?.querySelector(
      '.confirm-bar .md3-button.outlined'
    ) as HTMLButtonElement;
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
    element.dialogState = { plant: aHarvestablePlant() };
    element.open = true;
    await element.updateComplete;

    // Click save → confirming
    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;

    // Click confirm harvest
    const confirmBtn = element.shadowRoot?.querySelector(
      '.confirm-bar .md3-button.filled'
    ) as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(wsCommands()).toContain(WS_HARVEST);
  });

  it('calls store harvest on confirmed skip flow', async () => {
    element.dialogState = { plant: aHarvestablePlant() };
    element.open = true;
    await element.updateComplete;

    // Click skip → confirming
    const skipBtn = element.shadowRoot?.querySelector('.md3-button.outlined') as HTMLButtonElement;
    skipBtn.click();
    await element.updateComplete;

    // Click confirm
    const confirmBtn = element.shadowRoot?.querySelector(
      '.confirm-bar .md3-button.filled'
    ) as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(wsCommands()).toContain(WS_HARVEST);
    expect(wsCommands()).not.toContain(WS_SCORE);
  });

  it('shows error banner when harvest fails', async () => {
    (hass.callWS as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    element.dialogState = { plant: aHarvestablePlant() };
    element.open = true;
    await element.updateComplete;

    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;
    const confirmBtn = element.shadowRoot?.querySelector(
      '.confirm-bar .md3-button.filled'
    ) as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.error-banner')).not.toBeNull();
  });

  it('clicking a star sets that score in the draft', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const starBtn = element.shadowRoot?.querySelector('.star-btn') as HTMLButtonElement;
    starBtn.click();
    await element.updateComplete;

    const sm = (element as any)._sm;
    const firstKey = Object.keys(sm.tabs.scoring.draft)[0] as keyof typeof sm.tabs.scoring.draft;
    expect(sm.tabs.scoring.draft[firstKey]).not.toBeNull();
  });

  it('clicking the same star twice toggles the score back to null', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const starBtn = element.shadowRoot?.querySelector('.star-btn') as HTMLButtonElement;
    starBtn.click();
    await element.updateComplete;
    starBtn.click();
    await element.updateComplete;

    const sm = (element as any)._sm;
    const firstKey = Object.keys(sm.tabs.scoring.draft)[0] as keyof typeof sm.tabs.scoring.draft;
    expect(sm.tabs.scoring.draft[firstKey]).toBeNull();
  });

  it('clicking the scoring tab button while on metrics switches back', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    await element.updateComplete;
    expect((element as any)._sm.activeTab).toBe('metrics');

    tabs[0].click();
    await element.updateComplete;
    expect((element as any)._sm.activeTab).toBe('scoring');
  });

  it('firing input on wet-weight updates the metrics draft', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('#wet-weight') as HTMLInputElement;
    input.value = '120';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await element.updateComplete;

    expect((element as any)._sm.tabs.metrics.draft.wetWeight).toBe('120');
  });

  it('firing input on all metric fields updates each draft field', async () => {
    element.dialogState = { plant: aPlant() };
    element.open = true;
    await element.updateComplete;

    const tabs = element.shadowRoot?.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    await element.updateComplete;

    const fields: Array<[string, string, string]> = [
      ['#dry-weight', 'dryWeight', '28'],
      ['#trim-weight', 'trimWeight', '5'],
      ['#thc-pct', 'thcPercentage', '24.5'],
      ['#cbd-pct', 'cbdPercentage', '0.3'],
    ];

    for (const [selector, key, value] of fields) {
      const input = element.shadowRoot?.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await element.updateComplete;
      expect((element as any)._sm.tabs.metrics.draft[key]).toBe(value);
    }

    const textarea = element.shadowRoot?.querySelector('#terpene-profile') as HTMLTextAreaElement;
    textarea.value = 'myrcene';
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await element.updateComplete;
    expect((element as any)._sm.tabs.metrics.draft.terpeneProfile).toBe('myrcene');
  });

  it('calls scorePhenotype when harvest confirmed with non-empty scoring', async () => {
    element.dialogState = { plant: aHarvestablePlant() };
    element.open = true;
    await element.updateComplete;

    // Set a score by clicking the first star of the first dimension
    const starBtn = element.shadowRoot?.querySelector('.star-btn') as HTMLButtonElement;
    starBtn.click();
    await element.updateComplete;

    // Save → confirming
    const saveBtn = element.shadowRoot?.querySelector('.md3-button.filled') as HTMLButtonElement;
    saveBtn.click();
    await element.updateComplete;

    // Confirm harvest
    const confirmBtn = element.shadowRoot?.querySelector(
      '.confirm-bar .md3-button.filled'
    ) as HTMLButtonElement;
    confirmBtn.click();
    await element.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(wsCommands()).toContain(WS_SCORE);
    expect(wsCommands()).toContain(WS_HARVEST);
  });
});
