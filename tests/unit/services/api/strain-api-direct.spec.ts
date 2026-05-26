/**
 * StrainAPI direct unit tests.
 *
 * Tests StrainAPI methods through their public interface, exercising all branches
 * in strain-api.ts that were previously uncovered:
 *  - getStrainLibrary: direct lookup, O(N) fallback, array/object/empty formats
 *  - fetchStrainLibrary: wrapper schema, legacy schema, parse failure, exception
 *  - addStrain / updateStrainMeta: base64 image, path image, gallery, no image, error
 *  - removeStrain, exportStrainLibrary, clearStrainLibrary: success + error
 *  - updateBreeder / deleteBreeder: error paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrainAPI } from '../../../../src/services/api/strain-api';
import { HomeAssistant } from 'custom-card-helpers';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeHass(overrides: Partial<HomeAssistant> = {}): HomeAssistant {
  return {
    states: {},
    callService: vi.fn().mockResolvedValue(undefined),
    connection: {
      sendMessagePromise: vi.fn().mockResolvedValue({}),
    },
    fetchWithAuth: vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      text: async () => '',
      statusText: 'OK',
    }),
    ...overrides,
  } as unknown as HomeAssistant;
}

/** Minimal StrainDataSchema-compatible strain payload */
function makeStrainPayload(breeder = 'Test Breeder') {
  return {
    meta: {
      breeder,
      type: 'indica',
    },
    phenotypes: {
      default: {
        description: 'A test phenotype',
        flower_days_min: 56,
        flower_days_max: 63,
      },
    },
  };
}

// ── getStrainLibrary ──────────────────────────────────────────────────────────

