import { fixture } from '@open-wc/testing-helpers';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import '../../../src/features/shared/ui/label-preview';
import type { LabelPreview } from '../../../src/features/shared/ui/label-preview';
import type { LabelSizeId, LabelFieldVisibility, LabelFieldValues } from '../../../src/lib/types/dialog';

const allFields: LabelFieldVisibility = {
  name: true, phenotype: true, breeder: true, lineage: true,
  startDate: true, stageAge: true, plantId: true, logo: false, qr: true,
};

const allValues: LabelFieldValues = {
  name: 'Maui Wowie',
  phenotype: 'Pheno A',
  breeder: 'Sensi Seeds',
  lineage: 'Sativa',
  startDate: '2024-01-01',
  stageAge: 'Day 14',
  plantId: 'P-001',
  logo: '',
};

async function makeLabel(props: Partial<{
  sizeId: LabelSizeId;
  fields: LabelFieldVisibility;
  values: LabelFieldValues;
  qrValue: string;
  density: 'low' | 'normal' | 'high';
  width: number;
}>): Promise<LabelPreview> {
  const { sizeId = '50x30', fields = allFields, values = allValues, qrValue = 'https://growspace.app', density = 'normal', width = 300 } = props;
  const el = await fixture<LabelPreview>(html`
    <label-preview
      .sizeId=${sizeId}
      .fields=${fields}
      .values=${values}
      .qrValue=${qrValue}
      .density=${density}
      style="width: ${width}px; display: block;"
    ></label-preview>
  `);
  await el.updateComplete;
  return el;
}

// Each size at normal density, all fields on
test('50x30 – all fields – normal density', async () => {
  const el = await makeLabel({ sizeId: '50x30' });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

test('40x30 – all fields – normal density', async () => {
  const el = await makeLabel({ sizeId: '40x30' });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

test('50x50 – all fields – normal density', async () => {
  const el = await makeLabel({ sizeId: '50x50', width: 250 });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

test('50x80 – all fields – normal density', async () => {
  const el = await makeLabel({ sizeId: '50x80', width: 200 });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

test('50x15 – all fields – normal density', async () => {
  const el = await makeLabel({ sizeId: '50x15', width: 350 });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

// Density variants on 50x30
test('50x30 – low density', async () => {
  const el = await makeLabel({ sizeId: '50x30', density: 'low' });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

test('50x30 – high density', async () => {
  const el = await makeLabel({ sizeId: '50x30', density: 'high' });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

// Key fields off
test('50x30 – name and QR off', async () => {
  const el = await makeLabel({ fields: { ...allFields, name: false, qr: false } });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

test('50x30 – all fields off', async () => {
  const el = await makeLabel({
    fields: { name: false, phenotype: false, breeder: false, lineage: false, startDate: false, stageAge: false, plantId: false, logo: false, qr: false },
  });
  await expect(page.elementLocator(el)).toMatchScreenshot();
});
