/**
 * HeaderMetrics deep module — the single place in the codebase that computes
 * header chip arrays from the three slice atoms (environment, plant, irrigation).
 *
 * Public API (pure computation):
 *   computeHeaderMetrics() — derive hero + chips + dominant from slice data.
 *                            No hass parameter — all data comes from slice atoms.
 *
 * Re-exports HeaderChip and DominantStageInfo so callers don't need to import
 * from the legacy MetricsUtils.
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
} from '@mdi/js';
import { DateTime } from 'luxon';
import type { EnvSnapshot } from '../environment';
import type { PlantEntity } from '../../features/plants/types';
import type {
  IrrigationConfig,
  IrrigationScheduleItem,
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive header chips from the three slice data sources.
 *
 * Constraints:
 *  - Never imports or accesses hass / hass.states.
 *  - Device chips (exhaust, fan, humidifier, dehumidifier) are excluded — they
 *    require the future DeviceState slice (issue #144).
 */
export function computeHeaderMetrics(
  envSnapshot: EnvSnapshot | null,
  plants: PlantEntity[],
  irrigationConfig: IrrigationConfig | null,
  tankLevels: IrrigationTank[],
  viewContext: ViewContext,
  activeEnvGraphs: Set<string> = new Set(),
  linkedGraphGroups: string[][] = []
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
  const hero: HeaderChip[] = [];

  if (viewContext !== 'analytics') {
    if (envSnapshot?.temperature != null) {
      hero.push(
        _makeChip(
          MetricKey.TEMPERATURE,
          mdiThermometer,
          `${envSnapshot.temperature}°C`,
          {
            tooltip:
              'Current air temperature in the grow space. Optimal range: 20–28°C (68–82°F) during lights-on.',
          },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }

    if (envSnapshot?.humidity != null) {
      hero.push(
        _makeChip(
          MetricKey.HUMIDITY,
          mdiWaterPercent,
          `${envSnapshot.humidity}%`,
          {
            tooltip:
              'Relative humidity (RH). Target depends on growth stage — veg: 50–70%, flower: 40–55%, late flower: 35–45%.',
          },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }

    if (envSnapshot?.vpd != null) {
      hero.push(
        _makeChip(
          MetricKey.VPD,
          mdiCloudOutline,
          `${envSnapshot.vpd} kPa`,
          {
            status: envSnapshot.vpdStatus ?? undefined,
            tooltip:
              'Vapour Pressure Deficit — the balance between temperature and humidity. The key metric for transpiration. Veg: 0.8–1.2 kPa, flower: 1.0–1.6 kPa.',
          },
          activeEnvGraphs,
          linkedGraphGroups
        )
      );
    }

    if (envSnapshot?.co2 != null) {
      hero.push(
        _makeChip(
          MetricKey.CO2,
          mdiWeatherCloudy,
          `${envSnapshot.co2} ppm`,
          {
            tooltip:
              'CO₂ concentration. Ambient is ~400 ppm. Enriched grows target 800–1200 ppm with lights on for enhanced growth.',
          },
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

  // Irrigation / drain timing
  if (irrigationConfig) {
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

  return { hero, chips, dominant };
}
