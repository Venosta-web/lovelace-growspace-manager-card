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
    expect(el.shadowRoot!.querySelector('gs-dialog')).toBeNull();
  });

  it('renders dialog when open', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    expect(el.shadowRoot!.querySelector('gs-dialog')).not.toBeNull();
  });

  it('renders Record Watering title', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    const gsDialog = el.shadowRoot!.querySelector('gs-dialog') as any;
    expect(gsDialog.heading).toBe('Record Watering');
  });

  it('shows growspace name in subtitle', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} .growspaceName=${'Tent A'}></growspace-watering-dialog-ui>
    `);
    const gsDialog = el.shadowRoot!.querySelector('gs-dialog') as any;
    expect(gsDialog.subtitle).toBe('Tent A');
  });

  it('relays gs-dialog close event as a composed, bubbling close event', async () => {
    const events: Event[] = [];
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    el.addEventListener('close', (e) => events.push(e));
    const gsDialog = el.shadowRoot!.querySelector('gs-dialog') as HTMLElement;
    gsDialog?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    expect(events).toHaveLength(1);
    expect((events[0] as CustomEvent).composed).toBe(true);
    expect((events[0] as CustomEvent).bubbles).toBe(true);
  });

  it('dispatches composed close event when Cancel button is clicked', async () => {
    const events: Event[] = [];
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    el.addEventListener('close', (e) => events.push(e));
    const cancelBtn = el.shadowRoot!.querySelector('.button-group button.md3-button.tonal') as HTMLElement;
    cancelBtn?.click();
    expect(events).toHaveLength(1);
    expect((events[0] as CustomEvent).composed).toBe(true);
    expect((events[0] as CustomEvent).bubbles).toBe(true);
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

  it('updates _volume when volume input changes', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    const volumeInput = el.shadowRoot!.querySelector('md3-number-input[label="Volume (Liters)"]') as HTMLElement;
    volumeInput.dispatchEvent(new CustomEvent('change', { detail: '2.5' }));
    await el.updateComplete;
    expect((el as any)._volume).toBe(2.5);
  });

  it('updates nutrient name and concentration when inputs change', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    el.setNutrients([{ name: '', concentration: 0 }]);
    await el.updateComplete;

    const nameInput = el.shadowRoot!.querySelector('md3-text-input[label="Nutrient Name"]') as any;
    const concInput = el.shadowRoot!.querySelector('md3-number-input[label="ml/L"]') as any;

    nameInput.value = 'Product X';
    nameInput.dispatchEvent(new CustomEvent('change', { detail: 'Product X' }));

    concInput.dispatchEvent(new CustomEvent('change', { detail: '5.2' }));

    await el.updateComplete;
    expect((el as any)._nutrients[0]).toEqual({ name: 'Product X', concentration: 5.2 });
  });

  it('shows correct calculations in summary', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    (el as any)._volume = 2.0;
    el.setNutrients([{ name: 'CalMag', concentration: 1.5 }]);
    await el.updateComplete;

    const summaryRow = el.shadowRoot!.querySelector('.calculation-row');
    expect(summaryRow?.textContent).toContain('CalMag');
    expect(summaryRow?.textContent).toContain('2L × 1.5 ml/L');
    expect(summaryRow?.textContent).toContain('3.0 ml');

    const totalRow = el.shadowRoot!.querySelectorAll('.calculation-row')[1];
    expect(totalRow?.textContent).toContain('3.0 ml');
  });

  it('disables buttons when isSubmitting is true', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true} .isSubmitting=${true}></growspace-watering-dialog-ui>
    `);
    const cancelBtn = el.shadowRoot!.querySelector('.button-group button.tonal') as HTMLButtonElement;
    const submitBtn = el.shadowRoot!.querySelector('.button-group button.primary') as HTMLButtonElement;

    expect(cancelBtn.disabled).toBe(true);
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toContain('Recording...');
  });

  it('disables submit button when volume is 0', async () => {
    const el = await fixture<GrowspaceWateringDialogUI>(html`
      <growspace-watering-dialog-ui .open=${true}></growspace-watering-dialog-ui>
    `);
    const volumeInput = el.shadowRoot!.querySelector('md3-number-input[label="Volume (Liters)"]') as HTMLElement;
    volumeInput.dispatchEvent(new CustomEvent('change', { detail: '0' }));
    await el.updateComplete;

    const submitBtn = el.shadowRoot!.querySelector('.button-group button.primary') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});
