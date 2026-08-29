/*! growspace-e2e-build source=2e405f6377614b4c09efe2a11d4bf29141104befc1f7fe72f483c6881f545d09 id=0c045e5acea21995655b7f7484f9ee9f */
import { cf as sharedStyles, i, _ as __decorate, n, y as r, t, e as i$1, x } from './growspace-index-DJVYpYL8.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-DcDN2jIH.js';

let GrowspaceAiInsightCardEditor = class GrowspaceAiInsightCardEditor extends i$1 {
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
          This card will provide AI insights and chat functionality targeted toward the selected
          growspace.
        </div>
      </div>
    `;
    }
};
GrowspaceAiInsightCardEditor.styles = [
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
], GrowspaceAiInsightCardEditor.prototype, "hass", void 0);
__decorate([
    r()
], GrowspaceAiInsightCardEditor.prototype, "_config", void 0);
GrowspaceAiInsightCardEditor = __decorate([
    t('growspace-ai-insight-card-editor')
], GrowspaceAiInsightCardEditor);

export { GrowspaceAiInsightCardEditor };
//# sourceMappingURL=growspace-growspace-ai-insight-card-editor-aPxHk011.js.map
