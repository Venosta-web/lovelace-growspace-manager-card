/*! growspace-e2e-build source=eca169341ec3880bda4f035a4c69ff55f9f65ca1474fd9e31fda5c58b63bd1f4 id=9d3a766f9b89354dc29434d9548054ec */
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
//# sourceMappingURL=growspace-editor-utils-BXp5lV56.js.map
