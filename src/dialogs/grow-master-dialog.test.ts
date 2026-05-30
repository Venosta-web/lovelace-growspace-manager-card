import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { aiMode$ } from '../slices/ai-insight';
/* eslint-disable import/no-duplicates */
import './grow-master-dialog';
import { GrowMasterDialog } from './grow-master-dialog';
/* eslint-enable import/no-duplicates */

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

beforeEach(() => {
  aiMode$.set('briefing');
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Inbox layout
// ---------------------------------------------------------------------------

describe('GrowMasterDialog — inbox layout', () => {
  it('gm-content has no-pad class when mode is inbox', async () => {
    aiMode$.set('inbox');
    const el = await fixture<GrowMasterDialog>(html`
      <grow-master-dialog open></grow-master-dialog>
    `);
    await el.updateComplete;

    const content = el.shadowRoot!.querySelector('.gm-content');
    expect(content!.classList.contains('no-pad')).toBe(true);
  });

  it('footer does not contain an orphaned Mark All Read button in inbox mode', async () => {
    aiMode$.set('inbox');
    const el = await fixture<GrowMasterDialog>(html`
      <grow-master-dialog open></grow-master-dialog>
    `);
    await el.updateComplete;

    const footer = el.shadowRoot!.querySelector('.gm-footer');
    const orphaned = [...footer!.querySelectorAll('button')].filter(
      (b) => b.textContent?.trim() === 'Mark All Read'
    );
    expect(orphaned.length).toBe(0);
  });
});
