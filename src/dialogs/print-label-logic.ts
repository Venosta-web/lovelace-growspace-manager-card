/**
 * The one derivation both print dialogs read a label off.
 *
 * A label's [[Label Field]] values and its [[QR Target]] URL are a property of
 * the plant, not of the dialog that happens to be printing it: the Print Label
 * Dialog prints one plant with a preview, the Batch Print Labels Dialog prints
 * many, and a label that differed between them would be a label the grower
 * could not trust. So the lookup, the precedence and the URL shape live here
 * rather than in either dialog's private methods.
 */
import type { PlantEntity } from '../features/plants/types';
import { activeDevices$ } from '../slices/grid';
import type { LabelFieldValues, QrTarget } from '../lib/types/dialog';

/**
 * What a dialog knows about a plant when the plant's own entity does not carry
 * it — the identity fields of `PrintLabelDialogState`, which is structurally
 * assignable to this.
 */
export interface LabelValueFallbacks {
  strainName?: string;
  phenotype?: string;
  breeder?: string;
  lineage?: string;
  breederLogo?: string;
}

/**
 * The plant a label is for, found across every active growspace by its
 * `plant_id` attribute and falling back to its entity id without the `sensor.`
 * prefix — the two shapes a plant id reaches a dialog in.
 */
export function findLabelPlant(plantId?: string): PlantEntity | null {
  if (!plantId) return null;
  for (const device of activeDevices$.get()) {
    const plant = device.plants.find(
      (p) => (p.attributes.plant_id || p.entity_id.replace('sensor.', '')) === plantId
    );
    if (plant) return plant;
  }
  return null;
}

/** A label's start date, in the viewer's locale; the raw string when it will not parse. */
export function formatLabelDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  } catch (_e) {
    return dateStr;
  }
}

/**
 * Every [[Label Field]] value for one plant: the plant's own attributes first,
 * the caller's fallbacks second, the empty string when neither has it.
 */
export function deriveLabelFieldValues(
  plantId?: string,
  fallbacks?: LabelValueFallbacks
): LabelFieldValues {
  const attrs = findLabelPlant(plantId)?.attributes;

  const startDate = attrs?.veg_start
    ? formatLabelDate(attrs.veg_start)
    : attrs?.flower_start
      ? formatLabelDate(attrs.flower_start)
      : '';

  const stageAge = attrs?.days_in_stage != null ? `Day ${attrs.days_in_stage}` : '';

  return {
    name: attrs?.strain ?? fallbacks?.strainName ?? '',
    phenotype: attrs?.phenotype ?? fallbacks?.phenotype ?? '',
    breeder: attrs?.breeder ?? fallbacks?.breeder ?? '',
    lineage: attrs?.lineage ?? fallbacks?.lineage ?? '',
    startDate,
    stageAge,
    plantId: plantId ?? '',
    logo: attrs?.breeder_logo ?? fallbacks?.breederLogo ?? '',
  };
}

/** The URL a label's QR code encodes, for the selected [[QR Target]]. */
export function buildQrTargetUrl(plantId: string | undefined, target: QrTarget): string {
  const id = plantId ?? '';
  return target === 'deeplink' ? `growspace://plant/${id}` : `https://growspace.app/plant/${id}`;
}
