import { fixture, html } from '@open-wc/testing-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceTimeline } from '../../../../src/components/ui/growspace-timeline';
import { GrowspaceLogbookController } from '../../../../src/controllers/growspace-logbook-controller';
import { HomeAssistant } from 'custom-card-helpers';
import '../../../../src/components/ui/growspace-timeline';

describe('GrowspaceTimeline', () => {
    let element: GrowspaceTimeline;
    let mockHass: any;
    let mockController: any;

    beforeEach(async () => {
        mockHass = {
            callWS: vi.fn(),
            callService: vi.fn(),
        };

        mockController = {
            fetchEventLog: vi.fn().mockResolvedValue([
                {
                    sensor_type: 'water',
                    category: 'irrigation',
                    start_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                    duration_sec: 0,
                    severity: 0,
                    reasons: [],
                },
                {
                    sensor_type: 'temperature',
                    category: 'alert',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                    duration_sec: 0,
                    severity: 0.9,
                    reasons: ['High Temp'],
                },
                {
                    sensor_type: 'custom',
                    category: 'note',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                    notes: 'Manual note',
                },
                {
                    sensor_type: 'unknown',
                    category: 'training',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
                },
                {
                    sensor_type: 'humidity',
                    category: 'environment',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
                },
                {
                    sensor_type: 'vpd',
                    category: 'environment',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
                },
                {
                    sensor_type: 'other',
                    category: 'phase_change',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
                },
                {
                    sensor_type: 'other',
                    category: 'general',
                    start_time: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
                }
            ]),
        };
    });

    async function createTimeline(): Promise<GrowspaceTimeline> {
        const el = await fixture<GrowspaceTimeline>(html`
      <growspace-timeline
        .hass=${mockHass}
        .growspaceId=${'test_growspace'}
      ></growspace-timeline>
    `);

        // Inject mock controller
        (el as any)._controller = mockController;
        // Trigger update to fetch
        (el as any)._fetchEvents();
        await el.updateComplete;
        return el;
    }

    it('should render empty state when loading or no events', async () => {
        const el = await fixture<GrowspaceTimeline>(html`<growspace-timeline></growspace-timeline>`);
        const content = el.shadowRoot!.textContent;
        expect(content!.includes('Loading timeline') || content!.includes('No events')).to.be.true;
    });

    it('should render event markers after fetching', async () => {
        element = await createTimeline();

        // allow async fetch to complete
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        expect(markers.length).to.equal(8);

        // Verify specific classes
        const alertMarker = element.shadowRoot!.querySelector('.marker-alert');
        expect(alertMarker).to.exist;

        const waterMarker = element.shadowRoot!.querySelector('.marker-water');
        expect(waterMarker).to.exist;
    });

    it('should handle zoom controls', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const track = element.shadowRoot!.querySelector('.timeline-track') as HTMLElement;
        // const initialWidth = track.style.width; // Should be 100%

        const zoomInBtn = element.shadowRoot!.querySelectorAll('.zoom-btn')[1] as HTMLElement; // + button
        zoomInBtn.click();
        await element.updateComplete;

        expect(track.style.width).to.equal('150%'); // 1.5x zoom

        const zoomOutBtn = element.shadowRoot!.querySelectorAll('.zoom-btn')[0] as HTMLElement; // - button
        zoomOutBtn.click();
        await element.updateComplete;
        expect(track.style.width).to.equal('100%'); // Back to 1x
    });

    it('should show tooltip on hover', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const marker = element.shadowRoot!.querySelector('.event-marker') as HTMLElement;
        marker.dispatchEvent(new MouseEvent('mouseenter'));
        await element.updateComplete;

        const tooltip = element.shadowRoot!.querySelector('.tooltip.visible');
        expect(tooltip).to.exist;
        expect(tooltip!.textContent).to.include('water');

        marker.dispatchEvent(new MouseEvent('mouseleave'));
        await element.updateComplete;
        const tooltipHidden = element.shadowRoot!.querySelector('.tooltip.visible');
        expect(tooltipHidden).to.not.exist;
    });


    it('should render correct markers for all event types', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        // We added 8 events in mockController
        expect(markers.length).to.equal(8);

        expect(element.shadowRoot!.querySelector('.marker-alert')).to.exist;
        expect(element.shadowRoot!.querySelector('.marker-water')).to.exist;
        expect(element.shadowRoot!.querySelector('.marker-note')).to.exist;
        // expect(element.shadowRoot!.querySelector('.marker-stage')).to.exist; // hypothetical category in code?
        // Checking code: if (cat === 'phase_change') return 'marker-stage';
        // In mock: type='other', category='phase_change'. Should exist.
        expect(element.shadowRoot!.querySelector('.marker-stage')).to.exist;
    });

    it('should trigger fetch when growspaceId changes', async () => {
        element = await createTimeline();
        // Clear previous calls
        (element as any)._controller.fetchEventLog.mockClear();

        element.growspaceId = 'new_growspace';
        await element.updateComplete;

        // Wait for potential async effects
        await new Promise(resolve => setTimeout(resolve, 0));

        expect((element as any)._controller.fetchEventLog).toHaveBeenCalledWith(mockHass, 'new_growspace', 100);
    });

    it('should handle fetch error gracefully', async () => {
        mockController.fetchEventLog.mockRejectedValue(new Error('Fetch failed'));
        const el = await fixture<GrowspaceTimeline>(html`
            <growspace-timeline .hass=${mockHass} .growspaceId=${'test'}></growspace-timeline>
        `);
        (el as any)._controller = mockController;
        // Trigger manually
        await (el as any)._fetchEvents();

        await element.updateComplete;

        // Should show empty state or keep existing. Since it's new fixture, empty.
        // Wait, default _events is [].
        // If fetch fails, _events remains [].
        // So render should show "No events to display"
        const content = el.shadowRoot!.textContent;
        expect(content).to.include('No events');
    });

    it('should show correct tooltip content for notes', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        // Find the note marker (3rd event in mock)
        // Order in mock: water, temperature, note...
        // Assuming map renders in order
        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        const noteMarker = markers[2] as HTMLElement;

        noteMarker.dispatchEvent(new MouseEvent('mouseenter'));
        await element.updateComplete;

        const tooltip = element.shadowRoot!.querySelector('.tooltip.visible');
        expect(tooltip).to.exist;
        expect(tooltip!.textContent).to.include('Note');
        expect(tooltip!.textContent).to.include('Manual note');
    });

    it('should show correct tooltip for non-note events with reasons', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        // Find the alert marker (2nd event)
        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        const alertMarker = markers[1] as HTMLElement;

        alertMarker.dispatchEvent(new MouseEvent('mouseenter'));
        await element.updateComplete;

        const tooltip = element.shadowRoot!.querySelector('.tooltip.visible');
        expect(tooltip).to.exist;
        // tooltip template: 
        // ${event.category === 'note' ? 'Note' : (event.sensor_type || 'Event')}
        // ${...reasons?.join(', ')...}
        expect(tooltip!.textContent).to.include('temperature'); // sensor_type
        expect(tooltip!.textContent).to.include('High Temp'); // reasons
    });

    it('should fallback to Event title if sensor_type is missing', async () => {
        // Add an event with missing sensor_type to mock
        mockController.fetchEventLog.mockResolvedValue([
            {
                category: 'general',
                start_time: new Date().toISOString(),
                // sensor_type undefined
            }
        ]);

        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        const marker = markers[0] as HTMLElement;
        marker.dispatchEvent(new MouseEvent('mouseenter'));
        await element.updateComplete;

        const tooltip = element.shadowRoot!.querySelector('.tooltip.visible');
        expect(tooltip!.textContent).to.include('Event');
    });

    it('should trigger fetch if hass changes and events are empty', async () => {
        const el = await fixture<GrowspaceTimeline>(html`<growspace-timeline .growspaceId=${'id'}></growspace-timeline>`);
        (el as any)._controller = mockController;

        // Initial state: events empty
        // Update hass
        el.hass = mockHass;
        await el.updateComplete;

        expect(mockController.fetchEventLog).toHaveBeenCalled();
    });

    it('should result in different icons for specific environment types', async () => {
        mockController.fetchEventLog.mockResolvedValue([
            { sensor_type: 'temperature', category: 'environment', start_time: new Date().toISOString() },
            { sensor_type: 'humidity', category: 'environment', start_time: new Date().toISOString() },
            { sensor_type: 'vpd', category: 'environment', start_time: new Date().toISOString() },
            // Test specific irrigation check
            { sensor_type: 'water', category: 'general', start_time: new Date().toISOString() },
            // Test training check
            { category: 'training', sensor_type: 'unknown', start_time: new Date().toISOString() }
        ]);

        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const markers = element.shadowRoot!.querySelectorAll('.event-marker svg path');
        expect(markers.length).to.equal(5);
        // We verify that we got through the rendering without error and presumably hit the branches.
        const d1 = markers[0].getAttribute('d');
        const d2 = markers[1].getAttribute('d');
        expect(d1).not.to.equal(d2);
    });
});
