/*! growspace-e2e-build source=c2da729a056d34732b1cdd7352d41e8fa7d2d926a5692fcb7e9af2bb31234001 id=116478ddca8834e542d956697ce2cd0d */
const { g: i, A: localize, x, cK: variables, i: i$1, _: __decorate, n, t } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

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
//# sourceMappingURL=growspace-growspace-tc-card-editor-CzvEd99q.js.map
