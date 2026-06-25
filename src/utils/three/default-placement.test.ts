import { describe, it, expect } from 'vitest';
import {
  defaultLightCoords,
  defaultExhaustCoords,
  defaultFanCoords,
  defaultClimateUnitCoords,
  defaultPumpCoords,
  defaultTankCoords,
  type TentDims,
} from './default-placement';

const dims: TentDims = { width: 120, depth: 120, height: 200 };

describe('defaultLightCoords', () => {
  it('centres a single light just below the ceiling', () => {
    expect(defaultLightCoords(0, 1, 1, dims)).toEqual({ x: 60, y: 60, z: 180, rotation: 0 });
  });

  it('spreads a 2x2 grid into cell centres', () => {
    expect(defaultLightCoords(0, 2, 2, dims)).toMatchObject({ x: 30, y: 30 });
    expect(defaultLightCoords(3, 2, 2, dims)).toMatchObject({ x: 90, y: 90 });
  });
});

describe('defaultExhaustCoords', () => {
  it('mounts a single exhaust on the back-wall top, centred', () => {
    expect(defaultExhaustCoords(0, 1, dims)).toEqual({ x: 60, y: 120, z: 200, rotation: 0 });
  });

  it('spreads multiple exhausts along the back-wall top edge', () => {
    expect(defaultExhaustCoords(0, 2, dims)).toMatchObject({ x: 40, y: 120, z: 200 });
    expect(defaultExhaustCoords(1, 2, dims)).toMatchObject({ x: 80, y: 120, z: 200 });
  });
});

describe('defaultFanCoords', () => {
  it('cycles the four corners at upper-canopy height', () => {
    expect(defaultFanCoords(0, dims)).toEqual({ x: 0, y: 0, z: 140, rotation: 0 });
    expect(defaultFanCoords(1, dims)).toMatchObject({ x: 120, y: 120 });
    expect(defaultFanCoords(2, dims)).toMatchObject({ x: 120, y: 0 });
    expect(defaultFanCoords(3, dims)).toMatchObject({ x: 0, y: 120 });
  });

  it('wraps back to the first corner after four', () => {
    expect(defaultFanCoords(4, dims)).toMatchObject({ x: 0, y: 0 });
  });
});

describe('defaultClimateUnitCoords', () => {
  it('places one hum + one dehum at w/3 and 2w/3 outside the front wall, canopy height', () => {
    expect(defaultClimateUnitCoords(0, 2, dims)).toEqual({ x: 40, y: -40, z: 100, rotation: 0 });
    expect(defaultClimateUnitCoords(1, 2, dims)).toMatchObject({ x: 80, y: -40, z: 100 });
  });
});

describe('defaultPumpCoords', () => {
  it('puts irrigation and drain pumps on the left wall, separated', () => {
    expect(defaultPumpCoords(false, dims)).toEqual({ x: 0, y: 40, z: 0, rotation: 0 });
    expect(defaultPumpCoords(true, dims)).toEqual({ x: 0, y: 80, z: 0, rotation: 0 });
  });
});

describe('defaultTankCoords', () => {
  it('keeps a single tank at the mid-left wall', () => {
    expect(defaultTankCoords(0, 1, dims)).toEqual({ x: 0, y: 60, z: 0, rotation: 0 });
  });

  it('spreads multiple tanks along the left wall depth', () => {
    expect(defaultTankCoords(0, 2, dims)).toMatchObject({ x: 0, y: 40 });
    expect(defaultTankCoords(1, 2, dims)).toMatchObject({ x: 0, y: 80 });
  });
});
