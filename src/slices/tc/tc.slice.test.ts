import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hassCall } from '../../services/hass-call';
import { WSError } from '../../services/errors';
import {
  createCultureMedium,
  cultureMedia$,
  deleteCultureMedium,
  detectTc,
  draftFromMedium,
  fetchCultureMedia,
  resetTcPresence,
  tcHasFeature,
  tcPresence$,
  updateCultureMedium,
  WS_TC_CREATE_CULTURE_MEDIUM,
  WS_TC_DELETE_CULTURE_MEDIUM,
  WS_TC_GET_MANIFEST,
  WS_TC_LIST_CULTURE_MEDIA,
  WS_TC_UPDATE_CULTURE_MEDIUM,
  type CultureMedium,
} from './index';
import { CultureMediaResponseSchema, CultureMediumSchema, TcManifestSchema } from './schema';

vi.mock('../../services/hass-call', () => ({
  hassCall: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const aManifest = (overrides: Record<string, unknown> = {}) => ({
  contract_version: 1,
  integration_version: '0.1.0',
  features: [],
  collections: {},
  ...overrides,
});

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
});

describe('detectTc', () => {
  it('reports TC present when the manifest command answers', async () => {
    hassCallMock.mockResolvedValue(aManifest({ features: ['culture_lines'] }));

    const presence = await detectTc();

    expect(hassCallMock).toHaveBeenCalledWith(WS_TC_GET_MANIFEST, {}, TcManifestSchema);
    expect(presence).toEqual({
      status: 'present',
      manifest: aManifest({ features: ['culture_lines'] }),
    });
    expect(tcPresence$.get()).toEqual(presence);
  });

  it('reports TC absent when the command is not registered', async () => {
    hassCallMock.mockRejectedValue(
      new WSError('internal_error', 'Unknown command growspace_manager_tc/get_manifest')
    );

    const presence = await detectTc();

    expect(presence.status).toBe('absent');
    expect(tcPresence$.get().status).toBe('absent');
  });

  it('reports TC absent when the entry is installed but not loaded', async () => {
    hassCallMock.mockRejectedValue(
      new WSError('internal_error', 'Growspace Manager TC is installed but has no loaded entry.')
    );

    expect((await detectTc()).status).toBe('absent');
  });

  it('probes once and shares the answer with every caller', async () => {
    hassCallMock.mockResolvedValue(aManifest());

    const [first, second] = await Promise.all([detectTc(), detectTc()]);

    expect(hassCallMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('does not re-probe after answering absent', async () => {
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'unknown command'));

    await detectTc();
    await detectTc();

    expect(hassCallMock).toHaveBeenCalledTimes(1);
  });
});

describe('tcHasFeature', () => {
  it('is false before anything has been detected', () => {
    expect(tcHasFeature('culture_lines')).toBe(false);
  });

  it('is false for a detected installation that does not serve the feature', async () => {
    hassCallMock.mockResolvedValue(aManifest({ features: ['media'] }));
    await detectTc();

    expect(tcHasFeature('culture_lines')).toBe(false);
  });

  it('is true only for a feature the manifest names', async () => {
    hassCallMock.mockResolvedValue(aManifest({ features: ['culture_lines', 'media'] }));
    await detectTc();

    expect(tcHasFeature('culture_lines')).toBe(true);
  });
});

describe('TcManifestSchema', () => {
  it('accepts the recorded backend payload', () => {
    const recorded = {
      collections: { culture_lines: 2, cultures: 1 },
      contract_version: 1,
      features: [],
      integration_version: '0.1.0',
    };

    expect(TcManifestSchema.parse(recorded)).toEqual(recorded);
  });

  it('strips keys it does not declare, per ADR 0031', () => {
    const parsed = TcManifestSchema.parse({ ...aManifest(), undeclared: 'ignored' });

    expect(parsed).not.toHaveProperty('undeclared');
  });
});

// ---------------------------------------------------------------------------
// The Culture Medium library
// ---------------------------------------------------------------------------

/** One version, exactly as the recorded backend fixture spells it. */
const aVersion = (version: number, overrides: Record<string, unknown> = {}) => ({
  version,
  created_at: `2026-0${version}-04T09:12:00+00:00`,
  base_salts: 'MS',
  additives: [{ name: 'myo-inositol', amount: 100, unit: 'mg/L' }],
  hormones: [{ name: 'BAP', amount: 0.5 * version, unit: 'mg/L' }],
  agar_g_per_l: 7,
  sugar_g_per_l: 30,
  ph_target: 5.8,
  notes: 'Autoclave 15 min at 121 °C.',
  ...overrides,
});

const aMedium = (overrides: Record<string, unknown> = {}): CultureMedium =>
  CultureMediumSchema.parse({
    id: 'medium-1',
    name: 'MS multiplication',
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-02-04T09:12:00+00:00',
    current_version: 2,
    versions: [aVersion(1), aVersion(2)],
    ...overrides,
  });

describe('the culture media schemas', () => {
  it('accept the recorded backend payload, history and all', () => {
    const recorded = { culture_media: [aMedium()] };

    const parsed = CultureMediaResponseSchema.parse(recorded);

    expect(parsed.culture_media[0].versions.map((version) => version.version)).toEqual([1, 2]);
    expect(parsed.culture_media[0].current_version).toBe(2);
  });

  it('strips keys they do not declare, per ADR 0031', () => {
    const parsed = CultureMediumSchema.parse({ ...aMedium(), undeclared: 'ignored' });

    expect(parsed).not.toHaveProperty('undeclared');
  });
});

describe('fetchCultureMedia', () => {
  it('publishes the library the backend sent', async () => {
    hassCallMock.mockResolvedValue({ culture_media: [aMedium()] });

    const media = await fetchCultureMedia();

    expect(hassCallMock).toHaveBeenCalledWith(
      WS_TC_LIST_CULTURE_MEDIA,
      {},
      CultureMediaResponseSchema
    );
    expect(media).toHaveLength(1);
    expect(cultureMedia$.get()).toEqual(media);
  });

  it('leaves the library alone when the call fails', async () => {
    cultureMedia$.set([aMedium()]);
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'nope'));

    await expect(fetchCultureMedia()).rejects.toThrow();
    expect(cultureMedia$.get()).toHaveLength(1);
  });
});

