/*! growspace-e2e-build source=0dff46336edb76780e872968e1d70b42d43fb85ddb5d9e59bf5910bc8b1949d9 id=0c01cf4a8d1e5db32fbf36d0c235915c */
const { g: i, A: localize, x, cJ: variables, i: i$1, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

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
//# sourceMappingURL=growspace-growspace-tc-card-editor-Dl488iti.js.map
