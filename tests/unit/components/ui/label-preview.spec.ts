import { describe, it, expect, afterEach } from 'vitest';
import type {
  LabelSizeId,
  PrintDensity,
  LabelFieldVisibility,
  LabelFieldValues,
} from '../../../../src/lib/types/dialog';
import { LabelPreview } from '../../../../src/features/shared/ui/label-preview';
import '../../../../src/features/shared/ui/label-preview';

const allFields: LabelFieldVisibility = {
  name: true,
  phenotype: true,
  breeder: true,
  lineage: true,
  startDate: true,
  stageAge: true,
  plantId: true,
  logo: true,
  qr: true,
};

const allValues: LabelFieldValues = {
  name: 'Maui Wowie',
  phenotype: 'Pheno A',
  breeder: 'Sensi Seeds',
  lineage: 'Sativa',
  startDate: '2024-01-01',
  stageAge: 'Day 14',
  plantId: 'P-001',
  logo: 'https://example.com/logo.png',
};

function createElement(props: {
  sizeId?: LabelSizeId;
  fields?: LabelFieldVisibility;
  values?: LabelFieldValues;
  qrValue?: string;
  density?: PrintDensity;
}): LabelPreview {
  const el = document.createElement('label-preview') as LabelPreview;
  el.sizeId = props.sizeId ?? '50x30';
  el.fields = props.fields ?? allFields;
  el.values = props.values ?? allValues;
  el.qrValue = props.qrValue ?? 'https://example.com';
  el.density = props.density ?? 'normal';
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('LabelPreview – layout mode', () => {
  it('sets data-layout="std" for 50x30', async () => {
    const el = createElement({ sizeId: '50x30' });
    await el.updateComplete;
    expect(el.getAttribute('data-layout')).toBe('std');
  });

  it('sets data-layout="std" for 40x30', async () => {
    const el = createElement({ sizeId: '40x30' });
    await el.updateComplete;
    expect(el.getAttribute('data-layout')).toBe('std');
  });

  it('sets data-layout="tall" for 50x50', async () => {
    const el = createElement({ sizeId: '50x50' });
    await el.updateComplete;
    expect(el.getAttribute('data-layout')).toBe('tall');
  });

  it('sets data-layout="tall" for 50x80', async () => {
    const el = createElement({ sizeId: '50x80' });
    await el.updateComplete;
    expect(el.getAttribute('data-layout')).toBe('tall');
  });

  it('sets data-layout="wide" for 50x15', async () => {
    const el = createElement({ sizeId: '50x15' });
    await el.updateComplete;
    expect(el.getAttribute('data-layout')).toBe('wide');
  });
});

describe('LabelPreview – density', () => {
  it('sets data-density="low" for low density', async () => {
    const el = createElement({ density: 'low' });
    await el.updateComplete;
    expect(el.getAttribute('data-density')).toBe('low');
  });

  it('sets data-density="normal" for normal density', async () => {
    const el = createElement({ density: 'normal' });
    await el.updateComplete;
    expect(el.getAttribute('data-density')).toBe('normal');
  });

  it('sets data-density="high" for high density', async () => {
    const el = createElement({ density: 'high' });
    await el.updateComplete;
    expect(el.getAttribute('data-density')).toBe('high');
  });
});

describe('LabelPreview – field visibility', () => {
  it('renders .field-name when name is true', async () => {
    const el = createElement({ fields: { ...allFields, name: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-name')).not.toBeNull();
  });

  it('omits .field-name when name is false', async () => {
    const el = createElement({ fields: { ...allFields, name: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-name')).toBeNull();
  });

  it('renders .field-phenotype when phenotype is true', async () => {
    const el = createElement({ fields: { ...allFields, phenotype: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-phenotype')).not.toBeNull();
  });

  it('omits .field-phenotype when phenotype is false', async () => {
    const el = createElement({ fields: { ...allFields, phenotype: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-phenotype')).toBeNull();
  });

  it('renders .field-breeder when breeder is true', async () => {
    const el = createElement({ fields: { ...allFields, breeder: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-breeder')).not.toBeNull();
  });

  it('omits .field-breeder when breeder is false', async () => {
    const el = createElement({ fields: { ...allFields, breeder: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-breeder')).toBeNull();
  });

  it('renders .field-lineage when lineage is true', async () => {
    const el = createElement({ fields: { ...allFields, lineage: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-lineage')).not.toBeNull();
  });

  it('omits .field-lineage when lineage is false', async () => {
    const el = createElement({ fields: { ...allFields, lineage: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-lineage')).toBeNull();
  });

  it('renders .field-startDate when startDate is true', async () => {
    const el = createElement({ fields: { ...allFields, startDate: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-startDate')).not.toBeNull();
  });

  it('omits .field-startDate when startDate is false', async () => {
    const el = createElement({ fields: { ...allFields, startDate: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-startDate')).toBeNull();
  });

  it('renders .field-stageAge when stageAge is true', async () => {
    const el = createElement({ fields: { ...allFields, stageAge: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-stageAge')).not.toBeNull();
  });

  it('omits .field-stageAge when stageAge is false', async () => {
    const el = createElement({ fields: { ...allFields, stageAge: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-stageAge')).toBeNull();
  });

  it('renders .field-plantId when plantId is true', async () => {
    const el = createElement({ fields: { ...allFields, plantId: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-plantId')).not.toBeNull();
  });

  it('omits .field-plantId when plantId is false', async () => {
    const el = createElement({ fields: { ...allFields, plantId: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-plantId')).toBeNull();
  });

  it('renders .field-logo img when logo is true', async () => {
    const el = createElement({ fields: { ...allFields, logo: true } });
    await el.updateComplete;
    const img = el.shadowRoot?.querySelector('.field-logo img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img?.src).toContain('example.com/logo.png');
  });

  it('omits .field-logo when logo is false', async () => {
    const el = createElement({ fields: { ...allFields, logo: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-logo')).toBeNull();
  });

  it('renders .field-qr svg when qr is true', async () => {
    const el = createElement({ fields: { ...allFields, qr: true } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-qr svg')).not.toBeNull();
  });

  it('omits .field-qr when qr is false', async () => {
    const el = createElement({ fields: { ...allFields, qr: false } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-qr')).toBeNull();
  });
});

describe('LabelPreview – corner markers', () => {
  it('renders four corner marker elements', async () => {
    const el = createElement({});
    await el.updateComplete;
    const markers = el.shadowRoot?.querySelectorAll('.corner-marker');
    expect(markers?.length).toBe(4);
  });
});

describe('LabelPreview – field values', () => {
  it('displays the strain name', async () => {
    const el = createElement({ values: { ...allValues, name: 'Purple Kush' } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-name')?.textContent?.trim()).toBe('Purple Kush');
  });

  it('displays the phenotype', async () => {
    const el = createElement({ values: { ...allValues, phenotype: 'Pheno B' } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-phenotype')?.textContent?.trim()).toBe('Pheno B');
  });

  it('displays the plant ID', async () => {
    const el = createElement({ values: { ...allValues, plantId: 'P-042' } });
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.field-plantId')?.textContent?.trim()).toBe('P-042');
  });
});
