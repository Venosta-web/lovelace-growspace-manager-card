import { fixture, html } from '@open-wc/testing-helpers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConfigStageAccordion,
  stageAccordionInteriorSlot,
  stageAccordionSummarySlot,
  type ConfigStageAccordionStage,
  type ConfigStageAccordionToggleDetail,
} from '../../src/features/config/components/config-stage-accordion';

function stage(overrides: Partial<ConfigStageAccordionStage> = {}): ConfigStageAccordionStage {
  return {
    id: 'veg',
    label: 'Vegetative',
    color: '#4caf50',
    open: false,
    ...overrides,
  };
}

async function mount(stages: readonly ConfigStageAccordionStage[]): Promise<ConfigStageAccordion> {
  return fixture<ConfigStageAccordion>(html`
    <config-stage-accordion .stages=${stages}>
      <span slot=${stageAccordionSummarySlot('veg')}>Day 0.80–1.20 kPa</span>
      <div slot=${stageAccordionInteriorSlot('veg')}>Vegetative editor</div>
    </config-stage-accordion>
  `);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConfigStageAccordion', () => {
  it('renders the collapsed summary and disclosure state', async () => {
    const element = await mount([stage()]);
    const header = element.shadowRoot!.querySelector<HTMLElement>('.acc-head')!;

    expect(header.getAttribute('role')).toBe('button');
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(element.shadowRoot!.querySelector('.acc-body')).toBeNull();
    expect(element.textContent).toContain('Day 0.80–1.20 kPa');
  });

  it('renders the expanded interior and scrolls the opened row into view', async () => {
    const element = await mount([stage()]);
    const card = element.shadowRoot!.querySelector<HTMLElement>('.acc-card')!;
    const scrollIntoView = vi.fn();
    card.scrollIntoView = scrollIntoView;

    element.stages = [stage({ open: true })];
    await element.updateComplete;

    const header = element.shadowRoot!.querySelector<HTMLElement>('.acc-head')!;
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(element.shadowRoot!.querySelector('.acc-body')).not.toBeNull();
    expect(element.textContent).toContain('Vegetative editor');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it.each(['Enter', ' '])('activates the row header with the %j key', async (key: string) => {
    const element = await mount([stage()]);
    const toggles: ConfigStageAccordionToggleDetail[] = [];
    element.addEventListener('stage-accordion-toggle', (event: Event) => {
      toggles.push((event as CustomEvent<ConfigStageAccordionToggleDetail>).detail);
    });
    const header = element.shadowRoot!.querySelector<HTMLElement>('.acc-head')!;

    header.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    expect(toggles).toEqual([{ stage: stage() }]);
  });

  it('requests both expansion and collapse when the row header is clicked', async () => {
    const element = await mount([stage()]);
    const toggles: boolean[] = [];
    element.addEventListener('stage-accordion-toggle', (event: Event) => {
      toggles.push((event as CustomEvent<ConfigStageAccordionToggleDetail>).detail.stage.open);
    });

    element.shadowRoot!.querySelector<HTMLElement>('.acc-head')!.click();
    element.stages = [stage({ open: true })];
    await element.updateComplete;
    element.shadowRoot!.querySelector<HTMLElement>('.acc-head')!.click();

    expect(toggles).toEqual([false, true]);
  });
});
