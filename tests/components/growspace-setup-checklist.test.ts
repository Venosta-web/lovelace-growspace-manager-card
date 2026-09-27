import { atom } from 'nanostores';
import { fixture, html } from '@open-wc/testing-helpers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGrowspaceDevice, type GrowspaceDevice } from '../../src/services/types';
import { deriveSetupChecklist } from '../../src/features/setup/setup-checklist';
import {
  SETUP_PRESET_IDS,
  type GrowspaceSetupChecklist,
  type SetupIntent,
} from '../../src/features/setup/growspace-setup-checklist';
import type { GrowspaceSetupChecklistContainer } from '../../src/features/setup/growspace-setup-checklist.container';
import '../../src/features/setup/growspace-setup-checklist';
import '../../src/features/setup/growspace-setup-checklist.container';
import * as growspaceSlice from '../../src/slices/growspace';
import * as uiSlice from '../../src/slices/ui';

vi.mock('../../src/slices/growspace', { spy: true });
vi.mock('../../src/slices/ui', { spy: true });

const DRYING = { lights: false, air: true, climate: true, irrigation: false, substrate: false };

function device(overrides: Partial<GrowspaceDevice> = {}): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Dry Room',
    setupPreset: 'drying_room',
    setupModules: DRYING,
    ...overrides,
  });
}

const ctx = { aiEnabled: null, tcPresent: false };

async function render(d: GrowspaceDevice = device()) {
  const el = await fixture<GrowspaceSetupChecklist>(html`
    <growspace-setup-checklist
      .checklist=${deriveSetupChecklist(d, ctx)}
      .growspaceName=${d.name}
    ></growspace-setup-checklist>
  `);
  const intents: SetupIntent[] = [];
  el.addEventListener('setup-intent', (e) => intents.push(e.detail));
  return { el, root: el.shadowRoot!, intents };
}

function button(root: ShadowRoot, text: string, within: ParentNode = root): HTMLButtonElement {
  const found = [...within.querySelectorAll('button')].find((b) =>
    b.textContent!.trim().startsWith(text)
  );
  if (!found) throw new Error(`no button "${text}"`);
  return found as HTMLButtonElement;
}

function stepRow(root: ShadowRoot, title: string): HTMLElement {
  const row = [...root.querySelectorAll<HTMLElement>('li.step')].find((li) =>
    li.textContent!.includes(title)
  );
  if (!row) throw new Error(`no step "${title}"`);
  return row;
}

describe('growspace-setup-checklist', () => {
  it('lists only the offered steps, ending with Dashboard ready', async () => {
    const { root } = await render();
    const titles = [...root.querySelectorAll('li.step .title > span:first-child')].map((s) =>
      s.textContent!.trim()
    );
    expect(titles).toEqual([
      'Circulation and exhaust',
      'Climate control',
      'Add or import plants',
      'Dashboard ready',
    ]);
    expect(root.querySelector('details summary')!.textContent).toContain('Not used here (3)');
  });

  it('labels optional steps so nobody mistakes them for blockers', async () => {
    const { root } = await render();
    expect(stepRow(root, 'Climate control').textContent).toContain('Optional');
    expect(stepRow(root, 'Circulation and exhaust').textContent).toContain('Core');
  });

  it('turns each gesture into one intent', async () => {
    const { root, intents } = await render();

    button(root, 'Set up', stepRow(root, 'Circulation and exhaust')).click();
    button(root, 'Not using this', stepRow(root, 'Climate control')).click();
    button(root, 'Add plants').click();
    button(root, 'Strain library').click();
    button(root, 'Offer again', root.querySelector('details')!).click();
    button(root, 'Label printing').click();

    expect(intents).toEqual([
      { kind: 'open-step', step: 'air' },
      { kind: 'set-module', module: 'climate', offered: false },
      { kind: 'open-step', step: 'plants' },
      { kind: 'open-strain-library' },
      { kind: 'set-module', module: 'lights', offered: true },
      { kind: 'open-extra', extra: 'labels' },
    ]);
  });

  it('offers every declared preset by name', async () => {
    const { root } = await render();
    const options = [...root.querySelectorAll('option')].map((o) => o.value);
    expect(options).toEqual([...SETUP_PRESET_IDS]);
    expect(root.querySelector('select')!.value).toBe('drying_room');
  });

  it('stamps a first preset at once', async () => {
    const { root, intents } = await render(device({ setupPreset: null, setupModules: null }));
    const select = root.querySelector('select')!;
    expect(select.value).toBe('');

    select.value = 'living_soil';
    select.dispatchEvent(new Event('change'));

    expect(intents).toEqual([{ kind: 'choose-preset', preset: 'living_soil' }]);
  });

  it('asks before a re-stamp discards the grower’s own choices', async () => {
    const { el, root, intents } = await render();
    const select = root.querySelector('select')!;

    select.value = 'curing_room';
    select.dispatchEvent(new Event('change'));
    await el.updateComplete;

    expect(intents).toEqual([]);
    expect(select.value).toBe('drying_room');
    expect(root.querySelector('.confirm')!.textContent).toContain('Curing room');

    button(root, 'Keep Drying room').click();
    await el.updateComplete;
    expect(root.querySelector('.confirm')).toBeNull();

    select.value = 'curing_room';
    select.dispatchEvent(new Event('change'));
    await el.updateComplete;
    button(root, 'Switch').click();

    expect(intents).toEqual([{ kind: 'choose-preset', preset: 'curing_room' }]);
  });

  it('renders nothing once the core is done', async () => {
    const { root } = await render(
      device({
        environmentAttributes: { exhaustFanEntities: ['fan.exhaust'] },
        plants: [{ entity_id: 'sensor.p1' } as never],
      })
    );
    expect(root.querySelector('section')).toBeNull();
  });
});

