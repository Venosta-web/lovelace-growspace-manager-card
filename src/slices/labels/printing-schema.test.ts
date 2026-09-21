/**
 * The recovery payloads, parsed by the schemas that will meet them.
 *
 * Each fixture is the backend's own recorded response. Parsing it here is the
 * point: a card whose schema drifted from the wire fails in CI rather than in
 * the middle of somebody calibrating a printer.
 */

import { describe, expect, it } from 'vitest';

import recordedFixture from '../../../tests/fixtures/contract/label_calibration_recorded_v1.json';
import sheetFixture from '../../../tests/fixtures/contract/label_calibration_sheet_v1.json';
import statusFixture from '../../../tests/fixtures/contract/label_calibration_status_v1.json';
import draftPreviewFixture from '../../../tests/fixtures/contract/label_draft_preview_v1.json';
import testPrintFixture from '../../../tests/fixtures/contract/label_draft_test_print_v1.json';
import refusedFixture from '../../../tests/fixtures/contract/label_print_refused_v1.json';
import recordPreviewFixture from '../../../tests/fixtures/contract/label_record_preview_v1.json';
import printedFixture from '../../../tests/fixtures/contract/label_record_printed_v1.json';
import { DraftPreviewSchema } from './draft-schema';
import {
  CalibrationRecordedAnswerSchema,
  CalibrationSheetAnswerSchema,
  CalibrationStatusAnswerSchema,
  PrintedAnswerSchema,
  RecordPreviewAnswerSchema,
} from './printing-schema';

describe('the recorded recovery payloads', () => {
  it('parses a calibration status, with the bounds its form is held to', () => {
    const parsed = CalibrationStatusAnswerSchema.parse(statusFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.calibration.state).toBe('absent');
    expect(parsed.bounds.quantum_mm).toBeGreaterThan(0);
  });

  it('parses a printed calibration sheet, naming only its held ID', () => {
    const parsed = CalibrationSheetAnswerSchema.parse(sheetFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.sheet_id).toBeTruthy();
    expect(parsed.print.source.kind).toBe('calibration');
  });

  it('parses a recorded calibration, current afterwards', () => {
    const parsed = CalibrationRecordedAnswerSchema.parse(recordedFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.calibration.state).toBe('current');
    expect(parsed.record.measurement.feed_mm).toBeTypeOf('number');
  });

  it('parses a draft preview carrying the approval a test print names', () => {
    const parsed = DraftPreviewSchema.parse(draftPreviewFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.approval_id).toBeTruthy();
  });

  it('parses a test print of a draft', () => {
    const parsed = PrintedAnswerSchema.parse(testPrintFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.print.operation).toBe('test_print');
    expect(parsed.print.source.published).toBe(false);
  });

  it('parses a record preview judged as the print will be', () => {
    const parsed = RecordPreviewAnswerSchema.parse(recordPreviewFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.decision.operation).toBe('single_print');
    expect(parsed.recovery).toBe('none');
    expect(parsed.approval_id).toBeTruthy();
  });

  it('parses a production print', () => {
    const parsed = PrintedAnswerSchema.parse(printedFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.print.operation).toBe('single_print');
  });

  it('parses a refused print with every blocker and the first correction', () => {
    const parsed = PrintedAnswerSchema.parse(refusedFixture);

    expect(parsed.outcome).toBe('refused');
    if (parsed.outcome !== 'refused') return;
    expect(parsed.refusal.blocked_by).toEqual(['result_not_current']);
    expect(parsed.refusal.recovery).toBe('refresh_preview');
  });
});
