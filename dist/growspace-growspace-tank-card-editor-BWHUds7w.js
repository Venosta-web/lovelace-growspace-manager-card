/*! growspace-e2e-build source=444781a78f4987a7f1a90be699bc48124417ae9e9e4813424fff503296f61922 id=c8cc1a097216e226f358a4adbffbb624 */
import { cf as sharedStyles, i, _ as __decorate, n, y as r, t, e as i$1, x } from './growspace-index-qx01dw3L.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-BQHxC_1N.js';

let GrowspaceTankCardEditor = class GrowspaceTankCardEditor extends i$1 {
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
    get _default_growspace() {
        return this._config?.default_growspace || '';
    }
    _computeSchema() {
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
        ]);
    }
    _valueChanged(ev) {
        if (!this._config || !this.hass)
            return;
        this._config = ev.detail.value;
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        if (!this.hass || !this._config) {
            return x ``;
        }
        return x `
      <div class="card-config">
        ${this._gsController.renderEmptyState(this.hass?.language)}
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${(s) => s.name === 'default_growspace' ? 'Target Growspace' : s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <div class="info-text">
          Displays all irrigation tanks configured for the selected growspace with live fill levels,
          depletion status, and time remaining.
        </div>
      </div>
    `;
    }
};
GrowspaceTankCardEditor.styles = [
    sharedStyles,
    i `
      .card-config {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .info-text {
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTankCardEditor.prototype, "hass", void 0);
__decorate([
    r()
], GrowspaceTankCardEditor.prototype, "_config", void 0);
GrowspaceTankCardEditor = __decorate([
    t('growspace-tank-card-editor')
], GrowspaceTankCardEditor);

export { GrowspaceTankCardEditor };
//# sourceMappingURL=growspace-growspace-tank-card-editor-BWHUds7w.js.map
