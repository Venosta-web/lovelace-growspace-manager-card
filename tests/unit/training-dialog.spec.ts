import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TrainingDialogState } from '../../src/types';
import type { HomeAssistant } from 'custom-card-helpers';
import { html, render } from 'lit';

// Import the component
import '../../src/dialogs/training-dialog';
import { TrainingDialog } from '../../src/dialogs/training-dialog';

// Mock types
interface MockStore {
    ui: {
        $activeDialog: { get: any; set: any };
        showToast: any;
        closeDialog: any;
        $selectedPlants: { get: any };
    };
    dataService: {
        refreshData: any;
    };
    refreshData: any;
    openBatchTrainingDialog: any;
}

const createMockHass = (): Partial<HomeAssistant> => ({
    callService: vi.fn().mockResolvedValue(undefined),
    connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({}),
    } as any,
    states: {},
    user: {
        id: 'test-user',
        name: 'Test User',
        is_admin: true,
        is_owner: true,
        credentials: [],
        mfa_modules: []
    },
});

const createMockStore = (): MockStore => ({
    ui: {
        $activeDialog: {
            get: vi.fn(),
            set: vi.fn(),
        },
        showToast: vi.fn(),
        closeDialog: vi.fn(),
        $selectedPlants: { get: () => new Set() },
    },
    dataService: {
        refreshData: vi.fn(),
    },
    refreshData: vi.fn(),
    openBatchTrainingDialog: vi.fn(),
});

