import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import "../../../../src/components/plant/plant-timeline";
import { PlantTimeline } from '../../../../src/components/plant/plant-timeline';
import { PlantTimelineEvent } from '../../../../src/types';

describe('PlantTimeline', () => {
    it('renders "No events recorded" when events array is empty', async () => {
        const el: PlantTimeline = await fixture(html`<plant-timeline></plant-timeline>`);
        expect(el.events).toEqual([]);
        expect(el.shadowRoot?.textContent).toContain('No events recorded');
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
        const icon = (el as any)._getIcon('action', 'prune');
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
        const icon = (el as any)._getIcon('unknown_type');
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
        const icon = (el as any)._getIcon('action', 'ipm');
        expect(icon).toBeDefined();
        // Since we can't easily compare equality of the SVG path without importing mdiBug,
        // we at least ensure it's not the default leaf if we can distinguish them.
        const leafIcon = (el as any)._getIcon('action', 'unknown');
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
});
