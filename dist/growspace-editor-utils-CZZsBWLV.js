/*! growspace-e2e-build source=bddc1d5854a0285f27bad89822f16ba14ae188c004435259a30744a62d7cd4bd id=8afd807096fb3662abb22e91f709fb6b */
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
//# sourceMappingURL=growspace-editor-utils-CZZsBWLV.js.map
