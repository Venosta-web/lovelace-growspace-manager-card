import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '../../../src/features/shared/ui/error-boundary';
import '../../../src/features/shared/ui/error-boundary';

describe('ErrorBoundary', () => {
    let element: ErrorBoundary;

    beforeEach(async () => {
        element = new ErrorBoundary();
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
        vi.clearAllMocks();
    });

    it('renders children normally when no error', async () => {
        const child = document.createElement('div');
        child.textContent = 'Test Content';
        element.appendChild(child);
        await element.updateComplete;

        const slot = element.shadowRoot?.querySelector('slot');
        expect(slot).toBeTruthy();
        expect(element.innerHTML).toContain('Test Content');
    });

    it('shows error UI when error is set programmatically', async () => {
        const testError = new Error('Test error message');
        element.setError(testError);
        await element.updateComplete;

        const errorMsg = element.shadowRoot?.querySelector('.error-message');
        expect(errorMsg).toBeTruthy();
        expect(errorMsg?.textContent).toContain('Test error message');
    });

    it('clears error when clearError is called', async () => {
        const testError = new Error('Test error');
        element.setError(testError);
        await element.updateComplete;

        let errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeTruthy();

        element.clearError();
        await element.updateComplete;

        errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeNull();
    });

    it('handles reset with callback success', async () => {
        const onReset = vi.fn();
        element.onReset = onReset;
        element.setError(new Error('Test error'));
        await element.updateComplete;

        // Manual call for precision to hit the line directly if button lookup is flaky
        (element as any)._handleReset();
        await element.updateComplete;

        expect(onReset).toHaveBeenCalled();
        const errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeNull();
    });

    it('handles reset callback error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const onReset = vi.fn().mockImplementation(() => {
            throw new Error('Reset failed');
        });
        element.onReset = onReset;
        element.setError(new Error('Initial error'));
        await element.updateComplete;

        (element as any)._handleReset();
        await element.updateComplete;

        expect(onReset).toHaveBeenCalled();
        // Should catch the error and log it/re-set error state
        // The catch block calls _catchError with context: 'reset'
        // _catchError logs via console.error
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ErrorBoundary] Caught error:'), expect.any(Error));

        // Error state should still be present (or new error set)
        const errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeTruthy();
    });

    it('handles reset without callback (default behavior)', async () => {
        element.setError(new Error('Test error'));
        await element.updateComplete;

        (element as any)._handleReset();
        await element.updateComplete;

        const errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeNull();
    });

    it('handles retry with callback error', async () => {
        const onRetry = vi.fn().mockImplementation(() => {
            throw new Error('Retry failed');
        });
        element.onRetry = onRetry;
        element.setError(new Error('Initial error'));
        await element.updateComplete;

        (element as any)._handleRetry();
        await element.updateComplete;

        expect(onRetry).toHaveBeenCalled();
        // Should catch error
        const errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeTruthy();
    });

    it('handles retry without callback (default behavior)', async () => {
        const spy = vi.spyOn(element, 'requestUpdate');
        element.setError(new Error('Test error'));
        await element.updateComplete;

        (element as any)._handleRetry();
        await element.updateComplete;

        expect(spy).toHaveBeenCalled();
        const errorContainer = element.shadowRoot?.querySelector('.error-container');
        expect(errorContainer).toBeNull();
    });

    it('handles max error count', async () => {
        // Trigger errors 5 times
        const error = new Error('Recurring error');
        for (let i = 0; i < 5; i++) {
            element.setError(error);
            await element.updateComplete;
        }

        const tooManyErrors = element.shadowRoot?.querySelector('.too-many-errors');
        expect(tooManyErrors).toBeTruthy();
        expect(tooManyErrors?.textContent).toContain('Too many errors');

        // Force reset
        const forceResetBtn = tooManyErrors?.querySelector('button') as HTMLElement;
        forceResetBtn.click();
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.too-many-errors')).toBeNull();
        expect(element.shadowRoot?.querySelector('.error-container')).toBeNull();
    });

    it('catches recoverable-error events', async () => {
        const error = new Error('Bubbling error');
        const event = new CustomEvent('recoverable-error', {
            detail: { error, errorInfo: { component: 'child' } },
            bubbles: true,
            composed: true
        });

        element.dispatchEvent(event);
        await element.updateComplete;

        const errorMsg = element.shadowRoot?.querySelector('.error-message');
        expect(errorMsg?.textContent).toContain('Bubbling error');
    });

    it('handles onError callback failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        element.onError = () => { throw new Error('Callback failure'); };

        element.setError(new Error('Trigger error'));
        await element.updateComplete;

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error in onError callback:'), expect.any(Error));
    });

    it('ignores recoverable-error events without error detail', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const event = new CustomEvent('recoverable-error', {
            detail: {}, // Missing error
            bubbles: true,
            composed: true
        });

        element.dispatchEvent(event);
        await element.updateComplete;

        expect(consoleSpy).not.toHaveBeenCalled();
        expect(element.shadowRoot?.querySelector('.error-container')).toBeNull();
    });

    it('renders technical details in development environment', async () => {
        // Mock dev mode
        vi.spyOn(element as any, '_isDev', 'get').mockReturnValue(true);

        const testError = new Error('Dev Error');
        testError.stack = 'Stack Trace';
        element.setError(testError);
        await element.updateComplete;

        const details = element.shadowRoot?.querySelector('.error-details');
        expect(details).toBeTruthy();
        expect(details?.textContent).toContain('Stack Trace');
    });


    it('handles ternary technical details branches', async () => {
        const spy = vi.spyOn(element as any, '_isDev', 'get');
        const testError = new Error('Test Error');
        testError.stack = 'Stack';

        // Hit branch: isDev=true, stack=true
        spy.mockReturnValue(true);
        element.setError(testError);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.error-details')).toBeTruthy();

        // Hit branch: isDev=false, stack=true (hit 'nothing' branch of ternary)
        spy.mockReturnValue(false);
        element.setError(testError);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.error-details')).toBeNull();

        // Hit branch: isDev=true, stack=false (hit 'nothing' branch of ternary)
        spy.mockReturnValue(true);
        testError.stack = undefined;
        element.setError(testError);
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.error-details')).toBeNull();
    });

    it('covers all remaining branches', async () => {
        // Max errors branch
        element.onReset = vi.fn();
        for (let i = 0; i < 5; i++) {
            element.setError(new Error('E' + i));
        }
        await element.updateComplete;
        const forceBtn = element.shadowRoot?.querySelector('.too-many-errors button') as HTMLButtonElement;
        forceBtn.click();
        await element.updateComplete;
        expect((element as any)._errorCount).toBe(0);

        // Retry branch when onRetry is missing
        element.setError(new Error('Retry Error'));
        element.onRetry = undefined;
        await element.updateComplete;
        // Verify retry button exists
        const buttons = Array.from(element.shadowRoot?.querySelectorAll('button.error-button') || []);
        expect(buttons.some(b => b.textContent?.includes('Retry'))).toBe(true);
    });

    it('handles non-Error objects thrown in callbacks', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Test retry with string throw
        element.onRetry = () => { throw 'String Error'; };
        element.setError(new Error('Initial Error'));
        await element.updateComplete;
        (element as any)._handleRetry();
        await element.updateComplete;
        expect(consoleSpy).toHaveBeenCalled();
        expect((element as any)._error.message).toBe('String Error');

        // Test reset with string throw
        element.onReset = () => { throw 'Reset String Error'; };
        element.setError(new Error('Initial Error'));
        await element.updateComplete;
        (element as any)._handleReset();
        await element.updateComplete;
        expect((element as any)._error.message).toBe('Reset String Error');
    });

    it('handles empty error message in render', async () => {
        element.setError(new Error(''));
        await element.updateComplete;
        const errorMsg = element.shadowRoot?.querySelector('.error-message');
        expect(errorMsg?.textContent).toBe('An unexpected error occurred');
    });

    it('respects showDetails property', async () => {
        vi.spyOn(element as any, '_isDev', 'get').mockReturnValue(true);
        element.setError(new Error('Test Error'));
        element.showDetails = true;
        await element.updateComplete;

        const details = element.shadowRoot?.querySelector('details');
        expect(details?.hasAttribute('open')).toBe(true);
        expect(details?.querySelector('summary')?.textContent).toContain('Hide');
    });

    it('dispatches error-caught event', async () => {
        const eventSpy = vi.fn();
        element.addEventListener('error-caught', eventSpy);

        const testError = new Error('Test Event');
        element.setError(testError, { some: 'info' });

        expect(eventSpy).toHaveBeenCalled();
        const event = eventSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.error).toBe(testError);
        expect(event.detail.errorInfo).toEqual({ some: 'info' });
        expect(event.detail.errorCount).toBe(1);
    });

    it('resets error count after interval', async () => {
        vi.useFakeTimers();

        element.setError(new Error('E1'));
        expect((element as any)._errorCount).toBe(1);

        // Advance time more than ERROR_RESET_INTERVAL (5000ms)
        vi.advanceTimersByTime(6000);

        // Trigger an update to run the 'updated' lifecycle
        element.requestUpdate();
        await element.updateComplete;

        expect((element as any)._errorCount).toBe(0);

        vi.useRealTimers();
    });
});
