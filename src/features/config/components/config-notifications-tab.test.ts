import { describe, it, expect, afterEach } from 'vitest';
import './config-notifications-tab';
import type { ConfigNotificationsTab } from './config-notifications-tab';
import {
  TRIGGER_OPTIONS,
  type NotificationsTabViewModel,
} from '../viewmodels/notifications-tab.viewmodel';
import type {
  NotificationsDraft,
  NotificationsTabSub,
  TimedNotification,
  TimedNotificationDraft,
} from '../../../dialogs/config-dialog-sm';

const baseDraft: NotificationsDraft = {
  criticalCooldownMinutes: 90,
  warningCooldownMinutes: 45,
  recoveryCooldownMinutes: 10,
  escalationDelayMinutes: 20,
  minStressDurationSeconds: 120,
  warningPersistenceMinutes: 30,
  aiAutoAlerts: false,
};

const timedDraft: TimedNotificationDraft = {
  message: 'Lights on',
  triggerType: 'veg',
  day: 3,
  growspaceIds: ['gs1'],
};

function makeVm(over: Partial<NotificationsTabViewModel> = {}): NotificationsTabViewModel {
  return {
    draft: baseDraft,
    timedNotifications: [],
    sub: { kind: 'idle' },
    growspaceOptions: [{ id: 'gs1', name: 'Tent 1' }],
    triggerOptions: [...TRIGGER_OPTIONS],
    ...over,
  };
}

async function mount(vm: NotificationsTabViewModel): Promise<ConfigNotificationsTab> {
  const el = document.createElement('config-notifications-tab') as ConfigNotificationsTab;
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

describe('ConfigNotificationsTab — render', () => {
  it('groups all six timing fields in standard cards with iconed headers', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.querySelectorAll('md3-number-input[data-notif]').length).toBe(6);
    expect(el.shadowRoot!.querySelectorAll('.detail-card')).toHaveLength(2);
    expect(
      [...el.shadowRoot!.querySelectorAll('config-section-header')].map((header) => header.label)
    ).toEqual(['Notification settings', 'Timed notifications']);
    const groups = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[data-settings-group]')];
    expect(groups.map((group) => group.dataset.settingsGroup)).toEqual([
      'alert-timing',
      'stress-detection',
    ]);
    expect(groups[0].querySelectorAll('md3-number-input')).toHaveLength(4);
    expect(groups[1].querySelectorAll('md3-number-input')).toHaveLength(2);
    expect(groups[0].querySelector('.settings-group__description')!.textContent!.trim()).not.toBe(
      ''
    );
    expect(groups[1].querySelector('.settings-group__description')!.textContent!.trim()).not.toBe(
      ''
    );
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>(
      'input[type="checkbox"][data-notif="aiAutoAlerts"]'
    )!;
    expect(toggle.checked).toBe(false);
  });

  it('shows the empty state and Add button when no timed notifications and idle', async () => {
    const el = await mount(makeVm());
    expect(el.shadowRoot!.querySelector('[data-timed="empty-state"]')).not.toBeNull();
  });

  it('marks an unrecognised trigger in the list row instead of showing a stage', async () => {
    const items: TimedNotification[] = [
      {
        id: 'n1',
        message: 'A',
        triggerType: { raw: 'days_since_germination' },
        day: 1,
        growspaceIds: [],
      },
    ];
    const el = await mount(makeVm({ timedNotifications: items }));
    const row = el.shadowRoot!.querySelector('[data-timed-id="n1"]')!;
    const marker = row.querySelector('[data-timed-unknown-trigger="n1"]')!;
    expect(marker).not.toBeNull();
    expect(marker.textContent).toContain('days_since_germination');
  });

  it('selects the unrecognised value in the edit form rather than a valid stage', async () => {
    const sub: NotificationsTabSub = {
      kind: 'editing',
      id: 'n1',
      draft: { ...timedDraft, triggerType: { raw: 'days_since_germination' } },
    };
    const el = await mount(makeVm({ sub }));
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'select[data-timed-field="triggerType"]'
    )!;
    expect(select.value).toBe('days_since_germination');
    // The selection the user sees, not just the settled `.value` property.
    expect(select.selectedIndex).toBe(0);
    expect(select.selectedOptions[0].hasAttribute('data-timed-unknown-option')).toBe(true);
    expect(select.querySelector('[data-timed-unknown-option]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-timed-unknown-hint]')).not.toBeNull();
  });

  it('offers only the known stages when the draft trigger is recognised', async () => {
    const sub: NotificationsTabSub = { kind: 'editing', id: 'n1', draft: timedDraft };
    const el = await mount(makeVm({ sub }));
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'select[data-timed-field="triggerType"]'
    )!;
    expect(select.value).toBe('veg');
    expect(select.querySelector('[data-timed-unknown-option]')).toBeNull();
  });

  it('renders a row per timed notification', async () => {
    const items: TimedNotification[] = [
      { id: 'n1', message: 'A', triggerType: 'veg', day: 1, growspaceIds: [] },
      { id: 'n2', message: 'B', triggerType: 'dry', day: 9, growspaceIds: [] },
    ];
    const el = await mount(makeVm({ timedNotifications: items }));
    expect(el.shadowRoot!.querySelectorAll('[data-timed-id]').length).toBe(2);
  });

  it('uses accessible icon buttons for timed notification row actions', async () => {
    const item: TimedNotification = {
      id: 'n1',
      message: 'Lights on',
      triggerType: 'veg',
      day: 1,
      growspaceIds: [],
    };
    const el = await mount(makeVm({ timedNotifications: [item] }));
    const edit = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-timed-edit="n1"]')!;
    const remove = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-timed-delete="n1"]')!;
    expect(edit.getAttribute('aria-label')).toBe('Edit Lights on');
    expect(remove.getAttribute('aria-label')).toBe('Delete Lights on');
    expect(edit.querySelector('svg')).not.toBeNull();
    expect(remove.querySelector('svg')).not.toBeNull();
    expect(edit.textContent!.trim()).toBe('');
    expect(remove.textContent!.trim()).toBe('');
  });
});

