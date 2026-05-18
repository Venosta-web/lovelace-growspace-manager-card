import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceStore } from '../../src/store/core/growspace-store';
import { GrowspaceSharedStore } from '../../src/store/core/growspace-shared-store';
import { TrainingTechnique } from '../../src/types';

// Mock DataService
const mockCallService = vi.fn();
const mockDataServiceInstance = {
    hass: { callService: mockCallService },
    updateHass: vi.fn(),
};

vi.mock('../../src/data-service', () => {
    return {
        DataService: class {
            constructor() {
                return mockDataServiceInstance;
            }
        }
    };
});

describe('Training UI Logic', () => {
    let store: GrowspaceStore;

    beforeEach(() => {
        vi.clearAllMocks();
        store = new GrowspaceStore(new GrowspaceSharedStore());
        // Initialize UI store state needed for tests
        store.ui.setEditMode(true);
    });

    it('should open training dialog with selected plants', () => {
        store.ui.togglePlantSelection('plant_123');
        store.openBatchTrainingDialog();

        const activeDialog = store.ui.$activeDialog.get();
        expect(activeDialog.type).toBe('TRAINING');
        if (activeDialog.type === 'TRAINING') {
            expect(activeDialog.payload.plantIds).toContain('plant_123');
        }
    });

    it('should not open training dialog if no selection and no growspaceId', () => {
        store.ui.clearPlantSelection();
        store.openBatchTrainingDialog();
        expect(store.ui.$activeDialog.get().type).not.toBe('TRAINING');
    });

    it('should open training dialog with growspaceId if provided', () => {
        store.openBatchTrainingDialog('gs_1');
        const activeDialog = store.ui.$activeDialog.get();
        expect(activeDialog.type).toBe('TRAINING');
        if (activeDialog.type === 'TRAINING') {
            expect(activeDialog.payload.growspaceId).toBe('gs_1');
        }
    });
});
