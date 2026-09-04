/*! growspace-e2e-build source=2e889c2b34d29831e2a9ea84775b90a4da9f3cee9ea88a606cf6b525559cfb18 id=705911f9e6b0c1280f6dfdcefba8c7d7 */
const { g: i, x, bQ: localize, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-Cq_Z013Y.js';
import { c as computeEditorLabel } from './growspace-editor-utils-C2fpoH8R.js';

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
//# sourceMappingURL=growspace-growspace-manager-card-editor-C7lEZvB-.js.map
