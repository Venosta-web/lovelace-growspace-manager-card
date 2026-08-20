import { describe, it, expect, afterEach } from 'vitest';
import './config-subareas-tab';
import type { ConfigSubareasTab } from './config-subareas-tab';
import type { SubareasTabViewModel } from '../viewmodels/subareas-tab.viewmodel';
import type { Subarea } from '../../../slices/subarea';

const subA = { id: 'sa1', name: 'Zone A' } as Subarea;

function makeVm(over: Partial<SubareasTabViewModel> = {}): SubareasTabViewModel {
  return { hasGrowspace: true, adding: null, loading: false, subareas: [], showEmpty: true, ...over };
}

async function mount(vm: SubareasTabViewModel): Promise<ConfigSubareasTab> {
  const el = document.createElement('config-subareas-tab') as ConfigSubareasTab;
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

describe('ConfigSubareasTab — render', () => {
  it('shows the "select a growspace first" hint when none is selected', async () => {
    const el = await mount(makeVm({ hasGrowspace: false }));
    expect(el.shadowRoot!.textContent).toContain('Select a growspace in the Sensors tab first');
  });

  it('shows loading / empty states', async () => {
    const loading = await mount(makeVm({ loading: true, showEmpty: false }));
    expect(loading.shadowRoot!.textContent).toContain('Loading...');
    document.body.innerHTML = '';
    const empty = await mount(makeVm());
    expect(empty.shadowRoot!.textContent).toContain('No subareas configured');
  });

  it('renders rows with edit/delete; a confirming row shows Yes/No', async () => {
    const el = await mount(
      makeVm({
        showEmpty: false,
        subareas: [
          { subarea: subA, confirmingDelete: false },
          { subarea: { id: 'sa2', name: 'Zone B' } as Subarea, confirmingDelete: true },
        ],
      })
    );
    const text = el.shadowRoot!.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Zone A');
    expect(text).toContain('ID: sa1');
    expect(text).toContain('Remove Zone B?');
    expect([...el.shadowRoot!.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Yes')).toBe(true);
  });

  it('renders the add form when adding', async () => {
    const el = await mount(makeVm({ adding: { name: 'Zone X' } }));
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input.md3-input')!;
    expect(input.value).toBe('Zone X');
  });
});

describe('ConfigSubareasTab — intents out', () => {
  it('emits add-subarea-requested on the Add Subarea button', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('add-subarea-requested', () => fired++);
    [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Subarea'))!.click();
    expect(fired).toBe(1);
  });

  it('emits subarea-name-changed and commit-add-subarea from the add form', async () => {
    const el = await mount(makeVm({ adding: { name: 'Zone X' } }));
    const names = listen<{ name: string }>(el, 'subarea-name-changed');
    let committed = 0;
    el.addEventListener('commit-add-subarea', () => committed++);

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input.md3-input')!;
    input.value = 'Renamed';
    input.dispatchEvent(new Event('input'));
    expect(names).toEqual([{ name: 'Renamed' }]);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    [...el.shadowRoot!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add')!.click();
    expect(committed).toBe(2); // Enter + Add button
  });

  it('emits edit/delete row intents and confirm/cancel delete', async () => {
    const el = await mount(makeVm({ showEmpty: false, subareas: [{ subarea: subA, confirmingDelete: false }] }));
    const edits = listen<{ subarea: Subarea }>(el, 'edit-subarea-requested');
    const deletes = listen<{ id: string }>(el, 'delete-subarea-requested');
    const rowButtons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.md3-button.text');
    rowButtons[0].click(); // edit
    rowButtons[1].click(); // delete
    expect(edits).toEqual([{ subarea: subA }]);
    expect(deletes).toEqual([{ id: 'sa1' }]);

    document.body.innerHTML = '';
    const confirming = await mount(makeVm({ showEmpty: false, subareas: [{ subarea: subA, confirmingDelete: true }] }));
    let confirmed = 0;
    let cancelled = 0;
    confirming.addEventListener('confirm-delete-subarea', (e) => {
      confirmed++;
      expect((e as CustomEvent).detail).toEqual({ id: 'sa1' });
    });
    confirming.addEventListener('cancel-delete-subarea', () => cancelled++);
    const btns = [...confirming.shadowRoot!.querySelectorAll('button')];
    btns.find((b) => b.textContent?.trim() === 'Yes')!.click();
    btns.find((b) => b.textContent?.trim() === 'No')!.click();
    expect(confirmed).toBe(1);
    expect(cancelled).toBe(1);
  });
});
