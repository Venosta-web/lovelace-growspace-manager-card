import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import type { GrowspaceDevice } from '../../../src/types';

describe('ConfigDialog — Notifications tab', () => {
  let element: ConfigDialog;

  const device: GrowspaceDevice = {
    deviceId: 'gs1',
    name: 'Tent 1',
    rows: 4,
    plantsPerRow: 4,
    notificationTarget: '',
    notificationSettings: {
      criticalCooldownMinutes: 90,
      warningCooldownMinutes: 45,
      recoveryCooldownMinutes: 10,
      escalationDelayMinutes: 20,
      minStressDurationSeconds: 120,
      warningPersistenceMinutes: 30,
      aiAutoAlerts: false,
    },
    environmentAttributes: {},
  } as any;

  beforeEach(async () => {
    if (!customElements.get('config-dialog')) {
      customElements.define('config-dialog', ConfigDialog);
    }
    if (!customElements.get('ha-dialog')) {
      customElements.define('ha-dialog', class HaDialogMock extends HTMLElement { open = false; });
    }

    element = new ConfigDialog();
    element.hass = { services: {}, localize: (k: string) => `[${k}]`, callService: vi.fn() } as any;
    element.devices = [device];
    element.growspaceOptions = { gs1: 'Tent 1' };
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
  });

  it('shows Save button in footer when Notifications tab is active', async () => {
    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;

    const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary');
    expect(saveBtn).toBeTruthy();
    expect(saveBtn?.textContent?.trim()).toContain('Save');
  });

  it('renders all 6 number inputs seeded from device notification settings', async () => {
    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;

    const inputs = element.shadowRoot?.querySelectorAll('md3-number-input[data-notif]');
    expect(inputs?.length).toBe(6);

    const criticalInput = element.shadowRoot?.querySelector('md3-number-input[data-notif="criticalCooldownMinutes"]');
    expect((criticalInput as any)?.value).toBe(90);

    const warningInput = element.shadowRoot?.querySelector('md3-number-input[data-notif="warningCooldownMinutes"]');
    expect((warningInput as any)?.value).toBe(45);
  });

  it('renders ai_auto_alerts toggle seeded from device', async () => {
    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;

    const toggle = element.shadowRoot?.querySelector('input[type="checkbox"][data-notif="aiAutoAlerts"]') as HTMLInputElement;
    expect(toggle).toBeTruthy();
    expect(toggle.checked).toBe(false);
  });

  it('dispatches UPDATE_NOTIFICATIONS_DRAFT when a number input changes', async () => {
    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('md3-number-input[data-notif="criticalCooldownMinutes"]');
    input?.dispatchEvent(new CustomEvent('change', { detail: 120, bubbles: true, composed: true }));

    const draft = (element as any)._sm.tabs.notifications.draft;
    expect(draft.criticalCooldownMinutes).toBe(120);
  });

  it('dispatches UPDATE_NOTIFICATIONS_DRAFT when toggle changes', async () => {
    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;

    const toggle = element.shadowRoot?.querySelector('input[type="checkbox"][data-notif="aiAutoAlerts"]') as HTMLInputElement;
    Object.defineProperty(toggle, 'checked', { value: true, writable: true });
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    const draft = (element as any)._sm.tabs.notifications.draft;
    expect(draft.aiAutoAlerts).toBe(true);
  });

  it('dispatches save-notification-settings-submit event with correct payload on Save', async () => {
    const spy = vi.fn();
    element.addEventListener('save-notification-settings-submit', spy);

    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;

    const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLElement;
    saveBtn?.click();

    expect(spy).toHaveBeenCalledOnce();
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.notification_settings).toEqual({
      criticalCooldownMinutes: 90,
      warningCooldownMinutes: 45,
      recoveryCooldownMinutes: 10,
      escalationDelayMinutes: 20,
      minStressDurationSeconds: 120,
      warningPersistenceMinutes: 30,
    });
    expect(detail.ai_auto_alerts).toBe(false);
  });
});
