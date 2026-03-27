import { describe, it, expect } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';
import '../../../src/components/ui/gs-help-tooltip';
import type { GsHelpTooltip } from '../../../src/components/ui/gs-help-tooltip';

describe('GsHelpTooltip', () => {
  it('renders an info icon button', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test help text"></gs-help-tooltip>
    `);
    const btn = el.shadowRoot!.querySelector('.help-trigger');
    expect(btn).toBeTruthy();
  });

  it('renders popover with content text', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Explains the feature"></gs-help-tooltip>
    `);
    const popover = el.shadowRoot!.querySelector('.help-popover');
    expect(popover?.textContent?.trim()).toContain('Explains the feature');
  });

  it('accepts placement prop without error', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content="Test" placement="bottom"></gs-help-tooltip>
    `);
    expect(el.placement).toBe('bottom');
  });

  it('renders nothing when content is empty', async () => {
    const el = await fixture<GsHelpTooltip>(html`
      <gs-help-tooltip content=""></gs-help-tooltip>
    `);
    const btn = el.shadowRoot!.querySelector('.help-trigger');
    expect(btn).toBeNull();
  });
});
