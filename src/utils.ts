import {
  mdiSprout,
  mdiFlower,
  mdiHairDryer,
  mdiCannabis,
  mdiThermometer,
  mdiWaterPercent,
  mdiCloudOutline,
  mdiWeatherCloudy,
  mdiLightbulbOn,
  mdiLightbulbOff,
  mdiWater,
  mdiRadioboxMarked,
  mdiRadioboxBlank,
  mdiFan,
  mdiAirHumidifier,
  mdiAirHumidifierOff,
} from '@mdi/js';
import { HomeAssistant } from 'custom-card-helpers';
import { DateTime } from 'luxon';
import { PlantEntity, GrowspaceDevice, PlantStage, CropMeta, GrowspaceType, IrrigationTime } from './types';

export const PLANT_STAGES: PlantStage[] = [
  PlantStage.SEEDLING,
  PlantStage.MOTHER,
  PlantStage.CLONE,
  PlantStage.VEG,
  PlantStage.FLOWER,
  PlantStage.DRY,
  PlantStage.CURE,
];

export class PlantUtils {
  private static readonly stageColors: Record<PlantStage, string> = {
    [PlantStage.MOTHER]: '#E91E63',
    [PlantStage.CLONE]: '#FF5722',
    [PlantStage.SEEDLING]: '#4CAF50',
    [PlantStage.VEG]: '#8BC34A',
    [PlantStage.FLOWER]: '#FF9800',
    [PlantStage.DRY]: '#795548',
    [PlantStage.CURE]: '#9C27B0',
  };

  private static readonly stageIcons: Record<PlantStage, string> = {
    [PlantStage.MOTHER]: mdiSprout,
    [PlantStage.CLONE]: mdiSprout,
    [PlantStage.SEEDLING]: mdiSprout,
    [PlantStage.VEG]: mdiSprout,
    [PlantStage.FLOWER]: mdiFlower,
    [PlantStage.DRY]: mdiHairDryer,
    [PlantStage.CURE]: mdiCannabis,
  };

  private static normalizeStage(state: PlantStage | string): PlantStage {
    const lower = state.toLowerCase();
    if (lower === 'veg' || lower === 'vegetative') return PlantStage.VEG;
    if (lower === 'mom') return PlantStage.MOTHER;
    // Add other aliases if necessary
    return lower as PlantStage;
  }

  static getPlantStageColor(state: PlantStage | string): string {
    const key = this.normalizeStage(state);
    return this.stageColors[key] ?? '#757575';
  }

  static getPlantStageIcon(state: PlantStage | string): string {
    const key = this.normalizeStage(state);
    return this.stageIcons[key] ?? mdiSprout;
  }

  // --- helpers at the top ---
  static getPlantStage(plant: PlantEntity): PlantStage {
    const attrs = plant?.attributes ?? {};
    const now = new Date();

    if (attrs.cure_start) return PlantStage.CURE;
    if (attrs.dry_start) return PlantStage.DRY;
    if (attrs.mom_start) return PlantStage.MOTHER;
    if (attrs.clone_start) return PlantStage.CLONE;
    if (attrs.flower_start && new Date(attrs.flower_start) <= now) return PlantStage.FLOWER;
    if (attrs.veg_start && new Date(attrs.veg_start) <= now) return PlantStage.VEG;

    return PlantStage.SEEDLING;
  }

