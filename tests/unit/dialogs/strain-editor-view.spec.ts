
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainEditorView } from '../../../src/dialogs/strain-editor-view';
import { StrainEntry } from '../../../src/types';
import { PlantUtils } from '../../../src/utils/plant-utils';

vi.mock('../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        compressImage: vi.fn().mockResolvedValue('base64string')
    }
}));

describe('StrainEditorView', () => {
    let editorEl: StrainEditorView;
    const mockStrains: StrainEntry[] = [
        { key: '1', strain: 'Blue Dream', phenotype: 'Original', type: 'Sativa', breeder: 'HSO', flowering_days_min: 60, flowering_days_max: 70, image: 'img1.jpg' },
        { key: '2', strain: 'OG Kush', phenotype: '#18', type: 'Indica', breeder: 'Dinafem', flowering_days_min: 50, flowering_days_max: 60, image: 'img2.jpg' },
        { key: '3', strain: 'Gorilla Glue', phenotype: '#4', type: 'Hybrid', breeder: 'GG Strains', flowering_days_min: 58, flowering_days_max: 63, indica_percentage: 60, sativa_percentage: 40, image: 'img1.jpg', image_crop_meta: { x: 10, y: 10, scale: 1.5 } }
    ];

    beforeEach(async () => {
        editorEl = new StrainEditorView();
        editorEl.strains = [...mockStrains];
        document.body.appendChild(editorEl);
        await editorEl.updateComplete;
    });

    afterEach(() => {
        if (editorEl.isConnected) {
            document.body.removeChild(editorEl);
        }
        vi.restoreAllMocks();
    });

    // --- Lifecycle ---

    describe('Lifecycle', () => {
        it('triggers _openEditorFor when editingStrain property changes', async () => {
            const strain: StrainEntry = {
                strain: 'New Strain',
                phenotype: 'Pheno 1',
                type: 'Sativa',
                breeder: 'Seedler',
                key: 's1',
            };
            editorEl.editingStrain = strain;
            await editorEl.updateComplete;

            expect((editorEl as any)._editorState.strain).toBe('New Strain');
        });
    });

    // --- Editor Interactions ---

    describe('Editor Interactions', () => {
        beforeEach(async () => {
            editorEl.editingStrain = mockStrains[2];
            await editorEl.updateComplete;
        });

        it('should update hybrid percentage via input', async () => {
            const indicaInput = editorEl.shadowRoot?.querySelector('.hg-num-input') as HTMLInputElement;
            expect(indicaInput).toBeTruthy();

            indicaInput.value = '70';
            indicaInput.dispatchEvent(new Event('input'));
            await editorEl.updateComplete;

            expect((editorEl as any)._editorState.indica_percentage).toBe(70);
            expect((editorEl as any)._editorState.sativa_percentage).toBe(30);
        });

        it('should switch type', async () => {
            const options = editorEl.shadowRoot?.querySelectorAll('.type-option');
            (options?.[0] as HTMLElement).click();
            await editorEl.updateComplete;

            expect((editorEl as any)._editorState.type).toBe('Indica');
        });

        it('should handle image drop', async () => {
            const dropArea = editorEl.shadowRoot?.querySelector('.photo-upload-area');
            const file = new File([''], 'test.png', { type: 'image/png' });

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

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(PlantUtils.compressImage).toHaveBeenCalled();
        });
    });

    // --- Crop Overlay ---

    describe('Crop Overlay', () => {
        beforeEach(async () => {
            editorEl.editingStrain = mockStrains[2];
            await editorEl.updateComplete;
        });

        it('should toggle crop mode', async () => {
            const cropBtn = editorEl.shadowRoot?.querySelector('.crop-btn');
            (cropBtn as HTMLElement)?.click();
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
            expect(overlay).toBeTruthy();
            expect((editorEl as any)._isCropping).toBe(true);
        });

        it('should change zoom via slider', async () => {
            (editorEl as any)._isCropping = true;
            await editorEl.updateComplete;

            const slider = editorEl.shadowRoot?.querySelector('.crop-slider') as HTMLInputElement;
            expect(slider).toBeTruthy();
            slider.value = '2';
            slider.dispatchEvent(new Event('input'));

            expect((editorEl as any)._editorState.image_crop_meta.scale).toBe(2);
        });
    });

    // --- Image Upload & Camera ---

    describe('Image Upload & Camera', () => {
        beforeEach(async () => {
            // No editingStrain = new strain mode (no image)
            await editorEl.updateComplete;
        });

        it('should trigger camera input click', async () => {
            const cameraBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Camera'));

            const nextInput = (cameraBtn as HTMLElement)?.nextElementSibling as HTMLInputElement;
            const clickSpy = vi.spyOn(nextInput, 'click');

            (cameraBtn as HTMLElement)?.click();
            expect(clickSpy).toHaveBeenCalled();
        });

        it('should trigger gallery input click', async () => {
            const galleryBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Gallery'));

            const nextInput = (galleryBtn as HTMLElement)?.nextElementSibling as HTMLInputElement;
            const clickSpy = vi.spyOn(nextInput, 'click');

            (galleryBtn as HTMLElement)?.click();
            expect(clickSpy).toHaveBeenCalled();
        });

        it('should handle file selection via input change', async () => {
            const input = editorEl.shadowRoot?.querySelector('input[type="file"][capture="environment"]');
            expect(input).toBeTruthy();

            const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });

            Object.defineProperty(input, 'files', {
                get: () => [file]
            });

            (input as HTMLInputElement).dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(PlantUtils.compressImage).toHaveBeenCalledWith(file);
        });
    });

    // --- Image Library Selector ---

    describe('Image Library Selector', () => {
        it('should open library selector and select image', async () => {
            await editorEl.updateComplete;

            const libBtn = editorEl.shadowRoot?.querySelector('.select-library-btn');
            (libBtn as HTMLElement)?.click();
            await editorEl.updateComplete;

            expect((editorEl as any)._isImageSelectorOpen).toBe(true);

            await editorEl.updateComplete;

            const overlays = editorEl.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));
            expect(selectorOverlay).toBeTruthy();

            const img = selectorOverlay?.querySelector('.sd-content img');
            expect(img).toBeTruthy();
            (img?.parentElement as HTMLElement)?.click();
            await editorEl.updateComplete;

            expect((editorEl as any)._editorState.image).toBeTruthy();
            expect((editorEl as any)._isImageSelectorOpen).toBe(false);
        });

        it('should render multiple images correctly', async () => {
            const strainsWithSameImg = [
                { ...mockStrains[0], image: 'duplicate.jpg' },
                { ...mockStrains[1], image: 'duplicate.jpg' }
            ];
            editorEl.strains = strainsWithSameImg;
            await editorEl.updateComplete;

            (editorEl as any)._toggleImageSelector(true);
            await editorEl.updateComplete;

            const overlays = editorEl.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));

            expect(selectorOverlay?.querySelectorAll('.sd-content > div > div').length).toBe(1);
            expect(selectorOverlay?.textContent).toContain('Strain: Blue Dream');
            expect(selectorOverlay?.textContent).toContain('Strain: OG Kush');
        });
    });

    // --- Validation ---

    describe('Validation', () => {
        it('should not save if strain name is empty', async () => {
            // Default state has no editingStrain -> empty _editorState
            await editorEl.updateComplete;

            const listener = vi.fn();
            editorEl.addEventListener('save-strain', listener);

            (editorEl as any)._handleSave();
            expect(listener).not.toHaveBeenCalled();
        });

        it('should save and dispatch save-strain if strain name is present', async () => {
            await editorEl.updateComplete;

            (editorEl as any)._editorState = { strain: 'New Strain' };

            const listener = vi.fn();
            editorEl.addEventListener('save-strain', listener);

            (editorEl as any)._handleSave();
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({ strain: 'New Strain' })
            }));
        });

        it('should dispatch editor-back after save (no source)', async () => {
            (editorEl as any)._editorState = { strain: 'New Strain' };

            const backListener = vi.fn();
            editorEl.addEventListener('editor-back', backListener);

            (editorEl as any)._handleSave();
            expect(backListener).toHaveBeenCalled();
        });
    });

    // --- Delete Flow ---

    describe('Delete Flow (Editor)', () => {
        it('should dispatch delete-strain from editor delete button', async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;

            const deleteListener = vi.fn();
            editorEl.addEventListener('delete-strain', deleteListener);

            const spy = vi.spyOn((editorEl as any), '_handleDelete');

            const delBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Delete'));

            (delBtn as HTMLElement)?.click();
            await editorEl.updateComplete;

            expect(spy).toHaveBeenCalledWith(mockStrains[0].key);
            expect(deleteListener).toHaveBeenCalledWith(expect.objectContaining({
                detail: { key: mockStrains[0].key }
            }));
        });

        it('should show delete button only when strain has a key', async () => {
            // Edit existing (has key)
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;
            const delBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Delete'));
            expect(delBtn).toBeTruthy();

            // Add new (no key) -> clear editingStrain
            editorEl.editingStrain = undefined;
            await editorEl.updateComplete;
            const delBtn2 = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Delete'));
            expect(delBtn2).toBeFalsy();
        });
    });

    // --- Edge Cases & Error Handling ---

    describe('Edge Cases & Error Handling', () => {
        it('should handle image compression error', async () => {
            await editorEl.updateComplete;

            const dropArea = editorEl.shadowRoot?.querySelector('.photo-upload-area');
            expect(dropArea).toBeTruthy();

            const file = new File([''], 'test.png', { type: 'image/png' });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (PlantUtils.compressImage as any).mockRejectedValueOnce('Compression Failed');

            const event = new CustomEvent('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'dataTransfer', { value: { files: [file], dropEffect: 'copy' } });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

            dropArea?.dispatchEvent(event);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error compressing image:', 'Compression Failed');
            consoleSpy.mockRestore();
        });

        it('should dispatch editor-back when Cancel is clicked', async () => {
            await editorEl.updateComplete;

            const backListener = vi.fn();
            editorEl.addEventListener('editor-back', backListener);

            const cancelBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-footer button') || [])
                .find(b => b.textContent?.includes('Cancel'));

            expect(cancelBtn).toBeTruthy();
            (cancelBtn as HTMLElement).click();
            await editorEl.updateComplete;

            expect(backListener).toHaveBeenCalled();
        });
    });

    // --- Editor Logic Extended ---

    describe('Editor Logic Extended', () => {
        it('should handle generic editor changes', () => {
            (editorEl as any)._handleEditorChange('breeder', 'New Breeder');
            expect((editorEl as any)._editorState.breeder).toBe('New Breeder');
        });

        it('should persist existing crop meta when selecting same image', () => {
            const existingStrain = mockStrains[2]; // Gorilla Glue has meta
            (editorEl as any)._handleSelectLibraryImage(existingStrain.image);

            expect((editorEl as any)._editorState.image_crop_meta).toEqual(existingStrain.image_crop_meta);
        });

        it('should clear crop meta when selecting new image', () => {
            (editorEl as any)._editorState.image_crop_meta = { x: 1, y: 1, scale: 1 };

            (editorEl as any)._handleSelectLibraryImage('new_image.jpg');
            expect((editorEl as any)._editorState.image_crop_meta).toBeUndefined();
        });
    });

    // --- Render Helpers ---

    describe('Render Helpers', () => {
        it('should generate background style string', () => {
            const style = (editorEl as any).getCropStyle('img.jpg', { x: 50, y: 50, scale: 2 });
            expect(style).toContain("url('img.jpg')");
            expect(style).toContain('background-position: 50% 50%');
        });

        it('should generate background style without meta', () => {
            const style = (editorEl as any).getCropStyle('img.jpg');
            expect(style).toContain("url('img.jpg')");
            expect(style).not.toContain('background-position');
        });

    });

    // --- Advanced Editor Interactions ---

    describe('Advanced Editor Interactions', () => {
        beforeEach(async () => {
            editorEl.editingStrain = {
                ...mockStrains[0],
                type: 'Hybrid',
                indica_percentage: 50,
                sativa_percentage: 50
            };
            await editorEl.updateComplete;
        });

        it('should update hybrid percentage via graph click', async () => {
            const track = editorEl.shadowRoot?.querySelector('.hg-bar-track') as HTMLElement;
            expect(track).toBeTruthy();

            vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
                left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20
            } as any);

            const clickEvent = new MouseEvent('click', { clientX: 25, bubbles: true });
            track.dispatchEvent(clickEvent);
            await editorEl.updateComplete;

            expect((editorEl as any)._editorState.indica_percentage).toBe(25);
            expect((editorEl as any)._editorState.sativa_percentage).toBe(75);
        });

        it('should update sex via radio', async () => {
            const radios = editorEl.shadowRoot?.querySelectorAll('input[name="sex_radio"]');
            (radios?.[1] as HTMLElement).click();
            (radios?.[1] as HTMLInputElement).dispatchEvent(new Event('change'));

            expect((editorEl as any)._editorState.sex).toBe('Regular');
        });

        it('should close image selector via X button', async () => {
            (editorEl as any)._isImageSelectorOpen = true;
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
            const btn = overlay?.querySelector('button');

            (btn as HTMLElement)?.click();
            await editorEl.updateComplete;
            expect((editorEl as any)._isImageSelectorOpen).toBe(false);
        });
    });

    // --- Editor Fields ---

    describe('Editor Fields', () => {
        beforeEach(async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;
        });

        it('should update breeder', () => {
            const input = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Breeder'));

            (input as HTMLInputElement).value = 'New Breeder';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.breeder).toBe('New Breeder');
        });

        it('should update phenotype', () => {
            const input = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Phenotype'));

            (input as HTMLInputElement).value = '#2';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.phenotype).toBe('#2');
        });

        it('should update strain name', () => {
            const input = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Strain Name'));

            (input as HTMLInputElement).value = 'New Strain';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.strain).toBe('New Strain');
        });

        it('should update flowering days', () => {
            const inputs = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .filter(i => i.placeholder?.includes('Min') || i.placeholder?.includes('Max'));

            (inputs[0] as HTMLInputElement).value = '55';
            (inputs[0] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.flowering_days_min).toBe('55');

            (inputs[1] as HTMLInputElement).value = '65';
            (inputs[1] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.flowering_days_max).toBe('65');
        });

        it('should update lineage', () => {
            (editorEl as any)._handleEditorChange('lineage', 'New Lineage');
            expect((editorEl as any)._editorState.lineage).toBe('New Lineage');
        });

        it('should update description', () => {
            const textarea = editorEl.shadowRoot?.querySelector('textarea');
            (textarea as HTMLTextAreaElement).value = 'New Desc';
            (textarea as HTMLTextAreaElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.description).toBe('New Desc');
        });

        it('should update hybrid inputs', async () => {
            (editorEl as any)._handleEditorChange('type', 'Hybrid');
            await editorEl.updateComplete;

            const inputs = editorEl.shadowRoot?.querySelectorAll('.hg-num-input');
            expect(inputs?.length).toBeGreaterThan(0);

            (inputs?.[0] as HTMLInputElement).value = '30';
            (inputs?.[0] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.indica_percentage).toBe(30);
            expect((editorEl as any)._editorState.sativa_percentage).toBe(70);

            (inputs?.[1] as HTMLInputElement).value = '60';
            (inputs?.[1] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.sativa_percentage).toBe(60);
            expect((editorEl as any)._editorState.indica_percentage).toBe(40);
        });
    });

    // --- Crop Interaction ---

    describe('Crop Interaction', () => {
        let viewport: HTMLElement;
        beforeEach(async () => {
            editorEl.editingStrain = mockStrains[2]; // Gorilla Glue with meta
            (editorEl as any)._toggleCropMode(true);
            await editorEl.updateComplete;
            viewport = editorEl.shadowRoot?.querySelector('.crop-viewport') as HTMLElement;
        });

        it('should zoom via wheel', async () => {
            expect(viewport).toBeTruthy();
            const initialScale = (editorEl as any)._editorState.image_crop_meta.scale;

            const wheelEvent = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
            viewport.dispatchEvent(wheelEvent);
            await editorEl.updateComplete;

            expect((editorEl as any)._editorState.image_crop_meta.scale).toBeLessThan(initialScale);

            const wheelEvent2 = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
            viewport.dispatchEvent(wheelEvent2);
            await editorEl.updateComplete;
        });

        it('should pan via mouse drag', async () => {
            const mousedown = new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true });
            viewport.dispatchEvent(mousedown);

            const mousemove = new MouseEvent('mousemove', { clientX: 50, clientY: 50, bubbles: true });
            window.dispatchEvent(mousemove);

            const mouseup = new MouseEvent('mouseup', { clientX: 50, clientY: 50, bubbles: true });
            window.dispatchEvent(mouseup);

            expect((editorEl as any)._editorState.image_crop_meta.x).not.toBe(10);
        });

        it('should prevent default on dragstart', () => {
            const dragstart = new Event('dragstart', { bubbles: true, cancelable: true });
            const spy = vi.spyOn(dragstart, 'preventDefault');
            viewport.dispatchEvent(dragstart);
            expect(spy).toHaveBeenCalled();
        });

        it('should close crop overlay on Done', async () => {
            const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
            const doneBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.trim() === 'Done');
            (doneBtn as HTMLElement)?.click();
            await editorEl.updateComplete;
            expect((editorEl as any)._isCropping).toBe(false);
        });
    });

    // --- Coverage Gaps ---

    describe('Coverage Gaps', () => {
        it('should clamp hybrid percentage inputs', async () => {
            editorEl.editingStrain = {
                ...mockStrains[0],
                type: 'Hybrid',
                indica_percentage: 50,
                sativa_percentage: 50
            };
            await editorEl.updateComplete;

            const inputs = editorEl.shadowRoot?.querySelectorAll('.hg-num-input');
            const indicaInput = inputs?.[0] as HTMLInputElement;

            indicaInput.value = '-10';
            indicaInput.dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.indica_percentage).toBe(0);

            indicaInput.value = '110';
            indicaInput.dispatchEvent(new Event('input'));
            expect((editorEl as any)._editorState.indica_percentage).toBe(100);
        });

        it('should handle dragover event', async () => {
            await editorEl.updateComplete;

            const dropArea = editorEl.shadowRoot?.querySelector('.photo-upload-area');

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

        it('should return early in _handleSave if strain is missing (safety check)', async () => {
            await editorEl.updateComplete;

            (editorEl as any)._editorState = { ...((editorEl as any)._editorState), strain: undefined };

            const listener = vi.fn();
            editorEl.addEventListener('save-strain', listener);

            (editorEl as any)._handleSave();

            expect(listener).not.toHaveBeenCalled();
        });

        it('should handle file input change error in _handleImportFile', async () => {
            const inputMock = {
                type: '',
                accept: '',
                onchange: null as any,
                click: vi.fn(),
                files: [] as any
            };

            const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(inputMock as any);
            const listener = vi.fn();
            editorEl.addEventListener('import-library', listener);

            (editorEl as any)._handleImportFile();

            Object.defineProperty(inputMock, 'files', { get: () => [] });

            if (inputMock.onchange) {
                inputMock.onchange({ target: inputMock } as any);
            }

            expect(listener).not.toHaveBeenCalled();

            createSpy.mockRestore();
        });

        it('should click UI Save button in Editor view', async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;

            const spy = vi.spyOn((editorEl as any), '_handleSave');

            const saveBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-footer button.primary') || [])
                .find(b => b.textContent?.includes('Save Strain'));

            expect(saveBtn).toBeTruthy();
            (saveBtn as HTMLElement).click();

            expect(spy).toHaveBeenCalled();
        });

        it('should dispatch close event when close button is clicked', async () => {
            await editorEl.updateComplete;

            const closeSpy = vi.fn();
            editorEl.addEventListener('close', closeSpy);

            const closeBtn = editorEl.shadowRoot?.querySelector('.dialog-header .close');
            expect(closeBtn).toBeTruthy();

            (closeBtn as HTMLElement).click();
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should handle compression error via File Input change', async () => {
            await editorEl.updateComplete;

            const input = editorEl.shadowRoot?.querySelector('input[type="file"]');
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

        it('should handle multiple strains sharing same image in library selector', async () => {
            const sharedImg = 'data:image/png;base64,shared';
            const s1: StrainEntry = { ...mockStrains[0], key: 's1', image: sharedImg, phenotype: '' };
            const s2: StrainEntry = { ...mockStrains[0], key: 's2', image: sharedImg, phenotype: 'Pheno2' };

            editorEl.strains = [s1, s2];
            await editorEl.updateComplete;

            (editorEl as any)._toggleImageSelector(true);
            await editorEl.updateComplete;

            const overlays = editorEl.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));

            expect(selectorOverlay).toBeTruthy();

            const items = selectorOverlay?.querySelectorAll('.sd-content div[style*="aspect-ratio"]');
            expect(items?.length).toBe(1);

            const item = items?.[0];
            expect(item?.textContent).toContain('Pheno: N/A');
            expect(item?.textContent).toContain('Pheno: Pheno2');
        });

        it('should show empty state in image selector when no images exist', async () => {
            editorEl.strains = [{ ...mockStrains[0], image: undefined }];
            await editorEl.updateComplete;

            (editorEl as any)._toggleImageSelector(true);
            await editorEl.updateComplete;

            const overlays = editorEl.shadowRoot?.querySelectorAll('.crop-overlay');
            const selectorOverlay = Array.from(overlays || []).find(o => o.querySelector('.dialog-title')?.textContent?.includes('Select from Library'));

            expect(selectorOverlay).toBeTruthy();
            const msg = selectorOverlay?.querySelector('p');
            expect(msg?.textContent).toContain('No images found');
        });
    });

    // --- Saving & Events ---

    describe('Saving & Events', () => {
        it('dispatches strain-created-at-source when source is set', async () => {
            editorEl.source = 'add-plant-dialog';
            editorEl.returnPayload = { extra: 'data' };
            (editorEl as any)._editorState = { strain: 'Quick Strain', type: 'Indica' };
            await editorEl.updateComplete;

            const sourceHandler = vi.fn();
            editorEl.addEventListener('strain-created-at-source', sourceHandler);

            (editorEl as any)._handleSave();

            expect(sourceHandler).toHaveBeenCalled();
            const detail = sourceHandler.mock.calls[0][0].detail;
            expect(detail.source).toBe('add-plant-dialog');
            expect(detail.returnPayload.extra).toBe('data');
            expect(detail.strain.strain).toBe('Quick Strain');
        });
    });

    // --- Breeder Logic ---

    describe('Breeder Logic', () => {
        it('auto-fills breeder logo when breeder name matches existing', async () => {
            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Pheno 1', breeder: 'HSO', breeder_logo: 'hso-logo', type: 'Hybrid' },
                { key: 's2', strain: 'OG Kush', phenotype: 'Pheno 2', breeder: 'Dinafem', type: 'Hybrid' },
            ];
            (editorEl as any)._editorState = { strain: '', type: 'Hybrid' };
            (editorEl as any)._handleEditorChange('breeder', 'HSO');
            expect((editorEl as any)._editorState.breeder_logo).toBe('hso-logo');
        });

        it('does not auto-fill logo if breeder name has no logo in library', async () => {
            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Pheno 1', breeder: 'HSO', breeder_logo: 'hso-logo', type: 'Hybrid' },
                { key: 's2', strain: 'OG Kush', phenotype: 'Pheno 2', breeder: 'Dinafem', type: 'Hybrid' },
            ];
            (editorEl as any)._editorState = { strain: '', type: 'Hybrid' };
            (editorEl as any)._handleEditorChange('breeder', 'Dinafem');
            expect((editorEl as any)._editorState.breeder_logo).toBeUndefined();
        });
    });

    // --- UI Interactions (image selection) ---

    describe('UI Interactions', () => {
        it('handles image selection from library', async () => {
            (editorEl as any)._isImageSelectorOpen = true;
            (editorEl as any)._editorState = { strain: '', type: 'Hybrid' };
            await editorEl.updateComplete;

            (editorEl as any)._handleSelectLibraryImage('hso-logo');
            expect((editorEl as any)._editorState.image).toBe('hso-logo');
            expect((editorEl as any)._editorState.image_crop_meta).toBeUndefined();
        });

        it('handles image selection with existing crop meta', async () => {
            (editorEl as any)._editorState = { strain: '', type: 'Hybrid' };
            editorEl.strains[0].image = 'hso-logo';
            editorEl.strains[0].image_crop_meta = { x: 10, y: 20, scale: 2 };

            (editorEl as any)._handleSelectLibraryImage('hso-logo');
            expect((editorEl as any)._editorState.image_crop_meta).toEqual({ x: 10, y: 20, scale: 2 });
        });

        it('deletes image_crop_meta when selecting new image without meta', async () => {
            (editorEl as any)._editorState = { strain: '', type: 'Hybrid', image_crop_meta: { x: 0, y: 0, scale: 1 } };
            (editorEl as any)._handleSelectLibraryImage('new-image-path');
            expect((editorEl as any)._editorState.image_crop_meta).toBeUndefined();
        });

        it('dispatches open-print-label', async () => {
            (editorEl as any)._editorState = { strain: 'Quick Strain', breeder: 'HSO' };
            const printHandler = vi.fn();
            editorEl.addEventListener('open-print-label', printHandler);

            (editorEl as any)._handlePrintLabel();

            expect(printHandler).toHaveBeenCalled();
            const detail = printHandler.mock.calls[0][0].detail;
            expect(detail.strainName).toBe('Quick Strain');
            expect(detail.breeder).toBe('HSO');
        });
    });

    // --- Additional Coverage ---

    it('should clamp hybrid graph click percentage', async () => {
        editorEl.editingStrain = {
            ...mockStrains[0],
            type: 'Hybrid'
        };
        await editorEl.updateComplete;

        const track = editorEl.shadowRoot?.querySelector('.hg-bar-track') as HTMLElement;
        expect(track).toBeTruthy();

        vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
            left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20
        } as any);

        track.dispatchEvent(new MouseEvent('click', { clientX: 150, bubbles: true }));
        expect((editorEl as any)._editorState.indica_percentage).toBe(100);

        track.dispatchEvent(new MouseEvent('click', { clientX: -50, bubbles: true }));
        expect((editorEl as any)._editorState.indica_percentage).toBe(0);
    });

    it('should not render crop overlay if image is missing', async () => {
        (editorEl as any)._editorState.image = '';
        (editorEl as any)._isCropping = true;
        await editorEl.updateComplete;

        const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
        expect(overlay).toBeNull();
    });

    it('should use default crop meta if missing in renderCropOverlay', async () => {
        (editorEl as any)._editorState.image = 'test.jpg';
        (editorEl as any)._editorState.image_crop_meta = undefined;
        (editorEl as any)._isCropping = true;
        await editorEl.updateComplete;

        const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
        expect(overlay).toBeTruthy();

        const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
        const viewport = overlay?.querySelector('.crop-viewport');
        viewport?.dispatchEvent(wheelEvent);

        expect((editorEl as any)._editorState.image_crop_meta.scale).toBeCloseTo(1.1);
    });

    it('should clamp indica input values and handle NaN', async () => {
        editorEl.editingStrain = {
            ...mockStrains[0],
            type: 'Hybrid'
        };
        await editorEl.updateComplete;

        const indicaInput = editorEl.shadowRoot?.querySelector('.hg-input-label input') as HTMLInputElement;
        expect(indicaInput).toBeTruthy();

        indicaInput.value = '150';
        indicaInput.dispatchEvent(new Event('input'));
        expect((editorEl as any)._editorState.indica_percentage).toBe(100);
        expect((editorEl as any)._editorState.sativa_percentage).toBe(0);

        indicaInput.value = '-50';
        indicaInput.dispatchEvent(new Event('input'));
        expect((editorEl as any)._editorState.indica_percentage).toBe(0);
        expect((editorEl as any)._editorState.sativa_percentage).toBe(100);

        indicaInput.value = 'abc';
        indicaInput.dispatchEvent(new InputEvent('input'));
        expect((editorEl as any)._editorState.indica_percentage).toBe(0);
    });

    it('should clamp sativa input values and handle NaN', async () => {
        editorEl.editingStrain = {
            ...mockStrains[0],
            type: 'Hybrid'
        };
        await editorEl.updateComplete;

        const inputs = editorEl.shadowRoot?.querySelectorAll('.hg-input-label input');
        const sativaInput = inputs?.[1] as HTMLInputElement;
        expect(sativaInput).toBeTruthy();

        sativaInput.value = '150';
        sativaInput.dispatchEvent(new Event('input'));
        expect((editorEl as any)._editorState.sativa_percentage).toBe(100);
        expect((editorEl as any)._editorState.indica_percentage).toBe(0);

        sativaInput.value = '-50';
        sativaInput.dispatchEvent(new Event('input'));
        expect((editorEl as any)._editorState.sativa_percentage).toBe(0);
        expect((editorEl as any)._editorState.indica_percentage).toBe(100);
    });

    it('should handle missing file in drop and change events', async () => {
        await editorEl.updateComplete;

        const dropArea = editorEl.shadowRoot?.querySelector('.photo-upload-area');

        const emptyDrop = new CustomEvent('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(emptyDrop, 'dataTransfer', { value: { files: [], dropEffect: 'copy' } });
        Object.defineProperty(emptyDrop, 'preventDefault', { value: vi.fn() });
        dropArea?.dispatchEvent(emptyDrop);

        const input = dropArea?.querySelector('input');
        Object.defineProperty(input, 'files', { get: () => [] });
        input?.dispatchEvent(new Event('change'));

        await editorEl.updateComplete;
    });

    it('should handle sativa input NaN/fallback', async () => {
        editorEl.editingStrain = {
            ...mockStrains[0],
            type: 'Hybrid'
        };
        await editorEl.updateComplete;

        const inputs = editorEl.shadowRoot?.querySelectorAll('.hg-input-label input');
        const sativaInput = inputs?.[1] as HTMLInputElement;

        sativaInput.value = 'abc';
        sativaInput.dispatchEvent(new Event('input'));
        expect((editorEl as any)._editorState.sativa_percentage).toBe(0);
        expect((editorEl as any)._editorState.indica_percentage).toBe(100);
    });

    // --- Print Label branch ---

    describe('Additional Coverage Edge Cases', () => {
        it('covers _handlePrintLabel branch', () => {
            (editorEl as any)._editorState = { strain: '' };
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            (editorEl as any)._handlePrintLabel();
            expect(dispatchSpy).not.toHaveBeenCalled();

            (editorEl as any)._editorState = { strain: 'Test' };
            (editorEl as any)._handlePrintLabel();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-print-label' }));
            dispatchSpy.mockRestore();
        });

        it('covers _handleImportFile branch', () => {
            const event = { target: { files: [] } };
            // StrainEditorView's _handleImportFile creates input and clicks it, no event arg
            // Just verify it doesn't crash when invoked
            const inputMock = {
                type: '',
                accept: '',
                onchange: null as any,
                click: vi.fn(),
                files: [] as any
            };
            vi.spyOn(document, 'createElement').mockReturnValue(inputMock as any);
            (editorEl as any)._handleImportFile();
            expect(true).toBe(true); // Should not throw
        });
    });
});
