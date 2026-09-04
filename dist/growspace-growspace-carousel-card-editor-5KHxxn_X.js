/*! growspace-e2e-build source=2e889c2b34d29831e2a9ea84775b90a4da9f3cee9ea88a606cf6b525559cfb18 id=705911f9e6b0c1280f6dfdcefba8c7d7 */
const { g: i, x, i: i$1, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-Cq_Z013Y.js';
import { c as computeEditorLabel } from './growspace-editor-utils-C2fpoH8R.js';

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
//# sourceMappingURL=growspace-growspace-carousel-card-editor-5KHxxn_X.js.map
