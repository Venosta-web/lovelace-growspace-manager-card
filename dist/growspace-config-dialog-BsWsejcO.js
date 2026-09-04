/*! growspace-e2e-build source=2e889c2b34d29831e2a9ea84775b90a4da9f3cee9ea88a606cf6b525559cfb18 id=705911f9e6b0c1280f6dfdcefba8c7d7 */
const { bC: e, bz: i, bA: t, dL: f$1, bB: T, E, dM: m, f: dialogStyles, i: i$1, _: __decorate, n, A: r, t: t$1, g: i$2, dN: mdiChartTree, J: mdiClose, x, O: c, Q: hassContext, N: reducedMotion, dO: updateSubarea, dP: mdiViewGrid, dQ: mdiBellAlertOutline, z: mdiClockOutline, k: mdiPencil, l: mdiDelete, dR: isKnownTrigger, dS: triggerRawValue, dT: normalizeTriggerType, dU: TIMED_NOTIFICATION_TRIGGERS, cP: mdiThermometer, cl: mdiChevronDown, bR: localizeWithParams, dV: mdiFan, dW: mdiTune, dX: FAN_VPD_STAGE_DEFAULTS, dY: mdiThermometerAlert, dZ: mdiWhiteBalanceSunny, d_: FAN_VPD_STAGE_KEYS, d$: FAN_VPD_STAGE_COLORS, e0: FAN_VPD_STAGE_LABELS, e1: mdiAirHumidifier, cQ: mdiWaterPercent, aB: mdiWeatherNight, e2: HumidifierStage, e3: DehumidifierStage, cR: mdiGauge, e4: mdiLightningBolt, bl: mdiCamera, e5: VPD_OPTIMAL_STAGE_DEFAULTS, y: mdiWater, m: mdiPlus, e6: mdiAlertOutline, e7: ConfigTab, bQ: localize, dK: getSubareas, e8: addSubarea, e9: removeSubarea, ea: irrigationStrategies$, aY: updateIrrigationStrategy, eb: setHumidifierControl, ec: setDehumidifierControl, at: mdiCog, ed: mdiViewDashboard, ee: mdiBell, ef: mdiFloorPlan, dF: e$1 } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

/**
 * Acceptable Moisture Band — pure draft logic for the Sensors tab.
 *
 * The band is an atomic pair of optional percentage bounds. `null`/`null` means
 * the growspace inherits the default band: the form still *shows* 20–60%, but
 * nothing is stored, which is exactly what makes "Reset to defaults" survive
 * only if the user then Saves.
 *
 * The backend (`growspace_manager`) rejects a lone bound and fails the whole
 * `configure_environment` call, so the rules here are deliberately strict about
 * never producing a half pair on the wire. It also mirrors the backend's own
 * defaults so the card degrades gracefully against a release that predates the
 * band — an absent `soil_moisture_band` reads as the inherited 20–60%.
 */
const DEFAULT_MOISTURE_MIN = 20;
const DEFAULT_MOISTURE_MAX = 60;
/**
 * The band to display for a draft. An incomplete draft still renders the value
 * the user is typing; only a fully-empty pair falls back to the defaults.
 */
function effectiveBand(draft) {
    if (draft.min === null && draft.max === null) {
        return { min: DEFAULT_MOISTURE_MIN, max: DEFAULT_MOISTURE_MAX, isCustom: false };
    }
    return {
        min: draft.min ?? DEFAULT_MOISTURE_MIN,
        max: draft.max ?? DEFAULT_MOISTURE_MAX,
        isCustom: true,
    };
}
/** Whether a pair is complete and satisfies 0 ≤ min < max ≤ 100. */
function isCompleteValidBand(draft) {
    const { min, max } = draft;
    if (min === null || max === null)
        return false;
    if (!Number.isFinite(min) || !Number.isFinite(max))
        return false;
    return min >= 0 && min < max && max <= 100;
}
/** Whether the pair is the deliberate "inherit the default" clear. */
function isCleared(draft) {
    return draft.min === null && draft.max === null;
}
/**
 * A user-presentable problem with the current draft, or null when it is either
 * a valid custom pair or a clean clear.
 */
function bandValidationError(draft) {
    if (isCleared(draft) || isCompleteValidBand(draft))
        return null;
    if (draft.min === null || draft.max === null) {
        return 'Set both a healthy minimum and a healthy maximum, or clear both to use the defaults.';
    }
    if (!Number.isFinite(draft.min) || !Number.isFinite(draft.max)) {
        return 'Healthy minimum and maximum must be numbers.';
    }
    if (draft.min >= draft.max) {
        return 'Healthy minimum must be lower than healthy maximum.';
    }
    return 'Healthy minimum and maximum must be between 0% and 100%.';
}
/**
 * Apply an edit to one bound.
 *
 * Editing a single bound while the band is inherited materialises *both* — the
 * other takes the default it was already displaying. Without this, typing one
 * value would produce a half pair the backend rejects outright.
 */
function editBound(draft, bound, value) {
    // A fully inherited band materialises on its first edit: the untouched bound
    // takes the default it was already displaying, so a lone bound — which the
    // backend rejects outright — can never be produced.
    if (isCleared(draft)) {
        if (value === null)
            return { min: null, max: null };
        return bound === 'min'
            ? { min: value, max: DEFAULT_MOISTURE_MAX }
            : { min: DEFAULT_MOISTURE_MIN, max: value };
    }
    // Already custom, possibly mid-edit. Touch only the edited bound: a bound the
    // user deliberately cleared must stay cleared (showing a validation error)
    // rather than being silently refilled with the default it merely displays.
    return bound === 'min' ? { ...draft, min: value } : { ...draft, max: value };
}
/** Reset to defaults: drop the override. The form keeps showing 20–60%. */
function resetBand() {
    return { min: null, max: null };
}
/**
 * The pair to put on the wire, or null when the draft is mid-edit and
 * incomplete.
 *
 * Returning null means "send neither key", which the backend reads as
 * "unchanged" — so an unfinished band never destroys a stored one, and never
 * fails the surrounding save.
 */
function bandSavePayload(draft) {
    if (isCleared(draft))
        return { min: null, max: null };
    if (isCompleteValidBand(draft))
        return { min: draft.min, max: draft.max };
    return null;
}
/** Parse a live reading, which arrives as a string (or "unavailable"/absent). */
function parseReading(raw) {
    if (raw === null || raw === undefined)
        return null;
    const value = typeof raw === 'number' ? raw : Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
}
/** Classify a reading against a band. Boundaries are inclusive. */
function classifyReading(reading, band) {
    if (reading < band.min)
        return 'too_dry';
    if (reading > band.max)
        return 'too_wet';
    return 'in_band';
}
/** Display label for a classification. */
const CLASSIFICATION_LABELS = {
    too_dry: 'Too dry',
    in_band: 'Within healthy band',
    too_wet: 'Too wet',
};

/**
 * Environment Change — the card's one write module for EnvironmentConfig.
 *
 * Its interface accepts the two live caller intents: a Config Dialog Shared
 * Environment Draft plus Dirty Write Set, or a narrow Tank Config Change. The
 * implementation hides Environment Field Ownership, Atomic Dirty Groups,
 * sparse Environment Patch composition, Home Assistant action mapping,
 * dedicated exhaust sequencing, and refresh ordering.
 */
class EnvironmentChangeValidationError extends Error {
    constructor(reason) {
        super(`Environment Change is blocked: ${reason}`);
        this.reason = reason;
        this.name = 'EnvironmentChangeValidationError';
    }
}
const entityOrNull = (value) => value || null;
function tankConfigs(value) {
    return value.map((tank) => ({
        sensor_entity: tank.sensorEntity,
        name: tank.name,
        warning_level: tank.warningLevel,
        ...(tank.volumeLiters != null ? { volume_liters: tank.volumeLiters } : {}),
    }));
}
/**
 * Total Environment Field Ownership and wire mapping table.
 *
 * Adding a Shared Environment Draft field without a row is a compile error.
 * Every buffered row also owns its canonical Home Assistant action key, so a
 * field cannot be composed and then silently dropped by a second mapping list.
 */
const ENVIRONMENT_FIELDS = {
    selectedGrowspaceId: { owner: 'routing' },
    temperatureSensors: { owner: 'environment', wireKey: 'temperature_sensors' },
    humiditySensors: { owner: 'environment', wireKey: 'humidity_sensors' },
    vpdSensors: { owner: 'environment', wireKey: 'vpd_sensors' },
    co2Sensor: { owner: 'environment', wireKey: 'co2_sensor', map: entityOrNull },
    lightSensors: { owner: 'environment', wireKey: 'light_sensors' },
    exhaustFanEntities: { owner: 'environment', wireKey: 'exhaust_fan_entities' },
    circulationFanEntities: { owner: 'environment', wireKey: 'circulation_fan_entities' },
    exhaustFanAcInfinityDevices: {
        owner: 'environment',
        wireKey: 'exhaust_fan_ac_infinity_devices',
    },
    circulationFanAcInfinityDevices: {
        owner: 'environment',
        wireKey: 'circulation_fan_ac_infinity_devices',
    },
    stressThreshold: { owner: 'environment', wireKey: 'stress_threshold', omitNull: true },
    moldThreshold: { owner: 'environment', wireKey: 'mold_threshold', omitNull: true },
    humidifierEntities: { owner: 'environment', wireKey: 'humidifier_entities' },
    dehumidifierEntities: { owner: 'environment', wireKey: 'dehumidifier_entities' },
    humidifierAcInfinityDevices: {
        owner: 'environment',
        wireKey: 'humidifier_ac_infinity_devices',
    },
    dehumidifierAcInfinityDevices: {
        owner: 'environment',
        wireKey: 'dehumidifier_ac_infinity_devices',
    },
    humidifierThresholds: { owner: 'environment', wireKey: 'humidifier_thresholds' },
    dehumidifierThresholds: { owner: 'environment', wireKey: 'dehumidifier_thresholds' },
    humidifierControlEnabled: { owner: 'immediate' },
    dehumidifierControlEnabled: { owner: 'immediate' },
    soilMoistureSensor: {
        owner: 'environment',
        wireKey: 'soil_moisture_sensor',
        map: entityOrNull,
    },
    soilMoistureMin: { owner: 'moisture-band' },
    soilMoistureMax: { owner: 'moisture-band' },
    substrateTemperatureSensors: {
        owner: 'environment',
        wireKey: 'substrate_temperature_sensors',
    },
    phSensors: { owner: 'environment', wireKey: 'ph_sensors' },
    feedEcSensors: { owner: 'environment', wireKey: 'feed_ec_sensors' },
    bulkEcSensors: { owner: 'environment', wireKey: 'bulk_ec_sensors' },
    poreEcSensors: { owner: 'environment', wireKey: 'pore_ec_sensors' },
    runoffEcSensors: { owner: 'environment', wireKey: 'runoff_ec_sensors' },
    drainVolumeSensors: { owner: 'environment', wireKey: 'drain_volume_sensors' },
    irrigationFlowSensors: { owner: 'environment', wireKey: 'irrigation_flow_sensors' },
    powerSensors: { owner: 'environment', wireKey: 'power_sensors' },
    energySensors: { owner: 'environment', wireKey: 'energy_sensors' },
    sensorGroups: { owner: 'environment', wireKey: 'sensor_groups' },
    sensorCoordinates: { owner: 'environment', wireKey: 'sensor_coordinates' },
    irrigationTanks: { owner: 'environment', wireKey: 'irrigation_tanks', map: tankConfigs },
    cameraEntities: { owner: 'environment', wireKey: 'camera_entities' },
    lungroomTempSensors: { owner: 'environment', wireKey: 'lung_room_temp_sensors' },
    visionEnabled: { owner: 'vision' },
    visionEarlyOffset: { owner: 'vision' },
    visionMidHours: { owner: 'vision' },
    visionLateOffset: { owner: 'vision' },
    circulationFanConfig: { owner: 'environment', wireKey: 'circulation_fan_config' },
    exhaustFanConfig: { owner: 'exhaust' },
    growlightEntities: { owner: 'environment', wireKey: 'growlight_entities' },
    growlightAcInfinityDevices: {
        owner: 'environment',
        wireKey: 'growlight_ac_infinity_devices',
    },
    growlightConfig: { owner: 'environment', wireKey: 'growlight_config' },
    vpdOptimalOverrides: { owner: 'environment', wireKey: 'vpd_optimal_overrides' },
    lstOffset: { owner: 'environment', wireKey: 'lst_offset' },
};
const ENV_ATOMIC_GROUPS = [
    ['soilMoistureMin', 'soilMoistureMax'],
];
const VISION_GROUP = [
    'visionEnabled',
    'visionEarlyOffset',
    'visionMidHours',
    'visionLateOffset',
];
function expandAtomicGroups(keys) {
    const expanded = new Set(keys);
    for (const group of ENV_ATOMIC_GROUPS) {
        if (group.some((key) => expanded.has(key))) {
            for (const key of group)
                expanded.add(key);
        }
    }
    return expanded;
}
function isEnvironmentGroupDirty(dirty, group) {
    return group.some((key) => dirty.has(key));
}
/** Read-only projection used by save affordances before applying a change. */
function environmentChangeVerdict(request) {
    if (request.kind === 'tank-config-change') {
        return request.growspaceId ? { ok: true } : { ok: false, reason: 'growspace' };
    }
    const { draft } = request;
    if (!draft.selectedGrowspaceId)
        return { ok: false, reason: 'growspace' };
    const missingTemperature = draft.temperatureSensors.length === 0;
    const missingHumidity = draft.humiditySensors.length === 0;
    if (missingTemperature && missingHumidity) {
        return { ok: false, reason: 'temperature-and-humidity' };
    }
    if (missingTemperature)
        return { ok: false, reason: 'temperature' };
    if (missingHumidity)
        return { ok: false, reason: 'humidity' };
    if (isEnvironmentGroupDirty(request.dirty, ENV_ATOMIC_GROUPS[0]) &&
        bandSavePayload({
            min: draft.soilMoistureMin ?? null,
            max: draft.soilMoistureMax ?? null,
        }) === null) {
        return { ok: false, reason: 'moisture-band' };
    }
    return { ok: true };
}
function composeSharedDraftChange(draft, dirty) {
    const environment = {
        growspace_id: draft.selectedGrowspaceId,
    };
    let exhaust;
    for (const key of dirty) {
        const rule = ENVIRONMENT_FIELDS[key];
        if (rule.owner === 'environment') {
            const value = draft[key];
            if ('omitNull' in rule && rule.omitNull && value == null)
                continue;
            environment[rule.wireKey] = 'map' in rule && rule.map ? rule.map(value) : value;
        }
        else if (rule.owner === 'exhaust') {
            exhaust = { growspace_id: draft.selectedGrowspaceId, ...draft.exhaustFanConfig };
        }
    }
    if (isEnvironmentGroupDirty(dirty, ENV_ATOMIC_GROUPS[0])) {
        const band = bandSavePayload({ min: draft.soilMoistureMin, max: draft.soilMoistureMax });
        if (band) {
            environment.soil_moisture_min = band.min;
            environment.soil_moisture_max = band.max;
        }
    }
    return exhaust ? { environment, exhaust } : { environment };
}
/** Apply one Environment Change through the existing Home Assistant action seam. */
async function applyEnvironmentChange(request, adapter) {
    const verdict = environmentChangeVerdict(request);
    if (!verdict.ok)
        throw new EnvironmentChangeValidationError(verdict.reason);
    const plan = request.kind === 'tank-config-change'
        ? {
            environment: {
                growspace_id: request.growspaceId,
                irrigation_tanks: tankConfigs(request.irrigationTanks),
            },
        }
        : composeSharedDraftChange(request.draft, request.dirty);
    await adapter.configureEnvironment(plan.environment);
    if ('exhaust' in plan && plan.exhaust) {
        await adapter.configureExhaustFan(plan.exhaust);
    }
    await adapter.refresh();
}

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const l=e(class extends i{constructor(r){if(super(r),r.type!==t.PROPERTY&&r.type!==t.ATTRIBUTE&&r.type!==t.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!f$1(r))throw Error("`live` bindings can only contain a single expression")}render(r){return r}update(i,[t$1]){if(t$1===T||t$1===E)return t$1;const o=i.element,l=i.name;if(i.type===t.PROPERTY){if(t$1===o[l])return T}else if(i.type===t.BOOLEAN_ATTRIBUTE){if(!!t$1===o.hasAttribute(l))return T}else if(i.type===t.ATTRIBUTE&&o.getAttribute(l)===t$1+"")return T;return m(i),t$1}});

