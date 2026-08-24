import { describe, it, expect, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import './strain-browse-view';
import { StrainBrowseView } from './strain-browse-view';
import type { StrainEntry } from '../types';

const stubTags = ['ha-dialog', 'ha-svg-icon', 'ha-icon', 'gs-help-tooltip'];
for (const tag of stubTags) {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
}

function makeStrain(overrides: Partial<StrainEntry> = {}): StrainEntry {
  return {
    key: overrides.key ?? 'k1',
    strain: overrides.strain ?? 'Test Strain',
    breeder: overrides.breeder ?? 'Breeder A',
    type: overrides.type ?? 'Hybrid',
    is_stub: overrides.is_stub ?? false,
    ...overrides,
  } as StrainEntry;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StrainBrowseView – Empty States', () => {
  describe('First-use empty state', () => {
    it('renders first-use guidance when strain library is empty', async () => {
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view .strains=${[]}></strain-browse-view>
      `);

      const container = el.shadowRoot?.querySelector('.empty-state-container');
      expect(container).not.toBeNull();

      const title = container?.querySelector('.empty-state-title');
      expect(title?.textContent?.trim()).toBe('Your Strain Library is empty');

      const subtitle = container?.querySelector('.empty-state-subtitle');
      expect(subtitle?.textContent?.trim()).toContain(
        'Start by creating your first strain or importing an existing library.'
      );

      const buttons = container?.querySelectorAll('.empty-state-actions button');
      expect(buttons?.length).toBe(2);
      expect(buttons?.[0]?.textContent?.trim()).toContain('Create first strain');
      expect(buttons?.[1]?.textContent?.trim()).toContain('Import library');
    });

    it('emits "new-strain" when Create first strain is clicked', async () => {
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view .strains=${[]}></strain-browse-view>
      `);

      let newStrainEmitted = false;
      el.addEventListener('new-strain', () => {
        newStrainEmitted = true;
      });

      const buttons = el.shadowRoot?.querySelectorAll<HTMLButtonElement>(
        '.empty-state-actions button'
      );
      buttons?.[0]?.click();

      expect(newStrainEmitted).toBe(true);
    });

    it('emits "import-requested" when Import library is clicked', async () => {
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view .strains=${[]}></strain-browse-view>
      `);

      let importEmitted = false;
      el.addEventListener('import-requested', () => {
        importEmitted = true;
      });

      const buttons = el.shadowRoot?.querySelectorAll<HTMLButtonElement>(
        '.empty-state-actions button'
      );
      buttons?.[1]?.click();

      expect(importEmitted).toBe(true);
    });
  });

  describe('Filter-empty state', () => {
    it('identifies the active filter and offers "Show all strains"', async () => {
      const strains = [makeStrain({ strain: 'Gorilla Glue', is_stub: false })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view
          .strains=${strains}
          .libraryFilter=${'active'}
          .activePlantCounts=${{}}
        ></strain-browse-view>
      `);

      const container = el.shadowRoot?.querySelector('.empty-state-container');
      expect(container).not.toBeNull();

      const title = container?.querySelector('.empty-state-title');
      expect(title?.textContent?.trim()).toBe('No strains match the "Active" filter');

      const subtitle = container?.querySelector('.empty-state-subtitle');
      expect(subtitle?.textContent?.trim()).toContain(
        'Try a different filter to see your strains.'
      );

      const button = container?.querySelector('.empty-state-actions button');
      expect(button?.textContent?.trim()).toBe('Show all strains');
    });

    it('emits filter-changed with { filter: "all" } when Show all strains is clicked', async () => {
      const strains = [makeStrain({ strain: 'Gorilla Glue', is_stub: false })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view
          .strains=${strains}
          .libraryFilter=${'active'}
          .activePlantCounts=${{}}
        ></strain-browse-view>
      `);

      let emittedDetail: unknown = null;
      el.addEventListener('filter-changed', (e: Event) => {
        emittedDetail = (e as CustomEvent).detail;
      });

      const button = el.shadowRoot?.querySelector<HTMLButtonElement>('.empty-state-actions button');
      button?.click();

      expect(emittedDetail).toEqual({ filter: 'all' });
    });
  });

  describe('Search-empty state', () => {
    it('displays original query casing and offers "Clear search"', async () => {
      const strains = [makeStrain({ strain: 'Northern Lights' })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view .strains=${strains} .libraryFilter=${'all'}></strain-browse-view>
      `);

      const searchInput = el.shadowRoot?.querySelector('md3-text-input');
      searchInput?.dispatchEvent(new CustomEvent('change', { detail: 'Purple Punch Haze' }));
      await el.updateComplete;

      const container = el.shadowRoot?.querySelector('.empty-state-container');
      expect(container).not.toBeNull();

      const title = container?.querySelector('.empty-state-title');
      expect(title?.textContent?.trim()).toBe('No strains match "Purple Punch Haze"');

      const subtitle = container?.querySelector('.empty-state-subtitle');
      expect(subtitle?.textContent?.trim()).toContain(
        'Check spelling or try a broader search term.'
      );

      const button = container?.querySelector('.empty-state-actions button');
      expect(button?.textContent?.trim()).toBe('Clear search');
    });

    it('clears the query when Clear search is clicked', async () => {
      const strains = [makeStrain({ strain: 'Northern Lights' })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view .strains=${strains} .libraryFilter=${'all'}></strain-browse-view>
      `);

      const searchInput = el.shadowRoot?.querySelector('md3-text-input');
      searchInput?.dispatchEvent(new CustomEvent('change', { detail: 'Unknown' }));
      await el.updateComplete;

      const clearBtn = el.shadowRoot?.querySelector<HTMLButtonElement>(
        '.empty-state-actions button'
      );
      clearBtn?.click();
      await el.updateComplete;

      // After clearing search, the strain card is rendered again
      const emptyContainer = el.shadowRoot?.querySelector('.empty-state-container');
      expect(emptyContainer).toBeNull();

      const card = el.shadowRoot?.querySelector('.strain-card');
      expect(card).not.toBeNull();
    });
  });

  describe('Combined-empty state (Search + Filter)', () => {
    it('displays both query casing and filter label with two recovery actions', async () => {
      const strains = [makeStrain({ strain: 'Northern Lights' })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view
          .strains=${strains}
          .libraryFilter=${'active'}
          .activePlantCounts=${{ 'Northern Lights': 1 }}
        ></strain-browse-view>
      `);

      const searchInput = el.shadowRoot?.querySelector('md3-text-input');
      searchInput?.dispatchEvent(new CustomEvent('change', { detail: 'Sour Diesel' }));
      await el.updateComplete;

      const container = el.shadowRoot?.querySelector('.empty-state-container');
      expect(container).not.toBeNull();

      const title = container?.querySelector('.empty-state-title');
      expect(title?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'No strains match "Sour Diesel" in Active'
      );

      const subtitle = container?.querySelector('.empty-state-subtitle');
      expect(subtitle?.textContent?.trim()).toContain('Remove the filter or broaden your search.');

      const buttons = container?.querySelectorAll('.empty-state-actions button');
      expect(buttons?.length).toBe(2);
      expect(buttons?.[0]?.textContent?.trim()).toBe('Clear search');
      expect(buttons?.[1]?.textContent?.trim()).toBe('Show all strains');
    });

    it('allows clearing search while keeping filter in combined empty state', async () => {
      const strains = [makeStrain({ strain: 'Northern Lights' })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view
          .strains=${strains}
          .libraryFilter=${'active'}
          .activePlantCounts=${{ 'Northern Lights': 1 }}
        ></strain-browse-view>
      `);

      const searchInput = el.shadowRoot?.querySelector('md3-text-input');
      searchInput?.dispatchEvent(new CustomEvent('change', { detail: 'NonExistent' }));
      await el.updateComplete;

      const buttons = el.shadowRoot?.querySelectorAll<HTMLButtonElement>(
        '.empty-state-actions button'
      );
      buttons?.[0]?.click(); // Clear search
      await el.updateComplete;

      // Filter is still 'active', and Northern Lights has active count 1, so it shows
      const emptyContainer = el.shadowRoot?.querySelector('.empty-state-container');
      expect(emptyContainer).toBeNull();
      const card = el.shadowRoot?.querySelector('.strain-card');
      expect(card).not.toBeNull();
    });

    it('allows resetting filter while keeping search in combined empty state', async () => {
      const strains = [makeStrain({ strain: 'Northern Lights' })];
      const el = await fixture<StrainBrowseView>(html`
        <strain-browse-view
          .strains=${strains}
          .libraryFilter=${'active'}
          .activePlantCounts=${{}}
        ></strain-browse-view>
      `);

      const searchInput = el.shadowRoot?.querySelector('md3-text-input');
      searchInput?.dispatchEvent(new CustomEvent('change', { detail: 'Northern' }));
      await el.updateComplete;

      let filterChangedDetail: unknown = null;
      el.addEventListener('filter-changed', (e: Event) => {
        filterChangedDetail = (e as CustomEvent).detail;
      });

      const buttons = el.shadowRoot?.querySelectorAll<HTMLButtonElement>(
        '.empty-state-actions button'
      );
      buttons?.[1]?.click(); // Show all strains

      expect(filterChangedDetail).toEqual({ filter: 'all' });
    });
  });
});
