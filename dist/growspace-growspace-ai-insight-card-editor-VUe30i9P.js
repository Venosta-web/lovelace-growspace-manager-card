/*! growspace-e2e-build source=ce2c381a4aca03a062ea51e8f320567b525e00d1f2b00d072f0f8f91c9d72888 id=ae93e69837de59ef32e51f7ebc0b92db */
const { g: i, x, bK: sharedStyles, i: i$1, _: __decorate, n, A: r, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-AFsJm4c4.js';

let GrowspaceAiInsightCardEditor = class GrowspaceAiInsightCardEditor extends i {
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
//# sourceMappingURL=growspace-growspace-ai-insight-card-editor-VUe30i9P.js.map
