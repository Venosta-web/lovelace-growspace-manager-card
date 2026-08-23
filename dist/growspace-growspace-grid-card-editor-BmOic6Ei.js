/*! growspace-e2e-build source=ce2eb2db47db12c7ec8195dd67d28e5aeded01b6bb240e0feca04926559243b5 id=9eb1e51610c703e930c9d732d3a22b17 */
import { i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-BVjyHnuu.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-D1allWHP.js';
import { c as computeEditorLabel } from './growspace-editor-utils-D2W91o07.js';

let GrowspaceGridCardEditor = class GrowspaceGridCardEditor extends i$1 {
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
    render() {
        if (!this._config)
            return x ``;
        return x `
      <div class="card-config">
        <div class="info-box">
          The Grid Card is a localized view locked to the Standard tracking interface. Environment
          headers and charts are removed.
        </div>
        ${this._gsController.renderEmptyState(this.hass?.language)}
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._computeSchema()}
          .computeLabel=${computeEditorLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>
    `;
    }
    _valueChanged(ev) {
        if (!this._config)
            return;
        this._config = ev.detail.value;
        this.dispatchEvent(new CustomEvent('config-changed', {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
        }));
    }
};
GrowspaceGridCardEditor.styles = i `
    .card-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-box {
      background: rgba(var(--rgb-primary-color), 0.1);
      color: var(--primary-text-color);
      padding: 12px;
      border-radius: 8px;
      font-size: 0.9rem;
      border-left: 4px solid var(--primary-color); /* impeccable-disable-line side-tab -- advisory info box, not a content-card side tab */
    }
  `;
__decorate([
    n({ attribute: false })
], GrowspaceGridCardEditor.prototype, "hass", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceGridCardEditor.prototype, "_config", void 0);
GrowspaceGridCardEditor = __decorate([
    t('growspace-grid-card-editor')
], GrowspaceGridCardEditor);

export { GrowspaceGridCardEditor };
//# sourceMappingURL=growspace-growspace-grid-card-editor-BmOic6Ei.js.map
