import { describe, it, expect, afterEach, vi } from 'vitest';
import './growspace-ipm-dialog-ui';
import { GrowspaceIPMDialogUI } from './growspace-ipm-dialog-ui';

describe('GrowspaceIPMDialogUI – save-preset returns to list', () => {
  afterEach(() => vi.restoreAllMocks());

  it('transitions back to LIST view after save-preset is dispatched', () => {
    const el = document.createElement('growspace-ipm-dialog-ui') as GrowspaceIPMDialogUI;
    (el as any)._view = 'EDIT';
    (el as any)._editingPreset = {
      name: 'Neem Oil',
      type: 'foliar',
      items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L', phi_days: 3 }],
    };

    (el as any)._handleSavePreset();

    expect((el as any)._view).toBe('LIST');
    expect((el as any)._editingPreset).toBeNull();
  });

  it('still dispatches save-preset event when saving', () => {
    const el = document.createElement('growspace-ipm-dialog-ui') as GrowspaceIPMDialogUI;
    (el as any)._editingPreset = {
      name: 'Weekly Foliar',
      type: 'foliar',
      items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L', phi_days: 3 }],
    };
    const events: CustomEvent[] = [];
    el.addEventListener('save-preset', (e) => events.push(e as CustomEvent));

    (el as any)._handleSavePreset();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toMatchObject({ name: 'Weekly Foliar' });
  });
});
