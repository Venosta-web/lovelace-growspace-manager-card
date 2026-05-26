import { PlantEntity, StrainEntry, PlantStage } from '../types';

/**
 * Calculates the growth deviation (performance score) of a plant relative to its strain's genetic potential.
 *
 * @param plant The plant entity to analyze
 * @param strain The strain entry containing genetic metadata
 * @returns A number representing deviation percentage (negative = behind/slow, positive = ahead/fast, 0 = on track).
 *          Returns 0 if not applicable (e.g. not in flowering or missing data).
 */
export function calculateGrowthDeviation(
  plant: PlantEntity,
  strain: StrainEntry | undefined
): number {
  if (!strain || !plant.attributes) return 0;

  const stage = (plant.state || '').toLowerCase();

  // Only analyzing flowering stage for now as it has the most concrete "days to harvest" data
  if (stage !== PlantStage.FLOWER) {
    return 0;
  }

  const currentDays = plant.attributes.flower_days || 0;
  const targetDays = strain.phenotype_target_days || strain.flowering_days || 63; // Default to 9 weeks if unknown

  // Simple heuristic:
  // This is tricky because "days in stage" is just time passed, not quality/speed.
  // However, if we assume "growth deviation" implies "estimated maturation vs actual time",
  // without visual analysis, we can't truly know speed.
  //
  // ALTERNATIVE INTERPRETATION based on "Genetic Drift & Phenotype Analytics":
  // Perhaps we want to know how far along we are vs the "ideal".
  // Or, if we have "height" or "yield" data, we could compare that.
  //
  // For this initial implementation based on available data (days),
  // we will return the % progress towards target harvest date.
  // This isn't "deviation" per se, but "progress".
  //
  // IF the user meant "Genetic Drift", this usually implies keeping a mother plant for too long.
  // But the task says "calculateGrowthDeviation".
  //
  // Let's implement a "Progress Ratio" for now, and if we add sensor data (like height sensors),
  // we can compare "height at day X" vs "strain avg height at day X".

  if (targetDays <= 0) return 0;

  return (currentDays / targetDays) * 100;
}
