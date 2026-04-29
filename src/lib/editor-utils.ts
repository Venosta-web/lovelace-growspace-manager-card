const FIELD_LABELS: Record<string, string> = {
  default_growspace:       'Default Growspace',
  growspace_id:            'Parent Growspace',
  subarea_id:              'Subarea',
  theme:                   'Theme',
  initial_view_mode:       'Initial View Mode',
  keyboard_rotate_enabled: 'Keyboard Rotation (3D View)',
  keyboard_rotate_speed:   'Rotation Speed',
  default_view:            'Default View',
};

export const computeEditorLabel = (schema: { name: string }): string =>
  FIELD_LABELS[schema.name] ?? schema.name;
