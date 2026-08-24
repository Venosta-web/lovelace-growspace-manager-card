/*! growspace-e2e-build source=035fd9910dd2068f4439ecf897a7c21e4b92957e46649330f3a1fe4b15292ad9 id=7f4a8434e9689d82797a62e399ef94e8 */
import { c7 as sharedStyles, i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-WTxRB5iw.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-BFxBWanG.js';
import { c as computeEditorLabel } from './growspace-editor-utils-zcREyfdU.js';

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
          This card will permanently display the analytics charts and history for the selected
          growspace.
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
//# sourceMappingURL=growspace-growspace-analytics-card-editor-D1-2cmJc.js.map
