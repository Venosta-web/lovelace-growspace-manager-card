/**
 * Render tests for the ConfigDialog VPD Targets tab — verifies the inlined
 * per-stage accordion renders (parity with the Humidity "Thresholds per Stage"
 * tab) and reacts to interaction. Logic branches live in config-dialog.test.ts.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import './config-dialog';
import { ConfigDialog } from './config-dialog';
import { ConfigTab } from '../constants';
import { FAN_VPD_STAGE_KEYS } from '../features/environment/constants';

vi.mock('../slices/subarea', () => ({
  getSubareas: vi.fn().mockResolvedValue([]),
  addSubarea: vi.fn(),
  updateSubarea: vi.fn(),
  removeSubarea: vi.fn(),
  subareas$: { get: vi.fn(() => []), subscribe: vi.fn(() => () => {}) },
  setSubareas: vi.fn(),
}));

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mountVpdTab(): Promise<ConfigDialog> {
  const el = (await fixture(html`<config-dialog></config-dialog>`)) as ConfigDialog;
  el.open = true;
  el.currentTab = ConfigTab.VPD_TARGETS;
  await el.updateComplete;
  return el;
}

// The VPD Targets tab and shared accordion are nested dumb components; pierce them.
async function vpdShadow(el: ConfigDialog): Promise<ShadowRoot> {
  await el.updateComplete;
  const tab = el.shadowRoot!.querySelector('config-vpd-targets-tab') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await tab.updateComplete;
  return tab.shadowRoot!;
}

async function accordionShadow(el: ConfigDialog): Promise<ShadowRoot> {
  const tabRoot = await vpdShadow(el);
  const accordion = tabRoot.querySelector('config-stage-accordion') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await accordion.updateComplete;
  return accordion.shadowRoot!;
}

describe('ConfigDialog VPD Targets tab — render', () => {
  it('renders one accordion card per fan VPD stage', async () => {
    const el = await mountVpdTab();
    const cards = (await accordionShadow(el)).querySelectorAll('.acc-card');
    expect(cards.length).toBe(FAN_VPD_STAGE_KEYS.length);
  });

  it('shows a collapsed summary line and hides the body until a stage is opened', async () => {
    const el = await mountVpdTab();
    const root = await accordionShadow(el);
    // Nothing open by default → no body, but each head has a summary line.
    expect(root.querySelectorAll('.acc-body').length).toBe(0);
    expect((await vpdShadow(el)).querySelectorAll('.acc-head-desc').length).toBe(
      FAN_VPD_STAGE_KEYS.length
    );
  });

  it('reveals Day/Night md3-number-inputs when a stage head is clicked', async () => {
    const el = await mountVpdTab();
    (await accordionShadow(el)).querySelector<HTMLElement>('.acc-head')!.click();

    const body = (await accordionShadow(el)).querySelector('.acc-body');
    expect(body).not.toBeNull();
    // Day low/high + Night low/high = 4 inputs.
    expect((await vpdShadow(el)).querySelectorAll('md3-number-input').length).toBe(4);
  });

  it('renders the shared reset button', async () => {
    const el = await mountVpdTab();
    const buttons = [...(await vpdShadow(el)).querySelectorAll('button')];
    expect(buttons.some((b) => /reset to defaults/i.test(b.textContent ?? ''))).toBe(true);
  });
});
