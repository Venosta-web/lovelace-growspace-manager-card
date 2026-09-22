/*! growspace-e2e-build source=1baf53fffffa25c66a6d961a1102766be67a2ce078e41deb06b90357c6353e87 id=71a7f38d0c257e2ef3e4f8553dd5ab3f */
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
//# sourceMappingURL=growspace-growspace-tc-card-editor-DPhxhYxw.js.map