  static calculatePlantAge(plant: PlantEntity): number {
    if (!plant || !plant.attributes) return 0;
    const stage = this.getPlantStage(plant);
    const attrs = plant.attributes;
    let startStr: string | undefined | null;

    switch (stage) {
      case PlantStage.FLOWER:
        startStr = attrs.flower_start;
        break;
      case PlantStage.VEG:
        startStr = attrs.veg_start;
        break;
      case PlantStage.MOTHER:
        startStr = attrs.mom_start;
        break;
      case PlantStage.CLONE:
        startStr = attrs.clone_start;
        break;
      case PlantStage.DRY:
        startStr = attrs.dry_start;
        break;
      case PlantStage.CURE:
        startStr = attrs.cure_start;
        break;
      case PlantStage.SEEDLING:
        startStr = attrs.planted_date;
        break;
    }

    if (!startStr) return 0;
    const start = new Date(startStr);
    const now = new Date();
    if (isNaN(start.getTime())) return 0;

    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  static createGridLayout(
    plants: PlantEntity[],
    rows: number,
    cols: number
  ): { rows: number; cols: number; grid: (PlantEntity | null)[][] } {
    const grid: (PlantEntity | null)[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => null)
    );

    plants.forEach((plant) => {
      const row = (plant.attributes?.row ?? 1) - 1;
      const col = (plant.attributes?.col ?? 1) - 1;
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col] = plant;
      }
    });

    return { rows, cols, grid };
  }

  static findFirstAvailableSlot(
    plants: PlantEntity[],
    rows: number,
    cols: number
  ): { row: number; col: number } {
    const occupied = new Set<string>();
    plants.forEach((p) => {
      if (p.attributes.row !== undefined && p.attributes.col !== undefined) {
        occupied.add(`${p.attributes.row},${p.attributes.col}`);
      }
    });

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        if (!occupied.has(`${r},${c}`)) {
          return { row: r, col: c };
        }
      }
    }
    // Default to first slot if full
    return { row: 1, col: 1 };
  }

  /** Growspace types that support dynamic row expansion */
  private static readonly DYNAMIC_ROW_TYPES: GrowspaceType[] = ['dry', 'cure', 'mother', 'clone'];

  static calculateEffectiveRows(device: GrowspaceDevice): number {
    const { type, plants, plants_per_row, rows } = device;

    // Use strict type check instead of magic string comparison
    if (this.DYNAMIC_ROW_TYPES.includes(type)) {
      if (plants.length === 0) return 1;

      const maxRowUsed = Math.max(...plants.map((p) => p.attributes?.row || 1));
      const lastRowCount = plants.filter((p) => (p.attributes?.row || 1) === maxRowUsed).length;

      return lastRowCount >= plants_per_row ? maxRowUsed + 1 : maxRowUsed;
    }

    return rows;
  }

  /**
   * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) to ISO string
   * Returns null if input is empty or invalid
   */
  static parseDateTimeLocal(value?: string | null): string | undefined {
    if (!value) return undefined;
    try {
      // Append ":00" if only HH:MM is provided
      const isoString = value.length === 16 ? value + ':00' : value;
      const dt = new Date(isoString);

      if (isNaN(dt.getTime())) return undefined;

      // Format as YYYY-MM-DDTHH:MM:SS (no Z)
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      const sec = String(dt.getSeconds()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
    } catch {
      return undefined;
    }
  }

  /**
   * Extracts YYYY-MM-DD from a date string or datetime-local string
   */
  static formatDateForBackend(value?: string | null): string | undefined {
    if (!value) return undefined;
    try {
      // If it's already roughly ISO format, extracting the first part is safest
      // if we assume the user entered local time in the datetime-local input.
      const parts = value.split('T');
      if (parts.length > 0 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
        return parts[0];
      }
      // Fallback to parsing if format is unexpected
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return undefined;
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return undefined;
    }
  }

  /** Date fields used for plant lifecycle */
  private static readonly DATE_FIELDS = [
    'seedling_start',
    'mother_start',
    'clone_start',
    'veg_start',
    'flower_start',
    'dry_start',
    'cure_start',
  ] as const;

  /**
   * Maps dialog-edited attributes to API-ready payload.
   * Pure function - no side effects.
   * @param editedAttributes - Attributes from the plant overview dialog
   * @param isBulkEdit - Whether multiple plants are being edited
   * @returns Object ready for API call
   */
  static mapDialogToApiPayload(
    editedAttributes: Record<string, any>,
    isBulkEdit: boolean
  ): Record<string, any> {
    const payload: Record<string, any> = {};

    const fieldsToProcess = isBulkEdit
      ? [...this.DATE_FIELDS]
      : ['strain', 'phenotype', 'row', 'col', ...this.DATE_FIELDS];

    fieldsToProcess.forEach((field) => {
      if (editedAttributes[field] !== undefined) {
        if (this.DATE_FIELDS.includes(field as typeof this.DATE_FIELDS[number])) {
          const val = String(editedAttributes[field] || '');
          if (!val || val === 'null' || val === 'undefined') {
            payload[field] = null;
          } else {
            const formattedDate = this.formatDateForBackend(val);
            if (formattedDate) {
              payload[field] = formattedDate;
            }
          }
        } else {
          if (editedAttributes[field] !== null) {
            payload[field] = editedAttributes[field];
          }
        }
      }
    });

    // Remove position fields for bulk edits
    if (isBulkEdit) {
      delete payload.row;
      delete payload.col;
    }

    return payload;
  }

  static getCurrentDateTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  }

  /**
   * Formats a date string (YYYY-MM-DD or ISO) to YYYY-MM-DDThh:mm for datetime-local inputs
   */
  static toDateTimeLocal(value?: string | null): string {
    if (!value) return '';
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return '';

      const pad = (n: number) => n.toString().padStart(2, '0');
      const yyyy = dt.getFullYear();
      const mm = pad(dt.getMonth() + 1);
      const dd = pad(dt.getDate());
      const hh = pad(dt.getHours());
      const min = pad(dt.getMinutes());

      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return '';
    }
  }

  static getDominantStage(plants: PlantEntity[]): { stage: PlantStage; days: number } | null {
    if (!plants || plants.length === 0) return null;

    // Defined priority: Cure > Dry > Flower > Vegetative > Clone > Mother > Seedling
    // Lower index = higher priority
    const priority: PlantStage[] = [
      PlantStage.CURE,
      PlantStage.DRY,
      PlantStage.FLOWER,
      PlantStage.VEG,
      PlantStage.CLONE,
      PlantStage.MOTHER,
      PlantStage.SEEDLING,
    ];

    // Find the highest priority stage present in the plants
    let bestStage: PlantStage | null = null;
    let maxDays = 0;

    // Group plants by normalized stage
    const plantsByStage: Record<string, PlantEntity[]> = {};

    for (const plant of plants) {
      // Use plant.state directly if possible, or calculate it
      // plant.state usually contains the stage string
      const stage = this.normalizeStage(plant.state || this.getPlantStage(plant));
      if (!plantsByStage[stage]) plantsByStage[stage] = [];
      plantsByStage[stage].push(plant);
    }

    // Iterate priority list to find the first matching stage
    for (const stage of priority) {
      if (plantsByStage[stage] && plantsByStage[stage].length > 0) {
        bestStage = stage;
        // Find max days for this stage
        // Map stage to attribute key
        const daysKey = `${stage === PlantStage.VEG ? 'veg' : stage}_days`;

        const daysValues = plantsByStage[stage].map((p) => {
          const val = p.attributes[daysKey];
          return typeof val === 'number' ? val : 0;
        });

        maxDays = Math.max(...daysValues);
        break;
      }
    }

    if (!bestStage) return null;

    return { stage: bestStage, days: maxDays };
  }

  /**
   * Compresses and resizes an image file.
   * @param file The file object from input.
   * @param maxWidth Maximum width in pixels.
   * @param maxHeight Maximum height in pixels.
   * @param quality Quality between 0 and 1.
   * @returns Promise resolving to base64 string.
   */
  static compressImage(
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 0.7
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Get base64 string
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  static preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve();
      img.onerror = () => reject();
    });
  }

  static getImgStyle(meta?: CropMeta): string {
    if (!meta) return 'width: 100%; height: 100%; object-fit: cover;';
    return `width: 100%; height: 100%; object-fit: cover; object-position: ${meta.x}% ${meta.y}%; transform: scale(${meta.scale}); transform-origin: ${meta.x}% ${meta.y}%;`;
  }
}

