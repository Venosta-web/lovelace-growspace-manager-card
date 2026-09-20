/*! growspace-e2e-build source=c972c1cbdb0077ae76a56779f5396e3ea2761f23f3ac0f41557682a941734024 id=8a2c5ee7c2c92c870a3e4b785488dec9 */
const { g: i, x, bR: sharedStyles, i: i$1, _: __decorate, n, w: r, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-TycSo6G5.js';

let GrowspaceTankCardEditor = class GrowspaceTankCardEditor extends i {
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
    i$1 `
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
//# sourceMappingURL=growspace-growspace-tank-card-editor-0yZ0472j.js.map
