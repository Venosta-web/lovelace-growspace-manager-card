import { atom } from 'nanostores';
import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it, vi } from 'vitest';

import type { GrowspaceTaskBar } from '../../src/features/tasks/growspace-task-bar';
import '../../src/features/tasks/growspace-task-bar';

function fakeStore() {
  return {
    ui: {
      $language: { get: () => 'en' },
      beginComparisonEdit: vi.fn(),
    },
    comparisons: {
      $state: atom({
        growspaceId: 'tent',
        recordRevision: 0,
        comparisons: [],
        persistence: 'session' as const,
      }),
      labelForComparison: vi.fn(),
    },
  };
}

describe('growspace-task-bar', () => {
  it('shows instructions, identifies the active task, and moves focus to its heading', async () => {
    const element = await fixture<GrowspaceTaskBar>(html`
      <growspace-task-bar
        .store=${fakeStore() as any}
        .taskState=${{
          kind: 'compare',
          comparisonId: null,
          originalMetrics: [],
          draftMetrics: [],
          expectedRecordRevision: 0,
          error: null,
        }}
      ></growspace-task-bar>
    `);
    await element.updateComplete;

    const heading = element.shadowRoot!.querySelector('h2')!;
    expect(heading.textContent).toContain('Compare');
    expect(element.shadowRoot!.textContent).toContain('Choose 2–4 readings');
    expect(element.shadowRoot!.activeElement).toBe(heading);
  });

  it.each([
    ['Done', 'task-done'],
    ['Cancel', 'task-cancel'],
  ])('exposes an explicit %s exit', async (label, eventName) => {
    const element = await fixture<GrowspaceTaskBar>(html`
      <growspace-task-bar
        .store=${fakeStore() as any}
        .taskState=${{ kind: 'select_plants' }}
      ></growspace-task-bar>
    `);
    const listener = vi.fn();
    element.addEventListener(eventName, listener);
    const button = Array.from(element.shadowRoot!.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label
    )!;
    button.click();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('disables Done and Cancel while an arrangement save is in flight', async () => {
    const layout = { plant: { row: 0, col: 0 } };
    const element = await fixture<GrowspaceTaskBar>(html`
      <growspace-task-bar
        .store=${fakeStore() as any}
        .taskState=${{
          kind: 'arrange',
          previousViewMode: 'standard',
          expectedLayoutRevision: 1,
          original: layout,
          draft: layout,
          pickedPlantId: null,
          status: 'saving',
          error: null,
        }}
      ></growspace-task-bar>
    `);
    expect(
      Array.from(element.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')).every(
        (button) => button.disabled
      )
    ).toBe(true);
  });
});
