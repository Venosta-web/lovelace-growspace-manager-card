import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { createGrowspaceDevice } from '../../../src/services/types';

function device(deviceId: string) {
  return createGrowspaceDevice({ deviceId, name: deviceId, rows: 4, plantsPerRow: 4 });
}

function buttonByText(element: ConfigDialog, text: string): HTMLButtonElement | undefined {
  return Array.from(element.shadowRoot!.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text)
  );
}

function contextSelect(element: ConfigDialog): HTMLSelectElement {
  return element.shadowRoot!.querySelector<HTMLSelectElement>('select.cfg-context-select')!;
}

async function installEscapeHarness(element: ConfigDialog) {
  const haDialog = element.shadowRoot!.querySelector('ha-dialog')!;
  const haDialogRoot = haDialog.shadowRoot ?? haDialog.attachShadow({ mode: 'open' });
  const waDialog = document.createElement('wa-dialog') as HTMLElement & {
    dialog?: HTMLDialogElement;
  };
  const nativeDialog = document.createElement('dialog');
  waDialog.dialog = nativeDialog;
  waDialog.attachShadow({ mode: 'open' }).append(nativeDialog);
  haDialogRoot.append(waDialog);

  const addEventListener = vi.spyOn(nativeDialog, 'addEventListener');
  element.requestUpdate();
  await element.updateComplete;

  return {
    addEventListener,
    pressEscape() {
      const cancel = new Event('cancel', { cancelable: true });
      if (nativeDialog.dispatchEvent(cancel)) element.remove();
    },
  };
}

