import { fixture, html, waitUntil } from '@open-wc/testing-helpers';
import { PlantTimeline } from '../../../../src/features/plants/components/plant-timeline';
import { PlantTimelineEvent } from '../../../../src/features/plants/types';
import {
  mdiAlertCircle,
  mdiDelete,
  mdiNote,
  mdiTag,
  mdiThermometer,
  mdiWaterPercent,
  mdiGauge,
  mdiFlash,
  mdiCupWater,
  mdiFlaskOutline,
  mdiFlower,
  mdiHairDryer,
  mdiCannabis,
  mdiSprout,
  mdiNoteText,
  mdiWater,
  mdiBug,
  mdiLeaf,
  mdiWeatherSunny,
  mdiWeatherNight,
  mdiDumbbell
} from '@mdi/js';
import { vi, describe, it, beforeEach, expect } from 'vitest';

// vi.mock is hoisted — use vi.hoisted() to share refs between mock factory and tests
const { mockAddPlantNote, mockDeleteEvent } = vi.hoisted(() => ({
  mockAddPlantNote: vi.fn(),
  mockDeleteEvent: vi.fn(),
}));

vi.mock('../../../../src/slices/logbook', () => ({
  addPlantNote: mockAddPlantNote,
  deleteEvent: mockDeleteEvent,
  addGrowspaceNote: vi.fn(),
  fetchGrowspaceEvents: vi.fn().mockResolvedValue([]),
  fetchPlantEvents: vi.fn().mockResolvedValue([]),
  growspaceEvents$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
  plantEvents$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
  setGrowspaceEvents: vi.fn(),
  setPlantEvents: vi.fn(),
}));

if (!customElements.get('plant-timeline')) {
  customElements.define('plant-timeline', PlantTimeline);
}

