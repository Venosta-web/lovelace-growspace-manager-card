/*! growspace-e2e-build source=0dff46336edb76780e872968e1d70b42d43fb85ddb5d9e59bf5910bc8b1949d9 id=0c01cf4a8d1e5db32fbf36d0c235915c */
const { g: i, x, i: i$1, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-zxhnK-tX.js';
import { c as computeEditorLabel } from './growspace-editor-utils-43VsMuxd.js';

let GrowspaceCarouselCardEditor = class GrowspaceCarouselCardEditor extends i {
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
GrowspaceCarouselCardEditor.styles = i$1 `
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
//# sourceMappingURL=growspace-growspace-carousel-card-editor-Bj1L1ApT.js.map