describe('StrainAPI.getStrainLibrary', () => {
  it('returns [] when hass.states has no strain sensor', () => {
    const api = new StrainAPI(makeHass({ states: {} as any }));
    expect(api.getStrainLibrary()).toEqual([]);
  });

  it('uses direct O(1) lookup via sensor.strain_library', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: {
            strains: ['Gelato', 'OG Kush'],
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = api.getStrainLibrary();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ strain: 'Gelato', phenotype: '', key: 'Gelato|default' });
  });

  it('uses direct O(1) lookup via sensor.growspace_manager_strain_library', () => {
    const hass = makeHass({
      states: {
        'sensor.growspace_manager_strain_library': {
          entity_id: 'sensor.growspace_manager_strain_library',
          attributes: {
            strains: ['Blue Dream'],
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = api.getStrainLibrary();
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Blue Dream');
  });

  it('falls back to O(N) scan when known IDs are absent', () => {
    const hass = makeHass({
      states: {
        'sensor.custom_strain_sensor': {
          entity_id: 'sensor.custom_strain_sensor',
          attributes: {
            strains: ['Mystery Strain'],
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = api.getStrainLibrary();
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Mystery Strain');
  });

  it('returns [] when O(N) scan finds no sensor with strains', () => {
    const hass = makeHass({
      states: {
        'sensor.unrelated': {
          entity_id: 'sensor.unrelated',
          attributes: { temperature: 22 },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    expect(api.getStrainLibrary()).toEqual([]);
  });

  it('parses object format: builds StrainEntry per phenotype with all meta fields', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: {
            strains: {
              Gelato: {
                meta: {
                  breeder: 'Sherbinski',
                  type: 'hybrid',
                  lineage: 'Sunset Sherbet x Thin Mint GSC',
                  sex: 'feminized',
                  sativa_percentage: 45,
                  indica_percentage: 55,
                  is_stub: false,
                  lineage_tree: [{ name: 'Sunset Sherbet', source: 'unknown' }],
                },
                phenotypes: {
                  'pheno-1': {
                    description: 'Sweet and citrusy',
                    image_path: '/local/gelato.jpg',
                    flower_days_min: 56,
                    flower_days_max: 63,
                  },
                },
              },
            },
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const [entry] = api.getStrainLibrary();
    expect(entry.strain).toBe('Gelato');
    expect(entry.phenotype).toBe('pheno-1');
    expect(entry.key).toBe('Gelato|pheno-1');
    expect(entry.breeder).toBe('Sherbinski');
    expect(entry.type).toBe('hybrid');
    expect(entry.sativa_percentage).toBe(45);
    expect(entry.parents).toHaveLength(1);
    expect(entry.description).toBe('Sweet and citrusy');
    expect(entry.image).toBe('/local/gelato.jpg');
    expect(entry.flowering_days_min).toBe(56);
  });

  it('uses gallery thumbnail when images are present', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: {
            strains: {
              Strain: {
                meta: {},
                phenotypes: {
                  default: {
                    images: [
                      { path: '/local/thumb.jpg', is_thumbnail: true, crop_meta: { x: 0, y: 0, scale: 1 } },
                      { path: '/local/other.jpg', is_thumbnail: false },
                    ],
                  },
                },
              },
            },
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const [entry] = api.getStrainLibrary();
    expect(entry.image).toBe('/local/thumb.jpg');
    expect(entry.image_crop_meta).toMatchObject({ x: 0, y: 0, scale: 1 });
    expect(entry.images).toHaveLength(2);
  });

  it('falls back to first gallery image when no thumbnail is flagged', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: {
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
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const [entry] = api.getStrainLibrary();
    expect(entry.image).toBe('/local/first.jpg');
  });

  it('sorts strains by name then phenotype', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: {
            strains: {
              Zkittlez: { meta: {}, phenotypes: { 'b-cut': {}, 'a-cut': {} } },
              Gelato: { meta: {}, phenotypes: { default: {} } },
            },
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = api.getStrainLibrary();
    expect(result[0].strain).toBe('Gelato');
    expect(result[1].strain).toBe('Zkittlez');
    expect(result[1].phenotype).toBe('a-cut');
    expect(result[2].phenotype).toBe('b-cut');
  });

  it('returns [] when strains value is neither array nor object', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: { strains: 42 },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    expect(api.getStrainLibrary()).toEqual([]);
  });

  it('omits parents when lineage_tree is empty', () => {
    const hass = makeHass({
      states: {
        'sensor.strain_library': {
          entity_id: 'sensor.strain_library',
          attributes: {
            strains: {
              Strain: {
                meta: { lineage_tree: [] },
                phenotypes: { default: {} },
              },
            },
          },
        },
      } as any,
    });
    const api = new StrainAPI(hass);
    const [entry] = api.getStrainLibrary();
    expect(entry.parents).toBeUndefined();
  });
});

// ── fetchStrainLibrary ────────────────────────────────────────────────────────

describe('StrainAPI.fetchStrainLibrary', () => {
  it('returns strain entries via StrainLibraryWrapperSchema (happy path)', async () => {
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({
          strains: {
            Gelato: makeStrainPayload(),
          },
        }),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    expect(result).toHaveLength(1);
    expect(result[0].strain).toBe('Gelato');
    expect(result[0].breeder).toBe('Test Breeder');
  });

  it('strips wrapper response key before parsing', async () => {
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({
          response: 'ignored',
          strains: {
            Zkittlez: makeStrainPayload('Farm'),
          },
        }),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    expect(result[0].strain).toBe('Zkittlez');
  });

  it('falls back to StrainLibrarySchema (legacy flat format)', async () => {
    // StrainLibrarySchema = z.record(z.string(), StrainDataSchema)
    // i.e. the payload IS the strains record, no wrapper
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({
          OGKush: makeStrainPayload('Legacy Breeder'),
        }),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    expect(result[0].strain).toBe('OGKush');
    expect(result[0].breeder).toBe('Legacy Breeder');
  });

  it('returns [] when both schemas fail to parse', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue('not-an-object'),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    expect(result).toEqual([]);
    consoleWarn.mockRestore();
  });

  it('returns [] and logs error when sendMessagePromise throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockRejectedValue(new Error('WS timeout')),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    expect(result).toEqual([]);
    consoleError.mockRestore();
  });

  it('skips the "response" key when iterating strain names', async () => {
    // The loop guard `if (strainName === 'response') return;` fires when a strain
    // is literally named "response". Use a valid StrainDataSchema shape so that
    // schema parsing succeeds and the loop is reached.
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({
          strains: {
            response: makeStrainPayload('ShouldBeSkipped'),
            RealStrain: makeStrainPayload('Keeper'),
          },
        }),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    const names = result.map((e) => e.strain);
    expect(names).not.toContain('response');
    expect(names).toContain('RealStrain');
  });

  it('handles strain with no phenotypes (empty object fallback)', async () => {
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({
          strains: {
            NoPhenoStrain: { meta: { breeder: 'X' } },
          },
        }),
      } as any,
    });
    const api = new StrainAPI(hass);
    const result = await api.fetchStrainLibrary();
    // No phenotypes → no entries emitted for that strain
    expect(result).toEqual([]);
  });

  it('uses gallery thumbnail path in fetchStrainLibrary', async () => {
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockResolvedValue({
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
        }),
      } as any,
    });
    const api = new StrainAPI(hass);
    const [entry] = await api.fetchStrainLibrary();
    expect(entry.image).toBe('/local/thumb.jpg');
  });
});

// ── addStrain ─────────────────────────────────────────────────────────────────

describe('StrainAPI.addStrain', () => {
  it('sends image as image_path when image is a local path', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.addStrain({ strain: 'Gelato', image: '/local/gelato.jpg' });
    expect(hass.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'add_strain',
      expect.objectContaining({ image_path: '/local/gelato.jpg', strain: 'Gelato' }),
    );
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.image).toBeUndefined();
  });

  it('sends image as image_path when image is an http URL', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.addStrain({ strain: 'Gelato', image: 'https://example.com/img.jpg' });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.image_path).toBe('https://example.com/img.jpg');
    expect(payload.image).toBeUndefined();
  });

  it('sends image as image_base64 when image is a data URI', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.addStrain({ strain: 'Gelato', image: 'data:image/png;base64,abc' });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.image_base64).toBe('data:image/png;base64,abc');
    expect(payload.image).toBeUndefined();
  });

  it('sends gallery and drops image when images array is non-empty', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.addStrain({
      strain: 'Gelato',
      image: '/local/img.jpg',
      images: [{ path: '/local/gallery.jpg', is_thumbnail: true }],
    });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.images).toBeDefined();
    expect(payload.image).toBeUndefined();
  });

  it('cleans undefined keys from payload', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.addStrain({ strain: 'Gelato', phenotype: undefined });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect('phenotype' in payload).toBe(false);
  });

  it('throws when callService rejects', async () => {
    const hass = makeHass({
      callService: vi.fn().mockRejectedValue(new Error('service error')),
    });
    const api = new StrainAPI(hass);
    await expect(api.addStrain({ strain: 'X' })).rejects.toThrow('service error');
  });
});

