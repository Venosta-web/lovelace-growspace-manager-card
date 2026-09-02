/*! growspace-e2e-build source=50faae1806efe7d97aaf12bf7c640b1f000952f5bca877a23586354dfc19a033 id=85c6866104b824fba7a355b85f581e25 */
import { dr as METRIC_SORT_ORDER, ds as METRIC_CONFIG, dt as MetricKey, cl as sharedStyles, i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-90i8id-N.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-6omegroG.js';
import { c as computeEditorLabel } from './growspace-editor-utils-B9BDM1M8.js';

const GRAPH_OPTIONS = METRIC_SORT_ORDER.map((metric) => ({
    label: metric === MetricKey.STEERING_PHASE ? 'Steering Phase' : METRIC_CONFIG[metric].title,
    value: metric,
}));
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
            {
                name: 'hidden_graphs',
                selector: {
                    select: {
                        multiple: true,
                        options: GRAPH_OPTIONS,
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
          dashboard reload. Exiting the Wall remains temporary until the next reload. Hidden Graphs
          are omitted from both the card and Graph Wall without changing graphs opened elsewhere.
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
//# sourceMappingURL=growspace-growspace-analytics-card-editor-Cy7Ii2Vc.js.map
