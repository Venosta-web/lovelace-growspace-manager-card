import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import './growspace-chip';

async function renderChip(status: string): Promise<HTMLElement> {
  const el = await fixture(html`<growspace-chip
    icon="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
    label="pH"
    value="6.5"
    status="${status}"
  ></growspace-chip>`);
  return el.shadowRoot!.querySelector('.stat-chip') as HTMLElement;
}

describe('growspace-chip – status-warning color', () => {
  it('uses orange-red mix color (not pure amber) for text', async () => {
    const chip = await renderChip('warning');
    // rgb(247, 125, 59) — 50/50 mix of amber #ffa726 and danger-red #ef5350
    expect(getComputedStyle(chip).color).toBe('rgb(247, 125, 59)');
  });

  it('uses orange-red mix for border-color', async () => {
    const chip = await renderChip('warning');
    expect(getComputedStyle(chip).borderTopColor).toBe('rgba(247, 125, 59, 0.5)');
  });

  it('uses orange-red mix for background', async () => {
    const chip = await renderChip('warning');
    expect(getComputedStyle(chip).backgroundColor).toBe('rgba(247, 125, 59, 0.1)');
  });

  it('optimal chip remains green', async () => {
    const chip = await renderChip('optimal');
    expect(getComputedStyle(chip).color).toBe('rgb(46, 125, 50)');
  });
});
