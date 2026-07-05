/**
 * HeaderMetrics deep module — the single place in the codebase that computes
 * header chip arrays from the slice atoms (environment, plant, irrigation,
 * device-state).
 *
 * Public API (pure computation):
 *   computeHeaderMetrics() — derive hero + chips + deviceChips + dominant from
 *                            slice data. No hass parameter — all data comes
 *                            from slice atoms.
 *
 * Canonical home of the HeaderChip and DominantStageInfo types (the legacy
 * MetricsUtils duplicate was deleted in #269).
 */

import {
  mdiThermometer,
  mdiWaterPercent,
  mdiCloudOutline,
  mdiWeatherCloudy,
  mdiWeatherSunny,
  mdiWater,
  mdiWaterMinus,
  mdiBarrel,
  mdiRadioboxMarked,
  mdiRadioboxBlank,
  mdiPh,
  mdiLightningBolt,
  mdiWaterPump,
  mdiFlash,
  mdiLightbulbOn,
  mdiLightbulbOff,
} from '@mdi/js';
import { DateTime } from 'luxon';
import type { EnvSnapshot, SensorReadings } from '../environment';
import type { DeviceEntry, DeviceSnapshot } from '../device-state';
import type { PlantEntity } from '../../features/plants/types';
import type {
  IrrigationConfig,
  IrrigationScheduleItem,
  IrrigationStrategy,
  IrrigationTank,
} from '../../services/types';
import { MetricKey } from '../../features/environment/constants';
import { PlantUtils } from '../../utils/plant-utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ViewContext = 'main' | 'subarea' | 'analytics';

/** A chip displayed in the growspace header. */
export interface HeaderChip {
  key: string;
  icon: string;
  value: string;
  multiValues?: string[];
  entityIds?: string[];
  label?: string;
  status?: string;
  tooltip?: string;
  active: boolean;
  linked: boolean;
  groupIndex: number;
}

/** Dominant plant stage summary shown next to the hero chips. */
export interface DominantStageInfo {
  icon: string;
  daysLabel: string;
  weeksLabel: string;
  color: string;
}

/** Return type of computeHeaderMetrics. */
export interface HeaderMetricsResult {
  /** Hero row: temperature, humidity, VPD, CO2. Empty for 'analytics' context. */
  hero: HeaderChip[];
  /** Secondary row: tank levels, irrigation timing, DLI, etc. */
  chips: HeaderChip[];
  /** Device row: light, exhaust, circulation fan, humidifier, dehumidifier. */
  deviceChips: HeaderChip[];
  /** Dominant stage derived from the plants array. */
  dominant: DominantStageInfo | undefined;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<string, string> = {
  flower: 'var(--stage-flower, #ff9800)',
  veg: 'var(--stage-veg, #4caf50)',
  seedling: 'var(--stage-seedling, #8bc34a)',
  clone: 'var(--stage-clone, #8bc34a)',
  mother: 'var(--stage-mother, #e91e63)',
  dry: 'var(--stage-dry, #9c27b0)',
  cure: 'var(--stage-cure, #2196f3)',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _isMetricLinked(key: string, groups: string[][]): { linked: boolean; groupIndex: number } {
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].includes(key)) return { linked: true, groupIndex: i };
  }
  return { linked: false, groupIndex: -1 };
}

interface ChipOpts {
  multiValues?: string[];
  entityIds?: string[];
  label?: string;
  status?: string;
  tooltip?: string;
}

function _makeChip(
  key: string,
  icon: string,
  value: string,
  opts: ChipOpts = {},
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][]
): HeaderChip {
  const { linked, groupIndex } = _isMetricLinked(key, linkedGraphGroups);
  const hasCompositeActive = Array.from(activeEnvGraphs).some((k) => k.startsWith(`${key}:`));
  const active = activeEnvGraphs.has(key) || hasCompositeActive;
  return {
    key,
    icon,
    value,
    multiValues: opts.multiValues,
    entityIds: opts.entityIds,
    label: opts.label,
    status: opts.status,
    tooltip: opts.tooltip,
    active,
    linked,
    groupIndex,
  };
}

