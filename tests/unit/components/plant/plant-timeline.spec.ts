import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import "../../../../src/components/plant/plant-timeline";
import { PlantTimeline } from '../../../../src/components/plant/plant-timeline';
import { PlantTimelineEvent } from '../../../../src/types';
import { HomeAssistant } from 'custom-card-helpers';

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

        // Click delete icon - this should trigger the confirm-delete-dialog
        deleteBtn.click();
        await el.updateComplete;

        // Check if confirm-delete-dialog is shown
        const dialog = el.shadowRoot?.querySelector('confirm-delete-dialog');
        expect(dialog).toBeTruthy();
        expect(dialog?.hasAttribute('open') || (dialog as any)?.open).toBeTruthy();

        // Listen for refresh
        const refreshSpy = vi.fn();
        el.addEventListener('growspace-refresh', refreshSpy);

        // Simulate confirmation by firing @confirm event
        dialog?.dispatchEvent(new CustomEvent('confirm'));

        // Wait for async handler
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

    it('handles delete confirmation error gracefully', async () => {
        const event: PlantTimelineEvent = { date: '2023-01-01', type: 'note', event_id: 123, text: 'del' };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        el.hass = { callWS: vi.fn().mockRejectedValue(new Error('WS Error')) as any } as unknown as HomeAssistant;
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Click delete icon
        const deleteBtn = el.shadowRoot?.querySelector('.delete-btn') as HTMLElement;
        deleteBtn?.click();
        await el.updateComplete;

        // Get confirm-delete-dialog and trigger confirm event
        const dialog = el.shadowRoot?.querySelector('confirm-delete-dialog');
        dialog?.dispatchEvent(new CustomEvent('confirm'));
        await new Promise(r => setTimeout(r, 0));

        expect(consoleSpy).toHaveBeenCalledWith('Error deleting event:', expect.any(Error));
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

    it('handles interactions in delete dialog', async () => {
        const event: PlantTimelineEvent = { date: '2023-01-01', type: 'note', event_id: 123, text: 'del' };
        const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
        await el.updateComplete;

        // Click delete button to open dialog
        const deleteBtn = el.shadowRoot?.querySelector('.delete-btn') as HTMLElement;
        deleteBtn?.click();
        await el.updateComplete;

        // Dialog should be visible
        const dialog = el.shadowRoot?.querySelector('confirm-delete-dialog');
        expect(dialog).toBeTruthy();
        expect(dialog?.hasAttribute('open') || (dialog as any)?.open).toBeTruthy();

        // Simulate cancel
        dialog?.dispatchEvent(new CustomEvent('cancel'));
        await el.updateComplete;

        // Dialog should be closed (open prop should be false)
        expect((dialog as any)?.open).toBeFalsy();
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

            // label.includes('cure')
            const cureIcon = (el as any)._getIcon({ type: 'milestone', label: 'Cure process' });
            expect(cureIcon).toBeDefined();

            // label missing (falls to sprout)
            const noLabelIcon = (el as any)._getIcon({ type: 'milestone' });
            expect(noLabelIcon).toBeDefined();

            // default falls through
            const icon = (el as any)._getIcon({ type: 'milestone', label: 'Sprout' });
            expect(icon).toBeDefined(); // Sprout icon
        });

        it('should render images with data: URIs correctly', async () => {
            const event: PlantTimelineEvent = {
                date: '2023-01-01',
                type: 'note',
                text: 'Base64 image',
                images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==']
            };
            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const img = el.shadowRoot?.querySelector('.image-grid img');
            expect(img?.getAttribute('src')).toContain('data:image/png;base64');
        });

        it('should cover all stage colors in _getStageColor', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
            const stages = ['flower', 'veg', 'seedling', 'clone', 'mother', 'dry', 'cure', 'unknown'];
            for (const stage of stages) {
                const color = (el as any)._getStageColor(stage);
                expect(color).toBeDefined();
            }
        });







        it('handles undefined events in render', async () => {
            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${undefined}></plant-timeline>`);
            await el.updateComplete;
            expect(el.shadowRoot?.textContent).toContain('No entries for this plant yet.');
        });

        it('should render environmental report events correctly', async () => {
            const dayEvent: PlantTimelineEvent = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: ['High VPD', 'Low Temp']
            } as any;

            const nightEvent: PlantTimelineEvent = {
                date: '2023-01-01T00:00:00Z',
                type: 'environmental_report',
                sensor_type: 'night_report',
                reasons: []
            } as any;

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[dayEvent, nightEvent]}></plant-timeline>`);
            await el.updateComplete;

            // Check Day Report
            expect(el.shadowRoot?.textContent).toContain('Day Environmental Report');
            expect(el.shadowRoot?.textContent).toContain('High VPD');
            expect(el.shadowRoot?.textContent).toContain('Low Temp');

            // Check Night Report
            expect(el.shadowRoot?.textContent).toContain('Night Environmental Report');

            // Check Icons
            const dayIcon = (el as any)._getIcon(dayEvent);
            const nightIcon = (el as any)._getIcon(nightEvent);
            const defaultIcon = (el as any)._getIcon({ type: 'environmental_report', sensor_type: 'unknown' });

            expect(dayIcon).toBeDefined();
            expect(nightIcon).toBeDefined();
            expect(dayIcon).not.toBe(nightIcon);
            // Default falls through to day icon logic if not night, or mdiWeatherSunny
            expect(defaultIcon).toBeDefined();
        });

        it('should render vpd-heatmap in environmental report when metadata is present', async () => {
            const event: PlantTimelineEvent = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: [],
                metadata: {
                    temperature: 25,
                    humidity: 60
                }
            } as any;

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const heatmap = el.shadowRoot?.querySelector('vpd-heatmap');
            expect(heatmap).toBeTruthy();
            expect((heatmap as any).temperature).toBe(25);
            expect((heatmap as any).humidity).toBe(60);
            // Default stage is vegetative if no other events
            expect((heatmap as any).stage).toBe('vegetative');
        });

        it('should pass vpd to vpd-heatmap when present in metadata', async () => {
            const event: PlantTimelineEvent = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: [],
                metadata: {
                    temperature: 25,
                    humidity: 60,
                    vpd: 1.5
                }
            } as any;

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const heatmap = el.shadowRoot?.querySelector('vpd-heatmap');
            expect(heatmap).toBeTruthy();
            expect((heatmap as any).vpd).toBe(1.5);
        });

        it('should apply correct day/night classes to environmental reports', async () => {
            const dayEvent: PlantTimelineEvent = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: []
            } as any;

            const nightEvent: PlantTimelineEvent = {
                date: '2023-01-01T00:00:00Z',
                type: 'environmental_report',
                sensor_type: 'night_report',
                reasons: []
            } as any;

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[dayEvent, nightEvent]}></plant-timeline>`);
            await el.updateComplete;

            const dayEl = el.shadowRoot?.querySelector('.type-environmental_report.is-day');
            const nightEl = el.shadowRoot?.querySelector('.type-environmental_report.is-night');

            expect(dayEl).toBeTruthy();
            expect(nightEl).toBeTruthy();
        });
    });

    describe('Quick Note Submission', () => {
        it('should submit note successfully and refresh', async () => {
            const mockHass = {
                callWS: vi.fn().mockResolvedValue({}),
            } as any;

            const el: PlantTimeline = await fixture(html`
                <plant-timeline 
                    .hass=${mockHass}
                    .plant_id=${'plant_123'}
                    .plant_name=${'Test Plant'}
                ></plant-timeline>
            `);
            await el.updateComplete;

            // Add submit event listener
            const refreshSpy = vi.fn();
            el.addEventListener('growspace-refresh', refreshSpy);

            // Find quick-note-input and trigger submit
            const noteInput = el.shadowRoot?.querySelector('quick-note-input') as any;
            expect(noteInput).toBeTruthy();

            // Dispatch submit event
            const submitEvent = new CustomEvent('submit', {
                detail: {
                    text: 'Test note',
                    images: ['image1.jpg'],
                },
            });

            noteInput.dispatchEvent(submitEvent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mockHass.callWS).toHaveBeenCalledWith({
                type: 'growspace_manager/add_timeline_note',
                plant_id: 'plant_123',
                notes: 'Test note',
                images: ['image1.jpg'],
                transition_date: expect.any(String),
            });
        });

        it('should handle note submission error gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const mockHass = {
                callWS: vi.fn().mockRejectedValue(new Error('Network error')),
            } as any;

            const el: PlantTimeline = await fixture(html`
                <plant-timeline 
                    .hass=${mockHass}
                    .plant_id=${'plant_123'}
                ></plant-timeline>
            `);
            await el.updateComplete;

            const noteInput = el.shadowRoot?.querySelector('quick-note-input') as any;
            const submitEvent = new CustomEvent('submit', {
                detail: {
                    text: 'Test note',
                    images: [],
                },
            });

            noteInput.dispatchEvent(submitEvent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error adding note:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should set saving state during submission', async () => {
            const mockHass = {
                callWS: vi.fn().mockImplementation(() =>
                    new Promise(resolve => setTimeout(() => resolve({}), 100))
                ),
            } as any;

            const el: PlantTimeline = await fixture(html`
                <plant-timeline 
                    .hass=${mockHass}
                    .plant_id=${'plant_123'}
                ></plant-timeline>
            `);
            await el.updateComplete;

            const noteInput = el.shadowRoot?.querySelector('quick-note-input') as any;
            const setSavingSpy = vi.spyOn(noteInput, 'setSaving');
            const clearSpy = vi.spyOn(noteInput, 'clear');

            const submitEvent = new CustomEvent('submit', {
                detail: {
                    text: 'Test note',
                    images: [],
                },
            });

            noteInput.dispatchEvent(submitEvent);

            // Should set saving to true immediately
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(setSavingSpy).toHaveBeenCalledWith(true);

            // Wait for submission to complete
            await new Promise(resolve => setTimeout(resolve, 1200));

            // Should clear input and set saving to false
            expect(clearSpy).toHaveBeenCalled();
            expect(setSavingSpy).toHaveBeenCalledWith(false);

            setSavingSpy.mockRestore();
            clearSpy.mockRestore();
        });
    });

    describe('Branch Coverage - _getCurrentStage', () => {
        let el: any;

        beforeEach(() => {
            el = document.createElement('plant-timeline');
        });

        it('should choose the latest stage/milestone event', () => {
            el.events = [
                { date: '2023-01-01', type: 'stage_change', to: 'seedling' },
                { date: '2023-01-03', type: 'stage_change', to: 'flower' },
                { date: '2023-01-02', type: 'stage_change', to: 'veg' }
            ];
            expect(el._getCurrentStage()).toBe('flower');
        });

        it('should handle milestone with label fallback', () => {
            el.events = [
                { date: '2023-01-01', type: 'milestone', label: 'Late_Flower' }
            ];
            expect(el._getCurrentStage()).toBe('late_flower');
        });

        it('should map various stage strings correctly', () => {
            const mappings = [
                { stage: 'clone', expected: 'seedling' },
                { stage: 'veg', expected: 'vegetative' },
                { stage: 'mother', expected: 'vegetative' },
                { stage: 'ripen', expected: 'late_flower' },
                { stage: 'flush', expected: 'late_flower' },
                { stage: 'dry', expected: 'late_flower' },
                { stage: 'cure', expected: 'late_flower' },
                { stage: 'unknown-stage', expected: 'vegetative' }
            ];

            mappings.forEach(({ stage, expected }) => {
                el.events = [{ date: '2023-01-01', type: 'stage_change', to: stage }];
                expect(el._getCurrentStage(), `Failed for ${stage}`).toBe(expected);
            });
        });

        it('should return vegetative if no stage events found', () => {
            el.events = [{ date: '2023-01-01', type: 'note', text: 'just a note' }];
            expect(el._getCurrentStage()).toBe('vegetative');
        });

        it('should handle undefined events', () => {
            el.events = undefined;
            expect(el._getCurrentStage()).toBe('vegetative');
        });
    });

    describe('Environmental Report Fallback Parsing', () => {
        it('should parse temperature and humidity from reasons if metadata is missing', async () => {
            const event: any = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: ['Temperature: 22.5', 'Humidity: 45.0'],
                metadata: undefined
            };

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const heatmap = el.shadowRoot?.querySelector('vpd-heatmap');
            expect(heatmap).toBeTruthy();
            expect((heatmap as any).temperature).toBe(22.5);
            expect((heatmap as any).humidity).toBe(45);
        });

        it('should handle missing matches in reasons fallback', async () => {
            const event: any = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: ['High heat', 'Low water'],
                metadata: undefined
            };

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const heatmap = el.shadowRoot?.querySelector('vpd-heatmap');
            expect(heatmap).toBeNull();
        });

        it('should handle partial metadata and partial reasons', async () => {
            const event: any = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: ['Humidity: 45.0'],
                metadata: { temperature: 22.5 }
            };

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const heatmap = el.shadowRoot?.querySelector('vpd-heatmap');
            expect(heatmap).toBeTruthy();
            expect((heatmap as any).temperature).toBe(22.5);
            expect((heatmap as any).humidity).toBe(45);
        });

        it('should handle humidity in metadata and temperature in reasons', async () => {
            const event: any = {
                date: '2023-01-01T12:00:00Z',
                type: 'environmental_report',
                sensor_type: 'day_report',
                reasons: ['Temperature: 22.5'],
                metadata: { humidity: 45.0 }
            };

            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;

            const heatmap = el.shadowRoot?.querySelector('vpd-heatmap');
            expect(heatmap).toBeTruthy();
            expect((heatmap as any).temperature).toBe(22.5);
            expect((heatmap as any).humidity).toBe(45);
        });
    });

    describe('Misc Edge Cases', () => {
        it('should skip events without dates', async () => {
            const event: any = { type: 'note', text: 'no date' };
            const el: PlantTimeline = await fixture(html`<plant-timeline .events=${[event]}></plant-timeline>`);
            await el.updateComplete;
            expect(el.shadowRoot?.textContent).toContain('No entries for this plant yet.');
        });

        it('should handle missing noteInput in _handleNoteSubmit', async () => {
            const el: any = await fixture(html`<plant-timeline></plant-timeline>`);
            // Mock shadowRoot.querySelector to return null for the next call
            const originalQuerySelector = el.shadowRoot.querySelector;
            el.shadowRoot.querySelector = vi.fn().mockReturnValue(null);

            await el._handleNoteSubmit(new CustomEvent('submit', { detail: { text: 'test' } }));

            // Should return early and not crash
            expect(el.shadowRoot.querySelector).toHaveBeenCalledWith('quick-note-input');
            el.shadowRoot.querySelector = originalQuerySelector;
        });
    });
});
