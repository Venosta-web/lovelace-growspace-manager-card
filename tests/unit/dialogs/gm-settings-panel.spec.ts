import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GmSettingsPanel } from '../../../src/dialogs/gm-settings-panel';
import '../../../src/dialogs/gm-settings-panel';

vi.mock('../../../src/services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({ response: 'ok' }),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

describe('GmSettingsPanel — controls', () => {
  let element: GmSettingsPanel;

  beforeEach(async () => {
    element = document.createElement('gm-settings-panel') as GmSettingsPanel;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  it('renders md3-entity-input for assistant_id with conversation domain filter', async () => {
    element.draft = { assistant_id: 'conversation.claude' };
    await element.updateComplete;
    const picker = element.shadowRoot?.querySelector('md3-entity-input[data-field="assistant_id"]') as any;
    expect(picker).toBeTruthy();
    expect(picker?.domains).toContain('conversation');
  });

  it('renders md3-select for notification_personality with 5 options', async () => {
    element.draft = {};
    await element.updateComplete;
    const select = element.shadowRoot?.querySelector('md3-select[data-field="notification_personality"]') as any;
    expect(select).toBeTruthy();
    expect((select?.options as unknown[]).length).toBe(5);
  });

  it('renders md3-number-input for max_response_length', async () => {
    element.draft = { max_response_length: 250 };
    await element.updateComplete;
    const field = element.shadowRoot?.querySelector('md3-number-input[data-field="max_response_length"]') as any;
    expect(field).toBeTruthy();
    expect(field?.value).toBe(250);
  });

  it('renders md3-number-input for briefing_interval_minutes with min 5 and max 1440', async () => {
    element.draft = { briefing_interval_minutes: 30 };
    await element.updateComplete;
    const field = element.shadowRoot?.querySelector('md3-number-input[data-field="briefing_interval_minutes"]') as any;
    expect(field).toBeTruthy();
    expect(field?.min).toBe(5);
    expect(field?.max).toBe(1440);
  });

  it('renders md3-entity-input for ai_task_entity_id filtered to ai_task domain', async () => {
    element.draft = { ai_task_entity_id: 'ai_task.grow_tasks' };
    await element.updateComplete;
    const picker = element.shadowRoot?.querySelector('md3-entity-input[data-field="ai_task_entity_id"]') as any;
    expect(picker).toBeTruthy();
    expect(picker?.domains).toContain('ai_task');
  });

  it('renders md3-entities-input for briefing_trigger_entities', async () => {
    element.draft = { briefing_trigger_entities: ['sensor.vpd'] };
    await element.updateComplete;
    const picker = element.shadowRoot?.querySelector('md3-entities-input[data-field="briefing_trigger_entities"]') as any;
    expect(picker).toBeTruthy();
    expect(picker?.value).toContain('sensor.vpd');
  });

  it('emits draft-change with updated assistant_id when md3-entity-input changes', async () => {
    element.draft = {};
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const picker = element.shadowRoot?.querySelector('md3-entity-input[data-field="assistant_id"]');
    picker?.dispatchEvent(new CustomEvent('change', { detail: 'conversation.openai', bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ assistant_id: 'conversation.openai' });
  });

  it('emits draft-change with updated notification_personality when md3-select changes', async () => {
    element.draft = {};
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const select = element.shadowRoot?.querySelector('md3-select[data-field="notification_personality"]');
    select?.dispatchEvent(new CustomEvent('change', { detail: 'Scientific', bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ notification_personality: 'Scientific' });
  });

  it('renders md3-switch for ai_enabled and emits draft-change when toggled', async () => {
    element.draft = { ai_enabled: false };
    await element.updateComplete;
    const sw = element.shadowRoot?.querySelector('md3-switch[data-field="ai_enabled"]');
    expect(sw).toBeTruthy();
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    sw?.dispatchEvent(new CustomEvent('change', { detail: { checked: true }, bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ ai_enabled: true });
  });

  it('emits draft-change with numeric max_response_length when md3-number-input changes', async () => {
    element.draft = {};
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const field = element.shadowRoot?.querySelector('md3-number-input[data-field="max_response_length"]');
    field?.dispatchEvent(new CustomEvent('change', { detail: '500', bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ max_response_length: 500 });
  });

  it('renders md3-switch for ai_auto_alerts and emits draft-change when toggled', async () => {
    element.draft = { ai_auto_alerts: true };
    await element.updateComplete;
    const sw = element.shadowRoot?.querySelector('md3-switch[data-field="ai_auto_alerts"]');
    expect(sw).toBeTruthy();
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    sw?.dispatchEvent(new CustomEvent('change', { detail: { checked: false }, bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ ai_auto_alerts: false });
  });

  it('renders md3-switch for vision_checkup_enabled and emits draft-change when toggled', async () => {
    element.draft = { vision_checkup_enabled: false };
    await element.updateComplete;
    const sw = element.shadowRoot?.querySelector('md3-switch[data-field="vision_checkup_enabled"]');
    expect(sw).toBeTruthy();
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    sw?.dispatchEvent(new CustomEvent('change', { detail: { checked: true }, bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ vision_checkup_enabled: true });
  });

  it('emits draft-change with numeric briefing_interval_minutes when md3-number-input changes', async () => {
    element.draft = {};
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const field = element.shadowRoot?.querySelector('md3-number-input[data-field="briefing_interval_minutes"]');
    field?.dispatchEvent(new CustomEvent('change', { detail: '60', bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ briefing_interval_minutes: 60 });
  });

  it('emits draft-change with null ai_task_entity_id when picker clears', async () => {
    element.draft = { ai_task_entity_id: 'ai_task.grow_tasks' };
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const picker = element.shadowRoot?.querySelector('md3-entity-input[data-field="ai_task_entity_id"]');
    picker?.dispatchEvent(new CustomEvent('change', { detail: null, bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ ai_task_entity_id: null });
  });

  it('emits draft-change with updated briefing_trigger_entities when md3-entities-input changes', async () => {
    element.draft = {};
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const picker = element.shadowRoot?.querySelector('md3-entities-input[data-field="briefing_trigger_entities"]');
    picker?.dispatchEvent(new CustomEvent('change', { detail: ['sensor.vpd', 'sensor.temp'], bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ briefing_trigger_entities: ['sensor.vpd', 'sensor.temp'] });
  });

  it('emits draft-change with empty array for briefing_trigger_entities when picker clears', async () => {
    element.draft = { briefing_trigger_entities: ['sensor.vpd'] };
    await element.updateComplete;
    const changes: any[] = [];
    element.addEventListener('draft-change', (e) => changes.push((e as CustomEvent).detail));
    const picker = element.shadowRoot?.querySelector('md3-entities-input[data-field="briefing_trigger_entities"]');
    picker?.dispatchEvent(new CustomEvent('change', { detail: null, bubbles: true, composed: true }));
    expect(changes[0]).toMatchObject({ briefing_trigger_entities: [] });
  });

  it('accepts hass as a property', async () => {
    const mockHass = { states: {} } as any;
    element.hass = mockHass;
    await element.updateComplete;
    expect(element.hass).toBe(mockHass);
  });
});
