import { fixture, html } from '@open-wc/testing-helpers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuickNoteInput } from '../../../../src/features/shared/ui/quick-note-input';
import '../../../../src/features/shared/ui/quick-note-input';
import { PlantUtils } from '../../../../src/utils/plant-utils';

describe('QuickNoteInput', () => {
    let element: QuickNoteInput;

    beforeEach(async () => {
        element = await fixture(html`<quick-note-input></quick-note-input>`);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should render with default placeholder', async () => {
        await element.updateComplete;
        const textarea = element.shadowRoot?.querySelector('textarea');
        expect(textarea).toBeTruthy();
        expect(textarea?.placeholder).toBe('Add a cultivation note...');
    });

    it('should render with custom placeholder', async () => {
        element = await fixture(html`<quick-note-input placeholder="Custom placeholder"></quick-note-input>`);
        await element.updateComplete;
        const textarea = element.shadowRoot?.querySelector('textarea');
        expect(textarea?.placeholder).toBe('Custom placeholder');
    });

    it('should allow text input', async () => {
        await element.updateComplete;
        const textarea = element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;

        textarea.value = 'Test note';
        textarea.dispatchEvent(new Event('input'));
        await element.updateComplete;

        expect((element as any)._text).toBe('Test note');
    });

    it('should enable submit button when text is entered', async () => {
        await element.updateComplete;
        const textarea = element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;

        textarea.value = 'Test note';
        textarea.dispatchEvent(new Event('input'));
        await element.updateComplete;

        const submitBtn = element.shadowRoot?.querySelector('.submit-btn') as HTMLButtonElement;
        expect(submitBtn.disabled).toBe(false);
    });

    it('should disable submit button when no text or images', async () => {
        await element.updateComplete;
        const submitBtn = element.shadowRoot?.querySelector('.submit-btn') as HTMLButtonElement;
        expect(submitBtn.disabled).toBe(true);
    });

    it('should add compressed images when camera-capture emits files', async () => {
        const compressSpy = vi
            .spyOn(PlantUtils, 'compressImage')
            .mockResolvedValue('data:image/jpeg;base64,compressed');
        const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

        await (element as any)._handleCapture(new CustomEvent('capture', { detail: { files: [file] } }));
        await element.updateComplete;

        // Keep the note's historical 1024px/0.8 sizing.
        expect(compressSpy).toHaveBeenCalledWith(file, 1024, 1024, 0.8);
        expect((element as any)._images).toEqual(['data:image/jpeg;base64,compressed']);
    });

    it('should process every captured file', async () => {
        const compressSpy = vi
            .spyOn(PlantUtils, 'compressImage')
            .mockResolvedValueOnce('data:img1')
            .mockResolvedValueOnce('data:img2');
        const files = [
            new File([''], 'a.jpg', { type: 'image/jpeg' }),
            new File([''], 'b.jpg', { type: 'image/jpeg' }),
        ];

        await (element as any)._handleCapture(new CustomEvent('capture', { detail: { files } }));
        await element.updateComplete;

        expect(compressSpy).toHaveBeenCalledTimes(2);
        expect((element as any)._images).toEqual(['data:img1', 'data:img2']);
    });

    it('should wire the capture event from camera-capture to _handleCapture', async () => {
        vi.spyOn(PlantUtils, 'compressImage').mockResolvedValue('data:wired');
        await element.updateComplete;

        const camera = element.shadowRoot?.querySelector('camera-capture');
        const file = new File([''], 'wired.jpg', { type: 'image/jpeg' });
        camera?.dispatchEvent(
            new CustomEvent('capture', { detail: { files: [file] }, bubbles: true, composed: true })
        );

        // _handleCapture is async; let the compression microtasks settle.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await element.updateComplete;

        expect((element as any)._images).toEqual(['data:wired']);
    });

    it('should handle capture with no files', async () => {
        const compressSpy = vi.spyOn(PlantUtils, 'compressImage');

        await (element as any)._handleCapture(new CustomEvent('capture', { detail: { files: [] } }));
        await element.updateComplete;

        expect(compressSpy).not.toHaveBeenCalled();
        expect((element as any)._images.length).toBe(0);
    });

    it('should log and skip an image when compression fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(PlantUtils, 'compressImage').mockRejectedValue(new Error('Compression failed'));
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

        await (element as any)._handleCapture(new CustomEvent('capture', { detail: { files: [file] } }));
        await element.updateComplete;

        expect(consoleSpy).toHaveBeenCalledWith('Error processing image:', expect.any(Error));
        expect((element as any)._images.length).toBe(0);
    });



    it('should remove image at index', async () => {
        (element as any)._images = ['img1', 'img2', 'img3'];
        await element.updateComplete;

        (element as any)._removeImage(1);
        await element.updateComplete;

        expect((element as any)._images).toEqual(['img1', 'img3']);
    });

    it('should dispatch submit event with text and images', async () => {
        (element as any)._text = 'Test note';
        (element as any)._images = ['img1'];
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('submit', eventSpy);

        await (element as any)._submit();

        expect(eventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    text: 'Test note',
                    images: ['img1']
                }
            })
        );
    });

    it('should not submit when text is empty and no images', async () => {
        (element as any)._text = '';
        (element as any)._images = [];
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('submit', eventSpy);

        await (element as any)._submit();

        expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should not submit when text is only whitespace', async () => {
        (element as any)._text = '   ';
        (element as any)._images = [];
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('submit', eventSpy);

        await (element as any)._submit();

        expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should trim text before submitting', async () => {
        (element as any)._text = '  Test note  ';
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('submit', eventSpy);

        await (element as any)._submit();

        expect(eventSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: expect.objectContaining({
                    text: 'Test note'
                })
            })
        );
    });

    it('should clear text and images when clear() is called', () => {
        (element as any)._text = 'Test';
        (element as any)._images = ['img1'];
        (element as any)._isSaving = true;

        element.clear();

        expect((element as any)._text).toBe('');
        expect((element as any)._images).toEqual([]);
        expect((element as any)._isSaving).toBe(false);
    });

    it('should set saving state when setSaving() is called', () => {
        element.setSaving(true);
        expect((element as any)._isSaving).toBe(true);

        element.setSaving(false);
        expect((element as any)._isSaving).toBe(false);
    });

    it('should disable inputs when saving', async () => {
        (element as any)._isSaving = true;
        await element.updateComplete;

        const textarea = element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
        const submitBtn = element.shadowRoot?.querySelector('.submit-btn') as HTMLButtonElement;

        expect(textarea.disabled).toBe(true);
        expect(submitBtn.disabled).toBe(true);
    });

    it('should disable inputs when disabled prop is true', async () => {
        element.disabled = true;
        await element.updateComplete;

        const textarea = element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
        const submitBtn = element.shadowRoot?.querySelector('.submit-btn') as HTMLButtonElement;

        expect(textarea.disabled).toBe(true);
        expect(submitBtn.disabled).toBe(true);
    });

    it('should hide camera button when allowImages is false', async () => {
        element.allowImages = false;
        await element.updateComplete;

        const cameraBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.getAttribute('aria-label') === 'Add image');

        expect(cameraBtn).toBeFalsy();
    });

    it('should show camera button when allowImages is true', async () => {
        element.allowImages = true;
        await element.updateComplete;

        const cameraBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.getAttribute('aria-label') === 'Add image');

        expect(cameraBtn).toBeTruthy();
    });

    it('should render image previews when images exist', async () => {
        (element as any)._images = ['data:image/jpeg;base64,img1', 'data:image/jpeg;base64,img2'];
        await element.updateComplete;

        const previews = element.shadowRoot?.querySelectorAll('.preview-item');
        expect(previews?.length).toBe(2);
    });

    it('should not render image previews when no images', async () => {
        (element as any)._images = [];
        await element.updateComplete;

        const previewsContainer = element.shadowRoot?.querySelector('.image-previews');
        expect(previewsContainer).toBeFalsy();
    });

    it('should open the camera-capture menu when the add-image button is clicked', async () => {
        await element.updateComplete;

        const camera = element.shadowRoot?.querySelector('camera-capture');
        const openSpy = vi.spyOn(camera as any, 'open');

        const cameraBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.getAttribute('aria-label') === 'Add image') as HTMLButtonElement;

        cameraBtn.click();

        expect(openSpy).toHaveBeenCalled();
    });

    it('should disable remove button when saving', async () => {
        (element as any)._images = ['img1'];
        (element as any)._isSaving = true;
        await element.updateComplete;

        const removeBtn = element.shadowRoot?.querySelector('.remove-img') as HTMLButtonElement;
        expect(removeBtn.disabled).toBe(true);
    });

    it('should handle remove image button click', async () => {
        (element as any)._images = ['img1', 'img2'];
        await element.updateComplete;

        const removeBtn = element.shadowRoot?.querySelector('.remove-img') as HTMLButtonElement;
        removeBtn.click();
        await element.updateComplete;

        expect((element as any)._images).toEqual(['img2']);
    });

    it('should set saving state when submitting', async () => {
        (element as any)._text = 'Test';
        await element.updateComplete;

        await (element as any)._submit();

        expect((element as any)._isSaving).toBe(true);
    });

    it('should handle submit button click', async () => {
        (element as any)._text = 'Test note';
        await element.updateComplete;

        const eventSpy = vi.fn();
        element.addEventListener('submit', eventSpy);

        const submitBtn = element.shadowRoot?.querySelector('.submit-btn') as HTMLButtonElement;
        submitBtn.click();

        await new Promise(r => setTimeout(r, 0));

        expect(eventSpy).toHaveBeenCalled();
    });
});
