/*! growspace-e2e-build source=10260ac10de09fa31f9a63709c05046f5bdc77e287a569f499e15cd18b010d99 id=24392fbaf0ab20ddb6ad53544fef33ef */
const { g: i, bQ: localize, x, cF: variables, i: i$1, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

/**
 * The Growspace Tissue Culture card editor.
 *
 * There is nothing to configure: the card is not scoped to a growspace, and
 * Growspace Manager TC is detected rather than selected. It exists so the
 * visual editor says that, instead of dropping the user into raw YAML with no
 * explanation — and so every registered card type keeps the editor chunk
 * `npm run validate:hacs-release` expects of it.
 */
let GrowspaceTcCardEditor = class GrowspaceTcCardEditor extends i {
    setConfig(_config) {
        // Accepted and kept as-is; this editor never emits `config-changed`.
    }
    render() {
        return x `<p>${localize('tc.editor_note', '', '', this.hass?.language ?? 'en')}</p>`;
    }
};
GrowspaceTcCardEditor.styles = [
    variables,
    i$1 `
      p {
        margin: 0;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceTcCardEditor.prototype, "hass", void 0);
GrowspaceTcCardEditor = __decorate([
    t('growspace-tc-card-editor')
], GrowspaceTcCardEditor);

export { GrowspaceTcCardEditor };
//# sourceMappingURL=growspace-growspace-tc-card-editor-Ch-4aaG_.js.map
