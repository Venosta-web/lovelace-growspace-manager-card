/*! growspace-e2e-build source=b6b05ae524cd2e11a6a06518cd9be2488305ab86f0a35f373cd542c6cd6c96da id=aa363b519f9ab8c078f07001cbf469dc */
import { i, _ as __decorate, n, t, e as i$1, x } from './growspace-index--V-rhnaO.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-jRNlY4bb.js';
import { c as computeEditorLabel } from './growspace-editor-utils-fYti7O4C.js';

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
//# sourceMappingURL=growspace-growspace-carousel-card-editor-wN4o0QvA.js.map
