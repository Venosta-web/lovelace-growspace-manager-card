import { describe, it, expect, afterEach } from 'vitest';
import './config-heatmap-tab';
import type { ConfigHeatmapTab } from './config-heatmap-tab';
import type { HeatmapTabViewModel } from '../viewmodels/heatmap-tab.viewmodel';
import type { SensorGroup } from '../../../types';

function group(over: Partial<SensorGroup> = {}): SensorGroup {
  return { id: 'g1', name: 'Group A', x: 1, y: 2, z: 3, sensors: [], ...over } as SensorGroup;
}

function makeVm(over: Partial<HeatmapTabViewModel> = {}): HeatmapTabViewModel {
  return { groups: [], showEmpty: true, ...over };
}

async function mount(vm: HeatmapTabViewModel): Promise<ConfigHeatmapTab> {
  const el = document.createElement('config-heatmap-tab') as ConfigHeatmapTab;
  el.vm = vm;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function listen<T = unknown>(el: HTMLElement, type: string): T[] {
  const received: T[] = [];
  el.addEventListener(type, (e: Event) => received.push((e as CustomEvent).detail as T));
  return received;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConfigHeatmapTab — render', () => {
  it('shows the empty state when there are no groups', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.textContent).toContain('No sensor groups configured');
  });

  it('renders a row per group with its name and coords', async () => {
    const el = await mount(makeVm({ showEmpty: false, groups: [group(), group({ id: 'g2', name: 'Group B', x: 4, y: 5, z: 6 })] }));
    const rows = el.shadowRoot!.querySelectorAll('div[style*="rgba(255,255,255,0.05)"]');
    expect(rows.length).toBe(2);
    const text = el.shadowRoot!.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Group A');
    expect(text).toContain('X: 4, Y: 5, Z: 6');
  });
});

describe('ConfigHeatmapTab — intents out', () => {
  it('emits add-group-requested on the Add Group button', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('add-group-requested', () => fired++);
    [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Group'))!.click();
    expect(fired).toBe(1);
  });

  it('emits edit-group-requested with the whole group and delete-group-requested with the id', async () => {
    const g = group({ id: 'g2', name: 'Group B' });
    const el = await mount(makeVm({ showEmpty: false, groups: [g] }));
    const edits = listen<{ group: SensorGroup }>(el, 'edit-group-requested');
    const deletes = listen<{ id: string }>(el, 'delete-group-requested');
    const buttons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.md3-button.text');
    buttons[0].click(); // edit
    buttons[1].click(); // delete
    expect(edits).toEqual([{ group: g }]);
    expect(deletes).toEqual([{ id: 'g2' }]);
  });
});
