import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import './gm-settings-panel';
import { GmSettingsPanel } from './gm-settings-panel';

vi.mock('../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

describe('GmSettingsPanel — Alerts section removed', () => {
  it('does not render an ai_auto_alerts toggle', async () => {
    const el = await fixture<GmSettingsPanel>(html`
      <gm-settings-panel></gm-settings-panel>
    `);
    await el.updateComplete;

    const toggle = el.shadowRoot!.querySelector('[data-field="ai_auto_alerts"]');
    expect(toggle).toBeNull();
  });

  it('does not render an Alerts section heading', async () => {
    const el = await fixture<GmSettingsPanel>(html`
      <gm-settings-panel></gm-settings-panel>
    `);
    await el.updateComplete;

    const headings = [...el.shadowRoot!.querySelectorAll('.section-heading')];
    const alertsHeading = headings.find((h) => h.textContent?.trim() === 'Alerts');
    expect(alertsHeading).toBeUndefined();
  });
});

describe('GmSettingsPanel — draft-change event', () => {
  it('does not include ai_auto_alerts in emitted draft', async () => {
    const el = await fixture<GmSettingsPanel>(html`
      <gm-settings-panel></gm-settings-panel>
    `);
    await el.updateComplete;

    let emittedDraft: Record<string, unknown> | null = null;
    el.addEventListener('draft-change', (e) => {
      emittedDraft = (e as CustomEvent).detail;
    });

    const aiSwitch = el.shadowRoot!.querySelector('[data-field="ai_enabled"]') as HTMLElement;
    aiSwitch.dispatchEvent(new CustomEvent('change', { detail: { checked: true }, bubbles: true }));

    expect(emittedDraft).not.toBeNull();
    expect('ai_auto_alerts' in emittedDraft!).toBe(false);
  });
});
