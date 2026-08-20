import type { GrowspaceDevice } from '../types';

const ELIGIBLE_STAGES = ['flower', 'veg'];

export function getFlowerVegPlants(
  devices: GrowspaceDevice[]
): Array<{ plant_id: string; label: string }> {
  return devices.flatMap((device) =>
    device.plants
      .filter((p) => ELIGIBLE_STAGES.includes(p.attributes.stage))
      .map((p) => {
        const stage = p.attributes.stage;
        const stageDays = p.attributes[`${stage}_days` as keyof typeof p.attributes] as
          | number
          | null
          | undefined;
        const daysStr = stageDays != null ? ` · Day ${stageDays}` : '';
        const strain = p.attributes.strain ?? '';
        const phenotype = p.attributes.phenotype;
        const phenoStr = phenotype ? ` (${phenotype})` : '';
        const label = `${strain}${phenoStr} · ${stage}${daysStr} · ${device.name}`;
        return { plant_id: p.attributes.plant_id, label };
      })
  );
}

export function getPlantLabel(devices: GrowspaceDevice[], plant_id: string): string {
  for (const device of devices) {
    for (const p of device.plants) {
      if (p.attributes.plant_id === plant_id) {
        const strain = p.attributes.strain ?? '';
        const phenotype = p.attributes.phenotype;
        return phenotype ? `${strain} (${phenotype})` : strain || plant_id;
      }
    }
  }
  // Fall back to strain library for library-keyed donor IDs ("strain||phenotype")
  if (plant_id && plant_id.includes('||')) {
    const [strain, phenotype] = plant_id.split('||', 2);
    return phenotype ? `${strain} (${phenotype})` : strain || plant_id;
  }
  return plant_id;
}
