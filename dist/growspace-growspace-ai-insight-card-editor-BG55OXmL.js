/*! growspace-e2e-build source=c0572351ff44a7ffc90040a0460e1cba58ca7a01d83661d6abacb2f82a3940d8 id=ef6e05380f21e8ac70ad4c7ac7a1eee0 */
import { c8 as sharedStyles, i, _ as __decorate, n, y as r, t, e as i$1, x } from './growspace-index-BGJC3v9u.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-5ScLwE84.js';

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
//# sourceMappingURL=growspace-growspace-ai-insight-card-editor-BG55OXmL.js.map
