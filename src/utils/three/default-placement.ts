/**
 * Render-time default placement for 3D-heatmap equipment.
 *
 * When a device has no entry in `sensorCoordinates`, its renderer falls back to one of
 * these functions instead of bailing out. Positions are in HA coords (X = width 0→w,
 * Y = depth 0→d, Z = height 0→h); the renderer maps them to scene space. Nothing here is
 * persisted — dragging the item writes a real coordinate that overrides the default.
 *
 * Sensors (temperature/humidity/vpd) are intentionally absent: their position is the
 * heatmap's interpolation sample point, so a guessed default would produce a misleading
 * field. See ADR-0024.
 */

export interface TentDims {
  width: number;
  depth: number;
  height: number;
}

export interface DefaultCoord {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

/** Even fractional split that never lands on the walls: (i+1)/(count+1). */
function spread(index: number, count: number, span: number): number {
  return ((index + 1) / (count + 1)) * span;
}

/**
 * Lights hang just below the ceiling, centred over the canopy. A single light sits dead
 * centre; multiples spread across a `cols`×`rows` grid. The caller passes the same
 * `cols`/`rows` it computes for bar sizing so position and size agree.
 */
export function defaultLightCoords(
  index: number,
  cols: number,
  rows: number,
  dims: TentDims
): DefaultCoord {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: ((col + 0.5) / cols) * dims.width,
    y: ((row + 0.5) / rows) * dims.depth,
    z: dims.height * 0.9,
    rotation: 0,
  };
}

/** Exhaust mounts on the top edge of the back wall (y = depth), spread along the width. */
export function defaultExhaustCoords(index: number, count: number, dims: TentDims): DefaultCoord {
  return {
    x: spread(index, count, dims.width),
    y: dims.depth,
    z: dims.height,
    rotation: 0,
  };
}

/**
 * Circulation fans cycle the four corners (the renderer snaps x/y to the nearest wall, so
 * only corners are reachable) at upper-canopy height. Rotation 0 lets the renderer aim each
 * fan at the centre.
 */
export function defaultFanCoords(index: number, dims: TentDims): DefaultCoord {
  const corners: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [dims.width, dims.depth],
    [dims.width, 0],
    [0, dims.depth],
  ];
  const [x, y] = corners[index % corners.length];
  return { x, y, z: dims.height * 0.7, rotation: 0 };
}

/**
 * Humidifiers and dehumidifiers stand just outside the front wall (y < 0), which makes the
 * renderer draw a supply hose into the tent ending at canopy height (z = 0.5·h). Callers
 * pass a combined index/count across both lists so the units spread along the front without
 * overlapping (one hum + one dehum → w/3 and 2w/3).
 */
export function defaultClimateUnitCoords(
  combinedIndex: number,
  combinedCount: number,
  dims: TentDims
): DefaultCoord {
  return {
    x: spread(combinedIndex, combinedCount, dims.width),
    y: -40,
    z: dims.height * 0.5,
    rotation: 0,
  };
}

/** Pumps sit on the floor against the left wall (x = 0), beside the tanks that feed them. */
export function defaultPumpCoords(isDrain: boolean, dims: TentDims): DefaultCoord {
  return {
    x: 0,
    y: isDrain ? (2 * dims.depth) / 3 : dims.depth / 3,
    z: 0,
    rotation: 0,
  };
}

/** Tanks line the left wall (x = 0) on the floor, spread along its depth. */
export function defaultTankCoords(index: number, count: number, dims: TentDims): DefaultCoord {
  return {
    x: 0,
    y: spread(index, count, dims.depth),
    z: 0,
    rotation: 0,
  };
}
