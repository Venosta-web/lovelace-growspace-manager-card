import { MetricKey } from '../features/environment/constants';
import type { HeaderChip } from './metrics-utils';

export function filterChips(
  chips: HeaderChip[],
  hiddenKeys: MetricKey[] | undefined
): HeaderChip[] {
  if (!hiddenKeys?.length) return chips;
  return chips.filter((chip) => !hiddenKeys.includes(chip.key as MetricKey));
}
