/*! growspace-e2e-build source=511fe0e7fe12ce4df9e37a0801688e5793bcba536c9ac6c3c760a587aabfef98 id=e126c4479269053f47c70a92f94efc68 */
import { c7 as sharedStyles, i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-Br_gWMCF.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-CpMMLBx-.js';
import { c as computeEditorLabel } from './growspace-editor-utils-C3WRYX1D.js';

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
//# sourceMappingURL=growspace-growspace-logbook-card-editor-BLzcLM7S.js.map