describe('config dialog unsaved-changes gestures', () => {
  let element: ConfigDialog;

  beforeEach(async () => {
    element = new ConfigDialog();
    element.hass = { states: {}, services: {} } as any;
    element.devices = [device('gs1'), device('gs2')];
    element.growspaceOptions = { gs1: 'Growspace 1', gs2: 'Growspace 2' };
    element.growspaceId = 'gs1';
    element.initialTab = ConfigTab.SENSORS;
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it('switches tabs immediately when the environment draft is clean', () => {
    (element as any)._switchTab(ConfigTab.CLIMATE);

    expect(element.currentTab).toBe(ConfigTab.CLIMATE);
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('prompts before switching tabs when dirty and performs the pending switch on discard', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];

    (element as any)._switchTab(ConfigTab.CLIMATE);
    await element.updateComplete;

    expect(element.currentTab).toBe(ConfigTab.SENSORS);
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();

    (element as any)._confirmDiscard();

    expect(element.currentTab).toBe(ConfigTab.CLIMATE);
    expect((element as any).envTemperatureSensors).toEqual([]);
  });

  it('closes immediately when Escape is pressed with a clean draft', async () => {
    const close = vi.fn();
    element.addEventListener('close', () => {
      close();
      element.remove();
    });
    const escape = await installEscapeHarness(element);

    escape.pressEscape();

    expect(close).toHaveBeenCalledOnce();
    expect(element.isConnected).toBe(false);
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('renders the discard prompt without unmounting and Keep editing preserves the draft', async () => {
    const close = vi.fn();
    element.addEventListener('close', close);
    (element as any).envTemperatureSensors = ['sensor.changed'];
    const activeTab = element.currentTab;
    const escape = await installEscapeHarness(element);

    escape.pressEscape();
    await element.updateComplete;

    expect(close).not.toHaveBeenCalled();
    expect(element.isConnected).toBe(true);
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();

    buttonByText(element, 'Keep editing')!.click();
    await element.updateComplete;

    expect(element.isConnected).toBe(true);
    expect(element.currentTab).toBe(activeTab);
    expect((element as any).envTemperatureSensors).toEqual(['sensor.changed']);
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeNull();
    expect(close).not.toHaveBeenCalled();
  });

  it('binds one cancel guard to each rendered dialog instance', async () => {
    const escape = await installEscapeHarness(element);

    element.requestUpdate();
    await element.updateComplete;

    expect(escape.addEventListener.mock.calls.filter(([type]) => type === 'cancel')).toHaveLength(
      1
    );
  });

  it('scopes Escape to the active dialog when several instances are mounted', async () => {
    const other = new ConfigDialog();
    other.hass = { states: {}, services: {} } as any;
    other.devices = [device('gs2')];
    other.growspaceOptions = { gs2: 'Growspace 2' };
    other.growspaceId = 'gs2';
    other.initialTab = ConfigTab.SENSORS;
    other.open = true;
    document.body.appendChild(other);
    await other.updateComplete;

    (element as any).envTemperatureSensors = ['sensor.changed'];
    const escape = await installEscapeHarness(element);
    await installEscapeHarness(other);

    escape.pressEscape();
    await element.updateComplete;

    expect(element.isConnected).toBe(true);
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();
    expect(other.isConnected).toBe(true);
    expect((other as any)._sm.status.kind).toBe('idle');

    other.remove();
  });

  it('changes growspace immediately when the environment draft is clean', () => {
    (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs2' } });

    expect((element as any).envSelectedId).toBe('gs2');
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('prompts before changing growspace when dirty and cancellation preserves the draft', () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];

    (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs2' } });

    expect((element as any).envSelectedId).toBe('gs1');
    expect((element as any).envTemperatureSensors).toEqual(['sensor.changed']);

    (element as any)._cancelDiscard();

    expect((element as any).envSelectedId).toBe('gs1');
    expect((element as any).envTemperatureSensors).toEqual(['sensor.changed']);
  });

  it('applies the pending growspace change after discard', () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];
    (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs2' } });

    (element as any)._confirmDiscard();

    expect((element as any).envSelectedId).toBe('gs2');
    expect((element as any).envTemperatureSensors).toEqual([]);
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  // The context bar's one job is naming the growspace the form writes to, so it is
  // asserted through the rendered <select>: the draft never moves on a refused
  // switch, so a state-machine-only assertion passes while the DOM keeps showing
  // the growspace the user backed out of.
  it('keeps the context bar on the edited growspace while the discard prompt is open', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];
    await element.updateComplete;

    const select = contextSelect(element);
    select.value = 'gs2';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();
    expect(contextSelect(element).value).toBe('gs1');
  });

  it('restores the context bar to the edited growspace after Keep editing', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];
    await element.updateComplete;

    const select = contextSelect(element);
    select.value = 'gs2';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    buttonByText(element, 'Keep editing')!.click();
    await element.updateComplete;

    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeNull();
    expect(contextSelect(element).value).toBe('gs1');
    expect((element as any).envTemperatureSensors).toEqual(['sensor.changed']);
  });

  it('moves the context bar to the new growspace when the switch is confirmed', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];
    await element.updateComplete;

    const select = contextSelect(element);
    select.value = 'gs2';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    buttonByText(element, 'Discard')!.click();
    await element.updateComplete;

    expect(contextSelect(element).value).toBe('gs2');
    expect((element as any).envSelectedId).toBe('gs2');
  });

  it('names both growspaces in the discard prompt for a refused switch', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];
    await element.updateComplete;

    const select = contextSelect(element);
    select.value = 'gs2';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    const prompt = element.shadowRoot!.querySelector('#config-discard-description')!;
    expect(prompt.textContent).toContain('Growspace 1');
    expect(prompt.textContent).toContain('Growspace 2');
  });

  it('names the growspace the Growspaces tab is editing, not the stale context selection', async () => {
    element.currentTab = ConfigTab.GROWSPACES;
    (element as any)._sm = { ...(element as any)._sm, activeTab: ConfigTab.GROWSPACES };
    (element as any)._populateEditFields('gs2');
    (element as any)._t({ type: 'UPDATE_EDIT_DRAFT', partial: { name: 'Renamed' } });
    await element.updateComplete;

    (element as any)._switchTab(ConfigTab.SENSORS);
    await element.updateComplete;

    const prompt = element.shadowRoot!.querySelector('#config-discard-description')!;
    expect(prompt.textContent).toContain('Growspace 2');
    expect(prompt.textContent).not.toContain('Growspace 1');
  });

  it('names the growspace losing its changes in the close guard prompt', async () => {
    (element as any).envTemperatureSensors = ['sensor.changed'];

    const escape = await installEscapeHarness(element);
    escape.pressEscape();
    await element.updateComplete;

    const prompt = element.shadowRoot!.querySelector('#config-discard-description')!;
    expect(prompt.textContent).toContain('Growspace 1');
    expect(prompt.textContent).not.toContain('Growspace 2');
  });
});

