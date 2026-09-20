import { describe, expect, it } from 'vitest';

import capabilityFixture from '../../../tests/fixtures/contract/label_template_capability_v1.json';
import previewFixture from '../../../tests/fixtures/contract/label_factory_template_preview_v1.json';
import refusalFixture from '../../../tests/fixtures/contract/label_factory_template_preview_refused_v1.json';
import { diffContractKeys, formatContractDrift } from '../../contract-fixture/key-set-diff';
import {
  FactoryTemplatePreviewSchema,
  LABEL_CARD_CONTRACT,
  LabelTemplateCapabilitySchema,
  REQUIRED_LABEL_OPERATIONS,
} from './schema';

/** The recorded envelope, with one field changed. */
function capability(mutate: (value: Record<string, any>) => void): unknown {
  const copy = structuredClone(capabilityFixture) as Record<string, any>;
  mutate(copy);
  return copy;
}

describe('the recorded backend contract', () => {
  it('parses the capability the integration publishes', () => {
    const parsed = LabelTemplateCapabilitySchema.safeParse(capabilityFixture);
    expect(parsed.error?.message ?? 'ok').toBe('ok');
  });

  it('declares every field the capability carries', () => {
    const drift = diffContractKeys(
      LabelTemplateCapabilitySchema,
      capabilityFixture,
      'completeness'
    );
    expect(drift.map(formatContractDrift)).toEqual([]);
  });

  it('parses both halves of the preview union', () => {
    expect(FactoryTemplatePreviewSchema.safeParse(previewFixture).success).toBe(true);
    expect(FactoryTemplatePreviewSchema.safeParse(refusalFixture).success).toBe(true);
  });

  it('declares every field the preview carries', () => {
    const drift = diffContractKeys(FactoryTemplatePreviewSchema, previewFixture, 'completeness');
    expect(drift.map(formatContractDrift)).toEqual([]);
  });
});

describe('an envelope the card must refuse whole', () => {
  it('refuses a capability missing any required operation', () => {
    for (const operation of REQUIRED_LABEL_OPERATIONS) {
      const partial = capability((value) => {
        delete value.operations[operation];
      });
      expect(
        LabelTemplateCapabilitySchema.safeParse(partial).success,
        `${operation} was allowed to be missing`
      ).toBe(false);
    }
  });

  it('refuses an operation that is advertised but unavailable', () => {
    const dormant = capability((value) => {
      value.operations.batch_print.available = false;
    });
    expect(LabelTemplateCapabilitySchema.safeParse(dormant).success).toBe(false);
  });

  it('refuses another capability family', () => {
    const foreign = capability((value) => {
      value.contract.family = 'someone.else.label-templates';
    });
    expect(LabelTemplateCapabilitySchema.safeParse(foreign).success).toBe(false);
  });

  it('refuses a major contract this card does not implement', () => {
    const future = capability((value) => {
      value.contract.major = 2;
    });
    expect(LabelTemplateCapabilitySchema.safeParse(future).success).toBe(false);
  });

  it('refuses a backend that requires a card contract this build is not', () => {
    const demanding = capability((value) => {
      value.minimum_card_contract = 'growspace.label-templates-card.v2';
    });
    const parsed = LabelTemplateCapabilitySchema.safeParse(demanding);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.message).toContain(LABEL_CARD_CONTRACT);
  });

  it('refuses a Label Size whose Factory Template is not shipped', () => {
    const unfilled = capability((value) => {
      value.catalogues.label_sizes[0].factory_template_id = 'growspace.factory.nowhere';
    });
    expect(LabelTemplateCapabilitySchema.safeParse(unfilled).success).toBe(false);
  });

  it('refuses a profile naming an uncatalogued Label Size', () => {
    const orphaned = capability((value) => {
      value.catalogues.profiles[0].label_size_id = 'growspace.stock.99x99.v1';
    });
    expect(LabelTemplateCapabilitySchema.safeParse(orphaned).success).toBe(false);
  });

  it('refuses an empty catalogue', () => {
    const empty = capability((value) => {
      value.catalogues.bindings = [];
    });
    expect(LabelTemplateCapabilitySchema.safeParse(empty).success).toBe(false);
  });
});

describe('what a minor version may add', () => {
  it('accepts an added catalogue entry the card does not know', () => {
    const grown = capability((value) => {
      value.contract.minor = 1;
      value.supported.element_kinds.push('barcode');
      value.catalogues.style_tokens.fonts.push({
        id: 'growspace.sans.light.v1',
        description: 'Light sans',
      });
    });
    expect(LabelTemplateCapabilitySchema.safeParse(grown).success).toBe(true);
  });
});
