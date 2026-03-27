import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../../../src/features/plants/components/plant-timeline-tab';
import type { PlantTimelineTab } from '../../../../../src/features/plants/components/plant-timeline-tab';
import type { TimelineEvent } from '../../../../../src/features/plants/viewmodels/plant-overview.viewmodel';

describe('PlantTimelineTab', () => {
  let element: PlantTimelineTab;

  afterEach(() => {
    // Clean up
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  it('should render the empty state when no timelineEvents are provided', async () => {
    element = await fixture(html`<plant-timeline-tab></plant-timeline-tab>`);
    
    // Default prop is undefined
    const emptyState = element.shadowRoot!.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('No timeline events yet');

    // With empty array
    element.timelineEvents = [];
    await element.updateComplete;
    const emptyState2 = element.shadowRoot!.querySelector('.empty-state');
    expect(emptyState2).toBeTruthy();
    expect(emptyState2?.textContent).toContain('No timeline events yet');
  });

  it('should render timeline events correctly', async () => {
    const events = [
      {
        id: '1',
        date: new Date(Date.now() - 10000).toISOString(), // 10s ago
        label: 'Planted',
        description: 'Placed in soil',
        type: 'milestone',
        category: 'lifecycle',
      },
      {
        id: '2',
        date: '2023-01-01T10:00:00.000Z', // Absolute old date
        label: 'Watered',
        type: 'action',
      },
      {
        id: '3',
        date: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        label: 'Low moisture',
        description: 'Soil is dry',
        type: 'note',
      }
    ] as unknown as TimelineEvent[];

    element = await fixture(html`<plant-timeline-tab .timelineEvents=${events}></plant-timeline-tab>`);
    
    const timeline = element.shadowRoot!.querySelector('.timeline');
    expect(timeline).toBeTruthy();

    const renderedEvents = element.shadowRoot!.querySelectorAll('.timeline-event');
    expect(renderedEvents.length).toBe(3);

    // Check classes for styling (milestone, action, note)
    expect(renderedEvents[0].classList.contains('milestone')).toBe(true);
    expect(renderedEvents[1].classList.contains('action')).toBe(true);
    expect(renderedEvents[2].classList.contains('note')).toBe(true);

    // Check content
    const labels = Array.from(renderedEvents).map(e => e.querySelector('.timeline-label')?.textContent?.trim());
    expect(labels).toEqual(['Planted', 'Watered', 'Low moisture']);

    const category = renderedEvents[0].querySelector('.timeline-category');
    expect(category).toBeTruthy();
    expect(category?.textContent?.trim()).toBe('lifecycle');

    // Action shouldn't have desc/category
    expect(renderedEvents[1].querySelector('.timeline-description')).toBeFalsy();
    expect(renderedEvents[1].querySelector('.timeline-category')).toBeFalsy();
  });

  it('should format dates correctly based on recency', async () => {
    // Create an instance instead of using DOM for a direct format method call test if possible, 
    // but the method is private so we'll test output via DOM.
    const now = Date.now();
    
    const events = [
      { id: '1', date: new Date(now - 1000).toISOString(), label: 'recent', type: 'note' },
      { id: '2', date: new Date(now - 60000 * 5).toISOString(), label: 'mins', type: 'note' },
      { id: '3', date: new Date(now - 3600000 * 2).toISOString(), label: 'hours', type: 'note' },
      { id: '4', date: new Date(now - 86400000 * 3).toISOString(), label: 'days', type: 'note' },
      { id: '5', date: 'invalid-date', label: 'invalid', type: 'note' }
    ] as unknown as TimelineEvent[];

    element = await fixture(html`<plant-timeline-tab .timelineEvents=${events}></plant-timeline-tab>`);
    const renderedEvents = element.shadowRoot!.querySelectorAll('.timeline-event');
    const dates = Array.from(renderedEvents).map(e => e.querySelector('.timeline-date')?.textContent?.trim());

    expect(dates[0]).toBe('Just now');
    expect(dates[1]).toBe('5m ago');
    expect(dates[2]).toBe('2h ago');
    expect(dates[3]).toBe('3d ago');
    expect(dates[4]).toBe('Invalid Date');
  });
});
