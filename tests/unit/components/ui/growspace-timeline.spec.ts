import { fixture, html } from '@open-wc/testing-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceTimeline } from '../../../../src/components/ui/growspace-timeline';
import { HomeAssistant } from 'custom-card-helpers';
import '../../../../src/components/ui/growspace-timeline';

describe('GrowspaceTimeline', () => {
    let element: GrowspaceTimeline;
    let mockHass: any;

    const mockEvents = [
        {
            sensor_type: 'water',
            category: 'irrigation',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
        },
        {
            sensor_type: 'temperature',
            category: 'alert',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            duration_sec: 0,
            severity: 0.9,
            reasons: ['High Temp'],
        },
        {
            sensor_type: 'custom',
            category: 'note',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
            notes: 'Manual note',
        },
        {
            sensor_type: 'unknown',
            category: 'training',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
        },
        {
            sensor_type: 'humidity',
            category: 'environment',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
        },
        {
            sensor_type: 'vpd',
            category: 'environment',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
        },
        {
            sensor_type: 'other',
            category: 'phase_change',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
        },
        {
            sensor_type: 'other',
            category: 'general',
            growspace_id: 'test_growspace',
            start_time: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
            end_time: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
            duration_sec: 0,
            severity: 0,
            reasons: [],
        }
    ];

    beforeEach(async () => {
        mockHass = {
            callWS: vi.fn().mockImplementation(async (msg: any) => {
                if (msg.type === 'growspace_manager/get_log') return { test_growspace: mockEvents };
                return { test_growspace: [] };
            }),
            callService: vi.fn(),
        };
    });


    async function createTimeline(): Promise<GrowspaceTimeline> {
        const el = await fixture<GrowspaceTimeline>(html`
      <growspace-timeline
        .hass=${mockHass}
        .growspaceId=${'test_growspace'}
      ></growspace-timeline>
    `);

        // Trigger fetch (will use mocked callWS)
        await el.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));
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

    it('should display error state', async () => {
        // Mock error
        mockHass.callWS.mockRejectedValue(new Error('Fetch failed'));

        element = new GrowspaceTimeline();
        element.hass = mockHass;
        element.growspaceId = 'gs1';
        document.body.appendChild(element);

        await element.updateComplete;
        await new Promise(r => setTimeout(r, 10)); // Follow async
        await element.updateComplete;

        const errorMsg = element.shadowRoot?.querySelector('.empty-state');
        expect(errorMsg?.textContent).toContain('Fetch failed');
    });

    it('should handle zoom controls', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const track = element.shadowRoot!.querySelector('.timeline-track') as HTMLElement;

        const zoomInBtn = element.shadowRoot!.querySelectorAll('.zoom-btn')[1] as HTMLElement; // + button
        zoomInBtn.click();
        await element.updateComplete;

        // Implementation adds 0.5 to zoom level 1 -> 1.5
        expect(track.style.width).to.equal('150%');

        const zoomOutBtn = element.shadowRoot!.querySelectorAll('.zoom-btn')[0] as HTMLElement; // - button
        zoomOutBtn.click();
        await element.updateComplete;
        expect(track.style.width).to.equal('100%');
    });

    it('should zoom to ~24h window when clicking an event', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        const container = element.shadowRoot!.querySelector('.timeline-container') as HTMLElement;
        const scrollToSpy = vi.spyOn(container, 'scrollTo');

        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        const marker = markers[0] as HTMLElement; // Should correspond to an event

        marker.click();
        await element.updateComplete;

        // Check if zoom level increased significantly (more than 100%)
        // The mock events span ~24h (oldest is 24h ago). 
        // With 1 day buffer on each side, total duration is ~3 days.
        // 24h window ~ 3 days / 1 day = 3x zoom.
        // If zoom level > 1.5 it worked.

        // Let's check internal state or width
        const track = element.shadowRoot!.querySelector('.timeline-track') as HTMLElement;
        const widthVal = parseFloat(track.style.width.replace('%', ''));
        expect(widthVal).to.be.greaterThan(100);

        // Check compatibility with scrollTo
        expect(scrollToSpy).toHaveBeenCalled();
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
        mockHass.callWS.mockClear();

        element.growspaceId = 'new_growspace';
        await element.updateComplete;

        // Wait for potential async effects
        await new Promise(resolve => setTimeout(resolve, 0));

        // Check that callWS was called with new growspace ID
        expect(mockHass.callWS).toHaveBeenCalledWith(expect.objectContaining({
            type: 'growspace_manager/get_log',
            growspace_id: 'new_growspace',
            limit: 100
        }));
    });

    it('should handle fetch error gracefully', async () => {
        // Mock error response
        mockHass.callWS.mockRejectedValue(new Error('Fetch failed'));

        const el = await fixture<GrowspaceTimeline>(html`
            <growspace-timeline .hass=${mockHass} .growspaceId=${'test'}></growspace-timeline>
        `);

        await el.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));

        // Service returns empty array on error (matches old controller behavior)
        const content = el.shadowRoot!.textContent;
        // expect(content).to.include('No events'); // Old behavior
        expect(content).to.include('Fetch failed'); // New behavior
    });

    it('should show correct tooltip content for notes', async () => {
        element = await createTimeline();
        await new Promise(resolve => setTimeout(resolve, 0));
        await element.updateComplete;

        // Find the note marker (3rd event in mock)
        // Order in mock: water, temperature, note...
        // Assuming map renders in order
        // Note is at index 1 (2h ago, after Water 1h ago)
        const markers = element.shadowRoot!.querySelectorAll('.event-marker');
        const noteMarker = markers[1] as HTMLElement;

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

        // Find the alert marker by class for robustness
        const marker = element.shadowRoot!.querySelector('.marker-alert') as HTMLElement;

        // Mock getBoundingClientRect
        marker.getBoundingClientRect = () => ({
            top: 100,
            left: 100,
            width: 32,
            height: 32,
            bottom: 132,
            right: 132,
        } as DOMRect);

        marker.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await element.updateComplete;

        // Tooltip is now at the root level
        const tooltip = element.shadowRoot!.querySelector('.tooltip.visible');
        expect(tooltip).to.exist;

        // tooltip template: 
        // ${event.category === 'note' ? 'Note' : (event.sensor_type || 'Event')}
        // ${...reasons?.join(', ')...}
        expect(tooltip!.textContent).to.include('High Temp'); // reasons
    });

    it('should fallback to Event title if sensor_type is missing', async () => {
        // Mock response with missing sensor_type
        mockHass.callWS.mockImplementation(async (msg: any) => {
            if (msg.type === 'growspace_manager/get_log') {
                return {
                    test_growspace: [
                        {
                            category: 'general',
                            growspace_id: 'test_growspace',
                            start_time: new Date().toISOString(),
                            end_time: new Date().toISOString(),
                            duration_sec: 0,
                            severity: 0,
                            reasons: [],
                            // sensor_type undefined
                        }
                    ]
                };
            }
            return { test_growspace: [] };
        });

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

        // Initial state: events empty, no hass
        // Update hass
        el.hass = mockHass;
        await el.updateComplete;
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockHass.callWS).toHaveBeenCalled();
    });

    it('should result in different icons for specific environment types', async () => {
        mockHass.callWS.mockImplementation(async (msg: any) => {
            if (msg.type === 'growspace_manager/get_log') {
                return {
                    test_growspace: [
                        { sensor_type: 'temperature', category: 'environment', growspace_id: 'test_growspace', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_sec: 0, severity: 0, reasons: [] },
                        { sensor_type: 'humidity', category: 'environment', growspace_id: 'test_growspace', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_sec: 0, severity: 0, reasons: [] },
                        { sensor_type: 'vpd', category: 'environment', growspace_id: 'test_growspace', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_sec: 0, severity: 0, reasons: [] },
                        // Test specific irrigation check
                        { sensor_type: 'water', category: 'general', growspace_id: 'test_growspace', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_sec: 0, severity: 0, reasons: [] },
                        // Test training check
                        { category: 'training', sensor_type: 'unknown', growspace_id: 'test_growspace', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_sec: 0, severity: 0, reasons: [] }
                    ]
                };
            }
            return { test_growspace: [] };
        });

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
