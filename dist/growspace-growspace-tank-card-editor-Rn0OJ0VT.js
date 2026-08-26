/*! growspace-e2e-build source=7e34598a8ba9b83b068aac746942cec358750b5e10013dceca1be7d6a0bf59a1 id=7b6a9cdd16dfdb85ba691d3a0903731f */
import { cf as sharedStyles, i, _ as __decorate, n, y as r, t, e as i$1, x } from './growspace-index-CitTgYoy.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-CVINUk7j.js';

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
//# sourceMappingURL=growspace-growspace-tank-card-editor-Rn0OJ0VT.js.map
