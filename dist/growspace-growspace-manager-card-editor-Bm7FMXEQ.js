/*! growspace-e2e-build source=1fc9a443807ceffda4ab3adbdb94c0756f5edeade93a7172c2f173fd2e632f6d id=63e423f5bfd4639eb90afcad1793d689 */
import { _ as __decorate, n, t, e as i, x, dj as localize } from './growspace-index-DNJsh6sY.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-DxojAae-.js';
import { c as computeEditorLabel } from './growspace-editor-utils-BvIGFcBB.js';

let GrowspaceManagerCardEditor = class GrowspaceManagerCardEditor extends i {
    constructor() {
        super(...arguments);
        this._gsController = new GrowspaceOptionsController(this);
    }
    setConfig(config) {
        this._config = config;
    }
    willUpdate(changedProps) {
        if (changedProps.has('hass') && this.hass) {
            this._gsController.update(this.hass);
        }
    }
    _computeSchema() {
        const lang = this.hass?.language;
        const l = (key) => localize(key, '', '', lang);
        return this._gsController.filterUnavailableFields([
            {
                name: 'default_growspace',
                selector: {
                    select: {
                        options: [
                            { label: l('editor.select_growspace'), value: '' },
                            ...this._gsController.options.map((gs) => ({ label: gs.name, value: gs.id })),
                        ],
                    },
                },
            },
            {
                name: 'initial_view_mode',
                selector: {
                    select: {
                        options: [
                            { label: l('editor.view_mode_standard'), value: 'standard' },
                            { label: l('editor.view_mode_compact'), value: 'compact' },
                            { label: l('editor.view_mode_header'), value: 'header' },
                        ],
                    },
                },
            },
            { name: 'keyboard_rotate_enabled', selector: { boolean: {} } },
            { name: 'keyboard_rotate_speed', selector: { number: { min: 0.1, max: 5.0, step: 0.1 } } },
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
    render() {
        if (!this._config)
            return x ``;
        return x `
      ${this._gsController.renderEmptyState(this.hass?.language)}
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._computeSchema()}
        .computeLabel=${computeEditorLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
    }
    _valueChanged(ev) {
        if (!this._config)
            return;
        this._config = ev.detail.value;
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
        }));
    }
};
__decorate([
    n({ attribute: false })
], GrowspaceManagerCardEditor.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceManagerCardEditor.prototype, "_config", void 0);
GrowspaceManagerCardEditor = __decorate([
    t('growspace-manager-card-editor')
], GrowspaceManagerCardEditor);

export { GrowspaceManagerCardEditor };
//# sourceMappingURL=growspace-growspace-manager-card-editor-Bm7FMXEQ.js.map
