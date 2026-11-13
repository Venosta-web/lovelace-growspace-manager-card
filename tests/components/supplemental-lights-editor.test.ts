import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSupplementalLights,
  saveSupplementalLight,
  type SupplementalLightSchedule,
} from '../../src/slices/growspace/supplemental-lights';
import '../../src/dialogs/config-dialog';
import { ConfigTab } from '../../src/constants';
import type { HomeAssistant } from 'custom-card-helpers';
import { createGrowspaceDevice } from '../../src/services/types';
import type { SupplementalLightsEditor } from '../../src/features/config/components/supplemental-lights-editor';

vi.mock('../../src/slices/growspace/supplemental-lights', () => ({
  getSupplementalLights: vi.fn(),
  saveSupplementalLight: vi.fn(),
}));

const schedule: SupplementalLightSchedule = {
  cycle: { start_minute: 20 * 60, duration_minutes: 12 * 60 },
  lights: [
    {
      light: {
        entity_id: 'switch.side',
        enabled: true,
        windows: [
          {
            start: { anchor: 'lights_on', offset_minutes: 60 },
            end: { anchor: 'lights_off', offset_minutes: -60 },
          },
        ],
      },
      state: 'on',
      active: true,
      window: { start: '21:00', end: '07:00' },
      reason: null,
      warnings: [],
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
  vi.resetAllMocks();
});

async function mount() {
  vi.mocked(getSupplementalLights).mockResolvedValue(schedule);
  const dialog = document.createElement('config-dialog');
  dialog.hass = { states: {}, services: {}, user: { is_admin: true } } as HomeAssistant;
  dialog.growspaceId = 'tent';
  dialog.devices = [createGrowspaceDevice({ deviceId: 'tent', name: 'Tent' })];
  dialog.growspaceOptions = { tent: 'Tent' };
  dialog.initialTab = ConfigTab.GROWLIGHT;
  dialog.open = true;
  document.body.append(dialog);
  await dialog.updateComplete;
  const editor = dialog.shadowRoot!.querySelector('supplemental-lights-editor')!;
  await vi.waitFor(() => expect(editor.shadowRoot?.textContent).toContain('Reported on'));
  return { editor, dialog };
}

function button(editor: SupplementalLightsEditor, label: string) {
  const match = [...editor.shadowRoot!.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label
  );
  if (!match) throw new Error(`Missing button ${label}`);
  return match;
}

describe('Supplemental Lights editor', () => {
  it('previews both endpoints of a window crossing local midnight and saves multiple windows', async () => {
    const { editor } = await mount();
    expect(editor.shadowRoot?.textContent).toMatch(/Current window ·\s+21:00–07:00/);
    button(editor, 'Edit').click();
    await vi.waitFor(() => expect(editor.edit).toBeDefined());
    expect(editor.shadowRoot?.textContent).toContain('21:00–07:00 next day');
    button(editor, 'Add window').click();
    await vi.waitFor(() => expect(editor.edit?.light.windows).toHaveLength(2));
    vi.mocked(saveSupplementalLight).mockResolvedValue({ release_required: null });
    button(editor, 'Save Supplemental Light').click();
    expect(saveSupplementalLight).toHaveBeenCalledWith(
      'tent',
      'switch.side',
      {
        ...schedule.lights[0].light,
        windows: [
          ...schedule.lights[0].light.windows,
          {
            start: { anchor: 'lights_on', offset_minutes: 0 },
            end: { anchor: 'lights_off', offset_minutes: 0 },
          },
        ],
      },
      false
    );
  });

  it('retries a blocked release only after the explicit action', async () => {
    const { editor } = await mount();
    vi.mocked(saveSupplementalLight)
      .mockResolvedValueOnce({
        release_required: { entity_id: 'switch.side', reason: 'Output is unavailable.' },
      })
      .mockResolvedValueOnce({ release_required: null });
    button(editor, 'Edit').click();
    await vi.waitFor(() => expect(editor.edit).toBeDefined());
    button(editor, 'Delete assignment').click();
    await vi.waitFor(() =>
      expect(editor.shadowRoot?.textContent).toContain('Output is unavailable.')
    );
    expect(saveSupplementalLight).toHaveBeenCalledExactlyOnceWith(
      'tent',
      'switch.side',
      undefined,
      false
    );
    button(editor, 'Release anyway').click();
    expect(saveSupplementalLight).toHaveBeenLastCalledWith('tent', 'switch.side', undefined, true);
  });
  it('holds an unsaved edit when the grower requests another tab', async () => {
    const { dialog, editor } = await mount();
    button(editor, 'Edit').click();
    await vi.waitFor(() => expect(editor.edit).toBeDefined());
    dialog.shadowRoot!.querySelector<HTMLButtonElement>('[data-tab="sensors"]')!.click();
    await dialog.updateComplete;
    expect(dialog.currentTab).toBe(ConfigTab.GROWLIGHT);
    expect(dialog.shadowRoot?.textContent).toMatch(/Discard your unsaved changes/i);
  });
});
