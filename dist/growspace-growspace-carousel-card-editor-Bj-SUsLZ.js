/*! growspace-e2e-build source=50faae1806efe7d97aaf12bf7c640b1f000952f5bca877a23586354dfc19a033 id=85c6866104b824fba7a355b85f581e25 */
import { i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-90i8id-N.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-6omegroG.js';
import { c as computeEditorLabel } from './growspace-editor-utils-B9BDM1M8.js';

let GrowspaceCarouselCardEditor = class GrowspaceCarouselCardEditor extends i$1 {
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
        return this._gsController.filterUnavailableFields([
            {
                name: 'growspaces',
                selector: {
                    select: {
                        multiple: true,
                        custom_value: true,
                        options: this._gsController.options.map((gs) => ({ label: gs.name, value: gs.id })),
                    },
                },
            },
            {
                name: 'interval',
                selector: {
                    number: {
                        min: 5,
                        max: 300,
                        step: 1,
                        unit_of_measurement: 'seconds',
                    },
                },
            },
            {
                name: 'filter_empty',
                selector: { boolean: {} },
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
GrowspaceCarouselCardEditor.styles = i `
    ha-form {
      display: block;
      margin-bottom: 24px;
    }
  `;
__decorate([
    n({ attribute: false })
], GrowspaceCarouselCardEditor.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceCarouselCardEditor.prototype, "_config", void 0);
GrowspaceCarouselCardEditor = __decorate([
    t('growspace-carousel-card-editor')
], GrowspaceCarouselCardEditor);

export { GrowspaceCarouselCardEditor };
//# sourceMappingURL=growspace-growspace-carousel-card-editor-Bj-SUsLZ.js.map
