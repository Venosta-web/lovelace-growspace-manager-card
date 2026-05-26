import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceGridUI } from './growspace-grid-ui';
import './growspace-grid-ui';

const emptyCell = { plant: null, row: 1, col: 1, overlayColor: '', isSelected: false };

async function renderWithPrimaryColor(color: string): Promise<HTMLElement> {
  const el = await fixture<GrowspaceGridUI>(html`
    <growspace-grid-ui .cells=${[emptyCell]} style="--primary-color: ${color}"></growspace-grid-ui>
  `);
  return el.shadowRoot!.querySelector('.plant-card-empty') as HTMLElement;
}

describe('plant-card-empty – HA theme color tokens', () => {
  it('text color reflects --primary-color', async () => {
    const red = await renderWithPrimaryColor('rgb(255, 0, 0)');
    const blue = await renderWithPrimaryColor('rgb(0, 0, 255)');
    expect(getComputedStyle(red).color).not.toBe(getComputedStyle(blue).color);
  });

  it('border-color reflects --primary-color', async () => {
    const red = await renderWithPrimaryColor('rgb(255, 0, 0)');
    const blue = await renderWithPrimaryColor('rgb(0, 0, 255)');
    expect(getComputedStyle(red).borderTopColor).not.toBe(getComputedStyle(blue).borderTopColor);
  });

  it('background reflects --primary-color', async () => {
    const red = await renderWithPrimaryColor('rgb(255, 0, 0)');
    const blue = await renderWithPrimaryColor('rgb(0, 0, 255)');
    expect(getComputedStyle(red).backgroundColor).not.toBe(getComputedStyle(blue).backgroundColor);
  });
});
