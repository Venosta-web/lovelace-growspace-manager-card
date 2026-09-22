import { describe, expect, it } from 'vitest';
import snapshot from '../../../tests/fixtures/contract/label_management_snapshot_v1.json';
import deleted from '../../../tests/fixtures/contract/label_management_deleted_v1.json';
import inspected from '../../../tests/fixtures/contract/label_management_inspection_v1.json';
import preflight from '../../../tests/fixtures/contract/label_management_preflight_v1.json';
import { ManagementLibrarySchema, InspectionSchema, PreflightSchema } from './management';

describe('the lifecycle contract', () => {
  it.each([snapshot, deleted])(
    'declares the complete snapshot without dropping recovery fields',
    (value) => {
      expect(ManagementLibrarySchema.parse(value.library)).toEqual(value.library);
    }
  );
  it('declares complete inspection and preflight results', () => {
    expect(InspectionSchema.parse(inspected.result)).toEqual(inspected.result);
    expect(PreflightSchema.parse(preflight.result)).toEqual(preflight.result);
  });
  it('keeps newer documents opaque for inspection and export', () => {
    const library = structuredClone(snapshot.library);
    const newer = { ...library.drafts[0].document, future_property: { keep: true } };
    library.drafts[0].document = newer;
    library.drafts[0].layout_schema_version = 2;
    const parsed = ManagementLibrarySchema.parse(library).drafts[0];
    expect(parsed.layout_schema_version).toBe(2);
    expect(parsed.document).toEqual(newer);
  });
});
