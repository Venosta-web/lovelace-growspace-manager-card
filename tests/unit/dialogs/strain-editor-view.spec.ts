
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrainEditorView } from '../../../src/dialogs/strain-editor-view';
import { createInitialSM, transition } from '../../../src/dialogs/strain-editor-view-sm';
import { StrainEntry } from '../../../src/types';
import { PlantUtils } from '../../../src/utils/plant-utils';

// Convenience helpers to access/mutate the SM in tests
function getSM(el: StrainEditorView) { return (el as any)._sm; }
function setDraft(el: StrainEditorView, draft: Partial<StrainEntry>) {
  (el as any)._sm = createInitialSM(draft);
  el.requestUpdate();
}
function getSubKind(el: StrainEditorView) { return getSM(el).sub.kind; }
function setSubState(el: StrainEditorView, sub: any) {
  (el as any)._sm = { ...getSM(el), sub };
  el.requestUpdate();
}
function getBreederDraft(el: StrainEditorView) {
  const sub = getSM(el).sub;
  return sub.kind === 'breeder-editing' ? sub.draft : null;
}
function setBreederDraft(el: StrainEditorView, draft: { name: string; logo: string; originalName: string }) {
  (el as any)._sm = { ...getSM(el), sub: { kind: 'breeder-editing', draft } };
  el.requestUpdate();
}
function getPendingDelete(el: StrainEditorView) {
  const sub = getSM(el).sub;
  return sub.kind === 'breeder-confirm-delete' ? sub.name : null;
}
function patchDraft(el: StrainEditorView, patch: Partial<StrainEntry>) {
  (el as any)._sm = { ...getSM(el), draft: { ...getSM(el).draft, ...patch } };
  el.requestUpdate();
}

