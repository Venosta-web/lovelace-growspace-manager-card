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
  atoms?: {
    gridInteraction?: GridInteractionState;
  };
}

export interface CardHandle<T extends HTMLElement = HTMLElement> {
  element: T;
  clickChip(metric: string): void;
  clickHero(metric: string): void;
  expectEnvGraph(metric: string): void;
  clickPlantCell(row: number, col: number): void;
  selectViewMode(mode: ViewMode): void;
  unmount(): void;
}

export async function renderCard<T extends HTMLElement = HTMLElement>(
  tag: string,
  { hass, growspace, atoms }: RenderCardOptions
): Promise<CardHandle<T>> {
  if (atoms?.gridInteraction !== undefined) {
    gridInteraction$.set(atoms.gridInteraction);
  }

  setHass(hass as any);

  const element = await fixture<T>(`<${tag}></${tag}>`);
  (element as any).setConfig({ type: `custom:${tag}`, default_growspace: growspace.growspaceId });
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

    unmount() {
      element.remove();
    },
  };
}
