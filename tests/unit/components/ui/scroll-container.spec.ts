import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollContainer } from '../../../../src/features/shared/ui/scroll-container';

// Ensure custom element is defined
if (!customElements.get('scroll-container')) {
    customElements.define('scroll-container', ScrollContainer);
}

describe('ScrollContainer', () => {
    let element: ScrollContainer;
    let observeMock: any;
    let disconnectMock: any;
    let resizeObserverMock: any;

    beforeEach(async () => {
        // Mock ResizeObserver
        observeMock = vi.fn();
        disconnectMock = vi.fn();
        resizeObserverMock = vi.fn(function (callback) {
            return {
                observe: observeMock,
                disconnect: disconnectMock,
                _callback: callback
            };
        });
        vi.stubGlobal('ResizeObserver', resizeObserverMock);

        element = document.createElement('scroll-container') as ScrollContainer;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.restoreAllMocks();
    });

    it('should render and observe scroll content', () => {
        const content = element.shadowRoot?.querySelector('.scroll-content');
        expect(content).toBeDefined();
        expect(observeMock).toHaveBeenCalledWith(content);
    });

    it('should show/hide arrows based on scroll position', async () => {
        const content = element.shadowRoot?.querySelector('.scroll-content') as HTMLDivElement;

        // Mock scroll dimensions
        Object.defineProperty(content, 'clientWidth', { value: 100, configurable: true });
        Object.defineProperty(content, 'scrollWidth', { value: 300, configurable: true });
        Object.defineProperty(content, 'scrollLeft', { value: 0, configurable: true, writable: true });

        element.checkScroll();
        await element.updateComplete;

        let leftArrow = element.shadowRoot?.querySelector('.scroll-arrow:nth-child(1)');
        let rightArrow = element.shadowRoot?.querySelector('.scroll-arrow:nth-child(3)');

        expect(leftArrow?.classList.contains('hidden')).toBe(true);
        expect(rightArrow?.classList.contains('hidden')).toBe(false);

        // Scroll to middle
        content.scrollLeft = 50;
        element.checkScroll();
        await element.updateComplete;

        expect(leftArrow?.classList.contains('hidden')).toBe(false);
        expect(rightArrow?.classList.contains('hidden')).toBe(false);

        // Scroll to end
        content.scrollLeft = 200;
        element.checkScroll();
        await element.updateComplete;

        expect(leftArrow?.classList.contains('hidden')).toBe(false);
        expect(rightArrow?.classList.contains('hidden')).toBe(true);
    });

    it('should scroll when arrows are clicked', async () => {
        const content = element.shadowRoot?.querySelector('.scroll-content') as HTMLDivElement;
        const scrollBySpy = vi.fn();
        content.scrollBy = scrollBySpy;

        // Make arrows visible
        Object.defineProperty(content, 'clientWidth', { value: 100, configurable: true });
        Object.defineProperty(content, 'scrollWidth', { value: 300, configurable: true });
        Object.defineProperty(content, 'scrollLeft', { value: 50, configurable: true, writable: true });

        element.checkScroll();
        await element.updateComplete;

        const leftArrow = element.shadowRoot?.querySelectorAll('.scroll-arrow')[0] as HTMLDivElement;
        const rightArrow = element.shadowRoot?.querySelectorAll('.scroll-arrow')[1] as HTMLDivElement;

        leftArrow.click();
        expect(scrollBySpy).toHaveBeenCalledWith({ left: -200, behavior: 'smooth' });

        rightArrow.click();
        expect(scrollBySpy).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });
    });

    it('should handle custom scroll amount', async () => {
        element.scrollAmount = 100;
        const content = element.shadowRoot?.querySelector('.scroll-content') as HTMLDivElement;
        const scrollBySpy = vi.fn();
        content.scrollBy = scrollBySpy;

        element.scrollContentRight();
        expect(scrollBySpy).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
    });

    it('should update on scroll event', async () => {
        const content = element.shadowRoot?.querySelector('.scroll-content') as HTMLDivElement;
        const checkScrollSpy = vi.spyOn(element, 'checkScroll');

        content.dispatchEvent(new Event('scroll'));
        expect(checkScrollSpy).toHaveBeenCalled();
    });

    it('should handle resize observation', () => {
        const observerInstance = resizeObserverMock.mock.results[0].value;
        const checkScrollSpy = vi.spyOn(element, 'checkScroll');

        observerInstance._callback();
        expect(checkScrollSpy).toHaveBeenCalled();
    });

    it('should handle null scroll content safely', () => {
        const detached = document.createElement('scroll-container') as any;
        expect(() => detached.checkScroll()).not.toThrow();
        expect(() => detached.scrollContentLeft()).not.toThrow();
        expect(() => detached.scrollContentRight()).not.toThrow();
    });
});
