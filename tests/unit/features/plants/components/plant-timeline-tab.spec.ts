import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../../../src/features/plants/components/plant-timeline-tab';
import type { PlantTimelineTab } from '../../../../../src/features/plants/components/plant-timeline-tab';

// plant-timeline is a complex component; mock it so the tab tests stay unit-level
vi.mock('../../../../../src/components/plant/plant-timeline', () => ({ default: class {} }));

describe('PlantTimelineTab', () => {
  let element: PlantTimelineTab;

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  it('renders plant-timeline inside its shadow DOM', async () => {
    element = await fixture(html`<plant-timeline-tab></plant-timeline-tab>`);
    const inner = element.shadowRoot!.querySelector('plant-timeline');
    expect(inner).toBeTruthy();
  });

  it('forwards growspace-refresh as timeline-refresh', async () => {
    element = await fixture(html`<plant-timeline-tab></plant-timeline-tab>`);

    let fired = false;
    element.addEventListener('timeline-refresh', () => { fired = true; });

    const inner = element.shadowRoot!.querySelector('plant-timeline') as HTMLElement;
    inner.dispatchEvent(new CustomEvent('growspace-refresh', { bubbles: true, composed: true }));

    expect(fired).toBe(true);
  });
});