/**
 * Build a secondary chip from a SensorReadings object.
 *
 * Returns null when readings is null (not configured) or all sensors are
 * unavailable (avg === null with no successful per-sensor readings).
 *
 * Follows the "Multiple + per-sensor" pattern: when more than one sensor ID is
 * configured the chip shows "Multiple" and carries the individual formatted
 * values in multiValues so the chip component can render them side-by-side.
 */
function _makeSensorReadingChip(
  key: string,
  icon: string,
  readings: SensorReadings | null,
  unit: string,
  opts: Omit<ChipOpts, 'multiValues' | 'entityIds'>,
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][],
  useSum = false
): HeaderChip | null {
  if (readings === null) return null;
  if (readings.avg === null && readings.perSensor.every((v) => v === null)) return null;

  const { entityIds, perSensor } = readings;

  if (entityIds.length > 1) {
    if (useSum) {
      const value = readings.sum !== null ? `${readings.sum.toFixed(1)}${unit}` : undefined;
      if (!value) return null;
      return _makeChip(key, icon, value, { ...opts, entityIds }, activeEnvGraphs, linkedGraphGroups);
    }
    const multiValues = perSensor.map((v) => (v !== null ? `${v.toFixed(1)}${unit}` : '-'));
    return _makeChip(
      key,
      icon,
      'Multiple',
      { ...opts, multiValues, entityIds },
      activeEnvGraphs,
      linkedGraphGroups
    );
  }

  const value = readings.avg !== null ? `${readings.avg.toFixed(1)}${unit}` : undefined;
  if (!value) return null;
  return _makeChip(key, icon, value, { ...opts, entityIds }, activeEnvGraphs, linkedGraphGroups);
}

/**
 * Build a hero chip from a SensorReadings object (subarea snapshots — the
 * growspace hero path uses backend-aggregated scalars instead).
 *
 * Mirrors the legacy MetricsUtils.computeSubareaMetrics display: values are
 * `toFixed(1)` with a space before the unit ("23.5 °C"), a single unavailable
 * sensor drops the chip, and multiple sensors show "Multiple" with per-sensor
 * formatted values ("-" for unavailable ones).
 */
function _makeHeroReadingChip(
  key: string,
  icon: string,
  readings: SensorReadings,
  unit: string,
  opts: Omit<ChipOpts, 'multiValues' | 'entityIds'>,
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][]
): HeaderChip | null {
  const { entityIds, perSensor } = readings;
  const fmt = (v: number | null) => (v !== null ? `${v.toFixed(1)} ${unit}`.trim() : '-');

  if (entityIds.length > 1) {
    return _makeChip(
      key,
      icon,
      'Multiple',
      { ...opts, multiValues: perSensor.map(fmt), entityIds },
      activeEnvGraphs,
      linkedGraphGroups
    );
  }

  if (perSensor[0] == null) return null;
  return _makeChip(
    key,
    icon,
    fmt(perSensor[0]),
    { ...opts, entityIds },
    activeEnvGraphs,
    linkedGraphGroups
  );
}

/** Return the next upcoming HH:MM from a schedule list, wrapping to tomorrow if past. */
function _getNextEvent(times: IrrigationScheduleItem[]): string | undefined {
  if (!times.length) return undefined;
  const now = DateTime.now();
  const upcoming = times
    .filter((t) => t.time || t.start_time)
    .map((t) => {
      const timeStr = (t.time ?? t.start_time)!;
      const parts = timeStr.split(':');
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      let dt = now.set({ hour: h, minute: m, second: 0 });
      if (dt <= now) dt = dt.plus({ days: 1 });
      return dt;
    })
    .sort((a, b) => a.toMillis() - b.toMillis())[0];
  return upcoming?.toFormat('HH:mm');
}

// ---------------------------------------------------------------------------
// Crop steering phase chip helpers
// ---------------------------------------------------------------------------

