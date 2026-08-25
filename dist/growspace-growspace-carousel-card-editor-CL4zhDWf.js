/*! growspace-e2e-build source=9b137ce7ec01bed8465d598adf7a96694e132853233772accb27d94baea9c9bc id=0d3e39c638bbc87b77dd49a6c2ca64fc */
import { i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-CQsIabSR.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-lc3tLS0M.js';
import { c as computeEditorLabel } from './growspace-editor-utils-xI8Us4hu.js';

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
//# sourceMappingURL=growspace-growspace-carousel-card-editor-CL4zhDWf.js.map