let SensorGroupDialog = class SensorGroupDialog extends i$2 {
    constructor() {
        super(...arguments);
        this.open = false;
        this._name = '';
        this._x = 0;
        this._y = 0;
        this._z = 0;
        this._tempSensors = [];
        this._humidSensors = [];
        this._vpdSensors = [];
    }
    willUpdate(changedProperties) {
        if (changedProperties.has('sensorGroup') && this.sensorGroup) {
            this._name = this.sensorGroup.name;
            this._x = this.sensorGroup.x;
            this._y = this.sensorGroup.y;
            this._z = this.sensorGroup.z;
            this._tempSensors = [...(this.sensorGroup.temperature_sensors || [])];
            this._humidSensors = [...(this.sensorGroup.humidity_sensors || [])];
            this._vpdSensors = [...(this.sensorGroup.vpd_sensors || [])];
        }
        else if (changedProperties.has('sensorGroup') && !this.sensorGroup) {
            this._name = '';
            this._x = 0;
            this._y = 0;
            this._z = 0;
            this._tempSensors = [];
            this._humidSensors = [];
            this._vpdSensors = [];
        }
    }
    _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
    _save() {
        const group = {
            id: this.sensorGroup?.id || `group_${Date.now()}`,
            name: this._name || 'Unnamed Group',
            x: this._x,
            y: this._y,
            z: this._z,
            temperature_sensors: this._tempSensors,
            humidity_sensors: this._humidSensors,
            vpd_sensors: this._vpdSensors,
        };
        this.dispatchEvent(new CustomEvent('save-sensor-group', {
            detail: { group },
            bubbles: true,
            composed: true,
        }));
    }
    _toggleSensor(sensorList, sensor, listName) {
        const newList = sensorList.includes(sensor)
            ? sensorList.filter((s) => s !== sensor)
            : [...sensorList, sensor];
        this[listName] = newList;
    }
    render() {
        if (!this.open)
            return E;
        const allSensors = this._getAvailableSensors();
        return x `
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        without-header
        width="large"
        .scrimClickAction=${''}
        .escapeKeyAction=${'close'}
      >
        <div
          class="glass-dialog-container"
          style="max-width: 600px; height: auto; max-height: 90vh;"
        >
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiChartTree}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">${this.sensorGroup ? 'Edit Group' : 'Add Group'}</h2>
                <gs-help-tooltip
                  content="Group sensors together so their readings are averaged or compared as a unit."
                  placement="bottom"
                  label="Sensor Group"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">Configure 3D heatmap coordinates & sensors</div>
            </div>
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width: auto; padding: 8px;"
            >
              <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${mdiClose}"></path>
              </svg>
            </button>
          </div>

          <div class="config-content" style="padding: 20px;">
            <div class="group-form">
              <md3-text-input
                label="Group Name"
                .value=${this._name}
                @change=${(e) => (this._name = e.detail)}
              ></md3-text-input>

              <div class="coord-grid">
                <md3-number-input
                  label="X"
                  .value=${this._x}
                  @change=${(e) => (this._x = parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  label="Y"
                  .value=${this._y}
                  @change=${(e) => (this._y = parseFloat(e.detail))}
                ></md3-number-input>
                <md3-number-input
                  label="Z (Optional)"
                  .value=${this._z}
                  @change=${(e) => (this._z = parseFloat(e.detail))}
                ></md3-number-input>
              </div>

              <div class="sensor-columns">
                <div class="sensor-column">
                  <div class="column-title">Temp Sensors</div>
                  ${allSensors.temp.map((s) => this._renderCheckbox(s, this._tempSensors, '_tempSensors'))}
                </div>
                <div class="sensor-column">
                  <div class="column-title">Humidity Sensors</div>
                  ${allSensors.humid.map((s) => this._renderCheckbox(s, this._humidSensors, '_humidSensors'))}
                </div>
                <div class="sensor-column">
                  <div class="column-title">VPD Sensors</div>
                  ${allSensors.vpd.map((s) => this._renderCheckbox(s, this._vpdSensors, '_vpdSensors'))}
                </div>
              </div>
            </div>
          </div>

          <div class="button-group" style="padding: 16px;">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>
            <button class="md3-button primary" @click=${this._save}>
              ${this.sensorGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </div>
      </ha-dialog>
    `;
    }
    _renderCheckbox(sensor, currentList, type) {
        const friendlyName = this.hass.states[sensor]?.attributes.friendly_name || sensor.split('.')[1];
        return x `
      <label class="checkbox-item">
        <input
          type="checkbox"
          .checked=${currentList.includes(sensor)}
          @change=${() => this._toggleSensor(currentList, sensor, type)}
        />
        <div style="display:flex; flex-direction:column; min-width:0;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
            >${friendlyName}</span
          >
          <span class="entity-id">${sensor}</span>
        </div>
      </label>
    `;
    }
    _getAvailableSensors() {
        if (!this.hass)
            return { temp: [], humid: [], vpd: [] };
        const entities = Object.keys(this.hass.states);
        const filterByClass = (cls) => entities.filter((e) => this.hass.states[e].attributes.device_class === cls);
        return {
            temp: filterByClass('temperature').sort(),
            humid: filterByClass('humidity').sort(),
            vpd: entities.filter((e) => e.includes('vpd')).sort(),
        };
    }
};
SensorGroupDialog.styles = [
    dialogStyles,
    i$1 `
      .group-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px 0;
      }
      .coord-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      }
      .sensor-columns {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
        margin-top: 8px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 8px;
      }
      .sensor-column {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .column-title {
        font-size: var(--font-size-supporting);
        font-weight: 500;
        color: var(--secondary-text-color);
        padding-bottom: 4px;
        border-bottom: 1px solid var(--divider-color);
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .checkbox-item input {
        cursor: pointer;
      }
      .entity-id {
        font-size: 0.7rem;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
];
__decorate([
    n({ type: Boolean })
], SensorGroupDialog.prototype, "open", void 0);
__decorate([
    n({ attribute: false })
], SensorGroupDialog.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], SensorGroupDialog.prototype, "sensorGroup", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_name", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_x", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_y", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_z", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_tempSensors", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_humidSensors", void 0);
__decorate([
    r()
], SensorGroupDialog.prototype, "_vpdSensors", void 0);
SensorGroupDialog = __decorate([
    t$1('sensor-group-dialog')
], SensorGroupDialog);

/**
 * `ha-entity-picker` ships with the Home Assistant frontend but lives in a chunk
 * that is only pulled in once something asks for it — typically the Lovelace
 * editor. A card rendered on a freshly loaded dashboard can therefore hit an
 * undefined element. Instantiating a built-in card's config element is the
 * supported way to make the frontend load that chunk for us.
 */
let pending;
/** Resolve once `ha-entity-picker` is registered (or the attempt has failed). */
function ensureEntityPicker() {
    if (customElements.get('ha-entity-picker'))
        return Promise.resolve();
    pending ??= loadEntityPicker();
    return pending;
}
async function loadEntityPicker() {
    const loader = window
        .loadCardHelpers;
    if (loader) {
        try {
            const helpers = await loader();
            const card = helpers.createCardElement({ type: 'entities', entities: [] });
            await card.constructor.getConfigElement?.();
        }
        catch {
            // Fall through to the whenDefined wait — another surface may register it.
        }
    }
    if (!customElements.get('ha-entity-picker')) {
        await customElements.whenDefined('ha-entity-picker');
    }
}

/**
 * The single entity field for config surfaces — a thin wrapper over Home
 * Assistant's own `ha-entity-picker`, which supplies friendly names, icons,
 * area context, fuzzy search and keyboard/screen-reader behaviour we would
 * otherwise hand-roll (ADR 0043).
 *
 * `options` stays the authority on what may be picked: the Config Dialog
 * already filters by domain, device class and integration platform, and the
 * picker's own `includeDomains`/`includeDeviceClasses` cannot express the
 * platform filter. `allow-custom-entity` is deliberately never set — a typed
 * value that matches no entity must not be committable.
 *
 * The one thing `options` may not do is exclude the value already configured.
 * Home Assistant applies its own `includeDeviceClasses` / `entityFilter` with
 * an `id === value` escape hatch precisely so a saved entity always survives
 * its own filter; `includeEntities`, which is what this component drives, has
 * no such hatch and would render that entity as *"Unknown entity selected"*
 * (issue #37). `_includeEntities` restores the rule at the seam where the
 * card took the filtering over.
 *
 * `hass` here is the entity registry, not growspace data, so reading it in a
 * component does not cross the store layering rule in CLAUDE.md.
 */
/** Friendly name for an entity id, falling back to the id itself. */
function entityLabel(hass, entityId) {
    return hass?.states?.[entityId]?.attributes?.friendly_name || entityId;
}
let GmEntityPicker = class GmEntityPicker extends i$2 {
    constructor() {
        super(...arguments);
        this.label = '';
        this.value = '';
        /** The entity ids that may be picked; already filtered by the caller. */
        this.options = [];
        this.disabled = false;
        /** Clear the field after a pick — used by the multi-select's add affordance. */
        this.clearOnPick = false;
        this._ready = customElements.get('ha-entity-picker') !== undefined;
    }
    connectedCallback() {
        super.connectedCallback();
        if (!this._ready) {
            void ensureEntityPicker().then(() => {
                this._ready = true;
            });
        }
    }
    render() {
        if (!this.hass)
            return E;
        if (!this._ready)
            return x `<div class="loading">${this.label}…</div>`;
        return x `
      <ha-entity-picker
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        .includeEntities=${this._includeEntities}
        .disabled=${this.disabled}
        @value-changed=${this._picked}
      ></ha-entity-picker>
    `;
    }
    /**
     * The pickable ids, with the configured value unioned in. A value naming no
     * live entity is still added and still resolves to nothing, so HA's own
     * "Unknown entity selected" affordance for a renamed or removed entity is
     * preserved (ADR 0034) — only a *live* entity the caller's filter missed
     * changes behaviour.
     */
    get _includeEntities() {
        if (!this.value || this.options.includes(this.value))
            return this.options;
        return [...this.options, this.value];
    }
    _picked(event) {
        event.stopPropagation();
        const picked = event.detail.value ?? '';
        if (this.clearOnPick) {
            // The binding is already '' here, so Lit would not reset the picker's own
            // value — clear the element directly.
            event.target.value = '';
        }
        else {
            this.value = picked;
        }
        this.dispatchEvent(new CustomEvent('entity-picked', {
            detail: picked,
            bubbles: true,
            composed: true,
        }));
    }
};
GmEntityPicker.styles = i$1 `
    :host {
      display: block;
      width: 100%;
    }

    ha-entity-picker {
      display: block;
      width: 100%;
      /* A registered ha-entity-picker can still throw on its own first render
         (a lazily-loaded-chunk race distinct from the registration this._ready
         already waits for — see ADR 0043 and issue 673), leaving its shadow
         root empty. This floor keeps the field visible and holds its layout
         slot until a later hass update lets it retry and succeed. */
      min-height: 44px;
    }

    .loading {
      min-height: 44px;
      padding: 12px 0;
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 1rem;
    }
  `;
__decorate([
    c({ context: hassContext, subscribe: true }),
    n({ attribute: false })
], GmEntityPicker.prototype, "hass", void 0);
__decorate([
    n()
], GmEntityPicker.prototype, "label", void 0);
__decorate([
    n()
], GmEntityPicker.prototype, "value", void 0);
__decorate([
    n({ attribute: false })
], GmEntityPicker.prototype, "options", void 0);
__decorate([
    n({ type: Boolean })
], GmEntityPicker.prototype, "disabled", void 0);
__decorate([
    n({ type: Boolean, attribute: 'clear-on-pick' })
], GmEntityPicker.prototype, "clearOnPick", void 0);
__decorate([
    r()
], GmEntityPicker.prototype, "_ready", void 0);
GmEntityPicker = __decorate([
    t$1('gm-entity-picker')
], GmEntityPicker);

/** Shared multi-select entity field for Config Dialog tabs. */
let ConfigEntityMultiSelect = class ConfigEntityMultiSelect extends i$2 {
    constructor() {
        super(...arguments);
        this.label = '';
        this.values = [];
        this.options = [];
    }
    render() {
        const remaining = this.options.filter((option) => !this.values.includes(option));
        return x `
      <div class="multi-select-box">
        <label>${this.label}</label>
        <div class="chips">
          ${this.values.map((value) => x `
              <div class="chip">
                <span class="chip-label" title=${value}>
                  <span class="chip-name">${entityLabel(this.hass, value)}</span>
                  ${entityLabel(this.hass, value) === value
            ? E
            : x `<span class="chip-id">${value}</span>`}
                </span>
                <button
                  type="button"
                  class="chip-remove"
                  aria-label=${`Remove ${value}`}
                  title=${`Remove ${value}`}
                  @click=${() => this._remove(value)}
                >
                  ×
                </button>
              </div>
            `)}
        </div>
        <gm-entity-picker
          class="add-picker"
          label="Add entity"
          .options=${remaining}
          .hass=${this.hass}
          clear-on-pick
          @entity-picked=${this._add}
        ></gm-entity-picker>
      </div>
    `;
    }
    _add(event) {
        event.stopPropagation();
        const value = event.detail;
        if (value && !this.values.includes(value))
            this._emit([...this.values, value]);
    }
    _remove(value) {
        this._emit(this.values.filter((candidate) => candidate !== value));
    }
    _emit(values) {
        this.dispatchEvent(new CustomEvent('entity-values-changed', {
            detail: { values },
            bubbles: true,
            composed: true,
        }));
    }
};
ConfigEntityMultiSelect.styles = i$1 `
    :host {
      display: block;
      position: relative;
    }

    /* The picker below brings its own textfield chrome, so the field itself is
       a plain stack: label, chips, picker. */
    .multi-select-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    label {
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 0.857143rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      max-width: 100%;
      min-height: 44px;
      padding: 0 4px 0 12px;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
      font-size: 1rem;
    }

    /* Entity IDs run long; truncate so the remove control stays reachable. */
    .chip-label {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      line-height: 1.2;
    }

    .chip-name,
    .chip-id {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-id {
      color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      font-size: 0.857143rem;
    }

    .chip-remove {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      margin-left: 2px;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      opacity: 0.7;
    }

    .chip-remove:hover {
      opacity: 1;
    }

    .chip-remove:focus-visible {
      outline: 2px solid var(--primary-text-color, #fff);
      outline-offset: -4px;
      opacity: 1;
    }

    /* The add affordance keeps its own row so it stays visible — and a second
       entity stays discoverable — once chips are present. */
    .add-picker {
      width: 100%;
    }

    ${reducedMotion}
  `;
__decorate([
    c({ context: hassContext, subscribe: true }),
    n({ attribute: false })
], ConfigEntityMultiSelect.prototype, "hass", void 0);
__decorate([
    n()
], ConfigEntityMultiSelect.prototype, "label", void 0);
__decorate([
    n({ attribute: false })
], ConfigEntityMultiSelect.prototype, "values", void 0);
__decorate([
    n({ attribute: false })
], ConfigEntityMultiSelect.prototype, "options", void 0);
ConfigEntityMultiSelect = __decorate([
    t$1('config-entity-multi-select')
], ConfigEntityMultiSelect);

let SubareaConfigDialog = class SubareaConfigDialog extends i$2 {
    constructor() {
        super(...arguments);
        this.open = false;
        this.growspaceId = '';
        // Sensor state fields matching EnvironmentConfig
        this._temperatureSensors = [];
        this._humiditySensors = [];
        this._vpdSensors = [];
        this._lightSensors = [];
        this._exhaustFanEntities = [];
        this._circulationFanEntities = [];
        this._humidifierEntities = [];
        this._dehumidifierEntities = [];
        this._substrateTemperatureSensors = [];
        this._cameraEntities = [];
        this._saving = false;
        this._error = '';
    }
    willUpdate(changedProperties) {
        if (changedProperties.has('subarea') && this.subarea) {
            this._populateFromSubarea(this.subarea);
        }
        if (changedProperties.has('open') && this.open && this.subarea) {
            this._populateFromSubarea(this.subarea);
        }
    }
    _populateFromSubarea(subarea) {
        const cfg = subarea.environment_config;
        this._temperatureSensors = [...(cfg.temperature_sensors ?? [])];
        this._humiditySensors = [...(cfg.humidity_sensors ?? [])];
        this._vpdSensors = [...(cfg.vpd_sensors ?? [])];
        this._lightSensors = [...(cfg.light_sensors ?? [])];
        this._exhaustFanEntities = [...(cfg.exhaust_fan_entities ?? [])];
        this._circulationFanEntities = [...(cfg.circulation_fan_entities ?? [])];
        this._humidifierEntities = [...(cfg.humidifier_entities ?? [])];
        this._dehumidifierEntities = [...(cfg.dehumidifier_entities ?? [])];
        this._substrateTemperatureSensors = [...(cfg.substrate_temperature_sensors ?? [])];
        this._cameraEntities = [...(cfg.camera_entities ?? [])];
    }
    _close() {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
    async _save() {
        if (!this.subarea || !this.growspaceId)
            return;
        this._saving = true;
        this._error = '';
        const updatedConfig = {
            temperature_sensors: this._temperatureSensors,
            humidity_sensors: this._humiditySensors,
            vpd_sensors: this._vpdSensors,
            light_sensors: this._lightSensors,
            exhaust_fan_entities: this._exhaustFanEntities,
            circulation_fan_entities: this._circulationFanEntities,
            humidifier_entities: this._humidifierEntities,
            dehumidifier_entities: this._dehumidifierEntities,
            substrate_temperature_sensors: this._substrateTemperatureSensors,
            camera_entities: this._cameraEntities,
        };
        try {
            await updateSubarea(this.growspaceId, this.subarea.id, updatedConfig);
            const updated = {
                ...this.subarea,
                environment_config: { ...this.subarea.environment_config, ...updatedConfig },
            };
            this.dispatchEvent(new CustomEvent('subarea-updated', {
                detail: { subarea: updated },
                bubbles: true,
                composed: true,
            }));
            this._close();
        }
        catch (e) {
            console.error('[SubareaConfigDialog] Failed to save:', e);
            this._error = 'Failed to save subarea configuration.';
        }
        finally {
            this._saving = false;
        }
    }
    _getEntities(domains, deviceClass) {
        if (!this.hass)
            return [];
        return Object.keys(this.hass.states || {})
            .filter((eid) => {
            const state = this.hass.states[eid];
            if (!state)
                return false;
            const domain = eid.split('.')[0];
            const hasDomain = domains.includes(domain);
            const hasDeviceClass = !deviceClass || state.attributes.device_class === deviceClass;
            return hasDomain && hasDeviceClass;
        })
            .sort();
    }
    _renderMultiEntitySelect(label, values, domains, deviceClass, changeHandler) {
        return x `
      <config-entity-multi-select
        .hass=${this.hass}
        .label=${label}
        .values=${values}
        .options=${this._getEntities(domains, deviceClass)}
        @entity-values-changed=${(event) => changeHandler(event.detail.values)}
      ></config-entity-multi-select>
    `;
    }
    render() {
        if (!this.open)
            return E;
        return x `
      <gs-dialog
        .open=${this.open}
        heading="Configure Subarea"
        .subtitle=${this.subarea?.name ?? ''}
        .iconPath=${mdiViewGrid}
        containerStyle="max-width: 680px; height: auto; max-height: 90vh;"
        @close=${this._close}
      >
        <gs-help-tooltip
          slot="header-extra"
          content="Assign sensors and actuators to this subarea for independent environment monitoring."
          placement="bottom"
          label="Subarea Config"
        ></gs-help-tooltip>

        <!-- Content -->
        <div
          class="config-content"
          style="padding: 20px; overflow-y: auto; max-height: calc(90vh - 140px);"
        >
          <div class="form-section">
            <div class="section-header">Monitoring Sensors</div>

            ${this._renderMultiEntitySelect('Temperature Sensors', this._temperatureSensors, ['sensor', 'input_number'], 'temperature', (v) => (this._temperatureSensors = v))}
            ${this._renderMultiEntitySelect('Humidity Sensors', this._humiditySensors, ['sensor', 'input_number'], 'humidity', (v) => (this._humiditySensors = v))}
            ${this._renderMultiEntitySelect('VPD Sensors', this._vpdSensors, ['sensor', 'input_number'], 'pressure', (v) => (this._vpdSensors = v))}
            ${this._renderMultiEntitySelect('Substrate Temperature Sensors', this._substrateTemperatureSensors, ['sensor', 'input_number'], 'temperature', (v) => (this._substrateTemperatureSensors = v))}
            ${this._renderMultiEntitySelect('Light Source / Sensor', this._lightSensors, ['switch', 'light', 'input_boolean', 'sensor'], null, (v) => (this._lightSensors = v))}

            <div class="section-header" style="margin-top: 8px;">Climate Control</div>

            ${this._renderMultiEntitySelect('Exhaust Fan / Switch', this._exhaustFanEntities, ['fan', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'], null, (v) => (this._exhaustFanEntities = v))}
            ${this._renderMultiEntitySelect('Circulation Fan / Switch', this._circulationFanEntities, ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'], null, (v) => (this._circulationFanEntities = v))}
            ${this._renderMultiEntitySelect('Humidifier', this._humidifierEntities, ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'input_number'], null, (v) => (this._humidifierEntities = v))}
            ${this._renderMultiEntitySelect('Dehumidifier', this._dehumidifierEntities, ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'], null, (v) => (this._dehumidifierEntities = v))}

            <div class="section-header" style="margin-top: 8px;">Cameras</div>

            ${this._renderMultiEntitySelect('Camera Entities', this._cameraEntities, ['camera'], null, (v) => (this._cameraEntities = v))}
            ${this._error ? x `<div class="error-message">${this._error}</div>` : E}
          </div>
        </div>

        <!-- Actions -->
        <div class="button-group" style="padding: 16px;">
          <button class="md3-button tonal" @click=${this._close} ?disabled=${this._saving}>
            Cancel
          </button>
          <button class="md3-button primary" @click=${this._save} ?disabled=${this._saving}>
            ${this._saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </gs-dialog>
    `;
    }
};
SubareaConfigDialog.styles = [
    dialogStyles,
    i$1 `
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        font-weight: 500;
        color: var(--secondary-text-color);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .error-message {
        color: var(--error-color, #f44336);
        font-size: 0.85rem;
        padding: 8px 0;
      }
    `,
];
__decorate([
    n({ type: Boolean, reflect: true })
], SubareaConfigDialog.prototype, "open", void 0);
__decorate([
    n({ attribute: false })
], SubareaConfigDialog.prototype, "hass", void 0);
__decorate([
    n({ type: String })
], SubareaConfigDialog.prototype, "growspaceId", void 0);
__decorate([
    n({ attribute: false })
], SubareaConfigDialog.prototype, "subarea", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_temperatureSensors", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_humiditySensors", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_vpdSensors", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_lightSensors", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_exhaustFanEntities", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_circulationFanEntities", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_humidifierEntities", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_dehumidifierEntities", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_substrateTemperatureSensors", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_cameraEntities", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_saving", void 0);
__decorate([
    r()
], SubareaConfigDialog.prototype, "_error", void 0);
SubareaConfigDialog = __decorate([
    t$1('subarea-config-dialog')
], SubareaConfigDialog);

/**
 * UUID generation that survives insecure contexts.
 *
 * `crypto.randomUUID` is restricted to secure contexts, so it is undefined on a
 * Home Assistant instance reached over plain HTTP (e.g. http://homeassistant.local:8123).
 * `crypto.getRandomValues` carries no such restriction, so fall back to building a
 * v4 UUID from it.
 */
/** Generate a v4 UUID, working in both secure and insecure browsing contexts. */
function randomId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set the version (4) and variant (10xx) bits the v4 layout requires.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Config Dialog State Machine
 *
 * Pure module — no Lit, no DOM. All interaction state for ConfigDialog lives here.
 * The component calls `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * Structure:
 *   ConfigDialogSM
 *     .activeTab          — which tab is visible
 *     .status             — root-level tab-switch confirm overlay
 *     .toast              — transient message
 *     .environmentDraft   — shared draft for sensors/climate/humidity/irrigation/vision tabs
 *     .tabs               — per-tab sub-state
 */
// ─── Default draft ────────────────────────────────────────────────────────────
function defaultNotificationsDraft() {
    return {
        criticalCooldownMinutes: 60,
        warningCooldownMinutes: 30,
        recoveryCooldownMinutes: 15,
        escalationDelayMinutes: 30,
        minStressDurationSeconds: 300,
        warningPersistenceMinutes: 60,
        aiAutoAlerts: true,
    };
}
function defaultTimedNotificationDraft() {
    return { message: '', triggerType: 'clone', day: 1, growspaceIds: [] };
}
function defaultNotificationsTabState() {
    return { draft: defaultNotificationsDraft(), timedNotifications: [], sub: { kind: 'idle' } };
}
function defaultEnvironmentDraft() {
    return {
        selectedGrowspaceId: '',
        temperatureSensors: [],
        humiditySensors: [],
        vpdSensors: [],
        co2Sensor: '',
        lightSensors: [],
        exhaustFanEntities: [],
        circulationFanEntities: [],
        exhaustFanAcInfinityDevices: [],
        circulationFanAcInfinityDevices: [],
        stressThreshold: null,
        moldThreshold: null,
        humidifierEntities: [],
        dehumidifierEntities: [],
        humidifierAcInfinityDevices: [],
        dehumidifierAcInfinityDevices: [],
        humidifierThresholds: {},
        dehumidifierThresholds: {},
        humidifierControlEnabled: false,
        dehumidifierControlEnabled: false,
        soilMoistureSensor: '',
        soilMoistureMin: null,
        soilMoistureMax: null,
        substrateTemperatureSensors: [],
        phSensors: [],
        feedEcSensors: [],
        bulkEcSensors: [],
        poreEcSensors: [],
        runoffEcSensors: [],
        drainVolumeSensors: [],
        irrigationFlowSensors: [],
        powerSensors: [],
        energySensors: [],
        sensorGroups: [],
        sensorCoordinates: {},
        irrigationTanks: [],
        cameraEntities: [],
        lungroomTempSensors: [],
        visionEnabled: false,
        visionEarlyOffset: 60,
        visionMidHours: 6,
        visionLateOffset: 60,
        circulationFanConfig: {
            enabled: false,
            regulation_mode: 'vpd',
            min_speed: 0,
            max_speed: 100,
            vpd_target: 1.0,
            vpd_tolerance: 0.2,
            humidity_target: 60.0,
            humidity_tolerance: 5.0,
            temperature_target: 25.0,
            temperature_tolerance: 2.0,
            critical_temp_low: null,
            critical_temp_high: null,
            critical_temp_hysteresis: 1.0,
            wind_enabled: false,
            wind_period_seconds: 60,
            wind_amplitude_pct: 10,
            stage_vpd_enabled: false,
            stage_vpd_overrides: {},
        },
        exhaustFanConfig: {
            enabled: false,
            min_speed: 0,
            max_speed: 100,
            vpd_target: 1.0,
            vpd_tolerance: 0.2,
            humidity_target: 60.0,
            humidity_tolerance: 5.0,
            temperature_target: 25.0,
            temperature_tolerance: 2.0,
            critical_temp_low: null,
            critical_temp_high: null,
            critical_temp_hysteresis: 1.0,
            stage_vpd_enabled: false,
            stage_vpd_overrides: {},
        },
        growlightEntities: [],
        growlightAcInfinityDevices: [],
        growlightConfig: {
            enabled: false,
            power: 100,
            sunrise_enabled: false,
            sunrise_minutes: 0,
        },
        vpdOptimalOverrides: {},
        lstOffset: -2,
    };
}
function defaultTabs() {
    return {
        growspaces: { sub: { kind: 'idle' } },
        notifications: defaultNotificationsTabState(),
        sensors: { sub: { kind: 'idle' } },
        climate: { sub: { kind: 'idle' } },
        growlight: { sub: { kind: 'idle' } },
        humidity: { sub: { kind: 'idle' } },
        irrigation: { sub: { kind: 'idle' } },
        tanks: { sub: { kind: 'idle' } },
        vision: { sub: { kind: 'idle' } },
        heatmap: { sub: { kind: 'idle' } },
        subareas: { sub: { kind: 'idle' } },
        vpd_targets: { sub: { kind: 'idle' } },
    };
}
/** Seed NotificationsTabState from a GrowspaceDevice. */
function notificationsTabFromDevice(device) {
    const ns = device.notificationSettings ?? {};
    const defaults = defaultNotificationsDraft();
    return {
        draft: {
            criticalCooldownMinutes: ns.criticalCooldownMinutes ?? defaults.criticalCooldownMinutes,
            warningCooldownMinutes: ns.warningCooldownMinutes ?? defaults.warningCooldownMinutes,
            recoveryCooldownMinutes: ns.recoveryCooldownMinutes ?? defaults.recoveryCooldownMinutes,
            escalationDelayMinutes: ns.escalationDelayMinutes ?? defaults.escalationDelayMinutes,
            minStressDurationSeconds: ns.minStressDurationSeconds ?? defaults.minStressDurationSeconds,
            warningPersistenceMinutes: ns.warningPersistenceMinutes ?? defaults.warningPersistenceMinutes,
            aiAutoAlerts: ns.aiAutoAlerts ?? defaults.aiAutoAlerts,
        },
        timedNotifications: device.timedNotifications
            ? device.timedNotifications.map((n) => ({
                id: n.id,
                message: n.message,
                triggerType: n.triggerType,
                day: n.day,
                growspaceIds: n.growspaceIds,
            }))
            : [],
        sub: { kind: 'idle' },
    };
}
/** Seed EnvironmentDraft from a GrowspaceDevice. */
function envDraftFromDevice(device) {
    const attrs = device.environmentAttributes ?? {};
    const vc = attrs.visionCheckupConfig;
    return {
        selectedGrowspaceId: device.deviceId,
        temperatureSensors: attrs.temperatureSensors?.length
            ? attrs.temperatureSensors
            : attrs.temperatureSensor
                ? [attrs.temperatureSensor]
                : [],
        humiditySensors: attrs.humiditySensors?.length
            ? attrs.humiditySensors
            : attrs.humiditySensor
                ? [attrs.humiditySensor]
                : [],
        vpdSensors: attrs.vpdSensors?.length
            ? attrs.vpdSensors
            : attrs.vpdSensor
                ? [attrs.vpdSensor]
                : [],
        co2Sensor: attrs.co2Sensor ?? '',
        lightSensors: attrs.lightSensors?.length
            ? attrs.lightSensors
            : attrs.lightSensor
                ? [attrs.lightSensor]
                : [],
        exhaustFanEntities: attrs.exhaustFanEntities?.length
            ? attrs.exhaustFanEntities
            : attrs.exhaustEntity
                ? [attrs.exhaustEntity]
                : [],
        circulationFanEntities: attrs.circulationFanEntities?.length
            ? attrs.circulationFanEntities
            : attrs.circulationFanEntity
                ? [attrs.circulationFanEntity]
                : [],
        stressThreshold: attrs.stressThreshold ?? null,
        moldThreshold: attrs.moldThreshold ?? null,
        humidifierEntities: attrs.humidifierEntities?.length
            ? attrs.humidifierEntities
            : attrs.humidifierEntity
                ? [attrs.humidifierEntity]
                : [],
        dehumidifierEntities: attrs.dehumidifierEntities?.length
            ? attrs.dehumidifierEntities
            : attrs.dehumidifierEntity
                ? [attrs.dehumidifierEntity]
                : [],
        humidifierThresholds: attrs.humidifierThresholds ?? {},
        dehumidifierThresholds: attrs.dehumidifierThresholds ?? {},
        humidifierControlEnabled: attrs.humidifierControlEnabled ?? false,
        dehumidifierControlEnabled: attrs.dehumidifierControlEnabled ?? false,
        exhaustFanAcInfinityDevices: attrs.exhaustFanAcInfinityDevices ?? [],
        circulationFanAcInfinityDevices: attrs.circulationFanAcInfinityDevices ?? [],
        humidifierAcInfinityDevices: attrs.humidifierAcInfinityDevices ?? [],
        dehumidifierAcInfinityDevices: attrs.dehumidifierAcInfinityDevices ?? [],
        soilMoistureSensor: attrs.soilMoistureSensor ?? '',
        soilMoistureMin: attrs.soilMoistureMin ?? null,
        soilMoistureMax: attrs.soilMoistureMax ?? null,
        substrateTemperatureSensors: attrs.substrateTemperatureSensors ?? [],
        phSensors: attrs.phSensors ?? [],
        feedEcSensors: attrs.feedEcSensors ?? [],
        bulkEcSensors: attrs.bulkEcSensors ?? [],
        poreEcSensors: attrs.poreEcSensors ?? [],
        runoffEcSensors: attrs.runoffEcSensors ?? [],
        drainVolumeSensors: attrs.drainVolumeSensors ?? [],
        irrigationFlowSensors: attrs.irrigationFlowSensors ?? [],
        powerSensors: attrs.powerSensors ?? [],
        energySensors: attrs.energySensors ?? [],
        sensorGroups: attrs.sensorGroups ?? [],
        sensorCoordinates: attrs.sensorCoordinates ?? {},
        irrigationTanks: (attrs.irrigationTanks ?? []).map((t) => ({
            sensorEntity: t.sensorEntity ?? '',
            name: t.name ?? 'Tank',
            volumeLiters: t.volumeLiters ?? null,
            warningLevel: t.warningLevel ?? 30,
        })),
        cameraEntities: attrs.cameraEntities ?? [],
        lungroomTempSensors: attrs.lungroomTempSensors ?? [],
        visionEnabled: vc?.enabled ?? false,
        visionEarlyOffset: vc?.early_check_offset_minutes ?? 60,
        visionMidHours: vc?.mid_check_hours ?? 6,
        visionLateOffset: vc?.late_check_offset_minutes ?? 60,
        circulationFanConfig: attrs.circulationFanConfig ?? defaultEnvironmentDraft().circulationFanConfig,
        exhaustFanConfig: attrs.exhaustFanConfig ?? defaultEnvironmentDraft().exhaustFanConfig,
        growlightEntities: attrs.growlightEntities ?? [],
        growlightAcInfinityDevices: attrs.growlightAcInfinityDevices ?? [],
        growlightConfig: attrs.growlightConfig ?? defaultEnvironmentDraft().growlightConfig,
        vpdOptimalOverrides: attrs.vpdOptimalOverrides ?? {},
        lstOffset: attrs.lstOffset ?? -2,
    };
}
/** Create the initial SM state, optionally seeded from a device. */
function createInitialSM(device) {
    const sm = {
        activeTab: 'sensors',
        tabs: defaultTabs(),
        status: { kind: 'idle' },
        toast: undefined,
        environmentDraft: defaultEnvironmentDraft(),
        environmentDirty: new Set(),
    };
    if (device) {
        return applyDeviceToSM(sm, device);
    }
    return sm;
}
/** Rebuild environmentDraft and notifications tab from device data (used on open and after RESET_FROM_DEVICE). */
function applyDeviceToSM(sm, device) {
    return {
        ...sm,
        environmentDraft: envDraftFromDevice(device),
        // Re-seeding is the only thing that clears the write set (ADR-0032). It
        // runs after a successful save + refresh; a failed save leaves the set
        // intact so Retry sends the same patch.
        environmentDirty: new Set(),
        tabs: { ...sm.tabs, notifications: notificationsTabFromDevice(device) },
    };
}
// ─── Dirty predicates ─────────────────────────────────────────────────────────
/** True if the growspaces tab has unsaved in-progress changes. */
function isGrowspacesDirty(sm, device) {
    const sub = sm.tabs.growspaces.sub;
    if (sub.kind === 'adding') {
        return sub.name.trim() !== '' || sub.rows !== 4 || sub.plantsPerRow !== 4;
    }
    if (sub.kind === 'editing') {
        return (sub.name !== (device.name ?? '') ||
            sub.rows !== (device.rows ?? 4) ||
            sub.plantsPerRow !== (device.plantsPerRow ?? 4) ||
            sub.notificationService !== (device.notificationTarget ?? ''));
    }
    return false;
}
/** True if the notifications tab has unsaved changes relative to the device. */
function isNotificationsDirty(sm, device) {
    const tab = sm.tabs.notifications;
    const sub = tab.sub;
    if (sub.kind === 'adding') {
        return (sub.draft.message.trim() !== '' || sub.draft.day !== 1 || sub.draft.growspaceIds.length > 0);
    }
    if (sub.kind === 'editing') {
        const original = tab.timedNotifications.find((n) => n.id === sub.id);
        if (!original)
            return true;
        return (JSON.stringify(sub.draft) !==
            JSON.stringify({
                message: original.message,
                triggerType: original.triggerType,
                day: original.day,
                growspaceIds: original.growspaceIds,
            }));
    }
    const seeded = notificationsTabFromDevice(device);
    if (JSON.stringify(tab.draft) !== JSON.stringify(seeded.draft))
        return true;
    if (JSON.stringify(tab.timedNotifications) !== JSON.stringify(seeded.timedNotifications))
        return true;
    return false;
}
/**
 * Returns true if the currently-active tab has unsaved changes.
 * Environment tabs share one draft, so navigating from any of them must compare
 * that complete draft with the canonical device seeder.
 */
function isActiveTabDirty(sm, device) {
    if (sm.activeTab === 'growspaces') {
        return isGrowspacesDirty(sm, device);
    }
    if (sm.activeTab === 'notifications') {
        return isNotificationsDirty(sm, device);
    }
    return JSON.stringify(sm.environmentDraft) !== JSON.stringify(envDraftFromDevice(device));
}
// ─── Transition helpers ───────────────────────────────────────────────────────
/**
 * Request a tab switch with dirty-state handling.
 * Automatically dispatches REQUEST_TAB or SWITCH_TAB based on dirty state.
 */
function requestTabSwitch(sm, tab, device) {
    if (sm.activeTab === tab)
        return sm;
    if (isActiveTabDirty(sm, device)) {
        return transition(sm, { type: 'REQUEST_TAB', tab });
    }
    return transition(sm, { type: 'SWITCH_TAB', tab });
}
/**
 * Discard the active tab's draft and switch to the pending tab.
 */
function discardAndSwitch(sm, device) {
    if (sm.status.kind !== 'confirm-discard' || !('pendingTab' in sm.status))
        return sm;
    const pendingTab = sm.status.pendingTab;
    const reset = applyDeviceToSM(sm, device);
    return {
        ...reset,
        activeTab: pendingTab,
        status: { kind: 'idle' },
        tabs: {
            ...reset.tabs,
            growspaces: { sub: { kind: 'idle' } },
        },
    };
}
// ─── Transition function ──────────────────────────────────────────────────────
/** Pure state machine transition. Returns a new SM without mutating the input. */
function transition(sm, event) {
    switch (event.type) {
        // ── Navigation ────────────────────────────────────────────────────────────
        case 'REQUEST_TAB':
            return { ...sm, status: { kind: 'confirm-discard', pendingTab: event.tab } };
        case 'REQUEST_CLOSE':
            return { ...sm, status: { kind: 'confirm-discard', pendingAction: 'close' } };
        case 'REQUEST_GROWSPACE_CHANGE':
            return {
                ...sm,
                status: {
                    kind: 'confirm-discard',
                    pendingAction: 'change-growspace',
                    growspaceId: event.growspaceId,
                },
            };
        case 'SWITCH_TAB':
            return { ...sm, activeTab: event.tab, status: { kind: 'idle' } };
        case 'DISCARD_AND_SWITCH': {
            if (sm.status.kind !== 'confirm-discard' || !('pendingTab' in sm.status))
                return sm;
            return {
                ...sm,
                activeTab: sm.status.pendingTab,
                status: { kind: 'idle' },
                tabs: { ...sm.tabs, growspaces: { sub: { kind: 'idle' } } },
            };
        }
        case 'CANCEL_TAB_SWITCH':
            return { ...sm, status: { kind: 'idle' } };
        // ── Growspaces ────────────────────────────────────────────────────────────
        case 'START_ADD_GROWSPACE':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: {
                        sub: { kind: 'adding', name: '', rows: 4, plantsPerRow: 4, notificationService: '' },
                    },
                },
            };
        case 'UPDATE_ADD_DRAFT': {
            const sub = sm.tabs.growspaces.sub;
            if (sub.kind !== 'adding')
                return sm;
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: { sub: { ...sub, ...event.partial } },
                },
            };
        }
        case 'SELECT_GROWSPACE':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: {
                        sub: {
                            kind: 'editing',
                            growspaceId: event.growspaceId,
                            name: event.name,
                            rows: event.rows,
                            plantsPerRow: event.plantsPerRow,
                            notificationService: event.notificationService,
                        },
                    },
                },
            };
        case 'UPDATE_EDIT_DRAFT': {
            const sub = sm.tabs.growspaces.sub;
            if (sub.kind !== 'editing')
                return sm;
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: { sub: { ...sub, ...event.partial } },
                },
            };
        }
        case 'REQUEST_DELETE_GROWSPACE':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: {
                        sub: { kind: 'confirm-delete', growspaceId: event.growspaceId, name: event.name },
                    },
                },
            };
        case 'REQUEST_REMOVE_ENVIRONMENT': {
            const sub = sm.tabs.growspaces.sub;
            if (sub.kind !== 'editing')
                return sm;
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: {
                        sub: {
                            kind: 'confirm-remove-environment',
                            editing: sub,
                            sensorCount: event.sensorCount,
                            controllerCount: event.controllerCount,
                        },
                    },
                },
            };
        }
        case 'START_REMOVE_ENVIRONMENT': {
            const sub = sm.tabs.growspaces.sub;
            if (sub.kind !== 'confirm-remove-environment')
                return sm;
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    growspaces: { sub: { ...sub, kind: 'removing-environment' } },
                },
            };
        }
        case 'CANCEL_REMOVE_ENVIRONMENT': {
            const sub = sm.tabs.growspaces.sub;
            if (sub.kind !== 'confirm-remove-environment' && sub.kind !== 'removing-environment') {
                return sm;
            }
            return {
                ...sm,
                tabs: { ...sm.tabs, growspaces: { sub: sub.editing } },
            };
        }
        case 'CANCEL_GROWSPACES':
            return {
                ...sm,
                tabs: { ...sm.tabs, growspaces: { sub: { kind: 'idle' } } },
            };
        // ── Notifications ─────────────────────────────────────────────────────────
        case 'UPDATE_NOTIFICATIONS_DRAFT':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        draft: { ...sm.tabs.notifications.draft, ...event.partial },
                    },
                },
            };
        case 'UPDATE_TIMED_DRAFT': {
            const sub = sm.tabs.notifications.sub;
            if (sub.kind !== 'adding' && sub.kind !== 'editing')
                return sm;
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        sub: { ...sub, draft: { ...sub.draft, ...event.partial } },
                    },
                },
            };
        }
        case 'START_ADD_TIMED_NOTIFICATION':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        sub: { kind: 'adding', draft: defaultTimedNotificationDraft() },
                    },
                },
            };
        case 'START_EDIT_TIMED_NOTIFICATION':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        sub: { kind: 'editing', id: event.id, draft: { ...event.draft } },
                    },
                },
            };
        case 'ADD_TIMED_NOTIFICATION': {
            const sub = sm.tabs.notifications.sub;
            if (sub.kind !== 'adding')
                return sm;
            const newItem = { id: event.id, ...sub.draft };
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        timedNotifications: [...sm.tabs.notifications.timedNotifications, newItem],
                        sub: { kind: 'idle' },
                    },
                },
            };
        }
        case 'EDIT_TIMED_NOTIFICATION': {
            const sub = sm.tabs.notifications.sub;
            if (sub.kind !== 'editing')
                return sm;
            const updated = sm.tabs.notifications.timedNotifications.map((n) => n.id === sub.id ? { id: sub.id, ...sub.draft } : n);
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        timedNotifications: updated,
                        sub: { kind: 'idle' },
                    },
                },
            };
        }
        case 'DELETE_TIMED_NOTIFICATION':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        sub: { kind: 'confirm-delete', id: event.id },
                    },
                },
            };
        case 'CONFIRM_DELETE': {
            const sub = sm.tabs.notifications.sub;
            if (sub.kind !== 'confirm-delete')
                return sm;
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: {
                        ...sm.tabs.notifications,
                        timedNotifications: sm.tabs.notifications.timedNotifications.filter((n) => n.id !== sub.id),
                        sub: { kind: 'idle' },
                    },
                },
            };
        }
        case 'CANCEL_TIMED_NOTIFICATION':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: { ...sm.tabs.notifications, sub: { kind: 'idle' } },
                },
            };
        case 'SAVE_NOTIFICATIONS':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    notifications: { ...sm.tabs.notifications, sub: { kind: 'idle' } },
                },
            };
        // ── Environment ───────────────────────────────────────────────────────────
        case 'UPDATE_ENV_DRAFT':
            return {
                ...sm,
                environmentDraft: { ...sm.environmentDraft, ...event.partial },
                // The keys the edit carried become dirty, closed under the atomic
                // groups so a lone moisture bound can never reach the wire.
                environmentDirty: expandAtomicGroups([
                    ...sm.environmentDirty,
                    ...Object.keys(event.partial),
                ]),
            };
        // ── Tanks ─────────────────────────────────────────────────────────────────
        case 'BEGIN_ADD_TANK':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    tanks: {
                        sub: {
                            kind: 'adding',
                            sensorEntity: '',
                            name: '',
                            volumeLiters: null,
                            warningLevel: 30,
                        },
                    },
                },
            };
        case 'BEGIN_EDIT_TANK':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    tanks: {
                        sub: {
                            kind: 'editing',
                            index: event.index,
                            sensorEntity: event.sensorEntity,
                            name: event.name,
                            volumeLiters: event.volumeLiters,
                            warningLevel: event.warningLevel,
                        },
                    },
                },
            };
        case 'UPDATE_TANK_DRAFT': {
            const sub = sm.tabs.tanks.sub;
            if (sub.kind !== 'adding' && sub.kind !== 'editing')
                return sm;
            return {
                ...sm,
                tabs: { ...sm.tabs, tanks: { sub: { ...sub, ...event.partial } } },
            };
        }
        case 'CANCEL_TANK':
            return { ...sm, tabs: { ...sm.tabs, tanks: { sub: { kind: 'idle' } } } };
        case 'COMMIT_TANK': {
            const sub = sm.tabs.tanks.sub;
            if (sub.kind !== 'adding' && sub.kind !== 'editing')
                return sm;
            const tank = {
                sensorEntity: sub.sensorEntity,
                name: sub.name || 'Tank',
                volumeLiters: sub.volumeLiters,
                warningLevel: sub.warningLevel,
            };
            const existing = sm.environmentDraft.irrigationTanks;
            const updatedTanks = sub.kind === 'editing'
                ? existing.map((t, i) => (i === sub.index ? tank : t))
                : [...existing, tank];
            return {
                ...sm,
                environmentDraft: { ...sm.environmentDraft, irrigationTanks: updatedTanks },
                environmentDirty: new Set([...sm.environmentDirty, 'irrigationTanks']),
                tabs: { ...sm.tabs, tanks: { sub: { kind: 'idle' } } },
            };
        }
        // ── Heatmap / sensor groups ───────────────────────────────────────────────
        case 'BEGIN_EDIT_GROUP':
            return {
                ...sm,
                tabs: { ...sm.tabs, heatmap: { sub: { kind: 'editing-group', group: event.group } } },
            };
        case 'CLOSE_GROUP_DIALOG':
            return { ...sm, tabs: { ...sm.tabs, heatmap: { sub: { kind: 'idle' } } } };
        // ── Subareas ──────────────────────────────────────────────────────────────
        case 'BEGIN_ADD_SUBAREA':
            return {
                ...sm,
                tabs: { ...sm.tabs, subareas: { sub: { kind: 'adding', name: '' } } },
            };
        case 'UPDATE_SUBAREA_NAME': {
            const sub = sm.tabs.subareas.sub;
            if (sub.kind !== 'adding')
                return sm;
            return {
                ...sm,
                tabs: { ...sm.tabs, subareas: { sub: { ...sub, name: event.name } } },
            };
        }
        case 'CANCEL_SUBAREA':
            return { ...sm, tabs: { ...sm.tabs, subareas: { sub: { kind: 'idle' } } } };
        case 'REQUEST_DELETE_SUBAREA':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    subareas: { sub: { kind: 'confirm-delete', subareaId: event.subareaId } },
                },
            };
        case 'CANCEL_DELETE_SUBAREA':
            return { ...sm, tabs: { ...sm.tabs, subareas: { sub: { kind: 'idle' } } } };
        case 'BEGIN_EDIT_SUBAREA':
            return {
                ...sm,
                tabs: {
                    ...sm.tabs,
                    subareas: { sub: { kind: 'editing-subarea', subarea: event.subarea } },
                },
            };
        case 'CLOSE_SUBAREA_DIALOG':
            return { ...sm, tabs: { ...sm.tabs, subareas: { sub: { kind: 'idle' } } } };
        // ── Global ────────────────────────────────────────────────────────────────
        case 'SET_TOAST':
            return { ...sm, toast: event.message };
        case 'RESET_FROM_DEVICE':
            return applyDeviceToSM(sm, event.device);
        default:
            return sm;
    }
}

/** Shared icon-and-label heading for Config Dialog sections. */
let ConfigSectionHeader = class ConfigSectionHeader extends i$2 {
    constructor() {
        super(...arguments);
        this.icon = '';
        this.label = '';
    }
    render() {
        return x `
      <div class="section-header">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${this.icon}></path></svg>
        <h3>${this.label}</h3>
        <slot></slot>
      </div>
    `;
    }
};
ConfigSectionHeader.styles = i$1 `
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
    }

    svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      fill: var(--primary-color, #4caf50);
    }

    h3 {
      margin: 0;
      padding: 0;
      border: 0;
      color: var(--primary-text-color, #fff);
      font: inherit;
      font-size: 1.142857rem;
      font-weight: 500;
      line-height: 1.3;
    }

    slot {
      display: flex;
      margin-left: auto;
    }
  `;
__decorate([
    n()
], ConfigSectionHeader.prototype, "icon", void 0);
__decorate([
    n()
], ConfigSectionHeader.prototype, "label", void 0);
ConfigSectionHeader = __decorate([
    t$1('config-section-header')
], ConfigSectionHeader);

/**
 * Config Notifications Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Notifications tab.
 * `@property .vm: NotificationsTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` of its own** — all draft/edit state lives in the ConfigDialogSM and
 * is projected into the VM. Markup is transcribed verbatim from the former
 * inline `_renderNotificationsSection` / `_renderTimedNotificationsSection` /
 * `_renderTimedNotificationForm` helpers. Shared config headers and dialog styles
 * keep this tab aligned with the rest of the configuration surface.
 *
 * Tab Intents (the Config Dialog Shell owns their translation to SM events):
 *   - `notif-draft-changed`   detail: { partial: Partial<NotificationsDraft> }
 *   - `add-timed-requested`   (no detail)
 *   - `edit-timed-requested`  detail: { id, draft: TimedNotificationDraft }
 *   - `timed-draft-changed`   detail: { partial: Partial<TimedNotificationDraft> }
 *   - `cancel-timed`          (no detail)
 *   - `commit-add-timed`      (no detail; the Shell generates the id)
 *   - `commit-edit-timed`     (no detail)
 *   - `request-delete-timed`  detail: { id }
 *   - `confirm-delete-timed`  (no detail)
 */
