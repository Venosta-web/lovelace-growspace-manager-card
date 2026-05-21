import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { StrainImportDialog } from '../../../src/dialogs/strain-import-dialog';

if (!customElements.get('strain-import-dialog')) {
  customElements.define('strain-import-dialog', StrainImportDialog);
}

describe('StrainImportDialog', () => {
  let element: StrainImportDialog;
  let mockHass: any;

  beforeEach(async () => {
    mockHass = {
      callWS: vi.fn(),
    };

    element = await fixture<StrainImportDialog>(html`
      <strain-import-dialog .hass=${mockHass}></strain-import-dialog>
    `);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', async () => {
    element.open = false;
    await element.updateComplete;
    // Lit might render a comment node or nothing
    const content = element.shadowRoot?.innerHTML.replace(/<!---->/g, '').trim();
    expect(content).toBe('');
  });

  it('initializes search when opened with initialStrain', async () => {
    mockHass.callWS.mockResolvedValue([]);
    element.initialStrain = 'Blue Dream';
    element.open = true;
    await element.updateComplete;

    expect((element as any)._searchQuery).toBe('Blue Dream');
    expect(mockHass.callWS).toHaveBeenCalledWith({
      type: 'growspace_manager/query_external_strain',
      query: 'Blue Dream',
    });
  });

  it('omits phenotype from search query when phenotype is "default"', async () => {
    mockHass.callWS.mockResolvedValue([]);
    element.initialStrain = 'OG Kush';
    element.initialPheno = 'default';
    element.open = true;
    await element.updateComplete;

    expect((element as any)._searchQuery).toBe('OG Kush');
    expect(mockHass.callWS).toHaveBeenCalledWith({
      type: 'growspace_manager/query_external_strain',
      query: 'OG Kush',
    });
  });

  it('includes non-default phenotype in search query', async () => {
    mockHass.callWS.mockResolvedValue([]);
    element.initialStrain = 'OG Kush';
    element.initialPheno = 'Alpha';
    element.open = true;
    await element.updateComplete;

    expect((element as any)._searchQuery).toBe('OG Kush Alpha');
  });

  it('handles search results', async () => {
    const mockResults = [
      { name: 'Blue Dream', breeder: 'HSO', url: 'url1' },
      { name: 'Blue Dream', breeder: 'Nirvana', url: 'url2' },
    ];
    mockHass.callWS.mockResolvedValue(mockResults);

    element.open = true;
    await element.updateComplete;
    (element as any)._searchQuery = 'Blue Dream';
    await (element as any)._search();
    await element.updateComplete;

    const resultItems = element.shadowRoot?.querySelectorAll('.result-item');
    expect(resultItems?.length).toBe(2);
    expect(resultItems?.[0].querySelector('.result-name')?.textContent).toBe('Blue Dream');
    expect(resultItems?.[0].querySelector('.result-breeder')?.textContent).toBe('HSO');
  });

  it('handles result selection and detail fetching', async () => {
    const mockDetails = {
      name: 'Blue Dream',
      breeder: 'HSO',
      type: 'Sativa dominant',
      indica_percentage: 30,
      sativa_percentage: 70,
      flowering_days: 65,
      description: 'A classic Sativa.',
      image: 'image.jpg',
    };
    mockHass.callWS.mockResolvedValue(mockDetails);

    element.open = true;
    await element.updateComplete;
    await (element as any)._selectResult({ name: 'Blue Dream', breeder: 'HSO', url: 'url1' });
    await element.updateComplete;

    expect(mockHass.callWS).toHaveBeenCalledWith({
      type: 'growspace_manager/get_external_strain_details',
      url: 'url1',
    });
    expect((element as any)._details).toEqual(mockDetails);
    
    const detailsPreview = element.shadowRoot?.querySelector('.details-preview');
    expect(detailsPreview).toBeTruthy();
    expect(detailsPreview?.textContent).toContain('Blue Dream');
  });

  it('toggles fields to import', async () => {
    element.open = true;
    await element.updateComplete;
    
    (element as any)._details = { name: 'Test' };
    await element.updateComplete;

    expect((element as any)._importFields.has('name')).toBe(true);
    
    // Toggle name off
    const nameField = Array.from(element.shadowRoot?.querySelectorAll('.field-row') || [])
      .find(el => el.textContent?.includes('Name'));
    expect(nameField).toBeTruthy();
    (nameField as HTMLElement)?.click();
    expect((element as any)._importFields.has('name')).toBe(false);

    // Toggle back on
    (nameField as HTMLElement)?.click();
    expect((element as any)._importFields.has('name')).toBe(true);
  });

  it('dispatches import event with selected fields', async () => {
    const mockDetails = {
      name: 'Blue Dream',
      breeder: 'HSO',
      type: 'Sativa dominant',
      indica_percentage: 30,
      sativa_percentage: 70,
      flowering_days: 65,
      description: 'A classic Sativa.',
      image: 'image.jpg',
    };
    element.open = true;
    await element.updateComplete;
    (element as any)._details = mockDetails;
    // Unselect some fields
    (element as any)._importFields.delete('image');
    (element as any)._importFields.delete('description');
    
    const importSpy = vi.fn();
    element.addEventListener('import', importSpy);

    (element as any)._import();

    expect(importSpy).toHaveBeenCalled();
    const eventDetail = importSpy.mock.calls[0][0].detail;
    expect(eventDetail.name).toBe('Blue Dream');
    expect(eventDetail.image).toBeUndefined();
    expect(eventDetail.description).toBeUndefined();
  });

  it('handles search errors', async () => {
    mockHass.callWS.mockRejectedValue(new Error('Network error'));
    
    element.open = true;
    await element.updateComplete;
    (element as any)._searchQuery = 'Blue Dream';
    await (element as any)._search();
    await element.updateComplete;

    const errorBox = element.shadowRoot?.querySelector('.error-box');
    expect(errorBox?.textContent).toBe('Network error');
  });

  it('handles detail fetching errors', async () => {
    mockHass.callWS.mockRejectedValue(new Error('Fetch failed'));
    
    element.open = true;
    await element.updateComplete;
    await (element as any)._selectResult({ name: 'Blue Dream', breeder: 'HSO', url: 'url1' });
    await element.updateComplete;

    const errorBox = element.shadowRoot?.querySelector('.error-box');
    expect(errorBox?.textContent).toBe('Fetch failed');
  });

  it('dispatches close event', async () => {
    element.open = true;
    await element.updateComplete;

    const closeSpy = vi.fn();
    element.addEventListener('close', closeSpy);

    const closeBtn = element.shadowRoot?.querySelector('.dialog-header button');
    (closeBtn as HTMLElement).click();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('updates search query on input change', async () => {
    element.open = true;
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('md3-text-input');
    input?.dispatchEvent(new CustomEvent('change', { detail: 'OG Kush' }));
    
    expect((element as any)._searchQuery).toBe('OG Kush');
  });

  it('triggers search on Enter key', async () => {
    const searchSpy = vi.spyOn(element as any, '_search');
    element.open = true;
    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('md3-text-input');
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    
    expect(searchSpy).toHaveBeenCalled();
  });

  it('resets state when opening', async () => {
    (element as any)._error = 'Some error';
    (element as any)._results = [{ name: 'Result', breeder: 'B', url: 'u' }];
    (element as any)._details = { name: 'Details' };
    
    element.open = true;
    await element.updateComplete;
    
    expect((element as any)._error).toBeNull();
    expect((element as any)._results).toEqual([]);
    expect((element as any)._details).toBeNull();
  });

  it('does not search if query is empty', async () => {
    mockHass.callWS.mockClear();
    (element as any)._searchQuery = '';
    await (element as any)._search();
    expect(mockHass.callWS).not.toHaveBeenCalled();
  });

  it('handles missing hass in search', async () => {
    element.hass = undefined as any;
    (element as any)._searchQuery = 'Blue Dream';
    await (element as any)._search();
    expect((element as any)._error).toBe('Home Assistant connection not available');
  });

  it('handles missing hass in detail fetching', async () => {
    element.hass = undefined as any;
    await (element as any)._selectResult({ name: 'Blue Dream', breeder: 'HSO', url: 'url1' });
    expect((element as any)._error).toBe('Home Assistant connection not available');
  });

  it('imports optional fields correctly', async () => {
    const mockDetails = {
      name: 'Blue Dream',
      breeder: 'HSO',
      type: 'Sativa dominant',
      indica_percentage: 30,
      sativa_percentage: 70,
      flowering_days: 65,
      description: 'A classic Sativa.',
      image: 'image.jpg',
      yield_potential: 'High',
      height: 'Tall',
      thc: 20,
      awards: ['Cup 1'],
      parents: { mother: 'P1' }
    };
    element.open = true;
    await element.updateComplete;
    (element as any)._details = mockDetails;
    
    const importSpy = vi.fn();
    element.addEventListener('import', importSpy);

    (element as any)._import();

    const eventDetail = importSpy.mock.calls[0][0].detail;
    expect(eventDetail.yield_potential).toBe('High');
    expect(eventDetail.height).toBe('Tall');
    expect(eventDetail.thc).toBe(20);
    expect(eventDetail.awards).toEqual(['Cup 1']);
    expect(eventDetail.parents).toEqual({ mother: 'P1' });
    expect(eventDetail.indica_percentage).toBe(30);
    expect(eventDetail.sativa_percentage).toBe(70);
  });

  it('renders "No results found" when search returns empty', async () => {
    mockHass.callWS.mockResolvedValue([]);
    element.open = true;
    await element.updateComplete;
    
    (element as any)._searchQuery = 'NonExistentStrain';
    await (element as any)._search();
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain('No results found for "NonExistentStrain"');
  });

  it('uses fallback error messages', async () => {
    mockHass.callWS.mockRejectedValue({}); // No message
    element.open = true;
    await element.updateComplete;
    
    (element as any)._searchQuery = 'Test';
    await (element as any)._search();
    await element.updateComplete;
    expect((element as any)._error).toBe('Search failed');

    mockHass.callWS.mockRejectedValue({});
    await (element as any)._selectResult({ url: 'url' });
    expect((element as any)._error).toBe('Failed to fetch details');
  });

  it('renders various detail fields and their "None" states', async () => {
    element.open = true;
    await element.updateComplete;

    const mockDetails = {
      name: 'Strain',
      breeder: 'Breeder',
      type: 'Type',
      // Missing composition, flowering, description, image, yield, height, thc, awards, parents
    };
    (element as any)._details = mockDetails;
    await element.updateComplete;

    const text = element.shadowRoot?.textContent;
    // Present fields render their values
    expect(text).toContain('Strain');
    expect(text).toContain('Breeder');
    // Optional fields with no data are not rendered at all (no Unknown/None placeholders)
    expect(element.shadowRoot?.querySelector('img.preview-image')).toBeNull();

    // Now with all fields
    (element as any)._details = {
      ...mockDetails,
      image: 'img.png',
      awards: ['Award 1'],
      description: 'Desc',
      parents: { mother: 'M' }
    };
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('img.preview-image')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('.award-tag')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('.description-text')).toBeTruthy();
    expect(element.shadowRoot?.textContent).toContain('Full lineage tree detected');
  });

  it('handles result item click in UI', async () => {
    const mockResults = [{ name: 'Blue Dream', breeder: 'HSO', url: 'url1' }];
    mockHass.callWS.mockResolvedValue(mockResults);
    element.open = true;
    await element.updateComplete;
    (element as any)._searchQuery = 'Blue';
    await (element as any)._search();
    await element.updateComplete;

    const selectSpy = vi.spyOn(element as any, '_selectResult');
    const resultItem = element.shadowRoot?.querySelector('.result-item');
    (resultItem as HTMLElement).click();
    expect(selectSpy).toHaveBeenCalledWith(mockResults[0]);
  });

  it('handles image field click in UI', async () => {
    const mockDetails = { name: 'S', breeder: 'B', type: 'T', image: 'img.png' };
    element.open = true;
    await element.updateComplete;
    (element as any)._details = mockDetails;
    await element.updateComplete;

    const toggleSpy = vi.spyOn(element as any, '_toggleField');
    const imageRow = element.shadowRoot?.querySelector('.field-row.full-width');
    (imageRow as HTMLElement).click();
    expect(toggleSpy).toHaveBeenCalledWith('image');
  });
});
