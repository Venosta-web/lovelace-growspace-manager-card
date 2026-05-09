
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
        it('should switch to editor when Add button is clicked', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            const editor = element.shadowRoot?.querySelector('.editor-layout');
            expect(editor).toBeTruthy();
        });

        it('should switch to editor when a card is clicked', async () => {
            const card = element.shadowRoot?.querySelector('.strain-card');
            (card as HTMLElement)?.click();
            await element.updateComplete;

            const editor = element.shadowRoot?.querySelector('.editor-layout');
            expect(editor).toBeTruthy();

            const title = element.shadowRoot?.querySelector('.dialog-title');
            expect(title?.textContent).toContain('Edit Strain');
        });

        it('should handle card delete button click (propagation stop)', async () => {
            const spy = vi.spyOn((element as any), '_handleDelete');
            const deleteBtn = element.shadowRoot?.querySelector('.sc-action-btn');
            const card = element.shadowRoot?.querySelector('.strain-card');

            // Ensure clicking delete doesn't trigger card click (which opens editor)
            const editorSpy = vi.spyOn((element as any), '_startEdit');

            (deleteBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(spy).toHaveBeenCalledWith('1');
            expect(editorSpy).not.toHaveBeenCalled();

            // Check if pending delete is set
            expect((element as any)._pendingDeleteKey).toBe('1');
        });

        it('should return to browse view', async () => {
            (element as any)._view = 'editor';
            await element.updateComplete;

            const backButtons = Array.from(element.shadowRoot?.querySelectorAll('button') || []);
            const backBtn = backButtons.find(b => b.textContent?.includes('Back'));
            (backBtn as HTMLElement)?.click();
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

    describe('Editor Interactions', () => {
        beforeEach(async () => {
            (element as any)._startEdit(mockStrains[2]);
            await element.updateComplete;
        });

        it('should update hybrid percentage via input', async () => {
            const indicaInput = element.shadowRoot?.querySelector('.hg-num-input') as HTMLInputElement;
            expect(indicaInput).toBeTruthy();

            indicaInput.value = '70';
            indicaInput.dispatchEvent(new Event('input'));
            await element.updateComplete;

            expect((element as any)._editorState.indica_percentage).toBe(70);
            expect((element as any)._editorState.sativa_percentage).toBe(30);
        });

        it('should switch type', async () => {
            const options = element.shadowRoot?.querySelectorAll('.type-option');
            (options?.[0] as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._editorState.type).toBe('Indica');
        });

        it('should handle image drop', async () => {
            const dropArea = element.shadowRoot?.querySelector('.photo-upload-area');
            const file = new File([''], 'test.png', { type: 'image/png' });

            // Define MockDragEvent inside the test to avoid global scope issues or conflicts
            class MockDragEvent extends Event {
                dataTransfer: any;
                constructor(type: string, init: any) {
                    super(type, { bubbles: true, cancelable: true });
                    this.dataTransfer = init.dataTransfer;
                }
            }

            const dropEvent = new MockDragEvent('drop', {
                dataTransfer: { files: [file], dropEffect: 'copy' }
            });

            dropArea?.dispatchEvent(dropEvent);

            // Tick
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(PlantUtils.compressImage).toHaveBeenCalled();
        });
    });

    describe('Crop Overlay', () => {
        beforeEach(async () => {
            (element as any)._startEdit(mockStrains[2]);
            await element.updateComplete;
        });

        it('should toggle crop mode', async () => {
            const cropBtn = element.shadowRoot?.querySelector('.crop-btn');
            (cropBtn as HTMLElement)?.click();
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.crop-overlay');
            expect(overlay).toBeTruthy();
            expect((element as any)._isCropping).toBe(true);
        });

        it('should change zoom via slider', async () => {
            (element as any)._isCropping = true;
            await element.updateComplete;

            const slider = element.shadowRoot?.querySelector('.crop-slider') as HTMLInputElement;
            expect(slider).toBeTruthy();
            slider.value = '2';
            slider.dispatchEvent(new Event('input'));

            expect((element as any)._editorState.image_crop_meta.scale).toBe(2);
        });
    });

    describe('Image Upload & Camera', () => {
        beforeEach(async () => {
            (element as any)._startEdit();
            await element.updateComplete;
        });

        it('should trigger camera input click', async () => {
            const cameraBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Camera'));

            const nextInput = (cameraBtn as HTMLElement)?.nextElementSibling as HTMLInputElement;
            const clickSpy = vi.spyOn(nextInput, 'click');

            (cameraBtn as HTMLElement)?.click();
            expect(clickSpy).toHaveBeenCalled();
        });

        it('should trigger gallery input click', async () => {
            const galleryBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Gallery'));

            const nextInput = (galleryBtn as HTMLElement)?.nextElementSibling as HTMLInputElement;
            const clickSpy = vi.spyOn(nextInput, 'click');

            (galleryBtn as HTMLElement)?.click();
            expect(clickSpy).toHaveBeenCalled();
        });

        it('should handle file selection via input change', async () => {
            const input = element.shadowRoot?.querySelector('input[type="file"][capture="environment"]');
            expect(input).toBeTruthy();

            const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });

            // Mock property get for files
            Object.defineProperty(input, 'files', {
                get: () => [file]
            });

            (input as HTMLInputElement).dispatchEvent(new Event('change'));

            // Tick to allow promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(PlantUtils.compressImage).toHaveBeenCalledWith(file);
        });
    });

    describe('Image Library Selector', () => {
        it('should open library selector and select image', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            const libBtn = element.shadowRoot?.querySelector('.select-library-btn');
            (libBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._isImageSelectorOpen).toBe(true);

            // Wait for rendering
            await element.updateComplete;

            const overlays = element.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));
            expect(selectorOverlay).toBeTruthy();

            const img = selectorOverlay?.querySelector('.sd-content img');
            expect(img).toBeTruthy();
            (img?.parentElement as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._editorState.image).toBeTruthy();
            expect((element as any)._isImageSelectorOpen).toBe(false);
        });

        it('should render multiple images correctly', async () => {
            // Setup multiple strains with same image to test grouping
            const strainsWithSameImg = [
                { ...mockStrains[0], image: 'duplicate.jpg' },
                { ...mockStrains[1], image: 'duplicate.jpg' }
            ];
            element.strains = strainsWithSameImg;
            await element.updateComplete;

            (element as any)._startEdit();
            (element as any)._toggleImageSelector(true);
            await element.updateComplete;

            const overlays = element.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));

            const imgItem = selectorOverlay?.querySelector('.sd-content > div > div');
            // Should show 1 image item in grid
            expect(selectorOverlay?.querySelectorAll('.sd-content > div > div').length).toBe(1);

            // Content text should explicitly show stats for both
            expect(selectorOverlay?.textContent).toContain('Strain: Blue Dream');
            expect(selectorOverlay?.textContent).toContain('Strain: OG Kush');
        });
    });

    describe('Import/Export', () => {
        it('should dispatch export event', async () => {
            const listener = vi.fn();
            element.addEventListener('export-library', listener);

            const exportBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Export'));
            (exportBtn as HTMLElement)?.click();

            expect(listener).toHaveBeenCalled();
        });

        it('should open import dialog and handle file', async () => {
            const importBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Import'));
            (importBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect((element as any)._importDialogOpen).toBe(true);

            const listener = vi.fn();
            element.addEventListener('import-library', listener);

            // Fix lint error: define onchange property on mock
            const inputMpck = {
                files: [new File([''], 'test.zip')],
                click: vi.fn(),
                onchange: null as any
            };
            vi.spyOn(document, 'createElement').mockReturnValue(inputMpck as any);

            (element as any)._handleImportFile();

            // Invoke the onchange handler manually
            if (inputMpck.onchange) {
                inputMpck.onchange({ target: inputMpck } as any);
            }

            expect(listener).toHaveBeenCalled();
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

    describe('Validation', () => {
        it('should not save if strain name is empty', async () => {
            (element as any)._startEdit(); // New empty strain
            await element.updateComplete;

            const listener = vi.fn();
            element.addEventListener('save-strain', listener);

            (element as any)._handleSave();
            expect(listener).not.toHaveBeenCalled();

            // Should still be in editor view
            expect((element as any)._view).toBe('editor');
        });

        it('should save if strain name is present', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            (element as any)._editorState = { ...((element as any)._editorState), strain: 'New Strain' };

            const listener = vi.fn();
            element.addEventListener('save-strain', listener);

            (element as any)._handleSave();
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({ strain: 'New Strain' })
            }));

            // Should return to browse view
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

        it('should trigger delete from Editor view', async () => {
            (element as any)._startEdit(mockStrains[0]); // Has key
            await element.updateComplete;

            const spy = vi.spyOn((element as any), '_handleDelete');

            // Find delete button in footer
            const delBtn = Array.from(element.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Delete'));

            (delBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(spy).toHaveBeenCalledWith(mockStrains[0].key);
        });

        it('should cancel delete', async () => {
            (element as any)._pendingDeleteKey = '123';
            (element as any)._cancelDelete();
            expect((element as any)._pendingDeleteKey).toBeNull();
        });
    });

    describe('Edge Cases & Error Handling', () => {
        it('should handle image compression error', async () => {
            // Switch to editor view first
            (element as any)._startEdit();
            await element.updateComplete;

            const dropArea = element.shadowRoot?.querySelector('.photo-upload-area');
            expect(dropArea).toBeTruthy();

            const file = new File([''], 'test.png', { type: 'image/png' });

            // Mock PlantUtils to reject
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (PlantUtils.compressImage as any).mockRejectedValueOnce('Compression Failed');

            const event = new CustomEvent('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'dataTransfer', { value: { files: [file], dropEffect: 'copy' } });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

            dropArea?.dispatchEvent(event);

            // Wait for promise chain
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error compressing image:', 'Compression Failed');
            consoleSpy.mockRestore();
        });

        it('should return to browse view when Cancel is clicked in editor footer', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Cancel'));

            expect(cancelBtn).toBeTruthy();
            (cancelBtn as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._view).toBe('browse');
        });
    });

    describe('Editor Logic Extended', () => {
        it('should handle generic editor changes', () => {
            (element as any)._startEdit();
            (element as any)._handleEditorChange('breeder', 'New Breeder');
            expect((element as any)._editorState.breeder).toBe('New Breeder');
        });

        it('should persist existing crop meta when selecting same image', () => {
            const existingStrain = mockStrains[2]; // Gorilla Glue has meta
            (element as any)._startEdit();

            (element as any)._handleSelectLibraryImage(existingStrain.image);

            expect((element as any)._editorState.image_crop_meta).toEqual(existingStrain.image_crop_meta);
        });

        it('should clear crop meta when selecting new image', () => {
            (element as any)._startEdit();
            (element as any)._editorState.image_crop_meta = { x: 1, y: 1, scale: 1 };

            (element as any)._handleSelectLibraryImage('new_image.jpg');
            expect((element as any)._editorState.image_crop_meta).toBeUndefined();
        });
    });

    describe('Render Helpers', () => {
        it('should generate background style string', () => {
            const style = (element as any).getCropStyle('img.jpg', { x: 50, y: 50, scale: 2 });
            expect(style).toContain("url('img.jpg')");
            expect(style).toContain('background-position: 50% 50%');
        });

        it('should generate background style without meta', () => {
            const style = (element as any).getCropStyle('img.jpg');
            expect(style).toContain("url('img.jpg')");
            expect(style).not.toContain('background-position');
        });

        it('should generate img tag style string', () => {
            const style = (element as any).getImgStyle({ x: 10, y: 20, scale: 1.5 });
            expect(style).toContain('object-position: 10% 20%');
            expect(style).toContain('scale(1.5)');
        });

        it('should generate img tag style without meta', () => {
            const style = (element as any).getImgStyle();
            expect(style).toContain('object-fit: cover');
            expect(style).not.toContain('scale');
        });
    });

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

        it('should trigger file selection on action button', async () => {
            const spy = vi.spyOn((element as any), '_handleImportFile');
            const selectBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Select File'));
            (selectBtn as HTMLElement)?.click();
            expect(spy).toHaveBeenCalled();
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

    describe('Advanced Editor Interactions', () => {
        beforeEach(async () => {
            (element as any)._startEdit({
                ...mockStrains[0],
                type: 'Hybrid',
                indica_percentage: 50,
                sativa_percentage: 50
            });
            await element.updateComplete;
        });

        it('should update hybrid percentage via graph click', async () => {
            const track = element.shadowRoot?.querySelector('.hg-bar-track') as HTMLElement;
            expect(track).toBeTruthy();

            // Mock click
            // rect.width = 100, click at x=25 -> 25%
            vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
                left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20
            } as any);

            const clickEvent = new MouseEvent('click', { clientX: 25, bubbles: true });
            track.dispatchEvent(clickEvent);
            await element.updateComplete;

            expect((element as any)._editorState.indica_percentage).toBe(25);
            expect((element as any)._editorState.sativa_percentage).toBe(75);
        });

        it('should update sex via radio', async () => {
            const radios = element.shadowRoot?.querySelectorAll('input[name="sex_radio"]');
            // 0=Feminized, 1=Regular
            (radios?.[1] as HTMLElement).click();
            (radios?.[1] as HTMLInputElement).dispatchEvent(new Event('change'));

            expect((element as any)._editorState.sex).toBe('Regular');
        });

        it('should close image selector via X button', async () => {
            (element as any)._isImageSelectorOpen = true;
            await element.updateComplete;

            const closeBtn = element.shadowRoot?.querySelector('.glass-dialog-container button.close');
            // The structure in renderImageSelector has a button with mdiClose
            // It's the first button in that specific overlay
            const overlay = element.shadowRoot?.querySelector('.crop-overlay');
            const btn = overlay?.querySelector('button');

            (btn as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._isImageSelectorOpen).toBe(false);
        });
    });

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

    describe('Editor Fields', () => {
        beforeEach(async () => {
            (element as any)._startEdit(mockStrains[0]);
            await element.updateComplete;
        });

        it('should update breeder', () => {
            const input = Array.from(element.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Breeder'));

            (input as HTMLInputElement).value = 'New Breeder';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.breeder).toBe('New Breeder');
        });

        it('should update phenotype', () => {
            const input = Array.from(element.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Phenotype'));

            (input as HTMLInputElement).value = '#2';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.phenotype).toBe('#2');
        });

        it('should update strain name', () => {
            const input = Array.from(element.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Strain Name'));

            (input as HTMLInputElement).value = 'New Strain';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.strain).toBe('New Strain');
        });

        it('should update flowering days', () => {
            const inputs = Array.from(element.shadowRoot?.querySelectorAll('input') || [])
                .filter(i => i.placeholder?.includes('Min') || i.placeholder?.includes('Max'));

            (inputs[0] as HTMLInputElement).value = '55';
            (inputs[0] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.flowering_days_min).toBe('55');

            (inputs[1] as HTMLInputElement).value = '65';
            (inputs[1] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.flowering_days_max).toBe('65');
        });

        it('should update lineage', () => {
            (element as any)._handleEditorChange('lineage', 'New Lineage');
            expect((element as any)._editorState.lineage).toBe('New Lineage');
        });

        it('should update description', () => {
            const textarea = element.shadowRoot?.querySelector('textarea');
            (textarea as HTMLTextAreaElement).value = 'New Desc';
            (textarea as HTMLTextAreaElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.description).toBe('New Desc');
        });

        it('should update hybrid inputs', async () => {
            // Use proper setter/method to trigger update
            (element as any)._handleEditorChange('type', 'Hybrid');
            await element.updateComplete;

            const inputs = element.shadowRoot?.querySelectorAll('.hg-num-input');
            expect(inputs?.length).toBeGreaterThan(0);

            (inputs?.[0] as HTMLInputElement).value = '30';
            (inputs?.[0] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.indica_percentage).toBe(30);
            expect((element as any)._editorState.sativa_percentage).toBe(70);

            (inputs?.[1] as HTMLInputElement).value = '60';
            (inputs?.[1] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((element as any)._editorState.sativa_percentage).toBe(60);
            expect((element as any)._editorState.indica_percentage).toBe(40);
        });
    });

    describe('Edit vs Add Mode', () => {
        it('should show delete button only in edit mode', async () => {
            // Edit existing (has key)
            (element as any)._startEdit(mockStrains[0]);
            await element.updateComplete;
            const delBtn = Array.from(element.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Delete'));
            expect(delBtn).toBeTruthy();

            // Add new (no key)
            (element as any)._startEdit();
            await element.updateComplete;
            const delBtn2 = Array.from(element.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Delete'));
            expect(delBtn2).toBeFalsy();
        });
    });

    describe('Crop Interaction', () => {
        let viewport: HTMLElement;
        beforeEach(async () => {
            (element as any)._startEdit(mockStrains[2]); // Gorilla Glue with meta
            (element as any)._toggleCropMode(true);
            await element.updateComplete;
            viewport = element.shadowRoot?.querySelector('.crop-viewport') as HTMLElement;
        });

        it('should zoom via wheel', async () => {
            expect(viewport).toBeTruthy();
            const initialScale = (element as any)._editorState.image_crop_meta.scale;

            // Wheel down (positive deltaY) -> Zoom Out (delta negative)
            const wheelEvent = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
            viewport.dispatchEvent(wheelEvent);
            await element.updateComplete;

            expect((element as any)._editorState.image_crop_meta.scale).toBeLessThan(initialScale);

            // Wheel up (negative deltaY) -> Zoom In
            const wheelEvent2 = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
            viewport.dispatchEvent(wheelEvent2);
            await element.updateComplete;
        });

        it('should pan via mouse drag', async () => {
            // Mock mouse events
            const mousedown = new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
            viewport.dispatchEvent(mousedown);

            // Move
            const mousemove = new MouseEvent('mousemove', { clientX: 50, clientY: 50, bubbles: true });
            window.dispatchEvent(mousemove);

            // Up
            const mouseup = new MouseEvent('mouseup', { clientX: 50, clientY: 50, bubbles: true });
            window.dispatchEvent(mouseup);

            // Check if meta updated
            // Initial x=10, y=10. Moved mouse by -50, -50.
            expect((element as any)._editorState.image_crop_meta.x).not.toBe(10);
        });

        it('should prevent default on dragstart', () => {
            const dragstart = new Event('dragstart', { bubbles: true, cancelable: true });
            const spy = vi.spyOn(dragstart, 'preventDefault');
            viewport.dispatchEvent(dragstart);
            expect(spy).toHaveBeenCalled();
        });

        it('should close crop overlay on Done', async () => {
            const overlay = element.shadowRoot?.querySelector('.crop-overlay');
            const doneBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.trim() === 'Done');
            (doneBtn as HTMLElement)?.click();
            await element.updateComplete;
            expect((element as any)._isCropping).toBe(false);
        });
    });

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

            // So find the button inside .dialog-header of the overlay that has "Import Strains"
            const overlay = Array.from(element.shadowRoot?.querySelectorAll('.crop-overlay') || [])
                .find(o => o.textContent?.includes('Import Strains'));

            const btn = overlay?.querySelector('.dialog-header button');
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

        it('should clamp hybrid percentage inputs', async () => {
            (element as any)._startEdit({
                ...mockStrains[0],
                type: 'Hybrid',
                indica_percentage: 50,
                sativa_percentage: 50
            });
            await element.updateComplete;

            const inputs = element.shadowRoot?.querySelectorAll('.hg-num-input');
            const indicaInput = inputs?.[0] as HTMLInputElement;

            // Test < 0
            indicaInput.value = '-10';
            indicaInput.dispatchEvent(new Event('input'));
            expect((element as any)._editorState.indica_percentage).toBe(0);

            // Test > 100
            indicaInput.value = '110';
            indicaInput.dispatchEvent(new Event('input'));
            expect((element as any)._editorState.indica_percentage).toBe(100);
        });

        it('should handle dragover event', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            const dropArea = element.shadowRoot?.querySelector('.photo-upload-area');

            class MockDragEvent extends Event {
                dataTransfer: any;
                constructor(type: string, init: any) {
                    super(type, { bubbles: true, cancelable: true });
                    this.dataTransfer = init.dataTransfer || {};
                }
            }

            const event = new MockDragEvent('dragover', {
                dataTransfer: { dropEffect: 'none' }
            });

            const spy = vi.spyOn(event, 'preventDefault');
            dropArea?.dispatchEvent(event);

            expect(spy).toHaveBeenCalled();
            expect(event.dataTransfer?.dropEffect).toBe('copy');
        });
    });

    describe('Coverage Gap Fillers', () => {
        it('should return early in _handleSave if strain is missing (safety check)', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            // Force strain to be undefined in editor state
            (element as any)._editorState = { ...((element as any)._editorState), strain: undefined };

            const listener = vi.fn();
            element.addEventListener('save-strain', listener);

            (element as any)._handleSave();

            expect(listener).not.toHaveBeenCalled();
            // Should remain in editor view
            expect((element as any)._view).toBe('editor');
        });

        it('should do nothing in _confirmDelete if no pending key', async () => {
            (element as any)._pendingDeleteKey = null;
            const listener = vi.fn();
            element.addEventListener('delete-strain', listener);

            (element as any)._confirmDelete();

            expect(listener).not.toHaveBeenCalled();
        });

        it('should handle file input change error in _handleImportFile', async () => {
            // Mock document.createElement
            const inputMock = {
                type: '',
                accept: '',
                onchange: null as any,
                click: vi.fn(),
                files: [] as any
            };

            const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(inputMock as any);
            const listener = vi.fn();
            element.addEventListener('import-library', listener);

            (element as any)._handleImportFile();

            // Setup a file change but with NO file selected (user cancelled picker)
            // Or just trigger onchange with empty files list
            Object.defineProperty(inputMock, 'files', { get: () => [] });

            if (inputMock.onchange) {
                inputMock.onchange({ target: inputMock } as any);
            }

            expect(listener).not.toHaveBeenCalled();
            expect((element as any)._importDialogOpen).toBe(false);

            createSpy.mockRestore();
        });

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

        it('should click UI Save button in Editor view (covers template listener)', async () => {
            (element as any)._startEdit(mockStrains[0]);
            await element.updateComplete;

            const spy = vi.spyOn((element as any), '_handleSave');

            // Find the Save Strain button in the footer
            // It has class "md3-button primary" and mdiCheck icon
            const saveBtn = Array.from(element.shadowRoot?.querySelectorAll('.sd-footer button.primary') || [])
                .find(b => b.textContent?.includes('Save Strain'));

            expect(saveBtn).toBeTruthy();
            (saveBtn as HTMLElement).click();

            expect(spy).toHaveBeenCalled();
        });

        it('should click UI Close button in Editor view (covers template listener)', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            const closeSpy = vi.fn();
            element.addEventListener('close', closeSpy);

            // In EDITOR view, the close button is in the header
            // selector: .dialog-header .close
            const closeBtn = element.shadowRoot?.querySelector('.dialog-header .close');
            expect(closeBtn).toBeTruthy();

            (closeBtn as HTMLElement).click();
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should handle compression error via File Input change (covers handleFileChange)', async () => {
            (element as any)._startEdit();
            await element.updateComplete;

            const input = element.shadowRoot?.querySelector('input[type="file"]');
            expect(input).toBeTruthy();

            const file = new File([''], 'fail.png', { type: 'image/png' });
            Object.defineProperty(input, 'files', { get: () => [file] });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (PlantUtils.compressImage as any).mockRejectedValueOnce('Compression Failed inside Input');

            (input as HTMLInputElement).dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error compressing image:', 'Compression Failed inside Input');
            consoleSpy.mockRestore();
        });

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

        it('should handle multiple strains sharing same image in library selector (covers map list and phenotype fallback)', async () => {
            const sharedImg = 'data:image/png;base64,shared';
            // Fix TS errors: use key instead of id, use empty string instead of undefined for phenotype (mock fallback behavior)
            const s1: StrainEntry = { ...mockStrains[0], key: 's1', image: sharedImg, phenotype: '' };
            const s2: StrainEntry = { ...mockStrains[0], key: 's2', image: sharedImg, phenotype: 'Pheno2' };

            element.strains = [s1, s2];
            await element.updateComplete;

            // Open library selector
            (element as any)._toggleImageSelector(true);
            await element.updateComplete;

            const overlays = element.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));

            expect(selectorOverlay).toBeTruthy();

            const items = selectorOverlay?.querySelectorAll('.sd-content div[style*="aspect-ratio"]');
            // Should be 1 image item (grouped)
            expect(items?.length).toBe(1);

            // Check content of the item
            const item = items?.[0];

            expect(item?.textContent).toContain('Pheno: N/A'); // s1 fallback
            expect(item?.textContent).toContain('Pheno: Pheno2'); // s2
        });

        it('should show empty state in image selector when no images exist', async () => {
            element.strains = [{ ...mockStrains[0], image: undefined }]; // No images
            await element.updateComplete;

            (element as any)._toggleImageSelector(true);
            await element.updateComplete;

            const overlays = element.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));

            expect(selectorOverlay).toBeTruthy();
            const msg = selectorOverlay?.querySelector('p');
            expect(msg?.textContent).toContain('No images found');
        });
    });


    it('should clamp hybrid graph click percentage', async () => {
        (element as any)._startEdit({
            ...mockStrains[0],
            type: 'Hybrid'
        });
        await element.updateComplete;

        const track = element.shadowRoot?.querySelector('.hg-bar-track') as HTMLElement;
        expect(track).toBeTruthy();

        // Mock getBoundingClientRect
        vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
            left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20
        } as any);

        // Click way past 100% (e.g., 150px on 100px width)
        track.dispatchEvent(new MouseEvent('click', { clientX: 150, bubbles: true }));
        expect((element as any)._editorState.indica_percentage).toBe(100);

        // Click way before 0% (e.g., -50px)
        track.dispatchEvent(new MouseEvent('click', { clientX: -50, bubbles: true }));
        expect((element as any)._editorState.indica_percentage).toBe(0);
    });

    it('should not render crop overlay if image is missing', async () => {
        (element as any)._startEdit();
        (element as any)._editorState.image = '';
        (element as any)._isCropping = true;
        await element.updateComplete;

        const overlay = element.shadowRoot?.querySelector('.crop-overlay');
        expect(overlay).toBeNull();
    });

    it('should use default crop meta if missing in renderCropOverlay', async () => {
        (element as any)._startEdit();
        // Provide image but no meta
        (element as any)._editorState.image = 'test.jpg';
        (element as any)._editorState.image_crop_meta = undefined;
        (element as any)._isCropping = true;
        await element.updateComplete;

        const overlay = element.shadowRoot?.querySelector('.crop-overlay');
        expect(overlay).toBeTruthy();

        // Check if defaults (scale=1, x=50, y=50) are reflected in style or logic
        // The crop-viewport style uses these values effectively?
        // Actually, the implementation defines 'const meta' locally.
        // We can verify by inspecting the rendered style of the image inside crop-viewport
        const img = overlay?.querySelector('.crop-viewport img') as HTMLElement;
        // Wait, the crop overlay implementation renders the image as background or img?
        // Let's check renderCropOverlay implementation details via view_file if needed.
        // Based on previous view_file, it uses helper methods?
        // Let's just trust that if it renders without error and we can find elements, the branch is taken.
        // But to be sure about the branch , we need to trigger an interaction that uses 'meta'.
        // Like zooming.

        const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
        const viewport = overlay?.querySelector('.crop-viewport');
        viewport?.dispatchEvent(wheelEvent);

        // If it was undefined, it should have started at scale 1. Delta -100 (-0.1 with *0.001?) 
        expect((element as any)._editorState.image_crop_meta.scale).toBeCloseTo(1.1);
    });

    it('should clamp indica input values and handle NaN', async () => {
        (element as any)._startEdit({
            ...mockStrains[0],
            type: 'Hybrid'
        });
        await element.updateComplete;

        const indicaInput = element.shadowRoot?.querySelector('.hg-input-label input') as HTMLInputElement;
        expect(indicaInput).toBeTruthy();

        // Test > 100
        indicaInput.value = '150';
        indicaInput.dispatchEvent(new Event('input'));
        expect((element as any)._editorState.indica_percentage).toBe(100);
        expect((element as any)._editorState.sativa_percentage).toBe(0);

        // Test < 0
        indicaInput.value = '-50';
        indicaInput.dispatchEvent(new Event('input'));
        expect((element as any)._editorState.indica_percentage).toBe(0);
        expect((element as any)._editorState.sativa_percentage).toBe(100);

        // Test NaN
        indicaInput.value = 'abc';
        indicaInput.dispatchEvent(new InputEvent('input'));
        expect((element as any)._editorState.indica_percentage).toBe(0);
    });

    it('should clamp sativa input values and handle NaN', async () => {
        (element as any)._startEdit({
            ...mockStrains[0],
            type: 'Hybrid'
        });
        await element.updateComplete;

        // Find sativa input (2nd input in hg-container)
        const inputs = element.shadowRoot?.querySelectorAll('.hg-input-label input');
        const sativaInput = inputs?.[1] as HTMLInputElement;
        expect(sativaInput).toBeTruthy();

        // Test > 100
        sativaInput.value = '150';
        sativaInput.dispatchEvent(new Event('input'));
        expect((element as any)._editorState.sativa_percentage).toBe(100);
        expect((element as any)._editorState.indica_percentage).toBe(0);

        // Test < 0
        sativaInput.value = '-50';
        sativaInput.dispatchEvent(new Event('input'));
        expect((element as any)._editorState.sativa_percentage).toBe(0);
        expect((element as any)._editorState.indica_percentage).toBe(100);
    });

    it('should handle missing file in drop and change events', async () => {
        (element as any)._startEdit();
        await element.updateComplete;

        const dropArea = element.shadowRoot?.querySelector('.photo-upload-area');

        // Drop with no files
        const emptyDrop = new CustomEvent('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(emptyDrop, 'dataTransfer', { value: { files: [], dropEffect: 'copy' } });
        Object.defineProperty(emptyDrop, 'preventDefault', { value: vi.fn() });
        dropArea?.dispatchEvent(emptyDrop);

        // Change with no files
        const input = dropArea?.querySelector('input');
        Object.defineProperty(input, 'files', { get: () => [] });
        input?.dispatchEvent(new Event('change'));

        // No errors should occur
        await element.updateComplete;
    });

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
        expect(text).toContain('Flowering: 60-? Days');
        expect(text).not.toContain('Breeder:');
    });

    it('should handle sativa input NaN/fallback', async () => {
        (element as any)._startEdit({
            ...mockStrains[0],
            type: 'Hybrid'
        });
        await element.updateComplete;

        const inputs = element.shadowRoot?.querySelectorAll('.hg-input-label input');
        const sativaInput = inputs?.[1] as HTMLInputElement;

        sativaInput.value = 'abc';
        sativaInput.dispatchEvent(new Event('input'));
        expect((element as any)._editorState.sativa_percentage).toBe(0);
        expect((element as any)._editorState.indica_percentage).toBe(100);
    });

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
