import { describe, it, expect, afterEach } from 'vitest';
import './config-tanks-tab';
import type { ConfigTanksTab } from './config-tanks-tab';
import type { TankEditVM, TankRowVM, TanksTabViewModel } from '../viewmodels/tanks-tab.viewmodel';

function row(over: Partial<TankRowVM> = {}): TankRowVM {
  return {
    index: 0,
    displayName: 'Main',
    sensorEntity: 'sensor.a',
    volumeLiters: 100,
    warningLevel: 20,
    ...over,
  };
}

const draft: TankEditVM = {
  sensorEntity: 'sensor.a',
  name: 'Main',
  volumeLiters: 100,
  warningLevel: 20,
};

function makeVm(over: Partial<TanksTabViewModel> = {}): TanksTabViewModel {
  return { tanks: [], editing: null, sensorOptions: [], showEmpty: true, ...over };
}

async function mount(vm: TanksTabViewModel): Promise<ConfigTanksTab> {
  const el = document.createElement('config-tanks-tab') as ConfigTanksTab;
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

describe('ConfigTanksTab — render', () => {
  it('shows the empty line and no form when idle/empty', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.textContent).toContain('No tanks configured');
    expect(el.shadowRoot!.querySelector('.md3-input-group')).toBeNull();
  });

  it('renders a row per tank with its formatted summary', async () => {
    const el = await mount(
      makeVm({ showEmpty: false, tanks: [row(), row({ index: 1, displayName: 'Tank 2' })] })
    );
    const text = el.shadowRoot!.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Main');
    expect(text).toContain('warn at 20%');
    // two rows × (edit + delete) = 4 row buttons (`.md3-button.text`)
    expect(el.shadowRoot!.querySelectorAll('.md3-button.text').length).toBe(4);
  });

  it('gives each row action an accessible name', async () => {
    const el = await mount(makeVm({ showEmpty: false, tanks: [row()] }));
    const labels = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.md3-button.text')].map(
      (button) => button.getAttribute('aria-label')
    );
    expect(labels).toEqual(['Edit Main', 'Delete Main']);
  });

  it('renders the inline form (with sensor datalist) when editing', async () => {
    const el = await mount(
      makeVm({ showEmpty: false, editing: draft, sensorOptions: ['sensor.a', 'sensor.b'] })
    );
    expect(el.shadowRoot!.querySelectorAll('.md3-input-group').length).toBe(4);
    expect(el.shadowRoot!.querySelectorAll('#list-tank-sensor-entity option').length).toBe(2);
  });
});

describe('ConfigTanksTab — intents out', () => {
  it('emits add-tank-requested on the Add Tank button', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('add-tank-requested', () => fired++);
    [...el.shadowRoot!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Add Tank'))!
      .click();
    expect(fired).toBe(1);
  });

  it('emits edit/delete intents with the row index', async () => {
    const el = await mount(
      makeVm({
        showEmpty: false,
        tanks: [row({ index: 0 }), row({ index: 1, displayName: 'Tank 2' })],
      })
    );
    const edits = listen<{ index: number }>(el, 'edit-tank-requested');
    const deletes = listen<{ index: number }>(el, 'delete-tank-requested');
    // Second row's buttons: edit then delete.
    const rowEls = el.shadowRoot!.querySelectorAll('div[style*="rgba(255,255,255,0.05)"]');
    const secondRowButtons = rowEls[1].querySelectorAll('button');
    secondRowButtons[0].click();
    secondRowButtons[1].click();
    expect(edits).toEqual([{ index: 1 }]);
    expect(deletes).toEqual([{ index: 1 }]);
  });

  it('emits tank-draft-changed / cancel-tank / save-tank-requested from the form', async () => {
    const el = await mount(makeVm({ showEmpty: false, editing: draft }));
    const drafts = listen<{ partial: Record<string, unknown> }>(el, 'tank-draft-changed');
    let cancelled = 0;
    let saved = 0;
    el.addEventListener('cancel-tank', () => cancelled++);
    el.addEventListener('save-tank-requested', () => saved++);

    const nameInput = el.shadowRoot!.querySelectorAll<HTMLInputElement>('input.md3-input')[1];
    nameInput.value = 'Renamed';
    nameInput.dispatchEvent(new Event('input'));
    expect(drafts).toEqual([{ partial: { name: 'Renamed' } }]);

    [...el.shadowRoot!.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Cancel')!
      .click();
    [...el.shadowRoot!.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Save Tank'))!
      .click();
    expect(cancelled).toBe(1);
    expect(saved).toBe(1);
  });
});