let ConfigNotificationsTab = class ConfigNotificationsTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _updateDraft(partial) {
        this._emit('notif-draft-changed', { partial });
    }
    render() {
        return x `
      <div class="notifications-layout">${this._renderSettings()}${this._renderTimed()}</div>
    `;
    }
    _renderSettings() {
        const draft = this.vm.draft;
        return x `
      <div class="detail-card" data-notif-card="settings">
        <config-section-header
          .icon=${mdiBellAlertOutline}
          label="Notification settings"
        ></config-section-header>
        <div class="settings-groups">
          <section class="settings-group" data-settings-group="alert-timing">
            <h4>Alert timing</h4>
            <p class="settings-group__description">
              Choose how long alert levels wait before repeating, recovering, or escalating.
            </p>
            <div class="settings-grid">
              <md3-number-input
                data-notif="criticalCooldownMinutes"
                label="Critical cooldown (min)"
                .value=${draft.criticalCooldownMinutes}
                @change=${(e) => this._updateDraft({ criticalCooldownMinutes: Number(e.detail) })}
              ></md3-number-input>
              <md3-number-input
                data-notif="warningCooldownMinutes"
                label="Warning cooldown (min)"
                .value=${draft.warningCooldownMinutes}
                @change=${(e) => this._updateDraft({ warningCooldownMinutes: Number(e.detail) })}
              ></md3-number-input>
              <md3-number-input
                data-notif="recoveryCooldownMinutes"
                label="Recovery cooldown (min)"
                .value=${draft.recoveryCooldownMinutes}
                @change=${(e) => this._updateDraft({ recoveryCooldownMinutes: Number(e.detail) })}
              ></md3-number-input>
              <md3-number-input
                data-notif="escalationDelayMinutes"
                label="Escalation delay (min)"
                .value=${draft.escalationDelayMinutes}
                @change=${(e) => this._updateDraft({ escalationDelayMinutes: Number(e.detail) })}
              ></md3-number-input>
            </div>
          </section>
          <section class="settings-group" data-settings-group="stress-detection">
            <h4>Stress detection</h4>
            <p class="settings-group__description">
              Choose how long stress must last before alerting and how long warnings remain active.
            </p>
            <div class="settings-grid">
              <md3-number-input
                data-notif="minStressDurationSeconds"
                label="Minimum stress duration (min)"
                .value=${draft.minStressDurationSeconds / 60}
                @change=${(e) => this._updateDraft({ minStressDurationSeconds: Number(e.detail) * 60 })}
              ></md3-number-input>
              <md3-number-input
                data-notif="warningPersistenceMinutes"
                label="Warning persistence (min)"
                .value=${draft.warningPersistenceMinutes}
                @change=${(e) => this._updateDraft({ warningPersistenceMinutes: Number(e.detail) })}
              ></md3-number-input>
            </div>
          </section>
        </div>
        <label class="checkbox-label">
          <input
            type="checkbox"
            data-notif="aiAutoAlerts"
            .checked=${draft.aiAutoAlerts}
            @change=${(e) => this._updateDraft({ aiAutoAlerts: e.target.checked })}
          />
          <span>AI Auto-Alerts</span>
        </label>
      </div>
    `;
    }
    _renderTimed() {
        const sub = this.vm.sub;
        const notifications = this.vm.timedNotifications;
        return x `
      <div class="detail-card" data-notif-card="timed">
        <config-section-header .icon=${mdiClockOutline} label="Timed notifications">
          ${sub.kind === 'idle'
            ? x `
                <button
                  class="md3-button tonal section-action"
                  style="padding:0 16px;"
                  @click=${() => this._emit('add-timed-requested')}
                >
                  Add
                </button>
              `
            : E}
        </config-section-header>

        ${sub.kind === 'confirm-delete'
            ? x `
              <div class="inline-panel" style="text-align:center;padding:24px 16px;">
                <p style="margin:0 0 16px;color:var(--secondary-text-color);">
                  Delete this timed notification?
                </p>
                <div style="display:flex;gap:8px;justify-content:center;">
                  <button class="md3-button outlined" @click=${() => this._emit('cancel-timed')}>
                    Cancel
                  </button>
                  <button
                    class="md3-button primary"
                    style="background:var(--error-color,#f44336);"
                    @click=${() => this._emit('confirm-delete-timed')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            `
            : E}
        ${sub.kind === 'adding' || sub.kind === 'editing' ? this._renderForm(sub) : E}
        ${notifications.length === 0 && sub.kind === 'idle'
            ? x `
              <div class="empty-state" data-timed="empty-state">
                No timed notifications configured
              </div>
            `
            : E}
        ${sub.kind === 'idle' || sub.kind === 'confirm-delete'
            ? x `
              <div class="timed-list">
                ${notifications.map((n) => x `
                    <div class="cfg-gs-row timed-row" data-timed-id=${n.id}>
                      <span class="timed-row__summary">
                        ${n.message} ·
                        ${isKnownTrigger(n.triggerType)
                ? n.triggerType
                : x `<span
                              data-timed-unknown-trigger=${n.id}
                              style="color:var(--warning-color,#ffa726);"
                              >Unrecognised trigger “${n.triggerType.raw}”</span
                            >`}
                        · Day ${n.day}
                      </span>
                      <div class="row-actions">
                        <button
                          class="md3-button text row-action"
                          data-timed-edit=${n.id}
                          aria-label=${`Edit ${n.message}`}
                          title=${`Edit ${n.message}`}
                          @click=${() => this._emit('edit-timed-requested', {
                id: n.id,
                draft: {
                    message: n.message,
                    triggerType: n.triggerType,
                    day: n.day,
                    growspaceIds: n.growspaceIds,
                },
            })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d=${mdiPencil}></path>
                          </svg>
                        </button>
                        <button
                          class="md3-button text row-action row-action--delete"
                          data-timed-delete=${n.id}
                          aria-label=${`Delete ${n.message}`}
                          title=${`Delete ${n.message}`}
                          @click=${() => this._emit('request-delete-timed', { id: n.id })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d=${mdiDelete}></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  `)}
              </div>
            `
            : E}
      </div>
    `;
    }
    _renderForm(sub) {
        const isAdding = sub.kind === 'adding';
        const draft = sub.draft;
        const update = (partial) => this._emit('timed-draft-changed', { partial });
        return x `
      <div class="inline-panel" style="margin-bottom:12px;">
        <h4 style="margin:0 0 12px;font-size:1rem;font-weight:600;">
          ${isAdding ? 'Add Timed Notification' : 'Edit Timed Notification'}
        </h4>

        <div class="md3-input-group">
          <label class="md3-label">Message</label>
          <input
            class="md3-input"
            type="text"
            data-timed-field="message"
            .value=${draft.message}
            @input=${(e) => update({ message: e.target.value })}
          />
        </div>

        <div class="md3-input-group">
          <label class="md3-label">Trigger</label>
          <select
            class="md3-input"
            data-timed-field="triggerType"
            .value=${triggerRawValue(draft.triggerType)}
            @change=${(e) => update({
            triggerType: normalizeTriggerType(e.target.value),
        })}
          >
            ${isKnownTrigger(draft.triggerType)
            ? E
            : x `
                  <option
                    data-timed-unknown-option
                    value="${draft.triggerType.raw}"
                    selected
                    style="color:var(--warning-color,#ffa726);"
                  >
                    Unrecognised: ${draft.triggerType.raw}
                  </option>
                `}
            ${this.vm.triggerOptions.map((o) => x `
                <option value="${o.value}" ?selected=${draft.triggerType === o.value}>
                  ${o.label}
                </option>
              `)}
          </select>
          ${isKnownTrigger(draft.triggerType)
            ? E
            : x `
                <div
                  data-timed-unknown-hint
                  style="font-size:0.857143rem;color:var(--warning-color,#ffa726);margin-top:4px;"
                >
                  This notification's stored trigger is not one this card recognises. It is kept as
                  is unless you pick a stage.
                </div>
              `}
        </div>

        <div class="md3-input-group">
          <label class="md3-label">Day</label>
          <input
            class="md3-input"
            type="number"
            min="1"
            data-timed-field="day"
            .value=${String(draft.day)}
            @change=${(e) => update({ day: Number(e.target.value) })}
          />
        </div>

        <div class="md3-input-group">
          <label class="md3-label">Growspaces</label>
          <div
            style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;padding:4px 0;"
          >
            ${this.vm.growspaceOptions.map(({ id, name }) => x `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input
                    type="checkbox"
                    data-timed-gs=${id}
                    .checked=${draft.growspaceIds.includes(id)}
                    @change=${(e) => {
            const checked = e.target.checked;
            const next = checked
                ? [...draft.growspaceIds, id]
                : draft.growspaceIds.filter((g) => g !== id);
            update({ growspaceIds: next });
        }}
                  />
                  ${name}
                </label>
              `)}
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="md3-button outlined" @click=${() => this._emit('cancel-timed')}>
            Cancel
          </button>
          <button
            class="md3-button primary"
            @click=${() => this._emit(isAdding ? 'commit-add-timed' : 'commit-edit-timed')}
          >
            ${isAdding ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    `;
    }
};
ConfigNotificationsTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .notifications-layout {
        display: grid;
        gap: 16px;
      }
      .settings-groups {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }
      .settings-group {
        min-width: 0;
      }
      .settings-group h4 {
        margin: 0;
        color: var(--primary-text-color, #fff);
        font-size: var(--font-size-md);
        font-weight: 500;
      }
      .settings-group__description {
        min-height: 2.8em;
        margin: 4px 0 12px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: var(--font-size-supporting);
        line-height: 1.4;
        overflow-wrap: anywhere;
      }
      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .settings-group[data-settings-group='stress-detection'] .settings-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .cfg-gs-row {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 1rem;
      }
      .cfg-gs-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .timed-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .timed-row {
        justify-content: space-between;
      }
      .timed-row__summary {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row-actions {
        display: flex;
        flex-shrink: 0;
        gap: 4px;
      }
      .detail-card .row-action {
        flex: 0 0 40px;
        width: 40px;
        min-width: 40px;
        padding: 0;
      }
      .row-action svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .row-action--delete {
        color: var(--error-color, #f44336);
      }
      .detail-card .section-action {
        flex: 0 0 auto;
      }
      .inline-panel {
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
      }
      .empty-state {
        padding: 24px;
        color: var(--secondary-text-color);
        text-align: center;
      }
      @media (max-width: 700px) {
        .settings-groups,
        .settings-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        .settings-group__description {
          min-height: 0;
        }
        .timed-row__summary {
          display: -webkit-box;
          overflow: hidden;
          white-space: normal;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigNotificationsTab.prototype, "vm", void 0);
ConfigNotificationsTab = __decorate([
    t$1('config-notifications-tab')
], ConfigNotificationsTab);

/**
 * Notifications Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Notifications tab — the first
 * Config Dialog tab decomposed, and the analog of the Irrigation Dialog's Tanks
 * tab (an *independent-draft* tab: it owns `NotificationsTabState` on the SM and
 * does not touch the Shared Environment Draft). It projects the tab's entire
 * render input — the cooldown/persistence draft, the timed-notification list,
 * the inline add/edit/confirm-delete sub-state, and the render-ready growspace +
 * trigger option lists — from the SM and the dialog's `growspaceOptions`.
 *
 * Unlike the Irrigation reference factories (which return a `computed`
 * `ReadableAtom` over an SM *atom*), the Config Dialog drives its SM as a Lit
 * `@state()` reactive property transitioned by the pure `transition()` — there
 * is no nanostores atom to wrap. So this is a pure `(sm, deps) → ViewModel`
 * mapping the Config Dialog Shell calls in `render()`. The seam is unchanged: a
 * pure per-tab factory feeding a dumb `<config-notifications-tab>`; only the
 * subscription mechanism differs.
 */
const TRIGGER_LABELS = {
    clone: 'Clone Start',
    veg: 'Veg Start',
    flower: 'Flower Start',
    dry: 'Dry Start',
};
/** The trigger choices, in display order. Static — derived render input. */
const TRIGGER_OPTIONS = TIMED_NOTIFICATION_TRIGGERS.map((value) => ({ value, label: TRIGGER_LABELS[value] }));
/**
 * Pure factory: the Config Dialog SM + the dialog's `growspaceOptions` map →
 * one Notifications tab ViewModel. Testable with no DOM and no host.
 */
function createNotificationsTabViewModel(sm, growspaceOptions) {
    const tab = sm.tabs.notifications;
    return {
        draft: tab.draft,
        timedNotifications: tab.timedNotifications,
        sub: tab.sub,
        growspaceOptions: Object.entries(growspaceOptions).map(([id, name]) => ({ id, name })),
        triggerOptions: [...TRIGGER_OPTIONS],
    };
}

/**
 * Config Sensors Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Sensors tab — the
 * first env-cluster tab. `@property .vm: SensorsTabViewModel` in, a single
 * `env-draft-changed` Tab Intent out, **no `@state()` and no `hass`**: the entity
 * option lists and the live VPD readout are pre-derived into the VM by the shell
 * (see sensors-tab.viewmodel). Markup is transcribed verbatim from the former
 * inline `_renderSensorsSection` / `_renderMultiEntitySelect` / `_renderEntitySelect`
 * / `_renderLstOffsetSection`; the multi-select / chip / entity-select styles moved
 * here with it, `md3-*` / `detail-card` / `row-col-grid` come from `dialogStyles`.
 *
 * Tab Intent (the Config Dialog Shell translates it to `UPDATE_ENV_DRAFT`):
 *   - `env-draft-changed`  detail: { partial: Partial<EnvironmentDraft> }
 */
let ConfigSensorsTab = class ConfigSensorsTab extends i$2 {
    _emit(partial) {
        this.dispatchEvent(new CustomEvent('env-draft-changed', { detail: { partial }, bubbles: true, composed: true }));
    }
    render() {
        const f = this.vm.fields;
        return x `
      <div class="detail-card">
        <config-section-header
          .icon=${mdiThermometer}
          label="Monitoring Sensors"
        ></config-section-header>
        <div class="form-section">
          <div class="row-col-grid">${this._field(f[0])}${this._field(f[1])}</div>
          <div class="row-col-grid">${this._field(f[2])}${this._field(f[3])}</div>
          ${this.vm.moistureBand ? this._renderMoistureBand(this.vm.moistureBand) : E}
          <div class="row-col-grid">${this._field(f[4])}${this._field(f[5])}</div>
          ${this._field(f[6])} ${this.vm.lst ? this._renderLst(this.vm.lst) : E}
        </div>
      </div>
    `;
    }
    _field(field) {
        return field.multi ? this._multiSelect(field) : this._singleSelect(field);
    }
    _multiSelect(field) {
        const values = field.value;
        return x `
      <config-entity-multi-select
        .label=${field.label}
        .values=${values}
        .options=${field.options}
        @entity-values-changed=${(event) => this._emit({ [field.key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
    _singleSelect(field) {
        return x `
      <div class="entity-select-container">
        <gm-entity-picker
          .label=${field.label}
          .value=${field.value}
          .options=${field.options}
          @entity-picked=${(e) => this._emit({ [field.key]: e.detail })}
        ></gm-entity-picker>
      </div>
    `;
    }
    /**
     * Emit one edited bound. `editBound` materialises the *other* bound from the
     * displayed default when the band was inherited — the backend rejects a lone
     * bound, so a half pair must never leave here.
     */
    _emitBound(bound, raw) {
        const value = raw.trim() === '' ? null : Number.parseFloat(raw);
        const next = editBound({ min: this.vm.moistureBand?.rawMin ?? null, max: this.vm.moistureBand?.rawMax ?? null }, bound, value !== null && Number.isNaN(value) ? null : value);
        this._emit({ soilMoistureMin: next.min, soilMoistureMax: next.max });
    }
    _renderMoistureBand(band) {
        if (band.incompatibleUnit) {
            return x `
        <div class="moisture-band moisture-band--incompatible">
          <div class="moisture-band__title">Acceptable Moisture Band</div>
          <div class="moisture-band__note">
            This sensor reports ${band.incompatibleUnit}, not a percentage, so its readings cannot
            be interpreted as soil moisture. Choose a percentage sensor to configure a healthy band.
          </div>
        </div>
      `;
        }
        return x `
      <div class="moisture-band">
        <div class="moisture-band__title">
          Acceptable Moisture Band
          ${band.isCustom
            ? E
            : x `<span class="moisture-band__badge">Using defaults</span>`}
        </div>
        <div class="moisture-band__note">
          Readings outside this range (inclusive) are flagged as warnings.
        </div>
        <div class="row-col-grid">
          <md3-number-input
            label="Healthy minimum"
            .value=${band.min}
            @change=${(e) => this._emitBound('min', String(e.detail))}
            min="0"
            max="100"
            step=${band.step}
            suffix="%"
          ></md3-number-input>
          <md3-number-input
            label="Healthy maximum"
            .value=${band.max}
            @change=${(e) => this._emitBound('max', String(e.detail))}
            min="0"
            max="100"
            step=${band.step}
            suffix="%"
          ></md3-number-input>
        </div>
        ${band.error ? x `<div class="moisture-band__error">${band.error}</div>` : E}
        ${band.preview
            ? x `<div
              class="moisture-band__preview"
              data-classification=${band.preview.classification}
            >
              Current reading ${band.preview.reading}% — ${band.preview.label}
            </div>`
            : E}
        <button
          class="md3-button config-reset-button moisture-band__reset"
          ?disabled=${!band.isCustom}
          title=${band.isCustom
            ? E
            : 'Nothing to reset — this moisture band already uses the defaults.'}
          @click=${() => {
            const cleared = resetBand();
            this._emit({ soilMoistureMin: cleared.min, soilMoistureMax: cleared.max });
        }}
        >
          Reset to defaults
        </button>
      </div>
    `;
    }
    _renderLst(lst) {
        return x `
      <div style="margin-top:12px;">
        <md3-number-input
          label="Leaf Surface Temperature Offset"
          .value=${lst.offset}
          @change=${(e) => this._emit({ lstOffset: parseFloat(e.detail) })}
          min="-10"
          max="10"
          step="0.5"
          suffix="°C"
        ></md3-number-input>
        <div
          style="margin-top:4px;font-size:0.857143rem;color:var(--secondary-text-color,rgba(255,255,255,0.5));"
        >
          Current VPD: ${lst.vpdDisplay}
        </div>
      </div>
    `;
    }
};
ConfigSensorsTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      /* ── Acceptable Moisture Band ── */
      .moisture-band {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border-radius: var(--border-radius-sm, 8px);
        background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.04);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      }
      .moisture-band__title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      .moisture-band__badge {
        font-size: 0.785714rem;
        font-weight: 400;
        padding: 2px 8px;
        border-radius: var(--border-radius-md, 12px);
        background: rgba(var(--rgb-primary-text-color, 255, 255, 255), 0.1);
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }
      .moisture-band__note {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }
      .moisture-band__error {
        font-size: 0.857143rem;
        color: var(--error-color, #f44336);
      }
      .moisture-band__preview {
        font-size: 0.857143rem;
        font-weight: 500;
      }
      .moisture-band__preview[data-classification='in_band'] {
        color: var(--success-color, #4caf50);
      }
      .moisture-band__preview[data-classification='too_dry'] {
        color: var(--warning-color, #ffa726);
      }
      .moisture-band__preview[data-classification='too_wet'] {
        color: var(--info-color, #2196f3);
      }
      .entity-select-container {
        position: relative;
        z-index: 5;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigSensorsTab.prototype, "vm", void 0);
ConfigSensorsTab = __decorate([
    t$1('config-sensors-tab')
], ConfigSensorsTab);

function calculateSvp(temperatureC) {
    return 0.61094 * Math.exp((17.625 * temperatureC) / (243.04 + temperatureC));
}
function calculateVpdWithLstOffset(airTempC, humidityRh, lstOffset) {
    if (!Number.isFinite(airTempC) || !Number.isFinite(humidityRh) || !Number.isFinite(lstOffset)) {
        return null;
    }
    const leafTempC = airTempC + lstOffset;
    const leafSvp = calculateSvp(leafTempC);
    const airSvp = calculateSvp(airTempC);
    const airAvp = airSvp * (humidityRh / 100);
    return Math.round((leafSvp - airAvp) * 100) / 100;
}

/**
 * How a config field narrows the entity list beyond its domains.
 *
 * Most fields want exactly one `device_class` and say so with a bare string.
 * The object form exists for fields whose real hardware does not reliably
 * carry one: ESPHome and template soil probes overwhelmingly ship with no
 * `device_class` at all, and many report `humidity`, so demanding `moisture`
 * hides the very sensor the grower already configured (issue #37).
 *
 * Keeping the rule here rather than inline in the dialog's hass adapter means
 * it is testable against plain attribute bags, with no `hass` and no DOM.
 */
function attribute(attributes, key) {
    const raw = attributes[key];
    return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;
}
/** Whether an entity with these attributes is offerable for a field with this filter. */
function matchesEntityClass(attributes, filter) {
    if (!filter)
        return true;
    const deviceClass = attribute(attributes, 'device_class');
    if (typeof filter === 'string')
        return deviceClass === filter;
    if (deviceClass !== null)
        return filter.anyOf.includes(deviceClass);
    const units = filter.orUnclassedUnits;
    if (!units)
        return false;
    const unit = attribute(attributes, 'unit_of_measurement');
    return unit !== null && units.includes(unit);
}
/**
 * The soil-moisture field's filter. `moisture` is the correct modern class and
 * `humidity` is what a great many probes actually report; a probe with no class
 * is accepted on the same `%` evidence the Acceptable Moisture Band already
 * uses to decide it can interpret a reading at all.
 */
const SOIL_MOISTURE_FILTER = {
    anyOf: ['moisture', 'humidity'],
    orUnclassedUnits: ['%'],
};

/**
 * Sensors Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Sensors tab — the first
 * env-cluster tab. It projects its slice of the [[Shared Environment Draft]]
 * (the air + monitoring sensor selections) and the live "Leaf Surface
 * Temperature" VPD readout into one render input for `<config-sensors-tab>`.
 *
 * The Sensors tab is hass-dependent in two ways the dumb component must not
 * touch: the entity pickers need entity-id option lists, and the LST section
 * shows a live VPD computed from the selected sensors' current values. Both are
 * injected as `SensorsTabDeps` adapters — the shell supplies `entityOptions`
 * (its hass-reading `_getEntities`) and `averageSensorValue` (its
 * `_averageSensorValue`). The factory does the per-field option lookup and the
 * VPD derivation itself, so the derivation stays the test surface (inject fakes,
 * assert the VM) and no `hass` enters the component.
 */
/** Field set + display order, transcribed verbatim from the former inline render. */
const SENSOR_FIELDS = [
    {
        key: 'temperatureSensors',
        label: 'Temperature Sensors',
        multi: true,
        domains: ['sensor', 'input_number'],
        deviceClass: 'temperature',
    },
    {
        key: 'humiditySensors',
        label: 'Humidity Sensors',
        multi: true,
        domains: ['sensor', 'input_number'],
        deviceClass: 'humidity',
    },
    {
        key: 'vpdSensors',
        label: 'VPD Sensors (Optional)',
        multi: true,
        domains: ['sensor', 'input_number'],
        deviceClass: 'pressure',
    },
    {
        key: 'soilMoistureSensor',
        label: 'Soil Moisture Sensor',
        multi: false,
        domains: ['sensor', 'input_number'],
        deviceClass: SOIL_MOISTURE_FILTER,
    },
    {
        key: 'co2Sensor',
        label: 'CO₂ Sensor',
        multi: false,
        domains: ['sensor', 'input_number'],
        deviceClass: 'carbon_dioxide',
    },
    {
        key: 'lightSensors',
        label: 'Light Source / Sensor',
        multi: true,
        domains: ['switch', 'light', 'input_boolean', 'sensor'],
        deviceClass: null,
    },
    {
        key: 'substrateTemperatureSensors',
        label: 'Substrate Temperature Sensors',
        multi: true,
        domains: ['sensor', 'input_number'],
        deviceClass: 'temperature',
    },
];
function deriveLst(draft, deps) {
    const hasTemp = draft.temperatureSensors.length > 0;
    const hasHumidity = draft.humiditySensors.length > 0;
    const hasHardwareVpd = draft.vpdSensors.some((id) => !id.includes('calculated_vpd'));
    if (!hasTemp || !hasHumidity || hasHardwareVpd)
        return null;
    const avgTemp = deps.averageSensorValue(draft.temperatureSensors);
    const avgHumidity = deps.averageSensorValue(draft.humiditySensors);
    const vpd = avgTemp != null && avgHumidity != null
        ? calculateVpdWithLstOffset(avgTemp, avgHumidity, draft.lstOffset)
        : null;
    return { offset: draft.lstOffset, vpdDisplay: vpd != null ? `${vpd} kPa` : '—' };
}
function deriveMoistureBand(draft, deps) {
    // Sensor-only prerequisite: the band is about interpreting that sensor's
    // readings, so pump/tank hardware never gates it.
    if (!draft.soilMoistureSensor)
        return null;
    const pair = { min: draft.soilMoistureMin, max: draft.soilMoistureMax };
    const band = effectiveBand(pair);
    const reading = deps.sensorReading(draft.soilMoistureSensor);
    // A unit that is present and not '%' is an explicit statement that this
    // sensor measures something else. No unit at all is the legacy case.
    const unit = reading?.unit ?? null;
    const incompatibleUnit = unit !== null && unit.trim() !== '%' ? unit : null;
    if (incompatibleUnit) {
        return {
            min: band.min,
            max: band.max,
            rawMin: pair.min,
            rawMax: pair.max,
            isCustom: band.isCustom,
            step: 0.1,
            error: null,
            canSave: true,
            preview: null,
            incompatibleUnit,
        };
    }
    const value = parseReading(reading?.value);
    const classification = value !== null ? classifyReading(value, band) : null;
    return {
        min: band.min,
        max: band.max,
        rawMin: pair.min,
        rawMax: pair.max,
        isCustom: band.isCustom,
        step: 0.1,
        error: bandValidationError(pair),
        canSave: bandValidationError(pair) === null,
        preview: value !== null && classification !== null
            ? { classification, label: CLASSIFICATION_LABELS[classification], reading: value }
            : null,
        incompatibleUnit: null,
    };
}
/**
 * Pure factory: the Config Dialog SM + the injected hass adapters → one Sensors
 * tab ViewModel. Testable with no DOM and no host (inject fake adapters).
 */
function createSensorsTabViewModel(sm, deps) {
    const draft = sm.environmentDraft;
    const fields = SENSOR_FIELDS.map((def) => ({
        key: def.key,
        label: def.label,
        multi: def.multi,
        value: draft[def.key],
        options: deps.entityOptions(def.domains, def.deviceClass),
    }));
    return { fields, lst: deriveLst(draft, deps), moistureBand: deriveMoistureBand(draft, deps) };
}

/**
 * Shared Port Pre-fill picker (ADR-0028), used by both the actuator editor
 * (`renderAcInfinityDevices`) and the grow-light editor
 * (`renderGrowlightAcInfinityDevices`). Renders the device `<md3-select>` that
 * pre-fills a port's bundle plus the inline warning naming any role a pick
 * failed to resolve. Stateless render helper — the host owns the resolve/fill.
 */
/** The inline notice naming the roles a pick failed to resolve. */
function renderPrefillWarning(missing) {
    if (!missing || missing.length === 0)
        return E;
    return x `
    <div
      class="ac-infinity-prefill-warning"
      role="alert"
      style="display:flex;gap:6px;margin-top:6px;padding:8px;font-size:0.857143rem;line-height:1.35;border-radius: var(--border-radius-sm, 8px);color:var(--warning-color,#e6a700);background:rgba(230,167,0,0.10);border:1px solid rgba(230,167,0,0.35);"
    >
      <span aria-hidden="true">⚠</span>
      <span
        >No ${missing.join(' or ')} entity found on this device — cleared it; pick manually
        below.</span
      >
    </div>
  `;
}
/**
 * The passive Duplicate Port Warning (ADR-0028) under a mode picker — same
 * visual conventions as the Automated Mode Conflict. `''`/undefined → nothing.
 */
function renderDuplicateWarning(message) {
    if (!message)
        return E;
    return x `
    <div
      class="ac-infinity-duplicate-warning"
      role="alert"
      style="display:flex;gap:6px;margin-top:6px;padding:8px;font-size:0.857143rem;line-height:1.35;border-radius: var(--border-radius-sm, 8px);color:var(--warning-color,#e6a700);background:rgba(230,167,0,0.10);border:1px solid rgba(230,167,0,0.35);"
    >
      <span aria-hidden="true">⚠</span>
      <span>${message}</span>
    </div>
  `;
}
/** The device picker that pre-fills a port's bundle. Omitted when no port list is supplied. */
function renderPortPicker(p) {
    if (!p.portDevices || p.portDevices.length === 0)
        return E;
    return x `
    <div style="margin-bottom:8px;">
      <md3-select
        label="AC Infinity device"
        .value=${p.selectedDeviceId}
        .options=${p.portDevices.map((d) => ({ label: d.label, value: d.id }))}
        @change=${(e) => p.onPick(e.detail)}
      ></md3-select>
      ${renderPrefillWarning(p.warning)}
    </div>
  `;
}

/**
 * AC Infinity device editor — a shared, stateless render helper for the Config
 * Dialog's Climate and Humidity tabs (ADR-0022 in the integration).
 *
 * An AC Infinity port exposes no `fan`/`switch` entity; it is driven as a bundle
 * of a mode `select` + a speed `number`. This renders one bordered card per
 * configured bundle (mode picker, speed picker, on-speed 1–10) plus an add
 * button, and reports edits through `onChange` with the full new array. It owns
 * no state — the parent component dispatches the array into the Shared
 * Environment Draft, exactly like the plain entity multi-selects.
 */
/** The passive, non-blocking Automated Mode Conflict notice under a mode picker. */
function renderConflict(conflict) {
    if (!conflict)
        return E;
    return x `
    <div
      class="ac-infinity-mode-conflict"
      role="alert"
      style="display:flex;gap:6px;margin-top:6px;padding:8px;font-size:0.857143rem;line-height:1.35;border-radius: var(--border-radius-sm, 8px);color:var(--warning-color,#e6a700);background:rgba(230,167,0,0.10);border:1px solid rgba(230,167,0,0.35);"
    >
      <span aria-hidden="true">⚠</span>
      <span>
        <strong>${conflict.deviceName}</strong> is in <strong>${conflict.mode}</strong> mode. AC
        Infinity's own automation will keep overriding Growspace Manager. Set this port to Off or On
        in the AC Infinity app before GSM can control it.
      </span>
    </div>
  `;
}
function blankDevice() {
    return { mode_entity: '', speed_entity: '', on_speed: 10 };
}
/**
 * The picker's option list: the platform-filtered set, plus the device's own
 * currently-saved value (so an already-configured entity that no longer matches
 * the filter — e.g. the integration is unavailable — still renders selected
 * instead of blanking). Empty selection contributes nothing.
 */
function optionsWithCurrent(options, current) {
    if (!current || options.includes(current))
        return options;
    return [current, ...options];
}
function renderAcInfinityDevices(p) {
    const { devices, onChange } = p;
    const update = (index, patch) => onChange(devices.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    const remove = (index) => onChange(devices.filter((_, i) => i !== index));
    const add = () => onChange([...devices, blankDevice()]);
    return x `
    <div class="ac-infinity-editor" style="position:relative;margin-top:12px;">
      <div
        class="ac-infinity-editor-label"
        style="font-size:0.857143rem;color:var(--secondary-text-color);margin-bottom:8px;"
      >
        ${p.label}
      </div>
      ${devices.map((device, index) => {
        return x `
          <div
            class="ac-infinity-device detail-card"
            style="padding:12px;margin-bottom:8px;border:1px solid var(--divider-color,rgba(255,255,255,0.12));border-radius: var(--border-radius-sm, 8px);"
          >
            <div
              style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
            >
              <span style="font-weight:500;">Port ${index + 1}</span>
              <button
                type="button"
                class="chip-remove"
                aria-label="Remove AC Infinity device"
                title="Remove AC Infinity device"
                style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;"
                @click=${() => remove(index)}
              >
                ×
              </button>
            </div>
            ${renderPortPicker({
            portDevices: p.portDevices,
            selectedDeviceId: p.portDeviceIds?.[index] ?? '',
            warning: p.prefillWarnings?.[index],
            onPick: (deviceId) => p.onPickDevice?.(index, deviceId),
        })}
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Mode (select)"
                .value=${device.mode_entity}
                .options=${optionsWithCurrent(p.modeOptions, device.mode_entity)}
                @entity-picked=${(e) => update(index, { mode_entity: e.detail })}
              ></gm-entity-picker>
              ${renderConflict(p.conflicts?.[device.mode_entity])}
              ${renderDuplicateWarning(p.duplicateWarnings?.[index])}
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Speed (number)"
                .value=${device.speed_entity}
                .options=${optionsWithCurrent(p.speedOptions, device.speed_entity)}
                @entity-picked=${(e) => update(index, { speed_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <md3-number-input
              label="On-speed (1–10)"
              .value=${device.on_speed}
              step="1"
              min="1"
              max="10"
              @change=${(e) => update(index, {
            on_speed: Math.min(10, Math.max(1, Math.round(parseFloat(e.detail) || 1))),
        })}
            ></md3-number-input>
          </div>
        `;
    })}
      <button class="md3-button tonal" style="margin-top:4px;" @click=${add}>
        + Add AC Infinity device
      </button>
    </div>
  `;
}

/**
 * Shared controlled disclosure list for stage-based configuration editors.
 *
 * Consumers provide the stage rows and project their stage-specific summary and
 * editor into the named slots returned by the helpers below. Toggling a header
 * emits `stage-accordion-toggle`; the consumer remains responsible for updating
 * the controlled `open` value.
 */
function stageAccordionSummarySlot(stageId) {
    return `summary-${stageId}`;
}
function stageAccordionInteriorSlot(stageId) {
    return `interior-${stageId}`;
}
let ConfigStageAccordion = class ConfigStageAccordion extends i$2 {
    constructor() {
        super(...arguments);
        this.stages = [];
        this.compact = false;
    }
    updated(changedProperties) {
        if (!changedProperties.has('stages'))
            return;
        const previousStages = changedProperties.get('stages');
        if (!previousStages)
            return;
        const previouslyOpen = new Map(previousStages.map((stage) => [stage.id, stage.open]));
        const openedIndex = this.stages.findIndex((stage) => stage.open && previouslyOpen.get(stage.id) === false);
        if (openedIndex === -1)
            return;
        this.renderRoot
            .querySelectorAll('.acc-card')[openedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    _toggle(stage) {
        this.dispatchEvent(new CustomEvent('stage-accordion-toggle', {
            detail: { stage },
            bubbles: true,
            composed: true,
        }));
    }
    _handleKeydown(event, stage) {
        if (event.key !== 'Enter' && event.key !== ' ')
            return;
        event.preventDefault();
        this._toggle(stage);
    }
    render() {
        return x `${this.stages.map((stage, index) => this._renderStage(stage, index))}`;
    }
    _renderStage(stage, index) {
        const headerId = `stage-header-${index}`;
        const panelId = `stage-panel-${index}`;
        return x `
      <div class="acc-card ${stage.current ? 'current-stage' : ''}">
        <div
          id=${headerId}
          class="acc-head"
          role="button"
          tabindex="0"
          aria-expanded=${stage.open ? 'true' : 'false'}
          aria-controls=${panelId}
          aria-current=${stage.current ? 'step' : E}
          @click=${() => this._toggle(stage)}
          @keydown=${(event) => this._handleKeydown(event, stage)}
        >
          <div class="acc-stage-dot" style="background:${stage.color};"></div>
          <div class="acc-head-title">${stage.label}</div>
          ${stage.current ? x `<span class="current-label">Current</span>` : E}
          ${stage.open ? E : x `<slot name=${stageAccordionSummarySlot(stage.id)}></slot>`}
          <svg class="acc-chev ${stage.open ? 'open' : ''}" viewBox="0 0 24 24">
            <path d=${mdiChevronDown}></path>
          </svg>
        </div>
        ${stage.open
            ? x `
              <div id=${panelId} class="acc-body" role="region" aria-labelledby=${headerId}>
                <slot name=${stageAccordionInteriorSlot(stage.id)}></slot>
              </div>
            `
            : E}
      </div>
    `;
    }
};
ConfigStageAccordion.styles = i$1 `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .acc-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      /* Preserve the reference VPD row geometry during this enabling extraction. */
      border-radius: var(--border-radius-md, 12px);
      overflow: hidden;
    }
    .acc-head {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      box-sizing: border-box;
      padding: 13px 16px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }
    .acc-head:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .acc-head:focus-visible {
      outline: 2px solid var(--primary-color, #4caf50);
      outline-offset: -2px;
    }
    .acc-stage-dot {
      width: 10px;
      height: 10px;
      border: 1px solid var(--primary-text-color, #fff);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .acc-head-title {
      flex: 1;
      font-size: 1rem;
      font-weight: 500;
    }
    .current-stage {
      border-color: color-mix(in srgb, var(--primary-color, #4caf50) 60%, transparent);
      background: color-mix(in srgb, var(--primary-color, #4caf50) 8%, transparent);
    }
    .current-label {
      color: var(--primary-text-color, #fff);
      font-size: 0.785714rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .acc-chev {
      width: 20px;
      height: 20px;
      fill: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .acc-chev.open {
      transform: rotate(180deg);
    }
    .acc-body {
      padding: 16px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    :host([compact]) {
      gap: 4px;
    }
    :host([compact]) .acc-head {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      gap: 2px 8px;
      padding: 8px 10px;
    }
    :host([compact]) .acc-stage-dot {
      width: 8px;
      height: 8px;
    }
    :host([compact]) .acc-head-title {
      font-size: 0.857143rem;
    }
    :host([compact]) .current-label {
      grid-column: 3;
    }
    :host([compact]) .acc-head slot {
      grid-column: 2 / -1;
      grid-row: 2;
      min-width: 0;
    }
    :host([compact]) .acc-chev {
      grid-column: 4;
      grid-row: 1;
      width: 18px;
      height: 18px;
    }
    :host([compact]) .acc-body {
      gap: 12px;
      padding: 12px;
    }
    @media (prefers-reduced-motion: reduce) {
      .acc-head,
      .acc-chev {
        transition-duration: 0.01ms;
      }
    }
  `;
__decorate([
    n({ attribute: false })
], ConfigStageAccordion.prototype, "stages", void 0);
__decorate([
    n({ type: Boolean, reflect: true })
], ConfigStageAccordion.prototype, "compact", void 0);
ConfigStageAccordion = __decorate([
    t$1('config-stage-accordion')
], ConfigStageAccordion);

const DEFAULT_CRITICAL_TEMP_LOW_C = 18;
const DEFAULT_CRITICAL_TEMP_HIGH_C = 32;
const PRESSURE_PER_KPA = {
    Pa: 1000,
    hPa: 10,
    kPa: 1,
    bar: 0.01,
    cbar: 0.1,
    mbar: 10,
    inHg: 0.2952998307,
    psi: 0.1450377377,
    mmHg: 7.500616827,
};
function rounded(value, digits = 6) {
    return Number(value.toFixed(digits));
}
function normalizedTemperatureUnit(unit) {
    return unit === '°F' ? '°F' : '°C';
}
function normalizedPressureUnit(unit) {
    return unit && PRESSURE_PER_KPA[unit] ? unit : 'kPa';
}
function temperatureFromCelsius(value, unit, difference = false) {
    if (normalizedTemperatureUnit(unit) === '°C')
        return rounded(value);
    return rounded(value * (9 / 5) + (difference ? 0 : 32));
}
function temperatureToCelsius(value, unit, difference = false) {
    if (normalizedTemperatureUnit(unit) === '°C')
        return rounded(value);
    return rounded((value - (difference ? 0 : 32)) * (5 / 9));
}
function pressureFromKpa(value, unit) {
    return rounded(value * PRESSURE_PER_KPA[normalizedPressureUnit(unit)]);
}
function pressureToKpa(value, unit) {
    return rounded(value / PRESSURE_PER_KPA[normalizedPressureUnit(unit)], 3);
}
function pressureStep(unit) {
    return String(rounded(0.01 * PRESSURE_PER_KPA[normalizedPressureUnit(unit)], 4));
}
function temperatureStep(unit) {
    return String(temperatureFromCelsius(0.1, unit, true));
}
function displayTemperature(value, unit, difference = false) {
    return value == null ? '' : temperatureFromCelsius(value, unit, difference);
}
function editCriticalTemperatureBound(config, bound, raw, unit) {
    if (raw.trim() === '') {
        return {
            patch: { critical_temp_low: null, critical_temp_high: null },
            error: null,
        };
    }
    const displayed = Number.parseFloat(raw);
    if (!Number.isFinite(displayed)) {
        return { patch: null, error: 'Enter a temperature or clear the field to disable the cutoff.' };
    }
    const value = temperatureToCelsius(displayed, unit);
    const low = bound === 'low' ? value : (config.critical_temp_low ?? DEFAULT_CRITICAL_TEMP_LOW_C);
    const high = bound === 'high' ? value : (config.critical_temp_high ?? DEFAULT_CRITICAL_TEMP_HIGH_C);
    if (bound === 'low' && (value < 10 || value > 40)) {
        return {
            patch: null,
            error: `Low cutoff must be between ${temperatureFromCelsius(10, unit)}${normalizedTemperatureUnit(unit)} and ${temperatureFromCelsius(40, unit)}${normalizedTemperatureUnit(unit)}.`,
        };
    }
    if (bound === 'high' && (value < 10 || value > 50)) {
        return {
            patch: null,
            error: `High cutoff must be between ${temperatureFromCelsius(10, unit)}${normalizedTemperatureUnit(unit)} and ${temperatureFromCelsius(50, unit)}${normalizedTemperatureUnit(unit)}.`,
        };
    }
    if (low >= high) {
        return {
            patch: null,
            error: bound === 'low'
                ? 'Low cutoff must be lower than the high cutoff.'
                : 'High cutoff must be higher than the low cutoff.',
        };
    }
    return {
        patch: { critical_temp_low: low, critical_temp_high: high },
        error: null,
    };
}

/**
 * Config Climate Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Climate tab — Climate
 * Control + the circulation Fan Controller panel + the Exhaust Fan Controller
 * panel. `@property .vm: ClimateTabViewModel` in, semantic Tab Intents out,
 * **no `@state()` and no `hass`**: the fan-entity option lists and the two
 * collapsible-section toggles are projected into the VM by the shell. Markup is
 * transcribed from the former inline `_renderClimateSection` /
 * `_renderFanControllerPanel` / `_renderExhaustFanControllerPanel`; the panels
 * are private render methods here (one consumer each → no new custom element).
 * Both controllers' stage VPD values share one stage-accordion editor.
 *
 * Fan-config edits merge against the VM's config (never the SM) and emit the
 * whole merged config, so the shell's `UPDATE_ENV_DRAFT` replaces it wholesale.
 *
 * Tab Intents (the Shell translates them):
 *   - `env-draft-changed`            detail: { partial: Partial<EnvironmentDraft> }   (top-level fields)
 *   - `fan-config-changed`           detail: { partial: Partial<CirculationFanConfig> }
 *   - `exhaust-config-changed`       detail: { partial: Partial<ExhaustFanConfig> }
 *
 * Fan/exhaust edits forward only the changed field; the Shell merges it against
 * the live draft (so synchronous multi-field edits accumulate). The component
 * never reads the SM.
 */
let ConfigClimateTab = class ConfigClimateTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _update(partial) {
        this._emit('env-draft-changed', { partial });
    }
    _updateFan(partial) {
        this._emit('fan-config-changed', { partial });
    }
    _pickPort(field, index, deviceId) {
        this._emit('pick-ac-infinity-device', { field, index, deviceId });
    }
    _updateExhaust(partial) {
        this._emit('exhaust-config-changed', { partial });
    }
    _copy(key, params = {}) {
        return localizeWithParams(`config.${key}`, params, this.vm.language);
    }
    _pressure(value) {
        return pressureFromKpa(value, this.vm.units.pressure);
    }
    _formatPressure(value) {
        const unit = this.vm.units.pressure;
        const digits = unit === 'Pa' ? 0 : unit === 'hPa' || unit === 'mbar' ? 1 : unit === 'kPa' ? 2 : 3;
        return this._pressure(value).toFixed(digits);
    }
    render() {
        return x `
      <div class="climate-layout">
        ${this._renderControl(this.vm.control)}${this._renderFanPanel(this.vm.fan)}${this.vm
            .stageVpd.visible
            ? this._renderStageVpd(this.vm.stageVpd)
            : E}${this._renderExhaustPanel(this.vm.exhaust)}
      </div>
    `;
    }
    _sectionHeader(title) {
        return x ` <config-section-header .icon=${mdiFan} .label=${title}></config-section-header> `;
    }
    // ── Climate Control ─────────────────────────────────────────────────────────
    _renderControl(c) {
        return x `
      <div class="detail-card">
        ${this._sectionHeader('Climate Control')}
        <div class="form-section">
          <div class="row-col-grid">
            ${this._multiSelect('Exhaust Fan / Switch', 'exhaustFanEntities', c.exhaustFanEntities, c.exhaustFanOptions)}
            ${this._multiSelect('Circulation Fan / Switch', 'circulationFanEntities', c.circulationFanEntities, c.circulationFanOptions)}
          </div>
          ${renderAcInfinityDevices({
            label: 'Exhaust Fan AC Infinity Devices',
            devices: c.exhaustFanAcInfinityDevices,
            modeOptions: c.acInfinityModeOptions,
            speedOptions: c.acInfinitySpeedOptions,
            conflicts: c.acInfinityConflicts,
            portDevices: c.acInfinityPortDevices,
            portDeviceIds: c.exhaustFanPortDeviceIds,
            prefillWarnings: c.exhaustFanPrefillWarnings,
            duplicateWarnings: c.exhaustFanDuplicateWarnings,
            idPrefix: 'exhaust',
            onChange: (devices) => this._update({ exhaustFanAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) => this._pickPort('exhaustFanAcInfinityDevices', index, deviceId),
        })}
          ${renderAcInfinityDevices({
            label: 'Circulation Fan AC Infinity Devices',
            devices: c.circulationFanAcInfinityDevices,
            modeOptions: c.acInfinityModeOptions,
            speedOptions: c.acInfinitySpeedOptions,
            conflicts: c.acInfinityConflicts,
            portDevices: c.acInfinityPortDevices,
            portDeviceIds: c.circulationFanPortDeviceIds,
            prefillWarnings: c.circulationFanPrefillWarnings,
            duplicateWarnings: c.circulationFanDuplicateWarnings,
            idPrefix: 'circulation',
            onChange: (devices) => this._update({ circulationFanAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) => this._pickPort('circulationFanAcInfinityDevices', index, deviceId),
        })}
          <div class="row-col-grid">
            <md3-number-input
              label="Stress Threshold %"
              .value=${c.stressThreshold}
              @change=${(e) => this._update({ stressThreshold: e.detail !== '' ? parseFloat(e.detail) : null })}
              step="0.01"
            ></md3-number-input>
            <md3-number-input
              label="Mold Threshold %"
              .value=${c.moldThreshold}
              @change=${(e) => this._update({ moldThreshold: e.detail !== '' ? parseFloat(e.detail) : null })}
              step="0.01"
            ></md3-number-input>
          </div>
        </div>
      </div>
    `;
    }
    _multiSelect(label, key, values, options) {
        return x `
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${options}
        @entity-values-changed=${(event) => this._update({ [key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
    // ── Circulation Fan Controller ──────────────────────────────────────────────
    _renderFanPanel(vm) {
        const fan = vm.config;
        return x `
      <div class="detail-card">
        ${this._sectionHeader('Fan Controller')}
        <div class="form-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked=${fan.enabled}
              @change=${(e) => this._updateFan({ enabled: e.target.checked })}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div class="form-section" style="${vm.disabled ? 'opacity:0.5;pointer-events:none;' : ''}">
          <md3-select
            label="Regulation Mode"
            .value=${vm.mode}
            .options=${[
            { value: 'vpd', label: 'VPD' },
            { value: 'humidity', label: 'Humidity' },
            { value: 'temperature', label: 'Temperature' },
        ]}
            @change=${(e) => this._updateFan({ regulation_mode: e.detail })}
          ></md3-select>

          ${vm.showStageVpd
            ? x `
                <div style="margin-top:8px;">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      .checked=${fan.stage_vpd_enabled}
                      @change=${(e) => this._updateFan({
                stage_vpd_enabled: e.target.checked,
            })}
                    />
                    <span>Stage-Aware VPD</span>
                  </label>
                </div>
              `
            : E}

          <div class="row-col-grid">
            ${vm.mode === 'vpd'
            ? x `
                  <md3-number-input
                    label="${vm.vpdTargetLabel}"
                    style="${vm.vpdTargetDimmed ? 'opacity:0.5;' : ''}"
                    .value=${this._pressure(fan.vpd_target)}
                    @change=${(e) => this._updateFan({
                vpd_target: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
            })}
                    step=${pressureStep(this.vm.units.pressure)}
                  ></md3-number-input>
                  <md3-number-input
                    label=${`VPD Tolerance (${this.vm.units.pressure})`}
                    .value=${this._pressure(fan.vpd_tolerance)}
                    @change=${(e) => this._updateFan({
                vpd_tolerance: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
            })}
                    step=${pressureStep(this.vm.units.pressure)}
                  ></md3-number-input>
                `
            : E}
            ${vm.mode === 'humidity'
            ? x `
                  <md3-number-input
                    label="Humidity Target (%)"
                    .value=${fan.humidity_target}
                    @change=${(e) => this._updateFan({ humidity_target: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                  <md3-number-input
                    label="Humidity Tolerance (%)"
                    .value=${fan.humidity_tolerance}
                    @change=${(e) => this._updateFan({ humidity_tolerance: parseFloat(e.detail) })}
                    step="0.1"
                  ></md3-number-input>
                `
            : E}
            ${vm.mode === 'temperature'
            ? x `
                  <md3-number-input
                    label=${`Temperature Target (${this.vm.units.temperature})`}
                    .value=${displayTemperature(fan.temperature_target, this.vm.units.temperature)}
                    @change=${(e) => this._updateFan({
                temperature_target: temperatureToCelsius(parseFloat(e.detail), this.vm.units.temperature),
            })}
                    step=${temperatureStep(this.vm.units.temperature)}
                  ></md3-number-input>
                  <md3-number-input
                    label=${`Temperature Tolerance (${this.vm.units.temperature})`}
                    .value=${displayTemperature(fan.temperature_tolerance, this.vm.units.temperature, true)}
                    @change=${(e) => this._updateFan({
                temperature_tolerance: temperatureToCelsius(parseFloat(e.detail), this.vm.units.temperature, true),
            })}
                    step=${temperatureStep(this.vm.units.temperature)}
                  ></md3-number-input>
                `
            : E}
          </div>

          ${vm.showTempOverride
            ? this._criticalTempInputs('fan', fan, this._updateFan.bind(this))
            : E}

          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label="Min Speed (%)"
              .value=${fan.min_speed}
              @change=${(e) => this._updateFan({ min_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
            <md3-number-input
              label="Max Speed (%)"
              .value=${fan.max_speed}
              @change=${(e) => this._updateFan({ max_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
          </div>

          <div style="margin-top:8px;">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${fan.wind_enabled}
                @change=${(e) => this._updateFan({ wind_enabled: e.target.checked })}
              />
              <span>Dynamic Wind</span>
            </label>
            ${vm.showWind
            ? x `
                  <div class="row-col-grid" style="margin-top:8px;">
                    <md3-number-input
                      label="Wind Period (s)"
                      .value=${fan.wind_period_seconds}
                      @change=${(e) => this._updateFan({ wind_period_seconds: parseFloat(e.detail) })}
                      step="1"
                    ></md3-number-input>
                    <md3-number-input
                      label="Wind Amplitude (%)"
                      .value=${fan.wind_amplitude_pct}
                      @change=${(e) => this._updateFan({ wind_amplitude_pct: parseFloat(e.detail) })}
                      step="1"
                    ></md3-number-input>
                  </div>
                `
            : E}
          </div>
        </div>
      </div>
    `;
    }
    _renderStageVpd(vm) {
        const stages = vm.stages;
        return x `
      <div class="detail-card">
        <config-section-header .icon=${mdiTune} label="Stage VPD Overrides"></config-section-header>
        <config-stage-accordion
          compact
          .stages=${stages}
          @stage-accordion-toggle=${(event) => this._emit('toggle-stage-vpd', { stageId: event.detail.stage.id })}
        >
          ${stages.map((stage) => stage.open
            ? x `
                  <div slot=${stageAccordionInteriorSlot(stage.id)} class="stage-vpd-grid">
                    ${this._stageVpdController(stage, 'fan', 'Fan')}
                    ${this._stageVpdController(stage, 'exhaust', 'Exhaust')}
                  </div>
                `
            : x `
                  <div slot=${stageAccordionSummarySlot(stage.id)} class="stage-vpd-summary">
                    Fan ${this._formatPressure(stage.fan.day)} /
                    ${this._formatPressure(stage.fan.night)} · Exhaust
                    ${this._formatPressure(stage.exhaust.day)} /
                    ${this._formatPressure(stage.exhaust.night)} ${this.vm.units.pressure}
                  </div>
                `)}
        </config-stage-accordion>
        <div class="stage-vpd-actions">
          <button
            class="md3-button config-reset-button"
            @click=${() => this._updateFan({ stage_vpd_overrides: {} })}
          >
            Reset Fan to defaults
          </button>
          <button
            class="md3-button config-reset-button"
            @click=${() => this._updateExhaust({ stage_vpd_overrides: {} })}
          >
            Reset Exhaust to defaults
          </button>
        </div>
      </div>
    `;
    }
    _stageVpdController(stage, controller, label) {
        const values = stage[controller];
        return x `
      <div class="stage-vpd-controller">
        <h4>${label} Controller</h4>
        ${['day', 'night'].map((period) => x `
            <md3-number-input
              label=${period === 'day' ? 'Day' : 'Night'}
              input-aria-label=${`${stage.label} ${label} ${period} VPD in ${this.vm.units.pressure}`}
              .value=${this._pressure(values[period])}
              .min=${this._pressure(0.1)}
              .max=${this._pressure(3)}
              step=${pressureStep(this.vm.units.pressure)}
              unit=${this.vm.units.pressure}
              @change=${(event) => this._updateStageVpd(controller, stage.id, period, event.detail)}
            ></md3-number-input>
          `)}
      </div>
    `;
    }
    _updateStageVpd(controller, key, period, raw) {
        const config = controller === 'fan' ? this.vm.fan.config : this.vm.exhaust.config;
        const overrides = (config.stage_vpd_overrides ?? {});
        const value = Number.isNaN(parseFloat(raw))
            ? FAN_VPD_STAGE_DEFAULTS[key][period]
            : pressureToKpa(parseFloat(raw), this.vm.units.pressure);
        const existing = overrides[key] ?? FAN_VPD_STAGE_DEFAULTS[key];
        const updated = { ...overrides, [key]: { ...existing, [period]: value } };
        if (controller === 'fan') {
            this._updateFan({ stage_vpd_overrides: updated });
        }
        else {
            this._updateExhaust({ stage_vpd_overrides: updated });
        }
    }
    // ── Exhaust Fan Controller ──────────────────────────────────────────────────
    _renderExhaustPanel(vm) {
        const fan = vm.config;
        return x `
      <div class="detail-card">
        ${this._sectionHeader('Exhaust Fan Controller')}
        <div class="form-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked=${fan.enabled}
              @change=${(e) => this._updateExhaust({ enabled: e.target.checked })}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div class="form-section" style="${vm.disabled ? 'opacity:0.5;pointer-events:none;' : ''}">
          <div>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${fan.stage_vpd_enabled}
                @change=${(e) => this._updateExhaust({
            stage_vpd_enabled: e.target.checked,
        })}
              />
              <span>Stage-Aware VPD</span>
            </label>
          </div>
          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label=${`Temperature Target (${this.vm.units.temperature})`}
              .value=${displayTemperature(fan.temperature_target, this.vm.units.temperature)}
              @change=${(e) => this._updateExhaust({
            temperature_target: temperatureToCelsius(parseFloat(e.detail), this.vm.units.temperature),
        })}
              step=${temperatureStep(this.vm.units.temperature)}
            ></md3-number-input>
            <md3-number-input
              label=${`Temperature Tolerance (${this.vm.units.temperature})`}
              .value=${displayTemperature(fan.temperature_tolerance, this.vm.units.temperature, true)}
              @change=${(e) => this._updateExhaust({
            temperature_tolerance: temperatureToCelsius(parseFloat(e.detail), this.vm.units.temperature, true),
        })}
              step=${temperatureStep(this.vm.units.temperature)}
            ></md3-number-input>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="Humidity Target (%)"
              .value=${fan.humidity_target}
              @change=${(e) => this._updateExhaust({ humidity_target: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
            <md3-number-input
              label="Humidity Tolerance (%)"
              .value=${fan.humidity_tolerance}
              @change=${(e) => this._updateExhaust({ humidity_tolerance: parseFloat(e.detail) })}
              step="0.1"
            ></md3-number-input>
          </div>

          <div class="row-col-grid">
            <md3-number-input
              label="${vm.vpdTargetLabel}"
              style="${vm.vpdTargetDimmed ? 'opacity:0.5;' : ''}"
              .value=${this._pressure(fan.vpd_target)}
              @change=${(e) => this._updateExhaust({
            vpd_target: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
        })}
              step=${pressureStep(this.vm.units.pressure)}
            ></md3-number-input>
            <md3-number-input
              label=${`VPD Tolerance (${this.vm.units.pressure})`}
              .value=${this._pressure(fan.vpd_tolerance)}
              @change=${(e) => this._updateExhaust({
            vpd_tolerance: pressureToKpa(parseFloat(e.detail), this.vm.units.pressure),
        })}
              step=${pressureStep(this.vm.units.pressure)}
            ></md3-number-input>
          </div>

          <div class="row-col-grid" style="margin-top:8px;">
            <md3-number-input
              label="Min Speed (%)"
              .value=${fan.min_speed}
              @change=${(e) => this._updateExhaust({ min_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
            <md3-number-input
              label="Max Speed (%)"
              .value=${fan.max_speed}
              @change=${(e) => this._updateExhaust({ max_speed: parseFloat(e.detail) })}
              step="1"
            ></md3-number-input>
          </div>

          ${this._criticalTempInputs('exhaust', fan, this._updateExhaust.bind(this))}
        </div>
      </div>
    `;
    }
    /** Shared paired safety-cutoff editor — `update` targets fan or exhaust. */
    _criticalTempInputs(controller, fan, update) {
        const unit = this.vm.units.temperature;
        const enabled = fan.critical_temp_low != null || fan.critical_temp_high != null;
        const lowPlaceholder = temperatureFromCelsius(DEFAULT_CRITICAL_TEMP_LOW_C, unit).toFixed(1);
        const highPlaceholder = temperatureFromCelsius(DEFAULT_CRITICAL_TEMP_HIGH_C, unit).toFixed(1);
        return x `
      <section class="critical-temperature" data-controller=${controller}>
        <div class="critical-temperature__heading">
          <h4 class="critical-temperature__title">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiThermometerAlert}></path></svg>
            Critical Temperature
          </h4>
          <span class="critical-temperature__reading">
            ${this._copy('current_temperature', {
            value: this.vm.units.currentTemperature,
        })}
          </span>
        </div>
        <p class="critical-temperature__note">${this._copy('critical_temperature_description')}</p>
        <div class="critical-temperature__bounds">
          <md3-number-input
            label="Low cutoff"
            input-aria-label=${`Low critical temperature in ${unit}`}
            .value=${displayTemperature(fan.critical_temp_low, unit)}
            .placeholder=${lowPlaceholder}
            .min=${temperatureFromCelsius(10, unit)}
            .max=${temperatureFromCelsius(40, unit)}
            step=${temperatureStep(unit)}
            unit=${unit}
            @change=${(event) => this._editCriticalTemp(controller, fan, 'low', event, update)}
          ></md3-number-input>
          <md3-number-input
            label="High cutoff"
            input-aria-label=${`High critical temperature in ${unit}`}
            .value=${displayTemperature(fan.critical_temp_high, unit)}
            .placeholder=${highPlaceholder}
            .min=${temperatureFromCelsius(10, unit)}
            .max=${temperatureFromCelsius(50, unit)}
            step=${temperatureStep(unit)}
            unit=${unit}
            @change=${(event) => this._editCriticalTemp(controller, fan, 'high', event, update)}
          ></md3-number-input>
        </div>
        <div class="critical-temperature__footer">
          <md3-number-input
            label="Recovery hysteresis"
            input-aria-label=${`Critical temperature recovery hysteresis in ${unit}`}
            .value=${displayTemperature(fan.critical_temp_hysteresis, unit, true)}
            .min=${temperatureFromCelsius(0.1, unit, true)}
            .max=${temperatureFromCelsius(5, unit, true)}
            step=${temperatureStep(unit)}
            unit=${unit}
            @change=${(event) => update({
            critical_temp_hysteresis: temperatureToCelsius(parseFloat(event.detail), unit, true),
        })}
          ></md3-number-input>
          <button
            class="md3-button tonal critical-temperature__disable"
            ?disabled=${!enabled}
            title=${enabled ? E : this._copy('critical_temperature_already_disabled')}
            @click=${() => update({ critical_temp_low: null, critical_temp_high: null })}
          >
            Disable cutoff
          </button>
        </div>
      </section>
    `;
    }
    _editCriticalTemp(controller, fan, bound, event, update) {
        const input = event.currentTarget;
        const result = editCriticalTemperatureBound(fan, bound, String(event.detail), this.vm.units.temperature);
        input.error = result.error ?? '';
        if (!result.patch)
            return;
        this.shadowRoot
            ?.querySelectorAll(`.critical-temperature[data-controller="${controller}"] md3-number-input`)
            .forEach((field) => {
            field.error = '';
        });
        update(result.patch);
    }
};
ConfigClimateTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .climate-layout {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .climate-layout > .detail-card {
        margin: 0;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .stage-vpd-summary {
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.785714rem;
        font-variant-numeric: tabular-nums;
        text-align: right;
        white-space: nowrap;
      }
      .stage-vpd-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .stage-vpd-controller {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .stage-vpd-controller h4 {
        margin: 0;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.857143rem;
        font-weight: 500;
      }
      .stage-vpd-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .critical-temperature {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
      }
      .critical-temperature__heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .critical-temperature__title {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin: 0;
        color: var(--primary-text-color, #fff);
        font-size: 1rem;
        font-weight: 500;
      }
      .critical-temperature__title svg {
        width: 20px;
        height: 20px;
        flex: none;
        fill: var(--error-color, #f44336);
      }
      .critical-temperature__reading {
        flex: none;
        color: var(--primary-text-color, #fff);
        font-size: 0.857143rem;
        font-variant-numeric: tabular-nums;
      }
      .critical-temperature__note {
        margin: 0;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 0.857143rem;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      .critical-temperature__bounds {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .critical-temperature__footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 12px;
      }
      .critical-temperature__disable {
        min-height: 40px;
        white-space: nowrap;
      }
      @media (max-width: 600px) {
        .climate-layout {
          grid-template-columns: 1fr;
        }
        .stage-vpd-summary {
          max-width: 48%;
          text-align: left;
        }
        .stage-vpd-grid {
          grid-template-columns: 1fr;
        }
        .critical-temperature__heading {
          align-items: flex-start;
          flex-direction: column;
          gap: 4px;
        }
        .critical-temperature__bounds,
        .critical-temperature__footer {
          grid-template-columns: 1fr;
        }
        .critical-temperature__disable {
          width: 100%;
        }
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigClimateTab.prototype, "vm", void 0);
ConfigClimateTab = __decorate([
    t$1('config-climate-tab')
], ConfigClimateTab);

/**
 * AC Infinity Grow Light editor (ADR-0024).
 *
 * The grow light is a *configurator*, not the On/Off actuator the fan editor
 * drives — so this is a distinct editor over a different entity set: the Active
 * Mode select, the on/off schedule `time` entities, the `on_power` number, and
 * the native sunrise switch + duration number. Pure render function (no state),
 * mirroring `renderAcInfinityDevices`.
 */
function blankGrowlight() {
    return {
        mode_entity: '',
        on_time_entity: '',
        off_time_entity: '',
        power_entity: '',
        sunrise_switch_entity: '',
        sunrise_duration_entity: '',
    };
}
function renderGrowlightAcInfinityDevices(p) {
    const { devices, onChange } = p;
    const update = (index, patch) => onChange(devices.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    const remove = (index) => onChange(devices.filter((_, i) => i !== index));
    const add = () => onChange([...devices, blankGrowlight()]);
    return x `
    <div class="ac-infinity-editor" style="position:relative;margin-top:12px;">
      <div
        class="ac-infinity-editor-label"
        style="font-size:0.857143rem;color:var(--secondary-text-color);margin-bottom:8px;"
      >
        AC Infinity Grow Lights
      </div>
      ${devices.map((device, index) => {
        return x `
          <div
            class="ac-infinity-device detail-card"
            style="padding:12px;margin-bottom:8px;border:1px solid var(--divider-color,rgba(255,255,255,0.12));border-radius:8px;"
          >
            <div
              style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
            >
              <span style="font-weight:500;">Grow light port ${index + 1}</span>
              <button
                type="button"
                class="chip-remove"
                aria-label="Remove AC Infinity grow light"
                title="Remove AC Infinity grow light"
                style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;"
                @click=${() => remove(index)}
              >
                ×
              </button>
            </div>
            ${renderPortPicker({
            portDevices: p.portDevices,
            selectedDeviceId: p.portDeviceIds?.[index] ?? '',
            warning: p.prefillWarnings?.[index],
            onPick: (deviceId) => p.onPickDevice?.(index, deviceId),
        })}
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Active Mode (select)"
                .value=${device.mode_entity}
                .options=${optionsWithCurrent(p.modeOptions, device.mode_entity)}
                @entity-picked=${(e) => update(index, { mode_entity: e.detail })}
              ></gm-entity-picker>
              ${renderDuplicateWarning(p.duplicateWarnings?.[index])}
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Lights-on time (time)"
                .value=${device.on_time_entity}
                .options=${optionsWithCurrent(p.timeOptions, device.on_time_entity)}
                @entity-picked=${(e) => update(index, { on_time_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Lights-off time (time)"
                .value=${device.off_time_entity}
                .options=${optionsWithCurrent(p.timeOptions, device.off_time_entity)}
                @entity-picked=${(e) => update(index, { off_time_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Power (number)"
                .value=${device.power_entity}
                .options=${optionsWithCurrent(p.numberOptions, device.power_entity)}
                @entity-picked=${(e) => update(index, { power_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Sunrise switch (optional)"
                .value=${device.sunrise_switch_entity}
                .options=${optionsWithCurrent(p.switchOptions, device.sunrise_switch_entity)}
                @entity-picked=${(e) => update(index, { sunrise_switch_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <gm-entity-picker
              label="Sunrise duration (number, optional)"
              .value=${device.sunrise_duration_entity}
              .options=${optionsWithCurrent(p.numberOptions, device.sunrise_duration_entity)}
              @entity-picked=${(e) => update(index, { sunrise_duration_entity: e.detail })}
            ></gm-entity-picker>
          </div>
        `;
    })}
      <button class="md3-button tonal" style="margin-top:4px;" @click=${add}>
        + Add AC Infinity grow light
      </button>
    </div>
  `;
}

/**
 * Config Growlights Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Growlights tab — the
 * Grow Light Controller panel (enable, power, sunrise) plus the plain-entity and
 * AC Infinity configurator pickers. `@property .vm: GrowlightTabViewModel` in,
 * `env-draft-changed` Tab Intents out, no `@state()` and no `hass`.
 *
 * This tab **owns the edit surface** for `lights_on_time` — the crop-steering
 * photoperiod anchor. It stays an `IrrigationStrategy` field (not `GrowLightConfig`),
 * so editing it emits a dedicated `lights-on-changed` Tab Intent (not `env-draft-changed`):
 * the host persists it immediately via `updateIrrigationStrategy`, outside the dialog's
 * buffered Save. The input sits outside the controller enable-gate so a crop-steering-only
 * user with no controller can still set the anchor. See ADR-0026.
 */
let ConfigGrowlightTab = class ConfigGrowlightTab extends i$2 {
    updated(changed) {
        // Deep-link from the FlowerFlipChip (#433): scroll the lights-on input into
        // view and pulse it once. The target lives in this component's own shadow root,
        // so the query must run here (the dialog can't pierce the boundary).
        if (changed.has('scrollToField') && this.scrollToField === 'lightsOnTime') {
            const target = this.shadowRoot?.querySelector('[data-scroll-target="lightsOnTime"]');
            if (!target)
                return;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('field-pulse');
            target.addEventListener('animationend', () => target.classList.remove('field-pulse'), {
                once: true,
            });
        }
    }
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _update(partial) {
        this._emit('env-draft-changed', { partial });
    }
    _pickPort(field, index, deviceId) {
        this._emit('pick-ac-infinity-device', { field, index, deviceId });
    }
    _updateConfig(patch) {
        const next = {
            enabled: this.vm.enabled,
            power: this.vm.power,
            sunrise_enabled: this.vm.sunriseEnabled,
            sunrise_minutes: this.vm.sunriseMinutes,
            ...patch,
        };
        this._update({ growlightConfig: next });
    }
    /** Lights-on is a strategy field persisted immediately by the host (ADR-0026). */
    _emitLightsOn(value) {
        this._emit('lights-on-changed', { lightsOnTime: value });
    }
    render() {
        const vm = this.vm;
        return x `
      <div class="detail-card">
        <config-section-header
          .icon=${mdiWhiteBalanceSunny}
          label="Grow Light Controller"
        ></config-section-header>
        <div class="form-section">
          <label class="checkbox-label">
            <input
              type="checkbox"
              .checked=${vm.enabled}
              @change=${(e) => this._updateConfig({ enabled: e.target.checked })}
            />
            Enable grow light controller
          </label>

          <md3-text-input
            label="Lights On Time"
            type="time"
            data-scroll-target="lightsOnTime"
            .value=${vm.lightsOnTime ?? '06:00'}
            @change=${(e) => this._emitLightsOn(e.target.value || e.detail)}
          ></md3-text-input>
          <p class="anchor-note">
            The crop-steering photoperiod anchor. Saves immediately. The lights-off time is derived
            from your veg / flower day-length settings.
          </p>

          <div class=${vm.disabled ? 'disabled form-section' : 'form-section'}>
            ${this._multiSelect('Grow Light / Switch', vm.growlightEntities, vm.growlightEntityOptions)}

            <md3-number-input
              label="Power %"
              .value=${vm.power}
              step="1"
              min="0"
              max="100"
              @change=${(e) => this._updateConfig({
            power: Math.min(100, Math.max(0, Math.round(parseFloat(e.detail) || 0))),
        })}
            ></md3-number-input>

            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${vm.sunriseEnabled}
                @change=${(e) => this._updateConfig({ sunrise_enabled: e.target.checked })}
              />
              Enable sunrise ramp (AC Infinity only)
            </label>
            ${vm.sunriseEnabled
            ? x `
                  <md3-number-input
                    label="Sunrise duration (minutes)"
                    .value=${vm.sunriseMinutes}
                    step="1"
                    min="0"
                    @change=${(e) => this._updateConfig({
                sunrise_minutes: Math.max(0, Math.round(parseFloat(e.detail) || 0)),
            })}
                  ></md3-number-input>
                `
            : E}
            ${renderGrowlightAcInfinityDevices({
            devices: vm.acInfinityDevices,
            modeOptions: vm.modeOptions,
            timeOptions: vm.timeOptions,
            numberOptions: vm.numberOptions,
            switchOptions: vm.switchOptions,
            portDevices: vm.acInfinityPortDevices,
            portDeviceIds: vm.growlightPortDeviceIds,
            prefillWarnings: vm.growlightPrefillWarnings,
            duplicateWarnings: vm.growlightDuplicateWarnings,
            onChange: (devices) => this._update({ growlightAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) => this._pickPort('growlightAcInfinityDevices', index, deviceId),
        })}
          </div>
        </div>
      </div>
    `;
    }
    _multiSelect(label, values, options) {
        return x `
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${options}
        @entity-values-changed=${(event) => this._update({ growlightEntities: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
};
ConfigGrowlightTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .anchor-note {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        line-height: 1.4;
      }
      /* Deep-link pulse (#433) — mirrors the irrigation dialog's field-pulse. */
      @keyframes field-pulse-anim {
        0% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33, 150, 243), 0.5);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(var(--primary-color-rgb, 33, 150, 243), 0.2);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb, 33, 150, 243), 0);
        }
      }
      .field-pulse {
        border-radius: 4px;
        animation: field-pulse-anim 3s ease-out 1;
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigGrowlightTab.prototype, "vm", void 0);
__decorate([
    n({ type: String })
], ConfigGrowlightTab.prototype, "scrollToField", void 0);
ConfigGrowlightTab = __decorate([
    t$1('config-growlight-tab')
], ConfigGrowlightTab);

/**
 * Shared ViewModel helper: fold a tab's AC Infinity device lists into an
 * Automated Mode Conflict lookup keyed by `mode_entity`, ready for the editor.
 * Used by both the Climate and Humidity tab ViewModels so the four roles behave
 * identically. Empty/duplicate mode entities are skipped; the shell-supplied
 * resolver returns `null` for non-conflicted (Off/On/unavailable/unknown) ports.
 */
function buildAcInfinityConflicts(deviceLists, resolve) {
    const conflicts = {};
    for (const list of deviceLists) {
        for (const device of list) {
            const eid = device.mode_entity;
            if (!eid || conflicts[eid])
                continue;
            const conflict = resolve(eid);
            if (conflict)
                conflicts[eid] = conflict;
        }
    }
    return conflicts;
}
/** Stable env-draft field name → the display label the Duplicate Port Warning names. */
const AC_INFINITY_ROLE_LABELS = {
    exhaustFanAcInfinityDevices: 'Exhaust Fan',
    circulationFanAcInfinityDevices: 'Circulation Fan',
    humidifierAcInfinityDevices: 'Humidifier',
    dehumidifierAcInfinityDevices: 'Dehumidifier',
    growlightAcInfinityDevices: 'Grow Light',
};
/** The five role bundles a draft holds, keyed by their mode entities, in canonical order. */
function acInfinityRoleLists(d) {
    return Object.keys(AC_INFINITY_ROLE_LABELS).map((field) => ({
        field,
        modeEntities: (d[field] ?? []).map((dev) => dev.mode_entity),
    }));
}
function joinRoles(labels) {
    if (labels.length <= 1)
        return labels.join('');
    return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
/**
 * Duplicate Port Warning fold (ADR-0028): a mode entity assigned to more than
 * one role bundle in the same growspace draft means two GSM controllers would
 * fight over one port. Returns, per field, a per-port message parallel to that
 * bundle's devices — '' when the port's mode entity is unique to its role, else
 * a passive warning naming the *other* role(s) holding it. Blank mode entities
 * never match each other; a repeat within a single field is not a cross-role
 * duplicate (`another role bundle`), so it is not flagged.
 */
function buildDuplicatePortWarnings(lists) {
    const fieldsByEntity = new Map();
    for (const { field, modeEntities } of lists) {
        for (const eid of modeEntities) {
            if (!eid)
                continue;
            const set = fieldsByEntity.get(eid) ?? new Set();
            set.add(field);
            fieldsByEntity.set(eid, set);
        }
    }
    const result = {};
    for (const { field, modeEntities } of lists) {
        result[field] = modeEntities.map((eid) => {
            const fields = eid ? fieldsByEntity.get(eid) : undefined;
            if (!fields)
                return '';
            const others = [...fields].filter((f) => f !== field);
            if (others.length === 0)
                return '';
            const labels = others.map((f) => AC_INFINITY_ROLE_LABELS[f] ?? f);
            return `This port is also configured as ${joinRoles(labels)} — two controllers would fight over it.`;
        });
    }
    return result;
}

/**
 * Grow Light Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Growlights tab — the grow light
 * controller panel (enable, power, sunrise) plus the plain-entity and AC Infinity
 * configurator pickers. Projects its slice of the [[Shared Environment Draft]].
 *
 * `entityOptions` is the injected hass adapter for the pickers. `lightsOnTime`
 * is the growspace's crop-steering anchor, sourced live from the strategy atom and
 * **edited here** — this tab is its canonical home (ADR-0026). It remains an
 * `IrrigationStrategy` field, persisted immediately by the host, not in the env draft.
 */
// Grow lights are actuators: only `light.*` (dimmable) and `switch.*` (on/off).
// AC Infinity ports are configured through the dedicated configurator below.
const PLAIN_GROWLIGHT_DOMAINS = ['light', 'switch'];
/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Growlights tab
 * ViewModel. Testable with no DOM and no host.
 */
function createGrowlightTabViewModel(sm, deps) {
    const d = sm.environmentDraft;
    const cfg = d.growlightConfig;
    return {
        enabled: cfg.enabled,
        power: cfg.power,
        sunriseEnabled: cfg.sunrise_enabled,
        sunriseMinutes: cfg.sunrise_minutes,
        disabled: !cfg.enabled,
        growlightEntities: d.growlightEntities,
        growlightEntityOptions: deps.entityOptions(PLAIN_GROWLIGHT_DOMAINS, null),
        acInfinityDevices: d.growlightAcInfinityDevices,
        modeOptions: deps.entityOptions(['select'], null),
        timeOptions: deps.entityOptions(['time'], null),
        numberOptions: deps.entityOptions(['number'], null),
        switchOptions: deps.entityOptions(['switch'], null),
        acInfinityPortDevices: deps.acInfinityPortDevices(),
        growlightPortDeviceIds: d.growlightAcInfinityDevices.map((dev) => deps.acInfinityPortDeviceId(dev.mode_entity)),
        growlightPrefillWarnings: d.growlightAcInfinityDevices.map((_, i) => deps.acInfinityPrefillWarning('growlightAcInfinityDevices', i)),
        growlightDuplicateWarnings: buildDuplicatePortWarnings(acInfinityRoleLists(d))
            .growlightAcInfinityDevices,
        lightsOnTime: deps.lightsOnTime ?? null,
    };
}

/**
 * AC Infinity "Automated Mode Conflict" detection (see CONTEXT.md).
 *
 * A bound AC Infinity port whose mode `select` sits in one of the controller's
 * self-running modes (`Auto`/`VPD`/`Timer`/`Cycle`/`Schedule` — anything other
 * than `Off`/`On`) is re-asserted by the AC Infinity controller/cloud, so GSM's
 * `On`/`Off` writes don't reliably stick. This module holds the pure predicate;
 * the shell (config-dialog) supplies the hass-reading resolver that turns a mode
 * entity into a {@link AcInfinityConflict}, and the tab ViewModels fold the
 * per-device results into a lookup the editor renders as a passive warning.
 */
/**
 * States that mean the port is *not* in a self-running mode: `off`/`on` are the
 * two GSM-controllable states; `unavailable`/`unknown` are non-assertions (GSM
 * can't claim a conflict), mirroring the backend `ACInfinityDriver.is_on()` rule.
 */
const NON_AUTOMATED_STATES = new Set(['off', 'on', 'unavailable', 'unknown']);
/**
 * True when a mode-select state string represents an AC Infinity self-running
 * ("automated") mode. Empty/missing states are not automated (no warning).
 */
function isAutomatedMode(state) {
    if (!state)
        return false;
    return !NON_AUTOMATED_STATES.has(state.toLowerCase());
}

/**
 * Port Pre-fill resolver (ADR-0028). Pure, DOM-free translation-key resolution of
 * an AC Infinity *port device* into its bundle member entities, plus the helpers
 * the picker needs (list the port devices, derive the picked device from a saved
 * mode entity). The card resolves at the moment of the pick only — never at save
 * or runtime — and the saved config stays the explicit entity bundle.
 *
 * Output is keyed by *role-neutral* names, not by either bundle's field names: the
 * `on_power` number is the actuator bundle's `speed_entity` but the grow-light
 * bundle's `power_entity`, so both slices (#445 actuator, #446 grow light) map from
 * the same `power` role without one inheriting the other's vocabulary.
 */
/** Role → the entity `domain` + `ac_infinity` `translation_key` that identifies it. */
const AC_INFINITY_ROLE_MAP = {
    mode: { domain: 'select', translationKey: 'active_mode' },
    power: { domain: 'number', translationKey: 'on_power' },
    onTime: { domain: 'time', translationKey: 'schedule_mode_on_time' },
    offTime: { domain: 'time', translationKey: 'schedule_mode_off_time' },
    sunriseSwitch: { domain: 'switch', translationKey: 'sunrise_timer_enabled' },
    sunriseDuration: { domain: 'number', translationKey: 'sunrise_timer_minutes' },
};
const PLATFORM = 'ac_infinity';
const { domain: MODE_DOMAIN, translationKey: MODE_TK } = AC_INFINITY_ROLE_MAP.mode;
/**
 * The pickable port devices: every device that exposes an `ac_infinity`
 * `active_mode` select (what distinguishes a controllable port from the
 * controller parent), each listed once and labeled via the injected
 * device-name resolver (`name_by_user || name`). Sorted by label.
 */
function listAcInfinityPortDevices(registry, deviceName) {
    const deviceIds = new Set();
    for (const [eid, e] of Object.entries(registry)) {
        if (e.platform === PLATFORM &&
            e.translation_key === MODE_TK &&
            e.device_id &&
            eid.split('.')[0] === MODE_DOMAIN) {
            deviceIds.add(e.device_id);
        }
    }
    return [...deviceIds]
        .map((id) => ({ id, label: deviceName(id) }))
        .sort((a, b) => a.label.localeCompare(b.label));
}
/**
 * The device a saved bundle points at, for the picker's value on reopen: the
 * `device_id` of the bundle's mode entity, or '' when unset/unknown.
 */
function deviceIdForModeEntity(registry, modeEntity) {
    if (!modeEntity)
        return '';
    return registry[modeEntity]?.device_id ?? '';
}
/** The actuator bundle's two resolved roles, in the order the warning names them. */
const ACTUATOR_ROLES = [
    { role: 'mode', label: 'Mode', field: 'mode_entity' },
    { role: 'power', label: 'Speed', field: 'speed_entity' },
];
/**
 * Apply a port pick to an actuator bundle: overwrite both role fields from the
 * resolved roles, clearing any that did not resolve (never left stale from a
 * previously picked port), and preserve `on_speed`. `missing` names the roles
 * that resolved to nothing, for the inline warning.
 */
function fillAcInfinityActuatorPort(current, roles) {
    const device = { ...current, mode_entity: '', speed_entity: '' };
    const missing = [];
    for (const { role, label, field } of ACTUATOR_ROLES) {
        const eid = roles[role];
        if (eid)
            device[field] = eid;
        else
            missing.push(label);
    }
    return { device, missing };
}
/** The grow-light bundle's six roles, in the order the warning names them. */
const GROWLIGHT_ROLES = [
    { role: 'mode', label: 'Mode', field: 'mode_entity' },
    { role: 'onTime', label: 'On time', field: 'on_time_entity' },
    { role: 'offTime', label: 'Off time', field: 'off_time_entity' },
    { role: 'power', label: 'Power', field: 'power_entity' },
    { role: 'sunriseSwitch', label: 'Sunrise switch', field: 'sunrise_switch_entity' },
    { role: 'sunriseDuration', label: 'Sunrise duration', field: 'sunrise_duration_entity' },
];
/**
 * Apply a port pick to a grow-light bundle: overwrite all six role fields from
 * the resolved roles in one pass, clearing any that did not resolve (sunrise
 * roles included — a port without them saves with empty sunrise fields).
 * `missing` names the roles that resolved to nothing, for the inline warning.
 */
function fillAcInfinityGrowLightPort(current, roles) {
    const device = { ...current };
    const missing = [];
    for (const { role, label, field } of GROWLIGHT_ROLES) {
        const eid = roles[role];
        device[field] = eid ?? '';
        if (!eid)
            missing.push(label);
    }
    return { device, missing };
}
/**
 * Resolve the picked port device to its role → entity-id map. A role is present
 * only when a matching `ac_infinity` entity of the right domain + translation key
 * on that device exists (disabled entities are absent from the registry, so they
 * resolve as missing). Registry keys are matched in sorted order so a device that
 * happens to expose two entities of one role resolves deterministically.
 */
function resolveAcInfinityPort(registry, deviceId) {
    const result = {};
    if (!deviceId)
        return result;
    const eids = Object.keys(registry).sort();
    for (const [role, { domain, translationKey }] of Object.entries(AC_INFINITY_ROLE_MAP)) {
        if (result[role])
            continue;
        const match = eids.find((eid) => {
            const e = registry[eid];
            return (e.platform === PLATFORM &&
                e.device_id === deviceId &&
                e.translation_key === translationKey &&
                eid.split('.')[0] === domain);
        });
        if (match)
            result[role] = match;
    }
    return result;
}

/**
 * Climate Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Climate tab — the heaviest
 * env-cluster tab (Climate Control + the circulation Fan Controller panel + the
 * Exhaust Fan Controller panel). It projects its slice of the [[Shared
 * Environment Draft]] and folds in the mode/toggle-conditional view logic the
 * panels need: which target+tolerance pair is live, the "Fallback VPD Target"
 * relabel, disabled greying, and which collapsible sub-sections show.
 *
 * Two hass/shell dependencies are injected so the dumb component stays free of
 * both: `entityOptions` (the shell's hass-reading `_getEntities`) supplies the
 * fan-entity picker lists, and `expand` carries the stage-accordion state.
 * That toggle is **Shell `@state`**, not SM state — ephemeral accordion state
 * stays on the shell and is projected in here, the same pattern the still-inline
 * humidity/VPD accordions use
 * (`_openHumidityStageId`); only draft/edit state goes to the SM. See ADR-0019.
 */
/** Entity domains for the two Climate-tab fan pickers (deviceClass is null). */
const EXHAUST_FAN_DOMAINS = [
    'fan',
    'switch',
    'input_boolean',
    'sensor',
    'binary_sensor',
    'input_number',
];
const CIRCULATION_FAN_DOMAINS = ['fan', 'switch', 'input_boolean', 'sensor', 'input_number'];
function vpdLabel(stageVpdEnabled, unit) {
    return stageVpdEnabled ? `Fallback VPD Target (${unit})` : `VPD Target (${unit})`;
}
function currentTemperatureDisplay(reading, targetUnit) {
    if (!reading || !Number.isFinite(reading.value))
        return '—';
    const sourceUnit = normalizedTemperatureUnit(reading.unit ?? targetUnit);
    const celsius = temperatureToCelsius(reading.value, sourceUnit);
    return `${temperatureFromCelsius(celsius, targetUnit).toFixed(1)} ${targetUnit}`;
}
function stageVpdValues(overrides, key) {
    return overrides?.[key] ?? FAN_VPD_STAGE_DEFAULTS[key];
}
/**
 * Pure factory: the Config Dialog SM + injected hass adapter + the Shell's
 * expander flags → one Climate tab ViewModel. Testable with no DOM and no host.
 */
function createClimateTabViewModel(sm, deps, expand) {
    const d = sm.environmentDraft;
    const fan = d.circulationFanConfig;
    const exhaust = d.exhaustFanConfig;
    // `regulation_mode` predates the field on older growspaces and the backend
    // response isn't schema-validated here (CLAUDE.md's api-schema.ts has no
    // entry for it), so a growspace whose Fan Controller was never saved comes
    // through with the key missing rather than its documented default. Binding
    // that straight to <md3-select>.value leaves the native <select> matching no
    // <option>, which drops its selectedIndex to -1 and renders the control
    // blank — not merely unselected. Fall back to the same 'vpd' default a new
    // growspace draft gets (defaultEnvironmentDraft in config-dialog-sm.ts).
    const mode = fan.regulation_mode ?? 'vpd';
    const duplicates = buildDuplicatePortWarnings(acInfinityRoleLists(d));
    const temperatureUnit = normalizedTemperatureUnit(deps.unitSystem?.temperature);
    const pressureUnit = normalizedPressureUnit(deps.unitSystem?.pressure);
    return {
        control: {
            exhaustFanEntities: d.exhaustFanEntities,
            exhaustFanOptions: deps.entityOptions(EXHAUST_FAN_DOMAINS, null),
            circulationFanEntities: d.circulationFanEntities,
            circulationFanOptions: deps.entityOptions(CIRCULATION_FAN_DOMAINS, null),
            exhaustFanAcInfinityDevices: d.exhaustFanAcInfinityDevices,
            circulationFanAcInfinityDevices: d.circulationFanAcInfinityDevices,
            acInfinityModeOptions: deps.entityOptions(['select'], null, 'ac_infinity'),
            acInfinitySpeedOptions: deps.entityOptions(['number'], null, 'ac_infinity'),
            acInfinityConflicts: buildAcInfinityConflicts([d.exhaustFanAcInfinityDevices, d.circulationFanAcInfinityDevices], deps.acInfinityConflict),
            acInfinityPortDevices: deps.acInfinityPortDevices(),
            exhaustFanPortDeviceIds: d.exhaustFanAcInfinityDevices.map((dev) => deps.acInfinityPortDeviceId(dev.mode_entity)),
            circulationFanPortDeviceIds: d.circulationFanAcInfinityDevices.map((dev) => deps.acInfinityPortDeviceId(dev.mode_entity)),
            exhaustFanPrefillWarnings: d.exhaustFanAcInfinityDevices.map((_, i) => deps.acInfinityPrefillWarning('exhaustFanAcInfinityDevices', i)),
            circulationFanPrefillWarnings: d.circulationFanAcInfinityDevices.map((_, i) => deps.acInfinityPrefillWarning('circulationFanAcInfinityDevices', i)),
            exhaustFanDuplicateWarnings: duplicates.exhaustFanAcInfinityDevices,
            circulationFanDuplicateWarnings: duplicates.circulationFanAcInfinityDevices,
            stressThreshold: d.stressThreshold,
            moldThreshold: d.moldThreshold,
        },
        fan: {
            config: fan,
            disabled: !fan.enabled,
            mode,
            showStageVpd: mode === 'vpd',
            vpdTargetLabel: vpdLabel(fan.stage_vpd_enabled, pressureUnit),
            vpdTargetDimmed: fan.stage_vpd_enabled,
            showTempOverride: mode === 'vpd',
            showWind: fan.wind_enabled,
        },
        stageVpd: {
            visible: (mode === 'vpd' && fan.stage_vpd_enabled) || exhaust.stage_vpd_enabled,
            stages: FAN_VPD_STAGE_KEYS.map((key) => ({
                id: key,
                label: FAN_VPD_STAGE_LABELS[key],
                color: FAN_VPD_STAGE_COLORS[key],
                open: expand.openStageVpdId === key,
                current: deps.currentStage === key,
                fan: stageVpdValues(fan.stage_vpd_overrides, key),
                exhaust: stageVpdValues(exhaust.stage_vpd_overrides, key),
            })),
        },
        exhaust: {
            config: exhaust,
            disabled: !exhaust.enabled,
            vpdTargetLabel: vpdLabel(exhaust.stage_vpd_enabled, pressureUnit),
            vpdTargetDimmed: exhaust.stage_vpd_enabled,
        },
        units: {
            temperature: temperatureUnit,
            pressure: pressureUnit,
            currentTemperature: currentTemperatureDisplay(deps.currentTemperature, temperatureUnit),
        },
        language: deps.language ?? 'en',
    };
}

/**
 * Config Humidity Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Humidity tab — Humidity
 * Devices (humidifier/dehumidifier pickers + the two control-enable toggles) and
 * the per-stage Thresholds accordion. `@property .vm: HumidityTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup transcribed
 * verbatim from the former inline `_renderHumiditySection`; the `acc-*` accordion
 * and multi-select styles moved here with it.
 *
 * Threshold edits forward `{ stage, cycle, point, value }` (with the enum-value
 * Record key the VM supplies); the Shell merges against the live draft. The two
 * control toggles fire an immediate backend service in the Shell, so they emit a
 * dedicated intent rather than a draft change.
 *
 * Tab Intents (the Shell translates them):
 *   - `env-draft-changed`        detail: { partial }   (device entity pickers)
 *   - `set-humidifier-control`   detail: { enabled }
 *   - `set-dehumidifier-control` detail: { enabled }
 *   - `toggle-stage`             detail: { stageId }
 *   - `update-dehum-threshold`   detail: { stage, cycle, point, value }
 *   - `update-hum-threshold`     detail: { stage, cycle, point, value }
 */
let ConfigHumidityTab = class ConfigHumidityTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _update(partial) {
        this._emit('env-draft-changed', { partial });
    }
    _pickPort(field, index, deviceId) {
        this._emit('pick-ac-infinity-device', { field, index, deviceId });
    }
    render() {
        return x `${this._renderDevices()}${this._renderThresholds()}`;
    }
    // ── Humidity Devices ────────────────────────────────────────────────────────
    _renderDevices() {
        return x `
      <div class="detail-card">
        <config-section-header
          .icon=${mdiAirHumidifier}
          label="Humidity Devices"
        ></config-section-header>
        <div class="form-section">
          <div class="row-col-grid">
            ${this._multiSelect('Humidifier', 'humidifierEntities', this.vm.humidifierEntities, this.vm.humidifierOptions)}
            ${this._multiSelect('Dehumidifier', 'dehumidifierEntities', this.vm.dehumidifierEntities, this.vm.dehumidifierOptions)}
          </div>
          ${renderAcInfinityDevices({
            label: 'Humidifier AC Infinity Devices',
            devices: this.vm.humidifierAcInfinityDevices,
            modeOptions: this.vm.acInfinityModeOptions,
            speedOptions: this.vm.acInfinitySpeedOptions,
            conflicts: this.vm.acInfinityConflicts,
            portDevices: this.vm.acInfinityPortDevices,
            portDeviceIds: this.vm.humidifierPortDeviceIds,
            prefillWarnings: this.vm.humidifierPrefillWarnings,
            duplicateWarnings: this.vm.humidifierDuplicateWarnings,
            idPrefix: 'humidifier',
            onChange: (devices) => this._update({ humidifierAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) => this._pickPort('humidifierAcInfinityDevices', index, deviceId),
        })}
          ${renderAcInfinityDevices({
            label: 'Dehumidifier AC Infinity Devices',
            devices: this.vm.dehumidifierAcInfinityDevices,
            modeOptions: this.vm.acInfinityModeOptions,
            speedOptions: this.vm.acInfinitySpeedOptions,
            conflicts: this.vm.acInfinityConflicts,
            portDevices: this.vm.acInfinityPortDevices,
            portDeviceIds: this.vm.dehumidifierPortDeviceIds,
            prefillWarnings: this.vm.dehumidifierPrefillWarnings,
            duplicateWarnings: this.vm.dehumidifierDuplicateWarnings,
            idPrefix: 'dehumidifier',
            onChange: (devices) => this._update({ dehumidifierAcInfinityDevices: devices }),
            onPickDevice: (index, deviceId) => this._pickPort('dehumidifierAcInfinityDevices', index, deviceId),
        })}
          <div class="row-col-grid">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this.vm.humidifierControlEnabled}
                @change=${(e) => this._emit('set-humidifier-control', {
            enabled: e.target.checked,
        })}
              />
              Enable Humidifier Control
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this.vm.dehumidifierControlEnabled}
                @change=${(e) => this._emit('set-dehumidifier-control', {
            enabled: e.target.checked,
        })}
              />
              Enable Dehumidifier Control
            </label>
          </div>
        </div>
      </div>
    `;
    }
    _multiSelect(label, key, values, options) {
        return x `
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${options}
        @entity-values-changed=${(event) => this._update({ [key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
    // ── Thresholds per Stage ────────────────────────────────────────────────────
    _renderThresholds() {
        return x `
      <div class="detail-card">
        <config-section-header
          .icon=${mdiWaterPercent}
          label="Thresholds per Stage"
        ></config-section-header>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${this.vm.stages.map((stage) => this._renderStage(stage))}
        </div>
      </div>
    `;
    }
    _renderStage(stage) {
        return x `
      <div class="acc-card">
        <div class="acc-head" @click=${() => this._emit('toggle-stage', { stageId: stage.id })}>
          <div class="acc-stage-dot" style="background:${stage.color};"></div>
          <div class="acc-head-title">${stage.label}</div>
          ${!stage.open
            ? x `
                <div class="acc-head-desc">
                  Dehum on &gt;
                  ${stage.dehum.day.on > 0 ? stage.dehum.day.on.toFixed(2) + ' kPa' : '—'}
                  &nbsp;·&nbsp; Hum on &lt;
                  ${stage.hum.day.on > 0 ? stage.hum.day.on.toFixed(2) + ' kPa' : '—'}
                </div>
              `
            : E}
          <svg class="acc-chev ${stage.open ? 'open' : ''}" viewBox="0 0 24 24">
            <path d="${mdiChevronDown}"></path>
          </svg>
        </div>
        ${stage.open
            ? x `
              <div class="acc-body">
                ${this._deviceBlock('Dehumidifier', 'var(--secondary,#2196f3)', mdiWaterPercent, 'update-dehum-threshold', stage.dehumKey, stage.dehum, 'On Above (kPa)', 'Off Below (kPa)')}
                ${this._deviceBlock('Humidifier', 'var(--metric-humidifier, #00bcd4)', mdiAirHumidifier, 'update-hum-threshold', stage.humKey, stage.hum, 'On Below (kPa)', 'Off Above (kPa)')}
              </div>
            `
            : E}
      </div>
    `;
    }
    _deviceBlock(title, headerColor, icon, intent, stageKey, values, onLabel, offLabel) {
        const cycle = (cycleKey, cycleLabel, cycleColor, cycleIcon, pair) => x `
      <div>
        <div class="acc-cycle-row" style="color:${cycleColor};">
          <svg viewBox="0 0 24 24"><path d="${cycleIcon}"></path></svg>
          ${cycleLabel}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
          <md3-number-input
            label="${onLabel}"
            .value=${pair.on}
            @change=${(e) => this._emit(intent, {
            stage: stageKey,
            cycle: cycleKey,
            point: 'on',
            value: parseFloat(e.detail),
        })}
            step="0.05"
          ></md3-number-input>
          <md3-number-input
            label="${offLabel}"
            .value=${pair.off}
            @change=${(e) => this._emit(intent, {
            stage: stageKey,
            cycle: cycleKey,
            point: 'off',
            value: parseFloat(e.detail),
        })}
            step="0.05"
          ></md3-number-input>
        </div>
      </div>
    `;
        return x `
      <div class="acc-device-block">
        <div class="acc-device-header" style="color:${headerColor};">
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
          ${title}
        </div>
        <div class="acc-cycle-grid">
          ${cycle('day', 'Day', 'var(--cycle-day, #ffeb3b)', mdiWhiteBalanceSunny, values.day)}
          ${cycle('night', 'Night', 'var(--cycle-night, #7986cb)', mdiWeatherNight, values.night)}
        </div>
      </div>
    `;
    }
};
ConfigHumidityTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      /* ── thresholds accordion — copied from config-dialog ── */
      .acc-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        border-radius: var(--border-radius-md, 12px);
        overflow: hidden;
      }
      .acc-head {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        box-sizing: border-box;
        padding: 13px 16px;
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }
      .acc-head:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      .acc-stage-dot {
        width: 10px;
        height: 10px;
        border: 1px solid var(--primary-text-color, #fff);
        border-radius: 50%;
        flex-shrink: 0;
      }
      .acc-head-title {
        flex: 1;
        font-size: 1rem;
        font-weight: 500;
      }
      .acc-head-desc {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }
      .acc-chev {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        transition: transform 0.2s;
        flex-shrink: 0;
      }
      .acc-chev.open {
        transform: rotate(180deg);
      }
      .acc-body {
        padding: 16px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .acc-cycle-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .acc-device-block {
        background: rgba(0, 0, 0, 0.15);
        border-radius: var(--border-radius-md, 12px);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .acc-device-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 500;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
      }
      .acc-device-header svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        opacity: 0.8;
      }
      .acc-cycle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--font-size-supporting);
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }
      .acc-cycle-row svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigHumidityTab.prototype, "vm", void 0);
ConfigHumidityTab = __decorate([
    t$1('config-humidity-tab')
], ConfigHumidityTab);

/**
 * Humidity Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Humidity tab — Humidity Devices
 * (humidifier/dehumidifier pickers + the two control-enable toggles) and the
 * per-stage Thresholds accordion. It owns the stage list and the threshold
 * defaults (moved here from `config-dialog.ts` so the read logic is pure and
 * unit-testable), and projects each stage's current day/night on/off thresholds
 * for both devices, with the default fallback applied.
 *
 * The open accordion stage is projected from Shell `@state`; the two control
 * flags live in the shared environment draft. `entityOptions` is the injected
 * hass adapter for the device pickers.
 *
 * The stage's `dehumKey` / `humKey` (the `DehumidifierStage` / `HumidifierStage`
 * enum *values*) are the threshold-Record keys — distinct from `id` (the display
 * id used for open/toggle); the component echoes the right key back on edit.
 */
const DEFAULT_DEHUM_THRESHOLDS = {
    seedling: { day: { on: 0.5, off: 0.6 }, night: { on: 0.55, off: 0.65 } },
    clone: { day: { on: 0.5, off: 0.6 }, night: { on: 0.55, off: 0.65 } },
    mother: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
    veg: { day: { on: 0.6, off: 0.7 }, night: { on: 0.65, off: 0.75 } },
    flower_early: { day: { on: 1.1, off: 1.2 }, night: { on: 0.7, off: 0.9 } },
    flower_mid: { day: { on: 1.25, off: 1.35 }, night: { on: 0.9, off: 1.0 } },
    flower_late: { day: { on: 1.35, off: 1.4 }, night: { on: 0.95, off: 1.05 } },
    dry: { day: { on: 0.8, off: 1.0 }, night: { on: 0.85, off: 1.05 } },
    cure: { day: { on: 0.9, off: 1.1 }, night: { on: 0.95, off: 1.15 } },
};
const DEFAULT_HUM_THRESHOLDS = {
    seedling: { day: { on: 0.7, off: 0.5 }, night: { on: 0.75, off: 0.55 } },
    clone: { day: { on: 0.7, off: 0.5 }, night: { on: 0.75, off: 0.55 } },
    mother: { day: { on: 0.9, off: 0.7 }, night: { on: 0.85, off: 0.65 } },
    veg: { day: { on: 1.0, off: 0.8 }, night: { on: 0.85, off: 0.65 } },
    flower_early: { day: { on: 1.4, off: 1.2 }, night: { on: 1.0, off: 0.8 } },
    flower_mid: { day: { on: 1.6, off: 1.4 }, night: { on: 1.2, off: 1.0 } },
    flower_late: { day: { on: 1.7, off: 1.5 }, night: { on: 1.3, off: 1.1 } },
    dry: { day: { on: 1.2, off: 1.0 }, night: { on: 1.2, off: 1.0 } },
    cure: { day: { on: 1.2, off: 1.0 }, night: { on: 1.2, off: 1.0 } },
};
const DEHUMIDIFIER_STAGE_BY_KEY = {
    seedling: DehumidifierStage.SEEDLING,
    clone: DehumidifierStage.CLONE,
    mother: DehumidifierStage.MOTHER,
    veg: DehumidifierStage.VEG,
    flower_early: DehumidifierStage.EARLY_FLOWER,
    flower_mid: DehumidifierStage.MID_FLOWER,
    flower_late: DehumidifierStage.LATE_FLOWER,
    dry: DehumidifierStage.DRY,
    cure: DehumidifierStage.CURE,
};
const HUMIDIFIER_STAGE_BY_KEY = {
    seedling: HumidifierStage.SEEDLING,
    clone: HumidifierStage.CLONE,
    mother: HumidifierStage.MOTHER,
    veg: HumidifierStage.VEG,
    flower_early: HumidifierStage.EARLY_FLOWER,
    flower_mid: HumidifierStage.MID_FLOWER,
    flower_late: HumidifierStage.LATE_FLOWER,
    dry: HumidifierStage.DRY,
    cure: HumidifierStage.CURE,
};
const HUMIDITY_STAGE_LABELS = {
    seedling: 'Seedling',
    clone: 'Clone',
    mother: 'Mother',
    veg: 'Vegetative',
    flower_early: 'Early Flower',
    flower_mid: 'Mid Flower',
    flower_late: 'Late Flower',
    dry: 'Drying',
    cure: 'Curing',
};
/** Stage list for the accordion, derived in canonical glossary order. */
const HUMIDITY_STAGES = FAN_VPD_STAGE_KEYS.map((id) => ({
    id,
    label: HUMIDITY_STAGE_LABELS[id],
    dehum: DEHUMIDIFIER_STAGE_BY_KEY[id],
    hum: HUMIDIFIER_STAGE_BY_KEY[id],
    color: FAN_VPD_STAGE_COLORS[id],
}));
const HUMIDIFIER_DOMAINS = [
    'humidifier',
    'switch',
    'input_boolean',
    'sensor',
    'binary_sensor',
    'input_number',
];
const DEHUMIDIFIER_DOMAINS = ['humidifier', 'switch', 'input_boolean', 'sensor', 'binary_sensor'];
/**
 * One threshold value: the draft's override if present, else the stage default,
 * else 0 (an unknown stage key has no default). The single source of the read
 * logic the inline `_getThresholdValue` / `_getHumidifierThresholdValue` helpers
 * used to own.
 */
function readThreshold(thresholds, defaults, key, cycle, point) {
    return thresholds?.[key]?.[cycle]?.[point] ?? defaults[key]?.[cycle]?.[point] ?? 0;
}
function read(thresholds, defaults, key) {
    const at = (cycle, point) => readThreshold(thresholds, defaults, key, cycle, point);
    return {
        day: { on: at('day', 'on'), off: at('day', 'off') },
        night: { on: at('night', 'on'), off: at('night', 'off') },
    };
}
/**
 * Pure factory: the Config Dialog SM + injected hass adapter + the Shell's three
 * flags → one Humidity tab ViewModel. Testable with no DOM and no host.
 */
function createHumidityTabViewModel(sm, deps, expand) {
    const d = sm.environmentDraft;
    const duplicates = buildDuplicatePortWarnings(acInfinityRoleLists(d));
    return {
        humidifierEntities: d.humidifierEntities,
        humidifierOptions: deps.entityOptions(HUMIDIFIER_DOMAINS, null),
        dehumidifierEntities: d.dehumidifierEntities,
        dehumidifierOptions: deps.entityOptions(DEHUMIDIFIER_DOMAINS, null),
        humidifierAcInfinityDevices: d.humidifierAcInfinityDevices,
        dehumidifierAcInfinityDevices: d.dehumidifierAcInfinityDevices,
        acInfinityModeOptions: deps.entityOptions(['select'], null, 'ac_infinity'),
        acInfinitySpeedOptions: deps.entityOptions(['number'], null, 'ac_infinity'),
        acInfinityConflicts: buildAcInfinityConflicts([d.humidifierAcInfinityDevices, d.dehumidifierAcInfinityDevices], deps.acInfinityConflict),
        acInfinityPortDevices: deps.acInfinityPortDevices(),
        humidifierPortDeviceIds: d.humidifierAcInfinityDevices.map((dev) => deps.acInfinityPortDeviceId(dev.mode_entity)),
        dehumidifierPortDeviceIds: d.dehumidifierAcInfinityDevices.map((dev) => deps.acInfinityPortDeviceId(dev.mode_entity)),
        humidifierPrefillWarnings: d.humidifierAcInfinityDevices.map((_, i) => deps.acInfinityPrefillWarning('humidifierAcInfinityDevices', i)),
        dehumidifierPrefillWarnings: d.dehumidifierAcInfinityDevices.map((_, i) => deps.acInfinityPrefillWarning('dehumidifierAcInfinityDevices', i)),
        humidifierDuplicateWarnings: duplicates.humidifierAcInfinityDevices,
        dehumidifierDuplicateWarnings: duplicates.dehumidifierAcInfinityDevices,
        humidifierControlEnabled: d.humidifierControlEnabled,
        dehumidifierControlEnabled: d.dehumidifierControlEnabled,
        stages: HUMIDITY_STAGES.map((s) => ({
            id: s.id,
            label: s.label,
            color: s.color,
            open: expand.openStageId === s.id,
            dehumKey: s.dehum,
            humKey: s.hum,
            dehum: read(d.dehumidifierThresholds, DEFAULT_DEHUM_THRESHOLDS, s.dehum),
            hum: read(d.humidifierThresholds, DEFAULT_HUM_THRESHOLDS, s.hum),
        })),
    };
}

/**
 * Config Irrigation Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Irrigation tab —
 * Irrigation Monitoring + Substrate EC, both just multi-entity-select pickers.
 * `@property .vm: IrrigationTabViewModel` in, a single `env-draft-changed` Tab
 * Intent out, **no `@state()` and no `hass`** (option lists are pre-derived into
 * the VM). Markup + multi-select styles transcribed from the former inline
 * `_renderIrrigationSection` / `_renderSubstrateEcSection`.
 *
 * Tab Intent (the Shell translates it to `UPDATE_ENV_DRAFT`):
 *   - `env-draft-changed`  detail: { partial: Partial<EnvironmentDraft> }
 */
let ConfigIrrigationTab = class ConfigIrrigationTab extends i$2 {
    _update(partial) {
        this.dispatchEvent(new CustomEvent('env-draft-changed', { detail: { partial }, bubbles: true, composed: true }));
    }
    render() {
        const m = this.vm.monitoring;
        return x `
      <div class="detail-card">
        ${this._header(mdiGauge, 'Irrigation Monitoring')}
        <div class="form-section">
          <div class="row-col-grid">${this._field(m[0])}${this._field(m[1])}</div>
          <div class="row-col-grid">${this._field(m[2])}</div>
          <div class="row-col-grid">${this._field(m[3])}${this._field(m[4])}</div>
          <div class="row-col-grid">${this._field(m[5])}${this._field(m[6])}</div>
        </div>
      </div>
      <div class="detail-card">
        ${this._header(mdiLightningBolt, 'Substrate EC')}
        <div class="form-section">
          <div class="row-col-grid">${this.vm.substrate.map((f) => this._field(f))}</div>
        </div>
      </div>
    `;
    }
    _header(icon, title) {
        return x ` <config-section-header .icon=${icon} .label=${title}></config-section-header> `;
    }
    _field(field) {
        const values = field.value;
        return x `
      <config-entity-multi-select
        .label=${field.label}
        .values=${values}
        .options=${field.options}
        @entity-values-changed=${(event) => this._update({ [field.key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
};
ConfigIrrigationTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigIrrigationTab.prototype, "vm", void 0);
ConfigIrrigationTab = __decorate([
    t$1('config-irrigation-tab')
], ConfigIrrigationTab);

/**
 * Irrigation Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Irrigation tab — two sections
 * of monitoring-sensor pickers (Irrigation Monitoring + Substrate EC). The
 * simplest env-cluster tab: every field is a multi-entity select projecting its
 * slice of the [[Shared Environment Draft]], so the VM just pairs each draft
 * field with its injected option list (the same shape as the Sensors tab).
 */
const SENSOR_DOMAINS = ['sensor', 'input_number', 'number'];
/** Irrigation Monitoring section fields, in display order. */
const MONITORING_FIELDS = [
    { key: 'phSensors', label: 'pH Sensors', deviceClass: null },
    { key: 'feedEcSensors', label: 'Feed EC Sensors', deviceClass: null },
    { key: 'runoffEcSensors', label: 'Runoff EC Sensors', deviceClass: null },
    { key: 'drainVolumeSensors', label: 'Drain Volume Sensors', deviceClass: null },
    { key: 'irrigationFlowSensors', label: 'Irrigation Flow Sensors', deviceClass: null },
    { key: 'powerSensors', label: 'Power Sensors', deviceClass: 'power' },
    { key: 'energySensors', label: 'Energy Sensors', deviceClass: 'energy' },
];
/** Substrate EC section fields, in display order. */
const SUBSTRATE_FIELDS = [
    { key: 'bulkEcSensors', label: 'Bulk EC Sensors', deviceClass: null },
    { key: 'poreEcSensors', label: 'Pore EC Sensors', deviceClass: null },
];
function project(draft, deps, fields) {
    return fields.map((f) => ({
        key: f.key,
        label: f.label,
        value: draft[f.key],
        options: deps.entityOptions(SENSOR_DOMAINS, f.deviceClass),
    }));
}
/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Irrigation
 * tab ViewModel. Testable with no DOM and no host.
 */
function createIrrigationTabViewModel(sm, deps) {
    const draft = sm.environmentDraft;
    return {
        monitoring: project(draft, deps, MONITORING_FIELDS),
        substrate: project(draft, deps, SUBSTRATE_FIELDS),
    };
}

/**
 * Config Vision Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Vision AI tab — a
 * camera-entity picker plus the vision-checkup schedule form (gated on
 * `hasCameras`). `@property .vm: VisionTabViewModel` in, a single
 * `env-draft-changed` Tab Intent out, **no `@state()` and no `hass`**. Markup +
 * multi-select styles transcribed from the former inline `_renderVisionSection`.
 *
 * Tab Intent (the Shell translates it to `UPDATE_ENV_DRAFT`):
 *   - `env-draft-changed`  detail: { partial: Partial<EnvironmentDraft> }
 */
let ConfigVisionTab = class ConfigVisionTab extends i$2 {
    _update(partial) {
        this.dispatchEvent(new CustomEvent('env-draft-changed', { detail: { partial }, bubbles: true, composed: true }));
    }
    render() {
        const vm = this.vm;
        return x `
      <div class="detail-card">
        <config-section-header .icon=${mdiCamera} label="Vision Checkup"></config-section-header>
        ${this._cameraSelect(vm)}
        ${!vm.hasCameras
            ? x `<p style="opacity:0.6;font-size:1rem;margin:8px 0 0;">
              Add camera entities above to enable vision checkups.
            </p>`
            : x `
              <div class="form-section" style="margin-top:12px;">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    .checked=${vm.visionEnabled}
                    @change=${(e) => this._update({ visionEnabled: e.target.checked })}
                  />
                  Enable automatic vision checkups
                </label>
                <md3-number-input
                  label="Early check offset (min after lights on)"
                  .value=${vm.earlyOffset}
                  @change=${(e) => this._update({ visionEarlyOffset: Number(e.detail) })}
                  min="1"
                ></md3-number-input>
                <md3-number-input
                  label="Mid check (hours into light cycle)"
                  .value=${vm.midHours}
                  @change=${(e) => this._update({ visionMidHours: Number(e.detail) })}
                  min="1"
                ></md3-number-input>
                <md3-number-input
                  label="Late check offset (min before lights off)"
                  .value=${vm.lateOffset}
                  @change=${(e) => this._update({ visionLateOffset: Number(e.detail) })}
                  min="1"
                ></md3-number-input>
              </div>
            `}
      </div>
    `;
    }
    _cameraSelect(vm) {
        const values = vm.cameraEntities;
        return x `
      <config-entity-multi-select
        label="Camera Entities"
        .values=${values}
        .options=${vm.cameraOptions}
        @entity-values-changed=${(event) => this._update({ cameraEntities: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
};
ConfigVisionTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigVisionTab.prototype, "vm", void 0);
ConfigVisionTab = __decorate([
    t$1('config-vision-tab')
], ConfigVisionTab);

/**
 * Vision Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Vision AI tab — a camera-entity
 * picker plus the vision-checkup schedule form (shown only once a camera is
 * configured). Projects its slice of the [[Shared Environment Draft]] and the
 * `hasCameras` gate; `entityOptions` is the injected hass adapter for the picker.
 */
/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Vision tab
 * ViewModel. Testable with no DOM and no host.
 */
function createVisionTabViewModel(sm, deps) {
    const d = sm.environmentDraft;
    return {
        cameraEntities: d.cameraEntities,
        cameraOptions: deps.entityOptions(['camera'], null),
        hasCameras: d.cameraEntities.length > 0,
        visionEnabled: d.visionEnabled,
        earlyOffset: d.visionEarlyOffset,
        midHours: d.visionMidHours,
        lateOffset: d.visionLateOffset,
    };
}

/**
 * Config VPD Targets Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's VPD Targets tab — a
 * per-stage accordion of day/night low/high VPD-optimal windows plus a
 * "Reset to defaults" button. `@property .vm: VpdTargetsTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. The shared
 * `<config-stage-accordion>` owns disclosure behavior while this tab projects
 * its VPD-specific summaries and Day/Night editor interiors.
 *
 * Threshold edits forward `{ key, period, slot, value }` (value is the raw
 * `md3-number-input` detail string); the Shell merges against the live draft.
 *
 * Tab Intents (the Shell translates them):
 *   - `toggle-stage`        detail: { key }
 *   - `update-vpd-optimal`  detail: { key, period, slot, value }
 *   - `reset-vpd-optimal`   (no detail)
 */
let ConfigVpdTargetsTab = class ConfigVpdTargetsTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    render() {
        return x `
      <div class="detail-card">
        <config-section-header .icon=${mdiTune} label="VPD Optimal Targets"></config-section-header>
        ${this._renderStages()}
        <button
          class="md3-button config-reset-button"
          @click=${() => this._emit('reset-vpd-optimal')}
          style="margin-top:12px;"
        >
          Reset to defaults
        </button>
      </div>
    `;
    }
    _renderStages() {
        const stages = this.vm.stages.map((stage) => ({
            ...stage,
            id: stage.key,
        }));
        return x `
      <config-stage-accordion
        .stages=${stages}
        @stage-accordion-toggle=${(event) => this._emit('toggle-stage', { key: event.detail.stage.id })}
      >
        ${stages.map((stage) => stage.open
            ? x `
                <div slot=${stageAccordionInteriorSlot(stage.id)} class="acc-cycle-grid">
                  ${this._cycle(stage.key, 'day', 'Day', 'var(--cycle-day, #ffeb3b)', mdiWhiteBalanceSunny, stage.day)}
                  ${this._cycle(stage.key, 'night', 'Night', 'var(--cycle-night, #7986cb)', mdiWeatherNight, stage.night)}
                </div>
              `
            : x `
                <div slot=${stageAccordionSummarySlot(stage.id)} class="acc-head-desc">
                  Day ${stage.day.low.toFixed(2)}–${stage.day.high.toFixed(2)} &nbsp;·&nbsp; Night
                  ${stage.night.low.toFixed(2)}–${stage.night.high.toFixed(2)} kPa
                </div>
              `)}
      </config-stage-accordion>
    `;
    }
    _cycle(key, period, label, color, icon, pair) {
        const onChange = (slot) => (e) => this._emit('update-vpd-optimal', { key, period, slot, value: e.detail });
        return x `
      <div>
        <div class="acc-cycle-row" style="color:${color};">
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
          ${label}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
          <md3-number-input
            label="Low (kPa)"
            .value=${pair.low}
            @change=${onChange('low')}
          ></md3-number-input>
          <md3-number-input
            label="High (kPa)"
            .value=${pair.high}
            @change=${onChange('high')}
          ></md3-number-input>
        </div>
      </div>
    `;
    }
};
ConfigVpdTargetsTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .acc-head-desc {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }
      .acc-cycle-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .acc-cycle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--font-size-supporting);
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }
      .acc-cycle-row svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigVpdTargetsTab.prototype, "vm", void 0);
ConfigVpdTargetsTab = __decorate([
    t$1('config-vpd-targets-tab')
], ConfigVpdTargetsTab);

/**
 * VPD Targets Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's VPD Targets tab — a per-stage
 * accordion of day/night low/high VPD-optimal windows. Mirrors the Humidity
 * tab's accordion shape: it projects each [[Fan VPD Stage]]'s current values
 * (the `vpdOptimalOverrides` draft slice, with the shared `VPD_OPTIMAL_STAGE_DEFAULTS`
 * fallback) plus the open-accordion flag (Shell `@state`, per the ADR-0019
 * carve-out). No hass dependency — every field is a number input.
 *
 * The stage list, labels, and defaults live in `features/environment/constants`;
 * the stage-dot colours moved here from `config-dialog.ts`.
 */
/**
 * One VPD-optimal value: the draft override if present, else the stage default.
 * The read logic the inline `_getVpdOptimalValue` helper used to own.
 */
function getVpdOptimal(overrides, key, period, slot) {
    return overrides[key]?.[period]?.[slot] ?? VPD_OPTIMAL_STAGE_DEFAULTS[key][period][slot];
}
/**
 * Pure factory: the Config Dialog SM + the Shell's open-accordion flag → one VPD
 * Targets ViewModel. No hass adapter (all number inputs). Testable with no DOM.
 */
function createVpdTargetsTabViewModel(sm, expand) {
    const overrides = sm.environmentDraft.vpdOptimalOverrides;
    return {
        stages: FAN_VPD_STAGE_KEYS.map((key) => ({
            key,
            label: FAN_VPD_STAGE_LABELS[key],
            color: FAN_VPD_STAGE_COLORS[key],
            open: expand.openStageId === key,
            day: {
                low: getVpdOptimal(overrides, key, 'day', 'low'),
                high: getVpdOptimal(overrides, key, 'day', 'high'),
            },
            night: {
                low: getVpdOptimal(overrides, key, 'night', 'low'),
                high: getVpdOptimal(overrides, key, 'night', 'high'),
            },
        })),
    };
}

/**
 * Config Tanks Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Tanks tab — the tank
 * list plus the inline add/edit form. `@property .vm: TanksTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup transcribed
 * from the former inline `_renderTanksSection`; `md3-*` / `detail-card` /
 * `row-col-grid` come from the shared `dialogStyles`.
 *
 * Tab Intents (the Shell translates them):
 *   - `add-tank-requested`    (no detail)
 *   - `edit-tank-requested`   detail: { index }
 *   - `delete-tank-requested` detail: { index }
 *   - `tank-draft-changed`    detail: { partial: Partial<TankDraftFields> }
 *   - `cancel-tank`           (no detail)
 *   - `save-tank-requested`   (no detail)
 */
let ConfigTanksTab = class ConfigTanksTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    _updateDraft(partial) {
        this._emit('tank-draft-changed', { partial });
    }
    render() {
        return x `
      <div class="detail-card">
        <config-section-header .icon=${mdiWater} label="Irrigation Tanks">
          <button
            class="md3-button tonal"
            @click=${() => this._emit('add-tank-requested')}
            style="padding:6px 12px;"
          >
            <svg
              style="width:16px;height:16px;fill:currentColor;margin-right:4px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiPlus}"></path>
            </svg>
            Add Tank
          </button>
        </config-section-header>

        ${this.vm.showEmpty
            ? x `<div style="font-size:1rem;color:var(--secondary-text-color);padding:8px 0;">
              No tanks configured.
            </div>`
            : E}

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${this.vm.tanks.map((tank) => this._renderRow(tank))}
        </div>

        ${this.vm.editing ? this._renderForm(this.vm.editing) : E}
      </div>
    `;
    }
    _renderRow(tank) {
        return x `
      <div
        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:10px 12px;border-radius:8px;"
      >
        <div style="min-width:0;">
          <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${tank.displayName}
          </div>
          <div
            style="font-size:0.857143rem;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title=${tank.sensorEntity}
          >
            ${tank.sensorEntity}
            ${tank.volumeLiters != null ? x ` · ${tank.volumeLiters} L` : E} · warn at
            ${tank.warningLevel}%
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button
            class="md3-button text"
            @click=${() => this._emit('edit-tank-requested', { index: tank.index })}
            style="padding:6px;"
            aria-label=${`Edit ${tank.displayName}`}
            title=${`Edit ${tank.displayName}`}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
          <button
            class="md3-button text danger"
            @click=${() => this._emit('delete-tank-requested', { index: tank.index })}
            style="padding:6px;"
            aria-label=${`Delete ${tank.displayName}`}
            title=${`Delete ${tank.displayName}`}
          >
            <svg
              style="width:18px;height:18px;fill:currentColor;"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="${mdiDelete}"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    }
    _renderForm(draft) {
        return x `
      <div
        style="margin-top:12px;background:rgba(255,255,255,0.04);border:1px solid var(--divider-color,rgba(255,255,255,0.15));border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;"
      >
        <gm-entity-picker
          label="Sensor Entity *"
          .value=${draft.sensorEntity}
          .options=${this.vm.sensorOptions}
          @entity-picked=${(e) => this._updateDraft({ sensorEntity: e.detail })}
        ></gm-entity-picker>
        <div class="md3-input-group">
          <label class="md3-label">Name</label>
          <input
            class="md3-input"
            type="text"
            .value=${draft.name}
            @input=${(e) => this._updateDraft({ name: e.target.value })}
            placeholder="e.g. Main Tank"
          />
        </div>
        <div class="row-col-grid">
          <div class="md3-input-group">
            <label class="md3-label">Volume (L, optional)</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              step="0.1"
              .value=${draft.volumeLiters != null ? String(draft.volumeLiters) : ''}
              @input=${(e) => {
            const v = e.target.value;
            this._updateDraft({ volumeLiters: v === '' ? null : parseFloat(v) });
        }}
              placeholder="e.g. 100"
            />
          </div>
          <div class="md3-input-group">
            <label class="md3-label">Warning Level (%)</label>
            <input
              class="md3-input"
              type="number"
              min="0"
              max="100"
              step="1"
              .value=${String(draft.warningLevel)}
              @input=${(e) => this._updateDraft({
            warningLevel: parseFloat(e.target.value) || 30,
        })}
            />
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
          <button class="md3-button tonal" @click=${() => this._emit('cancel-tank')}>Cancel</button>
          <button class="md3-button primary" @click=${() => this._emit('save-tank-requested')}>
            Save Tank
          </button>
        </div>
      </div>
    `;
    }
};
ConfigTanksTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigTanksTab.prototype, "vm", void 0);
ConfigTanksTab = __decorate([
    t$1('config-tanks-tab')
], ConfigTanksTab);

/**
 * Tanks Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Tanks tab — the list of
 * configured irrigation tanks plus the inline add/edit form. This tab is a
 * **hybrid**: the tank *list* lives in `environmentDraft.irrigationTanks` (so a
 * saved tab rides the [[Environment Change]] like the env-cluster tabs),
 * while the inline-edit *draft* is its own `tabs.tanks.sub` SM sub-state
 * (`idle | adding | editing`, like the Notifications tab). The VM projects both:
 * the formatted rows from the env draft, and the open editor from the sub-state.
 * `entityOptions` is the injected hass adapter for the sensor picker.
 *
 * (Distinct from the Irrigation *dialog*'s `<irrigation-tanks-tab>`, which edits
 * live Tank Levels via the Irrigation slice — see CONTEXT.md "Tank Config vs
 * Tank Levels". This one edits Tank Config in the config dialog's env draft.)
 */
/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Tanks tab
 * ViewModel. Testable with no DOM and no host.
 */
function createTanksTabViewModel(sm, deps) {
    const tanks = sm.environmentDraft.irrigationTanks;
    const sub = sm.tabs.tanks.sub;
    const editing = sub.kind === 'adding' || sub.kind === 'editing'
        ? {
            sensorEntity: sub.sensorEntity,
            name: sub.name,
            volumeLiters: sub.volumeLiters,
            warningLevel: sub.warningLevel,
        }
        : null;
    return {
        tanks: tanks.map((t, i) => ({
            index: i,
            displayName: t.name || `Tank ${i + 1}`,
            sensorEntity: t.sensorEntity,
            volumeLiters: t.volumeLiters ?? null,
            warningLevel: t.warningLevel ?? 30,
        })),
        editing,
        sensorOptions: deps.entityOptions(['sensor', 'input_number'], null),
        showEmpty: tanks.length === 0 && sub.kind === 'idle',
    };
}

/**
 * Config Growspaces Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Growspaces tab — a
 * master/detail collection-CRUD view. `@property .vm: GrowspacesTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup + `cfg-*`
 * master/detail styles transcribed from the former inline `_renderGrowspacesSection`
 * / `_renderAddGrowspaceForm` / `_renderEditGrowspaceForm`.
 *
 * **No Save/Delete/Cancel here** — those buttons live in the Dialog Shell footer.
 * The component emits only navigation + draft-edit intents.
 *
 * Tab Intents (the Shell translates them):
 *   - `select-growspace`     detail: { id }   (master row click; '' clears)
 *   - `start-add-growspace`  (no detail)
 *   - `add-draft-changed`    detail: { partial: Partial<GrowspaceDraft> }
 *   - `edit-draft-changed`   detail: { partial: Partial<GrowspaceDraft> }
 *   - `env-draft-changed`    detail: { partial }   (edit-form lung-room/camera pickers)
 *   - `remove-environment-requested` detail: { sensorCount, controllerCount }
 */
let ConfigGrowspacesTab = class ConfigGrowspacesTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    render() {
        const state = this.vm.state;
        if (state.mode === 'confirm-delete') {
            return x `
        <div class="cfg-master-detail" style="grid-template-columns:1fr;">
          <div class="detail-card" style="text-align:center;padding:40px 20px;">
            <h3 style="color:var(--error-color,#f44336);">Delete Growspace?</h3>
            <p style="margin-bottom:30px;color:var(--secondary-text-color);">
              Are you sure you want to delete "<strong>${state.name}</strong>"?<br />
              This will remove all associated plants and history.<br />
              This action cannot be undone.
            </p>
          </div>
        </div>
      `;
        }
        if (state.mode === 'confirm-remove-environment') {
            const sensorLabel = state.sensorCount === 1 ? 'sensor' : 'sensors';
            const controllerLabel = state.controllerCount === 1 ? 'controller' : 'controllers';
            return x `
        <div class="cfg-master-detail" style="grid-template-columns:1fr;">
          <div class="detail-card remove-environment-confirm" role="status" aria-live="polite">
            <h3>Remove environment from ${state.name}?</h3>
            <p>
              This will disconnect <strong>${state.sensorCount} ${sensorLabel}</strong> and
              <strong>${state.controllerCount} ${controllerLabel}</strong> from this growspace.
            </p>
            <p>
              Camera, tank, spatial, threshold, and automation settings will also be cleared. This
              action cannot be undone.
            </p>
            ${state.removing ? x `<p>Removing environment…</p>` : E}
          </div>
        </div>
      `;
        }
        return x `
      <div class="cfg-master-detail">
        <div class="cfg-master-list">
          <div
            style="font-size:0.785714rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-text-color,rgba(255,255,255,0.5));padding:0 4px 8px;"
          >
            All Growspaces
          </div>
          ${this.vm.growspaces.map((gs) => x `
              <div
                class="cfg-gs-row ${gs.active ? 'active' : ''}"
                @click=${() => this._emit('select-growspace', { id: gs.id })}
              >
                <span class="gs-name">${gs.name}</span>
              </div>
            `)}
          <button class="cfg-master-add-btn" @click=${() => this._emit('start-add-growspace')}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPlus}"></path>
            </svg>
            Add Growspace
          </button>
        </div>

        <div class="cfg-detail-pane">
          ${state.mode === 'adding'
            ? this._renderForm('add', 'New Growspace', state.draft)
            : E}
          ${state.mode === 'editing'
            ? x `${this._renderForm('edit', 'Edit Details', state.draft, state.lungroom, state.camera, state.removalImpact)}`
            : E}
          ${state.mode === 'idle'
            ? x `
                <div style="text-align:center;padding:40px 20px;color:var(--secondary-text-color);">
                  Select a growspace to edit, or click "Add Growspace" to create a new one.
                </div>
              `
            : E}
        </div>
      </div>
    `;
    }
    _renderForm(which, heading, draft, lungroom, camera, removalImpact) {
        const intent = which === 'add' ? 'add-draft-changed' : 'edit-draft-changed';
        const update = (partial) => this._emit(intent, { partial });
        return x `
      <div class="detail-card">
        <h3>${heading}</h3>
        <md3-text-input
          label="Growspace Name"
          .value=${draft.name}
          @change=${(e) => update({ name: e.detail })}
        ></md3-text-input>
        <div class="row-col-grid">
          <md3-number-input
            label="Rows"
            .value=${draft.rows}
            @change=${(e) => update({ rows: parseInt(e.detail) })}
          ></md3-number-input>
          <md3-number-input
            label="Plants per Row"
            .value=${draft.plantsPerRow}
            @change=${(e) => update({ plantsPerRow: parseInt(e.detail) })}
          ></md3-number-input>
        </div>
        <div class="md3-input-group">
          <label class="md3-label">Notification Service (Mobile App)</label>
          <select
            class="md3-input"
            .value=${draft.notificationService}
            @change=${(e) => update({ notificationService: e.target.value })}
          >
            <option value="">None</option>
            ${this.vm.notifyServices.map((s) => x `
                <option value="${s.value}" ?selected=${draft.notificationService === s.value}>
                  ${s.label}
                </option>
              `)}
          </select>
        </div>
        ${lungroom
            ? this._multiSelect('Lung Room Temp Sensors', 'lungroomTempSensors', lungroom)
            : E}
        ${camera ? this._multiSelect('Area Camera', 'cameraEntities', camera) : E}
      </div>
      ${which === 'edit' && removalImpact
            ? x `
            <section class="danger-zone" aria-labelledby="environment-danger-zone-title">
              <h3 id="environment-danger-zone-title" class="danger-zone-heading">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d=${mdiAlertOutline}></path>
                </svg>
                Danger zone
              </h3>
              <p>
                Remove every environmental assignment and controller configuration from this
                growspace. Plants and growspace history are not deleted.
              </p>
              <button
                type="button"
                class="md3-button danger"
                @click=${() => this._emit('remove-environment-requested', removalImpact)}
              >
                Remove Environment
              </button>
            </section>
          `
            : E}
    `;
    }
    _multiSelect(label, key, field) {
        const values = field.value;
        const emit = (partial) => this._emit('env-draft-changed', { partial });
        return x `
      <config-entity-multi-select
        .label=${label}
        .values=${values}
        .options=${field.options}
        @entity-values-changed=${(event) => emit({ [key]: event.detail.values })}
      ></config-entity-multi-select>
    `;
    }
};
ConfigGrowspacesTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
      .cfg-master-detail {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .cfg-master-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        padding-right: 2px;
        scrollbar-width: thin;
      }
      .cfg-gs-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 1rem;
      }
      .cfg-gs-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }
      .cfg-gs-row.active {
        background: rgba(76, 175, 80, 0.08);
        border-color: rgba(76, 175, 80, 0.25);
      }
      .cfg-gs-row .gs-name {
        flex: 1;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cfg-master-add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 38px;
        margin-top: 8px;
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 8px;
        background: transparent;
        color: var(--primary-color, #4caf50);
        font-family: inherit;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        width: 100%;
      }
      .cfg-master-add-btn:hover {
        background: rgba(76, 175, 80, 0.06);
        border-color: var(--primary-color, #4caf50);
      }
      .cfg-detail-pane {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-right: 2px;
        scrollbar-width: thin;
      }
      @media (max-width: 600px) {
        .cfg-master-detail {
          grid-template-columns: 1fr;
        }
      }
      .danger-zone {
        margin-top: auto;
        padding: 16px;
        border: 1px solid color-mix(in srgb, var(--error-color, #f44336) 35%, transparent);
        border-radius: 12px;
        background: color-mix(in srgb, var(--error-color, #f44336) 6%, transparent);
      }
      .danger-zone-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 8px;
        color: var(--error-color, #f44336);
        font-size: 1.142857rem;
        font-weight: 600;
      }
      .danger-zone-heading svg {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
        fill: currentColor;
      }
      .danger-zone p {
        max-width: 65ch;
        margin: 0 0 16px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 1rem;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      .danger-zone .md3-button {
        min-height: 44px;
      }
      .remove-environment-confirm {
        padding: 40px 20px;
        text-align: center;
      }
      .remove-environment-confirm h3 {
        color: var(--error-color, #f44336);
      }
      .remove-environment-confirm p {
        max-width: 65ch;
        margin: 0 auto 12px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigGrowspacesTab.prototype, "vm", void 0);
ConfigGrowspacesTab = __decorate([
    t$1('config-growspaces-tab')
], ConfigGrowspacesTab);

/**
 * Growspaces Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Growspaces tab — a master/detail
 * collection-CRUD view: the list of growspaces (master) and an add/edit form or
 * a confirm-delete message (detail), driven by the `tabs.growspaces.sub` SM
 * sub-state (`idle | adding | editing | confirm-delete`). Like the Tanks tab this
 * is a hybrid — the *editing* detail form also edits two env-draft multi-selects
 * (lung-room temp + area camera) — but the growspace identity drafts live in the
 * sub-state.
 *
 * **All action buttons (Save / Delete / Cancel / confirm Yes-No) live in the
 * Dialog Shell footer, not here.** So the component emits only navigation +
 * draft-edit intents; the footer (driven by `_submitGrowspaceAndEnv` /
 * `_confirmDeleteGrowspace` / …) owns the writes.
 *
 * The master list (`growspaceOptions`) and the mobile-notify service list are
 * hass/host-derived and injected; `entityOptions` backs the edit form's pickers.
 */
function draftOf(sub) {
    return {
        name: sub.name,
        rows: sub.rows,
        plantsPerRow: sub.plantsPerRow,
        notificationService: sub.notificationService,
    };
}
function addConfigured(target, values) {
    for (const value of values) {
        if (value)
            target.add(value);
    }
}
/** Count the unique entity assignments that a whole-environment reset disconnects. */
function environmentRemovalImpact(draft) {
    const sensors = new Set();
    addConfigured(sensors, [
        ...draft.temperatureSensors,
        ...draft.humiditySensors,
        ...draft.vpdSensors,
        draft.co2Sensor,
        ...draft.lightSensors,
        draft.soilMoistureSensor,
        ...draft.substrateTemperatureSensors,
        ...draft.phSensors,
        ...draft.feedEcSensors,
        ...draft.bulkEcSensors,
        ...draft.poreEcSensors,
        ...draft.runoffEcSensors,
        ...draft.drainVolumeSensors,
        ...draft.irrigationFlowSensors,
        ...draft.powerSensors,
        ...draft.energySensors,
        ...draft.lungroomTempSensors,
        ...draft.irrigationTanks.map((tank) => tank.sensorEntity),
    ]);
    const controllers = new Set();
    addConfigured(controllers, [
        ...draft.exhaustFanEntities,
        ...draft.circulationFanEntities,
        ...draft.humidifierEntities,
        ...draft.dehumidifierEntities,
        ...draft.growlightEntities,
        ...draft.exhaustFanAcInfinityDevices.map((device) => device.mode_entity),
        ...draft.circulationFanAcInfinityDevices.map((device) => device.mode_entity),
        ...draft.humidifierAcInfinityDevices.map((device) => device.mode_entity),
        ...draft.dehumidifierAcInfinityDevices.map((device) => device.mode_entity),
        ...draft.growlightAcInfinityDevices.map((device) => device.mode_entity),
    ]);
    return { sensorCount: sensors.size, controllerCount: controllers.size };
}
function editingSub(sub) {
    if (sub.kind === 'editing')
        return sub;
    if (sub.kind === 'confirm-remove-environment' || sub.kind === 'removing-environment') {
        return sub.editing;
    }
    return undefined;
}
/**
 * Pure factory: the Config Dialog SM + injected adapters → one Growspaces tab
 * ViewModel. Testable with no DOM and no host.
 */
function createGrowspacesTabViewModel(sm, deps) {
    const sub = sm.tabs.growspaces.sub;
    const editing = editingSub(sub);
    const editingId = editing?.growspaceId ?? '';
    const isAdding = sub.kind === 'adding';
    const growspaces = Object.entries(deps.growspaceOptions).map(([id, name]) => ({
        id,
        name,
        active: editingId === id && !isAdding,
    }));
    let state;
    if (sub.kind === 'confirm-delete') {
        state = { mode: 'confirm-delete', name: sub.name };
    }
    else if (sub.kind === 'adding') {
        state = { mode: 'adding', draft: draftOf(sub) };
    }
    else if (sub.kind === 'confirm-remove-environment' || sub.kind === 'removing-environment') {
        state = {
            mode: 'confirm-remove-environment',
            name: sub.editing.name,
            sensorCount: sub.sensorCount,
            controllerCount: sub.controllerCount,
            removing: sub.kind === 'removing-environment',
        };
    }
    else if (sub.kind === 'editing') {
        const d = sm.environmentDraft;
        state = {
            mode: 'editing',
            id: sub.growspaceId,
            draft: draftOf(sub),
            lungroom: {
                value: d.lungroomTempSensors,
                options: deps.entityOptions(['sensor', 'input_number'], 'temperature'),
            },
            camera: { value: d.cameraEntities, options: deps.entityOptions(['camera'], null) },
            removalImpact: environmentRemovalImpact(d),
        };
    }
    else {
        state = { mode: 'idle' };
    }
    return { growspaces, state, notifyServices: deps.notifyServices };
}

/**
 * Config Heatmap Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's 3D-Heatmap tab — the
 * sensor-group list. `@property .vm: HeatmapTabViewModel` in, semantic Tab
 * Intents out, **no `@state()` and no `hass`**. Markup transcribed from the
 * former inline `_renderHeatmapSection`. The group editor itself is the Shell's
 * `<sensor-group-dialog>` modal, not part of this tab.
 *
 * Tab Intents (the Shell translates them):
 *   - `add-group-requested`    (no detail)
 *   - `edit-group-requested`   detail: { group }
 *   - `delete-group-requested` detail: { id }
 */
let ConfigHeatmapTab = class ConfigHeatmapTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    render() {
        return x `
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <h3>Sensor Groups</h3>
          <button class="md3-button tonal" @click=${() => this._emit('add-group-requested')}>
            Add Group
          </button>
        </div>
        ${this.vm.showEmpty
            ? x `<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
              No sensor groups configured.
            </div>`
            : x `
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${this.vm.groups.map((group) => this._renderGroup(group))}
              </div>
            `}
      </div>
    `;
    }
    _renderGroup(group) {
        return x `
      <div
        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
      >
        <div>
          <div style="font-weight:500;">${group.name}</div>
          <div style="font-size:var(--font-size-supporting);color:var(--secondary-text-color);">
            X: ${group.x}, Y: ${group.y}, Z: ${group.z}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button
            class="md3-button text"
            @click=${() => this._emit('edit-group-requested', { group })}
            style="padding:8px;"
            aria-label=${`Edit ${group.name}`}
            title=${`Edit ${group.name}`}
          >
            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
          <button
            class="md3-button text danger"
            @click=${() => this._emit('delete-group-requested', { id: group.id })}
            style="padding:8px;"
            aria-label=${`Delete ${group.name}`}
            title=${`Delete ${group.name}`}
          >
            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDelete}"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    }
};
ConfigHeatmapTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigHeatmapTab.prototype, "vm", void 0);
ConfigHeatmapTab = __decorate([
    t$1('config-heatmap-tab')
], ConfigHeatmapTab);

/**
 * Heatmap Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's 3D-Heatmap tab — the list of
 * sensor groups for the spatial heatmap. The group *list* lives in
 * `environmentDraft.sensorGroups` (so add/delete ride the [[Environment Save
 * Composer]] via `UPDATE_ENV_DRAFT`); the actual group *editing* happens in the
 * separate `<sensor-group-dialog>` modal the Dialog Shell renders on the
 * `heatmap.sub` = `editing-group` SM sub-state — not in this tab. So this VM only
 * projects the list, and the component only navigates (add/edit/delete intents).
 */
/**
 * Pure factory: the Config Dialog SM → one Heatmap tab ViewModel. No hass
 * dependency. Testable with no DOM and no host.
 */
function createHeatmapTabViewModel(sm) {
    const groups = sm.environmentDraft.sensorGroups;
    return { groups, showEmpty: groups.length === 0 };
}

/**
 * Config Subareas Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Subareas tab — the
 * subarea list, an inline add form, and a per-row confirm-delete.
 * `@property .vm: SubareasTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` and no `hass`**. Markup transcribed from the former inline
 * `_renderSubareasSection`. The sensor-assignment editor itself is the Shell's
 * `<subarea-config-dialog>` modal, not part of this tab.
 *
 * Tab Intents (the Shell translates them):
 *   - `add-subarea-requested`     (no detail)
 *   - `subarea-name-changed`      detail: { name }
 *   - `commit-add-subarea`        (no detail; Add button or Enter)
 *   - `cancel-add-subarea`        (no detail)
 *   - `edit-subarea-requested`    detail: { subarea }
 *   - `delete-subarea-requested`  detail: { id }
 *   - `confirm-delete-subarea`    detail: { id }
 *   - `cancel-delete-subarea`     (no detail)
 */
let ConfigSubareasTab = class ConfigSubareasTab extends i$2 {
    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    render() {
        if (!this.vm.hasGrowspace) {
            return x `
        <div class="detail-card">
          <h3>Subareas</h3>
          <div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
            Select a growspace in the Sensors tab first.
          </div>
        </div>
      `;
        }
        return x `
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <h3 style="margin:0;">Subareas</h3>
          <button class="md3-button tonal" @click=${() => this._emit('add-subarea-requested')}>
            <svg
              style="width:18px;height:18px;fill:currentColor;margin-right:6px;"
              viewBox="0 0 24 24"
            >
              <path d="${mdiPlus}"></path>
            </svg>
            Add Subarea
          </button>
        </div>

        ${this.vm.adding ? this._renderAddForm(this.vm.adding.name) : E}
        ${this.vm.loading
            ? x `<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
              Loading...
            </div>`
            : this.vm.showEmpty
                ? x `<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
                No subareas configured. Add one to get started.
              </div>`
                : x `
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${this.vm.subareas.map((row) => this._renderRow(row))}
                </div>
              `}
      </div>
    `;
    }
    _renderAddForm(name) {
        return x `
      <div
        style="display:flex;gap:8px;align-items:center;margin-bottom:16px;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
      >
        <input
          class="md3-input"
          style="flex:1;"
          placeholder="Subarea name..."
          .value=${name}
          @input=${(e) => this._emit('subarea-name-changed', { name: e.target.value })}
          @keydown=${(e) => {
            if (e.key === 'Enter')
                this._emit('commit-add-subarea');
        }}
        />
        <button
          class="md3-button primary"
          @click=${() => this._emit('commit-add-subarea')}
          ?disabled=${!name.trim()}
        >
          Add
        </button>
        <button class="md3-button tonal" @click=${() => this._emit('cancel-add-subarea')}>
          Cancel
        </button>
      </div>
    `;
    }
    _renderRow(row) {
        const subarea = row.subarea;
        return x `
      <div
        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
      >
        <div>
          <div style="font-weight:500;">${subarea.name}</div>
          <div style="font-size:var(--font-size-supporting);color:var(--secondary-text-color);">
            ID: ${subarea.id}
          </div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;">
          ${row.confirmingDelete
            ? x `
                <span style="font-size:1rem;color:var(--secondary-text-color);margin-right:4px;"
                  >Remove ${subarea.name}?</span
                >
                <button
                  class="md3-button danger"
                  @click=${() => this._emit('confirm-delete-subarea', { id: subarea.id })}
                  style="padding:6px 10px;font-size:var(--font-size-supporting);"
                >
                  Yes
                </button>
                <button
                  class="md3-button tonal"
                  @click=${() => this._emit('cancel-delete-subarea')}
                  style="padding:6px 10px;font-size:var(--font-size-supporting);"
                >
                  No
                </button>
              `
            : x `
                <button
                  class="md3-button text"
                  @click=${() => this._emit('edit-subarea-requested', { subarea })}
                  style="padding:8px;"
                  aria-label=${`Edit sensors for ${subarea.name}`}
                  title="Edit sensors"
                >
                  <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiPencil}"></path>
                  </svg>
                </button>
                <button
                  class="md3-button text danger"
                  @click=${() => this._emit('delete-subarea-requested', { id: subarea.id })}
                  style="padding:8px;"
                  aria-label=${`Delete ${subarea.name}`}
                  title="Delete subarea"
                >
                  <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                    <path d="${mdiDelete}"></path>
                  </svg>
                </button>
              `}
        </div>
      </div>
    `;
    }
};
ConfigSubareasTab.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }
    `,
];
__decorate([
    n({ attribute: false })
], ConfigSubareasTab.prototype, "vm", void 0);
ConfigSubareasTab = __decorate([
    t$1('config-subareas-tab')
], ConfigSubareasTab);

/**
 * Subareas Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Subareas tab — the list of a
 * growspace's subareas with an inline add form and a per-row confirm-delete.
 * Unlike the env tabs, the subarea *list* is not in the SM or the env draft: it
 * is fetched (`getSubareas`) into the dialog's `_subareas` `@state`, so the list
 * + loading flag are **injected** here. The add/delete navigation is the
 * `tabs.subareas.sub` SM sub-state; the actual backend CRUD (`addSubarea` /
 * `removeSubarea`) and the `<subarea-config-dialog>` edit modal stay in the Shell.
 *
 * The tab needs a selected growspace (env draft, or the Growspaces tab's editing
 * id); when there is none it shows a "select a growspace first" hint.
 */
/**
 * Pure factory: the Config Dialog SM + the injected list/loading → one Subareas
 * tab ViewModel. Testable with no DOM and no host.
 */
function createSubareasTabViewModel(sm, deps) {
    const envId = sm.environmentDraft.selectedGrowspaceId;
    const gsSub = sm.tabs.growspaces.sub;
    const growspaceId = envId || (gsSub.kind === 'editing' ? gsSub.growspaceId : '');
    const sub = sm.tabs.subareas.sub;
    const adding = sub.kind === 'adding' ? { name: sub.name } : null;
    const confirmId = sub.kind === 'confirm-delete' ? sub.subareaId : null;
    return {
        hasGrowspace: Boolean(growspaceId),
        adding,
        loading: deps.loading,
        subareas: deps.subareas.map((subarea) => ({
            subarea,
            confirmingDelete: confirmId === subarea.id,
        })),
        showEmpty: !deps.loading && deps.subareas.length === 0,
    };
}

/**
 * Shared Config Dialog capabilities (ADR-0019).
 *
 * Cross-tab save gates belong here so the shell's affordances and submit paths
 * consume the same derivation instead of rebuilding policy independently.
 */
/** Derive the Config Dialog's cross-tab Environment Change capabilities once. */
function deriveConfigDialogCapabilities(draft, dirty = new Set()) {
    const verdict = environmentChangeVerdict({
        kind: 'shared-environment-draft',
        draft,
        dirty,
    });
    return verdict.ok
        ? { canSaveEnvironment: true, environmentSaveBlockReason: null }
        : { canSaveEnvironment: false, environmentSaveBlockReason: verdict.reason };
}

/** The env-draft AC Infinity bundle fields a Port Pre-fill pick can target. */
const AC_INFINITY_BUNDLE_FIELDS = [
    'exhaustFanAcInfinityDevices',
    'circulationFanAcInfinityDevices',
    'humidifierAcInfinityDevices',
    'dehumidifierAcInfinityDevices',
    'growlightAcInfinityDevices',
];
const ENVIRONMENT_SAVE_TABS = new Set([
    ConfigTab.SENSORS,
    ConfigTab.CLIMATE,
    ConfigTab.GROWLIGHT,
    ConfigTab.HUMIDITY,
    ConfigTab.IRRIGATION,
    ConfigTab.TANKS,
    ConfigTab.HEATMAP,
    ConfigTab.VPD_TARGETS,
]);
let ConfigDialog = class ConfigDialog extends i$2 {
    constructor() {
        super(...arguments);
        this.open = false;
        this.growspaceOptions = {};
        this.devices = [];
        this.initialTab = ConfigTab.GROWSPACES;
        /** The growspace to configure. Resolved from `devices` and seeded once per open. */
        this.growspaceId = '';
        // ── Single SM ────────────────────────────────────────────────────────────
        this._sm = createInitialSM();
        // ── Async subarea state (outside SM — network dependent) ─────────────────
        this._subareas = [];
        this._subareasLoading = false;
        this._subareasGrowspaceId = '';
        // ── Humidity accordion (pure UI ephemeral state) ──────────────────────────
        this._openHumidityStageId = '';
        // ── VPD targets accordion (pure UI ephemeral state) ───────────────────────
        this._openVpdStageId = '';
        this._initialStateApplied = false;
        this._entityOptionsCache = new Map();
        /** Environment tabs share one draft, so corrective navigation must preserve it. */
        this._goToSensors = () => {
            this._t({ type: 'SWITCH_TAB', tab: ConfigTab.SENSORS });
        };
        this._close = () => {
            const { heatmap, subareas } = this._sm.tabs;
            if (heatmap.sub.kind === 'editing-group' || subareas.sub.kind === 'editing-subarea')
                return;
            const device = this._deviceForDirtyCheck();
            if (device && isActiveTabDirty(this._sm, device)) {
                this._t({ type: 'REQUEST_CLOSE' });
                return;
            }
            this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        };
        this._onDialogCancel = (event) => {
            if (!this.open)
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this._close();
        };
        // ── Port Pre-fill (ADR-0028) ─────────────────────────────────────────────
        /**
         * Roles the last device pick failed to resolve, keyed `${field}:${index}`.
         * Ephemeral UI state — never part of the env draft (no seeder). A pick sets
         * one key; any manual write to that field clears the whole field's keys.
         */
        this._acInfinityPrefillWarnings = {};
        this._cancelDiscard = () => {
            this._t({ type: 'CANCEL_TAB_SWITCH' });
        };
        this._confirmDiscard = () => {
            const { status } = this._sm;
            if (status.kind !== 'confirm-discard')
                return;
            if ('pendingTab' in status) {
                const device = this._deviceForDirtyCheck();
                if (!device)
                    return;
                const pendingTab = status.pendingTab;
                this._sm = discardAndSwitch(this._sm, device);
                if (pendingTab === ConfigTab.SUBAREAS)
                    this._loadSubareas();
                return;
            }
            if (status.pendingAction === 'change-growspace') {
                this._sm = { ...this._sm, status: { kind: 'idle' } };
                this._applyEnvGrowspaceChange(status.growspaceId);
                return;
            }
            this._sm = { ...this._sm, status: { kind: 'idle' } };
            this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        };
        this._openClimateStageVpdId = '';
    }
    disconnectedCallback() {
        this._cancelGuardTarget?.removeEventListener('cancel', this._onDialogCancel, true);
        this._cancelGuardTarget = undefined;
        super.disconnectedCallback();
    }
    /** Convenience: dispatch a SM transition and assign the result. */
    _t(event) {
        this._sm = transition(this._sm, event);
    }
    get currentTab() {
        return this._sm.activeTab;
    }
    set currentTab(tab) {
        this._sm = { ...this._sm, activeTab: tab };
    }
    get _caps() {
        return deriveConfigDialogCapabilities(this._sm.environmentDraft, this._sm.environmentDirty);
    }
    _localize(key) {
        return localize(key, '', '', this.hass?.language ?? 'en');
    }
    _environmentSaveBlockedMessage(reason) {
        return this._localize(`config.environment_requires_${reason.replaceAll('-', '_')}`);
    }
    // ── Legacy state accessors (delegate to SM) ───────────────────────────────
    // These allow existing tests and external callers to read/write state
    // through familiar names. The SM is the authoritative source of truth.
    get _d() {
        return this._sm.environmentDraft;
    }
    _setEnv(partial) {
        this._sm = transition(this._sm, { type: 'UPDATE_ENV_DRAFT', partial });
        // A manual write to an AC Infinity bundle invalidates that field's Port
        // Pre-fill warnings (the pick path re-sets its own key afterwards).
        for (const field of AC_INFINITY_BUNDLE_FIELDS) {
            if (field in partial)
                this._acInfinityPrefillWarnings = this._clearedPrefillWarnings(field);
        }
    }
    get envSelectedId() {
        return this._d.selectedGrowspaceId;
    }
    set envSelectedId(v) {
        this._setEnv({ selectedGrowspaceId: v });
    }
    get envTemperatureSensors() {
        return this._d.temperatureSensors;
    }
    set envTemperatureSensors(v) {
        this._setEnv({ temperatureSensors: v });
    }
    get envHumiditySensors() {
        return this._d.humiditySensors;
    }
    set envHumiditySensors(v) {
        this._setEnv({ humiditySensors: v });
    }
    get envVpdSensors() {
        return this._d.vpdSensors;
    }
    set envVpdSensors(v) {
        this._setEnv({ vpdSensors: v });
    }
    get envCo2Sensor() {
        return this._d.co2Sensor;
    }
    set envCo2Sensor(v) {
        this._setEnv({ co2Sensor: v });
    }
    get envLightSensors() {
        return this._d.lightSensors;
    }
    set envLightSensors(v) {
        this._setEnv({ lightSensors: v });
    }
    get envExhaustFanEntities() {
        return this._d.exhaustFanEntities;
    }
    set envExhaustFanEntities(v) {
        this._setEnv({ exhaustFanEntities: v });
    }
    get envCirculationFanEntities() {
        return this._d.circulationFanEntities;
    }
    set envCirculationFanEntities(v) {
        this._setEnv({ circulationFanEntities: v });
    }
    get envHumidifierEntities() {
        return this._d.humidifierEntities;
    }
    set envHumidifierEntities(v) {
        this._setEnv({ humidifierEntities: v });
    }
    get envDehumidifierEntities() {
        return this._d.dehumidifierEntities;
    }
    set envDehumidifierEntities(v) {
        this._setEnv({ dehumidifierEntities: v });
    }
    get envSoilMoistureSensor() {
        return this._d.soilMoistureSensor;
    }
    set envSoilMoistureSensor(v) {
        this._setEnv({ soilMoistureSensor: v });
    }
    get envDehumidifierControlEnabled() {
        return this._d.dehumidifierControlEnabled;
    }
    set envDehumidifierControlEnabled(v) {
        this._setEnv({ dehumidifierControlEnabled: v });
    }
    get envHumidifierControlEnabled() {
        return this._d.humidifierControlEnabled;
    }
    set envHumidifierControlEnabled(v) {
        this._setEnv({ humidifierControlEnabled: v });
    }
    get envDehumidifierThresholds() {
        return this._d.dehumidifierThresholds;
    }
    set envDehumidifierThresholds(v) {
        this._setEnv({ dehumidifierThresholds: v });
    }
    get envHumidifierThresholds() {
        return this._d.humidifierThresholds;
    }
    set envHumidifierThresholds(v) {
        this._setEnv({ humidifierThresholds: v });
    }
    get envStressThreshold() {
        return this._d.stressThreshold;
    }
    set envStressThreshold(v) {
        this._setEnv({ stressThreshold: v });
    }
    get envMoldThreshold() {
        return this._d.moldThreshold;
    }
    set envMoldThreshold(v) {
        this._setEnv({ moldThreshold: v });
    }
    get envSensorGroups() {
        return this._d.sensorGroups;
    }
    set envSensorGroups(v) {
        this._setEnv({ sensorGroups: v });
    }
    get envSensorCoordinates() {
        return this._d.sensorCoordinates;
    }
    set envSensorCoordinates(v) {
        this._setEnv({ sensorCoordinates: v });
    }
    get envIrrigationTanks() {
        return this._d.irrigationTanks;
    }
    set envIrrigationTanks(v) {
        this._setEnv({ irrigationTanks: v });
    }
    get envVisionCameraEntities() {
        return this._d.cameraEntities;
    }
    set envVisionCameraEntities(v) {
        this._setEnv({ cameraEntities: v });
    }
    get envLungroomTempSensors() {
        return this._d.lungroomTempSensors;
    }
    set envLungroomTempSensors(v) {
        this._setEnv({ lungroomTempSensors: v });
    }
    get envSubstrateTemperatureSensors() {
        return this._d.substrateTemperatureSensors;
    }
    set envSubstrateTemperatureSensors(v) {
        this._setEnv({ substrateTemperatureSensors: v });
    }
    get envPhSensors() {
        return this._d.phSensors;
    }
    set envPhSensors(v) {
        this._setEnv({ phSensors: v });
    }
    get envFeedEcSensors() {
        return this._d.feedEcSensors;
    }
    set envFeedEcSensors(v) {
        this._setEnv({ feedEcSensors: v });
    }
    get envBulkEcSensors() {
        return this._d.bulkEcSensors;
    }
    set envBulkEcSensors(v) {
        this._setEnv({ bulkEcSensors: v });
    }
    get envPoreEcSensors() {
        return this._d.poreEcSensors;
    }
    set envPoreEcSensors(v) {
        this._setEnv({ poreEcSensors: v });
    }
    get envRunoffEcSensors() {
        return this._d.runoffEcSensors;
    }
    set envRunoffEcSensors(v) {
        this._setEnv({ runoffEcSensors: v });
    }
    get envDrainVolumeSensors() {
        return this._d.drainVolumeSensors;
    }
    set envDrainVolumeSensors(v) {
        this._setEnv({ drainVolumeSensors: v });
    }
    get envIrrigationFlowSensors() {
        return this._d.irrigationFlowSensors;
    }
    set envIrrigationFlowSensors(v) {
        this._setEnv({ irrigationFlowSensors: v });
    }
    get envPowerSensors() {
        return this._d.powerSensors;
    }
    set envPowerSensors(v) {
        this._setEnv({ powerSensors: v });
    }
    get envEnergySensors() {
        return this._d.energySensors;
    }
    set envEnergySensors(v) {
        this._setEnv({ energySensors: v });
    }
    get envVisionEnabled() {
        return this._d.visionEnabled;
    }
    set envVisionEnabled(v) {
        this._setEnv({ visionEnabled: v });
    }
    get envVisionEarlyOffset() {
        return this._d.visionEarlyOffset;
    }
    set envVisionEarlyOffset(v) {
        this._setEnv({ visionEarlyOffset: v });
    }
    get envVisionMidHours() {
        return this._d.visionMidHours;
    }
    set envVisionMidHours(v) {
        this._setEnv({ visionMidHours: v });
    }
    get envVisionLateOffset() {
        return this._d.visionLateOffset;
    }
    set envVisionLateOffset(v) {
        this._setEnv({ visionLateOffset: v });
    }
    // Growspaces tab compat accessors
    get _isAddingGrowspace() {
        return this._sm.tabs.growspaces.sub.kind === 'adding';
    }
    set _isAddingGrowspace(v) {
        if (v) {
            this._t({ type: 'START_ADD_GROWSPACE' });
        }
        else if (this._sm.tabs.growspaces.sub.kind === 'adding') {
            this._t({ type: 'CANCEL_GROWSPACES' });
        }
    }
    get _showDeleteConfirm() {
        return this._sm.tabs.growspaces.sub.kind === 'confirm-delete';
    }
    set _showDeleteConfirm(v) {
        if (v) {
            const sub = this._sm.tabs.growspaces.sub;
            if (sub.kind === 'editing') {
                this._t({ type: 'REQUEST_DELETE_GROWSPACE', growspaceId: sub.growspaceId, name: sub.name });
            }
        }
        else {
            this._t({ type: 'CANCEL_GROWSPACES' });
        }
    }
    get editSelectedId() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'editing' ? sub.growspaceId : '';
    }
    set editSelectedId(id) {
        if (!id) {
            this._t({ type: 'CANCEL_GROWSPACES' });
            return;
        }
        const device = this.devices?.find((d) => d.deviceId === id);
        this._t({
            type: 'SELECT_GROWSPACE',
            growspaceId: id,
            name: device?.name ?? '',
            rows: device?.rows ?? 4,
            plantsPerRow: device?.plantsPerRow ?? 4,
            notificationService: device?.notificationTarget ?? '',
        });
    }
    get editName() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'editing' ? sub.name : '';
    }
    set editName(v) {
        this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { name: v } });
    }
    get editRows() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'editing' ? sub.rows : 0;
    }
    set editRows(v) {
        this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { rows: v } });
    }
    get editPlantsPerRow() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'editing' ? sub.plantsPerRow : 0;
    }
    set editPlantsPerRow(v) {
        this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { plantsPerRow: v } });
    }
    get editNotificationService() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'editing' ? sub.notificationService : '';
    }
    set editNotificationService(v) {
        this._t({ type: 'UPDATE_EDIT_DRAFT', partial: { notificationService: v } });
    }
    get addName() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'adding' ? sub.name : '';
    }
    set addName(v) {
        if (this._sm.tabs.growspaces.sub.kind !== 'adding')
            this._t({ type: 'START_ADD_GROWSPACE' });
        this._t({ type: 'UPDATE_ADD_DRAFT', partial: { name: v } });
    }
    get addRows() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'adding' ? sub.rows : 4;
    }
    set addRows(v) {
        if (this._sm.tabs.growspaces.sub.kind !== 'adding')
            this._t({ type: 'START_ADD_GROWSPACE' });
        this._t({ type: 'UPDATE_ADD_DRAFT', partial: { rows: v } });
    }
    get addPlantsPerRow() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'adding' ? sub.plantsPerRow : 4;
    }
    set addPlantsPerRow(v) {
        if (this._sm.tabs.growspaces.sub.kind !== 'adding')
            this._t({ type: 'START_ADD_GROWSPACE' });
        this._t({ type: 'UPDATE_ADD_DRAFT', partial: { plantsPerRow: v } });
    }
    get addNotificationService() {
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'adding' ? sub.notificationService : '';
    }
    set addNotificationService(v) {
        if (this._sm.tabs.growspaces.sub.kind !== 'adding')
            this._t({ type: 'START_ADD_GROWSPACE' });
        this._t({ type: 'UPDATE_ADD_DRAFT', partial: { notificationService: v } });
    }
    // Heatmap / groups compat
    get _showGroupDialog() {
        return this._sm.tabs.heatmap.sub.kind === 'editing-group';
    }
    set _showGroupDialog(v) {
        if (v)
            this._t({ type: 'BEGIN_EDIT_GROUP' });
        else
            this._t({ type: 'CLOSE_GROUP_DIALOG' });
    }
    get _editingGroup() {
        const sub = this._sm.tabs.heatmap.sub;
        return sub.kind === 'editing-group' ? sub.group : undefined;
    }
    set _editingGroup(g) {
        this._t({ type: 'BEGIN_EDIT_GROUP', group: g });
    }
    // Subareas compat
    get _showSubareaConfigDialog() {
        return this._sm.tabs.subareas.sub.kind === 'editing-subarea';
    }
    set _showSubareaConfigDialog(v) {
        if (!v)
            this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
    }
    get _editingSubarea() {
        const sub = this._sm.tabs.subareas.sub;
        return sub.kind === 'editing-subarea' ? sub.subarea : undefined;
    }
    set _editingSubarea(subarea) {
        if (subarea)
            this._t({ type: 'BEGIN_EDIT_SUBAREA', subarea });
        else
            this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
    }
    get _showAddSubarea() {
        return this._sm.tabs.subareas.sub.kind === 'adding';
    }
    set _showAddSubarea(v) {
        if (v)
            this._t({ type: 'BEGIN_ADD_SUBAREA' });
        else
            this._t({ type: 'CANCEL_SUBAREA' });
    }
    get _newSubareaName() {
        const sub = this._sm.tabs.subareas.sub;
        return sub.kind === 'adding' ? sub.name : '';
    }
    set _newSubareaName(v) {
        if (this._sm.tabs.subareas.sub.kind !== 'adding')
            this._t({ type: 'BEGIN_ADD_SUBAREA' });
        this._t({ type: 'UPDATE_SUBAREA_NAME', name: v });
    }
    get _deleteConfirmSubareaId() {
        const sub = this._sm.tabs.subareas.sub;
        return sub.kind === 'confirm-delete' ? sub.subareaId : '';
    }
    set _deleteConfirmSubareaId(id) {
        if (id)
            this._t({ type: 'REQUEST_DELETE_SUBAREA', subareaId: id });
        else
            this._t({ type: 'CANCEL_DELETE_SUBAREA' });
    }
    // Tanks compat
    get _showTankForm() {
        return this._sm.tabs.tanks.sub.kind !== 'idle';
    }
    get _editingTankIndex() {
        const sub = this._sm.tabs.tanks.sub;
        return sub.kind === 'editing' ? sub.index : null;
    }
    get _tankDraft() {
        const sub = this._sm.tabs.tanks.sub;
        if (sub.kind === 'adding' || sub.kind === 'editing') {
            return {
                sensorEntity: sub.sensorEntity,
                name: sub.name,
                volumeLiters: sub.volumeLiters,
                warningLevel: sub.warningLevel,
            };
        }
        return { sensorEntity: '', name: '', volumeLiters: null, warningLevel: 30 };
    }
    set _tankDraft(v) {
        this._t({ type: 'UPDATE_TANK_DRAFT', partial: v });
    }
    willUpdate(_changedProperties) {
        // Seed once per open from the single device→draft seam. Wait until the target
        // device is available, then never re-seed: background refreshes must not
        // clobber in-progress edits.
        if (this._initialStateApplied || !this.open)
            return;
        const device = this.growspaceId
            ? this.devices.find((candidate) => candidate.deviceId === this.growspaceId)
            : undefined;
        if (this.growspaceId && !device)
            return;
        if (device)
            this._seedFromDevice(device);
        this._initialStateApplied = true;
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('open') && !this.open) {
            this._initialStateApplied = false;
        }
        if (this.open)
            this._bindDialogCancelGuard();
    }
    _seedFromDevice(device) {
        this._sm = {
            ...createInitialSM(device),
            activeTab: this.initialTab,
        };
        if (device)
            this._populateEditFields(device.deviceId);
        if (this.initialTab === ConfigTab.SUBAREAS)
            this._loadSubareas();
    }
    _deviceForDirtyCheck() {
        const growspaceSub = this._sm.tabs.growspaces.sub;
        const editingId = growspaceSub.kind === 'editing' ? growspaceSub.growspaceId : '';
        if (this._sm.activeTab === ConfigTab.GROWSPACES) {
            const growspaceId = editingId || this.growspaceId;
            return this.devices.find((device) => device.deviceId === growspaceId) ?? this.devices[0];
        }
        const id = editingId || this._sm.environmentDraft.selectedGrowspaceId || this.growspaceId;
        return this.devices.find((device) => device.deviceId === id);
    }
    /**
     * `ha-dialog` wraps Web Awesome's native `<dialog>`. Its `cancel` event neither bubbles
     * nor crosses shadow roots, so the guard must live on that native element instead of
     * `window` or `<wa-dialog>`. Capture also runs before Web Awesome's own cancel handler.
     */
    _bindDialogCancelGuard() {
        const nativeDialog = this._nativeDialogElement();
        if (!nativeDialog || nativeDialog === this._cancelGuardTarget)
            return;
        this._cancelGuardTarget?.removeEventListener('cancel', this._onDialogCancel, true);
        nativeDialog.addEventListener('cancel', this._onDialogCancel, true);
        this._cancelGuardTarget = nativeDialog;
    }
    _nativeDialogElement() {
        const haDialog = this.shadowRoot?.querySelector('ha-dialog');
        const waDialog = haDialog?.shadowRoot?.querySelector('wa-dialog');
        return (waDialog?.dialog ??
            waDialog?.shadowRoot?.querySelector('dialog') ??
            haDialog?.shadowRoot?.querySelector('dialog') ??
            null);
    }
    _switchTab(tab) {
        const device = this._deviceForDirtyCheck();
        this._sm = device
            ? requestTabSwitch(this._sm, tab, device)
            : transition(this._sm, { type: 'SWITCH_TAB', tab: tab });
        if (this._sm.activeTab === tab && tab === ConfigTab.SUBAREAS) {
            this._loadSubareas();
        }
    }
    // ── Submit handlers ─────────────────────────────────────────────────────
    _submitAddGrowspace() {
        const sub = this._sm.tabs.growspaces.sub;
        if (sub.kind !== 'adding')
            return;
        this.dispatchEvent(new CustomEvent('add-growspace-submit', {
            detail: {
                name: sub.name,
                rows: sub.rows,
                plantsPerRow: sub.plantsPerRow,
                notificationService: sub.notificationService,
            },
            bubbles: true,
            composed: true,
        }));
    }
    _submitEnvironment() {
        this.dispatchEvent(new CustomEvent('environment-change-requested', {
            detail: {
                kind: 'shared-environment-draft',
                draft: this._sm.environmentDraft,
                dirty: this._sm.environmentDirty,
            },
            bubbles: true,
            composed: true,
        }));
    }
    _startAddTimedNotification() {
        this._t({ type: 'START_ADD_TIMED_NOTIFICATION' });
    }
    _startEditTimedNotification(id, draft) {
        this._t({ type: 'START_EDIT_TIMED_NOTIFICATION', id, draft });
    }
    _requestDeleteTimedNotification(id) {
        this._t({ type: 'DELETE_TIMED_NOTIFICATION', id });
    }
    _confirmDeleteTimedNotification() {
        this._t({ type: 'CONFIRM_DELETE' });
    }
    _cancelTimedNotification() {
        this._t({ type: 'CANCEL_TIMED_NOTIFICATION' });
    }
    _commitAddTimedNotification() {
        this._t({ type: 'ADD_TIMED_NOTIFICATION', id: randomId() });
    }
    _commitEditTimedNotification() {
        this._t({ type: 'EDIT_TIMED_NOTIFICATION' });
    }
    _submitNotifications() {
        const draft = this._sm.tabs.notifications.draft;
        // Backend consumers (calendar, notification_manager) read timed notifications
        // in snake_case, so convert the camelCase SM shape at this card→backend boundary.
        const timedNotifications = this._sm.tabs.notifications.timedNotifications.map((n) => ({
            id: n.id,
            message: n.message,
            // An unrecognised trigger is written back verbatim — saving an untouched
            // notification must not rewrite a trigger the card could not interpret.
            trigger_type: triggerRawValue(n.triggerType),
            day: n.day,
            growspace_ids: n.growspaceIds,
        }));
        this.dispatchEvent(new CustomEvent('save-notification-settings-submit', {
            detail: {
                notification_settings: {
                    criticalCooldownMinutes: draft.criticalCooldownMinutes,
                    warningCooldownMinutes: draft.warningCooldownMinutes,
                    recoveryCooldownMinutes: draft.recoveryCooldownMinutes,
                    escalationDelayMinutes: draft.escalationDelayMinutes,
                    minStressDurationSeconds: draft.minStressDurationSeconds,
                    warningPersistenceMinutes: draft.warningPersistenceMinutes,
                },
                ai_auto_alerts: draft.aiAutoAlerts,
                timed_notifications: timedNotifications,
            },
            bubbles: true,
            composed: true,
        }));
        this._t({ type: 'SAVE_NOTIFICATIONS' });
    }
    _submitVisionCheckupConfig() {
        const d = this._sm.environmentDraft;
        if (!d.selectedGrowspaceId)
            return;
        // Dedicated service, gated on its own dirty group (ADR-0032): nothing was
        // edited, so there is nothing to write.
        if (!isEnvironmentGroupDirty(this._sm.environmentDirty, VISION_GROUP))
            return;
        this.dispatchEvent(new CustomEvent('vision-checkup-config-submit', {
            detail: {
                growspaceId: d.selectedGrowspaceId,
                visionCheckupConfig: {
                    enabled: d.visionEnabled,
                    early_check_offset_minutes: d.visionEarlyOffset,
                    mid_check_hours: d.visionMidHours,
                    late_check_offset_minutes: d.visionLateOffset,
                },
            },
            bubbles: true,
            composed: true,
        }));
    }
    _submitEditGrowspace() {
        const sub = this._sm.tabs.growspaces.sub;
        if (sub.kind !== 'editing')
            return;
        this.dispatchEvent(new CustomEvent('edit-growspace-submit', {
            detail: {
                growspaceId: sub.growspaceId,
                name: sub.name,
                rows: sub.rows,
                plantsPerRow: sub.plantsPerRow,
                notificationService: sub.notificationService,
            },
            bubbles: true,
            composed: true,
        }));
    }
    _submitGrowspaceAndEnv() {
        const caps = this._caps;
        if (!caps.canSaveEnvironment)
            return;
        this._submitEditGrowspace();
        this._submitEnvironment();
    }
    _submitDeleteGrowspace() {
        const sub = this._sm.tabs.growspaces.sub;
        if (sub.kind !== 'editing')
            return;
        this._t({ type: 'REQUEST_DELETE_GROWSPACE', growspaceId: sub.growspaceId, name: sub.name });
    }
    _confirmDeleteGrowspace() {
        const sub = this._sm.tabs.growspaces.sub;
        if (sub.kind !== 'confirm-delete')
            return;
        this.dispatchEvent(new CustomEvent('delete-growspace-submit', {
            detail: { growspace_id: sub.growspaceId },
            bubbles: true,
            composed: true,
        }));
        this._t({ type: 'CANCEL_GROWSPACES' });
    }
    _cancelDeleteGrowspace() {
        this._t({ type: 'CANCEL_GROWSPACES' });
    }
    async _requestRemoveEnvironment(event) {
        this._t({
            type: 'REQUEST_REMOVE_ENVIRONMENT',
            sensorCount: event.detail.sensorCount,
            controllerCount: event.detail.controllerCount,
        });
        await this.updateComplete;
        this.shadowRoot?.querySelector('.keep-environment-action')?.focus();
    }
    async _cancelRemoveEnvironment() {
        this._t({ type: 'CANCEL_REMOVE_ENVIRONMENT' });
        await this.updateComplete;
        const tab = this.shadowRoot?.querySelector('config-growspaces-tab');
        await tab?.updateComplete;
        tab?.shadowRoot?.querySelector('.danger-zone .md3-button')?.focus();
    }
    async _confirmRemoveEnvironment() {
        const sub = this._sm.tabs.growspaces.sub;
        if (sub.kind !== 'confirm-remove-environment')
            return;
        const growspaceId = sub.editing.growspaceId;
        this._t({ type: 'START_REMOVE_ENVIRONMENT' });
        try {
            const detail = { growspace_id: growspaceId };
            this.dispatchEvent(new CustomEvent('remove-environment-submit', {
                detail,
                bubbles: true,
                composed: true,
            }));
            if (!detail.completion) {
                throw new Error('Remove environment request was not handled');
            }
            const refreshedDevice = await detail.completion;
            if (!refreshedDevice) {
                throw new Error(`Growspace ${growspaceId} was missing after environment removal`);
            }
            this._t({ type: 'CANCEL_REMOVE_ENVIRONMENT' });
            this._t({ type: 'RESET_FROM_DEVICE', device: refreshedDevice });
        }
        catch (e) {
            this._t({ type: 'CANCEL_REMOVE_ENVIRONMENT' });
            console.error('Failed to remove environment:', e);
        }
    }
    // ── Growspace data helpers ───────────────────────────────────────────────
    _populateEditFields(growspaceId) {
        if (!growspaceId) {
            this._t({ type: 'CANCEL_GROWSPACES' });
            return;
        }
        if (!this.devices)
            return;
        const device = this.devices.find((d) => d.deviceId === growspaceId);
        if (device) {
            this._t({
                type: 'SELECT_GROWSPACE',
                growspaceId,
                name: device.name,
                rows: device.rows || 4,
                plantsPerRow: device.plantsPerRow || 4,
                notificationService: device.notificationTarget || '',
            });
        }
    }
    _handleEditSelection(growspaceId) {
        if (!growspaceId) {
            this._t({ type: 'CANCEL_GROWSPACES' });
        }
        else {
            this._populateEditFields(growspaceId);
        }
        this._handleEnvGrowspaceChange({ target: { value: growspaceId } });
    }
    _startAddGrowspace() {
        this._t({ type: 'START_ADD_GROWSPACE' });
    }
    _getMobileAppNotifyServices() {
        if (!this.hass?.services?.notify)
            return [];
        return Object.keys(this.hass.services.notify)
            .filter((s) => s.startsWith('mobile_app_'))
            .map((s) => ({ label: s.replace('mobile_app_', ''), value: s }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }
    _getEntities(domains, deviceClass, platform) {
        if (!this.hass)
            return [];
        // hass.entities (the entity registry) is present at runtime but not declared
        // on custom-card-helpers' HomeAssistant type; read platform through a cast.
        const registry = this.hass.entities;
        const states = this.hass.states;
        if (states !== this._entityOptionsStates || registry !== this._entityOptionsRegistry) {
            this._entityOptionsStates = states;
            this._entityOptionsRegistry = registry;
            this._entityOptionsCache.clear();
        }
        const cacheKey = JSON.stringify([domains, deviceClass, platform]);
        const cached = this._entityOptionsCache.get(cacheKey);
        if (cached)
            return cached;
        const entities = Object.keys(states || {})
            .filter((eid) => {
            const state = states[eid];
            if (!state)
                return false;
            const domain = eid.split('.')[0];
            return (domains.includes(domain) &&
                matchesEntityClass(state.attributes, deviceClass) &&
                (!platform || registry?.[eid]?.platform === platform));
        })
            .sort();
        this._entityOptionsCache.set(cacheKey, entities);
        return entities;
    }
    /**
     * Automated Mode Conflict resolver for a bound AC Infinity mode entity. Returns
     * the conflict (device name + current mode) when the port sits in a self-running
     * mode, else null. The reactive read of `hass.states` here is what makes the
     * warning update live and re-appear on dialog reopen.
     */
    _acInfinityConflict(modeEntity) {
        if (!modeEntity || !this.hass)
            return null;
        const state = this.hass.states[modeEntity];
        if (!state || !isAutomatedMode(state.state))
            return null;
        return { deviceName: this._deviceNameForEntity(modeEntity), mode: state.state };
    }
    /** Device-registry name for an entity, falling back to friendly name then id. */
    _deviceNameForEntity(entityId) {
        const hass = this.hass;
        const deviceId = hass.entities?.[entityId]?.device_id;
        const device = deviceId ? hass.devices?.[deviceId] : undefined;
        const deviceName = device?.name_by_user || device?.name;
        if (deviceName)
            return deviceName;
        return this.hass.states[entityId]?.attributes?.friendly_name || entityId;
    }
    /** The frontend entity registry (`hass.entities`), untyped on the hass type. */
    get _entityRegistry() {
        return this.hass.entities ?? {};
    }
    /** Device-registry name for a device id (`name_by_user || name`), falling back to the id. */
    _deviceNameById(deviceId) {
        const devices = this.hass.devices;
        const device = devices?.[deviceId];
        return device?.name_by_user || device?.name || deviceId;
    }
    _acInfinityPortDevices() {
        if (!this.hass)
            return [];
        return listAcInfinityPortDevices(this._entityRegistry, (id) => this._deviceNameById(id));
    }
    _acInfinityPortDeviceId(modeEntity) {
        if (!this.hass)
            return '';
        return deviceIdForModeEntity(this._entityRegistry, modeEntity);
    }
    /**
     * Apply a Port Pre-fill pick to one actuator bundle: resolve the picked device
     * to its member entities, overwrite the port's role fields (clearing unresolved
     * ones), persist through the normal env-draft path, and record the inline
     * warning naming what wasn't found.
     */
    _pickAcInfinityPort(field, index, deviceId) {
        // The picker's blank "Select…" option is not a device — never let a stray
        // click through it wipe a configured bundle.
        if (!deviceId)
            return;
        const current = this._sm.environmentDraft[field];
        if (!current?.[index])
            return;
        const roles = resolveAcInfinityPort(this._entityRegistry, deviceId);
        // The grow-light bundle fills all six roles; the actuator bundles fill two.
        const { device, missing } = field === 'growlightAcInfinityDevices'
            ? fillAcInfinityGrowLightPort(current[index], roles)
            : fillAcInfinityActuatorPort(current[index], roles);
        const next = current.map((d, i) => (i === index ? device : d));
        // _setEnv clears this field's warnings; re-set only the picked port's.
        this._setEnv({ [field]: next });
        this._acInfinityPrefillWarnings = {
            ...this._acInfinityPrefillWarnings,
            [`${field}:${index}`]: missing,
        };
    }
    /** The warning map with every key for `field` dropped (a manual write invalidates them). */
    _clearedPrefillWarnings(field) {
        const prefix = `${field}:`;
        return Object.fromEntries(Object.entries(this._acInfinityPrefillWarnings).filter(([k]) => !k.startsWith(prefix)));
    }
    // ── Threshold helpers ────────────────────────────────────────────────────
    _updateThreshold(stage, cycle, point, value) {
        if (isNaN(value))
            return;
        const t = JSON.parse(JSON.stringify(this._sm.environmentDraft.dehumidifierThresholds || {}));
        if (!t[stage])
            t[stage] = {};
        if (!t[stage][cycle])
            t[stage][cycle] = { on: 0, off: 0 };
        t[stage][cycle][point] = value;
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { dehumidifierThresholds: t } });
    }
    _updateHumidifierThreshold(stage, cycle, point, value) {
        if (isNaN(value))
            return;
        const t = JSON.parse(JSON.stringify(this._sm.environmentDraft.humidifierThresholds || {}));
        if (!t[stage])
            t[stage] = {};
        if (!t[stage][cycle])
            t[stage][cycle] = { on: 0, off: 0 };
        t[stage][cycle][point] = value;
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { humidifierThresholds: t } });
    }
    // ── Tank methods ─────────────────────────────────────────────────────────
    _openAddTank() {
        this._t({ type: 'BEGIN_ADD_TANK' });
    }
    _editTank(index) {
        const tank = this._sm.environmentDraft.irrigationTanks[index];
        this._t({
            type: 'BEGIN_EDIT_TANK',
            index,
            sensorEntity: tank.sensorEntity || '',
            name: tank.name || '',
            volumeLiters: tank.volumeLiters ?? null,
            warningLevel: tank.warningLevel ?? 30,
        });
    }
    _deleteTank(index) {
        const updated = this._sm.environmentDraft.irrigationTanks.filter((_, i) => i !== index);
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { irrigationTanks: updated } });
    }
    _saveTank() {
        const sub = this._sm.tabs.tanks.sub;
        if (sub.kind !== 'adding' && sub.kind !== 'editing')
            return;
        if (!sub.sensorEntity.trim())
            return;
        this._t({ type: 'COMMIT_TANK' });
    }
    _cancelTank() {
        this._t({ type: 'CANCEL_TANK' });
    }
    // ── Sensor group methods ─────────────────────────────────────────────────
    _openAddGroup() {
        this._t({ type: 'BEGIN_EDIT_GROUP' });
    }
    _editGroup(group) {
        this._t({ type: 'BEGIN_EDIT_GROUP', group });
    }
    _deleteGroup(id) {
        const updated = this._sm.environmentDraft.sensorGroups.filter((g) => g.id !== id);
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: updated } });
    }
    _handleSaveGroup(e) {
        const group = e.detail.group;
        const groups = this._sm.environmentDraft.sensorGroups;
        const index = groups.findIndex((g) => g.id === group.id);
        const updated = index >= 0 ? groups.map((g, i) => (i === index ? group : g)) : [...groups, group];
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: updated } });
        this._t({ type: 'CLOSE_GROUP_DIALOG' });
    }
    // ── Subarea methods ──────────────────────────────────────────────────────
    async _loadSubareas() {
        const envId = this._sm.environmentDraft.selectedGrowspaceId;
        const gsSub = this._sm.tabs.growspaces.sub;
        const editId = gsSub.kind === 'editing' ? gsSub.growspaceId : '';
        const growspaceId = envId || editId;
        if (!growspaceId) {
            this._subareas = [];
            this._subareasGrowspaceId = '';
            return;
        }
        this._subareasGrowspaceId = growspaceId;
        this._subareasLoading = true;
        try {
            this._subareas = await getSubareas(growspaceId);
        }
        catch (e) {
            console.error('[ConfigDialog] Failed to load subareas:', e);
            this._subareas = [];
        }
        finally {
            this._subareasLoading = false;
        }
    }
    async _handleAddSubarea() {
        const sub = this._sm.tabs.subareas.sub;
        const name = sub.kind === 'adding' ? sub.name.trim() : '';
        if (!name || !this._subareasGrowspaceId)
            return;
        try {
            await addSubarea(this._subareasGrowspaceId, name);
            this._t({ type: 'CANCEL_SUBAREA' });
            await this._loadSubareas();
        }
        catch (e) {
            console.error('[ConfigDialog] Failed to add subarea:', e);
        }
    }
    _handleEditSubarea(subarea) {
        this._t({ type: 'BEGIN_EDIT_SUBAREA', subarea });
    }
    _handleDeleteSubarea(subareaId) {
        this._t({ type: 'REQUEST_DELETE_SUBAREA', subareaId });
    }
    async _confirmDeleteSubarea(subareaId) {
        if (!this._subareasGrowspaceId)
            return;
        try {
            await removeSubarea(this._subareasGrowspaceId, subareaId);
            this._t({ type: 'CANCEL_DELETE_SUBAREA' });
            await this._loadSubareas();
        }
        catch (e) {
            console.error('[ConfigDialog] Failed to delete subarea:', e);
        }
    }
    _handleEnvGrowspaceChange(e) {
        const growspaceId = e.target.value;
        const currentDevice = this._deviceForDirtyCheck();
        if (currentDevice && isActiveTabDirty(this._sm, currentDevice)) {
            this._t({ type: 'REQUEST_GROWSPACE_CHANGE', growspaceId });
            return;
        }
        this._applyEnvGrowspaceChange(growspaceId);
    }
    _applyEnvGrowspaceChange(growspaceId) {
        const device = this.devices.find((d) => d.deviceId === growspaceId);
        if (device) {
            this._t({ type: 'RESET_FROM_DEVICE', device });
        }
        else {
            this._t({
                type: 'UPDATE_ENV_DRAFT',
                partial: {
                    selectedGrowspaceId: growspaceId,
                    temperatureSensors: [],
                    humiditySensors: [],
                    vpdSensors: [],
                    co2Sensor: '',
                    lightSensors: [],
                    exhaustFanEntities: [],
                    circulationFanEntities: [],
                    humidifierEntities: [],
                    dehumidifierEntities: [],
                    soilMoistureSensor: '',
                    soilMoistureMin: null,
                    soilMoistureMax: null,
                    dehumidifierThresholds: {},
                    humidifierThresholds: {},
                    humidifierControlEnabled: false,
                    dehumidifierControlEnabled: false,
                    visionEnabled: false,
                    visionEarlyOffset: 60,
                    visionMidHours: 6,
                    visionLateOffset: 60,
                    cameraEntities: [],
                    lungroomTempSensors: [],
                    substrateTemperatureSensors: [],
                    phSensors: [],
                    feedEcSensors: [],
                    bulkEcSensors: [],
                    poreEcSensors: [],
                    runoffEcSensors: [],
                    drainVolumeSensors: [],
                    irrigationFlowSensors: [],
                    powerSensors: [],
                    energySensors: [],
                    irrigationTanks: [],
                    vpdOptimalOverrides: {},
                },
            });
            this._t({ type: 'CANCEL_TANK' });
        }
    }
    _growspaceName(growspaceId) {
        return this.growspaceOptions[growspaceId] || undefined;
    }
    /**
     * The growspace whose edits the discard prompt is about. The Growspaces tab
     * hides the context bar and edits its own selection, so the environment
     * draft's growspace is stale there — naming it would be confidently wrong.
     */
    _dirtyGrowspaceId() {
        if (this._sm.activeTab !== ConfigTab.GROWSPACES) {
            return this._sm.environmentDraft.selectedGrowspaceId;
        }
        const sub = this._sm.tabs.growspaces.sub;
        return sub.kind === 'editing' ? sub.growspaceId : undefined;
    }
    /**
     * Name the growspace whose edits are at stake — and, when the prompt guards a
     * growspace switch, the one being switched to. Installs routinely run 20+
     * growspaces with repeated labels, so "your unsaved changes" alone leaves the
     * grower guessing which one they are about to discard.
     */
    _discardDescription() {
        const { status } = this._sm;
        const dirtyId = this._dirtyGrowspaceId();
        const editing = dirtyId ? this._growspaceName(dirtyId) : undefined;
        const generic = 'You have unsaved changes. If you continue now, your edits will be lost.';
        if (!editing)
            return generic;
        if (status.kind === 'confirm-discard' && !('pendingTab' in status)) {
            if (status.pendingAction === 'change-growspace') {
                const target = this._growspaceName(status.growspaceId);
                if (target) {
                    return x `Discard your unsaved changes to <strong>${editing}</strong> and switch to
            <strong>${target}</strong>?`;
                }
            }
        }
        return x `Discard your unsaved changes to <strong>${editing}</strong>? If you continue now,
      your edits will be lost.`;
    }
    _renderConfirmDiscard() {
        return x `
      <div class="confirm-discard-overlay">
        <div
          class="confirm-discard-box"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="config-discard-title"
          aria-describedby="config-discard-description"
        >
          <h3 id="config-discard-title">Discard changes?</h3>
          <p id="config-discard-description">${this._discardDescription()}</p>
          <div class="confirm-discard-actions">
            <button class="md3-button tonal" @click=${this._cancelDiscard}>Keep editing</button>
            <button class="md3-button danger" @click=${this._confirmDiscard}>Discard</button>
          </div>
        </div>
      </div>
    `;
    }
    // ── Section renderers ────────────────────────────────────────────────────
    _renderNotificationsTab() {
        return x `
      <config-notifications-tab
        .vm=${createNotificationsTabViewModel(this._sm, this.growspaceOptions)}
        @notif-draft-changed=${(e) => this._t({ type: 'UPDATE_NOTIFICATIONS_DRAFT', partial: e.detail.partial })}
        @add-timed-requested=${this._startAddTimedNotification}
        @edit-timed-requested=${(e) => this._startEditTimedNotification(e.detail.id, e.detail.draft)}
        @timed-draft-changed=${(e) => this._t({ type: 'UPDATE_TIMED_DRAFT', partial: e.detail.partial })}
        @cancel-timed=${this._cancelTimedNotification}
        @commit-add-timed=${this._commitAddTimedNotification}
        @commit-edit-timed=${this._commitEditTimedNotification}
        @request-delete-timed=${(e) => this._requestDeleteTimedNotification(e.detail.id)}
        @confirm-delete-timed=${this._confirmDeleteTimedNotification}
      ></config-notifications-tab>
    `;
    }
    _renderGrowspacesTab() {
        const deps = {
            growspaceOptions: this.growspaceOptions,
            notifyServices: this._getMobileAppNotifyServices(),
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
        };
        return x `
      <config-growspaces-tab
        .vm=${createGrowspacesTabViewModel(this._sm, deps)}
        @select-growspace=${(e) => this._handleEditSelection(e.detail.id)}
        @start-add-growspace=${this._startAddGrowspace}
        @add-draft-changed=${(e) => this._t({ type: 'UPDATE_ADD_DRAFT', partial: e.detail.partial })}
        @edit-draft-changed=${(e) => this._t({ type: 'UPDATE_EDIT_DRAFT', partial: e.detail.partial })}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
        @remove-environment-requested=${this._requestRemoveEnvironment}
      ></config-growspaces-tab>
    `;
    }
    _renderSensorsTab() {
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
            averageSensorValue: (ids) => this._averageSensorValue(ids),
            sensorReading: (entityId) => this._sensorReading(entityId),
        };
        return x `
      <config-sensors-tab
        .vm=${createSensorsTabViewModel(this._sm, deps)}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
      ></config-sensors-tab>
    `;
    }
    /**
     * Current state + unit for one entity. The unit is what tells the Moisture
     * Band whether this sensor can be read as a percentage at all; an absent
     * unit is the legacy case and stays supported.
     */
    _sensorReading(entityId) {
        const state = this.hass?.states?.[entityId];
        if (!state)
            return null;
        return {
            value: state.state ?? null,
            unit: state.attributes?.unit_of_measurement ?? null,
        };
    }
    _averageSensorValue(entityIds) {
        if (!entityIds.length || !this.hass)
            return null;
        let sum = 0;
        let count = 0;
        for (const id of entityIds) {
            const state = this.hass.states[id];
            if (!state || state.state === 'unavailable' || state.state === 'unknown')
                continue;
            const val = parseFloat(state.state);
            if (!Number.isFinite(val))
                continue;
            sum += val;
            count++;
        }
        return count > 0 ? sum / count : null;
    }
    _averageTemperatureReading(entityIds) {
        if (!entityIds.length || !this.hass)
            return null;
        const targetUnit = normalizedTemperatureUnit(this.hass.config?.unit_system?.temperature);
        let sum = 0;
        let count = 0;
        for (const id of entityIds) {
            const state = this.hass.states[id];
            if (!state || state.state === 'unavailable' || state.state === 'unknown')
                continue;
            const value = Number.parseFloat(state.state);
            if (!Number.isFinite(value))
                continue;
            const reportedUnit = state.attributes?.unit_of_measurement;
            const sourceUnit = reportedUnit === '°C' || reportedUnit === '°F' ? reportedUnit : targetUnit;
            sum += temperatureFromCelsius(temperatureToCelsius(value, sourceUnit), targetUnit);
            count++;
        }
        return count ? { value: sum / count, unit: targetUnit } : null;
    }
    // Fan/exhaust edits forward a partial; merge against the live draft so
    // synchronous multi-field edits accumulate (the component never reads the SM).
    _updateFanConfig(partial) {
        this._t({
            type: 'UPDATE_ENV_DRAFT',
            partial: {
                circulationFanConfig: { ...this._sm.environmentDraft.circulationFanConfig, ...partial },
            },
        });
    }
    _updateExhaustFanConfig(partial) {
        this._t({
            type: 'UPDATE_ENV_DRAFT',
            partial: {
                exhaustFanConfig: { ...this._sm.environmentDraft.exhaustFanConfig, ...partial },
            },
        });
    }
    _renderClimateTab() {
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
            acInfinityConflict: (modeEntity) => this._acInfinityConflict(modeEntity),
            acInfinityPortDevices: () => this._acInfinityPortDevices(),
            acInfinityPortDeviceId: (modeEntity) => this._acInfinityPortDeviceId(modeEntity),
            acInfinityPrefillWarning: (field, index) => this._acInfinityPrefillWarnings[`${field}:${index}`] ?? [],
            currentStage: this._deviceForDirtyCheck()?.biologicalMetrics?.granularStage,
            unitSystem: this.hass?.config?.unit_system,
            currentTemperature: this._averageTemperatureReading(this._sm.environmentDraft.temperatureSensors),
            language: this.hass?.language,
        };
        return x `
      <config-climate-tab
        .vm=${createClimateTabViewModel(this._sm, deps, {
            openStageVpdId: this._openClimateStageVpdId,
        })}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
        @pick-ac-infinity-device=${(e) => this._pickAcInfinityPort(e.detail.field, e.detail.index, e.detail.deviceId)}
        @fan-config-changed=${(e) => this._updateFanConfig(e.detail.partial)}
        @exhaust-config-changed=${(e) => this._updateExhaustFanConfig(e.detail.partial)}
        @toggle-stage-vpd=${(e) => {
            this._openClimateStageVpdId =
                this._openClimateStageVpdId === e.detail.stageId ? '' : e.detail.stageId;
        }}
      ></config-climate-tab>
    `;
    }
    _renderGrowlightTab() {
        const growspaceId = this._sm.environmentDraft.selectedGrowspaceId;
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
            lightsOnTime: growspaceId
                ? (irrigationStrategies$.get().get(growspaceId)?.lightsOnTime ?? null)
                : null,
            acInfinityPortDevices: () => this._acInfinityPortDevices(),
            acInfinityPortDeviceId: (modeEntity) => this._acInfinityPortDeviceId(modeEntity),
            acInfinityPrefillWarning: (field, index) => this._acInfinityPrefillWarnings[`${field}:${index}`] ?? [],
        };
        return x `
      <config-growlight-tab
        .vm=${createGrowlightTabViewModel(this._sm, deps)}
        .scrollToField=${this.scrollToField}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
        @lights-on-changed=${(e) => this._onLightsOnChanged(e.detail.lightsOnTime)}
        @pick-ac-infinity-device=${(e) => this._pickAcInfinityPort(e.detail.field, e.detail.index, e.detail.deviceId)}
      ></config-growlight-tab>
    `;
    }
    /**
     * Lights-on is an `IrrigationStrategy` field (ADR-0026): persist it immediately
     * via the strategy path, not the buffered env-draft Save. Partial merge, so only
     * `lights_on_time` is sent.
     */
    _onLightsOnChanged(lightsOnTime) {
        const growspaceId = this._sm.environmentDraft.selectedGrowspaceId;
        if (!growspaceId)
            return;
        void updateIrrigationStrategy(growspaceId, { lightsOnTime });
    }
    _renderHumidityTab() {
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
            acInfinityConflict: (modeEntity) => this._acInfinityConflict(modeEntity),
            acInfinityPortDevices: () => this._acInfinityPortDevices(),
            acInfinityPortDeviceId: (modeEntity) => this._acInfinityPortDeviceId(modeEntity),
            acInfinityPrefillWarning: (field, index) => this._acInfinityPrefillWarnings[`${field}:${index}`] ?? [],
        };
        return x `
      <config-humidity-tab
        .vm=${createHumidityTabViewModel(this._sm, deps, {
            openStageId: this._openHumidityStageId,
        })}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
        @pick-ac-infinity-device=${(e) => this._pickAcInfinityPort(e.detail.field, e.detail.index, e.detail.deviceId)}
        @set-humidifier-control=${(e) => this._setHumidifierControl(e.detail.enabled)}
        @set-dehumidifier-control=${(e) => this._setDehumidifierControl(e.detail.enabled)}
        @toggle-stage=${(e) => {
            this._openHumidityStageId =
                this._openHumidityStageId === e.detail.stageId ? '' : e.detail.stageId;
        }}
        @update-dehum-threshold=${(e) => this._updateThreshold(e.detail.stage, e.detail.cycle, e.detail.point, e.detail.value)}
        @update-hum-threshold=${(e) => this._updateHumidifierThreshold(e.detail.stage, e.detail.cycle, e.detail.point, e.detail.value)}
      ></config-humidity-tab>
    `;
    }
    _setHumidifierControl(enabled) {
        this._setEnv({ humidifierControlEnabled: enabled });
        setHumidifierControl(this._sm.environmentDraft.selectedGrowspaceId, enabled).catch((err) => console.error('[setHumidifierControl failed]', err));
    }
    _setDehumidifierControl(enabled) {
        this._setEnv({ dehumidifierControlEnabled: enabled });
        setDehumidifierControl(this._sm.environmentDraft.selectedGrowspaceId, enabled).catch((err) => console.error('[setDehumidifierControl failed]', err));
    }
    _renderIrrigationTab() {
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
        };
        return x `
      <config-irrigation-tab
        .vm=${createIrrigationTabViewModel(this._sm, deps)}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
      ></config-irrigation-tab>
    `;
    }
    _renderTanksTab() {
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
        };
        return x `
      <config-tanks-tab
        .vm=${createTanksTabViewModel(this._sm, deps)}
        @add-tank-requested=${this._openAddTank}
        @edit-tank-requested=${(e) => this._editTank(e.detail.index)}
        @delete-tank-requested=${(e) => this._deleteTank(e.detail.index)}
        @tank-draft-changed=${(e) => this._t({ type: 'UPDATE_TANK_DRAFT', partial: e.detail.partial })}
        @cancel-tank=${this._cancelTank}
        @save-tank-requested=${this._saveTank}
      ></config-tanks-tab>
    `;
    }
    _renderVisionTab() {
        const deps = {
            entityOptions: (domains, deviceClass, platform) => this._getEntities(domains, deviceClass, platform),
        };
        return x `
      <config-vision-tab
        .vm=${createVisionTabViewModel(this._sm, deps)}
        @env-draft-changed=${(e) => this._setEnv(e.detail.partial)}
      ></config-vision-tab>
    `;
    }
    _renderHeatmapTab() {
        return x `
      <config-heatmap-tab
        .vm=${createHeatmapTabViewModel(this._sm)}
        @add-group-requested=${this._openAddGroup}
        @edit-group-requested=${(e) => this._editGroup(e.detail.group)}
        @delete-group-requested=${(e) => this._deleteGroup(e.detail.id)}
      ></config-heatmap-tab>
    `;
    }
    _renderSubareasTab() {
        return x `
      <config-subareas-tab
        .vm=${createSubareasTabViewModel(this._sm, {
            subareas: this._subareas,
            loading: this._subareasLoading,
        })}
        @add-subarea-requested=${() => this._t({ type: 'BEGIN_ADD_SUBAREA' })}
        @subarea-name-changed=${(e) => this._t({ type: 'UPDATE_SUBAREA_NAME', name: e.detail.name })}
        @commit-add-subarea=${() => this._handleAddSubarea()}
        @cancel-add-subarea=${() => this._t({ type: 'CANCEL_SUBAREA' })}
        @edit-subarea-requested=${(e) => this._handleEditSubarea(e.detail.subarea)}
        @delete-subarea-requested=${(e) => this._handleDeleteSubarea(e.detail.id)}
        @confirm-delete-subarea=${(e) => this._confirmDeleteSubarea(e.detail.id)}
        @cancel-delete-subarea=${() => this._t({ type: 'CANCEL_DELETE_SUBAREA' })}
      ></config-subareas-tab>
    `;
    }
    // ── Main render ──────────────────────────────────────────────────────────
    _icon(path, size = 24) {
        return x `<svg
      style="width:${size}px;height:${size}px;fill:currentColor;"
      viewBox="0 0 24 24"
    >
      <path d="${path}"></path>
    </svg>`;
    }
    _navItem(tab, iconPath, label) {
        if (this.allowedTabs && !this.allowedTabs.includes(tab))
            return E;
        const active = this.currentTab === tab;
        return x `
      <button
        type="button"
        id="config-tab-${tab}"
        class="cfg-nav-item ${active ? 'active' : ''}"
        role="tab"
        data-tab=${tab}
        aria-controls="config-tabpanel"
        aria-label=${label}
        aria-selected=${active ? 'true' : 'false'}
        title=${label}
        tabindex=${active ? 0 : -1}
        @click=${() => this._switchTab(tab)}
        @keydown=${(event) => this._onNavKeydown(event)}
      >
        ${this._icon(iconPath, 18)}
        <span>${label}</span>
      </button>
    `;
    }
    _onNavKeydown(event) {
        const tabs = Array.from(this.renderRoot.querySelectorAll('[role="tab"]'));
        const currentIndex = tabs.indexOf(event.currentTarget);
        if (currentIndex < 0 || tabs.length === 0)
            return;
        let nextIndex;
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                nextIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabs.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
        const next = tabs[nextIndex];
        const nextTab = next.dataset.tab;
        this._switchTab(nextTab);
        void this.updateComplete.then(() => {
            if (this.currentTab === nextTab)
                next.focus();
        });
    }
    _updateVpdOptimal(key, period, slot, raw) {
        const overrides = this._sm.environmentDraft.vpdOptimalOverrides;
        const parsed = parseFloat(raw);
        const value = isNaN(parsed) ? VPD_OPTIMAL_STAGE_DEFAULTS[key][period][slot] : parsed;
        const existingStage = overrides[key] ?? { ...VPD_OPTIMAL_STAGE_DEFAULTS[key] };
        const existingPeriod = overrides[key]?.[period] ?? {
            ...VPD_OPTIMAL_STAGE_DEFAULTS[key][period],
        };
        const updated = {
            ...overrides,
            [key]: {
                ...existingStage,
                [period]: { ...existingPeriod, [slot]: value },
            },
        };
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { vpdOptimalOverrides: updated } });
    }
    _resetVpdOptimal() {
        this._t({ type: 'UPDATE_ENV_DRAFT', partial: { vpdOptimalOverrides: {} } });
    }
    _renderVpdTargetsTab() {
        return x `
      <config-vpd-targets-tab
        .vm=${createVpdTargetsTabViewModel(this._sm, { openStageId: this._openVpdStageId })}
        @toggle-stage=${(e) => {
            this._openVpdStageId = this._openVpdStageId === e.detail.key ? '' : e.detail.key;
        }}
        @update-vpd-optimal=${(e) => this._updateVpdOptimal(e.detail.key, e.detail.period, e.detail.slot, e.detail.value)}
        @reset-vpd-optimal=${this._resetVpdOptimal}
      ></config-vpd-targets-tab>
    `;
    }
    render() {
        if (!this.open)
            return x ``;
        const heatmapSub = this._sm.tabs.heatmap.sub;
        const subareasSub = this._sm.tabs.subareas.sub;
        if (heatmapSub.kind === 'editing-group') {
            return x `
        <sensor-group-dialog
          .open=${true}
          .hass=${this.hass}
          .sensorGroup=${heatmapSub.group}
          @close=${(e) => {
                e.stopPropagation();
                this._t({ type: 'CLOSE_GROUP_DIALOG' });
            }}
          @save-sensor-group=${this._handleSaveGroup}
        ></sensor-group-dialog>
      `;
        }
        if (subareasSub.kind === 'editing-subarea') {
            return x `
        <subarea-config-dialog
          .open=${true}
          .hass=${this.hass}
          .growspaceId=${this._subareasGrowspaceId}
          .subarea=${subareasSub.subarea}
          @close=${(e) => {
                e.stopPropagation();
                this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
            }}
          @subarea-updated=${(e) => {
                e.stopPropagation();
                this._t({ type: 'CLOSE_SUBAREA_DIALOG' });
                this._loadSubareas();
            }}
        ></subarea-config-dialog>
      `;
        }
        const showContextBar = this.currentTab !== ConfigTab.GROWSPACES && this.currentTab !== ConfigTab.NOTIFICATIONS;
        const showRail = !this.allowedTabs || this.allowedTabs.length !== 1;
        const growspaceSub = this._sm.tabs.growspaces.sub;
        const caps = this._caps;
        const environmentSaveVisible = ENVIRONMENT_SAVE_TABS.has(this.currentTab);
        const combinedSaveVisible = this.currentTab === ConfigTab.GROWSPACES && growspaceSub.kind === 'editing';
        const showEnvironmentSaveGate = !caps.canSaveEnvironment && (environmentSaveVisible || combinedSaveVisible);
        return x `
      <!-- Scrim dismissal stays disabled so an incidental backdrop tap cannot destroy a mobile form. -->
      <ha-dialog
        open
        .preventScrimClose=${true}
        @opened=${this._bindDialogCancelGuard}
        @closed=${this._close}
        without-header
        scrimClickAction=""
        escapeKeyAction=""
        width="large"
      >
        <div class="glass-dialog-container">
          <!-- Header -->
          <div class="dialog-header">
            <div class="dialog-icon">${this._icon(mdiCog, 24)}</div>
            <div class="dialog-title-group">
              <div style="display:flex;align-items:center;gap:6px;">
                <h2 class="dialog-title">Configuration</h2>
                <gs-help-tooltip
                  content="Configure this growspace — sensor assignments, name, and integration settings."
                  placement="bottom"
                  label="Configuration"
                ></gs-help-tooltip>
              </div>
              <div class="dialog-subtitle">Manage growspaces &amp; settings</div>
            </div>
            <button
              class="md3-button text"
              @click=${this._close}
              style="min-width:auto;padding:8px;"
            >
              ${this._icon(mdiClose, 24)}
            </button>
          </div>

          <!-- Body: Rail + Content -->
          <div class="cfg-body">
            <!-- Left Rail -->
            ${showRail
            ? x `
                  <div
                    class="cfg-rail"
                    role="tablist"
                    aria-label="Configuration sections"
                    aria-orientation="vertical"
                  >
                    <div class="cfg-rail-caps" role="presentation">Setup</div>
                    ${this._navItem(ConfigTab.GROWSPACES, mdiViewDashboard, 'Growspaces')}
                    ${this._navItem(ConfigTab.NOTIFICATIONS, mdiBell, 'Notifications')}

                    <div class="cfg-rail-caps" role="presentation">Environment</div>
                    ${this._navItem(ConfigTab.SENSORS, mdiThermometer, 'Sensors')}
                    ${this._navItem(ConfigTab.CLIMATE, mdiFan, 'Climate')}
                    ${this._navItem(ConfigTab.GROWLIGHT, mdiWhiteBalanceSunny, 'Growlights')}
                    ${this._navItem(ConfigTab.HUMIDITY, mdiWaterPercent, 'Humidity')}

                    <div class="cfg-rail-caps" role="presentation">Equipment</div>
                    ${this._navItem(ConfigTab.IRRIGATION, mdiGauge, 'Irrigation')}
                    ${this._navItem(ConfigTab.TANKS, mdiWater, 'Tanks')}

                    <div class="cfg-rail-caps" role="presentation">Advanced</div>
                    ${this._navItem(ConfigTab.VISION, mdiCamera, 'Vision AI')}
                    ${this._navItem(ConfigTab.HEATMAP, mdiViewGrid, '3D Heatmap')}
                    ${this._navItem(ConfigTab.SUBAREAS, mdiFloorPlan, 'Subareas')}
                    ${this._navItem(ConfigTab.VPD_TARGETS, mdiTune, 'VPD Targets')}
                  </div>
                `
            : E}

            <!-- Content Area -->
            <div
              id="config-tabpanel"
              class="cfg-content"
              role=${showRail ? 'tabpanel' : E}
              aria-labelledby=${showRail ? `config-tab-${this.currentTab}` : E}
            >
              <!-- Context bar: growspace selector (all sections except Growspaces) -->
              ${showContextBar
            ? x `
                    <div class="cfg-context-bar">
                      <span class="cfg-context-label">Growspace</span>
                      <!--
                        live(): a refused switch deliberately leaves the draft untouched,
                        so the bound id never changes and a plain .value binding would let
                        the select keep displaying the growspace the user backed out of.
                        Dirty-checking against the live DOM value forces it back. ?selected
                        below still carries first render, where .value commits before the
                        options exist.
                      -->
                      <select
                        class="cfg-context-select"
                        .value=${l(this._sm.environmentDraft.selectedGrowspaceId)}
                        @change=${this._handleEnvGrowspaceChange}
                      >
                        <option value="">Select...</option>
                        ${Object.entries(this.growspaceOptions).map(([id, name]) => x `
                            <option
                              value="${id}"
                              ?selected=${id === this._sm.environmentDraft.selectedGrowspaceId}
                            >
                              ${name}
                            </option>
                          `)}
                      </select>
                    </div>
                  `
            : E}

              <!-- Scrollable content -->
              <div class="cfg-scroll">
                ${this.currentTab === ConfigTab.GROWSPACES ? this._renderGrowspacesTab() : E}
                ${this.currentTab === ConfigTab.NOTIFICATIONS
            ? this._renderNotificationsTab()
            : E}
                ${this.currentTab === ConfigTab.SENSORS ? this._renderSensorsTab() : E}
                ${this.currentTab === ConfigTab.CLIMATE ? this._renderClimateTab() : E}
                ${this.currentTab === ConfigTab.GROWLIGHT ? this._renderGrowlightTab() : E}
                ${this.currentTab === ConfigTab.HUMIDITY ? this._renderHumidityTab() : E}
                ${this.currentTab === ConfigTab.IRRIGATION ? this._renderIrrigationTab() : E}
                ${this.currentTab === ConfigTab.TANKS ? this._renderTanksTab() : E}
                ${this.currentTab === ConfigTab.VISION ? this._renderVisionTab() : E}
                ${this.currentTab === ConfigTab.HEATMAP ? this._renderHeatmapTab() : E}
                ${this.currentTab === ConfigTab.SUBAREAS ? this._renderSubareasTab() : E}
                ${this.currentTab === ConfigTab.VPD_TARGETS ? this._renderVpdTargetsTab() : E}
              </div>
            </div>
          </div>

          ${showEnvironmentSaveGate && caps.environmentSaveBlockReason
            ? x `
                <div
                  id="environment-save-requirement"
                  class="save-gate-message"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    >${this._environmentSaveBlockedMessage(caps.environmentSaveBlockReason)} ·</span
                  >
                  <button class="md3-button text" type="button" @click=${this._goToSensors}>
                    ${this._localize('config.go_to_sensors')}
                  </button>
                </div>
              `
            : E}

          <!-- Footer -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${this._close}>Cancel</button>

            ${(() => {
            if (this.currentTab !== ConfigTab.GROWSPACES)
                return E;
            if (growspaceSub.kind === 'confirm-remove-environment' ||
                growspaceSub.kind === 'removing-environment') {
                const removing = growspaceSub.kind === 'removing-environment';
                return x `
                  <button
                    class="md3-button tonal keep-environment-action remove-environment-action"
                    @click=${this._cancelRemoveEnvironment}
                    ?disabled=${removing}
                  >
                    Keep Environment
                  </button>
                  <button
                    class="md3-button danger remove-environment-action"
                    @click=${this._confirmRemoveEnvironment}
                    ?disabled=${removing}
                    aria-busy=${removing ? 'true' : 'false'}
                  >
                    ${removing ? 'Removing…' : 'Confirm Remove'}
                  </button>
                `;
            }
            if (growspaceSub.kind === 'confirm-delete') {
                return x `
                  <button class="md3-button tonal" @click=${this._cancelDeleteGrowspace}>
                    No, Keep It
                  </button>
                  <button class="md3-button danger" @click=${this._confirmDeleteGrowspace}>
                    Confirm Delete
                  </button>
                `;
            }
            if (growspaceSub.kind === 'adding') {
                return x `
                  <button class="md3-button primary" @click=${this._submitAddGrowspace}>
                    Add Growspace
                  </button>
                `;
            }
            if (growspaceSub.kind === 'editing') {
                return x `
                  <button class="md3-button tonal danger" @click=${this._submitDeleteGrowspace}>
                    ${this._icon(mdiDelete, 18)} Delete
                  </button>
                  <button
                    class="md3-button primary"
                    @click=${this._submitGrowspaceAndEnv}
                    ?disabled=${!caps.canSaveEnvironment}
                    aria-describedby=${!caps.canSaveEnvironment
                    ? 'environment-save-requirement'
                    : E}
                  >
                    ${this._localize('config.save_growspace_and_environment')}
                  </button>
                `;
            }
            return E;
        })()}
            ${environmentSaveVisible
            ? x `
                  <button
                    class="md3-button primary"
                    @click=${this._submitEnvironment}
                    ?disabled=${!caps.canSaveEnvironment}
                    aria-describedby=${!caps.canSaveEnvironment
                ? 'environment-save-requirement'
                : E}
                  >
                    ${this._localize('config.save_environment')}
                  </button>
                `
            : E}
            ${this.currentTab === ConfigTab.NOTIFICATIONS
            ? x `
                  <button class="md3-button primary" @click=${this._submitNotifications}>
                    Save Notifications
                  </button>
                `
            : E}
            ${this.currentTab === ConfigTab.VISION
            ? x `
                  <button class="md3-button primary" @click=${this._submitVisionCheckupConfig}>
                    ${this._localize('config.save_vision_settings')}
                  </button>
                `
            : E}
          </div>
          ${this._sm.status.kind === 'confirm-discard' ? this._renderConfirmDiscard() : E}
        </div>
      </ha-dialog>
    `;
    }
};
ConfigDialog.styles = [
    dialogStyles,
    i$1 `
      :host {
        display: block;
      }

      /* ── Rail layout ─────────────────────────────────────── */
      .cfg-body {
        display: flex;
        flex: 1 1 auto;
        overflow: hidden;
        min-height: 0;
      }

      .cfg-rail {
        flex: 0 0 210px;
        background: rgba(0, 0, 0, 0.2);
        border-right: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 6px 0 12px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
      }

      .cfg-rail-caps {
        font-size: var(--font-size-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.4));
        padding: 14px 16px 4px;
      }

      .cfg-nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 44px;
        box-sizing: border-box;
        padding: 8px 12px 8px 16px;
        border: 0;
        border-left: 2px solid transparent;
        background: transparent;
        font-family: inherit;
        font-size: 1rem;
        text-align: left;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
      }

      .cfg-nav-item:hover {
        color: var(--primary-text-color, #fff);
        background: rgba(255, 255, 255, 0.04);
      }

      .cfg-nav-item.active {
        color: var(--primary-color, #4caf50);
        background: rgba(76, 175, 80, 0.1);
        border-left-color: var(--primary-color, #4caf50);
        font-weight: 500;
      }

      .cfg-nav-item:focus-visible {
        outline: 2px solid var(--primary-text-color, #fff);
        outline-offset: -3px;
      }

      .cfg-nav-item svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        flex-shrink: 0;
        opacity: 0.85;
      }

      /* ── Content area ───────────────────────────────────── */
      .cfg-content {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        min-width: 0;
      }

      .cfg-context-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
      }

      .cfg-context-label {
        font-size: 0.785714rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        white-space: nowrap;
      }

      .cfg-context-select {
        height: 34px;
        padding: 0 10px;
        border-radius: var(--border-radius-sm, 8px);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: var(--primary-text-color, #fff);
        font-family: inherit;
        font-size: 1rem;
        outline: none;
        min-width: 160px;
      }

      .cfg-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
      }

      /* ── Growspaces master/detail ───────────────────────── */
      .cfg-master-detail {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .cfg-master-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        padding-right: 2px;
        scrollbar-width: thin;
      }

      .cfg-gs-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: var(--border-radius-sm, 8px);
        border: 1px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 1rem;
      }

      .cfg-gs-row:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      .cfg-gs-row.active {
        background: rgba(76, 175, 80, 0.08);
        border-color: rgba(76, 175, 80, 0.25);
      }

      .cfg-gs-row .gs-name {
        flex: 1;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cfg-gs-row .gs-meta {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        white-space: nowrap;
      }

      .cfg-master-add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 38px;
        margin-top: 8px;
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: var(--border-radius-sm, 8px);
        background: transparent;
        color: var(--primary-color, #4caf50);
        font-family: inherit;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        width: 100%;
      }

      .cfg-master-add-btn:hover {
        background: rgba(76, 175, 80, 0.06);
        border-color: var(--primary-color, #4caf50);
      }

      .cfg-detail-pane {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-right: 2px;
        scrollbar-width: thin;
      }

      /* ── Accordion (humidity stages) ─────────────────────── */
      .acc-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        border-radius: var(--border-radius-md, 12px);
        overflow: hidden;
      }

      .acc-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 16px;
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }

      .acc-head:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      .acc-stage-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .acc-head-title {
        flex: 1;
        font-size: var(--font-size-sm);
        font-weight: 500;
      }

      .acc-head-desc {
        font-size: 0.857143rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }

      .acc-chev {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        transition: transform 0.2s;
        flex-shrink: 0;
      }

      .acc-chev.open {
        transform: rotate(180deg);
      }

      .acc-body {
        padding: 16px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .acc-cycle-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .acc-device-block {
        background: rgba(0, 0, 0, 0.15);
        border-radius: var(--border-radius-md, 12px);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .acc-device-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 500;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
      }

      .acc-device-header svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
        opacity: 0.8;
      }

      .acc-cycle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--font-size-supporting);
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }

      .acc-cycle-row svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
      }

      /* ── Form utilities ──────────────────────────────────── */
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .row-col-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }

      .checkbox-label input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      /* Matches the feed-and-water discard pattern on the configuration glass sheet. */
      .confirm-discard-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .confirm-discard-box {
        width: min(100%, 360px);
        padding: 24px;
        box-sizing: border-box;
        border-radius: var(--border-radius-lg, 16px);
        background: var(--card-background-color, #1e1e1e);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
      }

      .confirm-discard-box h3 {
        margin: 0 0 8px;
        font-size: 1.142857rem;
        font-weight: 500;
      }

      .confirm-discard-box p {
        margin: 0 0 20px;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 1rem;
        line-height: 1.5;
      }

      .confirm-discard-actions {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }

      .save-gate-message {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        padding: 12px 24px 0;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.2));
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        font-size: 1rem;
        line-height: 1.4;
        flex-wrap: wrap;
      }

      .save-gate-message + .button-group {
        border-top: 0;
        padding-top: 8px;
      }

      .save-gate-message .md3-button {
        flex: 0 0 auto;
      }

      .remove-environment-action {
        min-height: 44px;
      }

      .entity-select-container {
        position: relative;
        z-index: 5;
      }

      .entity-select-container .md3-input-group {
        margin-bottom: 0;
      }

      .form-section .entity-select-container {
        margin-bottom: 0;
      }

      @media (max-width: 500px) {
        .glass-dialog-container {
          width: 100vw;
          max-width: 100%;
          height: 100vh;
          border-radius: 0;
        }
        .cfg-rail {
          flex: 0 0 52px;
        }
        .cfg-nav-item {
          justify-content: center;
          padding: 0;
        }
        .cfg-nav-item span {
          display: none;
        }
        .cfg-rail-caps {
          display: none;
        }
        .cfg-scroll {
          padding: 14px;
        }
        .cfg-master-detail {
          grid-template-columns: 1fr;
        }
        .acc-cycle-grid {
          grid-template-columns: 1fr;
        }
        .row-col-grid {
          grid-template-columns: 1fr;
        }
        .save-gate-message {
          justify-content: flex-start;
          padding-inline: 16px;
        }
      }
    `,
    i$1 `
      .md3-input-group {
        border-radius: 8px 8px 2px 2px;
      }
      .md3-label {
        text-transform: uppercase;
        letter-spacing: 0.4px;
        font-size: 0.785714rem;
      }
      .cfg-context-select {
        border-radius: 8px 8px 2px 2px;
      }
      .cfg-context-select option,
      .md3-input option,
      select option {
        background: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, #fff);
      }
    `,
];
__decorate([
    n({ type: Boolean, reflect: true })
], ConfigDialog.prototype, "open", void 0);
__decorate([
    e$1({ context: hassContext }),
    n({ attribute: false })
], ConfigDialog.prototype, "hass", void 0);
__decorate([
    n({ type: Object })
], ConfigDialog.prototype, "growspaceOptions", void 0);
__decorate([
    n({ attribute: false })
], ConfigDialog.prototype, "devices", void 0);
__decorate([
    n({ type: String })
], ConfigDialog.prototype, "initialTab", void 0);
__decorate([
    n({ type: String })
], ConfigDialog.prototype, "scrollToField", void 0);
__decorate([
    n({ attribute: false })
], ConfigDialog.prototype, "allowedTabs", void 0);
__decorate([
    n({ type: String })
], ConfigDialog.prototype, "growspaceId", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_sm", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_subareas", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_subareasLoading", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_openHumidityStageId", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_openVpdStageId", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_acInfinityPrefillWarnings", void 0);
__decorate([
    r()
], ConfigDialog.prototype, "_openClimateStageVpdId", void 0);
ConfigDialog = __decorate([
    t$1('config-dialog')
], ConfigDialog);

var configDialog = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get ConfigDialog () { return ConfigDialog; }
});

export { applyEnvironmentChange as a, configDialog as c };
//# sourceMappingURL=growspace-config-dialog-BsWsejcO.js.map
