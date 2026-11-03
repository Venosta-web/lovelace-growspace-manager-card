/*! growspace-e2e-build source=ebaf56ae70c264b3853898c96d721e7750b8f907d426d425633e211bd257e8a6 id=d09c01be3773fe87fde33251bcde0661 */
import { cg as sharedStyles, i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-BsfmE8Mc.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-vYJa8DJP.js';
import { c as computeEditorLabel } from './growspace-editor-utils-BHQpIrVL.js';

let GrowspaceAnalyticsCardEditor = class GrowspaceAnalyticsCardEditor extends i$1 {
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
            {
                name: 'start_in_graph_wall',
                selector: { boolean: {} },
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
        if (!this.hass || !this._config)
            return x ``;
        return x `
      <div class="card-config">
        ${this._gsController.renderEmptyState(this.hass?.language)}
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <div class="info-text">
          Enable Start in Graph Wall to reopen this card in its desktop fullscreen view after a
          dashboard reload. Exiting the Wall remains temporary until the next reload.
        </div>
      </div>
    `;
    }
};
GrowspaceAnalyticsCardEditor.styles = [
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
        margin-top: 8px;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceAnalyticsCardEditor.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceAnalyticsCardEditor.prototype, "_config", void 0);
GrowspaceAnalyticsCardEditor = __decorate([
    t('growspace-analytics-card-editor')
], GrowspaceAnalyticsCardEditor);

export { GrowspaceAnalyticsCardEditor };
//# sourceMappingURL=growspace-growspace-analytics-card-editor-CwdxK_SI.js.map
