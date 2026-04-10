import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceWateringDialogUI } from '../../../../../src/features/ui/components/growspace-watering-dialog-ui';

if (!customElements.get('growspace-watering-dialog-ui')) {
  customElements.define('growspace-watering-dialog-ui', GrowspaceWateringDialogUI);
}

describe('GrowspaceWateringDialogUI', () => {
  it('is defined as a custom element', () => {
    expect(customElements.get('growspace-watering-dialog-ui')).toBeDefined();
  });

  it('renders nothing when closed', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${false}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).toBeNull();
  });

  it('renders dialog when open', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('ha-dialog')).not.toBeNull();
  });

  it('renders Record Watering title', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('.dialog-title')?.textContent).toContain('Record Watering');
  });

  it('shows growspace name in subtitle', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} .growspaceName=${'Tent A'}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('.dialog-subtitle')?.textContent).toContain('Tent A');
  });

  it('dispatches close event when close button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} @close=${handler}></growspace-watering-dialog-ui>
    `);
    const closeBtn = el.shadowRoot!.querySelector('.dialog-header button.md3-button') as HTMLElement;
    closeBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches close event when Cancel button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} @close=${handler}></growspace-watering-dialog-ui>
    `);
    const cancelBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.tonal') as HTMLElement;
    cancelBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dispatches submit-watering event when Record Watering clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} @submit-watering=${handler}></growspace-watering-dialog-ui>
    `);
    const submitBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.primary') as HTMLElement;
    submitBtn?.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      volume: expect.any(Number),
      nutrients: expect.any(Array),
    });
  });

  it('shows target text in apply summary', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} .targetText=${'3 Plants'}></growspace-watering-dialog-ui>
    `);
    const target = el.shadowRoot!.querySelector('.apply-target');
    expect(target?.textContent).toContain('3 Plants');
  });

  it('shows PHI warning bar when hasPhiWarning is true', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui
        .open=${true}
        .hasPhiWarning=${true}
        .phiWarningText=${'PHI not elapsed!'}
      ></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('.error-bar')?.textContent).toContain('PHI not elapsed!');
  });

  it('does not show PHI warning when hasPhiWarning is false', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} .hasPhiWarning=${false}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('.error-bar')).toBeNull();
  });

  it('shows empty nutrients message when no nutrients added', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    // No nutrients rows initially
    expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(0);
  });

  it('adds a nutrient row when Add button clicked', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    const addBtn = el.shadowRoot!.querySelector('.form-section button.md3-button.text') as HTMLElement;
    addBtn?.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(1);
  });

  it('removes a nutrient row when delete icon clicked', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    const addBtn = el.shadowRoot!.querySelector('.form-section button.md3-button.text') as HTMLElement;
    addBtn?.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(1);
    const removeBtn = el.shadowRoot!.querySelector('.product-row button.md3-button.icon') as HTMLElement;
    removeBtn?.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(0);
  });

  it('shows summary section when nutrients are present', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('.calculation-preview')).toBeNull();
    const addBtn = el.shadowRoot!.querySelector('.form-section button.md3-button.text') as HTMLElement;
    addBtn?.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.calculation-preview')).not.toBeNull();
  });

  it('dispatches preset-changed event when preset is selected', async () => {
    const handler = vi.fn();
    const presetOptions = [{ label: 'Veg Week 1', value: 'preset-a' }];
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui
        .open=${true}
        .presetOptions=${presetOptions}
        @preset-changed=${handler}
      ></growspace-watering-dialog-ui>
    `);
    const select = el.shadowRoot!.querySelector('md3-select') as HTMLElement;
    select?.dispatchEvent(new CustomEvent('change', { detail: 'preset-a' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('setNutrients populates the nutrient list', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    el.setNutrients([
      { name: 'CalMag', concentration: 2 },
      { name: 'Bloom', concentration: 3 },
    ]);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.product-row').length).toBe(2);
  });

  it('resets form when dialog is reopened', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    el.setNutrients([{ name: 'CalMag', concentration: 2 }]);
    await el.updateComplete;
    expect((el as any)._nutrients.length).toBe(1);
    el.open = false;
    await el.updateComplete;
    el.open = true;
    await el.updateComplete;
    expect((el as any)._nutrients.length).toBe(0);
    expect((el as any)._volume).toBe(1.0);
  });
});