describe('TrainingDialog', () => {
    let element: TrainingDialog;
    let mockStore: MockStore;
    let mockHass: Partial<HomeAssistant>;

    beforeEach(async () => {
        mockStore = createMockStore();
        mockHass = createMockHass();

        element = document.createElement('training-dialog') as TrainingDialog;
        element.store = mockStore as any;
        element.hass = mockHass as HomeAssistant;

        // Mock active dialog state
        vi.spyOn(mockStore.ui.$activeDialog, 'get').mockReturnValue({
            type: 'TRAINING',
            payload: {
                growspaceId: 'gs_1',
                plantIds: ['p1', 'p2']
            }
        });

        document.body.appendChild(element);
        await element.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    afterEach(() => {
        if (element.parentNode) {
            document.body.removeChild(element);
        }
    });

    it('should be defined', () => {
        expect(element).toBeDefined();
        expect(element instanceof TrainingDialog).toBe(true);
    });

    it('should render dialog and inputs', async () => {
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).not.toBeNull();

        const content = element.shadowRoot?.querySelector('.content');
        expect(content).not.toBeNull();

        const techniqueSelect = element.shadowRoot?.querySelector('md3-select');
        expect(techniqueSelect).not.toBeNull();

        const notesInput = element.shadowRoot?.querySelector('ha-textarea');
        expect(notesInput).not.toBeNull();
    });

    it('should call log_training_event service on save', async () => {
        // Set values
        const techniqueSelect = element.shadowRoot?.querySelector('md3-select') as any;
        expect(techniqueSelect).not.toBeNull();

        // md3-select usually fires 'change' with detail.value
        techniqueSelect.value = 'topping';
        techniqueSelect.dispatchEvent(new CustomEvent('change', {
            detail: 'topping'
        }));

        const notesInput = element.shadowRoot?.querySelector('ha-textarea') as any;
        expect(notesInput).not.toBeNull();
        notesInput.value = 'Test notes';
        // ha-textarea fires 'input'
        notesInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

        await element.updateComplete;

        // Find save button
        const saveButton = element.shadowRoot?.querySelector('mwc-button') as HTMLElement;
        expect(saveButton).toBeDefined();
        expect(saveButton.textContent?.trim()).toBe('Log');

        saveButton.click();

        // Wait for async actions
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockHass.callService).toHaveBeenCalledWith(
            'growspace_manager',
            'log_training_event',
            {
                technique: 'topping',
                notes: 'Test notes',
                growspace_id: 'gs_1',
                plant_id: ['p1', 'p2']
            }
        );

        expect(mockStore.ui.showToast).toHaveBeenCalledWith('Training logged successfully', 'success');
        expect(mockStore.ui.closeDialog).toHaveBeenCalled();
    });

    it('should handle error during save', async () => {
        mockHass.callService = vi.fn().mockRejectedValue(new Error('Backend error'));

        const techniqueSelect = element.shadowRoot?.querySelector('md3-select') as any;
        techniqueSelect.dispatchEvent(new CustomEvent('change', {
            detail: 'topping'
        }));

        const saveButton = element.shadowRoot?.querySelector('mwc-button') as HTMLElement;
        saveButton.click();

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockStore.ui.showToast).toHaveBeenCalledWith('Failed to log training', 'error');
    });

    describe('Branch Coverage', () => {
        it('should not save if technique is empty', async () => {
            // Don't set any technique
            const saveButton = element.shadowRoot?.querySelector('mwc-button') as HTMLElement;
            saveButton.click();

            await new Promise(resolve => setTimeout(resolve, 0));

            // Should not have called the service
            expect(mockHass.callService).not.toHaveBeenCalled();
        });

        it('should render nothing if dialog type is not TRAINING', async () => {
            vi.spyOn(mockStore.ui.$activeDialog, 'get').mockReturnValue({
                type: 'WATERING',
                payload: {}
            });

            await element.requestUpdate();
            await element.updateComplete;

            // Should not render the dialog
            const dialog = element.shadowRoot?.querySelector('ha-dialog');
            expect(dialog).toBeNull();
        });

        it('should handle empty plantIds array', async () => {
            vi.spyOn(mockStore.ui.$activeDialog, 'get').mockReturnValue({
                type: 'TRAINING',
                payload: {
                    growspaceId: 'gs_1',
                    plantIds: []
                }
            });

            await element.requestUpdate();
            await element.updateComplete;

            // Set technique
            const techniqueSelect = element.shadowRoot?.querySelector('md3-select') as any;
            techniqueSelect.dispatchEvent(new CustomEvent('change', {
                detail: 'LST'
            }));

            const saveButton = element.shadowRoot?.querySelector('mwc-button') as HTMLElement;
            saveButton.click();

            await new Promise(resolve => setTimeout(resolve, 0));

            // plantIds should be undefined when empty
            expect(mockHass.callService).toHaveBeenCalledWith(
                'growspace_manager',
                'log_training_event',
                {
                    technique: 'LST',
                    notes: undefined,
                    growspace_id: 'gs_1',
                    plant_id: undefined
                }
            );
        });

        it('should handle undefined plantIds', async () => {
            vi.spyOn(mockStore.ui.$activeDialog, 'get').mockReturnValue({
                type: 'TRAINING',
                payload: {
                    growspaceId: 'gs_1',
                    plantIds: undefined
                }
            });

            await element.requestUpdate();
            await element.updateComplete;

            // Title should be 'Log Training' (without plant count)
            const dialog = element.shadowRoot?.querySelector('ha-dialog');
            expect(dialog?.getAttribute('heading') || (dialog as any)?.heading).toBe('Log Training');
        });

        it('should show singular plant in title for single plant', async () => {
            vi.spyOn(mockStore.ui.$activeDialog, 'get').mockReturnValue({
                type: 'TRAINING',
                payload: {
                    growspaceId: 'gs_1',
                    plantIds: ['p1']
                }
            });

            await element.requestUpdate();
            await element.updateComplete;

            const dialog = element.shadowRoot?.querySelector('ha-dialog');
            // Should say "1 plant" not "1 plants"
            expect(dialog?.getAttribute('heading') || (dialog as any)?.heading).toBe('Log Training (1 plant)');
        });

        it('should save with notes as undefined when empty', async () => {
            const techniqueSelect = element.shadowRoot?.querySelector('md3-select') as any;
            techniqueSelect.dispatchEvent(new CustomEvent('change', {
                detail: 'defoliation'
            }));

            // Don't set any notes
            const saveButton = element.shadowRoot?.querySelector('mwc-button') as HTMLElement;
            saveButton.click();

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockHass.callService).toHaveBeenCalledWith(
                'growspace_manager',
                'log_training_event',
                expect.objectContaining({
                    technique: 'defoliation',
                    notes: undefined
                })
            );
        });
        it('should exit early in _save if dialog type is not TRAINING', async () => {
            // Set technique so it doesn't return on the first check
            const techniqueSelect = element.shadowRoot?.querySelector('md3-select') as any;
            techniqueSelect.value = 'topping';
            techniqueSelect.dispatchEvent(new CustomEvent('change', { detail: 'topping' }));
            await element.updateComplete;

            // Change mock to return wrong type
            vi.spyOn(mockStore.ui.$activeDialog, 'get').mockReturnValue({
                type: 'WATERING',
                payload: {}
            });

            const saveButton = element.shadowRoot?.querySelector('mwc-button') as HTMLElement;
            saveButton.click();

            // Wait for async actions
            await new Promise(resolve => setTimeout(resolve, 0));

            // Should not have called the service because it returned early
            expect(mockHass.callService).not.toHaveBeenCalled();
        });
    });
});
