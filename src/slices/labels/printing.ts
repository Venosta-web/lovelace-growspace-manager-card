/**
 * The six recovery calls: calibrate a printer, test print a draft, print one
 * real label.
 *
 * Contract-gated like the draft calls, through the same {@link gated}, and
 * with the same rule: nothing here retries. A refused print was refused under
 * one approval, one raster identity and one calibration; performing it again
 * under others and presenting the answer as the first one's is exactly the
 * substitution the approval exists to prevent. The caller routes the user to
 * the correction the refusal names — and the user presses Print again.
 */

import type { DraftAddress } from './drafts';
import { gated } from './gated';
import {
  CalibrationRecordedAnswerSchema,
  CalibrationSheetAnswerSchema,
  CalibrationStatusAnswerSchema,
  PrintedAnswerSchema,
  RecordPreviewAnswerSchema,
  type CalibrationRecordedAnswer,
  type CalibrationSheetAnswer,
  type CalibrationStatusAnswer,
  type PlacementMeasurement,
  type PrintedAnswer,
  type RecordPreviewAnswer,
} from './printing-schema';

const WS_GET_LABEL_CALIBRATION_STATUS = 'growspace_manager/get_label_calibration_status';
const WS_PRINT_LABEL_CALIBRATION_SHEET = 'growspace_manager/print_label_calibration_sheet';
const WS_RECORD_LABEL_CALIBRATION = 'growspace_manager/record_label_calibration';
const WS_TEST_PRINT_LABEL_TEMPLATE_DRAFT = 'growspace_manager/test_print_label_template_draft';
const WS_PREVIEW_LABEL_RECORD = 'growspace_manager/preview_label_record';
export const WS_PRINT_LABEL_RECORD = 'growspace_manager/print_label_record';

/** Which printer, and which of its profiles. The pair a calibration is of. */
export interface PrintTarget {
  profileId: string;
  deviceId: string;
  density?: string;
}

/** Has this printer been measured for this profile, and does it still hold? */
export function fetchCalibrationStatus(target: PrintTarget): Promise<CalibrationStatusAnswer> {
  return gated(
    WS_GET_LABEL_CALIBRATION_STATUS,
    { profile_id: target.profileId, device_id: target.deviceId },
    CalibrationStatusAnswerSchema
  );
}

/** Put the standardized calibration label on paper. Administrators only. */
export function printCalibrationSheet(target: PrintTarget): Promise<CalibrationSheetAnswer> {
  return gated(
    WS_PRINT_LABEL_CALIBRATION_SHEET,
    {
      profile_id: target.profileId,
      device_id: target.deviceId,
      ...(target.density ? { density: target.density } : {}),
    },
    CalibrationSheetAnswerSchema
  );
}

/**
 * Record what was read off the sheet the backend printed.
 *
 * Only the sheet's ID travels: its dependencies stayed on the backend, so the
 * numbers cannot be attached to a label that did not print.
 */
export function recordCalibration(
  sheetId: string,
  measurement: PlacementMeasurement,
  notes?: string | null
): Promise<CalibrationRecordedAnswer> {
  return gated(
    WS_RECORD_LABEL_CALIBRATION,
    { sheet_id: sheetId, measurement, ...(notes ? { notes } : {}) },
    CalibrationRecordedAnswerSchema
  );
}

/** Put the draft preview on screen on paper, exactly as approved. */
export function testPrintLabelTemplateDraft(
  address: DraftAddress,
  approval: { draftVersion: number; approvalId: string; rasterIdentity: string },
  deviceId: string
): Promise<PrintedAnswer> {
  return gated(
    WS_TEST_PRINT_LABEL_TEMPLATE_DRAFT,
    {
      label_size_id: address.labelSizeId,
      ...(address.templateId ? { template_id: address.templateId } : {}),
      expected_draft_version: approval.draftVersion,
      approval_id: approval.approvalId,
      expected_raster_identity: approval.rasterIdentity,
      device_id: deviceId,
    },
    PrintedAnswerSchema
  );
}

/** What to print, and on what. */
export interface RecordRequest {
  template: { kind: string; id: string; revision?: number | null };
  strain: string;
  phenotype?: string | null;
  profileId?: string | null;
  deviceId: string;
  density?: string;
  locale?: string;
}

/** Render one published layout for one saved strain, judged as the print will be. */
export function previewLabelRecord(request: RecordRequest): Promise<RecordPreviewAnswer> {
  return gated(
    WS_PREVIEW_LABEL_RECORD,
    {
      template: request.template,
      strain: request.strain,
      ...(request.phenotype ? { phenotype: request.phenotype } : {}),
      ...(request.profileId ? { profile_id: request.profileId } : {}),
      device_id: request.deviceId,
      ...(request.density ? { density: request.density } : {}),
      ...(request.locale ? { locale: request.locale } : {}),
    },
    RecordPreviewAnswerSchema
  );
}

/**
 * Print the record preview the operator approved.
 *
 * `anyway` is the operator's consent to print past the refusals the preview
 * reported as `override_available`; the approval already binds the raster.
 */
export function printLabelRecord(
  approvalId: string,
  rasterIdentity: string,
  anyway = false
): Promise<PrintedAnswer> {
  return gated(
    WS_PRINT_LABEL_RECORD,
    {
      approval_id: approvalId,
      expected_raster_identity: rasterIdentity,
      ...(anyway ? { override: true } : {}),
    },
    PrintedAnswerSchema
  );
}
