
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainLibraryDialog } from '../../../src/dialogs/strain-library-dialog';
import { StrainEntry } from '../../../src/types';
import { PlantUtils } from '../../../src/utils/plant-utils';

// Mock PlantUtils for logic isolation in browser testing
vi.mock('../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        compressImage: vi.fn().mockResolvedValue('base64string')
    }
}));


describe('StrainLibraryDialog', () => {
    let element: StrainLibraryDialog;
    const mockStrains: StrainEntry[] = [
        { key: '1', strain: 'Blue Dream', phenotype: 'Original', type: 'Sativa', breeder: 'HSO', flowering_days_min: 60, flowering_days_max: 70, image: 'img1.jpg' },
        { key: '2', strain: 'OG Kush', phenotype: '#18', type: 'Indica', breeder: 'Dinafem', flowering_days_min: 50, flowering_days_max: 60, image: 'img2.jpg' },
        { key: '3', strain: 'Gorilla Glue', phenotype: '#4', type: 'Hybrid', breeder: 'GG Strains', flowering_days_min: 58, flowering_days_max: 63, indica_percentage: 60, sativa_percentage: 40, image: 'img1.jpg', image_crop_meta: { x: 10, y: 10, scale: 1.5 } }
    ];

    beforeEach(async () => {
        element = new StrainLibraryDialog();
        element.strains = [...mockStrains];
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element.isConnected) {
            document.body.removeChild(element);
        }
        vi.restoreAllMocks();
    });

    it('should receive open attribute', () => {
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog?.hasAttribute('open')).toBe(true);
    });

    it('should render correct number of cards', () => {
        const cards = element.shadowRoot?.querySelectorAll('.strain-card');
        expect(cards?.length).toBe(3);
    });

    describe('Search & Filtering', () => {
        it('should update search query via event', async () => {
            const input = element.shadowRoot?.querySelector('md3-text-input');
            expect(input).toBeTruthy();

            // Simulate change event from md3-text-input
            input?.dispatchEvent(new CustomEvent('change', { detail: 'Blue' }));
            await element.updateComplete;

            expect((element as any)._searchQuery).toBe('Blue');
            // Should reset page to 1
            expect((element as any)._currentPage).toBe(1);

            // Check filtering results
            const cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(1);
            expect(cards?.[0].textContent).toContain('Blue Dream');
        });

        it('should filter by breeder', async () => {
            (element as any)._searchQuery = 'Dinafem';
            await element.updateComplete;
            const cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(1);
            expect(cards?.[0].textContent).toContain('OG Kush');
        });

        it('should filter by phenotype', async () => {
            (element as any)._searchQuery = '#4';
            await element.updateComplete;
            const cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(1);
            expect(cards?.[0].textContent).toContain('Gorilla Glue');
        });

        it('should filter by combined search (breeder + strain)', async () => {
            (element as any)._searchQuery = 'HSO Blue';
            await element.updateComplete;
            const cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(1);
            expect(cards?.[0].textContent).toContain('Blue Dream');
        });

        it('should filter by combined search (phenotype)', async () => {
            (element as any)._searchQuery = 'Dream Original';
            await element.updateComplete;
            const cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(1);
            expect(cards?.[0].textContent).toContain('Blue Dream');
        });
    });

    describe('Navigation & View Switching', () => {
        it('should switch to editor view when Add button is clicked (via _view state)', async () => {
            // The dialog uses _view state to switch to editor (renders strain-editor-view)
            (element as any)._editingStrain = undefined;
            (element as any)._view = 'editor';
            await element.updateComplete;

            // In editor mode, the dialog renders strain-editor-view
            const editorView = element.shadowRoot?.querySelector('strain-editor-view');
            expect(editorView).toBeTruthy();
        });

        it('should switch to editor when a card is clicked', async () => {
            const card = element.shadowRoot?.querySelector('.strain-card');
            (card as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._view).toBe('editor');
            const editorView = element.shadowRoot?.querySelector('strain-editor-view');
            expect(editorView).toBeTruthy();
        });

        it('should handle card delete button click (propagation stop)', async () => {
            const spy = vi.spyOn((element as any), '_handleDelete');
            const deleteBtn = element.shadowRoot?.querySelector('.sc-action-btn');

            (deleteBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(spy).toHaveBeenCalledWith('1');
            // Click on delete should NOT open editor - dialog stays in browse
            expect((element as any)._view).toBe('browse');
            // Should set pendingDeleteKey
            expect((element as any)._pendingDeleteKey).toBe('1');
        });

        it('should return to browse view when editor-back event fires', async () => {
            (element as any)._view = 'editor';
            await element.updateComplete;

            // Simulate the editor-back event from strain-editor-view
            const editorView = element.shadowRoot?.querySelector('strain-editor-view');
            editorView?.dispatchEvent(new CustomEvent('editor-back', { bubbles: true, composed: true }));
            await element.updateComplete;

            expect((element as any)._view).toBe('browse');
        });
    });

    describe('Pagination', () => {
        it('should paginate results', async () => {
            // Create many strains
            const manyStrains = Array.from({ length: 20 }, (_, i) => ({
                key: `${i}`, strain: `Strain ${i}`, type: 'Sativa', phenotype: ''
            }));
            element.strains = manyStrains;
            await element.updateComplete;

            let cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(15);

            const btns = element.shadowRoot?.querySelectorAll('.pagination-btn');
            const nextBtn = btns?.[1] as HTMLElement;
            nextBtn.click();
            await element.updateComplete;

            cards = element.shadowRoot?.querySelectorAll('.strain-card');
            expect(cards?.length).toBe(5);
            expect((element as any)._currentPage).toBe(2);

            const prevBtn = btns?.[0] as HTMLElement;
            prevBtn.click();
            await element.updateComplete;
            expect((element as any)._currentPage).toBe(1);
        });

        it('should clamp page when items decrease', async () => {
            // Setup 2 pages
            const manyStrains = Array.from({ length: 20 }, (_, i) => ({
                key: `${i}`, strain: `Strain ${i}`, type: 'Sativa', phenotype: ''
            }));
            element.strains = manyStrains;
            await element.updateComplete;

            (element as any)._currentPage = 2;
            await element.updateComplete;

            // Reduce to 1 page
            element.strains = mockStrains;
            await element.updateComplete;

            expect((element as any)._currentPage).toBe(1);
        });
    });

    // Editor Interactions are now tested in strain-editor-view.spec.ts

    // Crop Overlay tests are now in strain-editor-view.spec.ts

    // Image Upload & Camera tests are now in strain-editor-view.spec.ts

    // Image Library Selector tests are now in strain-editor-view.spec.ts

    describe('Import/Export', () => {
        it('should dispatch export event', async () => {
            const listener = vi.fn();
            element.addEventListener('export-library', listener);

            const exportBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Export'));
            (exportBtn as HTMLElement)?.click();

            expect(listener).toHaveBeenCalled();
        });

        it('should open import dialog when Import button is clicked', async () => {
            const importBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Import'));
            (importBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._importDialogOpen).toBe(true);
        });
    });

    describe('Mobile Menu', () => {
        it('should toggle mobile menu', async () => {
            (element as any)._mobileMenuOpen = true;
            element.requestUpdate();
            await element.updateComplete;

            const menu = element.shadowRoot?.querySelector('.mobile-menu');
            expect(menu).toBeTruthy();

            const items = menu?.querySelectorAll('.mobile-menu-item');
            if (items && items.length > 0) {
                (items[0] as HTMLElement).click();
                expect((element as any)._mobileMenuOpen).toBe(false);
            }
        });
    });
    // Removed duplicate Filtering describe block as it is now covered earlier

    // Validation tests (editor save logic) are now in strain-editor-view.spec.ts
    // Dialog-level: verify save-strain event causes view to return to browse
    describe('Validation (dialog-level)', () => {
        it('should return to browse view when strain-editor-view fires save-strain', async () => {
            (element as any)._view = 'editor';
            await element.updateComplete;

            const editorView = element.shadowRoot?.querySelector('strain-editor-view');
            editorView?.dispatchEvent(new CustomEvent('save-strain', { bubbles: true, composed: true, detail: { strain: 'New Strain' } }));
            await element.updateComplete;

            expect((element as any)._view).toBe('browse');
        });
    });

    describe('Delete Flow', () => {
        it('should handle delete request', async () => {
            (element as any)._handleDelete('123');
            await element.updateComplete;

            expect((element as any)._pendingDeleteKey).toBe('123');
        });

        it('should confirm delete and dispatch event', async () => {
            (element as any)._pendingDeleteKey = '123';
            const listener = vi.fn();
            element.addEventListener('delete-strain', listener);

            (element as any)._confirmDelete();

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { key: '123' } }));
            expect((element as any)._pendingDeleteKey).toBeNull();
        });

        it('should dispatch delete-strain and return to browse when editor fires delete-strain', async () => {
            (element as any)._view = 'editor';
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('delete-strain', listener);

            const editorView = element.shadowRoot?.querySelector('strain-editor-view');
            editorView?.dispatchEvent(new CustomEvent('delete-strain', { bubbles: true, composed: true, detail: { key: mockStrains[0].key } }));
            await element.updateComplete;

            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { key: mockStrains[0].key } }));
            expect((element as any)._view).toBe('browse');
        });

        it('should cancel delete', async () => {
            (element as any)._pendingDeleteKey = '123';
            (element as any)._cancelDelete();
            expect((element as any)._pendingDeleteKey).toBeNull();
        });
    });

    // Edge Cases & Error Handling (editor behavior) are now in strain-editor-view.spec.ts
    describe('Edge Cases & Error Handling (dialog-level)', () => {
        it('should return to browse view when editor fires editor-back', async () => {
            (element as any)._view = 'editor';
            await element.updateComplete;

            const editorView = element.shadowRoot?.querySelector('strain-editor-view');
            editorView?.dispatchEvent(new CustomEvent('editor-back', { bubbles: true, composed: true }));
            await element.updateComplete;

            expect((element as any)._view).toBe('browse');
        });
    });

    // Editor Logic Extended tests are now in strain-editor-view.spec.ts

    // Render Helpers (getCropStyle, getImgStyle) are now in strain-editor-view.spec.ts

    describe('Import Dialog UI', () => {
        beforeEach(async () => {
            (element as any)._importDialogOpen = true;
            await element.updateComplete;
        });

        it('should toggle import mode', async () => {
            const radios = element.shadowRoot?.querySelectorAll('input[name="import_mode"]');
            // Default is Merge (replace=false)
            expect((element as any)._importReplace).toBe(false);

            // Click Replace
            (radios?.[1] as HTMLElement).click();
            (radios?.[1] as HTMLInputElement).dispatchEvent(new Event('change'));
            expect((element as any)._importReplace).toBe(true);

            // Click Merge
            (radios?.[0] as HTMLElement).click();
            (radios?.[0] as HTMLInputElement).dispatchEvent(new Event('change'));
            expect((element as any)._importReplace).toBe(false);
        });

        it('should close on cancel', async () => {
            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Cancel'));
            (cancelBtn as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._importDialogOpen).toBe(false);
        });

        it('should render Select File button in import dialog', async () => {
            const selectBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Select File'));
            expect(selectBtn).toBeTruthy();
        });
    });

    describe('Delete Confirmation UI', () => {

        it('should render confirmation dialog', async () => {
            (element as any)._pendingDeleteKey = '123';
            await element.updateComplete;
            const dialog = element.shadowRoot?.querySelector('.crop-overlay .glass-dialog-container');
            expect(dialog?.textContent).toContain('Delete Strain?');
        });

        it('should confirm delete via UI button', async () => {
            const spy = vi.spyOn((element as any), '_confirmDelete');
            // Trigger render AFTER spy
            (element as any)._pendingDeleteKey = '123';
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.crop-overlay');
            const delBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.trim() === 'Delete' && b.classList.contains('text'));

            (delBtn as HTMLElement).click();
            expect(spy).toHaveBeenCalled();
        });

        it('should cancel delete via UI button', async () => {
            const spy = vi.spyOn((element as any), '_cancelDelete');
            // Trigger render AFTER spy
            (element as any)._pendingDeleteKey = '123';
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.crop-overlay');
            const cancelBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Cancel'));

            (cancelBtn as HTMLElement)?.click();
            expect(spy).toHaveBeenCalled();
        });
    });

    // Advanced Editor Interactions tests are now in strain-editor-view.spec.ts

    describe('Mobile Interactions', () => {
        it('should open editor via FAB', async () => {
            const fab = element.shadowRoot?.querySelector('.fab-btn');
            (fab as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._view).toBe('editor');
        });

        it('should trigger menu actions', async () => {
            (element as any)._mobileMenuOpen = true;
            await element.updateComplete;

            const items = element.shadowRoot?.querySelectorAll('.mobile-menu-item');

            // Get Rec
            const recSpy = vi.fn();
            element.addEventListener('get-recommendation', recSpy);
            (items?.[1] as HTMLElement).click();
            expect(recSpy).toHaveBeenCalled();

            // Re-open
            (element as any)._mobileMenuOpen = true;
            await element.updateComplete;

            // Import (sets dialog open)
            (items?.[2] as HTMLElement).click();
            expect((element as any)._importDialogOpen).toBe(true);

            // Re-open
            (element as any)._mobileMenuOpen = true;
            await element.updateComplete;

            // Export
            const expSpy = vi.fn();
            element.addEventListener('export-library', expSpy);
            (items?.[3] as HTMLElement).click();
            expect(expSpy).toHaveBeenCalled();
        });
    });

    describe('Visual Logic', () => {
        it('should render correct icon for types', async () => {
            const checkIcon = async (type: string, pathDataChunk: string) => {
                const s: StrainEntry = { ...mockStrains[0], type };
                element.strains = [s];
                await element.updateComplete;
                const svg = element.shadowRoot?.querySelector('.sc-type-row svg path');
                return svg; // We can check if path d attribute changed, but since we import paths, we can check if it rendered
            };

            // Just verifying that different types don't crash and render
            element.strains = [
                { ...mockStrains[0], type: 'Indica' },
                { ...mockStrains[0], type: 'Sativa' },
                { ...mockStrains[0], type: 'Hybrid' }
            ];
            await element.updateComplete;

            const typeRows = element.shadowRoot?.querySelectorAll('.sc-type-row');
            expect(typeRows?.length).toBe(3);
            expect(typeRows?.[0].textContent).toContain('Indica');
            expect(typeRows?.[1].textContent).toContain('Sativa');
            expect(typeRows?.[2].textContent).toContain('Hybrid');
        });
    });

    // Editor Fields tests are now in strain-editor-view.spec.ts

    // Edit vs Add Mode tests are now in strain-editor-view.spec.ts

    // Crop Interaction tests are now in strain-editor-view.spec.ts

    describe('Import Dialog Extras', () => {
        it('should close via header button', async () => {
            (element as any)._importDialogOpen = true;
            await element.updateComplete;
            // The import dialog is the last opened crop-overlay
            const overlays = element.shadowRoot?.querySelectorAll('.crop-overlay');
            const importOverlay = overlays?.[overlays.length - 1]; // Assumption

            // But actually we can query by content logic or specific structure
            // Import dialog has "Import Strains" title

            // Let's use more robust finding
            const closeBtn = Array.from(importOverlay?.querySelectorAll('button') || [])
                .find(b => b.classList.contains('text') && !b.textContent?.trim()); // icon button only? 

            // Actually structure is:
            // <div class="dialog-header">
            //   <h2 class="dialog-title">Import Strains</h2>
            //   <button ... @click=${() => (this._importDialogOpen = false)} ...>

            // The import dialog is rendered as a second ha-dialog with title "Import Strains"
            const dialogs = element.shadowRoot?.querySelectorAll('ha-dialog');
            const importDialog = Array.from(dialogs || []).find(d =>
                d.querySelector('.dialog-title')?.textContent?.includes('Import Strains')
            );

            expect(importDialog).toBeTruthy();
            const btn = importDialog?.querySelector('button.close');
            expect(btn).toBeTruthy();

            (btn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._importDialogOpen).toBe(false);
        });
    });
    describe('Coverage Gaps', () => {
        it('should clamp invalid page numbers', async () => {
            // Setup multiple pages
            element.strains = Array.from({ length: 20 }, (_, i) => ({
                key: `${i}`, strain: `Strain ${i}`, type: 'Sativa', phenotype: ''
            }));
            await element.updateComplete;

            // Set to high page
            (element as any)._currentPage = 999;
            element.requestUpdate();
            await element.updateComplete;
            expect((element as any)._currentPage).toBe(2); // Total 20 items / 12 per page = 2 pages

            // Set to low page
            (element as any)._currentPage = 0;
            element.requestUpdate();
            await element.updateComplete;
            expect((element as any)._currentPage).toBe(1);
        });

        it('should close mobile menu on overlay click', async () => {
            (element as any)._mobileMenuOpen = true;
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.menu-overlay');
            (overlay as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._mobileMenuOpen).toBe(false);
        });

        it('should use default icon for unknown type', async () => {
            element.strains = [{ ...mockStrains[0], type: 'AlienWeed' }];
            await element.updateComplete;

            const typeLabel = element.shadowRoot?.querySelector('.sc-type-row span');
            expect(typeLabel?.textContent).toBe('AlienWeed');
            // Icon check might be tricky as paths are strings, but we verified distinct ones before.
            // Main point is no crash.
        });

        // Hybrid percentage clamp and dragover tests are now in strain-editor-view.spec.ts
    });

    describe('Coverage Gap Fillers', () => {
        // _handleSave safety check is now in strain-editor-view.spec.ts

        it('should do nothing in _confirmDelete if no pending key', async () => {
            (element as any)._pendingDeleteKey = null;
            const listener = vi.fn();
            element.addEventListener('delete-strain', listener);

            (element as any)._confirmDelete();

            expect(listener).not.toHaveBeenCalled();
        });

        // _handleImportFile error case is now in strain-editor-view.spec.ts

        it('should close dialog via header close button (in browse view)', async () => {
            const closeSpy = vi.fn();
            element.addEventListener('close', closeSpy);

            // In browse view, there is a close button in header
            const headerBtn = element.shadowRoot?.querySelector('.dialog-header .close');
            expect(headerBtn).toBeTruthy();

            (headerBtn as HTMLElement).click();
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should render correct icon for unknown strain type', async () => {
            const s: StrainEntry = { ...mockStrains[0], type: 'UnknownType' };
            element.strains = [s];
            await element.updateComplete;

            const typeRows = element.shadowRoot?.querySelectorAll('.sc-type-row');
            // It should still render
            expect(typeRows?.length).toBe(1);
            expect(typeRows?.[0].textContent).toContain('UnknownType');
        });

        // UI Save/Close button and compression error tests are now in strain-editor-view.spec.ts

        it('should dispatch close event when ha-dialog fires closed', async () => {
            const closeSpy = vi.fn();
            element.addEventListener('close', closeSpy);

            const dialog = element.shadowRoot?.querySelector('ha-dialog');
            expect(dialog).toBeTruthy();

            dialog?.dispatchEvent(new CustomEvent('closed'));
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should toggle mobile menu via header button (browse view)', async () => {
            // In browse view
            (element as any)._view = 'browse';
            await element.updateComplete;

            const buttons = Array.from(element.shadowRoot?.querySelectorAll('.header-actions button') || []);
            const menuBtn = buttons.find(b => !b.classList.contains('close'));

            expect(menuBtn).toBeTruthy();
            (menuBtn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._mobileMenuOpen).toBe(true);
        });

        it('should trigger Get Recommendation via footer button (browse view)', async () => {
            (element as any)._view = 'browse';
            await element.updateComplete;

            const recSpy = vi.fn();
            element.addEventListener('get-recommendation', recSpy);

            // Footer "Get Recommendation" button
            const footerIds = element.shadowRoot?.querySelectorAll('.sd-footer button');
            // 1st button in browse view footer is Get Rec
            const btn = footerIds?.[0];

            expect(btn?.textContent).toContain('Get Recommendation');
            (btn as HTMLElement).click();
            expect(recSpy).toHaveBeenCalled();
        });

        it('should trigger New Strain via footer button (browse view)', async () => {
            (element as any)._view = 'browse';
            await element.updateComplete;

            // Footer "New Strain" button -> calls _startEdit()
            const footerIds = element.shadowRoot?.querySelectorAll('.sd-footer button');
            // Last button
            const btn = footerIds?.[footerIds.length - 1];

            expect(btn?.textContent).toContain('New Strain');

            (btn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._view).toBe('editor');
        });

        // Image selector library tests are now in strain-editor-view.spec.ts
    });


    // These editor-specific tests have been moved to strain-editor-view.spec.ts

    it('should render flowering days and breeder fallbacks', async () => {
        (element as any)._searchQuery = '';
        element.strains = [{
            key: 'minimal',
            strain: 'Minimal',
            phenotype: '',
            type: '', // Unknown type icon
            flowering_days_min: 60,
            // flowering_days_max missing -> should show ?
            // breeder missing -> should show nothing
        }];
        await element.updateComplete;

        const card = element.shadowRoot?.querySelector('.strain-card');
        const text = card?.textContent?.replace(/\s+/g, ' ').trim();
        expect(text).toContain('Flower: 60–? days');
        expect(text).not.toContain('Breeder:');
    });

    // Sativa input NaN/fallback test has been moved to strain-editor-view.spec.ts

    it('should render nothing when open is false', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should show empty state when no strains match', async () => {
        element.open = true;
        const query = 'nonexistent_strain_xyz';
        (element as any)._searchQuery = query;
        await element.updateComplete;
        const emptyState = element.shadowRoot?.querySelector('.empty-state');
        expect(emptyState?.textContent).toContain(`No strains found matching "${query}"`);
    });
});
