import { describe, it, expect } from 'vitest';
import { computeEditorLabel } from './editor-utils';

describe('computeEditorLabel', () => {
  it('returns human label for known field names', () => {
    expect(computeEditorLabel({ name: 'default_growspace' })).toBe('Default Growspace');
    expect(computeEditorLabel({ name: 'growspace_id' })).toBe('Parent Growspace');
    expect(computeEditorLabel({ name: 'subarea_id' })).toBe('Subarea');
    expect(computeEditorLabel({ name: 'theme' })).toBe('Theme');
    expect(computeEditorLabel({ name: 'initial_view_mode' })).toBe('Initial View Mode');
    expect(computeEditorLabel({ name: 'keyboard_rotate_enabled' })).toBe(
      'Keyboard Rotation (3D View)'
    );
    expect(computeEditorLabel({ name: 'keyboard_rotate_speed' })).toBe('Rotation Speed');
  });

  it('returns the field name itself for unknown fields', () => {
    expect(computeEditorLabel({ name: 'some_unknown_field' })).toBe('some_unknown_field');
  });
});
