import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EditModeBanner } from '../../../../src/components/manager/edit-mode-banner';

describe('GrowspaceEditModeBanner', () => {
    let element: EditModeBanner;

    beforeEach(() => {
        element = new EditModeBanner();
        document.body.appendChild(element);
    });

    afterEach(() => {
        if (element && element.parentNode === document.body) {
            document.body.removeChild(element);
        }
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
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('select-all', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Select All'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch clear-selection event', async () => {
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('clear-selection', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Clear'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch exit-edit-mode event', async () => {
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('exit-edit-mode', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Exit'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch water-selected event', async () => {
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('water-selected', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Water'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch training-selected event', async () => {
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('training-selected', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Log Training'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch ipm-selected event', async () => {
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('ipm-selected', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Log IPM'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    it('should dispatch batch-add-plants event', async () => {
        await element.updateComplete;
        const listener = vi.fn();
        element.addEventListener('batch-add-plants', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Batch Add Plants'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();
    });

    describe('Initialization & Resilience', () => {
        it('should observe resize and check scroll on init', async () => {
            vi.useFakeTimers();
            const observeSpy = vi.fn();

            // Mock ResizeController on the element prototype or instance if possible
            // Since it's private/hard to reach, we rely on the fact that firstUpdated calls it.
            // We can check if _checkScroll is called after timeout.

            // Re-render to trigger firstUpdated
            document.body.removeChild(element);
            element = new EditModeBanner();
            document.body.appendChild(element);

            // Mock container ref if needed, but JSDOM handles it.
            // We spy on the private _checkScroll method if we cast to any
            const checkScrollSpy = vi.spyOn(element as any, '_checkScroll');

            await element.updateComplete;

            // Initial call might happen sync or async depending on lit lifecycle
            // but the setTimeout one definitely needs ticking.
            vi.runAllTimers();

            expect(checkScrollSpy).toHaveBeenCalled();

            vi.useRealTimers();
        });

        it('should handle missing container in _scrollActions gracefully', async () => {
            // Force container ref to be null
            Object.defineProperty((element as any)._actionsContainerRef, 'value', {
                value: null,
                writable: true
            });

            // Calling _scrollActions shouldn't throw
            // We need to access private method
            const scrollActions = (element as any)._scrollActions.bind(element);

            expect(() => scrollActions('left')).not.toThrow();
            expect(() => scrollActions('right')).not.toThrow();
        });

        it('should handle missing container in firstUpdated gracefully', async () => {
            // We can't easily force it to be null during firstUpdated in a real DOM render 
            // because firstUpdated happens after render where ref is assigned.
            // However, if we manually call firstUpdated while ref is null:

            element = new EditModeBanner();
            // Don't append to body yet, so no render/ref ? 
            // Actually firstUpdated runs after first update.

            // Let's manually invoke firstUpdated on an instance where we blanked the ref
            Object.defineProperty((element as any)._actionsContainerRef, 'value', {
                value: null,
                writable: true
            });

            expect(() => element.firstUpdated()).not.toThrow();
        });
    });

    describe('Scrolling Interactions', () => {
        let container: HTMLElement;

        beforeEach(async () => {
            await element.updateComplete;
            container = element.shadowRoot?.querySelector('.banner-actions') as HTMLElement;
            // Mock scrollBy as it's not implemented in JSDOM
            container.scrollBy = vi.fn();
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

            // Trigger check via private method or event
            // Using the resize controller callback is hard to reach directly without spying on the controller instance
            // But we can trigger the scroll event which is bound in firstUpdated
            container.dispatchEvent(new Event('scroll'));

            await element.updateComplete;

            // scrollLeft > 1 => canScrollLeft = true
            // scrollLeft < scrollWidth - clientWidth - 1 (100 < 1000 - 500 - 1) => canScrollRight = true
            expect((element as any)._canScrollLeft).toBe(true);
            expect((element as any)._canScrollRight).toBe(true);
        });

        it('should update scroll state when scrolled to start', async () => {
            Object.defineProperty(container, 'scrollWidth', { value: 1000, configurable: true });
            Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
            Object.defineProperty(container, 'scrollLeft', { value: 0, configurable: true });

            container.dispatchEvent(new Event('scroll'));
            await element.updateComplete;

            expect((element as any)._canScrollLeft).toBe(false);
            expect((element as any)._canScrollRight).toBe(true);
        });

        it('should update scroll state when scrolled to end', async () => {
            Object.defineProperty(container, 'scrollWidth', { value: 1000, configurable: true });
            Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
            Object.defineProperty(container, 'scrollLeft', { value: 500, configurable: true });

            container.dispatchEvent(new Event('scroll'));
            await element.updateComplete;

            expect((element as any)._canScrollLeft).toBe(true);
            expect((element as any)._canScrollRight).toBe(false); // 500 is not < 499
        });
    });
});
