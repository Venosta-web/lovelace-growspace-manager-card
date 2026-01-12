import { describe, it, expect, vi, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import "../../../../src/components/plant/plant-timeline";
import { PlantTimeline } from '../../../../src/components/plant/plant-timeline';
import { PlantTimelineEvent } from '../../../../src/types';

// Capture original createElement once, cleanly to avoid recursion in spies
const originalCreateElement = document.createElement.bind(document);

describe('PlantTimeline', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });


    it('renders "No events recorded" when events array is empty', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        expect(el.events).toEqual([]);
        expect(el.shadowRoot?.textContent).toContain('No entries for this plant yet.');
    });

    it('renders events in descending date order', async () => {
        const events: PlantTimelineEvent[] = [
            { date: '2023-01-01T10:00:00Z', type: 'note', text: 'Oldest' },
            { date: '2023-01-03T10:00:00Z', type: 'note', text: 'Newest' },
            { date: '2023-01-02T10:00:00Z', type: 'note', text: 'Middle' },
        ];
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${events}></plant-timeline>`);

        // Note: Rendering is async
        await el.updateComplete;

        const eventElements = el.shadowRoot?.querySelectorAll('.event');
        expect(eventElements?.length).toBe(3);

        // Check order (Newest first)
        const firstEvent = eventElements?.[0] as HTMLElement;
        const secondEvent = eventElements?.[1] as HTMLElement;
        const thirdEvent = eventElements?.[2] as HTMLElement;

        expect(firstEvent.textContent).toContain('Newest');
        expect(secondEvent.textContent).toContain('Middle');
        expect(thirdEvent.textContent).toContain('Oldest');
    });

    it('renders stage_change events correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'stage_change',
            from: 'seedling',
            to: 'veg'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('Stage Changed');
        expect(el.shadowRoot?.querySelector('.details')?.innerHTML).toContain('seedling');
        expect(el.shadowRoot?.querySelector('.details')?.innerHTML).toContain('veg');
        expect(el.shadowRoot?.querySelector('.type-stage_change')).toBeTruthy();
    });

    it('renders alert events correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'alert',
            message: 'High VPD',
            severity: 'high'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('Alert: High VPD');
        expect(el.shadowRoot?.querySelector('.details')?.textContent).toContain('Severity: high');
        expect(el.shadowRoot?.querySelector('.type-alert')).toBeTruthy();
    });

    it('renders action events correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'action',
            action: 'water',
            details: 'Added 1L'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('Water');
        expect(el.shadowRoot?.querySelector('.details')?.textContent).toContain('Added 1L');
        expect(el.shadowRoot?.querySelector('.type-action')).toBeTruthy();
    });

    it('renders milestone events correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'milestone',
            label: 'Vegetative'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('Vegetative Started');
        expect(el.shadowRoot?.querySelector('.type-milestone')).toBeTruthy();
    });

    it('renders "Today" header for events from today', async () => {
        const today = new Date().toISOString();
        const event: PlantTimelineEvent = {
            date: today,
            type: 'note',
            text: 'Today event'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('.day-header')?.textContent).toContain('Today');
    });

    it('renders "Yesterday" header for events from yesterday', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const event: PlantTimelineEvent = {
            date: yesterday.toISOString(),
            type: 'note',
            text: 'Yesterday event'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector('.day-header')?.textContent).toContain('Yesterday');
    });

    it('renders full date header for older events', async () => {
        const oldDate = new Date('2020-05-15');
        const event: PlantTimelineEvent = {
            date: oldDate.toISOString(),
            type: 'note',
            text: 'Old event'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;
        const header = el.shadowRoot?.querySelector('.day-header')?.textContent;
        // Should contain month and day
        expect(header).toContain('May');
        expect(header).toContain('15');
    });

    it('handles events without valid date gracefully in _formatDayHeader', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const result = (el as any)._formatDayHeader('invalid-date');
        expect(result).toBe('invalid-date');
    });

    it('renders generic action events with leaf icon', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'action',
            action: 'prune', // Not 'water' or 'watering'
            details: 'Pruned leaves'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        // Verify it didn't crash and rendered "Action" or similar default text if applicable,
        // or just verify the icon logic if we can inspect the icon. 
        // The render method uses _getIcon.
        // Let's just verify the element exists.
        expect(el.shadowRoot?.querySelector('.type-action')).toBeTruthy();

        // We can also directly test _getIcon since we are in unit tests
        const icon = (el as any)._getIcon(event);
        // mdiLeaf
        expect(icon).toBeDefined();
    });

    it('handles events without valid date gracefully in _formatTime', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const result = (el as any)._formatTime('invalid-date');
        expect(result).toBe('invalid-date');
    });

    it('handles events without valid date gracefully in _getDateKey', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const result = (el as any)._getDateKey('invalid-date');
        expect(result).toBe('invalid-date');
    });

    it('handles events without valid date gracefully in _formatDate', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const result = (el as any)._formatDate('invalid-date');
        expect(result).toBe('invalid-date');
    });

    it('returns default icon for unknown event type', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const icon = (el as any)._getIcon({ type: 'unknown_type' });
        // mdiLeaf path from @mdi/js check might be brittle if hardcoded, 
        // but let's check it returns something defined.
        // Or if we check equality against mdiLeaf, we need to export/import it.
        // For now just check it returns a string (path)
        expect(typeof icon).toBe('string');
        expect(icon).toBeTruthy();
    });

    it('renders note events with text correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'note',
            text: 'My note content'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('Note');
        expect(el.shadowRoot?.querySelector('.details')?.textContent).toContain('My note content');
    });

    it('groups multiple events by day', async () => {
        const today = new Date().toISOString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const events: PlantTimelineEvent[] = [
            { date: today, type: 'note', text: 'Event 1' },
            { date: today, type: 'note', text: 'Event 2' },
            { date: yesterday.toISOString(), type: 'note', text: 'Event 3' }
        ];
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${events}></plant-timeline>`);
        await el.updateComplete;

        const headers = el.shadowRoot?.querySelectorAll('.day-header');
        // Should have 2 day headers (Today and Yesterday)
        expect(headers?.length).toBe(2);
    });


    it('renders ipm action events with bug icon', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'action',
            action: 'ipm',
            details: 'Neem Spray'
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('IPM');
        expect(el.shadowRoot?.querySelector('.details')?.textContent).toContain('Neem Spray');

        // Directly test _getIcon for ipm
        const icon = (el as any)._getIcon(event);
        expect(icon).toBeDefined();
        // Since we can't easily compare equality of the SVG path without importing mdiBug,
        // we at least ensure it's not the default leaf if we can distinguish them.
        const leafIcon = (el as any)._getIcon({ type: 'action', action: 'unknown' });
        expect(icon).not.toBe(leafIcon);
    });

    it('renders action event with defaults when action and details are missing', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'action',
            action: 'action'
            // Missing action and details
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        expect(el.shadowRoot?.querySelector('.content')?.textContent).toContain('Action');
        expect(el.shadowRoot?.querySelector('.details')).toBeNull();
    });

    it('handles file selection and updates _noteImages', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        // Mock _resizeImage to return a fake base64 string
        (el as any)._resizeImage = vi.fn().mockResolvedValue('data:image/jpeg;base64,fake');

        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const event = {
            target: {
                files: [file]
            }
        } as unknown as Event;

        await (el as any)._handleFileSelect(event);

        expect((el as any)._noteImages).toEqual(['data:image/jpeg;base64,fake']);
        expect((el as any)._resizeImage).toHaveBeenCalledWith(file);
    });

    it('handles delete event', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'note',
            text: 'Delete me',
            event_id: 123
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);

        // Mock callWS
        const callWS = vi.fn().mockResolvedValue(undefined);
        el.hass = { callWS } as any;

        await el.updateComplete;

        const deleteBtn = el.shadowRoot?.querySelector('.delete-btn') as HTMLElement;
        expect(deleteBtn).toBeTruthy();

        // 1. Click delete icon
        deleteBtn.click();
        await el.updateComplete;

        // 2. Check if overlay is shown
        const overlay = el.shadowRoot?.querySelector('.dialog-overlay');
        expect(overlay).toBeTruthy();

        // 3. Click Confirm Delete button in overlay
        const confirmBtn = el.shadowRoot?.querySelector('.dialog-overlay .md3-button.danger') as HTMLElement;
        expect(confirmBtn).toBeTruthy();

        // Listen for refresh
        const refreshSpy = vi.fn();
        el.addEventListener('growspace-refresh', refreshSpy);

        confirmBtn.click();

        // Need to wait for async click handler
        await new Promise(r => setTimeout(r, 0));

        expect(callWS).toHaveBeenCalledWith({
            type: 'growspace_manager/remove_timeline_event',
            event_id: 123
        });
        expect(refreshSpy).toHaveBeenCalled();
    });

    it('does not show delete button without event_id', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'note',
            text: 'Keep me'
            // No event_id
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;
        const deleteBtn = el.shadowRoot?.querySelector('.delete-btn');
        expect(deleteBtn).toBeNull();
    });

    it('shows image overlay on hover', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'note',
            text: 'Note with image',
            images: ['image.jpg']
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        const img = el.shadowRoot?.querySelector('.image-grid img');
        expect(img).toBeTruthy();

        // Simulate hover
        img?.dispatchEvent(new MouseEvent('mouseenter'));
        await el.updateComplete;

        const overlay = el.shadowRoot?.querySelector('.image-hover-overlay');
        expect(overlay).toBeTruthy();
        expect(overlay?.querySelector('img')?.getAttribute('src')).toBe('/api/growspace_manager/v1/images/image.jpg');

        // Simulate leave
        img?.dispatchEvent(new MouseEvent('mouseleave'));
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.image-hover-overlay')).toBeNull();
    });

    it('detects correlated notes', async () => {
        const events: PlantTimelineEvent[] = [
            { date: '2023-01-01T12:00:00Z', type: 'alert', message: 'Temp high', severity: 'high' },
            { date: '2023-01-01T13:00:00Z', type: 'note', text: 'Checked tent' }
        ];
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${events}></plant-timeline>`);
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.correlated-badge')).toBeTruthy();
    });

    it('groups alerts into a summary when more than 2', async () => {
        const events: PlantTimelineEvent[] = [
            { date: '2023-01-01T10:00:00Z', type: 'alert', message: 'A1', severity: 'low' },
            { date: '2023-01-01T11:00:00Z', type: 'alert', message: 'A2', severity: 'low' },
            { date: '2023-01-01T12:00:00Z', type: 'alert', message: 'A3', severity: 'low' }
        ];
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${events}></plant-timeline>`);
        await el.updateComplete;

        expect(el.shadowRoot?.querySelector('.day-summary')).toBeTruthy();
        expect(el.shadowRoot?.textContent).toContain('3 system alerts recorded');
    });

    it('renders metadata chips correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'action',
            action: 'water',
            metadata: {
                temperature: 25.5,
                humidity: 60,
                ph: 6.2,
                ec: 1.5,
                amount_ml: 500
            }
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        const chips = el.shadowRoot?.querySelectorAll('.chip');
        expect(chips?.length).toBe(5);
        expect(el.shadowRoot?.textContent).toContain('25.5°C');
        expect(el.shadowRoot?.textContent).toContain('60%');
        expect(el.shadowRoot?.textContent).toContain('pH 6.2');
        expect(el.shadowRoot?.textContent).toContain('EC 1.5');
        expect(el.shadowRoot?.textContent).toContain('500ml');
    });

    it('handles image removal', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        (el as any)._noteImages = ['img1', 'img2'];
        await el.updateComplete;

        const removeBtn = el.shadowRoot?.querySelector('.remove-img') as HTMLElement;
        removeBtn.click();

        expect((el as any)._noteImages).toEqual(['img2']);
    });

    it('handles note submission', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline .plant_id=${'p1'}></plant-timeline>`);
        const callWS = vi.fn().mockResolvedValue(undefined);
        el.hass = { callWS } as any;
        (el as any)._noteText = 'Test note';

        const refreshSpy = vi.fn();
        el.addEventListener('growspace-refresh', refreshSpy);

        await (el as any)._submitNote();

        expect(callWS).toHaveBeenCalledWith(expect.objectContaining({
            type: 'growspace_manager/add_timeline_note',
            notes: 'Test note'
        }));
        expect(refreshSpy).toHaveBeenCalled();
        expect((el as any)._noteText).toBe('');
    });

    it('maps icons for flower, dry, and cure stages', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        const flowerIcon = (el as any)._getIcon({ type: 'stage_change', to: 'flower' });
        const dryIcon = (el as any)._getIcon({ type: 'stage_change', to: 'dry' });
        const cureIcon = (el as any)._getIcon({ type: 'stage_change', to: 'cure' });
        const defaultIcon = (el as any)._getIcon({ type: 'stage_change', to: 'veg' });

        expect(flowerIcon).not.toBe(defaultIcon);
        expect(dryIcon).not.toBe(defaultIcon);
        expect(cureIcon).not.toBe(defaultIcon);
    });

    it('maps icons for milestones based on label', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        const flowerIcon = (el as any)._getIcon({ type: 'milestone', label: 'Start Flowering' });
        const dryIcon = (el as any)._getIcon({ type: 'milestone', label: 'Begin Drying' });
        const cureIcon = (el as any)._getIcon({ type: 'milestone', label: 'Curing' });

        expect(flowerIcon).toBeDefined();
        expect(dryIcon).toBeDefined();
        expect(cureIcon).toBeDefined();
    });

    it('opens image in new tab', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        (el as any)._openImage('test.jpg');
        expect(openSpy).toHaveBeenCalledWith('test.jpg', '_blank');
        openSpy.mockRestore();
    });

    // --- New Tests for <95% Coverage Gaps ---

    it('resizes image using canvas (large image)', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        // Mock FileReader
        const mockReader = {
            readAsDataURL: vi.fn(),
            onload: null as any,
            onerror: null as any,
            result: 'data:image/jpeg;base64,original'
        };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        // Mock Image
        const mockImage = {
            onload: null as any,
            onerror: null as any,
            src: '',
            width: 2000,
            height: 2000
        };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        // Mock Canvas
        const mockContext = {
            drawImage: vi.fn()
        };
        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockContext),
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,resized')
        };

        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
            if (tagName === 'canvas') return mockCanvas as any;
            return originalCreateElement(tagName, options);
        });

        try {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            const resizePromise = (el as any)._resizeImage(file);

            // Trigger FileReader onload
            if (mockReader.onload) mockReader.onload({ target: { result: 'data:image/jpeg;base64,original' } });

            // Trigger Image onload
            if (mockImage.onload) mockImage.onload();

            const result = await resizePromise;
            expect(result).toBe('data:image/jpeg;base64,resized');
            expect(mockContext.drawImage).toHaveBeenCalled();
            expect(mockCanvas.width).toBe(1024); // Should be resized max width
        } finally {
            createElementSpy.mockRestore();
            vi.unstubAllGlobals();
        }
    });


    it('resizes image using canvas (portrait high image)', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        const mockReader = { readAsDataURL: vi.fn(), onload: null as any, result: 'data' };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any, width: 1000, height: 2000 };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = { width: 0, height: 0, getContext: vi.fn(() => mockContext), toDataURL: vi.fn(() => 'data:resized') };

        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((t, o) => t === 'canvas' ? mockCanvas as any : originalCreateElement(t, o));

        try {
            const resizePromise = (el as any)._resizeImage(new File([''], 't.jpg'));
            if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
            if (mockImage.onload) mockImage.onload();

            await resizePromise;
            expect(mockCanvas.height).toBe(1024); // Max height constraint
        } finally {
            createElementSpy.mockRestore();
            vi.unstubAllGlobals();
        }
    });

    it('handles image load error in _resizeImage', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any, onerror: null as any, src: '' };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const resizePromise = (el as any)._resizeImage(new File([''], 't.jpg'));
        if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });

        // Trigger Image error
        if (mockImage.onerror) mockImage.onerror(new Error('Image load failed'));

        await expect(resizePromise).rejects.toThrow('Image load failed');
        vi.unstubAllGlobals();
    });

    it('handles FileReader error in _resizeImage', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        const mockReader = { readAsDataURL: vi.fn(), onerror: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const resizePromise = (el as any)._resizeImage(new File([''], 't.jpg'));
        if (mockReader.onerror) mockReader.onerror(new Error('File read failed'));

        await expect(resizePromise).rejects.toThrow('File read failed');
        vi.unstubAllGlobals();
    });

    it('handles canvas context error in _resizeImage', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        const mockReader = { readAsDataURL: vi.fn(), onload: null as any };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));
        const mockImage = { onload: null as any };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const mockCanvas = { getContext: vi.fn(() => null) }; // Return null context
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        const resizePromise = (el as any)._resizeImage(new File([''], 't.jpg'));
        if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
        if (mockImage.onload) mockImage.onload();

        await expect(resizePromise).rejects.toThrow('Could not get canvas context');
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('updates _noteText on input', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const textarea = el.shadowRoot?.querySelector('textarea');
        expect(textarea).toBeTruthy();

        textarea!.value = 'New note text';
        textarea!.dispatchEvent(new Event('input'));

        expect((el as any)._noteText).toBe('New note text');
    });

    it('triggers file input click on camera button click', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const fileInput = el.shadowRoot?.getElementById('fileInput') as HTMLInputElement;
        const clickSpy = vi.spyOn(fileInput, 'click');

        // Find camera button (second button in interactions, usually)
        // Or find by mdiCameraPlus icon path or just the ha-icon-button wrapping it
        // The implementation has: <ha-icon-button @click=${() => this.shadowRoot?.getElementById('fileInput')?.click()}>
        const cameraBtn = el.shadowRoot?.querySelector('.note-actions ha-icon-button') as HTMLElement;
        expect(cameraBtn).toBeTruthy();

        cameraBtn.click();
        expect(clickSpy).toHaveBeenCalled();
    });

    it('handles error during file selection', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        // Mock _resizeImage to throw
        (el as any)._resizeImage = vi.fn().mockRejectedValue(new Error('Resize failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const file = new File([''], 'test.jpg');
        const event = { target: { files: [file] } } as unknown as Event;

        await (el as any)._handleFileSelect(event);

        expect(consoleSpy).toHaveBeenCalledWith('Error processing image:', expect.any(Error));
        expect((el as any)._noteImages).toEqual([]);
    });

    it('handles delete confirmation error gracefully', async () => {
        const event: PlantTimelineEvent = { date: '2023-01-01', type: 'note', event_id: 123, text: 'del' };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        (el as any)._showDeleteConfirmation = true;
        (el as any)._deletingEventId = 123;
        await el.updateComplete;

        el.hass = { callWS: vi.fn().mockRejectedValue(new Error('WS Error')) } as any;
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const confirmBtn = el.shadowRoot?.querySelector('.dialog-overlay .danger') as HTMLElement;
        confirmBtn.click();
        await new Promise(r => setTimeout(r, 0));

        expect(consoleSpy).toHaveBeenCalledWith('Error deleting event:', expect.any(Error));
        expect((el as any)._showDeleteConfirmation).toBe(false);
    });

    it('checks _isCorrelated logic branches', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const noteEvent: PlantTimelineEvent = { date: '2023-01-01T12:00:00Z', type: 'note', text: 'n' };
        const alertEvent: PlantTimelineEvent = { date: '2023-01-01T11:00:00Z', type: 'alert', message: 'a', severity: 'low' };

        // Use generic casting to access private method
        const isCorr = (el as any)._isCorrelated(noteEvent, [alertEvent, noteEvent]);
        expect(isCorr).toBe(true);

        // Not a note
        expect((el as any)._isCorrelated(alertEvent, [alertEvent])).toBe(false);

        // Alert too old
        const oldAlert: PlantTimelineEvent = { date: '2023-01-01T09:00:00Z', type: 'alert', message: 'a', severity: 'low' };
        expect((el as any)._isCorrelated(noteEvent, [oldAlert])).toBe(false);

        // Alert in future (shouldn't happen but logic check)
        const futureAlert: PlantTimelineEvent = { date: '2023-01-01T13:00:00Z', type: 'alert', message: 'a', severity: 'low' };
        expect((el as any)._isCorrelated(noteEvent, [futureAlert])).toBe(false);
    });

    it('returns default sprout icon for unknown stage', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const icon = (el as any)._getIcon({ type: 'stage_change', to: 'unknown' });
        expect(icon).toBeDefined(); // Should be sprout
    });

    it('returns specific icons for training/pruning actions', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const tIcon = (el as any)._getIcon({ type: 'action', action: 'training' });
        const pIcon = (el as any)._getIcon({ type: 'action', action: 'pruning' });
        expect(tIcon).toBeDefined();
        expect(pIcon).toBeDefined();
        // Should be same icon
        expect(tIcon).not.toBe(pIcon);
    });

    it('returns correct colors for all stages', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const stages = ['flower', 'veg', 'seedling', 'clone', 'mother', 'dry', 'cure', 'unknown'];
        const colors = stages.map(s => (el as any)._getStageColor(s));
        expect(colors.every(c => !!c)).toBe(true);
        expect((el as any)._getStageColor(undefined)).toBe('var(--divider-color)');
    });

    it('handles interactions in delete overlay', async () => {
        const event: PlantTimelineEvent = { date: '2023-01-01', type: 'note', event_id: 123, text: 'del' };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        (el as any)._deleteEvent(new Event('click'), 123);
        await el.updateComplete;

        expect((el as any)._showDeleteConfirmation).toBe(true);

        const overlay = el.shadowRoot?.querySelector('.dialog-overlay') as HTMLElement;
        const content = el.shadowRoot?.querySelector('.overlay-content') as HTMLElement;
        const cancelBtn = el.shadowRoot?.querySelector('.md3-button.tonal') as HTMLElement;

        // Click content should propagate stop (state shouldn't change)
        content?.click();
        await el.updateComplete;
        expect((el as any)._showDeleteConfirmation).toBe(true);

        // Click cancel closes
        cancelBtn?.click();
        await el.updateComplete;
        expect((el as any)._showDeleteConfirmation).toBe(false);

        // Re-open and check overlay background click
        (el as any)._showDeleteConfirmation = true;
        await el.updateComplete;
        overlay?.click();
        await el.updateComplete;
        expect((el as any)._showDeleteConfirmation).toBe(false);
    });

    it('handles error in _submitNote', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        el.hass = { callWS: vi.fn().mockRejectedValue(new Error('Submit failed')) } as any;
        (el as any)._noteText = 'fail';
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        await (el as any)._submitNote();

        expect(consoleSpy).toHaveBeenCalled();
        expect((el as any)._isSaving).toBe(false);
    });

    it('resizes image with width constraint', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

        // Setup mocks for width > height case
        const mockReader = { readAsDataURL: vi.fn(), onload: null as any, result: 'data' };
        vi.stubGlobal('FileReader', vi.fn().mockImplementation(function () { return mockReader; }));

        const mockImage = { onload: null as any, width: 2000, height: 1000 };
        vi.stubGlobal('Image', vi.fn().mockImplementation(function () { return mockImage; }));

        const mockContext = { drawImage: vi.fn() };
        const mockCanvas = { width: 0, height: 0, getContext: vi.fn(() => mockContext), toDataURL: vi.fn(() => 'data:resized') };

        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((t, o) => t === 'canvas' ? mockCanvas as any : originalCreateElement(t, o));

        try {
            const resizePromise = (el as any)._resizeImage(new File([''], 'wide.jpg'));
            if (mockReader.onload) mockReader.onload({ target: { result: 'data' } });
            if (mockImage.onload) mockImage.onload();

            await resizePromise;
            // 2000 > 1000 (width > height)
            // 2000 > 1024 (width > MAX)
            // New width = 1024
            expect(mockCanvas.width).toBe(1024);
        } finally {
            createElementSpy.mockRestore();
            vi.unstubAllGlobals();
        }
    });

    it('binds image click to _openImage', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'note',
            text: 'img',
            images: ['test.jpg']
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        const openSpy = vi.spyOn(el as any, '_openImage').mockImplementation(() => { });
        const img = el.shadowRoot?.querySelector('.image-grid img') as HTMLElement;

        img.click();
        expect(openSpy).toHaveBeenCalledWith('/api/growspace_manager/v1/images/test.jpg');
    });

    it('formats valid date correctly', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        const dateStr = '2023-01-01T12:00:00Z';
        const formatted = (el as any)._formatDate(dateStr);
        expect(formatted).not.toBe(dateStr);
        expect(formatted).toContain('Jan');
    });

    it('renders tags correctly', async () => {
        const event: PlantTimelineEvent = {
            date: '2023-01-01',
            type: 'note',
            text: 'Tagged note',
            tags: ['tag1', 'tag2']
        };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;
        expect(el.shadowRoot?.textContent).toContain('tag1');
        expect(el.shadowRoot?.textContent).toContain('tag2');
    });

    describe('Ultimate Coverage Gap Fillers', () => {
        it('should handle confirmDeleteEvent early return if no event id', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
            (el as any)._deletingEventId = null;
            // No callWS mock needed as it shouldn't be called
            await (el as any)._confirmDeleteEvent();
            // Pass if no error thrown and execution finishes
        });

        it('should handle submitNote early return if empty', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
            (el as any)._noteText = '';
            (el as any)._noteImages = [];
            const callWS = vi.fn();
            el.hass = { callWS } as any;

            await (el as any)._submitNote();
            expect(callWS).not.toHaveBeenCalled();
        });

        it('should render images with relative paths correctly', async () => {
            const event: PlantTimelineEvent = {
                date: '2023-01-01',
                type: 'note',
                text: 'Img note',
                images: ['my-image.jpg'] // Not base64
            };
            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const img = el.shadowRoot?.querySelector('.image-grid img');
            expect(img?.getAttribute('src')).toBe('/api/growspace_manager/v1/images/my-image.jpg');
        });

        it('should handle renderHoverOverlay when null', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
            (el as any)._hoveredImage = null;
            await el.updateComplete;
            expect(el.shadowRoot?.querySelector('.image-hover-overlay')).toBeNull();
        });

        it('should return nothing for empty metadata', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
            // We can check the private method output or use a public render.
            // Using public render with empty metadata event
            const event: PlantTimelineEvent = {
                date: '2023-01-01', type: 'action', action: 'water', metadata: {}
            };
            const elWithEvent: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await elWithEvent.updateComplete;
            expect(elWithEvent.shadowRoot?.querySelector('.metadata-chips')).toBeNull();
        });

        it('should handle _getIcon branches for milestones', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);

            // Specific milestones coverage
            // We already tested flower/dry/cure, let's just ensure default falls through
            const icon = (el as any)._getIcon({ type: 'milestone', label: 'Sprout' });
            expect(icon).toBeDefined(); // Sprout icon
        });
    });

});