// ── removeStrain ──────────────────────────────────────────────────────────────

describe('StrainAPI.removeStrain', () => {
  it('calls remove_strain service with strain and phenotype', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.removeStrain('OG Kush', 'pheno1');
    expect(hass.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_strain',
      { strain: 'OG Kush', phenotype: 'pheno1' },
    );
  });

  it('throws when callService rejects', async () => {
    const hass = makeHass({
      callService: vi.fn().mockRejectedValue(new Error('remove fail')),
    });
    const api = new StrainAPI(hass);
    await expect(api.removeStrain('OG Kush')).rejects.toThrow('remove fail');
  });
});

// ── exportStrainLibrary ───────────────────────────────────────────────────────

describe('StrainAPI.exportStrainLibrary', () => {
  it('calls export_strain_library service', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.exportStrainLibrary();
    expect(hass.callService).toHaveBeenCalledWith('growspace_manager', 'export_strain_library', {});
  });

  it('throws when callService rejects', async () => {
    const hass = makeHass({
      callService: vi.fn().mockRejectedValue(new Error('export fail')),
    });
    const api = new StrainAPI(hass);
    await expect(api.exportStrainLibrary()).rejects.toThrow('export fail');
  });
});

// ── importStrainLibrary ───────────────────────────────────────────────────────

describe('StrainAPI.importStrainLibrary', () => {
  it('returns { success: true } on successful import', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    const result = await api.importStrainLibrary(file, false);
    expect(result).toEqual({ success: true });
  });

  it('posts to correct endpoint with FormData', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await api.importStrainLibrary(file, true);
    expect(hass.fetchWithAuth).toHaveBeenCalledWith(
      '/api/growspace_manager/import_strains',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when response is not ok', async () => {
    const hass = makeHass({
      fetchWithAuth: vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'Bad Request',
        statusText: 'Bad Request',
      }),
    });
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await expect(api.importStrainLibrary(file, false)).rejects.toThrow('Bad Request');
  });

  it('throws with statusText when error body is empty', async () => {
    const hass = makeHass({
      fetchWithAuth: vi.fn().mockResolvedValue({
        ok: false,
        text: async () => '',
        statusText: 'Internal Server Error',
      }),
    });
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await expect(api.importStrainLibrary(file, false)).rejects.toThrow('Internal Server Error');
  });

  it('throws when result.success is false with an error message', async () => {
    const hass = makeHass({
      fetchWithAuth: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: 'Validation error' }),
      }),
    });
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await expect(api.importStrainLibrary(file, false)).rejects.toThrow('Validation error');
  });

  it('throws "Unknown import error" when result.success is false without error field', async () => {
    const hass = makeHass({
      fetchWithAuth: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      }),
    });
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await expect(api.importStrainLibrary(file, false)).rejects.toThrow('Unknown import error');
  });

  it('throws when fetchWithAuth itself throws', async () => {
    const hass = makeHass({
      fetchWithAuth: vi.fn().mockRejectedValue(new Error('network error')),
    });
    const api = new StrainAPI(hass);
    const file = new File(['{}'], 'lib.json', { type: 'application/json' });
    await expect(api.importStrainLibrary(file, false)).rejects.toThrow('network error');
  });
});

