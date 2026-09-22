import { describe, it, expect, vi, beforeEach } from 'vitest';

import { hassCall } from '../../services/hass-call';
import { WSError } from '../../services/errors';
import capabilityFixture from '../../../tests/fixtures/contract/label_template_capability_v1.json';
import previewFixture from '../../../tests/fixtures/contract/label_factory_template_preview_v1.json';
import refusalFixture from '../../../tests/fixtures/contract/label_factory_template_preview_refused_v1.json';
import {
  detectLabelTemplateSupport,
  recoverFromContractRefusal,
  labelSizeState,
  labelTemplateSupport$,
  negotiatedContract,
  previewFactoryTemplate,
  profilesForSize,
  reconcileChoice,
  rememberedPreviewCount,
  resetLabelTemplateSupport,
  WS_GET_LABEL_TEMPLATE_CAPABILITY,
  WS_PREVIEW_LABEL_FACTORY_TEMPLATE,
  type LabelTemplateCapability,
} from './index';

vi.mock('../../services/hass-call', () => ({ hassCall: vi.fn() }));

const hassCallMock = vi.mocked(hassCall);

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const PROFILED_SIZE = CAPABILITY.catalogues.profiles[0].label_size_id;
const UNPROFILED_SIZE = CAPABILITY.catalogues.label_sizes
  .map((size) => size.id)
  .find((id) => !CAPABILITY.catalogues.profiles.some((profile) => profile.label_size_id === id))!;

/** The recorded envelope, with one field changed. */
function capability(mutate: (value: Record<string, any>) => void): unknown {
  const copy = structuredClone(capabilityFixture) as Record<string, any>;
  mutate(copy);
  return copy;
}

async function available(): Promise<void> {
  hassCallMock.mockResolvedValueOnce(structuredClone(capabilityFixture));
  await detectLabelTemplateSupport();
  // The discovery round trip is scaffolding for the tests below; only the
  // commands they send themselves are interesting.
  hassCallMock.mockClear();
}

beforeEach(() => {
  resetLabelTemplateSupport();
  vi.clearAllMocks();
});

describe('deciding whether there is a template path at all', () => {
  it('reads the complete published envelope as available', async () => {
    hassCallMock.mockResolvedValue(structuredClone(capabilityFixture));

    const support = await detectLabelTemplateSupport();

    expect(support.status).toBe('available');
    expect(hassCallMock).toHaveBeenCalledWith(
      WS_GET_LABEL_TEMPLATE_CAPABILITY,
      {},
      expect.anything()
    );
    expect(labelTemplateSupport$.get().status).toBe('available');
  });

  it('falls to the Classic Path when the command does not exist', async () => {
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'Unknown command.'));

    const support = await detectLabelTemplateSupport();

    expect(support).toEqual({ status: 'classic', reason: 'Unknown command.' });
  });

  it('falls to the Classic Path when a new backend publishes nothing', async () => {
    // The backend refuses to advertise a partial capability, which over the
    // wire is the same silence an old one gives — and gets the same answer.
    hassCallMock.mockRejectedValue(
      new WSError('internal_error', 'The Label Template capability is unavailable')
    );

    expect((await detectLabelTemplateSupport()).status).toBe('classic');
  });

  it('reports an envelope it cannot use as incompatible, never as classic', async () => {
    hassCallMock.mockResolvedValue(
      capability((value) => {
        delete value.operations.batch_retry;
      })
    );

    const support = await detectLabelTemplateSupport();

    expect(support.status).toBe('incompatible');
    expect(support.status === 'incompatible' && support.reason).toContain('batch_retry');
  });

  it('reports a newer major contract as incompatible', async () => {
    hassCallMock.mockResolvedValue(
      capability((value) => {
        value.contract.major = 2;
      })
    );

    expect((await detectLabelTemplateSupport()).status).toBe('incompatible');
  });

  it('asks once per page load and shares the answer', async () => {
    hassCallMock.mockResolvedValue(structuredClone(capabilityFixture));

    const [first, second] = await Promise.all([
      detectLabelTemplateSupport(),
      detectLabelTemplateSupport(),
    ]);
    await detectLabelTemplateSupport();

    expect(hassCallMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('sends no new command before the capability is negotiated', async () => {
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'Unknown command.'));
    await detectLabelTemplateSupport();
    hassCallMock.mockClear();

    await expect(
      previewFactoryTemplate({
        labelSizeId: PROFILED_SIZE,
        fixtureFamily: 'typical',
        density: 'normal',
        locale: 'en',
      })
    ).rejects.toThrow(/not been negotiated/);
    expect(hassCallMock).not.toHaveBeenCalled();
  });
});

describe('what the catalogue truthfully says about a Label Size', () => {
  it('calls a size with no profile unprofiled rather than borrowing another', async () => {
    await available();
    expect(profilesForSize(CAPABILITY, UNPROFILED_SIZE)).toEqual([]);
    expect(labelSizeState(CAPABILITY, UNPROFILED_SIZE)).toBe('unprofiled');
  });

  it('calls a profile with no physical evidence provisional', () => {
    expect(labelSizeState(CAPABILITY, PROFILED_SIZE)).toBe('provisional');
  });

  it('separates verified-but-uncalibrated from production capable', () => {
    const verified = structuredClone(CAPABILITY);
    verified.catalogues.profiles[0].evidence = 'product_verified';
    expect(labelSizeState(verified, PROFILED_SIZE)).toBe('verified');

    verified.catalogues.profiles[0].authorizes_production = true;
    expect(labelSizeState(verified, PROFILED_SIZE)).toBe('production');
  });
});

