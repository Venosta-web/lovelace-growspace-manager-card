import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseDialogLayout } from '../../../../../src/features/shared/layouts/base-dialog.layout';

// Register the custom element if not already registered
if (!customElements.get('base-dialog-layout')) {
    customElements.define('base-dialog-layout', BaseDialogLayout);
}

async function createElement(props: Partial<BaseDialogLayout> = {}): Promise<BaseDialogLayout> {
    const el = document.createElement('base-dialog-layout') as BaseDialogLayout;
    Object.assign(el, props);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
}

function cleanup(el: BaseDialogLayout) {
    el.remove();
}

describe('BaseDialogLayout', () => {

    // ── Rendering ──────────────────────────────────────────────────────────

    describe('render', () => {
        it('renders the dialog backdrop and container', async () => {
            const el = await createElement({ open: true, title: 'Test' });
            const backdrop = el.shadowRoot!.querySelector('.dialog-backdrop');
            const container = el.shadowRoot!.querySelector('.dialog-container');
            expect(backdrop).toBeTruthy();
            expect(container).toBeTruthy();
            cleanup(el);
        });

        it('renders the title text', async () => {
            const el = await createElement({ title: 'My Dialog' });
            const title = el.shadowRoot!.querySelector('.dialog-title');
            expect(title?.textContent).toContain('My Dialog');
            cleanup(el);
        });
    });

    // ── Header ─────────────────────────────────────────────────────────────

    describe('header', () => {
        it('renders subtitle when provided', async () => {
            const el = await createElement({ title: 'T', subtitle: 'Sub' });
            const subtitle = el.shadowRoot!.querySelector('.dialog-subtitle');
            expect(subtitle).toBeTruthy();
            expect(subtitle?.textContent).toContain('Sub');
            cleanup(el);
        });

        it('does not render subtitle when omitted', async () => {
            const el = await createElement({ title: 'T' });
            const subtitle = el.shadowRoot!.querySelector('.dialog-subtitle');
            expect(subtitle).toBeNull();
            cleanup(el);
        });

        it('renders close button by default', async () => {
            const el = await createElement({ title: 'T' });
            const btn = el.shadowRoot!.querySelector('.dialog-close-button');
            expect(btn).toBeTruthy();
            cleanup(el);
        });

        it('hides close button when hideCloseButton is true', async () => {
            const el = await createElement({ title: 'T', hideCloseButton: true });
            const btn = el.shadowRoot!.querySelector('.dialog-close-button');
            expect(btn).toBeNull();
            cleanup(el);
        });

        it('dispatches "closed" event when close button is clicked', async () => {
            const el = await createElement({ title: 'T', open: true });
            const handler = vi.fn();
            el.addEventListener('closed', handler);

            const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.dialog-close-button')!;
            btn.click();

            expect(handler).toHaveBeenCalledTimes(1);
            cleanup(el);
        });
    });

    // ── Backdrop ───────────────────────────────────────────────────────────

    describe('backdrop click', () => {
        it('dispatches "closed" event when backdrop is clicked', async () => {
            const el = await createElement({ title: 'T', open: true });
            const handler = vi.fn();
            el.addEventListener('closed', handler);

            const backdrop = el.shadowRoot!.querySelector<HTMLDivElement>('.dialog-backdrop')!;
            backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(handler).toHaveBeenCalledTimes(1);
            cleanup(el);
        });
    });

    // ── Tabs ───────────────────────────────────────────────────────────────

    describe('tabs', () => {
        it('does not render tabs section when tabs prop is absent', async () => {
            const el = await createElement({ title: 'T' });
            expect(el.shadowRoot!.querySelector('.dialog-tabs')).toBeNull();
            cleanup(el);
        });

        it('does not render tabs section when tabs array is empty', async () => {
            const el = await createElement({ title: 'T', tabs: [] });
            expect(el.shadowRoot!.querySelector('.dialog-tabs')).toBeNull();
            cleanup(el);
        });

        it('renders tabs when provided', async () => {
            const el = await createElement({
                title: 'T',
                tabs: [
                    { id: 'a', label: 'Tab A' },
                    { id: 'b', label: 'Tab B' },
                ],
                activeTab: 'a',
            });
            const tabs = el.shadowRoot!.querySelectorAll('.dialog-tab');
            expect(tabs.length).toBe(2);
            cleanup(el);
        });

        it('applies "active" class to the active tab', async () => {
            const el = await createElement({
                title: 'T',
                tabs: [
                    { id: 'a', label: 'Tab A' },
                    { id: 'b', label: 'Tab B' },
                ],
                activeTab: 'b',
            });
            const tabs = el.shadowRoot!.querySelectorAll('.dialog-tab');
            expect(tabs[0].classList.contains('active')).toBe(false);
            expect(tabs[1].classList.contains('active')).toBe(true);
            cleanup(el);
        });

        it('renders tab icon when provided', async () => {
            const el = await createElement({
                title: 'T',
                tabs: [{ id: 'a', label: 'Tab A', icon: 'M12 2L2 22h20z' }],
            });
            const icon = el.shadowRoot!.querySelector('.dialog-tab svg');
            expect(icon).toBeTruthy();
            cleanup(el);
        });

        it('does not render svg icon when tab has no icon', async () => {
            const el = await createElement({
                title: 'T',
                tabs: [{ id: 'a', label: 'Tab A' }],
            });
            const icon = el.shadowRoot!.querySelector('.dialog-tab svg');
            expect(icon).toBeNull();
            cleanup(el);
        });

        it('dispatches "tab-changed" event with tabId when a tab is clicked', async () => {
            const el = await createElement({
                title: 'T',
                tabs: [
                    { id: 'a', label: 'Tab A' },
                    { id: 'b', label: 'Tab B' },
                ],
            });
            const handler = vi.fn();
            el.addEventListener('tab-changed', handler);

            const tabBtns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.dialog-tab');
            tabBtns[1].click();

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail).toEqual({ tabId: 'b' });
            cleanup(el);
        });
    });

    // ── Content ───────────────────────────────────────────────────────────

    describe('content', () => {
        it('renders slot when not loading', async () => {
            const el = await createElement({ title: 'T', loading: false });
            expect(el.shadowRoot!.querySelector('.dialog-content')).toBeTruthy();
            expect(el.shadowRoot!.querySelector('.loading-container')).toBeNull();
            cleanup(el);
        });

        it('renders loading spinner when loading is true', async () => {
            const el = await createElement({ title: 'T', loading: true });
            expect(el.shadowRoot!.querySelector('.loading-container')).toBeTruthy();
            expect(el.shadowRoot!.querySelector('.loading-spinner')).toBeTruthy();
            expect(el.shadowRoot!.querySelector('.dialog-content')).toBeNull();
            cleanup(el);
        });
    });

    // ── Actions ───────────────────────────────────────────────────────────

    describe('actions', () => {
        it('renders the actions slot area', async () => {
            const el = await createElement({ title: 'T' });
            expect(el.shadowRoot!.querySelector('.dialog-actions')).toBeTruthy();
            cleanup(el);
        });
    });

    // ── Dialog click stop propagation ─────────────────────────────────────

    describe('dialog inner click', () => {
        it('does not close when clicking inside the dialog (stopPropagation)', async () => {
            const el = await createElement({ title: 'T', open: true });
            const handler = vi.fn();
            el.addEventListener('closed', handler);

            // Click on the inner .dialog div — should not bubble to backdrop
            const dialog = el.shadowRoot!.querySelector<HTMLDivElement>('.dialog')!;
            dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(handler).not.toHaveBeenCalled();
            cleanup(el);
        });
    });
});