export class MetricsUtils {
  private static _getAttributeValue(ent: any, key: string) {
    if (!ent || !ent.attributes) return undefined;
    if (ent.attributes[key] !== undefined) return ent.attributes[key];
    if (ent.attributes.observations && typeof ent.attributes.observations === 'object') {
      return ent.attributes.observations[key];
    }
    return undefined;
  }

  private static _isMetricLinked(
    metric: string,
    linkedGraphGroups: string[][]
  ): { linked: boolean; groupIndex: number } {
    if (!linkedGraphGroups) return { linked: false, groupIndex: -1 };

    for (let i = 0; i < linkedGraphGroups.length; i++) {
      if (linkedGraphGroups[i].includes(metric)) {
        return { linked: true, groupIndex: i };
      }
    }
    return { linked: false, groupIndex: -1 };
  }

  static computeHeaderMetrics(
    hass: HomeAssistant,
    device: GrowspaceDevice,
    activeEnvGraphs: Set<string>,
    linkedGraphGroups: string[][]
  ): {
    mainChips: any[];
    deviceChips: any[];
    dominant: any;
    envAttrs: any;
  } {
    if (!device || !hass)
      return { mainChips: [], deviceChips: [], dominant: undefined, envAttrs: {} };

    const dominant = PlantUtils.getDominantStage(device.plants);

    // Fetch Environmental Data
    let slug = device.name.toLowerCase().replace(/\s+/g, '_');
    if (device.overview_entity_id) {
      slug = device.overview_entity_id.replace('sensor.', '');
    }

    let envEntityId = `binary_sensor.${slug}_optimal_conditions`;
    const isCure = slug === 'cure';
    const isDry = slug === 'dry';

    if (isCure) {
      envEntityId = `binary_sensor.cure_optimal_curing`;
    } else if (isDry) {
      envEntityId = `binary_sensor.dry_optimal_drying`;
    }

    const envEntity = hass.states[envEntityId];
    const overviewEntity = device.overview_entity_id
      ? hass.states[device.overview_entity_id]
      : undefined;
    const envAttrs =
      device.environment_attributes || overviewEntity?.attributes || ({} as any);

    const temp = this._getAttributeValue(envEntity, 'temperature');
    const hum = this._getAttributeValue(envEntity, 'humidity');
    let vpd = this._getAttributeValue(envEntity, 'vpd');

    // VPD Fallback Logic
    if (vpd === undefined || vpd === null) {
      if (envAttrs.vpd_sensor) {
        const vpdState = hass.states[envAttrs.vpd_sensor];
        if (vpdState && vpdState.state !== 'unknown' && vpdState.state !== 'unavailable') {
          const val = parseFloat(vpdState.state);
          if (!isNaN(val)) vpd = val;
        }
      }
      if (vpd === undefined || vpd === null) {
        // Calculated VPD fallback
        const slugify = (text: string) =>
          text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '_')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
        const calcName = `${device.name} Calculated VPD`;
        const calculatedId = `sensor.${slugify(calcName)}`;
        const vpdState = hass.states[calculatedId];
        if (vpdState && vpdState.state !== 'unknown' && vpdState.state !== 'unavailable') {
          const val = parseFloat(vpdState.state);
          if (!isNaN(val)) vpd = val;
        }
      }
    }

