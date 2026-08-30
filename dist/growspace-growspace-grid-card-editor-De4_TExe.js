/*! growspace-e2e-build source=69026d666ee4ccf98d2489ddf2e5c06670111d7edb10720e91bc279bbfb0a241 id=ef6e61873b671f5a5ac6309ea568b252 */
import { i, _ as __decorate, n, t, e as i$1, x } from './growspace-index-C09HGO74.js';
import { G as GrowspaceOptionsController } from './growspace-growspace-options-controller-BD3pFfAZ.js';
import { c as computeEditorLabel } from './growspace-editor-utils-BOs038cM.js';

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
//# sourceMappingURL=growspace-growspace-grid-card-editor-De4_TExe.js.map