describe('growspace-setup-checklist-container', () => {
  const store = {
    instanceId: 'card-1',
    refreshData: vi.fn().mockResolvedValue(undefined),
    ui: { $language: atom('en'), setActiveDialog: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(growspaceSlice.setSetupModule).mockResolvedValue(undefined);
    vi.mocked(growspaceSlice.stampSetupPreset).mockResolvedValue(undefined);
    for (const open of [
      uiSlice.openConfigDialog,
      uiSlice.openStrainLibraryDialog,
      uiSlice.openGrowMasterDialog,
      uiSlice.openLabelTemplatesDialog,
      uiSlice.openTcDialog,
    ]) {
      vi.mocked(open).mockImplementation(() => undefined);
    }
  });

  async function mount(d: GrowspaceDevice = device()) {
    const el = await fixture<GrowspaceSetupChecklistContainer>(html`
      <growspace-setup-checklist-container
        .store=${store as never}
        .device=${d}
      ></growspace-setup-checklist-container>
    `);
    const inner = el.shadowRoot!.querySelector('growspace-setup-checklist')!;
    await inner.updateComplete;
    const send = async (detail: SetupIntent) => {
      inner.dispatchEvent(
        new CustomEvent('setup-intent', { detail, bubbles: true, composed: true })
      );
      await el.updateComplete;
    };
    return { el, inner, send };
  }

  it('opens the dialog that already configures each step', async () => {
    const d = device();
    const { send } = await mount(d);

    await send({ kind: 'open-step', step: 'air' });
    await send({ kind: 'open-step', step: 'climate' });
    await send({ kind: 'open-step', step: 'plants' });

    expect(uiSlice.openConfigDialog).toHaveBeenNthCalledWith(1, d, 'climate');
    expect(uiSlice.openConfigDialog).toHaveBeenNthCalledWith(2, d, 'humidity');
    expect(store.ui.setActiveDialog).toHaveBeenCalledWith({
      type: 'ADD_PLANTS',
      payload: { growspaceId: 'gs1' },
    });
  });

  it('opens extras in this card’s own portal', async () => {
    const { send } = await mount();

    await send({ kind: 'open-extra', extra: 'labels' });
    await send({ kind: 'open-extra', extra: 'tc' });

    expect(uiSlice.openLabelTemplatesDialog).toHaveBeenCalledWith({ portalId: 'card-1' });
    expect(uiSlice.openTcDialog).toHaveBeenCalledWith({ growspaceId: 'gs1', portalId: 'card-1' });
  });

  it('saves a module choice through the slice', async () => {
    const { send } = await mount();

    await send({ kind: 'set-module', module: 'climate', offered: false });

    expect(growspaceSlice.setSetupModule).toHaveBeenCalledWith('gs1', 'climate', false);
  });

  it('stamps a preset and then fetches the modules the backend stamped', async () => {
    const { send } = await mount();

    await send({ kind: 'choose-preset', preset: 'curing_room' });
    await vi.waitFor(() => expect(store.refreshData).toHaveBeenCalledWith(true));

    expect(growspaceSlice.stampSetupPreset).toHaveBeenCalledWith('gs1', 'curing_room');
  });

  it('says so when a save fails', async () => {
    vi.mocked(growspaceSlice.setSetupModule).mockRejectedValueOnce(new Error('offline'));
    const { el, inner, send } = await mount();

    await send({ kind: 'set-module', module: 'air', offered: false });
    await vi.waitFor(async () => {
      await el.updateComplete;
      await inner.updateComplete;
      expect(inner.shadowRoot!.querySelector('[role="alert"]')?.textContent).toContain(
        'Could not save'
      );
    });
  });
});