    let vpdStatus = overviewEntity?.attributes?.vpd_status;
    const vpdTargetMin = overviewEntity?.attributes?.vpd_target_min;
    const vpdTargetMax = overviewEntity?.attributes?.vpd_target_max;
    const vpdDangerMin = overviewEntity?.attributes?.vpd_danger_min;
    const vpdDangerMax = overviewEntity?.attributes?.vpd_danger_max;

    if (
      (!vpdStatus || vpdStatus === 'unknown') &&
      vpd !== undefined &&
      vpdTargetMin !== undefined &&
      vpdTargetMax !== undefined &&
      vpdDangerMin !== undefined &&
      vpdDangerMax !== undefined
    ) {
      if (vpd < vpdDangerMin || vpd > vpdDangerMax) {
        vpdStatus = 'danger';
      } else if (vpd < vpdTargetMin || vpd > vpdTargetMax) {
        vpdStatus = 'warning';
      } else {
        vpdStatus = 'optimal';
      }
    }

    const isSpecialGrowspace = isCure || isDry;
    const co2Value = this._getAttributeValue(envEntity, 'co2');
    const co2 =
      isSpecialGrowspace || co2Value === undefined || co2Value === null ? undefined : co2Value;

    const isLightsOnValue = this._getAttributeValue(envEntity, 'is_lights_on');
    const hasLightSensor =
      !isSpecialGrowspace && isLightsOnValue !== undefined && isLightsOnValue !== null;
    const isLightsOn = isLightsOnValue === true;

    const getNextEvent = (times?: IrrigationTime[]): string | undefined => {
      if (!times || !times.length) return undefined;
      const now = DateTime.now();
      const upcoming = times
        .map((t) => {
          const [h, m] = t.time.split(':').map(Number);
          let dt = now.set({ hour: h, minute: m, second: 0 });
          if (dt < now) dt = dt.plus({ days: 1 });
          return dt;
        })
        .sort((a, b) => a.toMillis() - b.toMillis())[0];
      return upcoming ? upcoming.toFormat('HH:mm') : undefined;
    };

