import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import type { GrowspaceDevice } from '../../../src/types';
import type { ConfigNotificationsTab } from '../../../src/features/config/components/config-notifications-tab';

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

  // The Notifications tab is now a nested dumb component behind its own shadow
  // root (ADR-0019, "Applied to Config Dialog"); pierce it to reach the inputs.
  async function tab(): Promise<ConfigNotificationsTab> {
    element.currentTab = ConfigTab.NOTIFICATIONS;
    await element.updateComplete;
    const el = element.shadowRoot?.querySelector(
      'config-notifications-tab'
    ) as ConfigNotificationsTab;
    await el.updateComplete;
    return el;
  }

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
    element.growspaceId = 'gs1';
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
    const t = await tab();

    const inputs = t.shadowRoot?.querySelectorAll('md3-number-input[data-notif]');
    expect(inputs?.length).toBe(6);

    const criticalInput = t.shadowRoot?.querySelector(
      'md3-number-input[data-notif="criticalCooldownMinutes"]'
    );
    expect((criticalInput as any)?.value).toBe(90);

    const warningInput = t.shadowRoot?.querySelector(
      'md3-number-input[data-notif="warningCooldownMinutes"]'
    );
    expect((warningInput as any)?.value).toBe(45);
  });

  it('renders ai_auto_alerts toggle seeded from device', async () => {
    const t = await tab();

    const toggle = t.shadowRoot?.querySelector(
      'input[type="checkbox"][data-notif="aiAutoAlerts"]'
    ) as HTMLInputElement;
    expect(toggle).toBeTruthy();
    expect(toggle.checked).toBe(false);
  });

  it('dispatches UPDATE_NOTIFICATIONS_DRAFT when a number input changes', async () => {
    const t = await tab();

    const input = t.shadowRoot?.querySelector(
      'md3-number-input[data-notif="criticalCooldownMinutes"]'
    );
    input?.dispatchEvent(new CustomEvent('change', { detail: 120, bubbles: true, composed: true }));

    const draft = (element as any)._sm.tabs.notifications.draft;
    expect(draft.criticalCooldownMinutes).toBe(120);
  });

  it('dispatches UPDATE_NOTIFICATIONS_DRAFT when toggle changes', async () => {
    const t = await tab();

    const toggle = t.shadowRoot?.querySelector(
      'input[type="checkbox"][data-notif="aiAutoAlerts"]'
    ) as HTMLInputElement;
    Object.defineProperty(toggle, 'checked', { value: true, writable: true });
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    const draft = (element as any)._sm.tabs.notifications.draft;
    expect(draft.aiAutoAlerts).toBe(true);
  });

  // ── Tab Intent → SM-event wiring (guards the 8 hand-wired @event names in
  //    the Shell's _renderNotificationsTab; a typo would silently no-op) ──
  function btn(t: ConfigNotificationsTab, label: string): HTMLButtonElement {
    return [...t.shadowRoot!.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label
    )! as HTMLButtonElement;
  }

  // A click mutates the host SM → the host re-renders → the new VM flows to the
  // nested tab. Await both so the next query sees the projected sub-state.
  async function settle(t: ConfigNotificationsTab): Promise<void> {
    await element.updateComplete;
    await t.updateComplete;
  }

  it('wires add → draft → commit: nested form intents flow to the SM', async () => {
    const t = await tab();
    btn(t, 'Add').click();
    expect((element as any)._sm.tabs.notifications.sub.kind).toBe('adding');

    await settle(t);
    const message = t.shadowRoot!.querySelector<HTMLInputElement>(
      'input[data-timed-field="message"]'
    )!;
    message.value = 'Flip to flower';
    message.dispatchEvent(new Event('input', { bubbles: true }));
    expect((element as any)._sm.tabs.notifications.sub.draft.message).toBe('Flip to flower');

    await settle(t);
    btn(t, 'Add').click();
    const tabState = (element as any)._sm.tabs.notifications;
    expect(tabState.sub.kind).toBe('idle');
    expect(tabState.timedNotifications).toHaveLength(1);
    expect(tabState.timedNotifications[0].message).toBe('Flip to flower');
  });

  it('wires cancel intent from the add form back to idle', async () => {
    const t = await tab();
    btn(t, 'Add').click();
    await settle(t);
    btn(t, 'Cancel').click();
    expect((element as any)._sm.tabs.notifications.sub.kind).toBe('idle');
  });

  it('wires request-delete → confirm-delete removing the notification', async () => {
    const t = await tab();
    btn(t, 'Add').click();
    await settle(t);
    btn(t, 'Add').click(); // commit a blank timed notification
    await settle(t);

    const id = (element as any)._sm.tabs.notifications.timedNotifications[0].id;
    t.shadowRoot!.querySelector<HTMLButtonElement>(`[data-timed-delete="${id}"]`)!.click();
    expect((element as any)._sm.tabs.notifications.sub.kind).toBe('confirm-delete');

    await settle(t);
    btn(t, 'Delete').click();
    expect((element as any)._sm.tabs.notifications.timedNotifications).toHaveLength(0);
    expect((element as any)._sm.tabs.notifications.sub.kind).toBe('idle');
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
