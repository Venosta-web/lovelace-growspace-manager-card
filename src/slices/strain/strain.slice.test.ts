/**
 * Strain slice — unit tests.
 *
 * Tests cover:
 *   - atom defaults
 *   - setStrainLibrary (bootstrap write)
 *   - fetchStrainLibrary (WS call, atom update, error re-throw)
 *   - addStrain (service call, image payload routing)
 *   - removeStrain (service call, key parsing)
 *   - updateStrainMeta (service call, image payload routing)
 *   - exportStrainLibrary (service call)
 *   - importStrainLibrary (fetch call)
 *   - clearStrainLibrary (service call)
 *   - updateBreeder (WS call)
 *   - deleteBreeder (WS call)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import {
  strainLibrary$,
  setStrainLibrary,
  fetchStrainLibrary,
  addStrain,
  removeStrain,
  updateStrainMeta,
  exportStrainLibrary,
  importStrainLibrary,
  clearStrainLibrary,
  updateBreeder,
  deleteBreeder,
} from './index';
import type { StrainEntry } from '../../types';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  callFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
  setHass: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Reset atoms before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  setStrainLibrary([]);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Atom defaults
// ---------------------------------------------------------------------------

describe('strainLibrary$', () => {
  it('defaults to an empty array', () => {
    expect(strainLibrary$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// setStrainLibrary (bootstrap write)
// ---------------------------------------------------------------------------

describe('setStrainLibrary', () => {
  it('replaces strainLibrary$ with the provided array', () => {
    const entry: StrainEntry = {
      strain: 'Blue Dream',
      phenotype: 'default',
      key: 'Blue Dream|default',
    };
    setStrainLibrary([entry]);
    expect(strainLibrary$.get()).toEqual([entry]);
  });
});

// ---------------------------------------------------------------------------
// fetchStrainLibrary
// ---------------------------------------------------------------------------

describe('fetchStrainLibrary', () => {
  it('calls hassCall with the get_strain_library WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {},
    });

    await fetchStrainLibrary();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_strain_library',
      {},
      expect.anything()
    );
  });

  it('maps WS response to StrainEntry[] and updates strainLibrary$', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        'Blue Dream': {
          meta: { breeder: 'DJ Short', type: 'hybrid' },
          phenotypes: {
            default: { description: 'Classic Blue Dream' },
          },
        },
      },
    });

    await fetchStrainLibrary();

    const library = strainLibrary$.get();
    expect(library).toHaveLength(1);
    expect(library[0].strain).toBe('Blue Dream');
    expect(library[0].phenotype).toBe('default');
    expect(library[0].key).toBe('Blue Dream|default');
    expect(library[0].breeder).toBe('DJ Short');
    expect(library[0].description).toBe('Classic Blue Dream');
  });

  it('returns the parsed StrainEntry array', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        OG: { meta: {}, phenotypes: { pheno1: {} } },
      },
    });

    const result = await fetchStrainLibrary();

    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('OG');
  });

  it('sorts entries by strain name then phenotype', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        Zkittlez: { meta: {}, phenotypes: { b: {}, a: {} } },
        AK47: { meta: {}, phenotypes: { default: {} } },
      },
    });

    await fetchStrainLibrary();
    const library = strainLibrary$.get();

    expect(library[0].strain).toBe('AK47');
    expect(library[1].strain).toBe('Zkittlez');
    expect(library[1].phenotype).toBe('a');
    expect(library[2].phenotype).toBe('b');
  });

  it('does not update strainLibrary$ when hassCall fails', async () => {
    const original: StrainEntry = { strain: 'OG', phenotype: 'default', key: 'OG|default' };
    setStrainLibrary([original]);
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchStrainLibrary()).rejects.toThrow('ws error');

    expect(strainLibrary$.get()).toEqual([original]);
  });

  it('selects the gallery thumbnail when is_thumbnail is true', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        Strain: {
          meta: {},
          phenotypes: {
            default: {
              images: [
                { path: '/local/thumb.jpg', is_thumbnail: true },
                { path: '/local/other.jpg', is_thumbnail: false },
              ],
            },
          },
        },
      },
    });

    await fetchStrainLibrary();
    const [entry] = strainLibrary$.get();
    expect(entry.image).toBe('/local/thumb.jpg');
  });

  it('falls back to first gallery image when no thumbnail is flagged', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        Strain: {
          meta: {},
          phenotypes: {
            default: {
              images: [
                { path: '/local/first.jpg', is_thumbnail: false },
                { path: '/local/second.jpg', is_thumbnail: false },
              ],
            },
          },
        },
      },
    });

    await fetchStrainLibrary();
    const [entry] = strainLibrary$.get();
    expect(entry.image).toBe('/local/first.jpg');
  });

  it('skips a strain literally named "response"', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        response: { meta: {}, phenotypes: { default: {} } },
        RealStrain: { meta: {}, phenotypes: { default: {} } },
      },
    });

    await fetchStrainLibrary();
    const library = strainLibrary$.get();
    expect(library).toHaveLength(1);
    expect(library[0].strain).toBe('RealStrain');
  });

  it('emits no entries for a strain with no phenotypes', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({
      strains: {
        NoPhenoStrain: { meta: { breeder: 'X' } },
      },
    });

    await fetchStrainLibrary();
    expect(strainLibrary$.get()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addStrain
// ---------------------------------------------------------------------------

describe('addStrain', () => {
  it('calls callService with add_strain and the payload', async () => {
    await addStrain({ strain: 'Gelato', phenotype: 'pheno1', breeder: 'Cookies' });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_strain',
      expect.objectContaining({ strain: 'Gelato', phenotype: 'pheno1', breeder: 'Cookies' })
    );
  });

  it('sends images array and omits image field when gallery is provided', async () => {
    const images = [{ path: '/local/img.jpg', is_thumbnail: true }];
    await addStrain({ strain: 'Test', image: '/local/img.jpg', images });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_strain',
      expect.objectContaining({ images })
    );
    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call).not.toHaveProperty('image');
  });

  it('sends image_base64 and omits image for data: URLs', async () => {
    await addStrain({ strain: 'Test', image: 'data:image/png;base64,abc123' });

    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call).toHaveProperty('image_base64', 'data:image/png;base64,abc123');
    expect(call).not.toHaveProperty('image');
  });

  it('sends image_path and omits image for path/URL strings', async () => {
    await addStrain({ strain: 'Test', image: '/local/strain.jpg' });

    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call).toHaveProperty('image_path', '/local/strain.jpg');
    expect(call).not.toHaveProperty('image');
  });

  it('strips undefined keys from payload', async () => {
    await addStrain({ strain: 'Test', phenotype: undefined, breeder: 'Acme' });

    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call).not.toHaveProperty('phenotype');
    expect(call).toHaveProperty('breeder', 'Acme');
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('svc error'));

    await expect(addStrain({ strain: 'Test' })).rejects.toThrow('svc error');
  });
});

// ---------------------------------------------------------------------------
// removeStrain
// ---------------------------------------------------------------------------

describe('removeStrain', () => {
  it('calls callService with strain and phenotype parsed from key', async () => {
    await removeStrain('Blue Dream|default');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_strain',
      expect.objectContaining({ strain: 'Blue Dream' })
    );
    // 'default' phenotype is omitted (treated as no phenotype)
    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call?.phenotype).toBeUndefined();
  });

  it('includes phenotype in payload for non-default phenotypes', async () => {
    await removeStrain('Gelato|pheno1');

    expect(hassCallModule.callService).toHaveBeenCalledWith('growspace_manager', 'remove_strain', {
      strain: 'Gelato',
      phenotype: 'pheno1',
    });
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('remove err'));

    await expect(removeStrain('Test|default')).rejects.toThrow('remove err');
  });
});

// ---------------------------------------------------------------------------
// updateStrainMeta
// ---------------------------------------------------------------------------

describe('updateStrainMeta', () => {
  it('calls callService with update_strain_meta and the payload', async () => {
    await updateStrainMeta({ strain: 'OG', phenotype: 'pheno1', description: 'Nice' });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_strain_meta',
      expect.objectContaining({ strain: 'OG', description: 'Nice' })
    );
  });

  it('applies same image routing as addStrain', async () => {
    await updateStrainMeta({ strain: 'OG', image: 'data:image/png;base64,xyz' });

    const call = vi.mocked(hassCallModule.callService).mock.calls[0][2];
    expect(call).toHaveProperty('image_base64', 'data:image/png;base64,xyz');
    expect(call).not.toHaveProperty('image');
  });
});

// ---------------------------------------------------------------------------
// exportStrainLibrary
// ---------------------------------------------------------------------------

describe('exportStrainLibrary', () => {
  it('calls callService with export_strain_library', async () => {
    await exportStrainLibrary();

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'export_strain_library',
      {}
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('export err'));

    await expect(exportStrainLibrary()).rejects.toThrow('export err');
  });
});

// ---------------------------------------------------------------------------
// importStrainLibrary
// ---------------------------------------------------------------------------

describe('importStrainLibrary', () => {
  it('calls callFetch with the import endpoint and form data', async () => {
    const file = new File(['content'], 'strains.json', { type: 'application/json' });
    vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);

    const result = await importStrainLibrary(file, false);

    expect(hassCallModule.callFetch).toHaveBeenCalledWith(
      '/api/growspace_manager/import_strains',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.success).toBe(true);
  });

  it('throws when the response is not ok', async () => {
    const file = new File(['bad'], 'bad.json', { type: 'application/json' });
    vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Server error',
      statusText: 'Bad Request',
    } as unknown as Response);

    await expect(importStrainLibrary(file, true)).rejects.toThrow('Server error');
  });

  it('throws when success is false in the response body', async () => {
    const file = new File(['x'], 'x.json', { type: 'application/json' });
    vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, error: 'Duplicate strains' }),
    } as unknown as Response);

    await expect(importStrainLibrary(file, false)).rejects.toThrow('Duplicate strains');
  });

  it('throws with statusText when the error response body is empty', async () => {
    const file = new File(['x'], 'x.json', { type: 'application/json' });
    vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
      ok: false,
      text: async () => '',
      statusText: 'Internal Server Error',
    } as unknown as Response);

    await expect(importStrainLibrary(file, false)).rejects.toThrow('Internal Server Error');
  });

  it('throws "Unknown import error" when success is false with no error field', async () => {
    const file = new File(['x'], 'x.json', { type: 'application/json' });
    vi.mocked(hassCallModule.callFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    } as unknown as Response);

    await expect(importStrainLibrary(file, false)).rejects.toThrow('Unknown import error');
  });
});

// ---------------------------------------------------------------------------
// clearStrainLibrary
// ---------------------------------------------------------------------------

describe('clearStrainLibrary', () => {
  it('calls callService with clear_strain_library', async () => {
    await clearStrainLibrary();

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'clear_strain_library',
      {}
    );
  });

  it('re-throws when callService fails', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('clear err'));

    await expect(clearStrainLibrary()).rejects.toThrow('clear err');
  });
});

// ---------------------------------------------------------------------------
// updateBreeder
// ---------------------------------------------------------------------------

describe('updateBreeder', () => {
  it('calls hassCall with update_breeder WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await updateBreeder('Old Name', 'New Name');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_breeder',
      expect.objectContaining({ original_name: 'Old Name', new_name: 'New Name' }),
      expect.anything()
    );
  });

  it('includes logo in payload when provided', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await updateBreeder('Old', 'New', '/local/logo.png');

    const call = vi.mocked(hassCallModule.hassCall).mock.calls[0][1];
    expect(call).toHaveProperty('logo', '/local/logo.png');
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('breeder err'));

    await expect(updateBreeder('A', 'B')).rejects.toThrow('breeder err');
  });
});

// ---------------------------------------------------------------------------
// deleteBreeder
// ---------------------------------------------------------------------------

describe('deleteBreeder', () => {
  it('calls hassCall with delete_breeder WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await deleteBreeder('DJ Short');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/delete_breeder',
      { breeder_name: 'DJ Short' },
      expect.anything()
    );
  });

  it('re-throws when hassCall fails', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('del err'));

    await expect(deleteBreeder('DJ Short')).rejects.toThrow('del err');
  });
});
