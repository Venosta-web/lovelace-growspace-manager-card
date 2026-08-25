/*! growspace-e2e-build source=c0572351ff44a7ffc90040a0460e1cba58ca7a01d83661d6abacb2f82a3940d8 id=ef6e05380f21e8ac70ad4c7ac7a1eee0 */
import { c8 as sharedStyles, i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-BGJC3v9u.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-5ScLwE84.js';
import { c as computeEditorLabel } from './growspace-editor-utils-CjndVrYW.js';

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
//# sourceMappingURL=growspace-growspace-analytics-card-editor-CsVMliNQ.js.map