// ── clearStrainLibrary ────────────────────────────────────────────────────────

describe('StrainAPI.clearStrainLibrary', () => {
  it('calls clear_strain_library service', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.clearStrainLibrary();
    expect(hass.callService).toHaveBeenCalledWith('growspace_manager', 'clear_strain_library', {});
  });

  it('throws when callService rejects', async () => {
    const hass = makeHass({
      callService: vi.fn().mockRejectedValue(new Error('clear fail')),
    });
    const api = new StrainAPI(hass);
    await expect(api.clearStrainLibrary()).rejects.toThrow('clear fail');
  });
});

// ── updateBreeder (error path) ────────────────────────────────────────────────

describe('StrainAPI.updateBreeder', () => {
  it('throws when sendMessagePromise rejects', async () => {
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockRejectedValue(new Error('WS error')),
      } as any,
    });
    const api = new StrainAPI(hass);
    await expect(api.updateBreeder('Old', 'New')).rejects.toThrow('WS error');
  });
});

// ── deleteBreeder (error path) ────────────────────────────────────────────────

describe('StrainAPI.deleteBreeder', () => {
  it('throws when sendMessagePromise rejects', async () => {
    const hass = makeHass({
      connection: {
        sendMessagePromise: vi.fn().mockRejectedValue(new Error('delete WS error')),
      } as any,
    });
    const api = new StrainAPI(hass);
    await expect(api.deleteBreeder('SomeBreeder')).rejects.toThrow('delete WS error');
  });
});

// ── updateStrainMeta ──────────────────────────────────────────────────────────

describe('StrainAPI.updateStrainMeta', () => {
  it('calls update_strain_meta service with strain name', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.updateStrainMeta({ strain: 'OG', description: 'Nice' });
    expect(hass.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_strain_meta',
      expect.objectContaining({ strain: 'OG', description: 'Nice' }),
    );
  });

  it('sends image as image_path when image is a local path', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.updateStrainMeta({ strain: 'OG', image: '/local/og.jpg' });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.image_path).toBe('/local/og.jpg');
    expect(payload.image).toBeUndefined();
  });

  it('sends image as image_base64 when image is a data URI', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.updateStrainMeta({ strain: 'OG', image: 'data:image/png;base64,xyz' });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.image_base64).toBe('data:image/png;base64,xyz');
    expect(payload.image).toBeUndefined();
  });

  it('sends gallery and drops image when images array is non-empty', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.updateStrainMeta({
      strain: 'OG',
      image: '/local/og.jpg',
      images: [{ path: '/local/gallery.jpg', is_thumbnail: true }],
    });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.images).toBeDefined();
    expect(payload.image).toBeUndefined();
  });

  it('cleans undefined keys from payload', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.updateStrainMeta({ strain: 'OG', lineage: undefined });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect('lineage' in payload).toBe(false);
  });

  it('throws when callService rejects', async () => {
    const hass = makeHass({
      callService: vi.fn().mockRejectedValue(new Error('meta update fail')),
    });
    const api = new StrainAPI(hass);
    await expect(api.updateStrainMeta({ strain: 'OG' })).rejects.toThrow('meta update fail');
  });

  it('forwards extended fields like yield_potential and thc', async () => {
    const hass = makeHass();
    const api = new StrainAPI(hass);
    await api.updateStrainMeta({ strain: 'OG', yield_potential: 'high', thc: 25 });
    const payload = vi.mocked(hass.callService).mock.calls[0][2] as Record<string, unknown>;
    expect(payload.yield_potential).toBe('high');
    expect(payload.thc).toBe(25);
  });
});