/**
 * Format HH:MM from minutes-since-midnight, handling wrap past midnight.
 */
function _minutesToHHMM(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Build the chip value and label for a crop-steering phase.
 *
 * P1 — ramp-up ends at targetVwcPercent (VWC-triggered, no time) → show VWC target.
 * P2 — ends when P3 starts (lights-off minus p2StopBeforeLightsOffMinutes) → show that time.
 * P3 — ends at next lights-on → show lightsOnTime.
 */
function _steeringChipValue(
  phase: 'p1' | 'p2' | 'p3',
  strategy: IrrigationStrategy,
  isFlower: boolean
): string {
  const lightHours = isFlower ? 12 : 18;
  const lightsOnParts = strategy.lightsOnTime.split(':');
  const lightsOnMin = Number(lightsOnParts[0]) * 60 + Number(lightsOnParts[1]);

  if (phase === 'p1') {
    return `P1 · ${strategy.targetVwcPercent}%`;
  }

  if (phase === 'p2') {
    const lightsOffMin = lightsOnMin + lightHours * 60;
    const p3StartMin = lightsOffMin - strategy.p2StopBeforeLightsOffMinutes;
    return `P2 · ${_minutesToHHMM(p3StartMin)}`;
  }

  // p3 — next lights-on
  return `P3 · ${_minutesToHHMM(lightsOnMin)}`;
}

// ---------------------------------------------------------------------------
// Tank level chip builder
// ---------------------------------------------------------------------------

type TankStatus = 'optimal' | 'warning' | 'danger' | undefined;

function _getTankDepletionStatus(
  hoursRemaining: number | null | undefined,
  depletionStatus: IrrigationTank['depletionStatus']
): TankStatus {
  if (depletionStatus === 'insufficient_data' || depletionStatus == null) return undefined;
  if (depletionStatus === 'static' || depletionStatus === 'refilling') return 'optimal';
  if (hoursRemaining == null) return undefined;
  if (hoursRemaining < 12) return 'danger';
  if (hoursRemaining < 24) return 'warning';
  if (hoursRemaining >= 48) return 'optimal';
  return undefined;
}

function _formatTimeRemaining(hours: number | null | undefined): string {
  if (hours == null) return '';
  if (hours >= 48) return ` ${Math.floor(hours / 24)}d`;
  return ` ${Math.round(hours)}h`;
}

function _buildTankChip(
  tanks: IrrigationTank[],
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][]
): HeaderChip | null {
  if (tanks.length === 0) return null;

  if (tanks.length === 1) {
    const tank = tanks[0];
    if (tank.fillLevel == null) return null;
    const fillPct = Math.round(tank.fillLevel);
    const timeStr = _formatTimeRemaining(tank.hoursRemaining);
    const status = _getTankDepletionStatus(tank.hoursRemaining, tank.depletionStatus);
    const tooltip =
      tank.hoursRemaining != null
        ? `${tank.name}: ${fillPct}% (${Math.round(tank.hoursRemaining)}h remaining)`
        : undefined;
    return _makeChip(
      MetricKey.IRRIGATION_TANK_LEVEL,
      mdiBarrel,
      `${fillPct}%${timeStr}`,
      { label: 'Tank', status, tooltip, entityIds: [tank.sensorEntity] },
      activeEnvGraphs,
      linkedGraphGroups
    );
  }

  // Multiple tanks: average fill level + individual multiValues
  const validLevels = tanks.filter((t) => t.fillLevel != null);
  if (validLevels.length === 0) return null;

  const multiValues = validLevels.map(
    (t) => `${Math.round(t.fillLevel!)}%${_formatTimeRemaining(t.hoursRemaining)}`
  );
  const avg = validLevels.reduce((sum, t) => sum + t.fillLevel!, 0) / validLevels.length;

  const statuses = tanks
    .map((t) => _getTankDepletionStatus(t.hoursRemaining, t.depletionStatus))
    .filter(Boolean) as TankStatus[];

  let status: TankStatus;
  if (statuses.includes('danger')) status = 'danger';
  else if (statuses.includes('warning')) status = 'warning';
  else if (statuses.includes('optimal')) status = 'optimal';

  return _makeChip(
    MetricKey.IRRIGATION_TANK_LEVEL,
    mdiBarrel,
    `${Math.round(avg)}%`,
    {
      label: 'Tank',
      status,
      multiValues,
      entityIds: tanks.map((t) => t.sensorEntity),
      tooltip: `${tanks.length} tanks`,
    },
    activeEnvGraphs,
    linkedGraphGroups
  );
}

