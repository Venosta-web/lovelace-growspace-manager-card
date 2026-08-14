import { describe, it, expect, afterEach } from 'vitest';
import './config-growspaces-tab';
import type { ConfigGrowspacesTab } from './config-growspaces-tab';
import type {
  GrowspaceDraft,
  GrowspacesTabViewModel,
} from '../viewmodels/growspaces-tab.viewmodel';

const draft: GrowspaceDraft = { name: 'Tent 1', rows: 4, plantsPerRow: 4, notificationService: '' };
const removalImpact = { sensorCount: 0, controllerCount: 0 };

function makeVm(over: Partial<GrowspacesTabViewModel> = {}): GrowspacesTabViewModel {
  return {
    growspaces: [
      { id: 'gs1', name: 'Tent 1', active: false },
      { id: 'gs2', name: 'Tent 2', active: false },
    ],
    state: { mode: 'idle' },
    notifyServices: [{ label: 'phone', value: 'mobile_app_phone' }],
    ...over,
  };
}

async function mount(vm: GrowspacesTabViewModel): Promise<ConfigGrowspacesTab> {
  const el = document.createElement('config-growspaces-tab') as ConfigGrowspacesTab;
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

describe('ConfigGrowspacesTab — render', () => {
  it('renders the master list with the placeholder when idle', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.querySelectorAll('.cfg-gs-row').length).toBe(2);
    expect(el.shadowRoot!.textContent).toContain('Select a growspace to edit');
  });

  it('highlights the active row', async () => {
    const el = await mount(
      makeVm({
        growspaces: [{ id: 'gs1', name: 'Tent 1', active: true }],
        state: {
          mode: 'editing',
          id: 'gs1',
          draft,
          lungroom: { value: [], options: [] },
          camera: { value: [], options: [] },
          removalImpact,
        },
      })
    );
    expect(el.shadowRoot!.querySelector('.cfg-gs-row.active')).not.toBeNull();
  });

  it('renders the add form (no Save/Cancel buttons — footer owns them)', async () => {
    const el = await mount(makeVm({ state: { mode: 'adding', draft } }));
    expect(el.shadowRoot!.textContent).toContain('New Growspace');
    expect(el.shadowRoot!.querySelector('md3-text-input')).not.toBeNull();
    // The notify dropdown lists the injected services.
    expect(el.shadowRoot!.querySelectorAll('select option').length).toBe(2); // None + phone
    // No action buttons in the section other than the master "Add Growspace".
    const labels = [...el.shadowRoot!.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(labels.filter((t) => t === 'Save' || t === 'Cancel' || t === 'Delete')).toHaveLength(0);
  });

  it('renders the edit form with the two env multi-selects', async () => {
    const el = await mount(
      makeVm({
        state: {
          mode: 'editing',
          id: 'gs1',
          draft,
          lungroom: { value: ['sensor.lr'], options: ['sensor.lr'] },
          camera: { value: [], options: ['camera.a'] },
          removalImpact,
        },
      })
    );
    expect(el.shadowRoot!.textContent).toContain('Edit Details');
    expect(el.shadowRoot!.querySelectorAll('config-entity-multi-select').length).toBe(2);
  });

  it('shows the confirm-delete full view (no list) and the name', async () => {
    const el = await mount(makeVm({ state: { mode: 'confirm-delete', name: 'Tent 1' } }));
    expect(el.shadowRoot!.textContent).toContain('Delete Growspace?');
    expect(el.shadowRoot!.textContent).toContain('Tent 1');
    expect(el.shadowRoot!.querySelector('.cfg-master-list')).toBeNull();
  });
});

describe('ConfigGrowspacesTab — intents out', () => {
  it('emits select-growspace on a master row click', async () => {
    const el = await mount(makeVm());
    const received = listen<{ id: string }>(el, 'select-growspace');
    el.shadowRoot!.querySelectorAll<HTMLElement>('.cfg-gs-row')[1].click();
    expect(received).toEqual([{ id: 'gs2' }]);
  });

  it('emits start-add-growspace on the Add Growspace button', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('start-add-growspace', () => fired++);
    el.shadowRoot!.querySelector<HTMLElement>('.cfg-master-add-btn')!.click();
    expect(fired).toBe(1);
  });

  it('emits add-draft-changed from the add form', async () => {
    const el = await mount(makeVm({ state: { mode: 'adding', draft } }));
    const received = listen<{ partial: Record<string, unknown> }>(el, 'add-draft-changed');
    el.shadowRoot!.querySelector('md3-text-input')!.dispatchEvent(
      new CustomEvent('change', { detail: 'Renamed', bubbles: true, composed: true })
    );
    expect(received).toEqual([{ partial: { name: 'Renamed' } }]);
  });

  it('emits edit-draft-changed and env-draft-changed from the edit form', async () => {
    const el = await mount(
      makeVm({
        state: {
          mode: 'editing',
          id: 'gs1',
          draft,
          lungroom: { value: [], options: ['sensor.lr'] },
          camera: { value: [], options: [] },
          removalImpact,
        },
      })
    );
    const drafts = listen<{ partial: Record<string, unknown> }>(el, 'edit-draft-changed');
    const env = listen<{ partial: Record<string, unknown> }>(el, 'env-draft-changed');

    el.shadowRoot!.querySelector('md3-text-input')!.dispatchEvent(
      new CustomEvent('change', { detail: 'Edited', bubbles: true, composed: true })
    );
    expect(drafts).toEqual([{ partial: { name: 'Edited' } }]);

    const lungroomPicker = el.shadowRoot!.querySelector(
      'config-entity-multi-select[list-id="list-multi-lungroomTempSensors"]'
    )!;
    const lungroomInput = lungroomPicker.shadowRoot!.querySelector<HTMLInputElement>('input')!;
    lungroomInput.value = 'sensor.lr';
    lungroomInput.dispatchEvent(new Event('change'));
    expect(env).toEqual([{ partial: { lungroomTempSensors: ['sensor.lr'] } }]);
  });
});
