import { fixture, html } from '@open-wc/testing-helpers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuickNoteInput } from '../../../../src/components/ui/quick-note-input';
import '../../../../src/components/ui/quick-note-input';

describe('QuickNoteInput', () => {
    let element: QuickNoteInput;
    const originalCreateElement = document.createElement.bind(document);

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

    it('should handle file selection', async () => {
        const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

        // Mock FileReader
        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        // Mock Image
        const mockImage = { onload: null as any, width: 500, height: 400 };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        // Mock Canvas
        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockContext),
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,resized')
        };
        vi.spyOn(document, 'createElement').mockImplementation((t, o) =>
            t === 'canvas' ? mockCanvas as any : originalCreateElement(t, o)
        );

        await element.updateComplete;

        const fileInput = element.shadowRoot?.getElementById('fileInput') as HTMLInputElement;
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            configurable: true
        });

        const handlePromise = (element as any)._handleFileSelect({ target: fileInput });

        // Trigger FileReader onload
        if (mockReader.onload) mockReader.onload({ target: { result: 'data:image/jpeg;base64,original' } });

        // Trigger Image onload
        if (mockImage.onload) mockImage.onload();

        await handlePromise;
        await element.updateComplete;

        expect((element as any)._images.length).toBe(1);
    });

    it('should resize wide images', async () => {
        const mockFile = new File([''], 'wide.jpg');
        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any, width: 2000, height: 1000 };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockContext),
            toDataURL: vi.fn(() => 'data:resized')
        };
        vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
            if (tagName === 'canvas') return mockCanvas as any;
            return originalCreateElement(tagName, options);
        });

        const resizePromise = (element as any)._resizeImage(mockFile);
        if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
        if (mockImage.onload) mockImage.onload();

        await resizePromise;

        expect(mockCanvas.width).toBe(1024); // MAX_WIDTH
        expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it('should resize tall images', async () => {
        const mockFile = new File([''], 'tall.jpg');
        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any, width: 1000, height: 2000 };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockContext),
            toDataURL: vi.fn(() => 'data:resized')
        };
        vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
            if (tagName === 'canvas') return mockCanvas as any;
            return originalCreateElement(tagName, options);
        });

        const resizePromise = (element as any)._resizeImage(mockFile);
        if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
        if (mockImage.onload) mockImage.onload();

        await resizePromise;

        expect(mockCanvas.height).toBe(1024); // MAX_HEIGHT
    });

    it('should handle canvas context error', async () => {
        const mockFile = new File([''], 'test.jpg');
        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const mockCanvas = { getContext: vi.fn(() => null) };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        const resizePromise = (element as any)._resizeImage(mockFile);
        if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
        if (mockImage.onload) mockImage.onload();

        await expect(resizePromise).rejects.toThrow('Could not get canvas context');
    });

    it('should handle FileReader error', async () => {
        const mockFile = new File([''], 'test.jpg');
        const mockReader = { readAsDataURL: vi.fn(), onerror: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const resizePromise = (element as any)._resizeImage(mockFile);
        if (mockReader.onerror) mockReader.onerror(new Error('Read failed'));

        await expect(resizePromise).rejects.toThrow('Read failed');
    });

    it('should handle Image load error', async () => {
        const mockFile = new File([''], 'test.jpg');
        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any, onerror: null as any };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const resizePromise = (element as any)._resizeImage(mockFile);
        if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
        if (mockImage.onerror) mockImage.onerror(new Error('Image load failed'));

        await expect(resizePromise).rejects.toThrow('Image load failed');
    });

    it('should handle file select with no files', async () => {
        await element.updateComplete;
        const fileInput = element.shadowRoot?.getElementById('fileInput') as HTMLInputElement;

        await (element as any)._handleFileSelect({ target: { files: null } });
        await element.updateComplete;

        expect((element as any)._images.length).toBe(0);
    });

    it('should handle error during file processing', async () => {
        const mockFile = new File([''], 'test.jpg');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Mock to throw error
        vi.spyOn(element as any, '_resizeImage').mockRejectedValue(new Error('Resize failed'));

        await element.updateComplete;
        const fileInput = element.shadowRoot?.getElementById('fileInput') as HTMLInputElement;
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            configurable: true
        });

        await (element as any)._handleFileSelect({ target: fileInput });

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

    it('should trigger file input click when camera button is clicked', async () => {
        await element.updateComplete;

        const fileInput = element.shadowRoot?.getElementById('fileInput') as HTMLInputElement;
        const clickSpy = vi.spyOn(fileInput, 'click');

        const cameraBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || [])
            .find(b => b.getAttribute('aria-label') === 'Add image') as HTMLButtonElement;

        cameraBtn.click();

        expect(clickSpy).toHaveBeenCalled();
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
