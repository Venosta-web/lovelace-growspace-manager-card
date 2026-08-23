/*! growspace-e2e-build source=d643418f11f99de9a98c138500bc951fa24b74dd1885be380778e3de3d6cc403 id=c0de12078a191a1cb32ceedaf748bc9f */
const FIELD_LABELS = {
    default_growspace: 'Default Growspace',
    growspaces: 'Growspace Filter',
    filter_empty: 'Only Growspaces With Plants',
    growspace_id: 'Parent Growspace',
    subarea_id: 'Subarea',
    theme: 'Theme',
    initial_view_mode: 'Initial View Mode',
    keyboard_rotate_enabled: 'Keyboard Rotation (3D View)',
    keyboard_rotate_speed: 'Rotation Speed',
    default_view: 'Default View',
    hidden_chips: 'Hidden Chips',
};
const computeEditorLabel = (schema) => FIELD_LABELS[schema.name] ?? schema.name;

export { computeEditorLabel as c };
//# sourceMappingURL=growspace-editor-utils-BI8loyEf.js.map
