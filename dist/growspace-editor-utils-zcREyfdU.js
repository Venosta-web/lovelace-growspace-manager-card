/*! growspace-e2e-build source=035fd9910dd2068f4439ecf897a7c21e4b92957e46649330f3a1fe4b15292ad9 id=7f4a8434e9689d82797a62e399ef94e8 */
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
//# sourceMappingURL=growspace-editor-utils-zcREyfdU.js.map
