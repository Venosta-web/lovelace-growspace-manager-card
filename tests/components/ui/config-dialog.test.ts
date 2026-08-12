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

  it('closes immediately when Escape is pressed with a clean draft', () => {
    const close = vi.fn();
    element.addEventListener('close', close);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(close).toHaveBeenCalledOnce();
    expect((element as any)._sm.status.kind).toBe('idle');
  });

  it('prompts instead of closing on Escape when dirty and closes after discard', async () => {
    const close = vi.fn();
    element.addEventListener('close', close);
    (element as any).envTemperatureSensors = ['sensor.changed'];

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await element.updateComplete;

    expect(close).not.toHaveBeenCalled();
    expect(element.shadowRoot!.querySelector('.confirm-discard-overlay')).toBeTruthy();

    (element as any)._confirmDiscard();

    expect(close).toHaveBeenCalledOnce();
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
