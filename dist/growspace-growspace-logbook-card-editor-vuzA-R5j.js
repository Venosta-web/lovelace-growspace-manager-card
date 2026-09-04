/*! growspace-e2e-build source=4237f291da6abee248c570e37c180f847de859ca14a360f75ebd75f2ce138b34 id=3f336d94c58e405791c15d113a927a0e */
const { g: i, x, bK: sharedStyles, i: i$1, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-BSkji_QO.js';
import { c as computeEditorLabel } from './growspace-editor-utils-BIyYneDn.js';

let GrowspaceLogbookCardEditor = class GrowspaceLogbookCardEditor extends i {
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
], GrowspaceLogbookCardEditor.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLogbookCardEditor.prototype, "_config", void 0);
GrowspaceLogbookCardEditor = __decorate([
    t('growspace-logbook-card-editor')
], GrowspaceLogbookCardEditor);

export { GrowspaceLogbookCardEditor };
//# sourceMappingURL=growspace-growspace-logbook-card-editor-vuzA-R5j.js.map
