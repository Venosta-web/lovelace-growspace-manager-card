import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StrainRecommendationDialog } from '../../../src/dialogs/strain-recommendation-dialog';
import '../../../src/dialogs/strain-recommendation-dialog';
import {
    strainRecommendation$,
    isStrainRecLoading$,
    getStrainRecommendation,
} from '../../../src/slices/ai-insight';

vi.mock('../../../src/slices/ai-insight', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../../src/slices/ai-insight')>();
    return { ...mod, getStrainRecommendation: vi.fn().mockResolvedValue(undefined) };
});

describe('StrainRecommendationDialog', () => {
    let element: StrainRecommendationDialog;

    beforeEach(async () => {
        strainRecommendation$.set(null);
        isStrainRecLoading$.set(false);
        element = document.createElement('strain-recommendation-dialog') as StrainRecommendationDialog;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(StrainRecommendationDialog);
    });

    it('should not render content when closed', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should render content when open', async () => {
        element.open = true;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeTruthy();
        expect(element.shadowRoot?.querySelector('.dialog-title')?.textContent).toContain('Get Strain Recommendation');
    });

    describe('Rendering States', () => {
        it('should show loading spinner', async () => {
            element.open = true;
            await element.updateComplete;
            // Set the atom after `open` is true so the open-transition reset
            // (in updated()) does not clear it.
            isStrainRecLoading$.set(true);
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.gm-loading')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('.gm-response-box')).toBeNull();
        });

        it('should show response when not loading', async () => {
            element.open = true;
            await element.updateComplete;
            isStrainRecLoading$.set(false);
            strainRecommendation$.set('Try Blue Dream.');
            await element.updateComplete;

            const responseBox = element.shadowRoot?.querySelector('.gm-response-box');
            expect(responseBox).toBeTruthy();
            expect(responseBox?.textContent).toContain('Try Blue Dream.');
        });
    });

    describe('Interactions', () => {
        it('should update userQuery on input', async () => {
            element.open = true;
            await element.updateComplete;

            const textarea = element.shadowRoot?.querySelector('textarea');
            expect(textarea).toBeTruthy();

            if (textarea) {
                textarea.value = 'Fruity strains';
                textarea.dispatchEvent(new Event('input'));
            }
            await element.updateComplete;

            expect(element.userQuery).toBe('Fruity strains');
        });

        it('should dispatch close event on close button click', async () => {
            element.open = true;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('close', listener);

            const closeBtn = element.shadowRoot?.querySelector('button.md3-button.text');
            (closeBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalled();
        });

        it('should dispatch close event on Cancel button click', async () => {
            element.open = true;
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('close', listener);

            // Find "Cancel" button - it's a tonal button
            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const cancelBtn = buttons.find(b => b.textContent?.trim() === 'Cancel');
            expect(cancelBtn).toBeTruthy();

            (cancelBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalled();
        });

        it('should call the strain-recommendation slice mutator with the query', async () => {
            element.open = true;
            element.userQuery = 'Sleepy';
            await element.updateComplete;

            // Find "Get Recommendation" button - primary button
            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const actionBtn = buttons.find(b => b.textContent?.includes('Get Recommendation'));
            expect(actionBtn).toBeTruthy();

            (actionBtn as HTMLElement).click();

            expect(getStrainRecommendation).toHaveBeenCalledWith('Sleepy');
        });
    });
});
