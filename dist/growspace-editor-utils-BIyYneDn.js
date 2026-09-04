/*! growspace-e2e-build source=4237f291da6abee248c570e37c180f847de859ca14a360f75ebd75f2ce138b34 id=3f336d94c58e405791c15d113a927a0e */
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
//# sourceMappingURL=growspace-editor-utils-BIyYneDn.js.map
