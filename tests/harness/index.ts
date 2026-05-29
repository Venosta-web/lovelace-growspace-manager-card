import { fixture } from '@open-wc/testing-helpers';
import { expect } from 'vitest';
import { setHass } from '../../src/services/hass-call';
import { select, gridInteraction$ } from '../../src/slices/grid-interaction';
import type { GridInteractionState } from '../../src/slices/grid-interaction';
import type { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceSeed } from '../fixtures';

export interface RenderCardOptions {
  hass: Record<string, any>;
  growspace: GrowspaceSeed;
  config?: Record<string, any>;
  atoms?: {
    gridInteraction?: GridInteractionState;
  };
}

export type BriefingTab = 'morning-briefing' | 'risk-watch' | 'going-well' | '7-day-forecast';

const BRIEFING_TAB_INDICES: Record<BriefingTab, number> = {
  'morning-briefing': 0,
  'risk-watch': 1,
  'going-well': 2,
  '7-day-forecast': 3,
};

export interface CardHandle<T extends HTMLElement = HTMLElement> {
  element: T;
  clickChip(metric: string): void;
  clickHero(metric: string): void;
  expectEnvGraph(metric: string): void;
  clickPlantCell(row: number, col: number): void;
  selectViewMode(mode: ViewMode): void;
  selectBriefingTab(tab: BriefingTab): void;
  toggleLogbookView(): void;
  unmount(): void;
}

export async function renderCard<T extends HTMLElement = HTMLElement>(
  tag: string,
  { hass, growspace, config, atoms }: RenderCardOptions
): Promise<CardHandle<T>> {
  if (atoms?.gridInteraction !== undefined) {
    gridInteraction$.set(atoms.gridInteraction);
  }

  setHass(hass as any);

  const element = await fixture<T>(`<${tag}></${tag}>`);
  const cardConfig = config ?? { type: `custom:${tag}`, default_growspace: growspace.growspaceId };
  (element as any).setConfig(cardConfig);
  (element as any).hass = hass;
  await (element as any).updateComplete;

  return {
    element,

    clickChip(metric: string) {
      (element as any).store?.actions.ui.toggleEnvGraph(metric);
    },

    clickHero(metric: string) {
      (element as any).store?.actions.ui.toggleEnvGraph(metric);
    },

    expectEnvGraph(metric: string) {
      const active: Set<string> =
        (element as any).store?.history?.$activeEnvGraphs?.get() ?? new Set();
      expect(active.has(metric)).toBe(true);
    },

    clickPlantCell(row: number, col: number) {
      const grid =
        (hass as any).states?.[`sensor.${growspace.growspaceId}`]?.attributes?.grid;
      const slot = grid?.[`position_${row}_${col}`];
      if (!slot?.plant_id) {
        throw new Error(
          `renderCard: no plant at position (${row}, ${col}) in growspace '${growspace.growspaceId}'`
        );
      }
      select(slot.plant_id);
    },

    selectViewMode(mode: ViewMode) {
      (element as any).store?.ui?.setViewMode(mode);
    },

    selectBriefingTab(tab: BriefingTab) {
      const idx = BRIEFING_TAB_INDICES[tab];
      const panel =
        (element.shadowRoot?.querySelector('gm-briefing-panel') as any) ?? element;
      const root = panel.shadowRoot ?? panel;
      const buttons = root.querySelectorAll<HTMLButtonElement>('.v1-nav-item');
      if (buttons[idx]) {
        buttons[idx].click();
      } else {
        (panel as any)._activeTab = idx;
        (panel as any).requestUpdate?.();
      }
    },

    toggleLogbookView() {
      const inactiveTab = element.shadowRoot?.querySelector<HTMLElement>('.tab:not(.active)');
      inactiveTab?.click();
    },

    unmount() {
      element.remove();
    },
  };
}
