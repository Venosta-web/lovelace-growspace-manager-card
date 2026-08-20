import type { GrowspaceDevice } from '../services/types';

export interface FlowerFlipInfo {
  plantNames: string[];
  flowerStart: string;
  vegDayHours: number;
  flowerDayHours: number;
  autoLightTracking: boolean;
}

function toDateString(value: string): string {
  return value.slice(0, 10);
}

export function getFlowerFlipInfo(
  device: GrowspaceDevice,
  today: string,
  dismissedMap: Record<string, string>
): FlowerFlipInfo | null {
  const flippingPlants = device.plants.filter(
    (p) => p.attributes?.flower_start && toDateString(p.attributes.flower_start) === today
  );

  if (flippingPlants.length === 0) return null;

  const flowerStart = today;
  if (dismissedMap[device.deviceId] === flowerStart) return null;

  const plantNames = flippingPlants.map(
    (p) => p.attributes?.friendly_name ?? p.attributes?.strain ?? 'Unknown'
  );

  return {
    plantNames,
    flowerStart,
    vegDayHours: device.irrigationConfig?.vegDayHours ?? 18,
    flowerDayHours: 12,
    autoLightTracking: device.irrigationStrategy?.autoLightTracking ?? false,
  };
}
