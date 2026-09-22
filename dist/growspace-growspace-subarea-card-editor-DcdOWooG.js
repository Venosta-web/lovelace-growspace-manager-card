/*! growspace-e2e-build source=1baf53fffffa25c66a6d961a1102766be67a2ce078e41deb06b90357c6353e87 id=5d3c6c411160cbc4d84036b2139047f0 */
const { g: i, dR: getSubareas, x, bR: sharedStyles, i: i$1, _: __decorate, n, w: r, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-DKizuXno.js';
import { c as computeEditorLabel } from './growspace-editor-utils-BiMRxMOS.js';

let GrowspaceSubareaCardEditor = class GrowspaceSubareaCardEditor extends i {
    constructor() {
        super(...arguments);
        this._subareas = [];
        this._loadingSubareas = false;
        this._gsController = new GrowspaceOptionsController(this);
    }
    setConfig(config) {
        const { growspace_id: legacyGrowspaceId, ...currentConfig } = config;
        this._config = {
            ...currentConfig,
            default_growspace: config.default_growspace ?? legacyGrowspaceId ?? '',
        };
        if (this._config.default_growspace) {
            this._loadSubareas(this._config.default_growspace);
        }
    }
    willUpdate(changedProps) {
        if (changedProps.has('hass') && this.hass) {
            this._gsController.update(this.hass);
            const gid = this._config?.default_growspace;
            if (gid && this._lastLoadedId !== gid) {
                this._lastLoadedId = gid;
                this._loadSubareas(gid);
            }
        }
    }
    async _loadSubareas(growspaceId) {
        if (!growspaceId || !this.hass)
            return;
        this._loadingSubareas = true;
        this._subareas = [];
        try {
            this._subareas = await getSubareas(growspaceId);
        }
        catch (err) {
            console.error('[GrowspaceSubareaCardEditor] Failed to load subareas:', err);
            this._subareas = [];
        }
        finally {
            this._loadingSubareas = false;
        }
    }
    _computeSchema() {
        const subareaOptions = [
            {
                label: this._config?.default_growspace
                    ? this._subareas.length
                        ? 'Select a subarea...'
                        : 'No subareas found'
                    : 'Select a growspace first',
                value: '',
            },
            ...this._subareas.map((sa) => ({ label: sa.name, value: sa.id })),
        ];
        return this._gsController.filterUnavailableFields([
            {
                name: 'default_growspace',
                selector: {
                    select: {
                        options: [
                            { label: 'Select a growspace...', value: '' },
                            ...this._gsController.options.map((gs) => ({ label: gs.name, value: gs.id })),
                        ],
                    },
                },
            },
            { name: 'subarea_id', selector: { select: { options: subareaOptions } } },
            {
                name: 'hidden_chips',
                selector: {
                    select: {
                        multiple: true,
                        options: [
                            { label: 'Light', value: 'light' },
                            { label: 'Exhaust Fan', value: 'exhaust' },
                            { label: 'Circulation Fan', value: 'circulation_fan' },
                            { label: 'Humidifier', value: 'humidifier' },
                            { label: 'Dehumidifier', value: 'dehumidifier' },
                            { label: 'Temperature', value: 'temperature' },
                            { label: 'Humidity', value: 'humidity' },
                            { label: 'VPD', value: 'vpd' },
                            { label: 'CO2', value: 'co2' },
                            { label: 'Soil Moisture', value: 'soil_moisture' },
                            { label: 'Substrate Temperature', value: 'substrate_temperature' },
                            { label: 'Tank Level', value: 'irrigation_tank_level' },
                            { label: 'DLI', value: 'dli' },
                            { label: 'Energy', value: 'energy' },
                            { label: 'Water', value: 'water' },
                            { label: 'Optimal Conditions', value: 'optimal' },
                            { label: 'Crop Steering', value: 'crop_steering' },
                            { label: 'Steering Phase', value: 'steering_phase' },
                        ],
                    },
                },
            },
        ]);
    }
    _valueChanged(ev) {
        if (!this._config || !this.hass)
            return;
        const newConfig = ev.detail.value;
        if (newConfig.default_growspace !== this._config.default_growspace) {
            newConfig.subarea_id = '';
            this._loadSubareas(newConfig.default_growspace);
        }
        this._config = newConfig;
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        if (!this.hass || !this._config)
            return x ``;
        return x `
      <div class="card-config">
        ${this._loadingSubareas ? x `<span class="loading-text">Loading subareas...</span>` : ''}
        ${this._gsController.renderEmptyState(this.hass?.language)}
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="info-text">
          Displays environment sensors and device status for the selected subarea within a
          growspace.
        </div>
      </div>
    `;
    }
};
GrowspaceSubareaCardEditor.styles = [
    sharedStyles,
    i$1 `
      .card-config {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .info-text {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
      .loading-text {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        font-style: italic;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceSubareaCardEditor.prototype, "hass", void 0);
__decorate([
    r()
], GrowspaceSubareaCardEditor.prototype, "_config", void 0);
__decorate([
    r()
], GrowspaceSubareaCardEditor.prototype, "_subareas", void 0);
__decorate([
    r()
], GrowspaceSubareaCardEditor.prototype, "_loadingSubareas", void 0);
GrowspaceSubareaCardEditor = __decorate([
    t('growspace-subarea-card-editor')
], GrowspaceSubareaCardEditor);

export { GrowspaceSubareaCardEditor };
//# sourceMappingURL=growspace-growspace-subarea-card-editor-DcdOWooG.js.map
