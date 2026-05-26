import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StrainRecommendationDialog } from '../../../src/dialogs/strain-recommendation-dialog';
import '../../../src/dialogs/strain-recommendation-dialog';
import { html, render } from 'lit';

describe('StrainRecommendationDialog', () => {
    let element: StrainRecommendationDialog;

    beforeEach(async () => {
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
            element.isLoading = true;
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.gm-loading')).toBeTruthy();
            expect(element.shadowRoot?.querySelector('.gm-response-box')).toBeNull();
        });

        it('should show response when not loading', async () => {
            element.open = true;
            element.isLoading = false;
            element.response = 'Try Blue Dream.';
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

        it('should dispatch get-recommendation event', async () => {
            element.open = true;
            element.userQuery = 'Sleepy';
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('get-recommendation', listener);

            // Find "Get Recommendation" button - primary button
            const buttons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const actionBtn = buttons.find(b => b.textContent?.includes('Get Recommendation'));
            expect(actionBtn).toBeTruthy();

            (actionBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: { query: 'Sleepy' }
            }));
        });
    });
});
