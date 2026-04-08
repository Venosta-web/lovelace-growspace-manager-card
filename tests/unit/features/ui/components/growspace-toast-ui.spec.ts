import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceToastUI } from '../../../../../src/features/ui/components/growspace-toast-ui';

if (!customElements.get('growspace-toast-ui')) {
  customElements.define('growspace-toast-ui', GrowspaceToastUI);
}

describe('growspace-toast-ui', () => {
  it('renders hidden when notification is null', async () => {
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui .notification=${null}></growspace-toast-ui>
    `);
    const div = el.shadowRoot!.querySelector('.toast-notification');
    expect(div?.classList.contains('visible')).toBe(false);
  });

  it('renders visible with correct type class when notification is set', async () => {
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui .notification=${{ message: 'Saved', type: 'success' }}></growspace-toast-ui>
    `);
    const div = el.shadowRoot!.querySelector('.toast-notification');
    expect(div?.classList.contains('visible')).toBe(true);
    expect(div?.classList.contains('success')).toBe(true);
    expect(div?.textContent).toContain('Saved');
  });

  it('renders action button when notification has action', async () => {
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui
        .notification=${{ message: 'Deleted', type: 'info', action: { label: 'Undo', callback: () => {} } }}
      ></growspace-toast-ui>
    `);
    const btn = el.shadowRoot!.querySelector('.toast-action');
    expect(btn?.textContent?.trim()).toBe('Undo');
  });

  it('emits toast-action-clicked when action button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceToastUI>(html`
      <growspace-toast-ui
        .notification=${{ message: 'Deleted', type: 'info', action: { label: 'Undo', callback: () => {} } }}
        @toast-action-clicked=${handler}
      ></growspace-toast-ui>
    `);
    (el.shadowRoot!.querySelector('.toast-action') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders nothing for missing notification', async () => {
    const el = await fixture<GrowspaceToastUI>(html`<growspace-toast-ui></growspace-toast-ui>`);
    const div = el.shadowRoot!.querySelector('.toast-notification');
    expect(div?.classList.contains('visible')).toBe(false);
  });
});