describe('createCultureMedium', () => {
  it('sends the draft flat and inserts what came back', async () => {
    const created = aMedium({ id: 'medium-2', name: 'B5 rooting' });
    hassCallMock.mockResolvedValue({ medium: created });
    cultureMedia$.set([aMedium()]);
    const draft = draftFromMedium(created);

    await createCultureMedium(draft);

    expect(hassCallMock.mock.calls[0][0]).toBe(WS_TC_CREATE_CULTURE_MEDIUM);
    expect(hassCallMock.mock.calls[0][1]).toEqual({ ...draft });
    expect(cultureMedia$.get().map((medium) => medium.name)).toEqual([
      'B5 rooting',
      'MS multiplication',
    ]);
  });
});

describe('updateCultureMedium', () => {
  it('replaces the medium with what the backend answered, rather than predicting it', async () => {
    const forked = aMedium({
      current_version: 3,
      versions: [aVersion(1), aVersion(2), aVersion(3)],
    });
    hassCallMock.mockResolvedValue({ medium: forked });
    cultureMedia$.set([aMedium()]);

    const updated = await updateCultureMedium('medium-1', draftFromMedium(aMedium()));

    expect(hassCallMock.mock.calls[0][0]).toBe(WS_TC_UPDATE_CULTURE_MEDIUM);
    expect(hassCallMock.mock.calls[0][1]).toMatchObject({ medium_id: 'medium-1' });
    expect(updated.versions).toHaveLength(3);
    expect(cultureMedia$.get()[0].current_version).toBe(3);
  });
});

describe('deleteCultureMedium', () => {
  it('drops the medium the backend says it removed', async () => {
    hassCallMock.mockResolvedValue({ medium_id: 'medium-1' });
    cultureMedia$.set([aMedium(), aMedium({ id: 'medium-2', name: 'B5 rooting' })]);

    await deleteCultureMedium('medium-1');

    expect(hassCallMock.mock.calls[0][0]).toBe(WS_TC_DELETE_CULTURE_MEDIUM);
    expect(cultureMedia$.get().map((medium) => medium.id)).toEqual(['medium-2']);
  });
});

describe('draftFromMedium', () => {
  it('starts a new medium on defaults nobody has to retype', () => {
    expect(draftFromMedium()).toEqual({
      name: '',
      base_salts: '',
      additives: [],
      hormones: [],
      agar_g_per_l: 7,
      sugar_g_per_l: 30,
      ph_target: 5.8,
      notes: '',
    });
  });

  it('starts an edit from the version a new plating would pin, not the newest row', () => {
    const medium = aMedium({
      current_version: 1,
      versions: [aVersion(2), aVersion(1)],
    });

    expect(draftFromMedium(medium).hormones).toEqual([{ name: 'BAP', amount: 0.5, unit: 'mg/L' }]);
  });

  it('copies the component lists, so editing a draft cannot mutate the library', () => {
    const medium = aMedium();

    const draft = draftFromMedium(medium);
    draft.hormones.push({ name: 'IBA', amount: 1, unit: 'mg/L' });

    expect(medium.versions[1].hormones).toHaveLength(1);
  });
});
