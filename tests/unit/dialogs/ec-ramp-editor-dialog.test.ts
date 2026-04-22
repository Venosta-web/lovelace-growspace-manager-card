import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ECRampEditorDialog } from '../../../src/dialogs/ec-ramp-editor-dialog';
import '../../../src/dialogs/ec-ramp-editor-dialog';
import { ECRampCurve } from '../../../src/schemas/api-schema';

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class HaDialogMock extends HTMLElement {
        open = false;
        heading = '';
        hideActions = false;
    }
    customElements.define('ha-dialog', HaDialogMock);
}

// Mock other UI components if needed
if (!customElements.get('ha-svg-icon')) {
    customElements.define('ha-svg-icon', class extends HTMLElement { path = ''; });
}

describe('ECRampEditorDialog', () => {
    let element: ECRampEditorDialog;
    let mockStore: any;
    let mockDataService: any;
    let curvesMap: Record<string, ECRampCurve>;

    beforeEach(async () => {
        curvesMap = {
            'curve1': {
                id: 'curve1',
                name: 'Standard Ramp',
                points: [{ day: 1, target_ec: 1.2 }, { day: 14, target_ec: 1.8 }]
            } as any
        };

        mockDataService = {
            removeECRampCurve: vi.fn().mockResolvedValue({}),
            saveECRampCurve: vi.fn().mockResolvedValue({}),
        };

        mockStore = {
            dataService: mockDataService,
            data: {
                $ecRampCurves: {
                    get: () => curvesMap,
                    subscribe: (cb: any) => {
                        cb(curvesMap);
                        return () => { };
                    }
                }
            },
            actions: {
                library: {
                    fetchECRampCurves: vi.fn().mockResolvedValue({}),
                    saveECRampCurve: vi.fn().mockResolvedValue({}),
                    removeECRampCurve: vi.fn().mockResolvedValue({}),
                }
            },
        };

        element = document.createElement('ec-ramp-editor-dialog') as ECRampEditorDialog;
        (element as any).store = mockStore;
        (element as any).hass = {
            states: {},
            connection: { sendMessagePromise: vi.fn() },
        } as any;

        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    it('should be hidden when open is false', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!--');
    });

    it('should show list view when opened', async () => {
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeTruthy();
        expect((element as any)._view).toBe('LIST');
        expect(mockStore.actions.library.fetchECRampCurves).toHaveBeenCalled();
    });

    it('should render curve list', async () => {
        element.open = true;
        await element.updateComplete;
        const items = element.shadowRoot?.querySelectorAll('.curve-item');
        expect(items?.length).toBe(1);
        expect(items?.[0].textContent).toContain('Standard Ramp');
    });

    it('should show empty state when no curves', async () => {
        curvesMap = {};
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.empty-state')).toBeTruthy();
    });

    it('should switch to edit view for new curve', async () => {
        element.open = true;
        await element.updateComplete;
        const newBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
        newBtn.click();
        await element.updateComplete;

        expect((element as any)._view).toBe('EDIT');
        expect((element as any)._editingCurve.name).toBe('');
    });

    it('should switch to edit view when clicking a curve', async () => {
        element.open = true;
        await element.updateComplete;
        const item = element.shadowRoot?.querySelector('.curve-item') as HTMLElement;
        item.click();
        await element.updateComplete;

        expect((element as any)._view).toBe('EDIT');
        expect((element as any)._editingCurve.name).toBe('Standard Ramp');
    });

    it('should handle back button in edit view', async () => {
        element.open = true;
        (element as any)._view = 'EDIT';
        (element as any)._editingCurve = { name: 'Test' };
        await element.updateComplete;

        const backBtn = element.shadowRoot?.querySelector('button.tonal') as HTMLElement;
        expect(backBtn).toBeTruthy();
        backBtn.click();
        await element.updateComplete;

        expect((element as any)._view).toBe('LIST');
        expect((element as any)._editingCurve).toBeNull();
    });

    it('should add and remove points in edit view', async () => {
        (element as any)._startNew();
        await element.updateComplete;

        expect((element as any)._editingCurve.points.length).toBe(1);

        (element as any)._addPoint();
        expect((element as any)._editingCurve.points.length).toBe(2);
        // Default jump is +7 days, +0.2 EC
        expect((element as any)._editingCurve.points[1].day).toBe(8);

        (element as any)._removePoint(0);
        expect((element as any)._editingCurve.points.length).toBe(1);
    });

    it('should update points', async () => {
        (element as any)._startNew();
        (element as any)._updatePoint(0, { day: 5, target_ec: 2.5 });
        expect((element as any)._editingCurve.points[0].day).toBe(5);
        expect((element as any)._editingCurve.points[0].target_ec).toBe(2.5);
    });

    it('should validate and save curve', async () => {
        (element as any)._startNew();
        await element.updateComplete;

        // Validation fail: No name
        await (element as any)._saveCurve();
        expect((element as any)._error).toBe('Curve name is required');

        // Validation fail: No valid points
        (element as any)._editingCurve.name = 'Valid Name';
        (element as any)._editingCurve.points = [];
        await (element as any)._saveCurve();
        expect((element as any)._error).toBe('At least one valid EC point is required');

        // Success path
        (element as any)._editingCurve.points = [{ day: 1, target_ec: 1.0 }];
        await (element as any)._saveCurve();
        expect(mockStore.actions.library.saveECRampCurve).toHaveBeenCalled();
        expect((element as any)._view).toBe('LIST');
    });

    it('should handle save errors', async () => {
        mockStore.actions.library.saveECRampCurve.mockRejectedValue(new Error('Save Error'));
        (element as any)._startNew();
        (element as any)._editingCurve.name = 'Test';
        await (element as any)._saveCurve();
        expect((element as any)._error).toBe('Save Error');
    });

    it('should delete curve with confirmation', async () => {
        element.open = true;
        await element.updateComplete;

        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        const deleteBtn = element.shadowRoot?.querySelector('button[title="Delete"]') as HTMLElement;
        deleteBtn.click();

        await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async delete

        expect(confirmSpy).toHaveBeenCalled();
        expect(mockStore.actions.library.removeECRampCurve).toHaveBeenCalledWith('curve1');
    });

    it('should handle delete error', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockStore.actions.library.removeECRampCurve.mockRejectedValue(new Error('Delete Fail'));

        await (element as any)._deleteCurve('curve1');
        expect((element as any)._error).toBe('Delete Fail');
    });

    it('should handle input changes via UI', async () => {
        element.open = true;
        await element.updateComplete;
        (element as any)._startNew();
        await element.updateComplete;

        const nameInput = element.shadowRoot?.querySelector('md3-text-input') as any;
        expect(nameInput).toBeTruthy();
        nameInput.dispatchEvent(new CustomEvent('change', { detail: 'New Name' }));
        expect((element as any)._editingCurve.name).toBe('New Name');

        const dayInput = element.shadowRoot?.querySelector('md3-number-input[label="Day"]') as any;
        dayInput.dispatchEvent(new CustomEvent('change', { detail: '10' }));
        expect((element as any)._editingCurve.points[0].day).toBe(10);

        // Test parsing of invalid numbers
        dayInput.dispatchEvent(new CustomEvent('change', { detail: 'invalid' }));
        expect((element as any)._editingCurve.points[0].day).toBe(0);

        const ecInput = element.shadowRoot?.querySelector('md3-number-input[label*="Target EC"]') as any;
        ecInput.dispatchEvent(new CustomEvent('change', { detail: '2.0' }));
        expect((element as any)._editingCurve.points[0].target_ec).toBe(2.0);

        ecInput.dispatchEvent(new CustomEvent('change', { detail: '' }));
        expect((element as any)._editingCurve.points[0].target_ec).toBe(0);
    });

    it('should dispatch close event', async () => {
        const spy = vi.fn();
        element.addEventListener('close', spy);
        (element as any)._close();
        expect(spy).toHaveBeenCalled();
    });

    it('should render more than 6 badges with +N more', async () => {
        curvesMap['curve1'].points = Array.from({ length: 10 }, (_, i) => ({ day: i + 1, target_ec: 1.0 }));
        element.open = true;
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('+4 more');
    });

    it('should handle missing curves controller or store safely', async () => {
        const testEl = document.createElement('ec-ramp-editor-dialog') as ECRampEditorDialog;
        (testEl as any).store = undefined;
        testEl.connectedCallback();
        expect((testEl as any)._curvesController).toBeUndefined();
    });
    it('should handle edit button click in list view', async () => {
        element.open = true;
        await element.updateComplete;
        const editBtn = element.shadowRoot?.querySelector('button[title="Edit"]') as HTMLElement;
        editBtn.click();
        await element.updateComplete;
        expect((element as any)._view).toBe('EDIT');
    });

    it('should handle remove point button click', async () => {
        element.open = true;
        await element.updateComplete;

        (element as any)._startNew();
        await element.updateComplete;

        (element as any)._addPoint();
        await element.updateComplete;

        expect((element as any)._editingCurve.points.length).toBe(2);
        const removeBtn = element.shadowRoot?.querySelectorAll('.point-row button.icon')[0] as HTMLElement;
        expect(removeBtn).toBeTruthy();
        removeBtn.click();
        expect((element as any)._editingCurve.points.length).toBe(1);
    });

    it('should sort points by day before saving', async () => {
        element.open = true;
        (element as any)._startNew();
        (element as any)._editingCurve.name = 'Sorted';
        (element as any)._editingCurve.points = [
            { day: 10, target_ec: 1.5 },
            { day: 1, target_ec: 1.0 }
        ];

        await (element as any)._saveCurve();

        const savedCurve = mockStore.actions.library.saveECRampCurve.mock.calls[0][0];
        expect(savedCurve.points[0].day).toBe(1);
        expect(savedCurve.points[1].day).toBe(10);
    });

    it('should handle stage selection via UI', async () => {
        element.open = true;
        await element.updateComplete;
        (element as any)._startNew();
        await element.updateComplete;

        const stageSelect = element.shadowRoot?.querySelector('md3-select') as any;
        expect(stageSelect).toBeTruthy();

        // Verify all 5 stages match implementation
        expect(stageSelect.options.length).toBe(5);
        expect(stageSelect.options.map((o: any) => o.value)).toEqual([
            'seedling', 'mother', 'veg', 'flower', 'cure'
        ]);

        stageSelect.dispatchEvent(new CustomEvent('change', { detail: 'veg' }));
        await element.updateComplete;
        expect((element as any)._editingCurve.stage).toBe('veg');

        (element as any)._editingCurve = { ...(element as any)._editingCurve, name: 'Test Stage' };
        await element.updateComplete;

        await (element as any)._saveCurve();
        expect(mockStore.actions.library.saveECRampCurve).toHaveBeenCalled();
        const savedCurve = mockStore.actions.library.saveECRampCurve.mock.calls[0][0];
        expect(savedCurve.stage).toBe('veg');
    });

    it('should test guards for editing curve operations', () => {
        (element as any)._editingCurve = null;

        // These should return early without error
        (element as any)._addPoint();
        (element as any)._removePoint(0);
        (element as any)._updatePoint(0, { day: 1 });
        (element as any)._updateCurveInfo({ name: 'Test' });

        expect((element as any)._editingCurve).toBeNull();
    });

    it('should handle updated lifecycle without store', async () => {
        const testEl = document.createElement('ec-ramp-editor-dialog') as any;
        testEl.open = true;
        const changedProps = new Map([['open', false]]);
        // Mock that 'open' changed
        (changedProps as any).has = (key: string) => key === 'open';
        
        testEl.updated(changedProps);
        // Should not throw even if store is missing
        expect(testEl.store).toBeUndefined();
    });

    it('should handle delete cancellation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const removeSpy = vi.spyOn(mockStore.actions.library, 'removeECRampCurve');

        await (element as any)._deleteCurve('curve1');
        expect(removeSpy).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions in delete', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockStore.actions.library.removeECRampCurve.mockRejectedValue('String Error');

        await (element as any)._deleteCurve('curve1');
        expect((element as any)._error).toBe('Unknown error');
    });

    it('should handle non-Error exceptions in save', async () => {
        (element as any)._startNew();
        (element as any)._editingCurve.name = 'Test';
        mockStore.actions.library.saveECRampCurve.mockRejectedValue('String Error');

        await (element as any)._saveCurve();
        expect((element as any)._error).toBe('Unknown error');
    });

    it('should filter out invalid points during save', async () => {
        (element as any)._startNew();
        (element as any)._editingCurve.name = 'Filter Test';
        (element as any)._editingCurve.points = [
            { day: -1, target_ec: 1.0 }, // Invalid day
            { day: 5, target_ec: 0 },    // Invalid EC
            { day: 10, target_ec: 2.0 }  // Valid
        ];

        await (element as any)._saveCurve();

        const savedCurve = mockStore.actions.library.saveECRampCurve.mock.calls[0][0];
        expect(savedCurve.points.length).toBe(1);
        expect(savedCurve.points[0].day).toBe(10);
    });

    it('should show singular "point" for one point in list view', async () => {
        curvesMap['curve1'].points = [{ day: 1, target_ec: 1.0 }];
        element.open = true;
        await element.updateComplete;

        const details = element.shadowRoot?.querySelector('.curve-details');
        expect(details?.textContent).toContain('1 point');
        expect(details?.textContent).not.toContain('1 points');
    });

    it('should render error bar when error exists', async () => {
        (element as any)._error = 'Manual Error';
        element.open = true;
        await element.updateComplete;

        const errorBar = element.shadowRoot?.querySelector('.error-bar');
        expect(errorBar).toBeTruthy();
        expect(errorBar?.textContent).toBe('Manual Error');
    });

    it('should handle branch where _curvesController or value is missing', async () => {
        (element as any)._curvesController = null;
        element.open = true;
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.empty-state')).toBeTruthy();

        (element as any)._curvesController = { value: null };
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.empty-state')).toBeTruthy();
    });

    it('should handle empty points message in edit view', async () => {
        element.open = true;
        (element as any)._startNew();
        (element as any)._editingCurve.points = [];
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Add at least one EC point to define the ramp.');
    });

    it('should handle stage fallback to flower in save', async () => {
        (element as any)._startNew();
        (element as any)._editingCurve.name = 'Stage Fallback';
        (element as any)._editingCurve.stage = undefined; // Trigger fallback

        await (element as any)._saveCurve();

        const savedCurve = mockStore.actions.library.saveECRampCurve.mock.calls[0][0];
        expect(savedCurve.stage).toBe('flower');
    });

    it('should handle null/undefined points gracefully in save', async () => {
        element.open = true;
        await element.updateComplete;
        
        (element as any)._startNew();
        (element as any)._editingCurve.name = 'Fallback Test';
        (element as any)._editingCurve.points = [];

        await (element as any)._saveCurve();
        expect((element as any)._error).toBe('At least one valid EC point is required');
    });

    it('should handle null/undefined points fallback in manipulation', async () => {
        (element as any)._startNew();
        
        (element as any)._editingCurve.points = undefined;
        (element as any)._addPoint();
        expect((element as any)._editingCurve.points.length).toBe(1);

        (element as any)._editingCurve.points = undefined;
        (element as any)._removePoint(0);
        expect((element as any)._editingCurve.points.length).toBe(0);

        (element as any)._editingCurve.points = undefined;
        (element as any)._updatePoint(0, { day: 1 });
        expect((element as any)._editingCurve.points.length).toBe(1);
    });
});
