import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hassCall } from '../../services/hass-call';
import { WSError } from '../../services/errors';
import { detectTc, resetTcPresence, tcHasFeature, tcPresence$, WS_TC_GET_MANIFEST } from './index';
import { TcManifestSchema } from './schema';

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
