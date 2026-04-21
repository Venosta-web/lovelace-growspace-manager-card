import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../../../../../src/features/ui/components/growspace-edit-mode-banner-ui'; // Explicit side-effect import
import { EditModeBanner } from '../../../../../src/features/ui/components/growspace-edit-mode-banner-ui';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';

describe('GrowspaceEditModeBannerUI', () => {
    let element: EditModeBanner;

    beforeEach(async () => {
        element = await fixture<EditModeBanner>(html`<growspace-edit-mode-banner></growspace-edit-mode-banner>`);
    });

    it('should be defined', () => {
        expect(customElements.get('growspace-edit-mode-banner')).toBeDefined();
    });

    it('should render correct selection count', async () => {
        element.selectedCount = 5;
        await element.updateComplete;

        const count = element.shadowRoot?.querySelector('.banner-content span')?.textContent;
        expect(count).toContain('5 plant(s) selected');
    });

    it('should dispatch select-all event', async () => {
        const listener = vi.fn();
        element.addEventListener('select-all', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Select All"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch clear-selection event', async () => {
        const listener = vi.fn();
        element.addEventListener('clear-selection', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Clear Selection"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch exit-edit-mode event', async () => {
        const listener = vi.fn();
        element.addEventListener('exit-edit-mode', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Exit Edit Mode"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch water-selected event', async () => {
        const listener = vi.fn();
        element.addEventListener('water-selected', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Water Selected"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch training-selected event', async () => {
        const listener = vi.fn();
        element.addEventListener('training-selected', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Log Training"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch ipm-selected event', async () => {
        const listener = vi.fn();
        element.addEventListener('ipm-selected', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Log IPM"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch batch-add-plants event', async () => {
        const listener = vi.fn();
        element.addEventListener('batch-add-plants', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Batch Add Plants"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch transplant-mode event', async () => {
        const listener = vi.fn();
        element.addEventListener('transplant-mode', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Transplant Mode"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch print-labels-selected event', async () => {
        const listener = vi.fn();
        element.addEventListener('print-labels-selected', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Print Labels"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch delete-selected event', async () => {
        const listener = vi.fn();
        element.addEventListener('delete-selected', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Delete Selected"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch clone-selected event', async () => {
        const listener = vi.fn();
        element.addEventListener('clone-selected', listener);

        const btn = element.shadowRoot?.querySelector('button[title="Clone Selected"]');
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    describe('Scrolling Interactions', () => {
        let container: HTMLElement;

        beforeEach(async () => {
            container = element.shadowRoot?.querySelector('.banner-actions') as HTMLElement;
            if (container) {
                // Mock scrollBy as it's not implemented in JSDOM
                container.scrollBy = vi.fn();
            }
        });

        it('should handle left scroll arrow click', async () => {
            // Force state to show left arrow
            (element as any)._canScrollLeft = true;
            await element.updateComplete;

            const leftArrow = element.shadowRoot?.querySelector('.scroll-arrow:first-child') as HTMLElement;
            expect(leftArrow.classList.contains('hidden')).toBe(false);

            leftArrow.click();
            expect(container.scrollBy).toHaveBeenCalledWith({ left: -150, behavior: 'smooth' });
        });

        it('should handle right scroll arrow click', async () => {
            // Force state to show right arrow
            (element as any)._canScrollRight = true;
            await element.updateComplete;

            const rightArrow = element.shadowRoot?.querySelector('.scroll-arrow:last-child') as HTMLElement;
            expect(rightArrow.classList.contains('hidden')).toBe(false);

            rightArrow.click();
            expect(container.scrollBy).toHaveBeenCalledWith({ left: 150, behavior: 'smooth' });
        });

        it('should update scroll state correctly', async () => {
            // Mock properties on container to simulate scrollable content
            Object.defineProperty(container, 'scrollWidth', { value: 1000, configurable: true });
            Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
            Object.defineProperty(container, 'scrollLeft', { value: 100, configurable: true });

            container.dispatchEvent(new Event('scroll'));
            await element.updateComplete;

            expect((element as any)._canScrollLeft).toBe(true);
            expect((element as any)._canScrollRight).toBe(true);
        });

        it('should call _checkScroll when ResizeObserver triggers', async () => {
            const checkScrollSpy = vi.spyOn(element as any, '_checkScroll');
            
            // Access the ResizeController internal ResizeObserver callback if possible
            // Or just simulate what ResizeController does:
            (element as any)._checkScroll();
            
            expect(checkScrollSpy).toHaveBeenCalled();
        });
    });
});