/**
 * Tank-Derived Water Chip: calendar-day water consumption for a growspace in
 * Tank-Derived Water Mode. The backend supplies `litersToday` only in that mode
 * (no flow/drain sensors), so its presence is the mode signal; the `tanks > 0`
 * guard suppresses the 0-liter chip on an otherwise-unconfigured growspace.
 * Clicking it routes `MetricKey.WATER` to the Tank Water Chart (Custom Graph
 * Routing). See ADR-0020.
 */
function _buildWaterChip(
  litersToday: number | null,
  tanks: IrrigationTank[],
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][]
): HeaderChip | null {
  if (litersToday == null || tanks.length === 0) return null;
  return _makeChip(
    MetricKey.WATER,
    mdiWaterMinus,
    `${litersToday.toFixed(1)} L`,
    { label: 'Water', tooltip: 'Water consumed today, inferred from tank level' },
    activeEnvGraphs,
    linkedGraphGroups
  );
}

// ---------------------------------------------------------------------------
// Device chip builders
// ---------------------------------------------------------------------------

/**
 * Build a device chip directly from a DeviceEntry (already chip-shaped:
 * entityIds, aggregated value, multiValues, icon).
 *
 * Returns null when the category is not configured (entry === null). A
 * configured entry whose value is undefined (all entities unavailable) keeps
 * its chip with a "-" placeholder, matching the legacy MetricsUtils display.
 */
function _buildDeviceChip(
  key: string,
  label: string,
  entry: DeviceEntry | null,
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][]
): HeaderChip | null {
  if (entry === null) return null;
  return _makeChip(
    key,
    entry.icon,
    entry.value ?? '-',
    { multiValues: entry.multiValues, entityIds: entry.entityIds, label },
    activeEnvGraphs,
    linkedGraphGroups
  );
}

/** Display options for the light chip — the subarea context diverges from main. */
interface LightChipOpts {
  /** Chip label — the legacy subarea path labelled the chip 'Lights'; main has none. */
  label?: string;
  /**
   * Subarea display mode (legacy computeSubareaMetrics parity): subareas have
   * no overview is_lights_on flag, so the chip value falls back to the
   * DeviceEntry's normalized value ("On"/"Off"/"Multiple") and the default
   * icon is the legacy lit bulb instead of the flag-driven one.
   */
  preferEntryValue?: boolean;
}

/**
 * Build the light chip, replicating the legacy MetricsUtils display:
 *  - Single numeric reading (e.g. "70%" or "450"): show the reading; bulb icon
 *    follows reading > 0.
 *  - Otherwise fall back to the overview entity's is_lights_on flag
 *    (envSnapshot.isLightsOn — null means no light sensor): "On"/"Off" value
 *    and matching bulb icon. The fallback also covers a growspace with the
 *    flag but no configured light entities.
 *  - Multiple sensors: "Multiple" handling comes from the DeviceEntry's
 *    multiValues, value falls back to the is_lights_on flag.
 *  - Subarea (opts.preferEntryValue): the DeviceEntry value itself is the
 *    fallback instead of the absent is_lights_on flag.
 */