describe('config dialog environment save gate', () => {
  let element: ConfigDialog;

  beforeEach(async () => {
    element = new ConfigDialog();
    element.hass = { states: {}, services: {}, language: 'en' } as any;
    element.devices = [device('gs1')];
    element.growspaceOptions = { gs1: 'Growspace 1' };
    element.growspaceId = 'gs1';
    element.initialTab = ConfigTab.SENSORS;
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it('explains an unmet precondition on another tab and preserves the draft when navigating to Sensors', async () => {
    element.currentTab = ConfigTab.CLIMATE;
    (element as any).envCo2Sensor = 'sensor.co2';
    await element.updateComplete;

    const message = element.shadowRoot!.querySelector('.save-gate-message');
    const save = buttonByText(element, 'Save Environment');

    expect(message?.textContent).toContain('Temperature and humidity sensors are required.');
    expect(message?.textContent).toContain('Go to Sensors');
    expect(save?.disabled).toBe(true);

    buttonByText(element, 'Go to Sensors')!.click();

    expect(element.currentTab).toBe(ConfigTab.SENSORS);
    expect((element as any).envCo2Sensor).toBe('sensor.co2');
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeNull();
  });

  it('enables and submits the environment save when the precondition is met', async () => {
    (element as any).envTemperatureSensors = ['sensor.temperature'];
    (element as any).envHumiditySensors = ['sensor.humidity'];
    await element.updateComplete;
    const submit = vi.fn();
    element.addEventListener('configure-environment-submit', submit);

    const save = buttonByText(element, 'Save Environment');
    expect(element.shadowRoot!.querySelector('.save-gate-message')).toBeNull();
    expect(save?.disabled).toBe(false);

    save!.click();

    expect(submit).toHaveBeenCalledOnce();
  });

  it('blocks both halves of a growspace edit when the environment precondition is unmet', async () => {
    (element as any)._populateEditFields('gs1');
    element.currentTab = ConfigTab.GROWSPACES;
    await element.updateComplete;
    const edit = vi.fn();
    const environment = vi.fn();
    element.addEventListener('edit-growspace-submit', edit);
    element.addEventListener('configure-environment-submit', environment);

    (element as any)._submitGrowspaceAndEnv();

    expect(edit).not.toHaveBeenCalled();
    expect(environment).not.toHaveBeenCalled();
    expect(buttonByText(element, 'Save Growspace & Environment')?.disabled).toBe(true);
  });

  it('labels each footer action by the configuration it writes', async () => {
    (element as any).envTemperatureSensors = ['sensor.temperature'];
    (element as any).envHumiditySensors = ['sensor.humidity'];

    for (const tab of [
      ConfigTab.SENSORS,
      ConfigTab.CLIMATE,
      ConfigTab.GROWLIGHT,
      ConfigTab.HUMIDITY,
      ConfigTab.IRRIGATION,
      ConfigTab.TANKS,
      ConfigTab.HEATMAP,
      ConfigTab.VPD_TARGETS,
    ]) {
      element.currentTab = tab;
      await element.updateComplete;
      expect(buttonByText(element, 'Save Environment')).toBeDefined();
    }

    element.currentTab = ConfigTab.VISION;
    await element.updateComplete;
    expect(buttonByText(element, 'Save Vision Settings')).toBeDefined();
  });
});

describe('config dialog navigation accessibility', () => {
  let element: ConfigDialog;

  beforeEach(async () => {
    element = new ConfigDialog();
    element.hass = { states: {}, services: {}, language: 'en' } as any;
    element.devices = [device('gs1')];
    element.growspaceOptions = { gs1: 'Growspace 1' };
    element.growspaceId = 'gs1';
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
  });

  function tabs(): HTMLButtonElement[] {
    return Array.from(element.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  }

  it('renders a named tablist with named tabs and roving tabindex', () => {
    const tablist = element.shadowRoot!.querySelector('[role="tablist"]');
    const railTabs = tabs();

    expect(tablist?.getAttribute('aria-label')).toBe('Configuration sections');
    expect(railTabs).toHaveLength(12);
    expect(railTabs.every((tab) => Boolean(tab.getAttribute('aria-label')))).toBe(true);
    expect(railTabs.every((tab) => tab.title === tab.getAttribute('aria-label'))).toBe(true);
    expect(railTabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
    expect(railTabs[0].getAttribute('aria-selected')).toBe('true');
    expect(railTabs.slice(1).every((tab) => tab.getAttribute('aria-selected') === 'false')).toBe(
      true
    );
  });

  it('moves selection and focus with arrow keys and wraps at the ends', async () => {
    const first = tabs()[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await element.updateComplete;

    expect(element.currentTab).toBe(ConfigTab.NOTIFICATIONS);
    expect(element.shadowRoot!.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].tabIndex).toBe(0);
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');

    tabs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await element.updateComplete;
    tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await element.updateComplete;

    expect(element.currentTab).toBe(ConfigTab.VPD_TARGETS);
    expect(element.shadowRoot!.activeElement).toBe(tabs()[11]);
  });

  it('uses distinct icons for Growspaces and Subareas', () => {
    const growspacesPath = tabs()[0].querySelector('path')!.getAttribute('d');
    const subareasPath = tabs()[10].querySelector('path')!.getAttribute('d');

    expect(subareasPath).not.toBe(growspacesPath);
  });
});

describe('config dialog remove environment danger zone', () => {
  let element: ConfigDialog;

  const configuredDevice = createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Flower Tent',
    rows: 4,
    plantsPerRow: 4,
    environmentAttributes: {
      temperatureSensors: ['sensor.canopy_left', 'sensor.canopy_right'],
      humiditySensors: ['sensor.humidity'],
      irrigationTanks: [{ sensorEntity: 'sensor.tank', name: 'Reservoir', warningLevel: 30 }],
      exhaustFanEntities: ['fan.exhaust'],
      circulationFanEntities: ['fan.circulation'],
      humidifierAcInfinityDevices: [
        { mode_entity: 'select.humidifier_mode', speed_entity: 'number.humidifier_speed' },
      ],
    },
  });

  async function growspacesShadow(): Promise<ShadowRoot> {
    await element.updateComplete;
    const tab = element.shadowRoot!.querySelector('config-growspaces-tab') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await tab.updateComplete;
    return tab.shadowRoot!;
  }

  async function dangerButton(): Promise<HTMLButtonElement> {
    return Array.from((await growspacesShadow()).querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Remove Environment')
    )!;
  }

  beforeEach(async () => {
    element = new ConfigDialog();
    element.hass = { states: {}, services: {}, language: 'en' } as any;
    element.devices = [configuredDevice];
    element.growspaceOptions = { gs1: 'Flower Tent' };
    element.growspaceId = 'gs1';
    element.initialTab = ConfigTab.GROWSPACES;
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    element.remove();
    vi.restoreAllMocks();
  });

  it('places removal in the Growspaces detail danger zone instead of Climate', async () => {
    const dangerZone = (await growspacesShadow()).querySelector('.danger-zone');

    expect(dangerZone?.textContent).toContain('Danger zone');
    expect(dangerZone?.textContent).toContain('Remove Environment');

    element.currentTab = ConfigTab.CLIMATE;
    await element.updateComplete;
    const climate = element.shadowRoot!.querySelector('config-climate-tab') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await climate.updateComplete;
    expect(climate.shadowRoot!.textContent).not.toContain('Remove Environment');
  });

  it('shows the affected sensor and controller counts in the footer confirmation flow', async () => {
    await (await dangerButton()).click();
    await element.updateComplete;

    const confirmation = await growspacesShadow();
    expect(confirmation.textContent).toContain('4 sensors');
    expect(confirmation.textContent).toContain('3 controllers');
    expect(buttonByText(element, 'Confirm Remove')).toBeDefined();
    expect(buttonByText(element, 'Keep Environment')).toBeDefined();
    expect(element.shadowRoot!.activeElement).toBe(buttonByText(element, 'Keep Environment'));
    expect(getComputedStyle(buttonByText(element, 'Confirm Remove')!).minHeight).toBe('44px');
  });

  it('cancels removal without dispatching a mutation', async () => {
    const remove = vi.fn();
    element.addEventListener('remove-environment-submit', remove);
    await (await dangerButton()).click();
    await element.updateComplete;

    buttonByText(element, 'Keep Environment')!.click();
    await element.updateComplete;

    expect(remove).not.toHaveBeenCalled();
    expect(await dangerButton()).toBeDefined();
  });

  it('awaits the host mutation and reseeds from its refreshed backend device', async () => {
    let resolveMutation!: (device: ReturnType<typeof createGrowspaceDevice>) => void;
    const completion = new Promise<ReturnType<typeof createGrowspaceDevice>>((resolve) => {
      resolveMutation = resolve;
    });
    const remove = vi.fn((event: Event) => {
      (event as CustomEvent).detail.completion = completion;
    });
    element.addEventListener('remove-environment-submit', remove);
    const confirmSpy = vi.spyOn(window, 'confirm');

    await (await dangerButton()).click();
    await element.updateComplete;
    buttonByText(element, 'Confirm Remove')!.click();
    await element.updateComplete;

    expect(remove).toHaveBeenCalledOnce();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect((element as any).envTemperatureSensors).toEqual([
      'sensor.canopy_left',
      'sensor.canopy_right',
    ]);
    expect(buttonByText(element, 'Removing…')?.disabled).toBe(true);

    resolveMutation(device('gs1'));

    await vi.waitFor(() => expect((element as any).envTemperatureSensors).toEqual([]));
    expect((element as any).envSelectedId).toBe('gs1');
  });
});
