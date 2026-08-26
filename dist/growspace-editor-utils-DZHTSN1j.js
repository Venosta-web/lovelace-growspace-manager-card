/*! growspace-e2e-build source=6ce5ab54c8cad0643d17cdcb2ce3f9997aaae6af76d976e5d07cdd3a6bc1818f id=98937485ba5d53e77434c620a195acd8 */
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
//# sourceMappingURL=growspace-editor-utils-DZHTSN1j.js.map
