/*! growspace-e2e-build source=a23cdbe3e44763ed2adee8b26e7113c5a62fa7c490561ad40db85e2453b44dda id=13ae24dd807a64cd8095b3e25b80d75f */
import { cf as sharedStyles, i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-D3nls2Ex.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-CAABSV8V.js';
import { c as computeEditorLabel } from './growspace-editor-utils-BMlmFwf9.js';

let GrowspaceLogbookCardEditor = class GrowspaceLogbookCardEditor extends i$1 {
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
                name: 'default_view',
                selector: {
                    select: {
                        options: [
                            { label: 'List View', value: 'list' },
                            { label: 'Timeline', value: 'timeline' },
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
          Displays the growspace events logbook with switchable List and Timeline views.
        </div>
      </div>
    `;
    }
};
GrowspaceLogbookCardEditor.styles = [
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
], GrowspaceLogbookCardEditor.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLogbookCardEditor.prototype, "_config", void 0);
GrowspaceLogbookCardEditor = __decorate([
    t('growspace-logbook-card-editor')
], GrowspaceLogbookCardEditor);

export { GrowspaceLogbookCardEditor };
//# sourceMappingURL=growspace-growspace-logbook-card-editor-DFRZan2r.js.map