describe('a choice reconciled against the capability that is current', () => {
  it('keeps a choice the catalogue still holds', () => {
    const choice = reconcileChoice(CAPABILITY, {
      labelSizeId: PROFILED_SIZE,
      fixtureFamily: 'long_content',
      density: 'high',
      locale: 'en',
    });
    expect(choice.labelSizeId).toBe(PROFILED_SIZE);
    expect(choice.fixtureFamily).toBe('long_content');
  });

  it('replaces a Label Size the catalogue no longer has', () => {
    const choice = reconcileChoice(CAPABILITY, { labelSizeId: 'growspace.stock.gone.v1' });
    expect(choice.labelSizeId).toBe(CAPABILITY.catalogues.label_sizes[0].id);
  });

  it('replaces an unsupported locale rather than sending it', () => {
    const choice = reconcileChoice(CAPABILITY, { locale: 'zxx-Zzzz' });
    expect(choice.locale).toBe(CAPABILITY.supported.locales[0]);
  });
});

describe('previewing a Factory Template', () => {
  const choice = {
    labelSizeId: PROFILED_SIZE,
    fixtureFamily: 'typical',
    density: 'normal',
    locale: 'en',
  };

  it('sends the negotiated contract identity with the request', async () => {
    await available();
    hassCallMock.mockResolvedValueOnce(structuredClone(previewFixture));

    await previewFactoryTemplate(choice);

    expect(hassCallMock).toHaveBeenLastCalledWith(
      WS_PREVIEW_LABEL_FACTORY_TEMPLATE,
      expect.objectContaining({ contract: negotiatedContract() }),
      expect.anything()
    );
  });

  it('remembers a rendered preview under the generation that made it', async () => {
    await available();
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));

    await previewFactoryTemplate(choice);
    await previewFactoryTemplate(choice);

    expect(hassCallMock).toHaveBeenCalledTimes(1);
    expect(rememberedPreviewCount()).toBe(1);
  });

  it('never serves a raster minted under another capability generation', async () => {
    await available();
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));
    await previewFactoryTemplate(choice);
    const generation = negotiatedContract()!.generation;

    // The generation the raster was cached under is part of its key, so a
    // capability that has moved on cannot reach it at all.
    await recoverFromContractRefusal({
      code: 'label_template.contract_incompatible',
      reason: 'stale',
      recovery: 'refresh_capability',
      current: { family: 'growspace.label-templates', major: 1, minor: 0, generation },
    });

    expect(rememberedPreviewCount()).toBe(0);
  });

  it('never caches a refusal', async () => {
    await available();
    hassCallMock.mockResolvedValue(structuredClone(refusalFixture));

    const answer = await previewFactoryTemplate(choice);

    expect(answer.outcome).toBe('refused');
    expect(rememberedPreviewCount()).toBe(0);
  });

  it('re-negotiates on a stale contract instead of retrying the refused call', async () => {
    await available();
    hassCallMock.mockResolvedValueOnce(structuredClone(refusalFixture));
    hassCallMock.mockResolvedValueOnce(structuredClone(capabilityFixture));

    const answer = await previewFactoryTemplate(choice);

    // The refusal is handed back to the caller, and exactly two commands were
    // sent: the one that was refused, and discovery. The refused operation is
    // never repeated on the card's own initiative.
    expect(answer.outcome).toBe('refused');
    expect(hassCallMock).toHaveBeenCalledTimes(2);
    expect(hassCallMock.mock.calls.map((call) => call[0])).toEqual([
      WS_PREVIEW_LABEL_FACTORY_TEMPLATE,
      WS_GET_LABEL_TEMPLATE_CAPABILITY,
    ]);
    expect(labelTemplateSupport$.get().status).toBe('available');
  });

  it('stays in one compatibility state when re-negotiation finds nothing usable', async () => {
    await available();
    hassCallMock.mockResolvedValueOnce(structuredClone(refusalFixture));
    // A backend that has templates but withholds its capability. The card must
    // not become an old-backend card and re-offer classic printing as recovery.
    hassCallMock.mockRejectedValueOnce(
      new WSError('internal_error', 'The Label Template capability is unavailable')
    );

    await previewFactoryTemplate(choice);

    const support = labelTemplateSupport$.get();
    expect(support.status).toBe('incompatible');
    expect(support.status === 'incompatible' && support.reason).toContain('stale');
    expect(negotiatedContract()).toBeNull();
  });

  it('starts no further operation while no contract is negotiated', async () => {
    await available();
    hassCallMock.mockResolvedValueOnce(structuredClone(refusalFixture));
    hassCallMock.mockRejectedValueOnce(new WSError('internal_error', 'unavailable'));
    await previewFactoryTemplate(choice);
    hassCallMock.mockClear();

    await expect(previewFactoryTemplate(choice)).rejects.toThrow(/not been negotiated/);
    expect(hassCallMock).not.toHaveBeenCalled();
  });
});