function _buildLightChip(
  entry: DeviceEntry | null,
  isLightsOn: boolean | null,
  activeEnvGraphs: Set<string>,
  linkedGraphGroups: string[][],
  opts: LightChipOpts = {}
): HeaderChip | null {
  let icon: string;
  if (opts.preferEntryValue) {
    icon = mdiLightbulbOn;
  } else {
    icon = isLightsOn === true ? mdiLightbulbOn : mdiLightbulbOff;
  }
  let value: string | undefined;

  if (entry !== null && entry.entityIds.length === 1 && entry.value !== undefined) {
    const numVal = parseFloat(entry.value);
    if (!isNaN(numVal)) {
      value = entry.value;
      icon = numVal > 0 ? mdiLightbulbOn : mdiLightbulbOff;
    } else if (isLightsOn === null && !opts.preferEntryValue) {
      // A single binary grow light actuator (light.*/switch.*) with no light
      // sensor to supply is_lights_on: render its On/Off state directly, else
      // the chip would be suppressed entirely.
      value = entry.value;
      icon = entry.value === 'Off' ? mdiLightbulbOff : mdiLightbulbOn;
    }
  }
  if (value === undefined && opts.preferEntryValue) {
    value = entry?.value;
  }
  if (value === undefined && isLightsOn !== null) {
    value = isLightsOn ? 'On' : 'Off';
  }

  const multiValues = entry?.multiValues;
  if (value === undefined && (!multiValues || multiValues.length === 0)) return null;

  return _makeChip(
    MetricKey.LIGHT,
    icon,
    value ?? '',
    { multiValues, entityIds: entry?.entityIds ?? [], label: opts.label },
    activeEnvGraphs,
    linkedGraphGroups
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive header chips from the slice data sources.
 *
 * Constraints:
 *  - Never imports or accesses hass / hass.states.
 *  - Device chips derive from the DeviceState slice's DeviceSnapshot; Fan
 *    Entity Mode detection (ADR-0008) stays in that slice's normalizers.
 *    deviceChips is empty when deviceSnapshot is null (trailing optional so
 *    existing call sites stay valid).
 */
export function computeHeaderMetrics(
  envSnapshot: EnvSnapshot | null,
  plants: PlantEntity[],
  irrigationConfig: IrrigationConfig | null,
  tankLevels: IrrigationTank[],
  viewContext: ViewContext,
  activeEnvGraphs: Set<string> = new Set(),
  linkedGraphGroups: string[][] = [],
  irrigationStrategy: IrrigationStrategy | null = null,
  deviceSnapshot: DeviceSnapshot | null = null,
  litersToday: number | null = null
): HeaderMetricsResult {
  // --- Dominant stage ---
  let dominant: DominantStageInfo | undefined;
  const dominantRaw = PlantUtils.getDominantStage(plants);
  if (dominantRaw) {
    const stageName = dominantRaw.stage.charAt(0).toUpperCase() + dominantRaw.stage.slice(1);
    const weeks = Math.floor((dominantRaw.days - 1) / 7) + 1;
    dominant = {
      icon: PlantUtils.getPlantStageIcon(dominantRaw.stage),
      daysLabel: `${dominantRaw.days} Day${dominantRaw.days !== 1 ? 's' : ''} ${stageName}`,
      weeksLabel: `${weeks} Week${weeks !== 1 ? 's' : ''} ${stageName}`,
      color: STAGE_COLORS[dominantRaw.stage] ?? '#4caf50',
    };
  }

  // --- Hero chips (env metrics — empty for 'analytics') ---
  // Each metric prefers per-sensor readings when the snapshot carries them
  // (subarea adapter) and falls back to the backend-aggregated scalar
  // (growspace adapter). The scalar path is unchanged.
  const hero: HeaderChip[] = [];

  if (viewContext !== 'analytics') {
    const tempTooltip =
      'Current air temperature in the grow space. Optimal range: 20–28°C (68–82°F) during lights-on.';
    if (envSnapshot?.temperatureReadings) {
      const chip = _makeHeroReadingChip(
        MetricKey.TEMPERATURE,
        mdiThermometer,
        envSnapshot.temperatureReadings,
        '°C',
        { label: 'Temperature', tooltip: tempTooltip },
        activeEnvGraphs,
        linkedGraphGroups
      );
      if (chip) hero.push(chip);
    } else if (envSnapshot?.temperature != null) {
      hero.push(
        _makeChip(
          MetricKey.TEMPERATURE,
          mdiThermometer,
          `${envSnapshot.temperature}°C`,
          { tooltip: tempTooltip },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }

    const humTooltip =
      'Relative humidity (RH). Target depends on growth stage — veg: 50–70%, flower: 40–55%, late flower: 35–45%.';
    if (envSnapshot?.humidityReadings) {
      const chip = _makeHeroReadingChip(
        MetricKey.HUMIDITY,
        mdiWaterPercent,
        envSnapshot.humidityReadings,
        '%',
        { label: 'Humidity', tooltip: humTooltip },
        activeEnvGraphs,
        linkedGraphGroups
      );
      if (chip) hero.push(chip);
    } else if (envSnapshot?.humidity != null) {
      hero.push(
        _makeChip(
          MetricKey.HUMIDITY,
          mdiWaterPercent,
          `${envSnapshot.humidity}%`,
          { tooltip: humTooltip },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }

    const vpdTooltip =
      'Vapour Pressure Deficit — the balance between temperature and humidity. The key metric for transpiration. Veg: 0.8–1.2 kPa, flower: 1.0–1.6 kPa.';
    if (envSnapshot?.vpdReadings) {
      const chip = _makeHeroReadingChip(
        MetricKey.VPD,
        mdiCloudOutline,
        envSnapshot.vpdReadings,
        'kPa',
        {
          label: 'VPD',
          status: envSnapshot.vpdStatus ?? undefined,
          tooltip: vpdTooltip,
        },
        activeEnvGraphs,
        linkedGraphGroups
      );
      if (chip) hero.push(chip);
    } else if (envSnapshot?.vpd != null) {
      hero.push(
        _makeChip(
          MetricKey.VPD,
          mdiCloudOutline,
          `${envSnapshot.vpd} kPa`,
          {
            status: envSnapshot.vpdStatus ?? undefined,
            tooltip: vpdTooltip,
          },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }

    const co2Tooltip =
      'CO₂ concentration. Ambient is ~400 ppm. Enriched grows target 800–1200 ppm with lights on for enhanced growth.';
    if (envSnapshot?.co2Readings) {
      const chip = _makeHeroReadingChip(
        MetricKey.CO2,
        mdiWeatherCloudy,
        envSnapshot.co2Readings,
        'ppm',
        { label: 'CO2', tooltip: co2Tooltip },
        activeEnvGraphs,
        linkedGraphGroups
      );
      if (chip) hero.push(chip);
    } else if (envSnapshot?.co2 != null) {
      hero.push(
        _makeChip(
          MetricKey.CO2,
          mdiWeatherCloudy,
          `${envSnapshot.co2} ppm`,
          { tooltip: co2Tooltip },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }
  }

  // --- Secondary chips ---
  const chips: HeaderChip[] = [];

  // Tank levels
  const tankChip = _buildTankChip(tankLevels, activeEnvGraphs, linkedGraphGroups);
  if (tankChip) chips.push(tankChip);

  // Tank-Derived Water Chip (calendar-day consumption; see ADR-0020)
  const waterChip = _buildWaterChip(
    litersToday,
    tankLevels,
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (waterChip) chips.push(waterChip);

  // Irrigation / drain timing
  if (irrigationConfig) {
    const steeringActive = irrigationStrategy?.enabled === true;

    if (steeringActive) {
      // Crop steering mode: show current phase + next phase-transition time (where calculable).
      // Drain schedule runs regardless of irrigation mode, so the drain chip is unaffected.
      const phase = irrigationConfig.activeSteeringPhase;
      if (phase != null) {
        const isFlower = dominantRaw?.stage === 'flower';
        const steeringChip = _makeChip(
          MetricKey.STEERING_PHASE,
          mdiWater,
          _steeringChipValue(phase, irrigationStrategy!, isFlower),
          { label: 'Phase' },
          activeEnvGraphs,
          linkedGraphGroups
        );
        // Promoted to the hero deck when a hero exists (main/subarea) — its click opens
        // the Substrate Model chart instead of the standard Env Graph (Custom Graph Routing).
        // The analytics view has no hero, so it keeps the chip in the secondary strip.
        if (viewContext !== 'analytics') {
          hero.push(steeringChip);
        } else {
          chips.push(steeringChip);
        }
      }
      // When phase is undefined (backend hasn't set it yet), omit the chip entirely rather
      // than fall back to the stale manual schedule.
    } else {
      const nextIrrigation = _getNextEvent(irrigationConfig.irrigationTimes);
      if (nextIrrigation != null) {
        chips.push(
          _makeChip(
            MetricKey.IRRIGATION,
            mdiWater,
            nextIrrigation,
            { label: 'Next' },
            activeEnvGraphs,
            linkedGraphGroups
          )
        );
      }
    }

    const nextDrain = _getNextEvent(irrigationConfig.drainTimes);
    if (nextDrain != null) {
      chips.push(
        _makeChip(
          MetricKey.DRAIN,
          mdiWaterMinus,
          nextDrain,
          { label: 'Next' },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }
  }

  // DLI
  if (envSnapshot?.dli != null) {
    chips.push(
      _makeChip(
        MetricKey.DLI,
        mdiWeatherSunny,
        String(envSnapshot.dli),
        {
          tooltip:
            'Daily Light Integral — total light energy received in a day (mol/m²/day). Veg: 20–40, flower: 40–65.',
        },
        activeEnvGraphs,
        linkedGraphGroups
      )
    );
  }

  // Optimal conditions
  if (envSnapshot?.optimalConditions != null) {
    const { isOptimal, reasons } = envSnapshot.optimalConditions;
    let optimalLabel = 'Optimal Conditions';
    if (!isOptimal) {
      optimalLabel = reasons.length > 0 ? `Not Optimal: ${reasons.join(', ')}` : 'Not Optimal';
    }
    chips.push(
      _makeChip(
        MetricKey.OPTIMAL,
        isOptimal ? mdiRadioboxMarked : mdiRadioboxBlank,
        optimalLabel,
        { status: isOptimal ? 'optimal' : 'warning' },
        activeEnvGraphs,
        linkedGraphGroups
      )
    );
  }

  // Substrate / medium sensors (Monitoring tab)
  const soilMoistureLabel = irrigationStrategy?.enabled ? 'VWC' : 'Moisture';
  const soilChip = _makeSensorReadingChip(
    MetricKey.SOIL_MOISTURE,
    mdiWaterPercent,
    envSnapshot?.soilMoisture ?? null,
    '%',
    { label: soilMoistureLabel, tooltip: 'Volumetric water content of the substrate.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (soilChip) chips.push(soilChip);

  const subTempChip = _makeSensorReadingChip(
    MetricKey.SUBSTRATE_TEMPERATURE,
    mdiThermometer,
    envSnapshot?.substrateTemperature ?? null,
    '°C',
    { label: 'Sub Temp', tooltip: 'Temperature inside the substrate / growing medium.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (subTempChip) chips.push(subTempChip);

  // Irrigation monitoring sensors (Irrigation tab)
  const phChip = _makeSensorReadingChip(
    MetricKey.PH,
    mdiPh,
    envSnapshot?.ph ?? null,
    '',
    { label: 'pH', tooltip: 'pH of the irrigation feed solution.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (phChip) chips.push(phChip);

  const feedEcChip = _makeSensorReadingChip(
    MetricKey.FEED_EC,
    mdiLightningBolt,
    envSnapshot?.feedEc ?? null,
    ' mS/cm',
    { label: 'Feed EC', tooltip: 'Electrical conductivity of the irrigation feed solution.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (feedEcChip) chips.push(feedEcChip);

  const bulkEcChip = _makeSensorReadingChip(
    MetricKey.BULK_EC,
    mdiLightningBolt,
    envSnapshot?.bulkEc ?? null,
    ' mS/cm',
    { label: 'Bulk EC', tooltip: 'Overall electrical conductivity of the substrate.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (bulkEcChip) chips.push(bulkEcChip);

  const poreEcChip = _makeSensorReadingChip(
    MetricKey.PORE_EC,
    mdiLightningBolt,
    envSnapshot?.poreEc ?? null,
    ' mS/cm',
    { label: 'Pore EC', tooltip: 'Electrical conductivity of water in the substrate pore space.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (poreEcChip) chips.push(poreEcChip);

  const runoffEcChip = _makeSensorReadingChip(
    MetricKey.RUNOFF_EC,
    mdiLightningBolt,
    envSnapshot?.runoffEc ?? null,
    ' mS/cm',
    { label: 'Runoff EC', tooltip: 'Electrical conductivity of drain / runoff water.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (runoffEcChip) chips.push(runoffEcChip);

  const drainVolChip = _makeSensorReadingChip(
    MetricKey.DRAIN_VOLUME,
    mdiWaterMinus,
    envSnapshot?.drainVolume ?? null,
    ' L',
    { label: 'Drain Vol', tooltip: 'Drain / runoff volume collected.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (drainVolChip) chips.push(drainVolChip);

  const flowChip = _makeSensorReadingChip(
    MetricKey.IRRIGATION_FLOW,
    mdiWaterPump,
    envSnapshot?.irrigationFlow ?? null,
    ' L/h',
    { label: 'Flow', tooltip: 'Irrigation flow rate.' },
    activeEnvGraphs,
    linkedGraphGroups
  );
  if (flowChip) chips.push(flowChip);

  const powerChip = _makeSensorReadingChip(
    MetricKey.POWER,
    mdiFlash,
    envSnapshot?.power ?? null,
    ' W',
    { label: 'Power', tooltip: 'Current power draw.' },
    activeEnvGraphs,
    linkedGraphGroups,
    true
  );
  if (powerChip) chips.push(powerChip);

  const energyChip = _makeSensorReadingChip(
    MetricKey.ENERGY,
    mdiFlash,
    envSnapshot?.energy ?? null,
    ' kWh',
    { label: 'Energy', tooltip: 'Energy consumed.' },
    activeEnvGraphs,
    linkedGraphGroups,
    true
  );
  if (energyChip) chips.push(energyChip);

  // --- Device chips (light, exhaust, circulation fan, humidifier, dehumidifier) ---
  // Same MetricKeys and order as the legacy MetricsUtils path so hidden_chips
  // configs and graph toggling are unaffected.
  const deviceChips: HeaderChip[] = [];

  if (deviceSnapshot !== null) {
    const candidates = [
      _buildLightChip(
        deviceSnapshot.lightSensors,
        envSnapshot?.isLightsOn ?? null,
        activeEnvGraphs,
        linkedGraphGroups,
        // The legacy subarea path labelled the chip and, lacking an
        // is_lights_on flag, showed the entity state directly.
        viewContext === 'subarea' ? { label: 'Lights', preferEntryValue: true } : {}
      ),
      _buildDeviceChip(
        MetricKey.EXHAUST,
        'Exhaust',
        deviceSnapshot.exhaustFans,
        activeEnvGraphs,
        linkedGraphGroups
      ),
      _buildDeviceChip(
        MetricKey.CIRCULATION_FAN,
        'Fan',
        deviceSnapshot.circulationFans,
        activeEnvGraphs,
        linkedGraphGroups
      ),
      _buildDeviceChip(
        MetricKey.HUMIDIFIER,
        'Humidifier',
        deviceSnapshot.humidifiers,
        activeEnvGraphs,
        linkedGraphGroups
      ),
      _buildDeviceChip(
        MetricKey.DEHUMIDIFIER,
        'Dehumidifier',
        deviceSnapshot.dehumidifiers,
        activeEnvGraphs,
        linkedGraphGroups
      ),
    ];
    for (const chip of candidates) {
      if (chip !== null) deviceChips.push(chip);
    }
  }

  return { hero, chips, deviceChips, dominant };
}
