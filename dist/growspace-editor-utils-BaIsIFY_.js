/*! growspace-e2e-build source=acbbe4d05b5c9fff436e0c7fa170b77e026e06568556f73cea85c5c0b19476dd id=c07c513e5239911ab7231c5c2852845f */
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
    hidden_graphs: 'Hidden Graphs',
    start_in_graph_wall: 'Start in Graph Wall',
};
const computeEditorLabel = (schema) => FIELD_LABELS[schema.name] ?? schema.name;

export { computeEditorLabel as c };
//# sourceMappingURL=growspace-editor-utils-BaIsIFY_.js.map