describe('ConfigNotificationsTab — intents out', () => {
  it('emits notif-draft-changed when a cooldown input changes', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Partial<NotificationsDraft> }>(el, 'notif-draft-changed');
    const input = el.shadowRoot!.querySelector(
      'md3-number-input[data-notif="criticalCooldownMinutes"]'
    )!;
    input.dispatchEvent(new CustomEvent('change', { detail: 120, bubbles: true, composed: true }));
    expect(received).toEqual([{ partial: { criticalCooldownMinutes: 120 } }]);
  });

  it('shows stress duration in minutes and stores it in seconds', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Partial<NotificationsDraft> }>(el, 'notif-draft-changed');
    const input = el.shadowRoot!.querySelector(
      'md3-number-input[data-notif="minStressDurationSeconds"]'
    )!;
    expect((input as unknown as { value: number }).value).toBe(2);
    input.dispatchEvent(new CustomEvent('change', { detail: 5, bubbles: true, composed: true }));
    expect(received).toEqual([{ partial: { minStressDurationSeconds: 300 } }]);
  });

  it('emits notif-draft-changed when the AI toggle changes', async () => {
    const el = await mount(makeVm());
    const received = listen<{ partial: Partial<NotificationsDraft> }>(el, 'notif-draft-changed');
    const toggle = el.shadowRoot!.querySelector<HTMLInputElement>(
      'input[type="checkbox"][data-notif="aiAutoAlerts"]'
    )!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { aiAutoAlerts: true } }]);
  });

  it('emits add-timed-requested on the Add button', async () => {
    const el = await mount(makeVm());
    let fired = 0;
    el.addEventListener('add-timed-requested', () => fired++);
    const addBtn = [...el.shadowRoot!.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Add'
    )!;
    addBtn.click();
    expect(fired).toBe(1);
  });

  it('emits edit-timed-requested with id + seeded draft from a row', async () => {
    const item: TimedNotification = {
      id: 'n1',
      message: 'A',
      triggerType: 'veg',
      day: 1,
      growspaceIds: ['gs1'],
    };
    const el = await mount(makeVm({ timedNotifications: [item] }));
    const received = listen<{ id: string; draft: TimedNotificationDraft }>(
      el,
      'edit-timed-requested'
    );
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-timed-edit="n1"]')!.click();
    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('n1');
    expect(received[0].draft).toEqual({
      message: 'A',
      triggerType: 'veg',
      day: 1,
      growspaceIds: ['gs1'],
    });
  });

  it('emits a known trigger when the user picks a stage over an unrecognised one', async () => {
    const sub: NotificationsTabSub = {
      kind: 'editing',
      id: 'n1',
      draft: { ...timedDraft, triggerType: { raw: 'days_since_germination' } },
    };
    const el = await mount(makeVm({ sub }));
    const received = listen<{ partial: Partial<TimedNotificationDraft> }>(
      el,
      'timed-draft-changed'
    );
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(
      'select[data-timed-field="triggerType"]'
    )!;
    select.value = 'flower';
    select.dispatchEvent(new Event('change'));
    expect(received).toEqual([{ partial: { triggerType: 'flower' } }]);
  });

  it('emits request-delete-timed from a row Delete button', async () => {
    const item: TimedNotification = {
      id: 'n1',
      message: 'A',
      triggerType: 'veg',
      day: 1,
      growspaceIds: [],
    };
    const el = await mount(makeVm({ timedNotifications: [item] }));
    const received = listen<{ id: string }>(el, 'request-delete-timed');
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-timed-delete="n1"]')!.click();
    expect(received).toEqual([{ id: 'n1' }]);
  });

  it('emits confirm-delete-timed and cancel-timed from the confirm-delete card', async () => {
    const sub: NotificationsTabSub = { kind: 'confirm-delete', id: 'n1' };
    const el = await mount(makeVm({ sub }));
    let confirmed = 0;
    let cancelled = 0;
    el.addEventListener('confirm-delete-timed', () => confirmed++);
    el.addEventListener('cancel-timed', () => cancelled++);
    const buttons = [...el.shadowRoot!.querySelectorAll('button')];
    buttons.find((b) => b.textContent?.trim() === 'Delete')!.click();
    buttons.find((b) => b.textContent?.trim() === 'Cancel')!.click();
    expect(confirmed).toBe(1);
    expect(cancelled).toBe(1);
  });

  it('emits timed-draft-changed and commit-add-timed from the add form', async () => {
    const sub: NotificationsTabSub = { kind: 'adding', draft: timedDraft };
    const el = await mount(makeVm({ sub }));
    const drafts = listen<{ partial: Partial<TimedNotificationDraft> }>(el, 'timed-draft-changed');
    let committed = 0;
    el.addEventListener('commit-add-timed', () => committed++);

    const messageInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      'input[data-timed-field="message"]'
    )!;
    messageInput.value = 'Updated';
    messageInput.dispatchEvent(new Event('input'));
    expect(drafts).toEqual([{ partial: { message: 'Updated' } }]);

    [...el.shadowRoot!.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Add')!
      .click();
    expect(committed).toBe(1);
  });
});