describe('PlantTimeline', () => {
  let element: PlantTimeline;
  const mockHass = {
    callWS: vi.fn(),
    localize: (key: string) => key,
  } as any;

  beforeEach(async () => {
    vi.clearAllMocks();
    element = await fixture<PlantTimeline>(html`
      <plant-timeline .hass=${mockHass} plant_id="plant_1"></plant-timeline>
    `);
  });

  it('renders "no entries" when events are empty', async () => {
    element.events = [];
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).to.contain('No entries for this plant yet.');
  });

  it('renders various event types and icons correctly', async () => {
    const events: PlantTimelineEvent[] = [
      {
        type: 'stage_change',
        from: 'Veg',
        to: 'Flower',
        date: new Date().toISOString(),
      },
      {
        type: 'alert',
        severity: 'high',
        message: 'High VPD',
        date: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        type: 'note',
        text: 'Looking good',
        date: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        type: 'milestone',
        label: 'Flower Start',
        date: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        type: 'action',
        action: 'water',
        details: '500ml',
        date: new Date(Date.now() - 14400000).toISOString(),
      },
    ];

    element.events = events;
    await element.updateComplete;

    const eventElements = element.shadowRoot?.querySelectorAll('.event');
    expect(eventElements?.length).to.equal(5);

    // Verify presence of event types
    expect(element.shadowRoot?.querySelector('.type-stage_change')).to.exist;
    expect(element.shadowRoot?.querySelector('.type-alert')).to.exist;
    expect(element.shadowRoot?.querySelector('.type-note')).to.exist;
    expect(element.shadowRoot?.querySelector('.type-milestone')).to.exist;
    expect(element.shadowRoot?.querySelector('.type-action')).to.exist;
  });

  describe('Icon and Color Mapping', () => {
    it('handles all stage_change types for icons', async () => {
      const stages = ['flower', 'dry', 'cure', 'unknown'];
      for (const stage of stages) {
        const icon = (element as any)._getIcon({ type: 'stage_change', to: stage });
        expect(icon).to.exist;
      }
    });

    it('handles all milestone labels for icons', async () => {
      const labels = ['flower day 1', 'drying start', 'curing', 'unknown'];
      for (const label of labels) {
        const icon = (element as any)._getIcon({ type: 'milestone', label });
        expect(icon).to.exist;
      }
    });

    it('handles all action types for icons', async () => {
      const actions = ['water', 'watering', 'ipm', 'training', 'other'];
      for (const action of actions) {
        const icon = (element as any)._getIcon({ type: 'action', action });
        expect(icon).to.exist;
      }
    });

    it('handles environmental_report icons', () => {
      expect((element as any)._getIcon({ type: 'environmental_report', sensor_type: 'day_report' })).to.equal(mdiWeatherSunny);
      expect((element as any)._getIcon({ type: 'environmental_report', sensor_type: 'night_report' })).to.equal(mdiWeatherNight);
    });

    it('handles unknown types with fallback icon', () => {
      expect((element as any)._getIcon({ type: 'unknown' })).to.equal(mdiLeaf);
    });

    it('handles stage color mapping for all stages', () => {
      expect((element as any)._getStageColor('flower')).to.equal('#e91e63');
      expect((element as any)._getStageColor('veg')).to.equal('#4caf50');
      expect((element as any)._getStageColor('seedling')).to.equal('#8bc34a');
      expect((element as any)._getStageColor('clone')).to.equal('#66bb6a');
      expect((element as any)._getStageColor('mother')).to.equal('#2e7d32');
      expect((element as any)._getStageColor('dry')).to.equal('#ff9800');
      expect((element as any)._getStageColor('cure')).to.equal('#795548');
      expect((element as any)._getStageColor('unknown')).to.equal('var(--divider-color)');
      expect((element as any)._getStageColor(undefined)).to.equal('var(--divider-color)');
    });
  });

  it('identifies correlated notes/alerts', async () => {
    const alertDate = new Date();
    const noteDate = new Date(alertDate.getTime() + 1000 * 60 * 30); // 30 mins later

    const events: PlantTimelineEvent[] = [
      { type: 'alert', severity: 'high', message: 'Hot!', date: alertDate.toISOString() },
      { type: 'note', text: 'Turned on fan', date: noteDate.toISOString() }
    ];

    element.events = events;
    await element.updateComplete;

    const isCorrelated = (element as any)._isCorrelated(events[1], events);
    expect(isCorrelated).to.be.true;

    // Test non-correlated (too far apart)
    const lateNoteDate = new Date(alertDate.getTime() + 1000 * 60 * 60 * 3); // 3 hours later
    const isNotCorrelated = (element as any)._isCorrelated({ type: 'note', date: lateNoteDate.toISOString() }, events);
    expect(isNotCorrelated).to.be.false;
  });

  it('isNotCorrelated handles late notes', () => {
    const alertDate = new Date();
    const events = [{ type: 'alert', severity: 'low', date: alertDate.toISOString() }];
    const lateNoteDate = new Date(alertDate.getTime() + 1000 * 60 * 60 * 3); // 3 hours later
    const isNotCorrelated = (element as any)._isCorrelated({ type: 'note', date: lateNoteDate.toISOString() }, events);
    expect(isNotCorrelated).to.be.false;
  });

  it('safely handles undefined events in stage inference', () => {
    element.events = undefined as any;
    expect((element as any)._getCurrentStage()).to.equal('vegetative');
  });

  it('renders alert grouping summary when many alerts exist', async () => {
    const date = new Date().toISOString();
    element.events = [
      { type: 'alert', severity: 'low', message: 'A1', date },
      { type: 'alert', severity: 'low', message: 'A2', date },
      { type: 'alert', severity: 'low', message: 'A3', date },
    ];
    await element.updateComplete;

    const summary = element.shadowRoot?.querySelector('.day-summary');
    expect(summary).to.exist;
    expect(summary?.textContent).to.contain('3 system alerts recorded');
  });

  describe('Interactions', () => {
    it('handles note submission', async () => {
      vi.useFakeTimers();
      const input = element.shadowRoot?.querySelector('quick-note-input');
      mockAddPlantNote.mockResolvedValueOnce(undefined);
      
      input?.dispatchEvent(new CustomEvent('submit', {
        detail: { text: 'New Note', images: ['img1.jpg'] }
      }));
      
      // Advance timers to skip the 1s delay before refresh dispatch
      await vi.runAllTimersAsync();
      
      expect(mockAddPlantNote).toHaveBeenCalled();
      vi.useRealTimers();

      // Error case
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAddPlantNote.mockRejectedValueOnce(new Error('Fail'));
      input?.dispatchEvent(new CustomEvent('submit', {
        detail: { text: 'Fail Note', images: [] }
      }));
      await element.updateComplete;
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('handles event deletion flow', async () => {
      element.events = [{ event_id: '123', type: 'note', text: 'To delete', date: new Date().toISOString() }];
      await element.updateComplete;

      const deleteBtn = element.shadowRoot?.querySelector('.delete-btn') as HTMLElement;
      deleteBtn.click();
      expect((element as any)._showDeleteConfirmation).to.be.true;

      const dialog = element.shadowRoot?.querySelector('confirm-delete-dialog');
      dialog?.dispatchEvent(new CustomEvent('cancel'));
      expect((element as any)._showDeleteConfirmation).to.be.false;

      deleteBtn.click();
      mockDeleteEvent.mockResolvedValueOnce(undefined);
      dialog?.dispatchEvent(new CustomEvent('confirm'));
      await element.updateComplete;
      expect(mockDeleteEvent).toHaveBeenCalledWith('123');

      // Error case
      deleteBtn.click();
      mockDeleteEvent.mockRejectedValueOnce(new Error('Delete fail'));
      dialog?.dispatchEvent(new CustomEvent('confirm'));
      await element.updateComplete;
      expect((element as any)._showDeleteConfirmation).to.be.false;
    });

    it('handles image hover and overlay', async () => {
      element.events = [{
        type: 'note',
        text: 'test',
        date: new Date().toISOString(),
        images: ['test.jpg']
      }];
      await element.updateComplete;

      const img = element.shadowRoot?.querySelector('.image-grid img') as HTMLImageElement;
      img.dispatchEvent(new MouseEvent('mouseenter'));
      await element.updateComplete;
      expect(element.shadowRoot?.querySelector('.image-hover-overlay')).to.exist;

      img.dispatchEvent(new MouseEvent('mouseleave'));
      await element.updateComplete;
      expect(element.shadowRoot?.querySelector('.image-hover-overlay')).to.not.exist;
    });

    it('opens image in new tab on click', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      element.events = [{
        type: 'note',
        text: 'test',
        date: new Date().toISOString(),
        images: ['test.jpg']
      }];
      await element.updateComplete;

      const img = element.shadowRoot?.querySelector('.image-grid img') as HTMLImageElement;
      img.click();
      expect(openSpy).toHaveBeenCalled();
    });

    it('renders data-URI images correctly', async () => {
      element.events = [{
        type: 'note',
        text: 'data-img',
        date: new Date().toISOString(),
        images: ['data:image/png;base64,123']
      }];
      await element.updateComplete;
      const img = element.shadowRoot?.querySelector('.image-grid img') as HTMLImageElement;
      expect(img.src).to.contain('data:image/png;base64,123');
    });

    it('renders metadata with EC and PH labels correctly', async () => {
      element.events = [{
        type: 'action',
        action: 'water',
        date: new Date().toISOString(),
        metadata: { ec: 2.0, ph: 6.5 }
      }];
      await element.updateComplete;
      const chips = element.shadowRoot?.querySelectorAll('.chip');
      expect(chips?.[0].textContent).to.contain('pH 6.5');
      expect(chips?.[1].textContent).to.contain('EC 2');
    });
  });

  describe('Metadata and Content Rendering', () => {
    it('renders all metadata chips', async () => {
      const metadata = {
        temperature: 25,
        humidity: 50,
        vpd: 1.2,
        ph: 6.0,
        ec: 1.8,
        amount_ml: 500
      };
      const events: PlantTimelineEvent[] = [
        { type: 'note', text: 'Data', date: new Date().toISOString(), metadata }
      ];
      element.events = events;
      await element.updateComplete;

      const chips = element.shadowRoot?.querySelectorAll('.chip');
      expect(chips?.length).to.equal(6);
    });

    it('renders tags when provided', async () => {
      element.events = [
        {
          type: 'note',
          text: 'Note with tags',
          date: new Date().toISOString(),
          tags: ['organic', 'top-dress'],
        },
      ];
      await element.updateComplete;

      const tags = element.shadowRoot?.querySelectorAll('.tag');
      expect(tags?.length).to.equal(2);
      expect(tags![0].textContent?.trim()).to.equal('organic');
      expect(tags![1].textContent?.trim()).to.equal('top-dress');
    });

    it('renders environmental report with heatmap', async () => {
      element.events = [
        {
          type: 'environmental_report',
          sensor_type: 'day_report',
          date: new Date().toISOString(),
          metadata: {
            temperature: 28,
            humidity: 60,
          },
        },
        {
          type: 'stage_change',
          from: 'vegetative',
          to: 'flower',
          date: new Date(Date.now() - 1000).toISOString(),
        },
      ];
      await element.updateComplete;

      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap') as any;
      expect(heatmap).to.exist;
      expect(heatmap?.stage).to.equal('flower');
    });

    it('fallbacks to parsing reasons if metadata is missing', async () => {
      element.events = [
        {
          type: 'environmental_report',
          sensor_type: 'day_report',
          date: new Date().toISOString(),
          reasons: ['Temperature: 35.5', 'Humidity: 45.3', 'VPD: 1.5'],
        },
      ];
      await element.updateComplete;

      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap') as any;
      expect(heatmap).to.exist;
      expect(heatmap?.temperature).to.equal(35.5);
      expect(heatmap?.humidity).to.equal(45.3);
      expect(heatmap?.vpd).to.equal(1.5);
    });

    it('infers current stage correctly from milestones and sorting', async () => {
      element.events = [
        {
          type: 'milestone',
          label: 'Flower',
          date: new Date(Date.now() - 1000).toISOString(),
        },
        {
          type: 'environmental_report',
          sensor_type: 'day_report',
          date: new Date().toISOString(),
          metadata: { temperature: 25, humidity: 50 },
        },
      ];
      await element.updateComplete;
      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap') as any;
      expect(heatmap?.stage.toLowerCase()).to.equal('flower');
    });

    it('defaults to vegetative for unknown stages', async () => {
      element.events = [
        {
          type: 'stage_change',
          from: 'unknown',
          to: 'unknown_stage',
          date: new Date().toISOString(),
        },
        {
          type: 'environmental_report',
          sensor_type: 'day_report',
          date: new Date(Date.now() + 1000).toISOString(),
          metadata: { temperature: 25, humidity: 45 },
        },
      ];
      await element.updateComplete;
      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap') as any;
      expect(heatmap?.stage).to.be.oneOf(['unknown_stage', 'vegetative']);
    });

    it('handles various stage mappings in _getCurrentStage', async () => {
      const testMapping = async (to: string, expected: string) => {
        element.events = [{ type: 'stage_change', from: 'seedling', to, date: new Date().toISOString() }, { type: 'environmental_report', sensor_type: 'day_report', date: new Date().toISOString(), metadata: { temperature: 25, humidity: 50 } }];
        await element.updateComplete;
        return (element.shadowRoot?.querySelector('vpd-heatmap') as any)?.stage;
      };

      expect(await testMapping('seedling', 'seedling')).to.equal('seedling');
      expect(await testMapping('clone', 'seedling')).to.equal('seedling');
      expect(await testMapping('mother', 'vegetative')).to.equal('vegetative');
      expect(await testMapping('ripen', 'late_flower')).to.equal('late_flower');
      expect(await testMapping('dry', 'late_flower')).to.equal('late_flower');
    });

    it('handles fallback parsing in environmental report', async () => {
      element.events = [{
        type: 'environmental_report',
        sensor_type: 'day_report',
        date: new Date().toISOString(),
        reasons: ['Temperature: 25.5°C', 'Humidity: 60.2%', 'VPD: 1.1 kPa']
      }];
      await element.updateComplete;
      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap') as any;
      expect(heatmap?.temperature).to.equal(25.5);
      expect(heatmap?.humidity).to.equal(60.2);
    });

    it('sorts multi events correctly', async () => {
      // Sorting test (multi events)
      element.events = [
        { type: 'stage_change', from: 'veg', to: 'flower', date: '2023-01-02T12:00:00Z' },
        { type: 'stage_change', from: 'seedling', to: 'veg', date: '2023-01-01T12:00:00Z' },
        { type: 'environmental_report', sensor_type: 'day_report', date: new Date().toISOString(), metadata: { temperature: 25, humidity: 50 } }
      ];
      await element.updateComplete;
      expect((element.shadowRoot?.querySelector('vpd-heatmap') as any)?.stage).to.equal('flower');
    });

    it('defaults to vegetative if no stages present', async () => {
      element.events = [
        {
          type: 'environmental_report',
          sensor_type: 'day_report',
          date: new Date().toISOString(),
          metadata: { temperature: 25, humidity: 55 },
        },
      ];
      await element.updateComplete;
      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap') as any;
      expect(heatmap?.stage).to.satisfy((s: any) => s === undefined || s === 'vegetative');
    });
  });

  describe('Stage Inference', () => {
    it('infers current stage correctly', async () => {
      const cases = [
        { to: 'flower', expected: 'flower' },
        { to: 'seedling', expected: 'seedling' },
        { to: 'veg', expected: 'vegetative' },
        { to: 'ripen', expected: 'late_flower' },
        { to: 'dry', expected: 'late_flower' }
      ];

      for (const { to, expected } of cases) {
        element.events = [{ type: 'stage_change', from: 'Veg', to, date: new Date().toISOString() }];
        expect((element as any)._getCurrentStage()).to.equal(expected);
      }
    });

    it('infers stage from milestone events', async () => {
      element.events = [{ type: 'milestone', label: 'Flower', date: new Date().toISOString() }];
      expect((element as any)._getCurrentStage()).to.equal('flower');

      element.events = [{ type: 'milestone', label: 'ripen', date: new Date().toISOString() }];
      expect((element as any)._getCurrentStage()).to.equal('late_flower');

      element.events = [{ type: 'milestone', label: 'unknown', date: new Date().toISOString() }];
      expect((element as any)._getCurrentStage()).to.equal('vegetative');
      
      element.events = [{ type: 'milestone', label: 'Dry', date: new Date().toISOString() }];
      expect((element as any)._getCurrentStage()).to.equal('late_flower');
    });

    it('renders various action icons correctly', async () => {
      const actions = ['water', 'ipm', 'training', 'unknown'];
      for (const action of actions) {
        element.events = [{ type: 'action', action, date: new Date().toISOString() }];
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.icon-wrapper svg path')).to.exist;
      }
    });

    it('renders various milestone icons correctly', async () => {
      const labels = ['flower', 'dry', 'cure', 'sprout'];
      for (const label of labels) {
        element.events = [{ type: 'milestone', label, date: new Date().toISOString() }];
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.icon-wrapper svg path')).to.exist;
      }
    });

    it('renders various stage_change icons correctly', async () => {
      const stages = ['flower', 'dry', 'cure', 'veg'];
      for (const to of stages) {
        element.events = [{ type: 'stage_change', from: 'veg', to, date: new Date().toISOString() }];
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.icon-wrapper svg path')).to.exist;
      }
    });

    it('defaults to vegetative if no events', () => {
      element.events = [];
      expect((element as any)._getCurrentStage()).to.equal('vegetative');
    });
    it('handles empty or non-matching reasons in environmental report', async () => {
      element.events = [{
        type: 'environmental_report',
        sensor_type: 'day_report',
        date: new Date().toISOString(),
        reasons: ['No Data Here', 'Temperature: invalid']
      }];
      await element.updateComplete;
      expect(element.shadowRoot?.querySelector('vpd-heatmap')).to.not.exist;
    });

    it('handles partial metadata with fallback reasons', async () => {
      element.events = [{
        type: 'environmental_report',
        sensor_type: 'day_report',
        date: new Date().toISOString(),
        metadata: { temperature: 22 },
        reasons: ['Humidity: 55%', 'VPD: 0.8 kPa']
      }];
      await element.updateComplete;
      const heatmap = element.shadowRoot?.querySelector('vpd-heatmap');
      expect(heatmap).to.exist;
      expect((heatmap as any).temperature).to.equal(22);
      expect((heatmap as any).humidity).to.equal(55);
      expect((heatmap as any).vpd).to.equal(0.8);
    });

    it('handles non-environmental events in _getEnvironmentalData', () => {
      const event: any = { type: 'action', action: 'watering', metadata: { temperature: 20 } };
      // @ts-ignore
      const data = element._getEnvironmentalData(event);
      expect(data.temperature).to.equal(20);
    });

    it('handles missing reasons in environmental report', () => {
      const event: any = { type: 'environmental_report', sensor_type: 'day_report' };
      // @ts-ignore
      const data = element._getEnvironmentalData(event);
      expect(data.temperature).to.be.undefined;
    });

    it('returns early if all metadata is present', () => {
      const event: any = {
        type: 'environmental_report',
        metadata: { temperature: 20, humidity: 50, vpd: 1.0 },
        reasons: ['Temperature: 100'] // Should be ignored
      };
      // @ts-ignore
      const data = element._getEnvironmentalData(event);
      expect(data.temperature).to.equal(20);
    });

    it('renders night environmental reports correctly', async () => {
      element.events = [{
        type: 'environmental_report',
        sensor_type: 'night_report',
        date: new Date().toISOString(),
        metadata: { temperature: 18, humidity: 65, vpd: 0.9 }
      }];
      await element.updateComplete;
      const eventEl = element.shadowRoot?.querySelector('.event.is-night');
      expect(eventEl).to.exist;
      expect(eventEl?.textContent).to.contain('Night Environmental Report');
    });

    it('handles milestone without label', async () => {
      element.events = [{
        type: 'milestone',
        date: new Date().toISOString()
      }] as any;
      await element.updateComplete;
      const icon = element.shadowRoot?.querySelector('svg path');
      expect(icon?.getAttribute('d')).to.equal(mdiSprout);
    });

    it('returns false in _isCorrelated for non-note events', () => {
      const event: any = { type: 'action', date: new Date().toISOString() };
      // @ts-ignore
      expect(element._isCorrelated(event, [])).to.be.false;
    });

    it('handles note submission success', async () => {
      vi.useFakeTimers();
      const dispatchSpy = vi.fn();
      element.addEventListener('growspace-refresh', dispatchSpy);
      
      const noteInput = element.shadowRoot?.querySelector('quick-note-input');
      expect(noteInput).to.exist;

      // Trigger note submit via event dispatch
      const detail = { text: 'Test Note', images: [] };
      noteInput?.dispatchEvent(new CustomEvent('submit', { detail }));
      
      // Wait for service call and timers
      await vi.runAllTimersAsync();
      
      expect(dispatchSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('handles note submission error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAddPlantNote.mockRejectedValueOnce(new Error('Test Error'));

      // @ts-ignore
      await element._handleNoteSubmit({ detail: { text: 'FAIL', images: [] } } as any);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles event deletion flow', async () => {
      const dispatchSpy = vi.fn();
      element.addEventListener('growspace-refresh', dispatchSpy);
      
      // Trigger delete via internal method to set up state
      // @ts-ignore
      element._deleteEvent({ stopPropagation: () => {} } as any, 'event_123');
      expect((element as any)._deletingEventId).to.equal('event_123');

      // Confirm delete via event dispatch from dialog
      const dialog = element.shadowRoot?.querySelector('confirm-delete-dialog');
      expect(dialog).to.exist;
      dialog?.dispatchEvent(new CustomEvent('confirm'));
      
      // Wait for async handler
      await waitUntil(() => dispatchSpy.mock.calls.length > 0);
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('handles delete error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteEvent.mockRejectedValueOnce(new Error('Delete fail'));
      
      // @ts-ignore
      element._deletingEventId = 'fail_id';
      // @ts-ignore
      await element._confirmDeleteEvent();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns early in _handleNoteSubmit if noteInput is missing', async () => {
      const spy = vi.spyOn(element.shadowRoot!, 'querySelector').mockReturnValue(null);
      // @ts-ignore
      await element._handleNoteSubmit({ detail: {} } as any);
      // Should return early without calling service
      expect(mockAddPlantNote).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('returns early in _confirmDeleteEvent if no event id', async () => {
      // @ts-ignore
      element._deletingEventId = null;
      // @ts-ignore
      await element._confirmDeleteEvent();
      expect(mockDeleteEvent).not.toHaveBeenCalled();
    });

    it('uses mdiDumbbell for training action', () => {
      // @ts-ignore
      expect(element._getIcon({ type: 'action', action: 'training' })).to.equal(mdiDumbbell);
    });
  });
});
