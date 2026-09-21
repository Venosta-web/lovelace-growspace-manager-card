import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import snapshot from '../fixtures/contract/label_management_snapshot_v1.json';
import inspected from '../fixtures/contract/label_management_inspection_v1.json';
import deleted from '../fixtures/contract/label_management_deleted_v1.json';
import { GrowspaceTemplateLibrary } from '../../src/features/labels/template-library';

const { manage, watch, download, administrator } = vi.hoisted(() => ({
  manage: vi.fn(),
  watch: vi.fn(),
  download: vi.fn(),
  administrator: { value: true },
}));
vi.mock('../../src/slices/labels/management', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/slices/labels/management')>()),
  manageTemplates: manage,
  watchTemplateLibrary: watch,
  downloadTemplateData: download,
}));
vi.mock('../../src/services/hass-call', () => ({
  getHass: () => ({ user: { is_admin: administrator.value } }),
  hassCall: vi.fn(),
}));
if (!customElements.get('growspace-template-library'))
  customElements.define('growspace-template-library', GrowspaceTemplateLibrary);

async function mount(): Promise<GrowspaceTemplateLibrary> {
  const element = await fixture<GrowspaceTemplateLibrary>(
    '<growspace-template-library></growspace-template-library>'
  );
  element.labelSizeId = snapshot.library.drafts[0].label_size_id;
  await settle(element);
  return element;
}
async function settle(element: GrowspaceTemplateLibrary): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
}
function click(element: GrowspaceTemplateLibrary, action: string): void {
  const button = element.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[data-action="${action}"]`
  )!;
  expect(button).not.toBeNull();
  button.click();
}
beforeEach(() => {
  vi.clearAllMocks();
  administrator.value = true;
  manage.mockResolvedValue(structuredClone(snapshot));
  watch.mockResolvedValue(vi.fn());
});
describe('template lifecycle controls', () => {
  it('requires explicit consequence review before deleting', async () => {
    const element = await mount();
    click(element, 'delete');
    await settle(element);
    expect(manage).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot!.textContent).toContain('30 days');
    click(element, 'confirm');
    await settle(element);
    expect(manage).toHaveBeenLastCalledWith(
      'delete',
      { template_id: snapshot.library.templates[0].id },
      { generation: 1, key: expect.any(String) }
    );
  });
  it('keeps an uncertain mutation key for retry', async () => {
    const element = await mount();
    click(element, 'delete');
    await settle(element);
    manage.mockRejectedValueOnce(new Error('connection lost'));
    click(element, 'confirm');
    await settle(element);
    const failed = manage.mock.calls.at(-1);
    click(element, 'confirm');
    await settle(element);
    expect(manage.mock.calls.at(-1)).toEqual(failed);
  });
  it('inspects complete history and stages append-only restoration', async () => {
    const element = await mount();
    manage.mockResolvedValueOnce(inspected);
    click(element, 'inspect');
    await settle(element);
    expect(element.shadowRoot!.textContent).toContain('strain.name');
    click(element, 'restore_revision');
    await settle(element);
    expect(element.shadowRoot!.textContent).toContain('Intervening history remains unchanged');
  });
  it('shows orphaned private drafts and recoverable deletions', async () => {
    manage.mockResolvedValue(deleted);
    const element = await mount();
    expect(element.shadowRoot!.textContent).toContain('The template was deleted');
    expect(element.shadowRoot!.textContent).toContain('Restorable until');
    click(element, 'save_as');
    await settle(element);
    click(element, 'cancel');
    await settle(element);
    click(element, 'restore');
    await settle(element);
    expect(element.shadowRoot!.textContent).toContain('does not reclaim default status');
  });
  it('newer stores cannot expose mutation controls', async () => {
    manage.mockResolvedValue({
      ...snapshot,
      library: {
        ...snapshot.library,
        generation: null,
        store: { readable: false, version: 1, found_version: 2 },
      },
    });
    const element = await mount();
    expect(element.shadowRoot!.textContent).toContain('requires a newer integration');
    expect(element.shadowRoot!.querySelector('[data-action="blank"]')).toBeNull();
  });
  it('refreshes on an event without replacing pending review', async () => {
    const element = await mount();
    click(element, 'delete');
    await settle(element);
    manage.mockResolvedValue({ ...snapshot, library: { ...snapshot.library, generation: 2 } });
    watch.mock.calls[0][0]();
    await settle(element);
    click(element, 'confirm');
    await settle(element);
    expect(manage).toHaveBeenLastCalledWith('delete', expect.anything(), {
      generation: 1,
      key: expect.any(String),
    });
  });
  it('applies the current snapshot when an editor session is attached', async () => {
    const element = await mount();
    const observeLibrary = vi.fn();
    const draft = snapshot.library.drafts[0];
    element.session = {
      state: { draft, document: draft.document },
      observeLibrary,
    } as never;
    await settle(element);
    expect(observeLibrary).toHaveBeenCalledWith(snapshot.library);
  });
  it('keeps recovery export available after administrator access is lost', async () => {
    const element = await mount();
    const draft = snapshot.library.drafts[0];
    element.session = {
      state: { draft, document: draft.document },
      observeLibrary: vi.fn(),
    } as never;
    administrator.value = false;
    element.requestUpdate();
    await settle(element);
    expect(element.shadowRoot!.textContent).toContain('requires a Home Assistant administrator');
    expect(element.shadowRoot!.querySelector('[data-action="export_work"]')).not.toBeNull();
    expect(element.shadowRoot!.querySelector('[data-action="save_as"]')).toBeNull();
  });
});
