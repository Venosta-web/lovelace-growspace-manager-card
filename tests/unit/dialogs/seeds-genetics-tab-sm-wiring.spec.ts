/**
 * Smoke test: SeedsGeneticsTab SM wiring.
 *
 * Confirms that the Lit component is a thin renderer over a single `@state() _sm`
 * and that the SM is correctly seeded from props at connect time.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { SeedsGeneticsTab } from '../../../src/dialogs/seeds-genetics-tab';
import { aSeedBatch, aPollinationEvent } from '../../fixtures';

describe('SeedsGeneticsTab — SM wiring', () => {
  let el: SeedsGeneticsTab;

  beforeEach(async () => {
    el = await fixture<SeedsGeneticsTab>('<seeds-genetics-tab></seeds-genetics-tab>');
    el.seedBatches = [aSeedBatch()];
    el.pollinationEvents = [aPollinationEvent()];
    el.strains = [];
    el.plants = [];
    await el.updateComplete;
  });

  it('mounts without errors', () => {
    expect(el).toBeInstanceOf(SeedsGeneticsTab);
  });

  it('initialises _sm in list view', () => {
    const sm = (el as any)._sm;
    expect(sm).toBeDefined();
    expect(sm.activeView).toBe('list');
  });

  it('_sm has idle status on mount', () => {
    expect((el as any)._sm.status.kind).toBe('idle');
  });

  it('_sm has no toast on mount', () => {
    expect((el as any)._sm.toast).toBeUndefined();
  });

  it('_sm list sub is idle on mount', () => {
    expect((el as any)._sm.views.list.sub.kind).toBe('idle');
  });

  it('renders seed list view by default', () => {
    const header = el.shadowRoot?.querySelector('.dialog-title');
    expect(header?.textContent).toContain('Seeds');
  });

  it('opens directly to log-pollination when initialSubView prop is set', async () => {
    const polEl = new SeedsGeneticsTab();
    polEl.initialSubView = 'log-pollination';
    polEl.strains = [];
    polEl.plants = [];
    document.body.appendChild(polEl);
    await polEl.updateComplete;

    expect((polEl as any)._sm.activeView).toBe('log-pollination');
    document.body.removeChild(polEl);
  });

  it('pre-fills receiverPlantId when prefilledReceiverId is set', async () => {
    const polEl = new SeedsGeneticsTab();
    polEl.initialSubView = 'log-pollination';
    polEl.prefilledReceiverId = 'plant-receiver-99';
    polEl.strains = [];
    polEl.plants = [];
    document.body.appendChild(polEl);
    await polEl.updateComplete;

    const smState = (polEl as any)._sm;
    expect(smState.views['log-pollination'].draft.receiverPlantId).toBe('plant-receiver-99');
    document.body.removeChild(polEl);
  });
});
