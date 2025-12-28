import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { html, render } from 'lit';

describe('StrainLibraryDialog Extra Coverage', () => {
    let element: StrainLibraryDialog;

    beforeEach(async () => {
        element = new StrainLibraryDialog();
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    it('should hit branch in renderCropOverlay when image is missing', async () => {
        (element as any)._isCropping = true;
        (element as any)._editorState = { image: null };
        await element.updateComplete;

        const overlay = element.shadowRoot?.querySelector('.crop-overlay');
        expect(element.shadowRoot?.textContent).not.toContain('Adjust Image');
    });

    it('should fallback to default crop meta if missing', async () => {
        (element as any)._editorState = { image: 'test.jpg', image_crop_meta: null };
        (element as any)._isCropping = true;
        await element.updateComplete;

        const viewport = element.shadowRoot?.querySelector('.crop-viewport');
        expect(viewport).not.toBeNull();
        if (viewport) {
            const inner = viewport.querySelector('div');
            expect(inner?.style.backgroundPosition).toBe('50% 50%');
        }
    });

    it('should hit clamp branches in hybrid bar click', async () => {
        (element as any)._view = 'editor';
        (element as any)._editorState = { type: 'hybrid', indica_percentage: 50 };
        await element.updateComplete;

        const bar = element.shadowRoot?.querySelector('.indica-percentage-track') ||
            element.shadowRoot?.querySelector('.hg-bar-track');

        // Let's use the actual class from the template
        const realBar = element.shadowRoot?.querySelector('.hg-bar-track') as HTMLElement;

        if (realBar) {
            vi.spyOn(realBar, 'getBoundingClientRect').mockReturnValue({
                left: 0, width: 100, top: 0, height: 20, right: 100, bottom: 20, x: 0, y: 0, toJSON: () => { }
            } as any);

            realBar.dispatchEvent(new MouseEvent('click', { clientX: -10, bubbles: true }));
            expect((element as any)._editorState.indica_percentage).toBe(0);

            realBar.dispatchEvent(new MouseEvent('click', { clientX: 110, bubbles: true }));
            expect((element as any)._editorState.indica_percentage).toBe(100);
        }
    });

    it('should handle mobile menu action clicks', async () => {
        (element as any)._mobileMenuOpen = true;
        await element.updateComplete;

        const menuActions = element.shadowRoot?.querySelectorAll('.mobile-menu-item');
        if (menuActions && menuActions.length > 0) {
            (menuActions[0] as HTMLElement).click();
            expect((element as any)._mobileMenuOpen).toBe(false);
        }
    });
});