    const nextIrrigation = getNextEvent(device.irrigation_times);
    const nextDrain = getNextEvent(device.drain_times);

    // Build Chips
    const createChipData = (
      key: string,
      icon: string,
      value: string | undefined,
      label?: string,
      status?: string,
      tooltip?: string
    ) => {
      if (value === undefined) return null;
      const { linked, groupIndex } = this._isMetricLinked(key, linkedGraphGroups);
      const active = activeEnvGraphs.has(key);
      return { key, icon, value, label, status, tooltip, active, linked, groupIndex };
    };

    const mainChips = [
      createChipData('temperature', mdiThermometer, temp !== undefined ? `${temp}°C` : undefined),
      createChipData('humidity', mdiWaterPercent, hum !== undefined ? `${hum}%` : undefined),
      createChipData(
        'vpd',
        mdiCloudOutline,
        vpd !== undefined ? `${vpd} kPa` : undefined,
        undefined,
        vpdStatus,
        vpdTargetMin !== undefined && vpdTargetMax !== undefined
          ? `VPD: ${vpd} kPa (Target: ${vpdTargetMin}-${vpdTargetMax})`
          : ''
      ),
      createChipData('co2', mdiWeatherCloudy, co2 !== undefined ? `${co2} ppm` : undefined),
      createChipData(
        'light',
        isLightsOn ? mdiLightbulbOn : mdiLightbulbOff,
        hasLightSensor ? (isLightsOn ? 'On' : 'Off') : undefined
      ),
      createChipData(
        'soil_moisture',
        mdiWaterPercent,
        this._getAttributeValue(overviewEntity, 'soil_moisture_value') !== undefined
          ? `${this._getAttributeValue(overviewEntity, 'soil_moisture_value')}%`
          : undefined,
        'Moisture'
      ),
      createChipData('irrigation', mdiWater, nextIrrigation, 'Next'),
      createChipData('drain', mdiWater, nextDrain, 'Next'),
      envEntity
        ? createChipData(
          'optimal',
          envEntity.state === 'on' ? mdiRadioboxMarked : mdiRadioboxBlank,
          envEntity.state === 'on'
            ? 'Optimal Conditions'
            : envEntity.attributes.reasons || 'Not Optimal',
          undefined,
          envEntity.state === 'on' ? 'optimal' : 'warning'
        )
        : null,
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    // Device Chips
    const exhaustId = envAttrs.exhaust_entity;
    const exhaustSensor = envAttrs.exhaust_sensor;
    const exhaustState =
      exhaustId && hass.states[exhaustId]
        ? hass.states[exhaustId].state
        : exhaustSensor && hass.states[exhaustSensor]
          ? hass.states[exhaustSensor].state
          : undefined;

    const humidifierId = envAttrs.humidifier_entity;
    const humidifierSensor = envAttrs.humidifier_sensor;
    const humidifierState =
      humidifierId && hass.states[humidifierId]
        ? hass.states[humidifierId].state
        : humidifierSensor && hass.states[humidifierSensor]
          ? hass.states[humidifierSensor].state
          : undefined;

    const dehumidifierId = envAttrs.dehumidifier_entity;
    const dehumidifierState =
      dehumidifierId && hass.states[dehumidifierId]
        ? hass.states[dehumidifierId].state
        : undefined;

    const circulationFanId = envAttrs.circulation_fan_entity;
    const circulationFanState =
      circulationFanId && hass.states[circulationFanId]
        ? hass.states[circulationFanId].state
        : undefined;

    const deviceChips = [
      createChipData(
        'exhaust',
        mdiFan,
        exhaustId || exhaustSensor ? `${exhaustState ?? '-'}` : undefined,
        'Exhaust'
      ),
      createChipData(
        'circulation_fan',
        mdiFan,
        circulationFanId ? `${circulationFanState ?? '-'}` : undefined,
        'Fan'
      ),
      createChipData(
        'humidifier',
        mdiAirHumidifier,
        humidifierId || humidifierSensor ? `${humidifierState ?? '-'}` : undefined,
        'Humidifier'
      ),
      createChipData(
        'dehumidifier',
        mdiAirHumidifierOff,
        dehumidifierId ? `${dehumidifierState ?? '-'}` : undefined,
        'Dehumidifier'
      ),
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    return { mainChips, deviceChips, dominant, envAttrs };
  }
}
