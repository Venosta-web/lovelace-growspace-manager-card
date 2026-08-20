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

describe('plant-card-empty – Arrange state', () => {
  it('stops presenting Add Plant while Arrange is waiting for a plant pickup', async () => {
    const element = await fixture<GrowspaceGridUI>(html`
      <growspace-grid-ui .cells=${[emptyCell]} .arrangeActive=${true}></growspace-grid-ui>
    `);
    const slot = element.shadowRoot!.querySelector<HTMLElement>('.plant-card-empty')!;

    expect(slot.textContent).toContain('Empty cell');
    expect(slot.getAttribute('aria-disabled')).toBe('true');
    expect(slot.tabIndex).toBe(-1);
  });

  it('identifies an empty keyboard target after a plant is picked up', async () => {
    const element = await fixture<GrowspaceGridUI>(html`
      <growspace-grid-ui
        .cells=${[emptyCell]}
        .arrangeActive=${true}
        .arrangePlantPicked=${true}
      ></growspace-grid-ui>
    `);
    const slot = element.shadowRoot!.querySelector<HTMLElement>('.plant-card-empty')!;

    expect(slot.textContent).toContain('Place plant');
    expect(slot.getAttribute('aria-label')).toContain('Empty Arrange target, row 1, column 1');
    expect(slot.getAttribute('aria-disabled')).toBe('false');
    expect(slot.tabIndex).toBe(0);
  });
});