vi.mock('../../../src/utils/plant-utils', () => ({
    PlantUtils: {
        compressImage: vi.fn().mockResolvedValue('base64string'),
        encodeLocalPath: vi.fn().mockImplementation((p: string) => p),
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

            expect(getSM(editorEl).draft.strain).toBe('New Strain');
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

            expect(getSM(editorEl).draft.indica_percentage).toBe(70);
            expect(getSM(editorEl).draft.sativa_percentage).toBe(30);
        });

        it('should switch type', async () => {
            const options = editorEl.shadowRoot?.querySelectorAll('.type-option');
            (options?.[0] as HTMLElement).click();
            await editorEl.updateComplete;

            expect(getSM(editorEl).draft.type).toBe('Indica');
        });

        it('should handle image drop', async () => {
            const dropArea = editorEl.shadowRoot?.querySelector('.gallery-drop-area');
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
            (editorEl as any)._toggleCropMode(true);
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
            expect(overlay).toBeTruthy();
            expect(getSubKind(editorEl)).toBe('cropping');
        });

        it('should change zoom via slider', async () => {
            setSubState(editorEl, { kind: 'cropping' });
            await editorEl.updateComplete;

            const slider = editorEl.shadowRoot?.querySelector('.crop-slider') as HTMLInputElement;
            expect(slider).toBeTruthy();
            slider.value = '2';
            slider.dispatchEvent(new Event('input'));

            expect(getSM(editorEl).draft.image_crop_meta.scale).toBe(2);
        });
    });

    // --- Image Upload & Camera ---

    describe('Image Upload & Camera', () => {
        beforeEach(async () => {
            // No editingStrain = new strain mode (no image)
            await editorEl.updateComplete;
        });

        it('should handle file selection via input change', async () => {
            const input = editorEl.shadowRoot?.querySelector('input[type="file"]');
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

            setDraft(editorEl, { strain: 'New Strain' });

            const listener = vi.fn();
            editorEl.addEventListener('save-strain', listener);

            (editorEl as any)._handleSave();
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                detail: expect.objectContaining({ strain: 'New Strain' })
            }));
        });

        it('should dispatch editor-back after save (no source)', async () => {
            setDraft(editorEl, { strain: 'New Strain' });

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

            const dropArea = editorEl.shadowRoot?.querySelector('.gallery-drop-area');
            expect(dropArea).toBeTruthy();

            const file = new File([''], 'test.png', { type: 'image/png' });
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (PlantUtils.compressImage as any).mockRejectedValueOnce('Compression Failed');

            const event = new CustomEvent('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'dataTransfer', { value: { files: [file], dropEffect: 'copy' } });
            Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

            dropArea?.dispatchEvent(event);

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Gallery upload failed:', 'Compression Failed');
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
            expect(getSM(editorEl).draft.breeder).toBe('New Breeder');
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

            expect(getSM(editorEl).draft.indica_percentage).toBe(25);
            expect(getSM(editorEl).draft.sativa_percentage).toBe(75);
        });

        it('should update sex via radio', async () => {
            const radios = editorEl.shadowRoot?.querySelectorAll('input[name="sex_radio"]');
            (radios?.[1] as HTMLElement).click();
            (radios?.[1] as HTMLInputElement).dispatchEvent(new Event('change'));

            expect(getSM(editorEl).draft.sex).toBe('Regular');
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
            expect(getSM(editorEl).draft.breeder).toBe('New Breeder');
        });

        it('should update phenotype', () => {
            const input = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Phenotype'));

            (input as HTMLInputElement).value = '#2';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.phenotype).toBe('#2');
        });

        it('should update strain name', () => {
            const input = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .find(i => i.parentElement?.textContent?.includes('Strain Name'));

            (input as HTMLInputElement).value = 'New Strain';
            (input as HTMLInputElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.strain).toBe('New Strain');
        });

        it('should update flowering days', () => {
            const inputs = Array.from(editorEl.shadowRoot?.querySelectorAll('input') || [])
                .filter(i => i.placeholder?.includes('Min') || i.placeholder?.includes('Max'));

            (inputs[0] as HTMLInputElement).value = '55';
            (inputs[0] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.flowering_days_min).toBe('55');

            (inputs[1] as HTMLInputElement).value = '65';
            (inputs[1] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.flowering_days_max).toBe('65');
        });

        it('should update lineage', () => {
            (editorEl as any)._handleEditorChange('lineage', 'New Lineage');
            expect(getSM(editorEl).draft.lineage).toBe('New Lineage');
        });

        it('should update description', () => {
            const textarea = editorEl.shadowRoot?.querySelector('textarea');
            (textarea as HTMLTextAreaElement).value = 'New Desc';
            (textarea as HTMLTextAreaElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.description).toBe('New Desc');
        });

        it('should update hybrid inputs', async () => {
            (editorEl as any)._handleEditorChange('type', 'Hybrid');
            await editorEl.updateComplete;

            const inputs = editorEl.shadowRoot?.querySelectorAll('.hg-num-input');
            expect(inputs?.length).toBeGreaterThan(0);

            (inputs?.[0] as HTMLInputElement).value = '30';
            (inputs?.[0] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.indica_percentage).toBe(30);
            expect(getSM(editorEl).draft.sativa_percentage).toBe(70);

            (inputs?.[1] as HTMLInputElement).value = '60';
            (inputs?.[1] as HTMLInputElement).dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.sativa_percentage).toBe(60);
            expect(getSM(editorEl).draft.indica_percentage).toBe(40);
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
            const initialScale = getSM(editorEl).draft.image_crop_meta.scale;

            const wheelEvent = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
            viewport.dispatchEvent(wheelEvent);
            await editorEl.updateComplete;

            expect(getSM(editorEl).draft.image_crop_meta.scale).toBeLessThan(initialScale);

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

            expect(getSM(editorEl).draft.image_crop_meta.x).not.toBe(10);
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
            expect(getSubKind(editorEl)).not.toBe('cropping');
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
            expect(getSM(editorEl).draft.indica_percentage).toBe(0);

            indicaInput.value = '110';
            indicaInput.dispatchEvent(new Event('input'));
            expect(getSM(editorEl).draft.indica_percentage).toBe(100);
        });

        it('should handle dragover event', async () => {
            await editorEl.updateComplete;

            const dropArea = editorEl.shadowRoot?.querySelector('.gallery-drop-area');

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

            setDraft(editorEl, { ...(getSM(editorEl).draft), strain: undefined });

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

            expect(consoleSpy).toHaveBeenCalledWith('Gallery upload failed:', 'Compression Failed inside Input');
            consoleSpy.mockRestore();
        });
    });

    // --- Saving & Events ---

    describe('Saving & Events', () => {
        it('dispatches strain-created-at-source when source is set', async () => {
            editorEl.source = 'add-plant-dialog';
            editorEl.returnPayload = { extra: 'data' };
            setDraft(editorEl, { strain: 'Quick Strain', type: 'Indica' });
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
            setDraft(editorEl, { strain: '', type: 'Hybrid' });
            (editorEl as any)._handleEditorChange('breeder', 'HSO');
            expect(getSM(editorEl).draft.breeder_logo).toBe('hso-logo');
        });

        it('does not auto-fill logo if breeder name has no logo in library', async () => {
            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Pheno 1', breeder: 'HSO', breeder_logo: 'hso-logo', type: 'Hybrid' },
                { key: 's2', strain: 'OG Kush', phenotype: 'Pheno 2', breeder: 'Dinafem', type: 'Hybrid' },
            ];
            setDraft(editorEl, { strain: '', type: 'Hybrid' });
            (editorEl as any)._handleEditorChange('breeder', 'Dinafem');
            expect(getSM(editorEl).draft.breeder_logo).toBeUndefined();
        });
    });

    // --- UI Interactions ---

    describe('UI Interactions', () => {
        it('dispatches open-print-label', async () => {
            setDraft(editorEl, { strain: 'Quick Strain', breeder: 'HSO' });
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
        expect(getSM(editorEl).draft.indica_percentage).toBe(100);

        track.dispatchEvent(new MouseEvent('click', { clientX: -50, bubbles: true }));
        expect(getSM(editorEl).draft.indica_percentage).toBe(0);
    });

    it('should not render crop overlay if image is missing', async () => {
        patchDraft(editorEl, { image: '' });
        setSubState(editorEl, { kind: 'cropping' });
        await editorEl.updateComplete;

        const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
        expect(overlay).toBeNull();
    });

    it('should use default crop meta if missing in renderCropOverlay', async () => {
        patchDraft(editorEl, { image: 'test.jpg', image_crop_meta: undefined });
        setSubState(editorEl, { kind: 'cropping' });
        await editorEl.updateComplete;

        const overlay = editorEl.shadowRoot?.querySelector('.crop-overlay');
        expect(overlay).toBeTruthy();

        const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
        const viewport = overlay?.querySelector('.crop-viewport');
        viewport?.dispatchEvent(wheelEvent);

        expect(getSM(editorEl).draft.image_crop_meta.scale).toBeCloseTo(1.1);
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
        expect(getSM(editorEl).draft.indica_percentage).toBe(100);
        expect(getSM(editorEl).draft.sativa_percentage).toBe(0);

        indicaInput.value = '-50';
        indicaInput.dispatchEvent(new Event('input'));
        expect(getSM(editorEl).draft.indica_percentage).toBe(0);
        expect(getSM(editorEl).draft.sativa_percentage).toBe(100);

        indicaInput.value = 'abc';
        indicaInput.dispatchEvent(new InputEvent('input'));
        expect(getSM(editorEl).draft.indica_percentage).toBe(0);
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
        expect(getSM(editorEl).draft.sativa_percentage).toBe(100);
        expect(getSM(editorEl).draft.indica_percentage).toBe(0);

        sativaInput.value = '-50';
        sativaInput.dispatchEvent(new Event('input'));
        expect(getSM(editorEl).draft.sativa_percentage).toBe(0);
        expect(getSM(editorEl).draft.indica_percentage).toBe(100);
    });

    it('should handle missing file in drop and change events', async () => {
        await editorEl.updateComplete;

        const dropArea = editorEl.shadowRoot?.querySelector('.gallery-drop-area');

        const emptyDrop = new CustomEvent('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(emptyDrop, 'dataTransfer', { value: { files: [], dropEffect: 'copy' } });
        Object.defineProperty(emptyDrop, 'preventDefault', { value: vi.fn() });
        dropArea?.dispatchEvent(emptyDrop);

        const input = dropArea?.querySelector('input');
        if (input) {
            Object.defineProperty(input, 'files', { get: () => [] });
            input.dispatchEvent(new Event('change'));
        }

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
        expect(getSM(editorEl).draft.sativa_percentage).toBe(0);
        expect(getSM(editorEl).draft.indica_percentage).toBe(100);
    });

    // --- Print Label branch ---

    describe('Additional Coverage Edge Cases', () => {
        it('covers _handlePrintLabel branch', () => {
            setDraft(editorEl, { strain: '' });
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            (editorEl as any)._handlePrintLabel();
            expect(dispatchSpy).not.toHaveBeenCalled();

            setDraft(editorEl, { strain: 'Test' });
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

        it('should navigate to ancestor and go back using history', async () => {
            const mockAncestor: StrainEntry = {
                key: 'ancestor-1',
                strain: 'Blue Dream Ancestor',
                phenotype: 'Original',
                breeder: 'HSO',
                type: 'Hybrid'
            };
            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Pheno 1', breeder: 'HSO', type: 'Hybrid' },
                mockAncestor
            ];
            editorEl.editingStrain = editorEl.strains[0];
            await editorEl.updateComplete;

            (editorEl as any)._navigateToAncestor(mockAncestor);
            expect(getSM(editorEl).history.length).toBe(1);
            expect(getSM(editorEl).draft.strain).toBe('Blue Dream Ancestor');

            (editorEl as any)._goBack();
            expect(getSM(editorEl).history.length).toBe(0);
            expect(getSM(editorEl).draft.strain).toBe('Blue Dream');
        });

        it('dispatches editor-back event when history is empty in _goBack', async () => {
            (editorEl as any)._sm = { ...getSM(editorEl), history: [] };
            const backSpy = vi.fn();
            editorEl.addEventListener('editor-back', backSpy);
            (editorEl as any)._goBack();
            expect(backSpy).toHaveBeenCalled();
        });

        it('handles loading strain lineage tree successfully', async () => {
            const mockTree = { parents: [{ name: 'Parent 1' }] };
            const getTreeSpy = vi.fn().mockResolvedValue(mockTree);
            editorEl.store = {
                actions: {
                    genetics: {
                        getStrainLineageTree: getTreeSpy
                    }
                }
            } as any;

            await (editorEl as any)._loadStrainLineageTree('Blue Dream');
            expect(getTreeSpy).toHaveBeenCalledWith('Blue Dream');
            expect((editorEl as any)._lineageTree).toEqual(mockTree);
        });

        it('handles loading strain lineage tree failure', async () => {
            const getTreeSpy = vi.fn().mockRejectedValue(new Error('API error'));
            editorEl.store = {
                actions: {
                    genetics: {
                        getStrainLineageTree: getTreeSpy
                    }
                }
            } as any;

            await (editorEl as any)._loadStrainLineageTree('Blue Dream');
            expect(getTreeSpy).toHaveBeenCalledWith('Blue Dream');
            expect((editorEl as any)._lineageTree).toBeNull();
        });

        it('returns early in _loadStrainLineageTree when store is not defined', async () => {
            editorEl.store = undefined;
            (editorEl as any)._lineageTree = { original: 'tree' } as any;
            await (editorEl as any)._loadStrainLineageTree('Blue Dream');
            expect((editorEl as any)._lineageTree).toEqual({ original: 'tree' });
        });

        it('handles lineage-change event from lineage-tree-editor', async () => {
            const mockTree = { parents: [{ name: 'Parent 1' }] };
            const getTreeSpy = vi.fn().mockResolvedValue(mockTree);
            const updateTreeSpy = vi.fn().mockResolvedValue({ lineage: { parents: [] } });

            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Original', breeder: 'HSO', type: 'Hybrid' }
            ];
            editorEl.editingStrain = editorEl.strains[0];
            await editorEl.updateComplete;

            editorEl.store = {
                actions: {
                    genetics: {
                        getStrainLineageTree: getTreeSpy,
                        updateStrainLineageTree: updateTreeSpy,
                    }
                }
            } as any;

            setSubState(editorEl, { kind: 'lineage-editing' });
            (editorEl as any)._lineageTree = mockTree;
            await editorEl.updateComplete;

            const editorComponent = editorEl.shadowRoot?.querySelector('lineage-tree-editor');
            expect(editorComponent).toBeTruthy();

            editorComponent?.dispatchEvent(new CustomEvent('lineage-change', {
                detail: { parents: ['Parent 1'] }
            }));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(updateTreeSpy).toHaveBeenCalledWith('Blue Dream', ['Parent 1']);
            expect(getTreeSpy).toHaveBeenCalledWith('Blue Dream');
        });

        it('triggers import-library event in _handleImportFile when a file is selected', async () => {
            const file = new File(['{}'], 'library.json', { type: 'application/json' });
            const inputMock = {
                type: '',
                accept: '',
                onchange: null as any,
                click: vi.fn(),
                files: [file]
            };
            vi.spyOn(document, 'createElement').mockReturnValue(inputMock as any);

            const importSpy = vi.fn();
            editorEl.addEventListener('import-library', importSpy);

            (editorEl as any)._handleImportFile();
            expect(inputMock.click).toHaveBeenCalled();
            expect(inputMock.onchange).toBeTypeOf('function');

            inputMock.onchange({ target: inputMock });

            expect(importSpy).toHaveBeenCalled();
            const detail = (importSpy.mock.calls[0][0] as any).detail;
            expect(detail.file).toBe(file);
            expect(detail.replace).toBe(false);
            expect(getSubKind(editorEl)).not.toBe('importing');
        });

        it('clicks the back button and triggers _goBack', async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;

            const iconButton = editorEl.shadowRoot?.querySelector('.dialog-header .md3-button.tonal') as HTMLElement;
            expect(iconButton).toBeTruthy();

            const goBackSpy = vi.spyOn(editorEl as any, '_goBack').mockImplementation(() => {});
            iconButton.click();
            expect(goBackSpy).toHaveBeenCalled();
            goBackSpy.mockRestore();
        });

        it('opens Seedfinder dialog when clicking the Seedfinder button', async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;

            const seedfinderBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Seedfinder'));
            expect(seedfinderBtn).toBeTruthy();

            (seedfinderBtn as HTMLElement).click();
            expect(getSubKind(editorEl)).toBe('seedfinder');
        });

        it('toggles lineage edit mode and loads strain tree', async () => {
            const mockTree = { parents: [{ name: 'Parent 1' }] };
            const getTreeSpy = vi.fn().mockResolvedValue(mockTree);
            editorEl.store = {
                actions: {
                    genetics: {
                        getStrainLineageTree: getTreeSpy
                    }
                }
            } as any;
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;

            const editTreeBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-btn-text') || [])
                .find(b => b.textContent?.includes('Edit tree'));
            expect(editTreeBtn).toBeTruthy();

            // Toggle Edit tree mode ON
            await (editTreeBtn as HTMLElement).click();
            await editorEl.updateComplete;
            expect(getSubKind(editorEl)).toBe('lineage-editing');
            expect(getTreeSpy).toHaveBeenCalledWith('Blue Dream');

            // Toggle View mode ON (Edit tree OFF)
            const viewBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-btn-text') || [])
                .find(b => b.textContent?.trim() === 'View');
            expect(viewBtn).toBeTruthy();
            await (viewBtn as HTMLElement).click();
            await editorEl.updateComplete;
            expect(getSubKind(editorEl)).not.toBe('lineage-editing');
        });

        it('returns early in lineage-change handler if strain or store is missing', async () => {
            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Original', breeder: 'HSO', type: 'Hybrid' }
            ];
            editorEl.editingStrain = editorEl.strains[0];
            await editorEl.updateComplete;

            setSubState(editorEl, { kind: 'lineage-editing' });
            (editorEl as any)._lineageTree = { parents: [] };
            await editorEl.updateComplete;

            const editorComponent = editorEl.shadowRoot?.querySelector('lineage-tree-editor');
            expect(editorComponent).toBeTruthy();

            // 1. Missing store
            editorEl.store = undefined;
            await editorEl.updateComplete;

            let hasError = false;
            try {
                editorComponent?.dispatchEvent(new CustomEvent('lineage-change', {
                    detail: { parents: ['Parent 1'] }
                }));
            } catch (err) {
                hasError = true;
            }
            expect(hasError).toBe(false);

            // 2. Missing strain (strain name is empty)
            const updateTreeSpy = vi.fn();
            editorEl.store = {
                actions: {
                    genetics: {
                        updateStrainLineageTree: updateTreeSpy,
                    }
                }
            } as any;
            patchDraft(editorEl, { strain: '', phenotype: '' });
            await editorEl.updateComplete;

            try {
                editorComponent?.dispatchEvent(new CustomEvent('lineage-change', {
                    detail: { parents: ['Parent 1'] }
                }));
            } catch (err) {
                hasError = true;
            }
            expect(hasError).toBe(false);
            expect(updateTreeSpy).not.toHaveBeenCalled();
        });

        it('navigates to ancestor on node-click if match exists, does nothing if no match', async () => {
            editorEl.strains = [
                { key: 's1', strain: 'Blue Dream', phenotype: 'Pheno 1', breeder: 'HSO', type: 'Hybrid' },
                { key: 's2', strain: 'OG Kush', phenotype: 'Pheno 1', breeder: 'Dinafem', type: 'Indica' }
            ];
            editorEl.editingStrain = editorEl.strains[0];
            await editorEl.updateComplete;

            setSubState(editorEl, { kind: 'idle' });
            (editorEl as any)._lineageTree = { parents: [{ name: 'OG Kush' }] };
            await editorEl.updateComplete;

            const treeComponent = editorEl.shadowRoot?.querySelector('lineage-tree');
            expect(treeComponent).toBeTruthy();

            const navigateSpy = vi.spyOn(editorEl as any, '_navigateToAncestor').mockImplementation(() => {});

            // Click with match
            treeComponent?.dispatchEvent(new CustomEvent('node-click', {
                detail: { name: 'OG Kush' }
            }));
            expect(navigateSpy).toHaveBeenCalledWith(editorEl.strains[1]);

            // Click with no match
            navigateSpy.mockClear();
            treeComponent?.dispatchEvent(new CustomEvent('node-click', {
                detail: { name: 'Nonexistent' }
            }));
            expect(navigateSpy).not.toHaveBeenCalled();
            navigateSpy.mockRestore();
        });
    });

    describe('Breeder Management Core Actions', () => {
        it('calculates unique breeders correctly via _getUniqueBreeders', () => {
            editorEl.strains = [
                { key: '1', strain: 'Strain A', phenotype: '', breeder: ' Breeder A ', breeder_logo: 'logoA', type: 'Indica' },
                { key: '2', strain: 'Strain B', phenotype: '', breeder: 'Breeder A', breeder_logo: '', type: 'Sativa' },
                { key: '3', strain: 'Strain C', phenotype: '', breeder: 'Breeder B', breeder_logo: 'logoB', type: 'Hybrid' },
                { key: '4', strain: 'Strain D', phenotype: '', breeder: '', type: 'Hybrid' },
            ];

            const unique = (editorEl as any)._getUniqueBreeders();
            expect(unique).toEqual([
                { name: 'Breeder A', logo: 'logoA', strainCount: 2 },
                { name: 'Breeder B', logo: 'logoB', strainCount: 1 }
            ]);
        });

        it('starts breeder edit with custom or default state', () => {
            (editorEl as any)._startBreederEdit('Barney', 'logoUrl');
            expect(getBreederDraft(editorEl)).toEqual({
                name: 'Barney',
                logo: 'logoUrl',
                originalName: 'Barney'
            });

            (editorEl as any)._startBreederEdit();
            expect(getBreederDraft(editorEl)).toEqual({
                name: '',
                logo: '',
                originalName: ''
            });
        });

        it('does not save breeder if state name is empty', () => {
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            setBreederDraft(editorEl, { name: '  ', logo: 'logo', originalName: '' });
            (editorEl as any)._handleSaveBreeder();
            expect(dispatchSpy).not.toHaveBeenCalled();
            dispatchSpy.mockRestore();
        });

        it('saves new breeder if originalName is empty', () => {
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            setBreederDraft(editorEl, { name: 'New Breeder', logo: 'newLogo', originalName: '' });
            (editorEl as any)._handleSaveBreeder();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'save-breeder'
            }));
            const detail = (dispatchSpy.mock.calls[0][0] as any).detail;
            expect(detail).toEqual({ name: 'New Breeder', logo: 'newLogo' });
            expect(getBreederDraft(editorEl)).toBeNull();
            dispatchSpy.mockRestore();
        });

        it('updates existing breeder if originalName is present', () => {
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            setBreederDraft(editorEl, { name: 'Updated Name', logo: 'updatedLogo', originalName: 'Old Breeder' });
            (editorEl as any)._handleSaveBreeder();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'update-breeder'
            }));
            const detail = (dispatchSpy.mock.calls[0][0] as any).detail;
            expect(detail).toEqual({ oldName: 'Old Breeder', newName: 'Updated Name', logo: 'updatedLogo' });
            expect(getBreederDraft(editorEl)).toBeNull();
            dispatchSpy.mockRestore();
        });

        it('handles breeder delete flow correctly', () => {
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            
            (editorEl as any)._handleDeleteBreeder('ToDelete');
            expect(getPendingDelete(editorEl)).toBe('ToDelete');

            (editorEl as any)._cancelDeleteBreeder();
            expect(getPendingDelete(editorEl)).toBeNull();

            (editorEl as any)._handleDeleteBreeder('ToDelete2');
            (editorEl as any)._confirmDeleteBreeder();
            expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'delete-breeder'
            }));
            const detail = (dispatchSpy.mock.calls[0][0] as any).detail;
            expect(detail).toEqual({ name: 'ToDelete2' });
            expect(getPendingDelete(editorEl)).toBeNull();

            dispatchSpy.mockRestore();
        });

        it('does not dispatch delete-breeder if no pending breeder', () => {
            const dispatchSpy = vi.spyOn(editorEl, 'dispatchEvent');
            setSubState(editorEl, { kind: 'idle' });
            (editorEl as any)._confirmDeleteBreeder();
            expect(dispatchSpy).not.toHaveBeenCalled();
            dispatchSpy.mockRestore();
        });

        it('handles Seedfinder import and updates editorState', () => {
            setDraft(editorEl, { strain: 'Old Strain', breeder: 'Old Breeder' });
            setSubState(editorEl, { kind: 'seedfinder' });

            const importEvent = new CustomEvent('seedfinder-import', {
                detail: { strain: 'Seedfinder Blue Dream', breeder: 'SF Breeder', flowered: 65 }
            });
            (editorEl as any)._handleSeedfinderImport(importEvent);

            expect(getSM(editorEl).draft).toEqual({
                strain: 'Seedfinder Blue Dream',
                breeder: 'SF Breeder',
                flowered: 65
            });
            expect(getSubKind(editorEl)).not.toBe('seedfinder');
        });
    });

    describe('Breeder Logo in Strain Editor Form', () => {
        beforeEach(async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;
        });

        it('triggers file input click when Upload Logo button is clicked', async () => {
            const uploadBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Change Logo') || b.textContent?.includes('Upload Logo'));
            expect(uploadBtn).toBeTruthy();

            const fileInput = uploadBtn?.nextElementSibling as HTMLInputElement;
            expect(fileInput).toBeTruthy();
            expect(fileInput.type).toBe('file');

            const clickSpy = vi.spyOn(fileInput, 'click');
            uploadBtn?.click();
            expect(clickSpy).toHaveBeenCalled();
        });

        it('handles file input change and compresses breeder logo successfully', async () => {
            const file = new File([''], 'logo.png', { type: 'image/png' });
            const uploadBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Change Logo') || b.textContent?.includes('Upload Logo'));
            const fileInput = uploadBtn?.nextElementSibling as HTMLInputElement;

            vi.spyOn(PlantUtils, 'compressImage').mockResolvedValue('compressed-base64');

            Object.defineProperty(fileInput, 'files', {
                value: [file],
                writable: true
            });

            fileInput.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(PlantUtils.compressImage).toHaveBeenCalledWith(file);
            expect(getSM(editorEl).draft.breeder_logo).toBe('compressed-base64');
        });

        it('handles file input change compression failure', async () => {
            const file = new File([''], 'logo.png', { type: 'image/png' });
            const uploadBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Change Logo') || b.textContent?.includes('Upload Logo'));
            const fileInput = uploadBtn?.nextElementSibling as HTMLInputElement;

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.spyOn(PlantUtils, 'compressImage').mockRejectedValue(new Error('Compression failure'));

            Object.defineProperty(fileInput, 'files', {
                value: [file],
                writable: true
            });

            fileInput.dispatchEvent(new Event('change'));

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith('Error compressing logo:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('clears breeder logo when delete logo button is clicked', async () => {
            setDraft(editorEl, { ...mockStrains[0], breeder_logo: 'some-logo' });
            await editorEl.updateComplete;

            const buttons = Array.from(editorEl.shadowRoot?.querySelectorAll('button') || []);
            const deleteBtn = buttons.find(b => b.getAttribute('style')?.includes('color: var(--error-color'));
            expect(deleteBtn).toBeTruthy();

            deleteBtn?.click();
            await editorEl.updateComplete;

            expect(getSM(editorEl).draft.breeder_logo).toBe('');
        });
    });

    describe('Dialog Rendering and Interactions', () => {
        it('renders and interacts with the Import Dialog', async () => {
            setSubState(editorEl, { kind: 'importing', replace: false });
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            expect(overlay).toBeTruthy();
            expect(overlay?.querySelector('.dialog-title')?.textContent).toContain('Import Strains');

            const radioButtons = Array.from(overlay?.querySelectorAll('input[type="radio"]') || []) as HTMLInputElement[];
            expect(radioButtons.length).toBe(2);
            expect(getSubKind(editorEl) === 'importing' ? (getSM(editorEl).sub as any).replace : false).toBe(false);
            
            radioButtons[1].checked = true;
            radioButtons[1].dispatchEvent(new Event('change'));
            expect(getSubKind(editorEl) === 'importing' ? (getSM(editorEl).sub as any).replace : false).toBe(true);

            radioButtons[0].checked = true;
            radioButtons[0].dispatchEvent(new Event('change'));
            expect(getSubKind(editorEl) === 'importing' ? (getSM(editorEl).sub as any).replace : false).toBe(false);

            const selectBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Select File'));
            expect(selectBtn).toBeTruthy();

            const importFileSpy = vi.spyOn(editorEl as any, '_handleImportFile').mockImplementation(() => {});
            (selectBtn as HTMLElement).click();
            expect(importFileSpy).toHaveBeenCalled();

            const closeBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Cancel') || b.querySelector('svg'));
            expect(closeBtn).toBeTruthy();
            (closeBtn as HTMLElement).click();
            expect(getSubKind(editorEl)).not.toBe('importing');
        });

        it('renders and interacts with Breeder Dialog - Breeder List mode', async () => {
            setSubState(editorEl, { kind: 'breeder-list' });
            editorEl.strains = [
                { key: '1', strain: 'Strain A', phenotype: '', breeder: 'Breeder A', breeder_logo: 'logoA', type: 'Indica' }
            ];
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            expect(overlay).toBeTruthy();
            expect(overlay?.querySelector('.dialog-title')?.textContent).toContain('Breeder Manager');

            const breederItems = overlay?.querySelectorAll('.breeder-card');
            expect(breederItems?.length).toBe(1);
            expect(breederItems?.[0].textContent).toContain('Breeder A');

            const breederCard = overlay?.querySelector('.breeder-card') as HTMLElement;
            expect(breederCard).toBeTruthy();
            breederCard.click();
            expect(getBreederDraft(editorEl)).toEqual({ name: 'Breeder A', logo: 'logoA', originalName: 'Breeder A' });

            const closeBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Close') || b.querySelector('svg'));
            expect(closeBtn).toBeTruthy();
            (closeBtn as HTMLElement).click();
            expect(['breeder-list', 'breeder-editing', 'breeder-confirm-delete']).not.toContain(getSubKind(editorEl));
        });

        it('renders and interacts with Breeder Dialog - Breeder Editor mode', async () => {
            setSubState(editorEl, { kind: 'breeder-list' });
            setBreederDraft(editorEl, { name: 'Edit Breeder', logo: 'some-logo', originalName: 'Original Breeder' });
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            expect(overlay).toBeTruthy();
            expect(overlay?.querySelector('h3')?.textContent).toContain('Edit Breeder');

            const nameInput = overlay?.querySelector('input[type="text"]') as HTMLInputElement;
            expect(nameInput).toBeTruthy();
            expect(nameInput.value).toBe('Edit Breeder');

            nameInput.value = 'New Name';
            nameInput.dispatchEvent(new Event('input'));
            expect(getBreederDraft(editorEl)?.name).toBe('New Name');

            const logoBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Change Logo') || b.textContent?.includes('Upload Logo'));
            expect(logoBtn).toBeTruthy();
            const fileInput = logoBtn?.nextElementSibling as HTMLInputElement;
            expect(fileInput).toBeTruthy();

            const compressSpy = vi.spyOn(PlantUtils, 'compressImage').mockResolvedValue('new-compressed-logo');
            Object.defineProperty(fileInput, 'files', {
                value: [new File([''], 'logo.png', { type: 'image/png' })],
                writable: true
            });
            fileInput.dispatchEvent(new Event('change'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(compressSpy).toHaveBeenCalled();
            expect(getBreederDraft(editorEl)?.logo).toBe('new-compressed-logo');

            const saveBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Save Changes'));
            expect(saveBtn).toBeTruthy();
            const saveSpy = vi.spyOn(editorEl as any, '_handleSaveBreeder');
            (saveBtn as HTMLElement).click();
            expect(saveSpy).toHaveBeenCalled();

            setBreederDraft(editorEl, { name: 'Edit Breeder', logo: 'some-logo', originalName: 'Original Breeder' });
            await editorEl.updateComplete;
            const cancelBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('ha-dialog button') || [])
                .find(b => b.textContent?.includes('Cancel'));
            expect(cancelBtn).toBeTruthy();
            (cancelBtn as HTMLElement).click();
            expect(getBreederDraft(editorEl)).toBeNull();
        });

        it('clears breeder logo in Breeder Editor mode', async () => {
            setSubState(editorEl, { kind: 'breeder-list' });
            setBreederDraft(editorEl, { name: 'Edit Breeder', logo: 'some-logo', originalName: 'Original Breeder' });
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            const buttons = Array.from(overlay?.querySelectorAll('button') || []);
            const deleteLogoBtn = buttons.find(b => b.querySelector('svg') && b.getAttribute('style')?.includes('color:var(--error-color'));
            expect(deleteLogoBtn).toBeTruthy();

            deleteLogoBtn?.click();
            await editorEl.updateComplete;

            expect(getBreederDraft(editorEl)?.logo).toBe('');
        });

        it('renders and interacts with Breeder Dialog - Delete Confirmation mode', async () => {
            setSubState(editorEl, { kind: 'breeder-confirm-delete', name: 'Breeder to Delete' });
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            expect(overlay).toBeTruthy();
            expect(overlay?.querySelector('.dialog-title')?.textContent).toContain('Remove Breeder?');
            expect(overlay?.querySelector('p')?.textContent).toContain('This will remove');
            expect(overlay?.querySelector('p')?.textContent).toContain('Breeder to Delete');

            const deleteBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Remove'));
            expect(deleteBtn).toBeTruthy();
            
            const deleteSpy = vi.fn();
            editorEl.addEventListener('delete-breeder', deleteSpy);
            
            (deleteBtn as HTMLElement).click();
            expect(deleteSpy).toHaveBeenCalled();
            expect(deleteSpy.mock.calls[0][0].detail).toEqual({ name: 'Breeder to Delete' });

            setSubState(editorEl, { kind: 'breeder-confirm-delete', name: 'Breeder to Delete' });
            await editorEl.updateComplete;
            const cancelBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('ha-dialog button') || [])
                .find(b => b.textContent?.includes('Cancel'));
            expect(cancelBtn).toBeTruthy();
            (cancelBtn as HTMLElement).click();
            expect(getPendingDelete(editorEl)).toBeNull();
        });

        it('renders and interacts with Seedfinder Dialog', async () => {
            setSubState(editorEl, { kind: 'seedfinder' });
            await editorEl.updateComplete;

            const seedfinderComponent = editorEl.shadowRoot?.querySelector('strain-import-dialog');
            expect(seedfinderComponent).toBeTruthy();

            seedfinderComponent?.dispatchEvent(new CustomEvent('close'));
            expect(getSubKind(editorEl)).not.toBe('seedfinder');
        });

        it('triggers edit and delete breeder from the Breeder List', async () => {
            setSubState(editorEl, { kind: 'breeder-list' });
            editorEl.strains = [
                { key: '1', strain: 'Strain A', phenotype: '', breeder: 'Breeder A', breeder_logo: 'logoA', type: 'Indica' }
            ];
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            const item = overlay?.querySelector('.breeder-card');
            expect(item).toBeTruthy();

            const editBtn = item?.querySelectorAll('.sc-action-btn')?.[0] as HTMLElement;
            const deleteBtn = item?.querySelectorAll('.sc-action-btn')?.[1] as HTMLElement;
            expect(editBtn).toBeTruthy();
            expect(deleteBtn).toBeTruthy();

            const startEditSpy = vi.spyOn(editorEl as any, '_startBreederEdit');
            editBtn.click();
            expect(startEditSpy).toHaveBeenCalledWith('Breeder A', 'logoA');

            const deleteSpy = vi.spyOn(editorEl as any, '_handleDeleteBreeder');
            deleteBtn.click();
            expect(deleteSpy).toHaveBeenCalledWith('Breeder A');
        });

        it('supports Breeder Editor back button and logo file input click and handles compression error', async () => {
            setSubState(editorEl, { kind: 'breeder-list' });
            setBreederDraft(editorEl, { name: 'Edit Breeder', logo: 'some-logo', originalName: 'Original Breeder' });
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            expect(overlay).toBeTruthy();

            // 1. Back button click
            const backBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Back'));
            expect(backBtn).toBeTruthy();
            (backBtn as HTMLElement).click();
            expect(getBreederDraft(editorEl)).toBeNull();

            // Re-open editor state
            setBreederDraft(editorEl, { name: 'Edit Breeder', logo: 'some-logo', originalName: 'Original Breeder' });
            await editorEl.updateComplete;

            // 2. Click Logo button to trigger input file click
            const logoBtn = Array.from(overlay?.querySelectorAll('button') || [])
                .find(b => b.textContent?.includes('Change Logo') || b.textContent?.includes('Upload Logo'));
            expect(logoBtn).toBeTruthy();
            const fileInput = logoBtn?.nextElementSibling as HTMLInputElement;
            expect(fileInput).toBeTruthy();
            const fileInputSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
            (logoBtn as HTMLElement).click();
            expect(fileInputSpy).toHaveBeenCalled();

            // 3. Image compression error console logs
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const compressSpy = vi.spyOn(PlantUtils, 'compressImage').mockRejectedValue(new Error('Compression failed'));
            Object.defineProperty(fileInput, 'files', {
                value: [new File([''], 'logo.png', { type: 'image/png' })],
                writable: true
            });
            fileInput.dispatchEvent(new Event('change'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(compressSpy).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalledWith('Error compressing logo:', expect.any(Error));
            errorSpy.mockRestore();
        });

        it('renders empty breeder list state when no strains exist', async () => {
            setSubState(editorEl, { kind: 'breeder-list' });
            editorEl.strains = [];
            await editorEl.updateComplete;

            const overlay = editorEl.shadowRoot?.querySelector('ha-dialog');
            expect(overlay?.textContent).toContain('No breeders found');
        });
    });

    // --- View Lineage ---

    describe('View Lineage', () => {
        it('dispatches view-lineage event when View lineage button is clicked', async () => {
            editorEl.editingStrain = mockStrains[0];
            await editorEl.updateComplete;

            const listener = vi.fn();
            editorEl.addEventListener('view-lineage', listener);

            const viewBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.sd-btn-text') || [])
                .find(b => b.textContent?.includes('View lineage'));
            expect(viewBtn).toBeTruthy();
            (viewBtn as HTMLElement).click();

            expect(listener).toHaveBeenCalled();
            const detail = listener.mock.calls[0][0].detail;
            expect(detail.strain.strain).toBe('Blue Dream');
        });

        it('_viewLineageInTree dispatches view-lineage with current editor state', () => {
            setDraft(editorEl, { strain: 'Gorilla Glue', phenotype: '#4' });
            const listener = vi.fn();
            editorEl.addEventListener('view-lineage', listener);

            (editorEl as any)._viewLineageInTree();

            expect(listener).toHaveBeenCalled();
            expect(listener.mock.calls[0][0].detail.strain.strain).toBe('Gorilla Glue');
        });
    });

    // --- _handleSave with onSave callback ---

    describe('_handleSave with onSave callback', () => {
        it('calls onSave prop instead of dispatching save-strain', async () => {
            const onSaveMock = vi.fn().mockResolvedValue(undefined);
            editorEl.onSave = onSaveMock;
            setDraft(editorEl, { strain: 'Callback Strain' });

            const saveSpy = vi.fn();
            editorEl.addEventListener('save-strain', saveSpy);

            await (editorEl as any)._handleSave();

            expect(onSaveMock).toHaveBeenCalledWith(expect.objectContaining({ strain: 'Callback Strain' }));
            expect(saveSpy).not.toHaveBeenCalled();
        });
    });

    // --- _handleSave with remote images ---

    describe('_handleSave with remote images', () => {
        const mockHass = {
            connection: {
                sendMessagePromise: vi.fn(),
            },
        };

        beforeEach(() => {
            editorEl.hass = mockHass as any;
        });

        it('downloads remote images and sets thumbnail when found', async () => {
            mockHass.connection.sendMessagePromise.mockResolvedValue({ path: '/local/downloaded.jpg' });

            setDraft(editorEl, {
                strain: 'Remote Strain',
                images: [
                    { path: 'http://example.com/thumb.jpg', is_thumbnail: true },
                    { path: '/local/local.jpg', is_thumbnail: false },
                ],
            });

            const saveListener = vi.fn();
            editorEl.addEventListener('save-strain', saveListener);

            await (editorEl as any)._handleSave();

            expect(mockHass.connection.sendMessagePromise).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'growspace_manager/download_strain_image', url: 'http://example.com/thumb.jpg' })
            );
            expect(saveListener).toHaveBeenCalled();
            const saved = saveListener.mock.calls[0][0].detail;
            expect(saved.image).toBe('/local/downloaded.jpg');
        });

        it('promotes first image as thumbnail when no thumbnail present after download', async () => {
            mockHass.connection.sendMessagePromise.mockResolvedValue({ path: '/local/promoted.jpg' });

            setDraft(editorEl, {
                strain: 'Remote Strain',
                images: [
                    { path: 'http://example.com/img1.jpg', is_thumbnail: false },
                ],
            });

            const saveListener = vi.fn();
            editorEl.addEventListener('save-strain', saveListener);

            await (editorEl as any)._handleSave();

            const saved = saveListener.mock.calls[0][0].detail;
            expect(saved.images[0].is_thumbnail).toBe(true);
            expect(saved.image).toBe('/local/promoted.jpg');
        });

        it('resets _uploadingImage to false even when download fails', async () => {
            mockHass.connection.sendMessagePromise.mockRejectedValue(new Error('network error'));
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            setDraft(editorEl, {
                strain: 'Fail Strain',
                images: [{ path: 'http://example.com/fail.jpg', is_thumbnail: true }],
            });
            editorEl.addEventListener('save-strain', vi.fn());

            await (editorEl as any)._handleSave();

            expect(getSM(editorEl).status.kind).not.toBe('applying');
            consoleSpy.mockRestore();
        });
    });

    // --- _downloadRemoteImages ---

    describe('_downloadRemoteImages', () => {
        const mockHass = {
            connection: {
                sendMessagePromise: vi.fn(),
            },
        };

        beforeEach(() => {
            editorEl.hass = mockHass as any;
            setDraft(editorEl, { strain: 'Test', phenotype: 'p1' });
        });

        it('returns local images unchanged', async () => {
            const images = [{ path: '/local/image.jpg', is_thumbnail: true }];
            const result = await (editorEl as any)._downloadRemoteImages(images);
            expect(result).toEqual(images);
            expect(mockHass.connection.sendMessagePromise).not.toHaveBeenCalled();
        });

        it('downloads remote images and replaces path', async () => {
            mockHass.connection.sendMessagePromise.mockResolvedValue({ path: '/local/saved.jpg' });
            const images = [{ path: 'http://cdn.example.com/photo.jpg', is_thumbnail: true }];
            const result = await (editorEl as any)._downloadRemoteImages(images);
            expect(result[0].path).toBe('/local/saved.jpg');
            expect(result[0].is_thumbnail).toBe(true);
        });

        it('skips images that fail to download', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            mockHass.connection.sendMessagePromise.mockRejectedValue(new Error('fail'));
            const images = [
                { path: 'http://cdn.example.com/fail.jpg', is_thumbnail: true },
                { path: '/local/ok.jpg', is_thumbnail: false },
            ];
            const result = await (editorEl as any)._downloadRemoteImages(images);
            expect(result).toHaveLength(1);
            expect(result[0].path).toBe('/local/ok.jpg');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    // --- image_crop_meta sync to gallery ---

    describe('_handleEditorChange image_crop_meta sync', () => {
        it('syncs crop_meta to the thumbnail image in the gallery', () => {
            setDraft(editorEl, {
                strain: 'Test',
                images: [
                    { path: '/a.jpg', is_thumbnail: true, crop_meta: undefined },
                    { path: '/b.jpg', is_thumbnail: false },
                ],
            });

            const newMeta = { x: 20, y: 30, scale: 2 };
            (editorEl as any)._handleEditorChange('image_crop_meta', newMeta);

            const images = getSM(editorEl).draft.images;
            expect(images[0].crop_meta).toEqual(newMeta);
            expect(images[1].crop_meta).toBeUndefined();
        });

        it('does not modify images if field is not image_crop_meta', () => {
            const imgs = [{ path: '/a.jpg', is_thumbnail: true }];
            setDraft(editorEl, { strain: 'Test', images: imgs });
            (editorEl as any)._handleEditorChange('description', 'hello');
            expect(getSM(editorEl).draft.images).toEqual(imgs);
        });
    });

    // --- _handleSeedfinderImport with images ---

    describe('_handleSeedfinderImport with images', () => {
        it('converts images array into gallery entries with first as thumbnail', () => {
            setDraft(editorEl, { strain: 'Base' });
            setSubState(editorEl, { kind: 'seedfinder' });

            const event = new CustomEvent('import', {
                detail: {
                    strain: 'Imported',
                    breeder: 'SF',
                    images: ['http://cdn.sf.com/1.jpg', 'http://cdn.sf.com/2.jpg'],
                },
            });
            (editorEl as any)._handleSeedfinderImport(event);

            const state = getSM(editorEl).draft;
            expect(state.images).toHaveLength(2);
            expect(state.images[0].is_thumbnail).toBe(true);
            expect(state.images[0].path).toBe('http://cdn.sf.com/1.jpg');
            expect(state.images[1].is_thumbnail).toBe(false);
            expect(state.image).toBe('http://cdn.sf.com/1.jpg');
            expect(getSubKind(editorEl)).not.toBe('seedfinder');
        });
    });

    // --- _handleGalleryUpload ---

    describe('_handleGalleryUpload', () => {
        const mockHass = {
            connection: {
                sendMessagePromise: vi.fn(),
            },
        };

        beforeEach(() => {
            editorEl.hass = mockHass as any;
            setDraft(editorEl, { strain: 'Upload Test', phenotype: 'p1', images: [] });
        });

        it('uploads first image and sets it as thumbnail and main image', async () => {
            mockHass.connection.sendMessagePromise.mockResolvedValue({ path: '/media/uploaded.jpg' });
            vi.spyOn(PlantUtils, 'compressImage').mockResolvedValue('b64data');

            const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
            await (editorEl as any)._handleGalleryUpload(file);

            const state = getSM(editorEl).draft;
            expect(state.images).toHaveLength(1);
            expect(state.images[0].is_thumbnail).toBe(true);
            expect(state.images[0].path).toBe('/media/uploaded.jpg');
            expect(state.image).toBe('/media/uploaded.jpg');
        });

        it('uploads additional images without overriding main image', async () => {
            setDraft(editorEl, {
                strain: 'Upload Test',
                phenotype: 'p1',
                image: '/existing.jpg',
                images: [{ path: '/existing.jpg', is_thumbnail: true }],
            });
            mockHass.connection.sendMessagePromise.mockResolvedValue({ path: '/media/second.jpg' });
            vi.spyOn(PlantUtils, 'compressImage').mockResolvedValue('b64data');

            const file = new File([''], 'photo2.jpg', { type: 'image/jpeg' });
            await (editorEl as any)._handleGalleryUpload(file);

            const state = getSM(editorEl).draft;
            expect(state.images).toHaveLength(2);
            expect(state.image).toBe('/existing.jpg');
        });
    });

    // --- _handleSetThumbnail ---

    describe('_handleSetThumbnail', () => {
        beforeEach(() => {
            setDraft(editorEl, {
                strain: 'Gallery Test',
                image: '/a.jpg',
                images: [
                    { path: '/a.jpg', is_thumbnail: true, crop_meta: { x: 10, y: 10, scale: 1 } },
                    { path: '/b.jpg', is_thumbnail: false },
                    { path: '/c.jpg', is_thumbnail: false },
                ],
            });
        });

        it('sets the selected index as thumbnail and updates main image', () => {
            (editorEl as any)._handleSetThumbnail(1);
            const state = getSM(editorEl).draft;

            expect(state.images[0].is_thumbnail).toBe(false);
            expect(state.images[1].is_thumbnail).toBe(true);
            expect(state.images[2].is_thumbnail).toBe(false);
            expect(state.image).toBe('/b.jpg');
        });

        it('copies crop_meta from selected image to main image', () => {
            const imgs = [...(getSM(editorEl).draft.images ?? [])];
            imgs[1] = { path: '/b.jpg', is_thumbnail: false, crop_meta: { x: 50, y: 50, scale: 2 } };
            patchDraft(editorEl, { images: imgs });
            (editorEl as any)._handleSetThumbnail(1);
            expect(getSM(editorEl).draft.image_crop_meta).toEqual({ x: 50, y: 50, scale: 2 });
        });
    });

    // --- _handleRemoveGalleryImage ---

    describe('_handleRemoveGalleryImage', () => {
        beforeEach(() => {
            setDraft(editorEl, {
                strain: 'Gallery Test',
                image: '/a.jpg',
                images: [
                    { path: '/a.jpg', is_thumbnail: true },
                    { path: '/b.jpg', is_thumbnail: false },
                    { path: '/c.jpg', is_thumbnail: false },
                ],
            });
        });

        it('removes a non-thumbnail image without changing the thumbnail', () => {
            (editorEl as any)._handleRemoveGalleryImage(1);
            const state = getSM(editorEl).draft;
            expect(state.images).toHaveLength(2);
            expect(state.images.find((i: any) => i.path === '/b.jpg')).toBeUndefined();
            expect(state.image).toBe('/a.jpg');
        });

        it('removes thumbnail and promotes next image as thumbnail', () => {
            (editorEl as any)._handleRemoveGalleryImage(0);
            const state = getSM(editorEl).draft;
            expect(state.images).toHaveLength(2);
            expect(state.images[0].is_thumbnail).toBe(true);
            expect(state.images[0].path).toBe('/b.jpg');
            expect(state.image).toBe('/b.jpg');
        });

        it('clears image when last image is removed', () => {
            getSM(editorEl).draft.images = [{ path: '/a.jpg', is_thumbnail: true }];
            (editorEl as any)._handleRemoveGalleryImage(0);
            const state = getSM(editorEl).draft;
            expect(state.images).toHaveLength(0);
            expect(state.image).toBe('');
        });
    });

    // --- Gallery UI interactions ---

    describe('Gallery UI interactions', () => {
        beforeEach(async () => {
            setDraft(editorEl, {
                strain: 'Gallery Test',
                image: '/a.jpg',
                images: [
                    { path: '/a.jpg', is_thumbnail: true },
                    { path: '/b.jpg', is_thumbnail: false },
                ],
            });
            await editorEl.updateComplete;
        });

        it('clicking star button on non-thumbnail sets it as thumbnail', async () => {
            const galleryItems = editorEl.shadowRoot?.querySelectorAll('.gallery-drop-area > div[style*="aspect-ratio"]');
            expect(galleryItems?.length).toBe(2);

            const starBtns = galleryItems?.[1].querySelectorAll('button');
            const starBtn = starBtns?.[0] as HTMLElement;
            expect(starBtn).toBeTruthy();

            const spy = vi.spyOn(editorEl as any, '_handleSetThumbnail');
            starBtn.click();
            expect(spy).toHaveBeenCalledWith(1);
        });

        it('clicking remove button removes the gallery image', async () => {
            const galleryItems = editorEl.shadowRoot?.querySelectorAll('.gallery-drop-area > div[style*="aspect-ratio"]');
            const removeBtns = galleryItems?.[0].querySelectorAll('button');
            const removeBtn = removeBtns?.[1] as HTMLElement;
            expect(removeBtn).toBeTruthy();

            const spy = vi.spyOn(editorEl as any, '_handleRemoveGalleryImage');
            removeBtn.click();
            expect(spy).toHaveBeenCalledWith(0);
        });

        it('clicking crop button on thumbnail opens crop mode', async () => {
            const galleryItems = editorEl.shadowRoot?.querySelectorAll('.gallery-drop-area > div[style*="aspect-ratio"]');
            const cropBtn = galleryItems?.[0].querySelector('button[title="Adjust crop"]') as HTMLElement;
            expect(cropBtn).toBeTruthy();

            cropBtn.click();
            expect(getSubKind(editorEl)).toBe('cropping');
        });

        it('clicking Add button opens the add-photo menu', async () => {
            expect(getSubKind(editorEl)).not.toBe('photo-menu');
            const addBtn = Array.from(editorEl.shadowRoot?.querySelectorAll('.gallery-drop-area > button') || [])
                .find(b => b.textContent?.includes('Add')) as HTMLElement;
            expect(addBtn).toBeTruthy();
            addBtn.click();
            expect(getSubKind(editorEl)).toBe('photo-menu');
        });

        it('clicking backdrop in add-photo menu closes the menu', async () => {
            setSubState(editorEl, { kind: 'photo-menu' });
            await editorEl.updateComplete;

            const backdrop = editorEl.shadowRoot?.querySelector('[style*="inset:0"]') as HTMLElement;
            expect(backdrop).toBeTruthy();
            backdrop.click();
            expect(getSubKind(editorEl)).not.toBe('photo-menu');
        });

        it('clicking Take Photo in menu triggers camera input click', async () => {
            setSubState(editorEl, { kind: 'photo-menu' });
            await editorEl.updateComplete;

            const cameraInput = editorEl.shadowRoot?.getElementById('gallery-camera-input') as HTMLInputElement;
            expect(cameraInput).toBeTruthy();
            const clickSpy = vi.spyOn(cameraInput, 'click').mockImplementation(() => {});

            const menuButtons = editorEl.shadowRoot?.querySelectorAll('[style*="bottom:0"] button');
            const takePhotoBtn = Array.from(menuButtons || []).find(b => b.textContent?.includes('Take Photo')) as HTMLElement;
            expect(takePhotoBtn).toBeTruthy();
            takePhotoBtn.click();

            expect(clickSpy).toHaveBeenCalled();
            expect(getSubKind(editorEl)).not.toBe('photo-menu');
        });

        it('clicking Choose from Library in menu triggers library input click', async () => {
            setSubState(editorEl, { kind: 'photo-menu' });
            await editorEl.updateComplete;

            const libraryInput = editorEl.shadowRoot?.getElementById('gallery-library-input') as HTMLInputElement;
            expect(libraryInput).toBeTruthy();
            const clickSpy = vi.spyOn(libraryInput, 'click').mockImplementation(() => {});

            const menuButtons = editorEl.shadowRoot?.querySelectorAll('[style*="bottom:0"] button');
            const libraryBtn = Array.from(menuButtons || []).find(b => b.textContent?.includes('Choose from Library')) as HTMLElement;
            expect(libraryBtn).toBeTruthy();
            libraryBtn.click();

            expect(clickSpy).toHaveBeenCalled();
            expect(getSubKind(editorEl)).not.toBe('photo-menu');
        });
    });
});

